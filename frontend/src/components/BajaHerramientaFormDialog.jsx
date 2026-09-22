import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Stack, Autocomplete, Typography, Alert, IconButton, Box, Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined'
import dayjs from 'dayjs'
import CampoFoto from './CampoFoto.jsx'
import { crearBajaHerramienta, agregarFotoBaja, obtenerBajaHerramientaPdf } from '../api/bajasHerramienta.js'
import { imprimirPdf, abrirVentanaImpresion } from '../utils/imprimir.js'

const VACIO = { folio: '', fecha: dayjs().format('YYYY-MM-DD'), observaciones: '' }
const ITEM_VACIO = { producto: null, numero_economico: '', diagnostico: '' }
const MAX_HERRAMIENTAS = 20

export default function BajaHerramientaFormDialog({ open, onClose, onSaved, empleados, productos }) {
  const [form, setForm] = useState(VACIO)
  const [tecnicoSel, setTecnicoSel] = useState(null)
  const [almacenistaSel, setAlmacenistaSel] = useState(null)
  const [items, setItems] = useState([ITEM_VACIO])
  // Número libre de fotos de evidencia — no las 4 fijas del Excel original,
  // aquí se pueden agregar las que hagan falta (o ninguna).
  
  const [fotos, setFotos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(VACIO)
    setTecnicoSel(null)
    setAlmacenistaSel(null)
    setItems([ITEM_VACIO])
    setFotos([])
    setAviso('')
  }, [open])

  const actualizarItem = (i, cambios) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...cambios } : it)))
  }
  const agregarItem = () => setItems((prev) => [...prev, ITEM_VACIO])
  const quitarItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i))

  const agregarFoto = () => setFotos((prev) => [...prev, {
    archivo: null, itemIndices: [], descripcion: '', numeros_economicos: '',
  }])
  const actualizarFoto = (i, cambios) => {
    setFotos((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...cambios } : f)))
  }
  const quitarFoto = (i) => setFotos((prev) => prev.filter((_, idx) => idx !== i))

  // Al elegir a qué herramienta(s) de la lista de arriba corresponde la
  // foto, la Descripción y los # Económicos se autorrellenan con los de esos
  // renglones (una foto puede cubrir varias piezas iguales, como en el Excel
  // original) — siguen siendo editables por si hace falta ajustarlos.
  const elegirHerramientasDeFoto = (i, indices) => {
    const seleccionados = indices.map((idx) => items[idx]).filter((it) => it?.producto)
    const descripciones = [...new Set(seleccionados.map((it) => it.producto.descripcion))]
    const economicos = seleccionados.map((it) => it.numero_economico || it.producto.numero_economico).filter(Boolean)
    actualizarFoto(i, {
      itemIndices: indices,
      descripcion: descripciones.join(', '),
      numeros_economicos: economicos.join(', '),
    })
  }

  const guardar = async () => {
    // La ventana de impresión se abre AQUÍ, antes de cualquier await — igual
    // que en el vale: si se abre después de esperar el guardado, el
    // navegador ya no la cuenta como reacción directa al clic y la bloquea.
    const ventanaImpresion = abrirVentanaImpresion()

    setGuardando(true)
    setAviso('')
    let huboProblema = false
    try {
      const baja = await crearBajaHerramienta({
        folio: form.folio,
        fecha: form.fecha,
        id_numero_empleado_tecnico: tecnicoSel.id_numero_empleado,
        id_numero_empleado_almacenista: almacenistaSel.id_numero_empleado,
        observaciones: form.observaciones,
        items: items.map((it) => ({
          codigo_sai_sku: it.producto.codigo_sai_sku,
          numero_economico: it.numero_economico || null,
          diagnostico: it.diagnostico || null,
        })),
      })

      const fotosValidas = fotos.filter((f) => f.archivo)
      if (fotosValidas.length) {
        try {
          for (const f of fotosValidas) {
            await agregarFotoBaja(baja.id, f.archivo, f.descripcion, f.numeros_economicos)
          }
        } catch (err) {
          huboProblema = true
          setAviso('La baja se guardó, pero alguna foto no se pudo subir. Agrégala de nuevo desde el registro.')
        }
      }

      try {
        const pdf = await obtenerBajaHerramientaPdf(baja.id)
        await imprimirPdf(pdf, `baja_${baja.folio}`, ventanaImpresion, { duplex: true })
      } catch (err) {
        ventanaImpresion?.close()
        huboProblema = true
        setAviso((prev) => prev || 'La baja se guardó, pero no se pudo mandar a imprimir el formato. Vuelve a intentarlo desde el registro.')
      }

      if (!huboProblema) onSaved(baja.id)
    } catch (err) {
      ventanaImpresion?.close()
      throw err
    } finally {
      setGuardando(false)
    }
  }

  const itemsIncompletos = items.some((it) => !it.producto)
  const faltanDatos = !form.folio || !form.fecha || !tecnicoSel || !almacenistaSel || itemsIncompletos

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nueva baja de herramienta</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {aviso && <Alert severity="warning">{aviso}</Alert>}

          <TextField
            label="Folio" required fullWidth
            value={form.folio}
            onChange={(e) => setForm({ ...form, folio: e.target.value })}
            helperText="Se captura a mano (es el mismo consecutivo del formato en papel), no se asigna solo."
          />
          <TextField
            label="Fecha" required type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }}
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          />
          <Autocomplete
            options={empleados}
            getOptionLabel={(e) => `${e.nombre_de_empleado} (${e.id_numero_empleado})`}
            value={tecnicoSel}
            onChange={(_, v) => setTecnicoSel(v)}
            renderInput={(params) => <TextField {...params} label="Técnico evaluador" required />}
          />
          <Autocomplete
            options={empleados}
            getOptionLabel={(e) => `${e.nombre_de_empleado} (${e.id_numero_empleado})`}
            value={almacenistaSel}
            onChange={(_, v) => setAlmacenistaSel(v)}
            renderInput={(params) => <TextField {...params} label="Personal de almacén" required />}
          />

          <Divider />
          <Typography variant="subtitle2">Herramientas dadas de baja</Typography>
          <Stack spacing={1.5}>
            {items.map((item, i) => (
              <Stack key={i} spacing={1.5} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Autocomplete
                    fullWidth
                    options={productos}
                    getOptionLabel={(p) => `${p.descripcion} (${p.codigo_sai_sku})`}
                    value={item.producto}
                    onChange={(_, v) => actualizarItem(i, {
                      producto: v,
                      numero_economico: v?.numero_economico || '',
                    })}
                    renderInput={(params) => (
                      <TextField {...params} label={items.length > 1 ? `Herramienta ${i + 1}` : 'Herramienta'} required />
                    )}
                  />
                  {items.length > 1 && (
                    <IconButton size="small" onClick={() => quitarItem(i)} sx={{ mt: 1 }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
                <TextField
                  label="Número económico" fullWidth
                  value={item.numero_economico}
                  onChange={(e) => actualizarItem(i, { numero_economico: e.target.value })}
                  helperText="Se llena solo con el de la ficha del producto — corrígelo si esta pieza en particular tiene otro."
                />
                <TextField
                  label="Diagnóstico" fullWidth multiline minRows={2}
                  value={item.diagnostico}
                  onChange={(e) => actualizarItem(i, { diagnostico: e.target.value })}
                  helperText="Ej. rotor quemado, switch dañado, cabezal dañado…"
                />
              </Stack>
            ))}
            {items.length < MAX_HERRAMIENTAS && items[items.length - 1].producto && (
              <Button startIcon={<AddIcon />} onClick={agregarItem} sx={{ alignSelf: 'flex-start' }}>
                Agregar otra herramienta
              </Button>
            )}
          </Stack>

          <Divider />
          <Typography variant="subtitle2">Evidencia fotográfica (opcional)</Typography>
          <Stack spacing={1.5}>
            {fotos.map((foto, i) => (
              <Stack key={i} spacing={1.5} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flexGrow: 1 }}>
                    <CampoFoto
                      label={`Foto ${i + 1}`}
                      thumb={foto.archivo ? URL.createObjectURL(foto.archivo) : undefined}
                      onChange={(archivo) => actualizarFoto(i, { archivo })}
                    />
                  </Box>
                  <IconButton size="small" onClick={() => quitarFoto(i)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Autocomplete
                  multiple
                  options={items.map((_, idx) => idx).filter((idx) => items[idx].producto)}
                  getOptionLabel={(idx) => {
                    const it = items[idx]
                    return `${it.producto.descripcion} (${it.numero_economico || it.producto.codigo_sai_sku})`
                  }}
                  value={foto.itemIndices}
                  onChange={(_, indices) => elegirHerramientasDeFoto(i, indices)}
                  renderInput={(params) => (
                    <TextField {...params} label="¿Qué herramienta(s) muestra esta foto?" />
                  )}
                />
                <TextField
                  label="Descripción" fullWidth
                  value={foto.descripcion}
                  onChange={(e) => actualizarFoto(i, { descripcion: e.target.value })}
                  helperText="Se llena sola al elegir la(s) herramienta(s) de arriba — puedes ajustarla."
                />
                <TextField
                  label="Números económicos que cubre" fullWidth
                  value={foto.numeros_economicos}
                  onChange={(e) => actualizarFoto(i, { numeros_economicos: e.target.value })}
                  helperText="Se llena solo — puedes ajustarlo si hace falta."
                />
              </Stack>
            ))}
            <Button startIcon={<AddAPhotoOutlinedIcon />} onClick={agregarFoto} sx={{ alignSelf: 'flex-start' }}>
              Agregar foto
            </Button>
          </Stack>

          <TextField
            label="Observaciones" fullWidth multiline minRows={2}
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disableElevation onClick={guardar} disabled={guardando || faltanDatos}>
          Guardar e imprimir
        </Button>
      </DialogActions>
    </Dialog>
  )
}
