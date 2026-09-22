import { useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { useLocation } from 'react-router-dom'
import TopAppBar from './TopAppBar.jsx'
import Sidebar from './Sidebar.jsx'
import { APPBAR_HEIGHT } from './Sidebar.jsx'
import { SearchProvider } from '../context/SearchContext.jsx'
import useEsMovil from '../hooks/useEsMovil.js'

export default function Layout({ children }) {
  const esMovil = useEsMovil()
  const location = useLocation()
  const [sidebarAbierto, setSidebarAbierto] = useState(!esMovil)

  // En escritorio el menú arranca abierto; en móvil arranca cerrado (es un
  // panel que se desliza encima del contenido) y se cierra solo al navegar.
  useEffect(() => { setSidebarAbierto(!esMovil) }, [esMovil])
  useEffect(() => { if (esMovil) setSidebarAbierto(false) }, [location.pathname])

  return (
    <SearchProvider>
      <Box sx={{ display: 'flex' }}>
        <TopAppBar onToggleSidebar={() => setSidebarAbierto((v) => !v)} />
        <Sidebar open={sidebarAbierto} esMovil={esMovil} onClose={() => setSidebarAbierto(false)} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            mt: `${APPBAR_HEIGHT}px`,
            height: `calc(100vh - ${APPBAR_HEIGHT}px)`,
            overflowY: 'auto',
            overflowX: 'hidden',
            bgcolor: 'background.default',
          }}
        >
          {children}
        </Box>
      </Box>
    </SearchProvider>
  )
}
