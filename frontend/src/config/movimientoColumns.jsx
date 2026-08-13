import Thumbnail from '../components/Thumbnail.jsx'
import { formatoFecha, formatoMoneda } from '../utils/formatters.js'

/**
 * Set completo de columnas para la tabla "Related CONTROL DE RESGUARDOs",
 * igual al que muestra AppSheet en su vista inline (Fecha Movimiento ... Costo Unitario).
 * Se usa en los detail panels de PRODUCTOS, EMPLEADOS, DEPARTAMENTO y CLASE FAMILIA.
 */
export function columnasMovimientoCompletas() {
  return [
    { field: 'fecha_movimiento', headerName: 'Fecha Movimiento', renderCell: (m) => formatoFecha(m.fecha_movimiento) },
    { field: 'numero_de_vale', headerName: 'Numero de Vale' },
    { field: 'foto_vale_de_salida', headerName: 'Foto Vale de Salida', renderCell: (m) => <Thumbnail src={m.foto_vale_de_salida} size={32} /> },
    { field: 'tipo_movimiento', headerName: 'Tipo Movimiento' },
    { field: 'id_numero_empleado', headerName: 'ID Numero Empleado' },
    { field: 'nombre_de_empleado', headerName: 'Nombre de Empleado' },
    { field: 'puesto_posicion', headerName: 'Puesto / Posicion' },
    { field: 'departamento', headerName: 'Departamento' },
    { field: 'jefe_inmediato', headerName: 'Jefe Inmediato' },
    { field: 'status', headerName: 'Status' },
    { field: 'codigo_sai_sku', headerName: 'Codigo SAI SKU' },
    { field: 'descripcion', headerName: 'Descripcion' },
    { field: 'udm', headerName: 'UDM' },
    { field: 'numero_economico', headerName: 'Numero Economico' },
    { field: 'clase_familia', headerName: 'Clase / Familia' },
    { field: 'cantidad', headerName: 'Cantidad' },
    { field: 'foto_producto_snapshot', headerName: 'Foto Producto', renderCell: (m) => <Thumbnail src={m.foto_producto_snapshot} size={32} /> },
    { field: 'foto_numero_serie', headerName: 'Foto # Numero Serie', renderCell: (m) => <Thumbnail src={m.foto_numero_serie} size={32} /> },
    { field: 'firma_recibido_conformidad', headerName: 'Firma de Recibido y Conformidad', renderCell: (m) => <Thumbnail src={m.firma_recibido_conformidad} size={32} bg="#FFFFFF" /> },
    { field: 'observaciones', headerName: 'Observaciones' },
    { field: 'costo_unitario', headerName: 'Costo Unitario', renderCell: (m) => formatoMoneda(m.costo_unitario) },
  ]
}
