import { useState } from 'react'
import {
  AppBar, Toolbar, IconButton, Typography, InputBase, Avatar, Box, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Tooltip,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/Search'
import RefreshIcon from '@mui/icons-material/Refresh'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import CheckIcon from '@mui/icons-material/Check'
import { useLocation } from 'react-router-dom'
import { VIEWS } from '../config/views.js'
import { APPBAR_HEIGHT } from './Sidebar.jsx'
import { useSearch } from '../context/SearchContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useThemeMode } from '../context/ThemeModeContext.jsx'

export default function TopAppBar({ onToggleSidebar }) {
  const location = useLocation()
  const vista = VIEWS.find((v) => v.path === location.pathname)
  const nombreVista = vista ? vista.name : ''
  const { query, setQuery } = useSearch()
  const { usuario, logout } = useAuth()
  const { modo, setModo, opciones } = useThemeMode()
  const [anclaMenu, setAnclaMenu] = useState(null)
  const [anclaTema, setAnclaTema] = useState(null)
  const inicial = usuario?.nombre?.trim()?.[0]?.toUpperCase() || '?'

  return (
    <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, height: APPBAR_HEIGHT }}>
      <Toolbar sx={{ height: APPBAR_HEIGHT, gap: { xs: 1, sm: 2 }, px: { xs: 1.5, sm: 3 } }}>
        <IconButton edge="start" onClick={onToggleSidebar} sx={{ color: 'text.primary' }}>
          <MenuIcon />
        </IconButton>
        <Box component="img" src={`${import.meta.env.BASE_URL}logo-icon.png`} alt="ISP" sx={{ width: 30, height: 30, flexShrink: 0 }} />
        <Typography
          variant="subtitle1" fontWeight={600} noWrap
          sx={{ mr: 2, letterSpacing: 0.5, display: { xs: 'none', sm: 'block' } }}
        >
          PAÑOL
        </Typography>

        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          {location.pathname !== '/dashboard' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: (t) => (t.palette.mode === 'dark' ? '#2A2A2A' : '#F0F2F5'),
                borderRadius: 5,
                px: 2,
                py: 0.5,
                width: '100%',
                minWidth: 0,
                maxWidth: 480,
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => e.currentTarget.parentElement.querySelector('input')?.focus()}
                sx={{ p: 0, mr: 1, color: 'text.secondary', flexShrink: 0 }}
              >
                <SearchIcon fontSize="small" />
              </IconButton>
              <InputBase
                placeholder={`Search ${nombreVista}`}
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                sx={{ fontSize: 14, color: 'text.primary', minWidth: 0 }}
              />
            </Box>
          )}
        </Box>

        <Tooltip title="Cambiar tema">
          <IconButton onClick={(e) => setAnclaTema(e.currentTarget)} sx={{ color: 'text.primary' }}>
            <PaletteOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={anclaTema} open={!!anclaTema} onClose={() => setAnclaTema(null)}>
          {Object.entries(opciones).map(([clave, { nombre }]) => (
            <MenuItem key={clave} selected={clave === modo} onClick={() => { setModo(clave); setAnclaTema(null) }}>
              <ListItemIcon>{clave === modo && <CheckIcon fontSize="small" />}</ListItemIcon>
              <ListItemText>{nombre}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
        <IconButton sx={{ color: 'text.primary', display: { xs: 'none', md: 'inline-flex' } }}>
          <RefreshIcon />
        </IconButton>
        <IconButton
          onClick={(e) => setAnclaMenu(e.currentTarget)}
          sx={{ color: 'text.primary', display: { xs: 'none', sm: 'inline-flex' } }}
        >
          <ExpandMoreIcon />
        </IconButton>
        <IconButton onClick={(e) => setAnclaMenu(e.currentTarget)} sx={{ p: 0, flexShrink: 0 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 14 }}>
            {inicial}
          </Avatar>
        </IconButton>

        <Menu anchorEl={anclaMenu} open={!!anclaMenu} onClose={() => setAnclaMenu(null)}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography fontWeight={600} fontSize={14}>{usuario?.nombre}</Typography>
            <Typography fontSize={12} color="text.secondary">Número de control: {usuario?.numero_control}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={logout}>
            <ListItemIcon><LogoutOutlinedIcon fontSize="small" /></ListItemIcon>
            Cerrar sesión
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
