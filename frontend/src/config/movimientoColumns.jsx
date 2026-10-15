import { Chip } from '@mui/material'
import Thumbnail from '../components/Thumbnail.jsx'
import { formatoFecha, formatoMoneda } from '../utils/formatters.js'
import { calcularSaldosMovimientos, estadoSalida } from '../utils/saldoMovimientos.js'

/**
 * `filasCompletas`: TODOS los movimientos del mismo contexto que se está
 * mostrando (el empleado/producto/departamento/clase-familia de la ficha) —
 * se usa solo para calcular, fila por fila, si una SALIDA ya quedó en 0
 * (columna "Estado"); sin ella, la tabla sigue funcionando pero esa columna
 * no distingue nada (ver nota de esTodasVigentes abajo).
 */
export function columnasMovimientoCompletas(filasCompletas = []) {
  const mapaSaldos = calcularSaldosMovimientos(filasCompletas)
  return [
    { field: 'fecha_movimiento', headerName: 'Fecha Movimiento', renderCell: (m) => formatoFecha(m.fecha_movimiento) },
    { field: 'numero_de_vale', headerName: 'Numero de Vale' },
    { field: 'foto_vale_de_salida', headerName: 'Foto Vale de Salida', renderCell: (m) => <Thumbnail src={m.foto_vale_de_salida} size={32} /> },
    { field: 'tipo_movimiento', headerName: 'Tipo Movimiento' },
    {
      field: 'estado',
      headerName: 'Estado',
      // Solo tiene sentido para SALIDA: si ya se devolvió o traspasó (saldo en
      // 0), se marca para que no se confunda con que "todavía la tiene" ese
      // empleado — ver el reporte que dio pie a esto.
      renderCell: (m) => {
        const cerrada = estadoSalida(mapaSaldos, m)
        if (m.tipo_movimiento !== 'SALIDA') return ''
        return <Chip label={cerrada || 'Vigente'} size="small" variant="outlined" color={cerrada ? 'default' : 'success'} sx={{ height: 20, fontSize: 11 }} />
      },
    },
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
    { field: 'numero_serie', headerName: 'Numero de Serie' },
    { field: 'clase_familia', headerName: 'Clase / Familia' }, 
    { field: 'cantidad', headerName: 'Cantidad' },
    { field: 'foto_producto_snapshot', headerName: 'Foto Producto', renderCell: (m) => <Thumbnail src={m.foto_producto_snapshot} size={32} /> },
    { field: 'foto_numero_serie', headerName: 'Foto # Numero Serie', renderCell: (m) => <Thumbnail src={m.foto_numero_serie} size={32} /> },
    { field: 'firma_recibido_conformidad', headerName: 'Firma de Recibido y Conformidad', renderCell: (m) => <Thumbnail src={m.firma_recibido_conformidad} size={32} bg="#FFFFFF" /> },
    { field: 'observaciones', headerName: 'Observaciones' },
    { field: 'costo_unitario', headerName: 'Costo Unitario', renderCell: (m) => formatoMoneda(m.costo_unitario) }, 
  ]
}      