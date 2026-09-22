import { useEffect, useMemo, useState } from 'react'
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
import TraspasoDialog from '../components/TraspasoDialog.jsx'
import { listarMovimientos, eliminarMovimiento, obtenerValePdf } from '../api/movimientos.js'
import { listarEmpleados } from '../api/empleados.js'
import { listarProductos } from '../api/productos.js'
import { listarDepartamentos } from '../api/departamentos.js'
import { formatoFechaLarga } from '../utils/formatters.js'
import { useSearch } from '../context/SearchContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { coincideBusqueda } from '../utils/search.js'
import { cumpleFiltros, contarFiltrosActivos } from '../utils/filters.js'
import { imprimirPdf, abrirVentanaImpresion } from '../utils/imprimir.js'
import useEsMovil from '../hooks/useEsMovil.js'

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
  const { usuario } = useAuth()
  const esMovil = useEsMovil()
  const puedeEscribir = !usuario?.solo_consulta
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
  const [traspasando, setTraspasando] = useState(null)

  // Saldo actual por empleado+producto (SALIDA - ENTRADA), calculado del
  // mismo listado que ya se tiene en pantalla — para decidir, por rengón,
  // si ese empleado tiene más de UNA herramienta activa (entonces el ícono
  // es "Traspasar") o nada más esa (entonces es "Editar", restringido a
  // nombre y firma). Mismo criterio que resguardo_actual_de en el backend.
  const saldosPorEmpleado = useMemo(() => {
    const mapa = new Map()
    for (const m of movimientos) {
      const sku = m.producto_sku || m.codigo_sai_sku
      if (!m.empleado_id || !sku) continue
      const signo = m.tipo_movimiento === 'SALIDA' ? 1 : m.tipo_movimiento === 'ENTRADA' ? -1 : 0
      if (!signo) continue
      if (!mapa.has(m.empleado_id)) mapa.set(m.empleado_id, new Map())
      const porSku = mapa.get(m.empleado_id)
      porSku.set(sku, (porSku.get(sku) || 0) + signo * Number(m.cantidad))
    }
    return mapa
  }, [movimientos])

  const saldoDe = (empleadoId, sku) => saldosPorEmpleado.get(empleadoId)?.get(sku) || 0
  const herramientasActivasDe = (empleadoId) => {
    const porSku = saldosPorEmpleado.get(empleadoId)
    if (!porSku) return 0
    let n = 0
    for (const saldo of porSku.values()) if (saldo > 0) n++
    return n
  }

  // Empleados/productos/departamentos casi no cambian durante una sesión de
  // captura — solo se piden una vez al entrar. Guardar/editar/borrar un
  // movimiento vuelve a pedir nomás la lista de movimientos (antes se
  // repetían las 4 listas completas en cada acción).
  const refrescarMovimientos = () => listarMovimientos().then(setMovimientos)

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

  const reimprimirVale = async (m) => {
    // Igual que al guardar: la pestaña se abre AQUÍ, antes de cualquier
    // await, para que el navegador no la bloquee como pop-up.
    const ventanaImpresion = abrirVentanaImpresion()
    try {
      const pdf = await obtenerValePdf(m.row_id)
      await imprimirPdf(pdf, `vale_${m.row_id}`, ventanaImpresion)
    } catch (err) {
      ventanaImpresion?.close()
      throw err
    }
  }

  const confirmarEliminar = async () => {
    const rowId = aEliminar.row_id
    await eliminarMovimiento(rowId)
    setAEliminar(null)
    if (seleccionado?.row_id === rowId) cerrarDetalle()
    refrescarMovimientos()
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
    refrescarMovimientos()
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {modoSeleccion ? (
        <SelectionBar cantidad={marcados.size} onCancelar={cancelarSeleccion} onEliminar={() => setConfirmarBorrado(true)} />
      ) : (
        <ViewHeader
          title="CONTROL DE RESGUARDO"
          onAdd={puedeEscribir ? abrirNuevo : undefined}
          onFiltrar={() => setFiltroAbierto(true)}
          filtrosActivos={contarFiltrosActivos(CAMPOS_FILTRO, filtros)}
          onSeleccionar={puedeEscribir ? () => setModoSeleccion(true) : undefined}
        />
      )}
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
              items={movimientosFiltrados}
              keyFn={(m) => m.row_id}
              groupBy={(m) => m.fecha_movimiento}
              groupLabel={(fecha) => formatoFechaLarga(fecha)}
              renderRow={(m, key, style) => {
                const sku = m.producto_sku || m.codigo_sai_sku
                // Una herramienta en resguardo (SALIDA con saldo activo) de un
                // empleado que tiene MÁS de una: se traspasa (identifica cuál
                // de varias se mueve). Si es la única que tiene, se edita
                // (nombre/firma nada más) — traspasar no aplicaría a nada.
                const esTraspasable = (
                  puedeEscribir
                  && m.tipo_movimiento === 'SALIDA'
                  && saldoDe(m.empleado_id, sku) > 0
                  && herramientasActivasDe(m.empleado_id) > 1
                )
                return (
                <DeckListRow
                  key={key}
                  style={style}
                  photo={m.foto_producto_snapshot}
                  title={m.descripcion}
                  selected={seleccionado?.row_id === m.row_id}
                  subtitle={m.nombre_de_empleado}
                  value={m.cantidad}
                  onView={() => verDetalle(m)}
                  onEdit={!puedeEscribir || esTraspasable ? undefined : () => abrirEditar(m)}
                  onTraspaso={esTraspasable ? () => setTraspasando(m) : undefined}
                  onDelete={puedeEscribir ? () => setAEliminar(m) : undefined}
                  onReprint={puedeEscribir && m.tipo_movimiento === 'SALIDA' ? () => reimprimirVale(m) : undefined}
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
                )
              }}
            />
          )}
        </Box>

        {seleccionado && (
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <MovimientoDetailPanel
              movimiento={seleccionado}
              departamentos={departamentos}
              onEdit={puedeEscribir ? () => abrirEditar(seleccionado) : undefined}
              onDelete={puedeEscribir ? () => setAEliminar(seleccionado) : undefined}
              onClose={cerrarDetalle}
              movimientoRelacionado={
                seleccionado.id_traspaso
                  ? movimientos.find((m) => m.id_traspaso === seleccionado.id_traspaso && m.row_id !== seleccionado.row_id)
                  : null
              }
              onVerRelacionado={() => {
                const par = movimientos.find((m) => m.id_traspaso === seleccionado.id_traspaso && m.row_id !== seleccionado.row_id)
                if (par) verDetalle(par)
              }}
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
        onSaved={() => { setDialogoAbierto(false); refrescarMovimientos() }}
      />

      <TraspasoDialog
        open={!!traspasando}
        onClose={() => setTraspasando(null)}
        movimiento={traspasando}
        empleados={empleados}
        saldoActual={traspasando ? saldoDe(traspasando.empleado_id, traspasando.producto_sku || traspasando.codigo_sai_sku) : null}
        onDone={() => { setTraspasando(null); refrescarMovimientos() }}
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
