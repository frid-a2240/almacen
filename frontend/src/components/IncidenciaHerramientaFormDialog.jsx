import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Stack, Autocomplete, Typography, Alert, IconButton, Divider,
  FormGroup, FormControlLabel, Checkbox, Box,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import dayjs from 'dayjs'
import Thumbnail from './Thumbnail.jsx'
import { crearIncidenciaHerramienta, obtenerSiguienteFolioIncidencia, obtenerIncidenciaHerramientaPdf } from '../api/incidenciasHerramienta.js'
import { resguardoActualDeEmpleado } from '../api/empleados.js'
import { imprimirPdf, abrirVentanaImpresion } from '../utils/imprimir.js'

const VACIO = { folio: '', fecha_reporte: '', hora_reporte: '', lugar_fecha_suceso: '', descripcion_evento: '' }
const MAX_HERRAMIENTAS = 10

// Cantidad/Valor aprox. son texto libre (para poder escribir "$1,500.00" tal
// cual) pero el backend los guarda como número — se limpia el símbolo de
// pesos y las comas antes de mandarlo, si no, el backend lo rechaza (422) y
// eso cerraba la pestaña de impresión sin avisar nada.
const limpiarNumero = (valor) => {
  if (valor === '' || valor == null) return null
  const limpio = String(valor).replace(/[^0-9.-]/g, '')
  return limpio === '' || limpio === '-' ? null : limpio
}

// Mismos 8 tipos del formato real, en el mismo acomodo de 2 columnas.
const TIPOS_INCIDENTE = [
  ['ROBO', 'APLASTAMIENTO'],
  ['EXTRAVIO', 'CONATO DE INCENDIO'],
  ['CAIDA AL MAR', 'AUSENTISMO'],
  ['NEGLIGENCIA', 'ACCIDENTE'],
]

