import { useEffect, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined'
import ViewHeader from '../components/ViewHeader.jsx'
import StatTile from '../components/StatTile.jsx'
import MovimientosPorMesChart from '../components/charts/MovimientosPorMesChart.jsx'
import { obtenerResumenDashboard } from '../api/dashboard.js'

export default function DashboardPage() {
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    obtenerResumenDashboard().then(setResumen).finally(() => setCargando(false))
  }, [])

  const pctActivos = resumen && resumen.empleados_total
    ? Math.round((resumen.empleados_activos / resumen.empleados_total) * 100)
    : 0

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ViewHeader title="DASHBOARD" />
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
        {cargando ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 1100 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <StatTile
                icon={NewReleasesOutlinedIcon}
                label="Artículos dados de alta este mes"
                value={resumen.productos_alta_mes}
              />
              <StatTile
                icon={Inventory2OutlinedIcon}
                label="Herramienta / Productos"
                value={resumen.productos_total}
                sublabel={`Stock total: ${resumen.stock_total.toLocaleString('es-MX')}`}
              />
              <StatTile
                icon={PeopleAltOutlinedIcon}
                label="Empleados"
                value={resumen.empleados_total}
                sublabel={`${resumen.empleados_activos} activos (${pctActivos}%) · ${resumen.empleados_inactivos} inactivos`}
              />
              <StatTile
                icon={BuildOutlinedIcon}
                label="Mantenimiento de herramienta"
                pendiente
              />
              <StatTile
                icon={NotificationsActiveOutlinedIcon}
                label="Notificaciones de mantenimiento"
                pendiente
              />
            </Box>

            <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
              <MovimientosPorMesChart datos={resumen.movimientos_por_mes} />
            </Box>

            <Typography variant="caption" color="text.secondary">
              Mantenimiento de herramienta y sus notificaciones todavía no tienen datos capturados en el sistema — quedan pendientes.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
