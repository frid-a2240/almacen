import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack,
} from '@mui/material'
import CampoFoto from './CampoFoto.jsx'
import { crearEmpleado, actualizarEmpleado, subirFotoEmpleado } from '../api/empleados.js'

const VACIO = {
  id_numero_empleado: '', nombre_de_empleado: '', puesto_posicion: '', departamento_id: '',
  jefe_inmediato: '', status_empleado: 'ACTIVO', fecha_de_ingreso: '', correo_electronico: '', telefono: '',
}

export default function EmpleadoFormDialog({ open, onClose, onSaved, empleado, departamentos }) {
  const [form, setForm] = useState(VACIO)
  const [foto, setFoto] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    setFoto(null)
    setForm(empleado ? {
      id_numero_empleado: empleado.id_numero_empleado,
      nombre_de_empleado: empleado.nombre_de_empleado || '',
      puesto_posicion: empleado.puesto_posicion || '',
      departamento_id: empleado.departamento_id || '',
      jefe_inmediato: empleado.jefe_inmediato || '',
      status_empleado: empleado.status_empleado || '',
      fecha_de_ingreso: empleado.fecha_de_ingreso || '',
      correo_electronico: empleado.correo_electronico || '',
      telefono: empleado.telefono || '',
    } : VACIO)
  }, [open, empleado])

  const guardar = async () => {
    setGuardando(true)
    try {
      const payload = {
        ...form,
        departamento_id: form.departamento_id || null,
        fecha_de_ingreso: form.fecha_de_ingreso || null,
      }
      let id = empleado?.id_numero_empleado
      if (empleado) {
        delete payload.id_numero_empleado
        await actualizarEmpleado(id, payload)
      } else {
        const creado = await crearEmpleado(payload)
        id = creado.id_numero_empleado
      }
      if (foto) await subirFotoEmpleado(id, foto)
      onSaved(id)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{empleado ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <CampoFoto
            label="Foto Empleado"
            thumb={foto ? URL.createObjectURL(foto) : empleado?.foto_empleado}
            shape="round"
            capture="user"
            onChange={setFoto}
          />
          {!empleado && (
            <TextField
              label="Número de empleado" required fullWidth
              value={form.id_numero_empleado}
              onChange={(e) => setForm({ ...form, id_numero_empleado: e.target.value })}
            />
          )}
          <TextField
            label="Nombre" required fullWidth
            value={form.nombre_de_empleado}
            onChange={(e) => setForm({ ...form, nombre_de_empleado: e.target.value })}
          />
          <TextField
            label="Puesto / Posición" fullWidth
            value={form.puesto_posicion}
            onChange={(e) => setForm({ ...form, puesto_posicion: e.target.value })}
          />
          <TextField
            label="Departamento" select fullWidth
            value={form.departamento_id}
            onChange={(e) => setForm({ ...form, departamento_id: e.target.value })}
          >
            <MenuItem value="">(ninguno)</MenuItem>
            {departamentos.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.departamento}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Jefe inmediato" fullWidth
            value={form.jefe_inmediato}
            onChange={(e) => setForm({ ...form, jefe_inmediato: e.target.value })}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Status" select fullWidth
              value={form.status_empleado}
              onChange={(e) => setForm({ ...form, status_empleado: e.target.value })}
            >
              <MenuItem value="ACTIVO">ACTIVO</MenuItem>
              <MenuItem value="INACTIVO">INACTIVO</MenuItem>
            </TextField>
            <TextField
              label="Fecha de ingreso" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }}
              value={form.fecha_de_ingreso}
              onChange={(e) => setForm({ ...form, fecha_de_ingreso: e.target.value })}
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Correo electrónico" fullWidth
              value={form.correo_electronico}
              onChange={(e) => setForm({ ...form, correo_electronico: e.target.value })}
            />
            <TextField
              label="Teléfono" fullWidth
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disableElevation onClick={guardar} disabled={guardando || !form.nombre_de_empleado || (!empleado && !form.id_numero_empleado)}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
