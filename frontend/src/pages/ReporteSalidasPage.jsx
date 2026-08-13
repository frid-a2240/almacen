import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import ViewHeader from '../components/ViewHeader.jsx'
import DataTable from '../components/DataTable.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import SelectionBar from '../components/SelectionBar.jsx'
import MovimientoDetailPanel from '../components/MovimientoDetailPanel.jsx'
import MovimientoFormDialog from '../components/MovimientoFormDialog.jsx'
import { listarReporteSalidas, eliminarMovimiento } from '../api/movimientos.js'
import { listarDepartamentos } from '../api/departamentos.js'
import { formatoFecha, formatoMoneda } from '../utils/formatters.js'
import { useSearch } from '../context/SearchContext.jsx'
import { coincideBusqueda } from '../utils/search.js'
import { cumpleFiltros, contarFiltrosActivos } from '../utils/filters.js'

const CAMPOS_BUSQUEDA = ['nombre_de_empleado', 'id_numero_empleado', 'codigo_sai_sku', 'descripcion', 'departamento']

const CAMPOS_FILTRO = [
  { key: 'fecha_movimiento', label: 'Fecha', tipo: 'fecha' },
  { key: 'id_numero_empleado', label: 'ID Empleado', tipo: 'texto' },
  { key: 'nombre_de_empleado', label: 'Nombre de Empleado', tipo: 'texto' },
  { key: 'puesto_posicion', label: 'Puesto / Posicion', tipo: 'enum' },
  { key: 'departamento', label: 'Departamento', tipo: 'enum' },
  { key: 'jefe_inmediato', label: 'Jefe Inmediato', tipo: 'enum' },
  { key: 'tipo_movimiento', label: 'Tipo Movimiento', tipo: 'enum' },
  { key: 'codigo_sai_sku', label: 'Codigo SAI SKU', tipo: 'texto' },
  { key: 'descripcion', label: 'Descripcion', tipo: 'texto' },
  { key: 'udm', label: 'UDM', tipo: 'enum' },
  { key: 'cantidad', label: 'Cantidad', tipo: 'texto' },
  { key: 'numero_economico', label: 'Numero Economico', tipo: 'texto' },
  { key: 'costo_unitario', label: 'Costo Unitario', tipo: 'texto' },
  { key: 'observaciones', label: 'Observaciones', tipo: 'texto' },
]

const columnas = [
  { field: 'fecha_movimiento', headerName: 'FECHA', width: 110, valueFormatter: (v) => formatoFecha(v) },
  { field: 'id_numero_empleado', headerName: 'ID EMPLEADO', width: 120 },
  { field: 'nombre_de_empleado', headerName: 'NOMBRE DE EMPLEADO', width: 200 },
  { field: 'puesto_posicion', headerName: 'PUESTO / POSICION', width: 180 },
  { field: 'departamento', headerName: 'DEPARTAMENTO', width: 150 },
  { field: 'jefe_inmediato', headerName: 'JEFE INMEDIATO', width: 180 },
  { field: 'tipo_movimiento', headerName: 'TIPO MOVIMIENTO', width: 130 },
  { field: 'codigo_sai_sku', headerName: 'CODIGO SAI SKU', width: 170 },
  { field: 'descripcion', headerName: 'DESCRIPCION', width: 280 },
  { field: 'udm', headerName: 'UDM', width: 80 },
  { field: 'cantidad', headerName: 'CANTIDAD', width: 100 },
  { field: 'numero_economico', headerName: 'NUMERO ECONOMICO', width: 150 },
  { field: 'costo_unitario', headerName: 'COSTO UNITARIO', width: 140, valueFormatter: (v) => formatoMoneda(v) },
  { field: 'observaciones', headerName: 'OBSERVACIONES', width: 220 },
]

export default function ReporteSalidasPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { query } = useSearch()
  const [movimientos, setMovimientos] = useState([])
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
    Promise.all([listarReporteSalidas(), listarDepartamentos()])
      .then(([m, d]) => { setMovimientos(m); setDepartamentos(d) })
      .finally(() => setCargando(false))
  }

  useEffect(cargar, [])

  const seleccionado = movimientos.find((m) => m.row_id === searchParams.get('sel')) || null
  const movimientosFiltrados = movimientos.filter(
    (m) => coincideBusqueda(m, CAMPOS_BUSQUEDA, query) && cumpleFiltros(m, CAMPOS_FILTRO, filtros),
  )

  const verDetalle = (m) => setSearchParams({ sel: m.row_id })
  const cerrarDetalle = () => setSearchParams({})

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

  const cancelarSeleccion = () => {
    setModoSeleccion(false)
    setMarcados(new Set())
  }

  const cambiarSeleccion = (modelo) => {
    if (modelo.type === 'exclude') {
      const todos = new Set(movimientosFiltrados.map((m) => m.row_id))
      for (const id of modelo.ids) todos.delete(id)
      setMarcados(todos)
    } else {
      setMarcados(new Set(modelo.ids))
    }
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
          title="REPORTE DE SALIDAS"
          onFiltrar={() => setFiltroAbierto(true)}
          filtrosActivos={contarFiltrosActivos(CAMPOS_FILTRO, filtros)}
          onSeleccionar={() => setModoSeleccion(true)}
        />
      )}
      <Box sx={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
        <Box sx={{ width: seleccionado ? '65%' : '100%', minWidth: 0, borderRight: seleccionado ? '1px solid' : 'none', borderColor: 'divider' }}>
          {cargando ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
          ) : (
            <DataTable
              rows={movimientosFiltrados}
              columns={columnas}
              getRowId={(r) => r.row_id}
              onRowClick={(p) => verDetalle(p.row)}
              checkboxSelection={modoSeleccion}
              rowSelectionModel={{ type: 'include', ids: marcados }}
              onRowSelectionModelChange={cambiarSeleccion}
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
        empleados={[]}
        productos={[]}
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
