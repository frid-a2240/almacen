import { useNavigate } from 'react-router-dom'
import DetailPanel from './DetailPanel.jsx'
import RelatedRowList from './RelatedRowList.jsx'
import RelatedTable from './RelatedTable.jsx'
import { columnasMovimientoCompletas } from '../config/movimientoColumns.jsx'

export default function DepartamentoDetailPanel({ departamento: d, empleados, movimientos, onEdit, onDelete, onClose }) {
  const navigate = useNavigate()

  return (
    <DetailPanel
      title={d.departamento}
      photo={d.foto_depto}
      onEdit={onEdit}
      onDelete={onDelete}
      onClose={onClose}
      fields={[
        { label: 'ID', value: d.appsheet_id },
        { label: 'Encargado de Departamento', value: d.encargado_departamento },
      ]}
    >
      <RelatedRowList
        title="Related EMPLEADOSs"
        items={empleados}
        keyFn={(e) => e.id_numero_empleado}
        photoFn={(e) => e.foto_empleado}
        titleFn={(e) => e.nombre_de_empleado}
        subtitleFn={(e) => e.puesto_posicion}
        onRowClick={(e) => navigate(`/empleados?sel=${e.id_numero_empleado}`)}
      />
      <RelatedTable
        title="Related CONTROL DE RESGUARDOs"
        rows={movimientos}
        keyFn={(m) => m.row_id}
        onRowClick={(m) => navigate(`/control-de-resguardo?sel=${m.row_id}`)}
        columns={columnasMovimientoCompletas()}
      />
    </DetailPanel>
  )
}
