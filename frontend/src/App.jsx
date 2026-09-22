import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import Layout from './components/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ProductosPage from './pages/ProductosPage.jsx'
import StockInventoryPage from './pages/StockInventoryPage.jsx'
import EmpleadosPage from './pages/EmpleadosPage.jsx'
import ControlResguardoPage from './pages/ControlResguardoPage.jsx'
import ClaseFamiliaPage from './pages/ClaseFamiliaPage.jsx'
import DepartamentoPage from './pages/DepartamentoPage.jsx'
import ReporteSalidasPage from './pages/ReporteSalidasPage.jsx'
import BajaHerramientaPage from './pages/BajaHerramientaPage.jsx'
import IncidenciaHerramientaPage from './pages/IncidenciaHerramientaPage.jsx'
import UsuariosPage from './pages/UsuariosPage.jsx'
import { useAuth } from './context/AuthContext.jsx'

export default function App() {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!usuario) {
    return <LoginPage />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/productos" element={<ProductosPage />} />
        <Route path="/stock-inventory" element={<StockInventoryPage />} />
        <Route path="/empleados" element={<EmpleadosPage />} />
        <Route path="/control-de-resguardo" element={<ControlResguardoPage />} />
        <Route path="/clase-familia" element={<ClaseFamiliaPage />} />
        <Route path="/departamento" element={<DepartamentoPage />} />
        <Route path="/reporte-de-salidas" element={<ReporteSalidasPage />} />
        <Route path="/baja-de-herramienta" element={<BajaHerramientaPage />} />
        <Route path="/incidencia-de-herramienta" element={<IncidenciaHerramientaPage />} />
        <Route
          path="/usuarios"
          element={usuario.es_admin ? <UsuariosPage /> : <Navigate to="/productos" replace />}
        />
      </Routes>
    </Layout>
  )
}
