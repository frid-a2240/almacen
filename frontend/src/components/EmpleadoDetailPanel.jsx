import { useState } from 'react'
import { IconButton, Tooltip } from '@mui/material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import { useNavigate } from 'react-router-dom'
import DetailPanel from './DetailPanel.jsx'
import RelatedTable from './RelatedTable.jsx'
import { formatoFecha } from '../utils/formatters.js'
import { columnasMovimientoCompletas } from '../config/movimientoColumns.jsx'
import { descargarResguardoExcel } from '../api/empleados.js'

export default function EmpleadoDetailPanel({ empleado, departamentos, movimientos, onEdit, onDelete, onClose }) {
  const navigate = useNavigate()
  const depto = departamentos.find((d) => d.id === empleado.departamento_id)
  const [descargando, setDescargando] = useState(false)

  const descargarResguardo = async () => {
    setDescargando(true)
    try {
      await descargarResguardoExcel(empleado.id_numero_empleado)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <DetailPanel
      title={empleado.nombre_de_empleado}
      photo={empleado.foto_empleado}
      photoShape="round"
      onEdit={onEdit}
      onDelete={onDelete}
      onClose={onClose}
      extraActions={
        <Tooltip title="Descargar resguardo (Excel)">
          <span>
            <IconButton size="small" onClick={descargarResguardo} disabled={descargando} sx={{ color: 'text.secondary' }}>
              <FileDownloadOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
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
  )
}
