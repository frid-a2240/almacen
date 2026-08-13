import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import { useSearchParams } from 'react-router-dom'
import ViewHeader from '../components/ViewHeader.jsx'
import DataTable from '../components/DataTable.jsx'
import Thumbnail from '../components/Thumbnail.jsx'
import ProductoDetailPanel from '../components/ProductoDetailPanel.jsx'
import ProductoFormDialog from '../components/ProductoFormDialog.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import SelectionBar from '../components/SelectionBar.jsx'
import { listarStockInventory, eliminarProducto, movimientosDeProducto } from '../api/productos.js'
import { listarClasesFamilia } from '../api/clasesFamilia.js'
import { formatoMoneda } from '../utils/formatters.js'
import { useSearch } from '../context/SearchContext.jsx'
import { coincideBusqueda } from '../utils/search.js'
import { cumpleFiltros, contarFiltrosActivos } from '../utils/filters.js'

const CAMPOS_BUSQUEDA = ['descripcion', 'codigo_sai_sku', 'ubicacion', 'almacen', 'clase_familia_nombre']

const CAMPOS_FILTRO = [
  { key: 'appsheet_row_id', label: 'Row ID', tipo: 'texto' },
  { key: 'tool_id', label: 'Tool Id', tipo: 'texto' },
  { key: 'descripcion', label: 'Descripcion', tipo: 'texto' },
  { key: 'udm', label: 'UDM', tipo: 'enum' },
  { key: 'almacen', label: 'Almacen', tipo: 'enum' },
  { key: 'clase_familia_nombre', label: 'Clase / Familia', tipo: 'enum' },
  { key: 'numero_economico', label: 'Numero Economico', tipo: 'texto' },
  { key: 'costo_unitario', label: 'Costo Unitario', tipo: 'texto' },
  { key: 'foto_producto', label: 'Foto Producto', tipo: 'imagen' },
  { key: 'ubicacion', label: 'Ubicacion', tipo: 'enum' },
  { key: 'stock', label: 'Stock', tipo: 'texto' },
]

export default function StockInventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { query } = useSearch()
  const [productos, setProductos] = useState([])
  const [clases, setClases] = useState([])
  const [cargando, setCargando] = useState(true)
  const [movimientos, setMovimientos] = useState([])
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [aEliminar, setAEliminar] = useState(null)
  const [filtroAbierto, setFiltroAbierto] = useState(false)
  const [filtros, setFiltros] = useState({})
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [marcados, setMarcados] = useState(new Set())
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  const cargar = () => {
    setCargando(true)
    Promise.all([listarStockInventory(), listarClasesFamilia()])
      .then(([p, c]) => { setProductos(p); setClases(c) })
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

  const cancelarSeleccion = () => {
    setModoSeleccion(false)
    setMarcados(new Set())
  }

  const cambiarSeleccion = (modelo) => {
    if (modelo.type === 'exclude') {
      const todos = new Set(productosFiltrados.map((p) => p.codigo_sai_sku))
      for (const id of modelo.ids) todos.delete(id)
      setMarcados(todos)
    } else {
      setMarcados(new Set(modelo.ids))
    }
  }

  const eliminarMarcados = async () => {
    await Promise.all([...marcados].map((sku) => eliminarProducto(sku)))
    setConfirmarBorrado(false)
    cancelarSeleccion()
    cargar()
  }

  const columnas = [
    {
      field: 'stock', headerName: 'STOCK', width: 110,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, color: 'primary.main' }}>
          <Inventory2OutlinedIcon sx={{ fontSize: 16 }} />
          {p.value}
        </Box>
      ),
    },
    { field: 'udm', headerName: 'UDM', width: 80 },
    { field: 'codigo_sai_sku', headerName: 'CODIGO SAI SKU', width: 180 },
    { field: 'descripcion', headerName: 'DESCRIPCION', width: 320 },
    {
      field: 'foto_producto', headerName: 'FOTO PRODUCTO', width: 90, sortable: false,
      renderCell: (p) => <Thumbnail src={p.value} size={36} />,
    },
    { field: 'almacen', headerName: 'ALMACEN', width: 150 },
    { field: 'clase_familia_nombre', headerName: 'CLASE / FAMILIA', width: 160 },
    {
      field: 'costo_unitario', headerName: 'COSTO UNITARIO', width: 140,
      valueFormatter: (v) => formatoMoneda(v),
    },
    { field: 'ubicacion', headerName: 'UBICACION', width: 140 },
  ]

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {modoSeleccion ? (
        <SelectionBar cantidad={marcados.size} onCancelar={cancelarSeleccion} onEliminar={() => setConfirmarBorrado(true)} />
      ) : (
        <ViewHeader
          title="STOCK INVENTORY"
          onFiltrar={() => setFiltroAbierto(true)}
          filtrosActivos={contarFiltrosActivos(CAMPOS_FILTRO, filtros)}
          onSeleccionar={() => setModoSeleccion(true)}
        />
      )}
      <Box sx={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
        <Box sx={{ width: seleccionado ? '55%' : '100%', minWidth: 0, borderRight: seleccionado ? '1px solid' : 'none', borderColor: 'divider' }}>
          {cargando ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
          ) : (
            <DataTable
              rows={productosFiltrados}
              columns={columnas}
              getRowId={(r) => r.codigo_sai_sku}
              onRowClick={(p) => setSearchParams({ sel: p.row.codigo_sai_sku })}
              checkboxSelection={modoSeleccion}
              rowSelectionModel={{ type: 'include', ids: marcados }}
              onRowSelectionModelChange={cambiarSeleccion}
            />
          )}
        </Box>
        {seleccionado && (
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <ProductoDetailPanel
              producto={seleccionado}
              clases={clases}
              movimientos={movimientos}
              onEdit={() => setDialogoAbierto(true)}
              onDelete={() => setAEliminar(seleccionado)}
              onClose={() => setSearchParams({})}
            />
          </Box>
        )}
      </Box>

      <ProductoFormDialog
        open={dialogoAbierto}
        onClose={() => setDialogoAbierto(false)}
        producto={seleccionado}
        clases={clases}
        onSaved={() => { setDialogoAbierto(false); cargar() }}
      />

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar producto"
        message={`¿Eliminar "${aEliminar?.descripcion}"? Esta acción no se puede deshacer.`}
        onCancel={() => setAEliminar(null)}
        onConfirm={async () => {
          const sku = aEliminar.codigo_sai_sku
          await eliminarProducto(sku)
          setAEliminar(null)
          if (seleccionado?.codigo_sai_sku === sku) setSearchParams({})
          cargar()
        }}
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
