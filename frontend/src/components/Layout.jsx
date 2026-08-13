import { useState } from 'react'
import { Box } from '@mui/material'
import TopAppBar from './TopAppBar.jsx'
import Sidebar from './Sidebar.jsx'
import { APPBAR_HEIGHT } from './Sidebar.jsx'
import { SearchProvider } from '../context/SearchContext.jsx'

export default function Layout({ children }) {
  const [sidebarAbierto, setSidebarAbierto] = useState(true)

  return (
    <SearchProvider>
      <Box sx={{ display: 'flex' }}>
        <TopAppBar onToggleSidebar={() => setSidebarAbierto((v) => !v)} />
        <Sidebar open={sidebarAbierto} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            mt: `${APPBAR_HEIGHT}px`,
            height: `calc(100vh - ${APPBAR_HEIGHT}px)`,
            overflowY: 'auto',
            bgcolor: 'background.default',
          }}
        >
          {children}
        </Box>
      </Box>
    </SearchProvider>
  )
}
