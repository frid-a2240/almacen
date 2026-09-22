import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material'
import { alpha } from '@mui/material/styles'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined'
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined'
import { useNavigate, useLocation } from 'react-router-dom'
import { VIEWS } from '../config/views.js'
import { useAuth } from '../context/AuthContext.jsx'

export const DRAWER_WIDTH = 270
export const APPBAR_HEIGHT = 64

export default function Sidebar({ open = true, esMovil = false, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario } = useAuth()

  const extraItems = [
    ...(usuario?.es_admin ? [{ name: 'Usuarios', icon: PeopleOutlinedIcon, path: '/usuarios' }] : []),
    { name: 'Feedback', icon: FeedbackOutlinedIcon },
    { name: 'App Gallery', icon: AppsOutlinedIcon },
  ]

  const transicion = (theme) => theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  })

  // En móvil el menú es un panel que se desliza encima del contenido (y se
  // cierra solo al navegar); en escritorio es el panel fijo de siempre que
  // empuja el contenido y se puede colapsar a ancho 0 con el botón hamburguesa.
  const ir = (path) => {
    navigate(path)
    if (esMovil) onClose?.()
  }

  return (
    <Drawer
      variant={esMovil ? 'temporary' : 'permanent'}
      open={esMovil ? open : true}
      onClose={onClose}
      ModalProps={esMovil ? { keepMounted: true } : undefined}
      sx={{
        width: !esMovil && open ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        transition: transicion,
        '& .MuiDrawer-paper': {
          width: esMovil ? DRAWER_WIDTH : (open ? DRAWER_WIDTH : 0),
          boxSizing: 'border-box',
          top: APPBAR_HEIGHT,
          height: `calc(100% - ${APPBAR_HEIGHT}px)`,
          overflowX: 'hidden',
          borderRight: (esMovil || open) ? undefined : 'none',
          transition: transicion,
        },
      }}
    >
      <List sx={{ py: 1 }}>
        {VIEWS.map(({ name, path, icon: Icon }) => {
          const activo = location.pathname === path
          return (
            <ListItemButton
              key={path}
              selected={activo}
              onClick={() => ir(path)}
              sx={{
                mx: 1,
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.14),
                  '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={name}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: 15,
                    fontWeight: activo ? 600 : 400,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  },
                }}
              />
            </ListItemButton>
          )
        })}
      </List>
      <Divider sx={{ mx: 2 }} />
      <List sx={{ py: 1 }}>
        {extraItems.map(({ name, icon: Icon, path }) => {
          const activo = path && location.pathname === path
          return (
            <ListItemButton
              key={name}
              selected={activo}
              onClick={path ? () => ir(path) : undefined}
              sx={{
                mx: 1,
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.14),
                  '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={name} slotProps={{ primary: { fontSize: 15, fontWeight: activo ? 600 : 400 } }} />
            </ListItemButton>
          )
        })}
      </List>
      <Box sx={{ flexGrow: 1 }} />
    </Drawer>
  )
}
