import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Autocomplete, Alert,
} from '@mui/material'
import dayjs from 'dayjs'
import SignaturePad from './SignaturePad.jsx'
import { traspasarHerramienta, obtenerValePdf, subirFirma } from '../api/movimientos.js'
import { imprimirPdf, abrirVentanaImpresion } from '../utils/imprimir.js'

/**
 * Traspasa UNA herramienta (movimiento.row_id) de quien la tiene actualmente
 * a otro empleado: cierra el saldo de quien la entrega y abre uno nuevo
 * —folio nuevo, vale nuevo para imprimir— para quien la recibe. Se usa desde
 * Control de Resguardo cuando el empleado tiene más de una herramienta (si
 * solo tiene esa, se usa "Editar" en vez de traspasar).
 */
export default function TraspasoDialog({ open, onClose, movimiento, empleados, saldoActual, onDone }) {
  const [destino, setDestino] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [fecha, setFecha] = useState(dayjs().format('YYYY-MM-DD'))
  const [observaciones, setObservaciones] = useState('')
  const [firma, setFirma] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDestino(null)
    setCantidad(saldoActual ?? movimiento?.cantidad ?? 1)
    setFecha(dayjs().format('YYYY-MM-DD'))
    setObservaciones('')
    setFirma(null)
    setError('')
  }, [open, movimiento, saldoActual])

  const opcionesDestino = empleados.filter((e) => e.id_numero_empleado !== movimiento?.id_numero_empleado)

  const guardar = async () => {
    // Se abre AQUÍ, antes de cualquier await, para que el navegador no
    // bloquee la pestaña como pop-up (mismo criterio que al imprimir el vale
    // de un movimiento nuevo).
    const ventanaImpresion = abrirVentanaImpresion()
    setGuardando(true)
    setError('')
    try {
      const creado = await traspasarHerramienta({
        row_id_origen: movimiento.row_id,
        id_numero_empleado_destino: destino.id_numero_empleado,
        cantidad,
        fecha_movimiento: fecha,
        observaciones: observaciones || null,
      })
      if (firma) await subirFirma(creado.row_id, firma)
      try {
        const pdf = await obtenerValePdf(creado.row_id)
        await imprimirPdf(pdf, `vale_${creado.row_id}`, ventanaImpresion)
      } catch {
        ventanaImpresion?.close()
      }
      onDone()
    } catch (err) {
      ventanaImpresion?.close()
      setError(err.response?.data?.detail || 'No se pudo hacer el traspaso.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Traspasar herramienta</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack spacing={0.5}>
            <TextField label="Herramienta" value={movimiento?.descripcion || ''} disabled fullWidth />
            <TextField label="De (empleado actual)" value={movimiento?.nombre_de_empleado || ''} disabled fullWidth sx={{ mt: 1 }} />
          </Stack>

          <Autocomplete
            options={opcionesDestino}
            getOptionLabel={(e) => `${e.nombre_de_empleado} (${e.id_numero_empleado})`}
            value={destino}
            onChange={(_, v) => setDestino(v)}
            renderInput={(params) => <TextField {...params} label="Traspasar a" required />}
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Cantidad" required type="number" fullWidth
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              helperText={saldoActual != null ? `Máximo disponible: ${saldoActual}` : undefined}
              slotProps={{ htmlInput: { max: saldoActual ?? undefined, min: 0 } }}
            />
            <TextField
              label="Fecha" required type="date" fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Stack>

          <TextField
            label="Observaciones" fullWidth multiline minRows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />

          <SignaturePad onChange={setFirma} required />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained" disableElevation onClick={guardar}
          disabled={guardando || !destino || !cantidad || !firma}
        >
          Traspasar e imprimir
        </Button>
      </DialogActions>
    </Dialog>
  )
}
