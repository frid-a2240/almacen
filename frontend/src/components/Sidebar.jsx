import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined'
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined'
import { useNavigate, useLocation } from 'react-router-dom'
import { VIEWS } from '../config/views.js'
import { useAuth } from '../context/AuthContext.jsx'

export const DRAWER_WIDTH = 270
export const APPBAR_HEIGHT = 64

export default function Sidebar({ open = true }) {
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

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        transition: transicion,
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH : 0,
          boxSizing: 'border-box',
          top: APPBAR_HEIGHT,
          height: `calc(100% - ${APPBAR_HEIGHT}px)`,
          overflowX: 'hidden',
          borderRight: open ? undefined : 'none',
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
              onClick={() => navigate(path)}
              sx={{
                mx: 1,
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'rgba(0, 175, 170, 0.14)',
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
                slotProps={{ primary: { fontSize: 14, fontWeight: activo ? 600 : 400 } }}
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
              onClick={path ? () => navigate(path) : undefined}
              sx={{
                mx: 1,
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'rgba(0, 175, 170, 0.14)',
                  '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={name} slotProps={{ primary: { fontSize: 14, fontWeight: activo ? 600 : 400 } }} />
            </ListItemButton>
          )
        })}
      </List>
      <Box sx={{ flexGrow: 1 }} />
    </Drawer>
  )
}
