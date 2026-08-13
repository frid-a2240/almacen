import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack,
  FormControlLabel, Switch, Typography,
} from '@mui/material'
import { crearUsuario, actualizarUsuario } from '../api/usuarios.js'

const VACIO = { numero_control: '', nombre: '', password: '', es_admin: false, activo: true }

export default function UsuarioFormDialog({ open, onClose, onSaved, usuario }) {
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(usuario ? {
      numero_control: usuario.numero_control,
      nombre: usuario.nombre,
      password: '',
      es_admin: usuario.es_admin,
      activo: usuario.activo,
    } : VACIO)
  }, [open, usuario])

  const guardar = async () => {
    setGuardando(true)
    try {
      if (usuario) {
        const payload = { nombre: form.nombre, es_admin: form.es_admin, activo: form.activo }
        if (form.password) payload.password = form.password
        await actualizarUsuario(usuario.id, payload)
      } else {
        await crearUsuario({
          numero_control: form.numero_control,
          nombre: form.nombre,
          password: form.password,
          es_admin: form.es_admin,
        })
      }
      onSaved()
    } finally {
      setGuardando(false)
    }
  }

  const puedeGuardar = form.nombre && (usuario || (form.numero_control && form.password))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{usuario ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Número de control" required fullWidth
            value={form.numero_control}
            disabled={!!usuario}
            onChange={(e) => setForm({ ...form, numero_control: e.target.value })}
          />
          <TextField
            label="Nombre" required fullWidth
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <TextField
            label={usuario ? 'Nueva contraseña' : 'Contraseña'} required={!usuario} fullWidth
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            helperText={usuario ? 'Déjalo en blanco para no cambiarla' : ''}
          />
          <FormControlLabel
            control={<Switch checked={form.es_admin} onChange={(e) => setForm({ ...form, es_admin: e.target.checked })} />}
            label="Administrador (puede crear y editar usuarios)"
          />
          {usuario && (
            <FormControlLabel
              control={<Switch checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />}
              label="Activo (puede iniciar sesión)"
            />
          )}
          {!usuario && (
            <Typography variant="caption" color="text.secondary">
              El número de control y la contraseña son lo que la persona usará para iniciar sesión.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disableElevation onClick={guardar} disabled={guardando || !puedeGuardar}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
