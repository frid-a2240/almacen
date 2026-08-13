import { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack } from '@mui/material'
import CampoFoto from './CampoFoto.jsx'
import { crearDepartamento, actualizarDepartamento, subirFotoDepartamento } from '../api/departamentos.js'

const VACIO = { departamento: '', encargado_departamento: '' }

export default function DepartamentoFormDialog({ open, onClose, onSaved, departamento }) {
  const [form, setForm] = useState(VACIO)
  const [foto, setFoto] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    setFoto(null)
    setForm(departamento
      ? { departamento: departamento.departamento, encargado_departamento: departamento.encargado_departamento || '' }
      : VACIO)
  }, [open, departamento])

  const guardar = async () => {
    setGuardando(true)
    try {
      let id = departamento?.id
      if (departamento) await actualizarDepartamento(id, form)
      else {
        const creado = await crearDepartamento(form)
        id = creado.id
      }
      if (foto) await subirFotoDepartamento(id, foto)
      onSaved(id)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{departamento ? 'Editar departamento' : 'Nuevo departamento'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <CampoFoto
            label="Foto Depto."
            thumb={foto ? URL.createObjectURL(foto) : departamento?.foto_depto}
            onChange={setFoto}
          />
          <TextField
            label="Departamento" required fullWidth
            value={form.departamento}
            onChange={(e) => setForm({ ...form, departamento: e.target.value })}
          />
          <TextField
            label="Encargado de departamento" fullWidth
            value={form.encargado_departamento}
            onChange={(e) => setForm({ ...form, encargado_departamento: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disableElevation onClick={guardar} disabled={guardando || !form.departamento}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
