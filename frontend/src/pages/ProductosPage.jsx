import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import { useSearchParams } from 'react-router-dom'
import ViewHeader from '../components/ViewHeader.jsx'
import DeckList from '../components/DeckList.jsx'
import DeckListRow from '../components/DeckListRow.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import SelectionBar from '../components/SelectionBar.jsx'
import ProductoDetailPanel from '../components/ProductoDetailPanel.jsx'
import ProductoFormDialog from '../components/ProductoFormDialog.jsx'
import { listarProductos, eliminarProducto, movimientosDeProducto } from '../api/productos.js'
import { listarClasesFamilia } from '../api/clasesFamilia.js'
import { useSearch } from '../context/SearchContext.jsx'
import { coincideBusqueda } from '../utils/search.js'
import { cumpleFiltros, contarFiltrosActivos } from '../utils/filters.js'

const CAMPOS_BUSQUEDA = ['descripcion', 'codigo_sai_sku', 'tool_id', 'ubicacion', 'numero_economico', 'almacen']

const CAMPOS_FILTRO = [
  { key: 'appsheet_row_id', label: 'Row ID', tipo: 'texto' },
  { key: 'tool_id', label: 'Tool Id', tipo: 'texto' },
  { key: 'descripcion', label: 'Descripcion', tipo: 'texto' },
  { key: 'udm', label: 'UDM', tipo: 'enum' },
  { key: 'almacen', label: 'Almacen', tipo: 'enum' },
  { key: 'clase_familia_nombre', label: 'Clase / Familia', tipo: 'enum' },
  { key: 'numero_economico', label: 'Numero Economico', tipo: 'texto' },
  { key: 'inventario_inicial', label: 'Inventario Inicial', tipo: 'texto' },
  { key: 'costo_unitario', label: 'Costo Unitario', tipo: 'texto' },
  { key: 'foto_producto', label: 'Foto Producto', tipo: 'imagen' },
  { key: 'ubicacion', label: 'Ubicacion', tipo: 'enum' },
  { key: 'minimo', label: 'Minimo', tipo: 'texto' },
  { key: 'maximo', label: 'Maximo', tipo: 'texto' },
  { key: 'fecha_de_alta', label: 'Fecha de Alta', tipo: 'fecha' },
  { key: 'scan_document', label: 'Scan Document', tipo: 'imagen' },
  { key: 'stock', label: 'Stock', tipo: 'texto' },
]

export default function ProductosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { query } = useSearch()
  const [productos, setProductos] = useState([])
  const [clases, setClases] = useState([])
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
    Promise.all([listarProductos(), listarClasesFamilia()])
      .then(([p, c]) => {
        setProductos(p)
        setClases(c)
      })
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const seleccionado = productos.find((p) => p.codigo_sai_sku === searchParams.get('sel')) || null
  const productosFiltrados = productos.filter(
    (p) => coincideBusqueda(p, CAMPOS_BUSQUEDA, query) && cumpleFiltros(p, CAMPOS_FILTRO, filtros),
  )

  useEffect(() => {
    if (!seleccionado) { setMovimientos([]); return }
    movimientosDeProducto(seleccionado.codigo_sai_sku).then(setMovimientos)
  }, [seleccionado?.codigo_sai_sku])

  const verDetalle = (p) => setSearchParams({ sel: p.codigo_sai_sku })
  const cerrarDetalle = () => setSearchParams({})

  const abrirNuevo = () => {
    setEditando(null)
    setDialogoAbierto(true)
  }

  const abrirEditar = (p) => {
    setEditando(p)
    setDialogoAbierto(true)
  }

  const confirmarEliminar = async () => {
    const sku = aEliminar.codigo_sai_sku
    await eliminarProducto(sku)
    setAEliminar(null)
    if (seleccionado?.codigo_sai_sku === sku) cerrarDetalle()
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
    await Promise.all([...marcados].map((sku) => eliminarProducto(sku)))
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
          title="PRODUCTOS"
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
              items={productosFiltrados}
              keyFn={(p) => p.codigo_sai_sku}
              renderRow={(p, key, style) => (
                <DeckListRow
                  key={key}
                  style={style}
                  photo={p.foto_producto}
                  title={p.descripcion}
                  selected={seleccionado?.codigo_sai_sku === p.codigo_sai_sku}
                  subtitle={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Inventory2OutlinedIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                      {p.stock}
                    </Box>
                  }
                  value={p.ubicacion || p.almacen}
                  onView={() => verDetalle(p)}
                  onEdit={() => abrirEditar(p)}
                  onDelete={() => setAEliminar(p)}
                  modoSeleccion={modoSeleccion}
                  marcado={marcados.has(p.codigo_sai_sku)}
                  onToggleMarcado={() => toggleMarcado(p.codigo_sai_sku)}
                  extraActions={[
                    { icon: MenuBookOutlinedIcon, title: 'Ver detalle', onClick: () => verDetalle(p) },
                  ]}
                />
              )}
            />
          )}
        </Box>

        {seleccionado && (
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <ProductoDetailPanel
              producto={seleccionado}
              clases={clases}
              movimientos={movimientos}
              onEdit={() => abrirEditar(seleccionado)}
              onDelete={() => setAEliminar(seleccionado)}
              onClose={cerrarDetalle}
            />
          </Box>
        )}
      </Box>

      <ProductoFormDialog
        open={dialogoAbierto}
        onClose={() => setDialogoAbierto(false)}
        producto={editando}
        clases={clases}
        onSaved={() => { setDialogoAbierto(false); cargar() }}
      />

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar producto"
        message={`¿Eliminar "${aEliminar?.descripcion}"? Esta acción no se puede deshacer.`}
        onCancel={() => setAEliminar(null)}
        onConfirm={confirmarEliminar}
      />

      <ConfirmDialog
        open={confirmarBorrado}
        title="Eliminar productos seleccionados"
        message={`¿Eliminar ${marcados.size} producto(s) seleccionado(s)? Esta acción no se puede deshacer.`}
        onCancel={() => setConfirmarBorrado(false)}
        onConfirm={eliminarMarcados}
      />

      <FilterPanel
        open={filtroAbierto}
        onClose={() => setFiltroAbierto(false)}
        campos={CAMPOS_FILTRO}
        items={productos}
        filtros={filtros}
        onChange={setFiltros}
      />
    </Box>
  )
}
