import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Stack, Autocomplete, Typography, Alert, IconButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import dayjs from 'dayjs'
import CampoFoto from './CampoFoto.jsx'
import SignaturePad from './SignaturePad.jsx'
import {
  crearMovimiento, crearSalidaMultiple, actualizarMovimiento, obtenerValePdf,
  subirFotoVale, subirFotoProductoMovimiento, subirFotoNumeroSerie, subirFirma,
} from '../api/movimientos.js'
import { imprimirPdf, abrirVentanaImpresion } from '../utils/imprimir.js'

const VACIO = {
  fecha_movimiento: dayjs().format('YYYY-MM-DD'), numero_de_vale: '', tipo_movimiento: 'SALIDA',
  cantidad: 1, status: 'ACTIVO', numero_economico: '', observaciones: '',
}
const ITEM_VACIO = { producto: null, cantidad: 1, numero_economico: '' }
const MAX_HERRAMIENTAS = 6

export default function MovimientoFormDialog({ open, onClose, onSaved, movimiento, empleados, productos }) {
  const [form, setForm] = useState(VACIO)
  const [empleadoSel, setEmpleadoSel] = useState(null)
  // Un vale nuevo (SALIDA) puede llevar hasta 6 herramientas — cada una con
  // su propio producto/cantidad/número económico; al editar o en ENTRADA
  // siempre es un solo elemento (items[0]).
  const [items, setItems] = useState([ITEM_VACIO])
  const [fotoVale, setFotoVale] = useState(null)
  const [fotoProducto, setFotoProducto] = useState(null)
  const [fotoNumeroSerie, setFotoNumeroSerie] = useState(null)
  const [firma, setFirma] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!open) return
    setEmpleadoSel(null)
    setItems([ITEM_VACIO])
    setFotoVale(null)
    setFotoProducto(null)
    setFotoNumeroSerie(null)
    setFirma(null)
    setAviso('')
    setForm(movimiento ? {
      fecha_movimiento: movimiento.fecha_movimiento,
      numero_de_vale: movimiento.numero_de_vale || '',
      tipo_movimiento: movimiento.tipo_movimiento,
      cantidad: movimiento.cantidad,
      status: movimiento.status || 'ACTIVO',
      numero_economico: movimiento.numero_economico || '',
      observaciones: movimiento.observaciones || '',
    } : VACIO)
  }, [open, movimiento])

  const actualizarItem = (i, cambios) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...cambios } : it)))
  }
  const agregarItem = () => setItems((prev) => [...prev, ITEM_VACIO])
  const quitarItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i))

  const cambiarTipoMovimiento = (tipo) => {
    setForm({ ...form, tipo_movimiento: tipo })
    // ENTRADA es siempre una sola herramienta — si venían varias capturadas
    // para una SALIDA y cambian el tipo, se recorta a la primera.
    if (tipo !== 'SALIDA' && items.length > 1) setItems([items[0]])
  }

  const guardar = async () => {
    // El vale electrónico solo aplica a una SALIDA nueva. La pestaña de
    // impresión se abre AQUÍ, antes de cualquier await — si se abre después
    // de esperar el guardado/las fotos, el navegador ya no lo cuenta como
    // resultado directo del clic y la bloquea en silencio (sin aviso).
    const esNuevo = !movimiento
    const vaAImprimir = esNuevo && form.tipo_movimiento === 'SALIDA'
    const ventanaImpresion = vaAImprimir ? abrirVentanaImpresion() : null

    setGuardando(true)
    setAviso('')
    let huboProblema = false
    try {
      let rowId = movimiento?.row_id
      let rowIds = [rowId]
      if (movimiento) {
        await actualizarMovimiento(rowId, form)
      } else if (items.length === 1) {
        // Una sola herramienta: el camino de siempre, sin tocar nada.
        const creado = await crearMovimiento({
          ...form,
          numero_economico: items[0].numero_economico,
          cantidad: items[0].cantidad,
          id_numero_empleado: empleadoSel.id_numero_empleado,
          codigo_sai_sku: items[0].producto.codigo_sai_sku,
        })
        rowId = creado.row_id
        rowIds = [rowId]
      } else {
        // Varias herramientas: un solo vale (un solo folio), un renglón por
        // herramienta — ver /movimientos/salida-multiple.
        const creados = await crearSalidaMultiple({
          fecha_movimiento: form.fecha_movimiento,
          id_numero_empleado: empleadoSel.id_numero_empleado,
          status: form.status,
          observaciones: form.observaciones,
          items: items.map((it) => ({
            codigo_sai_sku: it.producto.codigo_sai_sku,
            cantidad: it.cantidad,
            numero_economico: it.numero_economico || null,
          })),
        })
        rowIds = creados.map((c) => c.row_id)
        rowId = rowIds[0]
      }

      // Imprimir va ANTES de subir las fotos y en su propio try/catch: es lo
      // urgente para la entrega física, y no debe quedar bloqueado ni en
      // silencio si una foto/firma falla al subir (antes, un solo error en
      // el Promise.all de las fotos hacía que TODO el guardado terminara en
      // catch sin avisar nada, saltándose la impresión sin dejar rastro).
      // vale-pdf junta solas todas las herramientas del mismo folio, así que
      // basta con pedirlo con cualquiera de los row_id recién creados.
      if (vaAImprimir) {
        try {
          const pdf = await obtenerValePdf(rowId)
          await imprimirPdf(pdf, `vale_${rowId}`, ventanaImpresion)
        } catch (err) {
          ventanaImpresion?.close()
          huboProblema = true
          setAviso('El movimiento se guardó, pero no se pudo mandar a imprimir el vale. Vuelve a intentarlo desde Control de Resguardo.')
        }
      }

      // En paralelo — no hay dependencia entre ellas, y subirlas una por una
      // sumaba varios segundos extra a cada guardado. Foto de vale y firma
      // son del vale completo (una sola hoja), así que se suben a cada
      // renglón creado; foto de producto/número de serie son de UNA
      // herramienta puntual, solo aplican cuando el vale trae una sola.
      try {
        await Promise.all([
          fotoVale && Promise.all(rowIds.map((id) => subirFotoVale(id, fotoVale))),
          firma && Promise.all(rowIds.map((id) => subirFirma(id, firma))),
          items.length === 1 && fotoProducto && subirFotoProductoMovimiento(rowId, fotoProducto),
          items.length === 1 && fotoNumeroSerie && subirFotoNumeroSerie(rowId, fotoNumeroSerie),
        ])
      } catch (err) {
        huboProblema = true
        setAviso((prev) => prev || 'El movimiento se guardó, pero alguna foto/firma no se pudo subir. Vuelve a intentarlo desde el registro.')
      }

      // Si algo falló (imprimir o subir fotos), el movimiento de todos modos
      // ya se guardó — pero se deja el diálogo abierto con el aviso a la
      // vista en vez de cerrarlo solo, para que no pase desapercibido.
      if (!huboProblema) onSaved(rowId)
    } catch (err) {
      ventanaImpresion?.close()
      throw err
    } finally {
      setGuardando(false)
    }
  }

  const faltaFirma = !movimiento && !firma
  const itemsIncompletos = !movimiento && items.some((it) => !it.producto || !it.cantidad)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{movimiento ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {aviso && <Alert severity="warning">{aviso}</Alert>}
          <TextField
            label="Fecha Movimiento" required type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }}
            value={form.fecha_movimiento}
            onChange={(e) => setForm({ ...form, fecha_movimiento: e.target.value })}
          />
          <TextField
            label="Número de vale" fullWidth
            value={form.numero_de_vale}
            onChange={(e) => setForm({ ...form, numero_de_vale: e.target.value })}
            helperText={!movimiento ? 'En blanco: se asigna solo al guardar (folio consecutivo del vale electrónico)' : undefined}
          />

          <CampoFoto
            label="Foto Vale de Salida"
            thumb={fotoVale ? URL.createObjectURL(fotoVale) : movimiento?.foto_vale_de_salida}
            onChange={setFotoVale}
          />

          <TextField
            label="Tipo de movimiento" required select fullWidth
            value={form.tipo_movimiento}
            onChange={(e) => cambiarTipoMovimiento(e.target.value)}
          >
            <MenuItem value="SALIDA">SALIDA</MenuItem>
            <MenuItem value="ENTRADA">ENTRADA</MenuItem>
          </TextField>

          {movimiento ? (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">Nombre de Empleado</Typography>
              <Typography>{movimiento.nombre_de_empleado}</Typography>
            </Stack>
          ) : (
            <Autocomplete
              options={empleados}
              getOptionLabel={(e) => `${e.nombre_de_empleado} (${e.id_numero_empleado})`}
              value={empleadoSel}
              onChange={(_, v) => setEmpleadoSel(v)}
              renderInput={(params) => <TextField {...params} label="Nombre de Empleado" required />}
            />
          )}

          <TextField
            label="Status" select fullWidth
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <MenuItem value="ACTIVO">ACTIVO</MenuItem>
            <MenuItem value="INACTIVO">INACTIVO</MenuItem>
          </TextField>

          {movimiento ? (
            <>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Producto</Typography>
                <Typography>{movimiento.descripcion}</Typography>
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Número económico" fullWidth
                  value={form.numero_economico}
                  onChange={(e) => setForm({ ...form, numero_economico: e.target.value })}
                />
                <TextField
                  label="Cantidad" required type="number" fullWidth
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                />
              </Stack>
            </>
          ) : (
            <Stack spacing={1.5}>
              {items.map((item, i) => (
                <Stack key={i} spacing={1.5} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Autocomplete
                      fullWidth
                      options={productos}
                      getOptionLabel={(p) => `${p.descripcion} (${p.codigo_sai_sku})`}
                      value={item.producto}
                      onChange={(_, v) => actualizarItem(i, { producto: v })}
                      renderInput={(params) => (
                        <TextField {...params} label={items.length > 1 ? `Producto ${i + 1}` : 'Producto'} required />
                      )}
                    />
                    {items.length > 1 && (
                      <IconButton size="small" onClick={() => quitarItem(i)} sx={{ mt: 1 }}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Número económico" fullWidth
                      value={item.numero_economico}
                      onChange={(e) => actualizarItem(i, { numero_economico: e.target.value })}
                    />
                    <TextField
                      label="Cantidad" required type="number" fullWidth
                      value={item.cantidad}
                      onChange={(e) => actualizarItem(i, { cantidad: e.target.value })}
                    />
                  </Stack>
                </Stack>
              ))}
              {form.tipo_movimiento === 'SALIDA' && items.length < MAX_HERRAMIENTAS && items[items.length - 1].producto && (
                <Button startIcon={<AddIcon />} onClick={agregarItem} sx={{ alignSelf: 'flex-start' }}>
                  Agregar otra herramienta
                </Button>
              )}
            </Stack>
          )}

          {items.length === 1 && (
            <>
              <CampoFoto
                label="Foto Producto"
                thumb={
                  fotoProducto
                    ? URL.createObjectURL(fotoProducto)
                    : movimiento?.foto_producto_snapshot || items[0].producto?.foto_producto
                }
                onChange={setFotoProducto}
              />
              <CampoFoto
                label="Foto # Numero Serie"
                thumb={fotoNumeroSerie ? URL.createObjectURL(fotoNumeroSerie) : movimiento?.foto_numero_serie}
                onChange={setFotoNumeroSerie}
              />
            </>
          )}

          <SignaturePad onChange={setFirma} required={!movimiento} />

          <TextField
            label="Observaciones" fullWidth multiline minRows={2}
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained" disableElevation onClick={guardar}
          disabled={guardando || (!movimiento && (!empleadoSel || itemsIncompletos || faltaFirma))}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
