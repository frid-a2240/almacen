import { Box, Typography, IconButton } from '@mui/material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import { useNavigate } from 'react-router-dom'
import DetailPanel from './DetailPanel.jsx'
import Thumbnail from './Thumbnail.jsx'
import { formatoFecha, formatoMoneda } from '../utils/formatters.js'

function ImagenCampo({ label, src, bg }) {
  if (!src) return null
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.5 }}>
        <Thumbnail src={src} shape="rounded" size={140} bg={bg} />
      </Box>
    </Box>
  )
}

export default function MovimientoDetailPanel({ movimiento: m, departamentos = [], onEdit, onDelete, onClose }) {
  const navigate = useNavigate()
  const depto = departamentos.find((d) => d.departamento === m.departamento)

  return (
    <DetailPanel
      title={m.descripcion}
      photo={m.foto_producto_snapshot || m.foto_vale_de_salida}
      onEdit={onEdit}
      onDelete={onDelete}
      onClose={onClose}
      fields={[
        { label: 'Fecha Movimiento', value: formatoFecha(m.fecha_movimiento) },
        { label: 'Numero de Vale', value: m.numero_de_vale },
        { label: 'Tipo Movimiento', value: m.tipo_movimiento },
        {
          label: 'ID Numero Empleado / Nombre de Empleado',
          value: `${m.id_numero_empleado || ''} — ${m.nombre_de_empleado || ''}`,
          action: m.empleado_id && (
            <IconButton size="small" onClick={() => navigate(`/empleados?sel=${m.empleado_id}`)}>
              <HowToRegOutlinedIcon fontSize="small" />
            </IconButton>
          ),
        },
        { label: 'Puesto / Posicion', value: m.puesto_posicion },
        {
          label: 'Departamento',
          value: m.departamento,
          action: depto && (
            <IconButton size="small" onClick={() => navigate(`/departamento?sel=${depto.id}`)}>
              <HomeOutlinedIcon fontSize="small" />
            </IconButton>
          ),
        },
        { label: 'Jefe Inmediato', value: m.jefe_inmediato },
        { label: 'Status', value: m.status },
        {
          label: 'Codigo SAI SKU / Descripcion',
          value: `${m.codigo_sai_sku || ''} — ${m.descripcion || ''}`,
          action: m.producto_sku && (
            <IconButton size="small" onClick={() => navigate(`/productos?sel=${m.producto_sku}`)}>
              <BuildOutlinedIcon fontSize="small" />
            </IconButton>
          ),
        },
        { label: 'UDM', value: m.udm },
        { label: 'Numero Economico', value: m.numero_economico },
        { label: 'Clase / Familia', value: m.clase_familia },
        { label: 'Costo Unitario', value: formatoMoneda(m.costo_unitario) },
        { label: 'Cantidad', value: m.cantidad },
        { label: 'Observaciones', value: m.observaciones },
      ]}
    >
      <ImagenCampo label="Foto Vale de Salida" src={m.foto_vale_de_salida} />
      <ImagenCampo label="Foto Producto" src={m.foto_producto_snapshot} />
      <ImagenCampo label="Foto # Numero Serie" src={m.foto_numero_serie} />
      <ImagenCampo label="Firma de Recibido y Conformidad" src={m.firma_recibido_conformidad} bg="#FFFFFF" />
    </DetailPanel>
  )
}
