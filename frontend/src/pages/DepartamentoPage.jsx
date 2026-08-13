import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import ViewHeader from '../components/ViewHeader.jsx'
import DeckList from '../components/DeckList.jsx'
import DeckListRow from '../components/DeckListRow.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import SelectionBar from '../components/SelectionBar.jsx'
import DepartamentoDetailPanel from '../components/DepartamentoDetailPanel.jsx'
import DepartamentoFormDialog from '../components/DepartamentoFormDialog.jsx'
import {
  listarDepartamentos, eliminarDepartamento, empleadosDeDepartamento, movimientosDeDepartamento,
} from '../api/departamentos.js'
import { useSearch } from '../context/SearchContext.jsx'
import { coincideBusqueda } from '../utils/search.js'
import { cumpleFiltros, contarFiltrosActivos } from '../utils/filters.js'

const CAMPOS_BUSQUEDA = ['departamento', 'encargado_departamento']

const CAMPOS_FILTRO = [
  { key: 'appsheet_id', label: 'Row ID', tipo: 'texto' },
  { key: 'departamento', label: 'Departamento', tipo: 'texto' },
  { key: 'foto_depto', label: 'Foto Depto.', tipo: 'imagen' },
  { key: 'encargado_departamento', label: 'Encargado de Departamento', tipo: 'enum' },
]

export default function DepartamentoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { query } = useSearch()
  const [departamentos, setDepartamentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [aEliminar, setAEliminar] = useState(null)
  const [empleadosRel, setEmpleadosRel] = useState([])
  const [movimientosRel, setMovimientosRel] = useState([])
  const [filtroAbierto, setFiltroAbierto] = useState(false)
  const [filtros, setFiltros] = useState({})
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [marcados, setMarcados] = useState(new Set())
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  const cargar = () => {
    setCargando(true)
    listarDepartamentos().then(setDepartamentos).finally(() => setCargando(false))
  }
  useEffect(cargar, [])

  const seleccionado = departamentos.find((d) => String(d.id) === searchParams.get('sel')) || null
  const departamentosFiltrados = departamentos.filter(
    (d) => coincideBusqueda(d, CAMPOS_BUSQUEDA, query) && cumpleFiltros(d, CAMPOS_FILTRO, filtros),
  )

  useEffect(() => {
    if (!seleccionado) { setEmpleadosRel([]); setMovimientosRel([]); return }
    empleadosDeDepartamento(seleccionado.id).then(setEmpleadosRel)
    movimientosDeDepartamento(seleccionado.id).then(setMovimientosRel)
  }, [seleccionado?.id])

  const verDetalle = (d) => setSearchParams({ sel: d.id })
  const cerrarDetalle = () => setSearchParams({})

  const abrirNuevo = () => {
    setEditando(null)
    setDialogoAbierto(true)
  }

  const abrirEditar = (d) => {
    setEditando(d)
    setDialogoAbierto(true)
  }

  const confirmarEliminar = async () => {
    const id = aEliminar.id
    await eliminarDepartamento(id)
    setAEliminar(null)
    if (seleccionado?.id === id) cerrarDetalle()
    cargar()
  }

  const toggleMarcado = (id) => {
    setMarcados((prev) => {
      const nuevo = new Set(prev)
      nuevo.has(id) ? nuevo.delete(id) : nuevo.add(id)
      return nuevo
    })
  }

  const cancelarSeleccion = () => {
    setModoSeleccion(false)
    setMarcados(new Set())
  }

  const eliminarMarcados = async () => {
    await Promise.all([...marcados].map((id) => eliminarDepartamento(id)))
    setConfirmarBorrado(false)
    cancelarSeleccion()
    cargar()
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {modoSeleccion ? (
        <SelectionBar cantidad={marcados.size} onCancelar={cancelarSeleccion} onEliminar={() => setConfirmarBorrado(true)} />
      ) : (
        <ViewHeader
          title="DEPARTAMENTO"
          onAdd={abrirNuevo}
          onFiltrar={() => setFiltroAbierto(true)}
          filtrosActivos={contarFiltrosActivos(CAMPOS_FILTRO, filtros)}
          onSeleccionar={() => setModoSeleccion(true)}
        />
      )}
      <Box sx={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
        <Box sx={{ width: seleccionado ? '42%' : '100%', borderRight: seleccionado ? '1px solid' : 'none', borderColor: 'divider', flexShrink: 0 }}>
          {cargando ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
          ) : (
            <DeckList
              items={departamentosFiltrados}
              keyFn={(d) => d.id}
              renderRow={(d, key, style) => (
                <DeckListRow
                  key={key}
                  style={style}
                  photo={d.foto_depto}
                  title={d.departamento}
                  selected={seleccionado?.id === d.id}
                  subtitle={d.encargado_departamento}
                  value={`${d.num_empleados} empleados`}
                  onView={() => verDetalle(d)}
                  onEdit={() => abrirEditar(d)}
                  onDelete={() => setAEliminar(d)}
                  modoSeleccion={modoSeleccion}
                  marcado={marcados.has(d.id)}
                  onToggleMarcado={() => toggleMarcado(d.id)}
                />
              )}
            />
          )}
        </Box>

        {seleccionado && (
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <DepartamentoDetailPanel
              departamento={seleccionado}
              empleados={empleadosRel}
              movimientos={movimientosRel}
              onEdit={() => abrirEditar(seleccionado)}
              onDelete={() => setAEliminar(seleccionado)}
              onClose={cerrarDetalle}
            />
          </Box>
        )}
      </Box>

      <DepartamentoFormDialog
        open={dialogoAbierto}
        onClose={() => setDialogoAbierto(false)}
        departamento={editando}
        onSaved={() => { setDialogoAbierto(false); cargar() }}
      />

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar departamento"
        message={`¿Eliminar "${aEliminar?.departamento}"?`}
        onCancel={() => setAEliminar(null)}
        onConfirm={confirmarEliminar}
      />

      <ConfirmDialog
        open={confirmarBorrado}
        title="Eliminar departamentos seleccionados"
        message={`¿Eliminar ${marcados.size} departamento(s) seleccionado(s)? Esta acción no se puede deshacer.`}
        onCancel={() => setConfirmarBorrado(false)}
        onConfirm={eliminarMarcados}
      />

      <FilterPanel
        open={filtroAbierto}
        onClose={() => setFiltroAbierto(false)}
        campos={CAMPOS_FILTRO}
        items={departamentos}
        filtros={filtros}
        onChange={setFiltros}
      />
    </Box>
  )
}
