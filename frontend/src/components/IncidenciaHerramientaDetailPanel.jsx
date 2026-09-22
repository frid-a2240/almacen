import { useState } from 'react'
import { IconButton, Tooltip } from '@mui/material'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import DetailPanel from './DetailPanel.jsx'
import RelatedTable from './RelatedTable.jsx'
import { formatoFecha } from '../utils/formatters.js'
import { obtenerIncidenciaHerramientaPdf } from '../api/incidenciasHerramienta.js'
import { imprimirPdf, abrirVentanaImpresion } from '../utils/imprimir.js'

const COLUMNAS_ITEMS = [
  { field: 'descripcion', headerName: 'Descripción' },
  { field: 'numero_vale', headerName: 'Vale' },
  { field: 'cantidad', headerName: 'Cantidad' },
  { field: 'numero_economico', headerName: '# Económico' },
  { field: 'estado_previo', headerName: 'Estado previo' },
  { field: 'valor_aprox', headerName: 'Valor aprox.' },
]

export default function IncidenciaHerramientaDetailPanel({ incidencia, onDelete, onClose }) {
  const [imprimiendo, setImprimiendo] = useState(false)

  const imprimir = async () => {
    const ventana = abrirVentanaImpresion()
    setImprimiendo(true)
    try {
      const pdf = await obtenerIncidenciaHerramientaPdf(incidencia.id)
      await imprimirPdf(pdf, `incidencia_${incidencia.folio}`, ventana)
    } catch (err) {
      ventana?.close()
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <DetailPanel
      title={`Incidencia ${incidencia.folio}`}
      onDelete={onDelete}
      onClose={onClose}
      extraActions={
        <Tooltip title="Reimprimir formato">
          <span>
            <IconButton size="small" onClick={imprimir} disabled={imprimiendo} sx={{ color: 'text.secondary' }}>
              <PrintOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      }
      fields={[
        { label: 'Folio', value: incidencia.folio },
        { label: 'Fecha reporte', value: formatoFecha(incidencia.fecha_reporte) },
        { label: 'Hora reporte', value: incidencia.hora_reporte },
        { label: 'Lugar y fecha del suceso', value: incidencia.lugar_fecha_suceso },
        { label: 'Empleado', value: `${incidencia.empleado_nombre || ''} — ${incidencia.empleado_puesto || ''}` },
        { label: 'Supervisor', value: incidencia.empleado_supervisor },
        { label: 'Departamento', value: incidencia.empleado_departamento },
        { label: 'Tipo de incidente', value: incidencia.tipos_incidente },
        { label: 'Descripción del evento', value: incidencia.descripcion_evento },
      ]}
    >
      <RelatedTable
        title="Herramientas involucradas"
        rows={incidencia.items}
        keyFn={(it) => it.id}
        columns={COLUMNAS_ITEMS}
      />
    </DetailPanel>
  )
}
