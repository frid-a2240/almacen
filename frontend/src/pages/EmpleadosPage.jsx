import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ViewHeader from '../components/ViewHeader.jsx'
import DeckList from '../components/DeckList.jsx'
import DeckListRow from '../components/DeckListRow.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import SelectionBar from '../components/SelectionBar.jsx'
import EmpleadoDetailPanel from '../components/EmpleadoDetailPanel.jsx'
import EmpleadoFormDialog from '../components/EmpleadoFormDialog.jsx'
import { listarEmpleados, eliminarEmpleado, movimientosDeEmpleado } from '../api/empleados.js'
import { listarDepartamentos } from '../api/departamentos.js'
import { useSearch } from '../context/SearchContext.jsx'
import { coincideBusqueda } from '../utils/search.js'
import { cumpleFiltros, contarFiltrosActivos } from '../utils/filters.js'

const CAMPOS_BUSQUEDA = ['nombre_de_empleado', 'id_numero_empleado', 'puesto_posicion', 'departamento_nombre']

const CAMPOS_FILTRO = [
  { key: 'appsheet_row_id', label: 'Row ID', tipo: 'texto' },
  { key: 'id_numero_empleado', label: 'ID Numero Empleado', tipo: 'texto' },
  { key: 'nombre_de_empleado', label: 'Nombre de Empleado', tipo: 'texto' },
  { key: 'puesto_posicion', label: 'Puesto / Posicion', tipo: 'enum' },
  { key: 'departamento_nombre', label: 'Departamento', tipo: 'enum' },
  { key: 'jefe_inmediato', label: 'Jefe Inmediato', tipo: 'enum' },
  { key: 'status_empleado', label: 'Status Empleado', tipo: 'enum' },
  { key: 'foto_empleado', label: 'Foto Empleado', tipo: 'imagen' },
  { key: 'fecha_de_ingreso', label: 'Fecha de Ingreso', tipo: 'fecha' },
  { key: 'correo_electronico', label: 'Correo Electronico', tipo: 'texto' },
  { key: 'telefono', label: 'Telefono', tipo: 'texto' },
]

export default function EmpleadosPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { query } = useSearch()
  const [empleados, setEmpleados] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [aEliminar, setAEliminar] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [filtroAbierto, setFiltroAbierto] = useState(false)
  const [filtros, setFiltros] = useState({})
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [marcados, setMarcados] = useState(new Set())
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  const cargar = () => {
    setCargando(true)
    Promise.all([listarEmpleados(), listarDepartamentos()])
      .then(([e, d]) => {
        setEmpleados(e)
        setDepartamentos(d)
      })
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const seleccionado = empleados.find((e) => e.id_numero_empleado === searchParams.get('sel')) || null
  const empleadosFiltrados = empleados.filter(
    (e) => coincideBusqueda(e, CAMPOS_BUSQUEDA, query) && cumpleFiltros(e, CAMPOS_FILTRO, filtros),
  )

  useEffect(() => {
    if (!seleccionado) { setMovimientos([]); return }
    movimientosDeEmpleado(seleccionado.id_numero_empleado).then(setMovimientos)
  }, [seleccionado?.id_numero_empleado])

  const verDetalle = (e) => setSearchParams({ sel: e.id_numero_empleado })
  const cerrarDetalle = () => setSearchParams({})

  const abrirNuevo = () => {
    setEditando(null)
    setDialogoAbierto(true)
  }

  const abrirEditar = (e) => {
    setEditando(e)
    setDialogoAbierto(true)
  }

  const confirmarEliminar = async () => {
    const id = aEliminar.id_numero_empleado
    await eliminarEmpleado(id)
    setAEliminar(null)
    if (seleccionado?.id_numero_empleado === id) cerrarDetalle()
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
    await Promise.all([...marcados].map((id) => eliminarEmpleado(id)))
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
          title="EMPLEADOS"
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
              items={empleadosFiltrados}
              keyFn={(e) => e.id_numero_empleado}
              renderRow={(e, key, style) => (
                <DeckListRow
                  key={key}
                  style={style}
                  photo={e.foto_empleado}
                  photoShape="round"
                  title={e.nombre_de_empleado}
                  selected={seleccionado?.id_numero_empleado === e.id_numero_empleado}
                  subtitle={e.departamento_nombre}
                  value={e.id_numero_empleado}
                  onView={() => verDetalle(e)}
                  onEdit={() => abrirEditar(e)}
                  onDelete={() => setAEliminar(e)}
                  modoSeleccion={modoSeleccion}
                  marcado={marcados.has(e.id_numero_empleado)}
                  onToggleMarcado={() => toggleMarcado(e.id_numero_empleado)}
                  extraActions={[
                    {
                      icon: HomeOutlinedIcon,
                      title: 'Ver departamento',
                      onClick: e.departamento_id ? () => navigate(`/departamento?sel=${e.departamento_id}`) : undefined,
                    },
                    { icon: MenuBookOutlinedIcon, title: 'Ver detalle', onClick: () => verDetalle(e) },
                  ]}
                />
              )}
            />
          )}
        </Box>

        {seleccionado && (
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <EmpleadoDetailPanel
              empleado={seleccionado}
              departamentos={departamentos}
              movimientos={movimientos}
              onEdit={() => abrirEditar(seleccionado)}
              onDelete={() => setAEliminar(seleccionado)}
              onClose={cerrarDetalle}
            />
          </Box>
        )}
      </Box>

      <EmpleadoFormDialog
        open={dialogoAbierto}
        onClose={() => setDialogoAbierto(false)}
        empleado={editando}
        departamentos={departamentos}
        onSaved={() => { setDialogoAbierto(false); cargar() }}
      />

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar empleado"
        message={`¿Eliminar a "${aEliminar?.nombre_de_empleado}"? Esta acción no se puede deshacer.`}
        onCancel={() => setAEliminar(null)}
        onConfirm={confirmarEliminar}
      />

      <ConfirmDialog
        open={confirmarBorrado}
        title="Eliminar empleados seleccionados"
        message={`¿Eliminar ${marcados.size} empleado(s) seleccionado(s)? Esta acción no se puede deshacer.`}
        onCancel={() => setConfirmarBorrado(false)}
        onConfirm={eliminarMarcados}
      />

      <FilterPanel
        open={filtroAbierto}
        onClose={() => setFiltroAbierto(false)}
        campos={CAMPOS_FILTRO}
        items={empleados}
        filtros={filtros}
        onChange={setFiltros}
      />
    </Box>
  )
}
