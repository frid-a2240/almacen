import { useState } from 'react'
import { Box, IconButton, Link, Tooltip } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import { useNavigate } from 'react-router-dom'
import DetailPanel from './DetailPanel.jsx'
import RelatedTable from './RelatedTable.jsx'
import { imageURL } from '../api/client.js'
import { descargarAsignadosExcel } from '../api/productos.js'
import { formatoFecha, formatoMoneda } from '../utils/formatters.js'
import { columnasMovimientoCompletas } from '../config/movimientoColumns.jsx'

export default function ProductoDetailPanel({ producto, clases, movimientos, onEdit, onDelete, onClose }) {
  const navigate = useNavigate()
  const clase = clases.find((c) => c.id === producto.clase_familia_id)
  const [descargando, setDescargando] = useState(false)

  const descargarAsignados = async () => {
    setDescargando(true)
    try {
      await descargarAsignadosExcel(producto.codigo_sai_sku)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <DetailPanel
      title={producto.descripcion}
      photo={producto.foto_producto}
      onEdit={onEdit}
      onDelete={onDelete}
      onClose={onClose}
      extraActions={
        <Tooltip title="Descargar quién la tiene asignada (Excel)">
          <span>
            <IconButton size="small" onClick={descargarAsignados} disabled={descargando} sx={{ color: 'text.secondary' }}>
              <FileDownloadOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      }
      fields={[
        { label: 'Row ID', value: producto.appsheet_row_id },
        { label: 'Tool Id', value: producto.tool_id },
        { label: 'Código SAI / SKU', value: producto.codigo_sai_sku },
        {
          label: 'Stock',
          value: (
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main', fontWeight: 700 }}>
              <Inventory2OutlinedIcon sx={{ fontSize: 16 }} />{producto.stock}
            </Box>
          ),
        },
        { label: 'UDM', value: producto.udm },
        { label: 'Almacén', value: producto.almacen },
        {
          label: 'Clase / Familia',
          value: producto.clase_familia_nombre,
          action: clase && (
            <IconButton size="small" onClick={() => navigate(`/clase-familia?sel=${clase.id}`)}>
              <MenuBookOutlinedIcon fontSize="small" />
            </IconButton>
          ),
        },
        { label: 'Número económico', value: producto.numero_economico },
        { label: 'Inventario inicial', value: producto.inventario_inicial },
        { label: 'Costo unitario', value: formatoMoneda(producto.costo_unitario) },
        { label: 'Ubicación', value: producto.ubicacion },
        { label: 'Mínimo', value: producto.minimo },
        { label: 'Máximo', value: producto.maximo },
        { label: 'Fecha de alta', value: formatoFecha(producto.fecha_de_alta) },
        {
          label: 'Scan Document',
          value: producto.scan_document && (
            <Link href={imageURL(producto.scan_document)} target="_blank" rel="noopener" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DescriptionOutlinedIcon fontSize="small" /> Ver documento
            </Link>
          ),
        },
      ]}
    >
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
