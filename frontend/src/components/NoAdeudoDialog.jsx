import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Stack, Typography, Alert, Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material'
import { resguardoActualDeEmpleado } from '../api/empleados.js'
import { obtenerNoAdeudoPdf } from '../api/empleados.js'
import { formatoMoneda } from '../utils/formatters.js'
import { imprimirPdf, abrirVentanaImpresion } from '../utils/imprimir.js'
import { mensajeDeError } from '../api/client.js'

/**
 * Antes la Constancia de No Adeudo solo se podía emitir si el empleado ya
 * no tenía nada en resguardo. Ahora siempre se puede: si tiene pendientes,
 * este diálogo pide el % de vida útil de cada herramienta (0% = se cobra
 * completo, 100% = ya no se cobra nada) para calcular el costo a descontar
 * antes de imprimir — si no tiene nada pendiente, se salta este paso y
 * certifica que no debe nada, como antes.
 */
export default function NoAdeudoDialog({ open, onClose, empleado }) {
  const [cargando, setCargando] = useState(true)
  const [pendientes, setPendientes] = useState([])
  const [porcentajes, setPorcentajes] = useState({})
  const [observaciones, setObservaciones] = useState('')
  const [imprimiendo, setImprimiendo] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!open || !empleado) return
    setCargando(true)
    setAviso('')
    setObservaciones('')
    resguardoActualDeEmpleado(empleado.id_numero_empleado)
      .then((filas) => {
        setPendientes(filas)
        setPorcentajes(Object.fromEntries(filas.map((f) => [f.row_id, 0])))
      })
      .finally(() => setCargando(false))
  }, [open, empleado])

  const costoTotal = (f) => Number(f.costo_unitario || 0) * Number(f.cantidad || 0)
  // % de vida útil = cuánta vida le queda a la herramienta (100% = nueva,
  // 0% = ya agotada) — se cobra ESE porcentaje del costo: casi nueva y
  // perdida -> se cobra casi completo; ya muy usada -> se cobra poco.
  const costoADescontar = (f) => {
    const pct = Number(porcentajes[f.row_id] ?? 0)
    return costoTotal(f) * (pct / 100)
  }
  const totalGeneral = pendientes.reduce((acc, f) => acc + costoTotal(f), 0)
  const total = pendientes.reduce((acc, f) => acc + costoADescontar(f), 0)

  const generarEImprimir = async () => {
    const ventana = abrirVentanaImpresion()
    setImprimiendo(true)
    setAviso('')
    try {
      const datos = {
        items: pendientes.map((f) => ({ row_id: f.row_id, vida_util_pct: Number(porcentajes[f.row_id] ?? 0) })),
        observaciones: observaciones || null,
      }
      const pdf = await obtenerNoAdeudoPdf(empleado.id_numero_empleado, datos)
      await imprimirPdf(pdf, `no_adeudo_${empleado.id_numero_empleado}`, ventana)
      onClose()
    } catch (err) {
      ventana?.close()
      setAviso(mensajeDeError(err) || 'No se pudo generar la constancia.')
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Constancia de {pendientes.length ? 'Adeudo' : 'No Adeudo'}{empleado ? ` — ${empleado.nombre_de_empleado}` : ''}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {aviso && <Alert severity="warning">{aviso}</Alert>}
          {cargando ? (
            <Typography color="text.secondary">Cargando resguardo actual…</Typography>
          ) : pendientes.length === 0 ? (
            <Alert severity="success">No tiene ninguna herramienta en resguardo — se emitirá como Constancia de No Adeudo.</Alert>
          ) : (
            <>
              <Alert severity="warning">
                Todavía tiene {pendientes.length} herramienta(s) en resguardo. Captura el % de vida útil de cada una para calcular cuánto se le descuenta.
              </Alert>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Descripción</TableCell>
                    <TableCell># Económico</TableCell>
                    <TableCell align="right">Costo Unit.</TableCell>
                    <TableCell align="right">Cant.</TableCell>
                    <TableCell align="center" sx={{ width: 110 }}>Vida Útil %</TableCell>
                    <TableCell align="right">Costo a Pagar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendientes.map((f) => (
                    <TableRow key={f.row_id}>
                      <TableCell>{f.descripcion}</TableCell>
                      <TableCell>{f.numero_economico}</TableCell>
                      <TableCell align="right">{formatoMoneda(f.costo_unitario)}</TableCell>
                      <TableCell align="right">{f.cantidad}</TableCell>
                      <TableCell align="center">
                        <TextField
                          size="small" type="number" value={porcentajes[f.row_id] ?? 0}
                          onChange={(e) => setPorcentajes({ ...porcentajes, [f.row_id]: e.target.value })}
                          slotProps={{ htmlInput: { min: 0, max: 100, style: { textAlign: 'center' } } }}
                          sx={{ width: 90 }}
                        />
                      </TableCell>
                      <TableCell align="right">{formatoMoneda(costoADescontar(f))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                Costo total (sin descuento) = {formatoMoneda(totalGeneral)}
              </Typography>
              <Typography variant="subtitle1" fontWeight={700} sx={{ textAlign: 'right' }}>
                Costo total a pagar = {formatoMoneda(total)}
              </Typography>
            </>
          )}
          <TextField
            label="Observaciones" fullWidth multiline minRows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disableElevation onClick={generarEImprimir} disabled={cargando || imprimiendo}>
          Generar e imprimir
        </Button>
      </DialogActions>
    </Dialog>
  )
}
