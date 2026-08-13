import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ViewHeader from '../components/ViewHeader.jsx'
import DeckList from '../components/DeckList.jsx'
import DeckListRow from '../components/DeckListRow.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import SelectionBar from '../components/SelectionBar.jsx'
import MovimientoDetailPanel from '../components/MovimientoDetailPanel.jsx'
import MovimientoFormDialog from '../components/MovimientoFormDialog.jsx'
import { listarMovimientos, eliminarMovimiento } from '../api/movimientos.js'
import { listarEmpleados } from '../api/empleados.js'
import { listarProductos } from '../api/productos.js'
import { listarDepartamentos } from '../api/departamentos.js'
import { formatoFechaLarga } from '../utils/formatters.js'
import { useSearch } from '../context/SearchContext.jsx'
import { coincideBusqueda } from '../utils/search.js'
import { cumpleFiltros, contarFiltrosActivos } from '../utils/filters.js'

const CAMPOS_BUSQUEDA = ['descripcion', 'nombre_de_empleado', 'codigo_sai_sku', 'numero_de_vale', 'id_numero_empleado']

const CAMPOS_FILTRO = [
  { key: 'fecha_movimiento', label: 'Fecha Movimiento', tipo: 'fecha' },
  { key: 'numero_de_vale', label: 'Numero de Vale', tipo: 'texto' },
  { key: 'foto_vale_de_salida', label: 'Foto Vale de Salida', tipo: 'imagen' },
  { key: 'tipo_movimiento', label: 'Tipo Movimiento', tipo: 'enum' },
  { key: 'id_numero_empleado', label: 'ID Numero Empleado', tipo: 'texto' },
  { key: 'nombre_de_empleado', label: 'Nombre de Empleado', tipo: 'texto' },
  { key: 'puesto_posicion', label: 'Puesto / Posicion', tipo: 'enum' },
  { key: 'departamento', label: 'Departamento', tipo: 'enum' },
  { key: 'jefe_inmediato', label: 'Jefe Inmediato', tipo: 'enum' },
  { key: 'status', label: 'Status', tipo: 'enum' },
  { key: 'codigo_sai_sku', label: 'Codigo SAI SKU', tipo: 'texto' },
  { key: 'descripcion', label: 'Descripcion', tipo: 'texto' },
  { key: 'udm', label: 'UDM', tipo: 'enum' },
  { key: 'numero_economico', label: 'Numero Economico', tipo: 'texto' },
  { key: 'clase_familia', label: 'Clase / Familia', tipo: 'enum' },
  { key: 'cantidad', label: 'Cantidad', tipo: 'texto' },
  { key: 'foto_producto_snapshot', label: 'Foto Producto', tipo: 'imagen' },
  { key: 'foto_numero_serie', label: 'Foto # Numero Serie', tipo: 'imagen' },
  { key: 'firma_recibido_conformidad', label: 'Firma de Recibido y Conformidad', tipo: 'imagen' },
  { key: 'observaciones', label: 'Observaciones', tipo: 'texto' },
  { key: 'costo_unitario', label: 'Costo Unitario', tipo: 'texto' },
]

