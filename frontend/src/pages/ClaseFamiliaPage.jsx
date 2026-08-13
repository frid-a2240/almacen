import { useEffect, useState } from 'react'
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Stack, CircularProgress, IconButton,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useSearchParams } from 'react-router-dom'
import ViewHeader from '../components/ViewHeader.jsx'
import DataTable from '../components/DataTable.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import SelectionBar from '../components/SelectionBar.jsx'
import ClaseFamiliaDetailPanel from '../components/ClaseFamiliaDetailPanel.jsx'
import {
  listarClasesFamilia, crearClaseFamilia, actualizarClaseFamilia, eliminarClaseFamilia,
  productosDeClase, movimientosDeClase,
} from '../api/clasesFamilia.js'
import { useSearch } from '../context/SearchContext.jsx'
import { coincideBusqueda } from '../utils/search.js'
import { cumpleFiltros, contarFiltrosActivos } from '../utils/filters.js'

const VACIO = { clase_familia: '', id_clase_fam: '' }
const CAMPOS_BUSQUEDA = ['clase_familia', 'id_clase_fam']
const CAMPOS_FILTRO = [
  { key: 'clase_familia', label: 'Clase / Familia', tipo: 'texto' },
  { key: 'id_clase_fam', label: 'ID Clase Fam', tipo: 'texto' },
]

export default function ClaseFamiliaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { query } = useSearch()
  const [clases, setClases] = useState([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [aEliminar, setAEliminar] = useState(null)
  const [productosRel, setProductosRel] = useState([])
  const [movimientosRel, setMovimientosRel] = useState([])
  const [filtroAbierto, setFiltroAbierto] = useState(false)
  const [filtros, setFiltros] = useState({})
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [marcados, setMarcados] = useState(new Set())
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  const cargar = () => {
    setCargando(true)
    listarClasesFamilia().then(setClases).finally(() => setCargando(false))
  }
  useEffect(cargar, [])

  const seleccionado = clases.find((c) => String(c.id) === searchParams.get('sel')) || null
  const clasesFiltradas = clases.filter(
    (c) => coincideBusqueda(c, CAMPOS_BUSQUEDA, query) && cumpleFiltros(c, CAMPOS_FILTRO, filtros),
  )

  useEffect(() => {
    if (!seleccionado) { setProductosRel([]); setMovimientosRel([]); return }
    productosDeClase(seleccionado.id).then(setProductosRel)
    movimientosDeClase(seleccionado.id).then(setMovimientosRel)
  }, [seleccionado?.id])

  const abrirNuevo = () => {
    setEditando(null)
    setForm(VACIO)
    setDialogoAbierto(true)
  }

  const abrirEditar = (c) => {
    setEditando(c)
    setForm({ clase_familia: c.clase_familia, id_clase_fam: c.id_clase_fam || '' })
    setDialogoAbierto(true)
  }

  const guardar = async () => {
    setGuardando(true)
    try {
      if (editando) await actualizarClaseFamilia(editando.id, form)
      else await crearClaseFamilia(form)
      setDialogoAbierto(false)
      cargar()
    } finally {
      setGuardando(false)
    }
  }

  const confirmarEliminar = async () => {
    const id = aEliminar.id
    await eliminarClaseFamilia(id)
    setAEliminar(null)
    if (seleccionado?.id === id) setSearchParams({})
    cargar()
  }

  const cancelarSeleccion = () => {
    setModoSeleccion(false)
    setMarcados(new Set())
  }

  const cambiarSeleccion = (modelo) => {
    if (modelo.type === 'exclude') {
      const todos = new Set(clasesFiltradas.map((c) => c.id))
      for (const id of modelo.ids) todos.delete(id)
      setMarcados(todos)
    } else {
      setMarcados(new Set(modelo.ids))
    }
  }

  const eliminarMarcados = async () => {
    await Promise.all([...marcados].map((id) => eliminarClaseFamilia(id)))
    setConfirmarBorrado(false)
    cancelarSeleccion()
    cargar()
  }

  const columnas = [
    { field: 'clase_familia', headerName: 'CLASE / FAMILIA', width: 280 },
    { field: 'id_clase_fam', headerName: 'ID CLASE FAM', width: 140 },
    { field: 'num_productos', headerName: 'PRODUCTOS', width: 120 },
    {
      field: 'acciones', headerName: '', width: 100, sortable: false, filterable: false,
      renderCell: (p) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <IconButton size="small" onClick={() => setAEliminar(p.row)}><DeleteOutlineIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => abrirEditar(p.row)}><EditOutlinedIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ]

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {modoSeleccion ? (
        <SelectionBar cantidad={marcados.size} onCancelar={cancelarSeleccion} onEliminar={() => setConfirmarBorrado(true)} />
      ) : (
        <ViewHeader
          title="CLASE FAMILIA"
          onAdd={abrirNuevo}
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
              rows={clasesFiltradas}
              columns={columnas}
              getRowId={(r) => r.id}
              onRowClick={(p) => setSearchParams({ sel: p.row.id })}
              checkboxSelection={modoSeleccion}
              rowSelectionModel={{ type: 'include', ids: marcados }}
              onRowSelectionModelChange={cambiarSeleccion}
            />
          )}
        </Box>
        {seleccionado && (
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <ClaseFamiliaDetailPanel
              clase={seleccionado}
              productos={productosRel}
              movimientos={movimientosRel}
              onEdit={() => abrirEditar(seleccionado)}
              onDelete={() => setAEliminar(seleccionado)}
              onClose={() => setSearchParams({})}
            />
          </Box>
        )}
      </Box>

      <Dialog open={dialogoAbierto} onClose={() => setDialogoAbierto(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editando ? 'Editar clase / familia' : 'Nueva clase / familia'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Clase / Familia" required fullWidth
              value={form.clase_familia}
              onChange={(e) => setForm({ ...form, clase_familia: e.target.value })}
            />
            <TextField
              label="ID Clase Fam (código corto)" fullWidth
              value={form.id_clase_fam}
              onChange={(e) => setForm({ ...form, id_clase_fam: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogoAbierto(false)}>Cancelar</Button>
          <Button variant="contained" disableElevation onClick={guardar} disabled={guardando || !form.clase_familia}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar clase / familia"
        message={`¿Eliminar "${aEliminar?.clase_familia}"?`}
        onCancel={() => setAEliminar(null)}
        onConfirm={confirmarEliminar}
      />

      <ConfirmDialog
        open={confirmarBorrado}
        title="Eliminar clases seleccionadas"
        message={`¿Eliminar ${marcados.size} clase(s)/familia(s) seleccionada(s)? Esta acción no se puede deshacer.`}
        onCancel={() => setConfirmarBorrado(false)}
        onConfirm={eliminarMarcados}
      />

      <FilterPanel
        open={filtroAbierto}
        onClose={() => setFiltroAbierto(false)}
        campos={CAMPOS_FILTRO}
        items={clases}
        filtros={filtros}
        onChange={setFiltros}
      />
    </Box>
  )
}
