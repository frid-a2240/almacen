import { IconButton } from '@mui/material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import { useNavigate } from 'react-router-dom'
import DetailPanel from './DetailPanel.jsx'
import RelatedTable from './RelatedTable.jsx'
import { formatoFecha } from '../utils/formatters.js'
import { columnasMovimientoCompletas } from '../config/movimientoColumns.jsx'

export default function EmpleadoDetailPanel({ empleado, departamentos, movimientos, onEdit, onDelete, onClose }) {
  const navigate = useNavigate()
  const depto = departamentos.find((d) => d.id === empleado.departamento_id)

  return (
    <DetailPanel
      title={empleado.nombre_de_empleado}
      photo={empleado.foto_empleado}
      photoShape="round"
      onEdit={onEdit}
      onDelete={onDelete}
      onClose={onClose}
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