export default function IncidenciaHerramientaFormDialog({ open, onClose, onSaved, empleados }) {
  const [form, setForm] = useState(VACIO)
  const [empleadoSel, setEmpleadoSel] = useState(null)
  const [cardex, setCardex] = useState([])
  const [cargandoCardex, setCargandoCardex] = useState(false)
  const [marcados, setMarcados] = useState([])
  const [items, setItems] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!open) return
    setForm({ ...VACIO, fecha_reporte: dayjs().format('YYYY-MM-DD'), hora_reporte: dayjs().format('HH:mm') })
    setEmpleadoSel(null)
    setCardex([])
    setMarcados([])
    setItems([])
    setAviso('')
    obtenerSiguienteFolioIncidencia(dayjs().format('YYYY-MM-DD')).then((folio) => {
      setForm((f) => ({ ...f, folio }))
    })
  }, [open])

  const elegirEmpleado = async (emp) => {
    setEmpleadoSel(emp)
    setItems([])
    setCardex([])
    if (!emp) return
    setCargandoCardex(true)
    try {
      const filas = await resguardoActualDeEmpleado(emp.id_numero_empleado)
      setCardex(filas)
    } finally {
      setCargandoCardex(false)
    }
  }

  const agregarItem = () => setItems((prev) => [...prev, {
    vale: null, producto_sku: '', numero_vale: '', cantidad: '', numero_economico: '',
    estado_previo: '', valor_aprox: '', foto_producto: null, descripcion: '',
  }])
  const quitarItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i))
  const actualizarItem = (i, cambios) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...cambios } : it)))
  }

  const elegirVale = (i, vale) => {
    actualizarItem(i, {
      vale,
      producto_sku: vale?.sku || '',
      numero_vale: vale?.numero_de_vale || '',
      cantidad: vale?.cantidad ?? '',
      numero_economico: vale?.numero_economico || '',
      foto_producto: vale?.foto_producto || null,
      descripcion: vale?.descripcion || '',
    })
  }

  const toggleTipo = (tipo) => {
    setMarcados((prev) => (prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]))
  }

  const guardar = async () => {
    const ventanaImpresion = abrirVentanaImpresion()
    setGuardando(true)
    setAviso('')
    let huboProblema = false
    try {
      const incidencia = await crearIncidenciaHerramienta({
        folio: form.folio,
        fecha_reporte: form.fecha_reporte,
        hora_reporte: form.hora_reporte || null,
        lugar_fecha_suceso: form.lugar_fecha_suceso || null,
        id_numero_empleado: empleadoSel.id_numero_empleado,
        tipos_incidente: marcados.join(', '),
        descripcion_evento: form.descripcion_evento || null,
        items: items.map((it) => ({
          producto_sku: it.producto_sku || null,
          numero_vale: it.numero_vale || null,
          cantidad: limpiarNumero(it.cantidad),
          numero_economico: it.numero_economico || null,
          estado_previo: it.estado_previo || null,
          valor_aprox: limpiarNumero(it.valor_aprox),
        })),
      })

      try {
        const pdf = await obtenerIncidenciaHerramientaPdf(incidencia.id)
        const resultado = await imprimirPdf(pdf, `incidencia_${incidencia.folio}`, ventanaImpresion)
        if (resultado === 'descargado') {
          huboProblema = true
          setAviso('El reporte se guardó. Tu navegador bloqueó la ventana de impresión, así que se descargó el PDF — ábrelo desde tus descargas para imprimirlo.')
        }
      } catch (err) {
        ventanaImpresion?.close()
        huboProblema = true
        setAviso('El reporte se guardó, pero no se pudo mandar a imprimir. Vuelve a intentarlo desde el registro.')
      }

      if (!huboProblema) onSaved(incidencia.id)
    } catch (err) {
      ventanaImpresion?.close()
      const detalle = err?.response?.data?.detail
      setAviso(typeof detalle === 'string' ? detalle : 'No se pudo guardar el reporte. Revisa los datos capturados e inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const itemsIncompletos = items.some((it) => !it.vale)
  const faltanDatos = !form.folio || !form.fecha_reporte || !empleadoSel || !items.length || itemsIncompletos

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nuevo reporte de incidencia de herramienta</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {aviso && <Alert severity="warning">{aviso}</Alert>}

          <TextField
            label="Folio" required fullWidth
            value={form.folio}
            onChange={(e) => setForm({ ...form, folio: e.target.value })}
            helperText="Se precarga solo (IH-MMDDAA-consecutivo del día) — puedes corregirlo si hace falta."
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Fecha reporte" required fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }}
              value={form.fecha_reporte}
              onChange={(e) => setForm({ ...form, fecha_reporte: e.target.value })}
            />
            <TextField
              label="Hora reporte" fullWidth type="time" slotProps={{ inputLabel: { shrink: true } }}
              value={form.hora_reporte}
              onChange={(e) => setForm({ ...form, hora_reporte: e.target.value })}
            />
          </Stack>
          <TextField
            label="Lugar y fecha del suceso" fullWidth
            value={form.lugar_fecha_suceso}
            onChange={(e) => setForm({ ...form, lugar_fecha_suceso: e.target.value })}
          />

          <Autocomplete
            options={empleados}
            getOptionLabel={(e) => `${e.nombre_de_empleado} (${e.id_numero_empleado})`}
            value={empleadoSel}
            onChange={(_, v) => elegirEmpleado(v)}
            renderInput={(params) => <TextField {...params} label="Empleado" required />}
          />

          <Divider />
          <Typography variant="subtitle2">Marcar el tipo de incidente</Typography>
          <FormGroup>
            {TIPOS_INCIDENTE.map(([izq, der]) => (
              <Stack key={izq} direction="row" spacing={1}>
                <Box sx={{ flex: 1 }}>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={marcados.includes(izq)} onChange={() => toggleTipo(izq)} />}
                    label={izq}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={marcados.includes(der)} onChange={() => toggleTipo(der)} />}
                    label={der}
                  />
                </Box>
              </Stack>
            ))}
          </FormGroup>

          <Divider />
          <Typography variant="subtitle2">Herramientas involucradas</Typography>
          {empleadoSel && !cargandoCardex && cardex.length === 0 && (
            <Alert severity="info">{empleadoSel.nombre_de_empleado} no tiene ninguna herramienta en resguardo ahorita.</Alert>
          )}
          <Stack spacing={1.5}>
            {items.map((item, i) => (
              <Stack key={i} spacing={1.5} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Thumbnail src={item.foto_producto} shape="square" size={48} />
                  <Autocomplete
                    fullWidth
                    options={cardex}
                    getOptionLabel={(v) => `${v.descripcion} — Vale ${v.numero_de_vale || 's/n'} (${v.numero_economico || 'sin # económico'})`}
                    isOptionEqualToValue={(a, b) => a.sku === b.sku}
                    value={item.vale}
                    onChange={(_, v) => elegirVale(i, v)}
                    renderInput={(params) => <TextField {...params} label="Herramienta (de su cardex)" required />}
                  />
                  <IconButton size="small" onClick={() => quitarItem(i)} sx={{ mt: 1 }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    label="Cantidad" size="small" sx={{ width: 110 }}
                    value={item.cantidad}
                    onChange={(e) => actualizarItem(i, { cantidad: e.target.value })}
                  />
                  <TextField
                    label="Número económico" size="small" fullWidth
                    value={item.numero_economico}
                    onChange={(e) => actualizarItem(i, { numero_economico: e.target.value })}
                  />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    label="Estado previo" size="small" fullWidth
                    value={item.estado_previo}
                    onChange={(e) => actualizarItem(i, { estado_previo: e.target.value })}
                    helperText="Ej. Buen estado, con desgaste normal…"
                  />
                  <TextField
                    label="Valor aprox." size="small" sx={{ width: 140 }}
                    value={item.valor_aprox}
                    onChange={(e) => actualizarItem(i, { valor_aprox: e.target.value })}
                  />
                </Stack>
              </Stack>
            ))}
            {items.length < MAX_HERRAMIENTAS && (
              <Button startIcon={<AddIcon />} onClick={agregarItem} disabled={!empleadoSel || cardex.length === 0} sx={{ alignSelf: 'flex-start' }}>
                Agregar herramienta
              </Button>
            )}
          </Stack>

          <Divider />
          <TextField
            label="Descripción del evento o circunstancia" fullWidth multiline minRows={3}
            value={form.descripcion_evento}
            onChange={(e) => setForm({ ...form, descripcion_evento: e.target.value })}
            helperText="Describir de manera clara y detallada lugar y hora del suceso, así como testigos."
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
