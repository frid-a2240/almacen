import { useState } from 'react'
import { IconButton, Tooltip, Snackbar, Alert } from '@mui/material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import { useNavigate } from 'react-router-dom'
import DetailPanel from './DetailPanel.jsx'
import RelatedTable from './RelatedTable.jsx'
import { formatoFecha } from '../utils/formatters.js'
import { columnasMovimientoCompletas } from '../config/movimientoColumns.jsx'
import { descargarResguardoExcel, descargarHistoricoExcel, obtenerResguardoPdf, obtenerNoAdeudoPdf } from '../api/empleados.js'
import { imprimirPdf, abrirVentanaImpresion } from '../utils/imprimir.js'
import { mensajeDeError } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function EmpleadoDetailPanel({ empleado, departamentos, movimientos, onEdit, onDelete, onClose }) {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const puedeImprimir = !usuario?.solo_consulta
  const depto = departamentos.find((d) => d.id === empleado.departamento_id)
  const [descargando, setDescargando] = useState(false)
  const [descargandoHistorico, setDescargandoHistorico] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [imprimiendoNoAdeudo, setImprimiendoNoAdeudo] = useState(false)
  const [avisoNoAdeudo, setAvisoNoAdeudo] = useState('')

  const descargarResguardo = async () => {
    setDescargando(true)
    try {
      await descargarResguardoExcel(empleado.id_numero_empleado)
    } finally {
      setDescargando(false)
    }
  }

  const descargarHistorico = async () => {
    setDescargandoHistorico(true)
    try {
      await descargarHistoricoExcel(empleado.id_numero_empleado)
    } finally {
      setDescargandoHistorico(false)
    }
  }

  const imprimirResguardo = async () => {
    // Igual que al imprimir el vale: la pestaña se abre AQUÍ, antes de
    // cualquier await, para que el navegador no la bloquee como pop-up.
    const ventanaImpresion = abrirVentanaImpresion()
    setImprimiendo(true)
    try {
      const pdf = await obtenerResguardoPdf(empleado.id_numero_empleado)
      await imprimirPdf(pdf, `resguardo_${empleado.id_numero_empleado}`, ventanaImpresion)
    } catch (err) {
      ventanaImpresion?.close()
      throw err
    } finally {
      setImprimiendo(false)
    }
  }

  const imprimirNoAdeudo = async () => {
    const ventanaImpresion = abrirVentanaImpresion()
    setImprimiendoNoAdeudo(true)
    try {
      const pdf = await obtenerNoAdeudoPdf(empleado.id_numero_empleado)
      await imprimirPdf(pdf, `no_adeudo_${empleado.id_numero_empleado}`, ventanaImpresion)
    } catch (err) {
      ventanaImpresion?.close()
      setAvisoNoAdeudo(mensajeDeError(err) || 'No se pudo generar la constancia de no adeudo.')
    } finally {
      setImprimiendoNoAdeudo(false)
    }
  }

  return (
    <>
    <DetailPanel
      title={empleado.nombre_de_empleado}
      photo={empleado.foto_empleado}
      photoShape="round"
      onEdit={onEdit}
      onDelete={onDelete}
      onClose={onClose}
      extraActions={
        <>
          <Tooltip title="Descargar resguardo (Excel)">
            <span>
              <IconButton size="small" onClick={descargarResguardo} disabled={descargando} sx={{ color: 'text.secondary' }}>
                <FileDownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Registro histórico de herramienta (Excel)">
            <span>
              <IconButton size="small" onClick={descargarHistorico} disabled={descargandoHistorico} sx={{ color: 'text.secondary' }}>
                <HistoryOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {puedeImprimir && (
            <Tooltip title="Imprimir resguardo">
              <span>
                <IconButton size="small" onClick={imprimirResguardo} disabled={imprimiendo} sx={{ color: 'text.secondary' }}>
                  <PrintOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {puedeImprimir && (
            <Tooltip title="Constancia de No Adeudo (para dar de baja)">
              <span>
                <IconButton size="small" onClick={imprimirNoAdeudo} disabled={imprimiendoNoAdeudo} sx={{ color: 'text.secondary' }}>
                  <FactCheckOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </>
      }
      fields={[
        { label: 'Row ID', value: empleado.appsheet_row_id },
        { label: 'ID Numero Empleado', value: empleado.id_numero_empleado },
        { label: 'Puesto / Posicion', value: empleado.puesto_posicion },
        {
          label: 'Departamento',
          value: empleado.departamento_nombre,
          action: depto && (
            <IconButton size="small" onClick={() => navigate(`/departamento?sel=${depto.id}`)}>
              <HomeOutlinedIcon fontSize="small" />
            </IconButton>
          ),
        },
        { label: 'Jefe Inmediato', value: empleado.jefe_inmediato },
        { label: 'Status', value: empleado.status_empleado },
        { label: 'Fecha de Ingreso', value: formatoFecha(empleado.fecha_de_ingreso) },
        { label: 'Correo Electronico', value: empleado.correo_electronico },
        { label: 'Telefono', value: empleado.telefono },
      ]}
    >
      <RelatedTable
        title="Related CONTROL DE RESGUARDOs By NOMBRE DE EMPLEADO"
        rows={movimientos}
        keyFn={(m) => m.row_id}
        onRowClick={(m) => navigate(`/control-de-resguardo?sel=${m.row_id}`)}
        columns={columnasMovimientoCompletas()}
      />
    </DetailPanel>
    <Snackbar open={!!avisoNoAdeudo} autoHideDuration={6000} onClose={() => setAvisoNoAdeudo('')}>
      <Alert severity="warning" onClose={() => setAvisoNoAdeudo('')} sx={{ width: '100%' }}>
        {avisoNoAdeudo}
      </Alert>
    </Snackbar>
    </>
  )
}
