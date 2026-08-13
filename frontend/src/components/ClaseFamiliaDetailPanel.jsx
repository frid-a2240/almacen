import { useNavigate } from 'react-router-dom'
import DetailPanel from './DetailPanel.jsx'
import RelatedRowList from './RelatedRowList.jsx'
import RelatedTable from './RelatedTable.jsx'
import { columnasMovimientoCompletas } from '../config/movimientoColumns.jsx'

export default function ClaseFamiliaDetailPanel({ clase, productos, movimientos, onEdit, onDelete, onClose }) {
  const navigate = useNavigate()

  return (
    <DetailPanel
      title={clase.clase_familia}
      onEdit={onEdit}
      onDelete={onDelete}
      onClose={onClose}
      fields={[
        { label: 'ID Clase Fam', value: clase.id_clase_fam },
      ]}
    >
      <RelatedRowList
        title="Related PRODUCTOSs"
        items={productos}
        keyFn={(p) => p.codigo_sai_sku}
        photoFn={(p) => p.foto_producto}
        titleFn={(p) => p.descripcion}
        subtitleFn={(p) => p.codigo_sai_sku}
        onRowClick={(p) => navigate(`/productos?sel=${p.codigo_sai_sku}`)}
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
