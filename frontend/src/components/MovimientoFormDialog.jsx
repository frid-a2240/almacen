import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Stack, Autocomplete, Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import CampoFoto from './CampoFoto.jsx'
import SignaturePad from './SignaturePad.jsx'
import {
  crearMovimiento, actualizarMovimiento,
  subirFotoVale, subirFotoProductoMovimiento, subirFotoNumeroSerie, subirFirma,
} from '../api/movimientos.js'

const VACIO = {
  fecha_movimiento: dayjs().format('YYYY-MM-DD'), numero_de_vale: '', tipo_movimiento: 'SALIDA',
  cantidad: 1, status: 'ACTIVO', numero_economico: '', observaciones: '',
}

export default function MovimientoFormDialog({ open, onClose, onSaved, movimiento, empleados, productos }) {
  const [form, setForm] = useState(VACIO)
  const [empleadoSel, setEmpleadoSel] = useState(null)
  const [productoSel, setProductoSel] = useState(null)
  const [fotoVale, setFotoVale] = useState(null)
  const [fotoProducto, setFotoProducto] = useState(null)
  const [fotoNumeroSerie, setFotoNumeroSerie] = useState(null)
  const [firma, setFirma] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmpleadoSel(null)
    setProductoSel(null)
    setFotoVale(null)
    setFotoProducto(null)
    setFotoNumeroSerie(null)
    setFirma(null)
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

  const guardar = async () => {
    setGuardando(true)
    try {
      let rowId = movimiento?.row_id
      if (movimiento) {
        await actualizarMovimiento(rowId, form)
      } else {
        const creado = await crearMovimiento({
          ...form,
          id_numero_empleado: empleadoSel.id_numero_empleado,
          codigo_sai_sku: productoSel.codigo_sai_sku,
        })
        rowId = creado.row_id
      }
      // En paralelo — no hay dependencia entre ellas, y subirlas una por una
      // sumaba varios segundos extra a cada guardado.
      await Promise.all([
        fotoVale && subirFotoVale(rowId, fotoVale),
        fotoProducto && subirFotoProductoMovimiento(rowId, fotoProducto),
        fotoNumeroSerie && subirFotoNumeroSerie(rowId, fotoNumeroSerie),
        firma && subirFirma(rowId, firma),
      ])
      onSaved(rowId)
    } finally {
      setGuardando(false)
    }
  }

  const faltaFirma = !movimiento && !firma

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{movimiento ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Fecha Movimiento" required type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }}
            value={form.fecha_movimiento}
            onChange={(e) => setForm({ ...form, fecha_movimiento: e.target.value })}
          />
          <TextField
            label="Número de vale" fullWidth
            value={form.numero_de_vale}
            onChange={(e) => setForm({ ...form, numero_de_vale: e.target.value })}
          />

          <CampoFoto
            label="Foto Vale de Salida"
            thumb={fotoVale ? URL.createObjectURL(fotoVale) : movimiento?.foto_vale_de_salida}
            onChange={setFotoVale}
          />

          <TextField
            label="Tipo de movimiento" required select fullWidth
            value={form.tipo_movimiento}
            onChange={(e) => setForm({ ...form, tipo_movimiento: e.target.value })}
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
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">Producto</Typography>
              <Typography>{movimiento.descripcion}</Typography>
            </Stack>
          ) : (
            <Autocomplete
              options={productos}
              getOptionLabel={(p) => `${p.descripcion} (${p.codigo_sai_sku})`}
              value={productoSel}
              onChange={(_, v) => setProductoSel(v)}
              renderInput={(params) => <TextField {...params} label="Producto" required />}
            />
          )}

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

          <CampoFoto
            label="Foto Producto"
            thumb={fotoProducto ? URL.createObjectURL(fotoProducto) : movimiento?.foto_producto_snapshot}
            onChange={setFotoProducto}
          />
          <CampoFoto
            label="Foto # Numero Serie"
            thumb={fotoNumeroSerie ? URL.createObjectURL(fotoNumeroSerie) : movimiento?.foto_numero_serie}
            onChange={setFotoNumeroSerie}
          />

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
          disabled={guardando || (!movimiento && (!empleadoSel || !productoSel || faltaFirma))}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