export default function ControlResguardoPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { query } = useSearch()
  const [movimientos, setMovimientos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [productos, setProductos] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [aEliminar, setAEliminar] = useState(null)
  const [filtroAbierto, setFiltroAbierto] = useState(false)
  const [filtros, setFiltros] = useState({})
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [marcados, setMarcados] = useState(new Set())
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  const cargar = () => {
    setCargando(true)
    Promise.all([listarMovimientos(), listarEmpleados(), listarProductos(), listarDepartamentos()])
      .then(([m, e, p, d]) => {
        setMovimientos(m)
        setEmpleados(e)
        setProductos(p)
        setDepartamentos(d)
      })
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const seleccionado = movimientos.find((m) => m.row_id === searchParams.get('sel')) || null
  const movimientosFiltrados = movimientos.filter(
    (m) => coincideBusqueda(m, CAMPOS_BUSQUEDA, query) && cumpleFiltros(m, CAMPOS_FILTRO, filtros),
  )

  const verDetalle = (m) => setSearchParams({ sel: m.row_id })
  const cerrarDetalle = () => setSearchParams({})

  const abrirNuevo = () => {
    setEditando(null)
    setDialogoAbierto(true)
  }

  const abrirEditar = (m) => {
    setEditando(m)
    setDialogoAbierto(true)
  }

  const confirmarEliminar = async () => {
    const rowId = aEliminar.row_id
    await eliminarMovimiento(rowId)
    setAEliminar(null)
    if (seleccionado?.row_id === rowId) cerrarDetalle()
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
    await Promise.all([...marcados].map((id) => eliminarMovimiento(id)))
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
          title="CONTROL DE RESGUARDO"
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
              items={movimientosFiltrados}
              keyFn={(m) => m.row_id}
              groupBy={(m) => m.fecha_movimiento}
              groupLabel={(fecha) => formatoFechaLarga(fecha)}
              renderRow={(m, key, style) => (
                <DeckListRow
                  key={key}
                  style={style}
                  photo={m.foto_producto_snapshot}
                  title={m.descripcion}
                  selected={seleccionado?.row_id === m.row_id}
                  subtitle={m.nombre_de_empleado}
                  value={m.cantidad}
                  onView={() => verDetalle(m)}
                  onEdit={() => abrirEditar(m)}
                  onDelete={() => setAEliminar(m)}
                  modoSeleccion={modoSeleccion}
                  marcado={marcados.has(m.row_id)}
                  onToggleMarcado={() => toggleMarcado(m.row_id)}
                  extraActions={[
                    {
                      icon: HomeOutlinedIcon,
                      title: 'Ver departamento',
                      onClick: () => {
                        const d = departamentos.find((x) => x.departamento === m.departamento)
                        navigate(d ? `/departamento?sel=${d.id}` : '/departamento')
                      },
                    },
                    {
                      icon: HowToRegOutlinedIcon,
                      title: 'Ver empleado',
                      onClick: m.empleado_id ? () => navigate(`/empleados?sel=${m.empleado_id}`) : undefined,
                    },
                    {
                      icon: BuildOutlinedIcon,
                      title: 'Ver producto',
                      onClick: m.producto_sku ? () => navigate(`/productos?sel=${m.producto_sku}`) : undefined,
                    },
                    { icon: MenuBookOutlinedIcon, title: 'Ver detalle', onClick: () => verDetalle(m) },
                  ]}
                />
              )}
            />
          )}
        </Box>

        {seleccionado && (
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <MovimientoDetailPanel
              movimiento={seleccionado}
              departamentos={departamentos}
              onEdit={() => abrirEditar(seleccionado)}
              onDelete={() => setAEliminar(seleccionado)}
              onClose={cerrarDetalle}
            />
          </Box>
        )}
      </Box>

      <MovimientoFormDialog
        open={dialogoAbierto}
        onClose={() => setDialogoAbierto(false)}
        movimiento={editando}
        empleados={empleados}
        productos={productos}
        onSaved={() => { setDialogoAbierto(false); cargar() }}
      />

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar movimiento"
        message={`¿Eliminar el vale de "${aEliminar?.descripcion}"? Esta acción no se puede deshacer.`}
        onCancel={() => setAEliminar(null)}
        onConfirm={confirmarEliminar}
      />

      <ConfirmDialog
        open={confirmarBorrado}
        title="Eliminar movimientos seleccionados"
        message={`¿Eliminar ${marcados.size} movimiento(s) seleccionado(s)? Esta acción no se puede deshacer.`}
        onCancel={() => setConfirmarBorrado(false)}
        onConfirm={eliminarMarcados}
      />

      <FilterPanel
        open={filtroAbierto}
        onClose={() => setFiltroAbierto(false)}
        campos={CAMPOS_FILTRO}
        items={movimientos}
        filtros={filtros}
        onChange={setFiltros}
      />
    </Box>
  )
}
