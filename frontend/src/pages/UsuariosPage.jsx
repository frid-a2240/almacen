import { useEffect, useState } from 'react'
import {
  Box, CircularProgress, Typography, IconButton, Chip, Avatar,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined'
import ViewHeader from '../components/ViewHeader.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import UsuarioFormDialog from '../components/UsuarioFormDialog.jsx'
import { listarUsuarios, eliminarUsuario } from '../api/usuarios.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function UsuariosPage() {
  const { usuario: usuarioActual } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [aEliminar, setAEliminar] = useState(null)

  const cargar = () => {
    setCargando(true)
    listarUsuarios().then(setUsuarios).finally(() => setCargando(false))
  }
  useEffect(cargar, [])

  const abrirNuevo = () => {
    setEditando(null)
    setDialogoAbierto(true)
  }

  const abrirEditar = (u) => {
    setEditando(u)
    setDialogoAbierto(true)
  }

  const confirmarEliminar = async () => {
    await eliminarUsuario(aEliminar.id)
    setAEliminar(null)
    cargar()
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ViewHeader title="USUARIOS" onAdd={abrirNuevo} />
      {cargando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
      ) : (
        <Box sx={{ overflowY: 'auto' }}>
          {usuarios.map((u) => (
            <Box
              key={u.id}
              sx={{
                display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1.5,
                borderBottom: '1px solid', borderColor: 'divider',
              }}
            >
              <Avatar sx={{ bgcolor: '#2A2A2A' }}><PersonOutlineIcon /></Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography fontWeight={600} fontSize={15}>{u.nombre}</Typography>
                  {u.es_admin && <Chip label="Administrador" size="small" color="primary" sx={{ height: 20, fontSize: 11 }} />}
                  {!u.activo && <Chip label="Inactivo" size="small" sx={{ height: 20, fontSize: 11 }} />}
                </Box>
                <Typography fontSize={13} color="text.secondary">Número de control: {u.numero_control}</Typography>
              </Box>
              <IconButton size="small" onClick={() => abrirEditar(u)} sx={{ color: 'text.secondary' }}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small" disabled={u.id === usuarioActual.id}
                onClick={() => setAEliminar(u)}
                sx={{ color: 'text.secondary' }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <UsuarioFormDialog
        open={dialogoAbierto}
        onClose={() => setDialogoAbierto(false)}
        usuario={editando}
        onSaved={() => { setDialogoAbierto(false); cargar() }}
      />

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar usuario"
        message={`¿Eliminar a "${aEliminar?.nombre}"? Ya no podrá iniciar sesión.`}
        onCancel={() => setAEliminar(null)}
        onConfirm={confirmarEliminar}
      />
    </Box>
  )
}
