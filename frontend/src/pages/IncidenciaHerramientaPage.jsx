import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import ViewHeader from '../components/ViewHeader.jsx'
import DeckList from '../components/DeckList.jsx'
import DeckListRow from '../components/DeckListRow.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import IncidenciaHerramientaDetailPanel from '../components/IncidenciaHerramientaDetailPanel.jsx'
import IncidenciaHerramientaFormDialog from '../components/IncidenciaHerramientaFormDialog.jsx'
import { listarIncidenciasHerramienta, eliminarIncidenciaHerramienta, obtenerIncidenciaHerramienta } from '../api/incidenciasHerramienta.js'
import { listarEmpleados } from '../api/empleados.js'
import { useSearch } from '../context/SearchContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { coincideBusqueda } from '../utils/search.js'
import { formatoFecha } from '../utils/formatters.js'
import useEsMovil from '../hooks/useEsMovil.js'

const CAMPOS_BUSQUEDA = ['folio', 'empleado_nombre', 'tipos_incidente']

export default function IncidenciaHerramientaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { query } = useSearch()
  const { usuario } = useAuth()
  const esMovil = useEsMovil()
  const puedeEscribir = !usuario?.solo_consulta
  const [incidencias, setIncidencias] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [aEliminar, setAEliminar] = useState(null)

  const cargar = () => {
    setCargando(true)
    Promise.all([listarIncidenciasHerramienta(), listarEmpleados()])
      .then(([i, e]) => {
        setIncidencias(i)
        setEmpleados(e)
      })
      .finally(() => setCargando(false))
  }
  useEffect(cargar, [])

  const seleccionado = incidencias.find((i) => String(i.id) === searchParams.get('sel')) || null
  const incidenciasFiltradas = incidencias.filter((i) => coincideBusqueda(i, CAMPOS_BUSQUEDA, query))

  const verDetalle = (i) => setSearchParams({ sel: i.id })
  const cerrarDetalle = () => setSearchParams({})

  const confirmarEliminar = async () => {
    const id = aEliminar.id
    await eliminarIncidenciaHerramienta(id)
    setAEliminar(null)
    if (seleccionado?.id === id) cerrarDetalle()
    cargar()
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ViewHeader title="INCIDENCIA DE HERRAMIENTA" onAdd={puedeEscribir ? () => setDialogoAbierto(true) : undefined} />

      <Box sx={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
        <Box
          sx={{
            width: seleccionado ? (esMovil ? 0 : '42%') : '100%',
            display: seleccionado && esMovil ? 'none' : 'block',
            borderRight: seleccionado ? '1px solid' : 'none',
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          {cargando ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
          ) : (
            <DeckList
              items={incidenciasFiltradas}
              keyFn={(i) => i.id}
              renderRow={(i, key, style) => (
                <DeckListRow
                  key={key}
                  style={style}
                  photo={i.items[0]?.foto_producto}
                  title={`Incidencia ${i.folio}`}
                  selected={seleccionado?.id === i.id}
                  subtitle={`${i.empleado_nombre || ''} — ${i.tipos_incidente || ''}`}
                  value={formatoFecha(i.fecha_reporte)}
                  onView={() => verDetalle(i)}
                  onDelete={puedeEscribir ? () => setAEliminar(i) : undefined}
                />
              )}
            />
          )}
        </Box>

        {seleccionado && (
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <IncidenciaHerramientaDetailPanel
              incidencia={seleccionado}
              onDelete={puedeEscribir ? () => setAEliminar(seleccionado) : undefined}
              onClose={cerrarDetalle}
            />
          </Box>
        )}
      </Box>

      <IncidenciaHerramientaFormDialog
        open={dialogoAbierto}
        onClose={() => setDialogoAbierto(false)}
        empleados={empleados}
        onSaved={(id) => { setDialogoAbierto(false); cargar(); setSearchParams({ sel: id }) }}
      />

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar reporte de incidencia"
        message={`¿Eliminar el reporte "${aEliminar?.folio}"? Esta acción no se puede deshacer.`}
        onCancel={() => setAEliminar(null)}
        onConfirm={confirmarEliminar}
      />
    </Box>
  )
}
