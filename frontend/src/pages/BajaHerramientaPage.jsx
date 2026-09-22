import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import ViewHeader from '../components/ViewHeader.jsx'
import DeckList from '../components/DeckList.jsx'
import DeckListRow from '../components/DeckListRow.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import BajaHerramientaDetailPanel from '../components/BajaHerramientaDetailPanel.jsx'
import BajaHerramientaFormDialog from '../components/BajaHerramientaFormDialog.jsx'
import { listarBajasHerramienta, eliminarBajaHerramienta, obtenerBajaHerramienta } from '../api/bajasHerramienta.js'
import { listarEmpleados } from '../api/empleados.js'
import { listarProductos } from '../api/productos.js'
import { useSearch } from '../context/SearchContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { coincideBusqueda } from '../utils/search.js'
import { formatoFecha } from '../utils/formatters.js'
import useEsMovil from '../hooks/useEsMovil.js'

const CAMPOS_BUSQUEDA = ['folio', 'tecnico_nombre', 'almacenista_nombre']

export default function BajaHerramientaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { query } = useSearch()
  const { usuario } = useAuth()
  const esMovil = useEsMovil()
  const puedeEscribir = !usuario?.solo_consulta
  const [bajas, setBajas] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [aEliminar, setAEliminar] = useState(null)

  const cargar = () => {
    setCargando(true)
    Promise.all([listarBajasHerramienta(), listarEmpleados(), listarProductos()])
      .then(([b, e, p]) => {
        setBajas(b)
        setEmpleados(e)
        setProductos(p)
      })
      .finally(() => setCargando(false))
  }
  useEffect(cargar, [])

  const seleccionado = bajas.find((b) => String(b.id) === searchParams.get('sel')) || null
  const bajasFiltradas = bajas.filter((b) => coincideBusqueda(b, CAMPOS_BUSQUEDA, query))

  const verDetalle = (b) => setSearchParams({ sel: b.id })
  const cerrarDetalle = () => setSearchParams({})

  const recargarSeleccionado = async () => {
    if (!seleccionado) return
    const actualizado = await obtenerBajaHerramienta(seleccionado.id)
    setBajas((prev) => prev.map((b) => (b.id === actualizado.id ? actualizado : b)))
  }

  const confirmarEliminar = async () => {
    const id = aEliminar.id
    await eliminarBajaHerramienta(id)
    setAEliminar(null)
    if (seleccionado?.id === id) cerrarDetalle()
    cargar()
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ViewHeader title="BAJA DE HERRAMIENTA" onAdd={puedeEscribir ? () => setDialogoAbierto(true) : undefined} />

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
              items={bajasFiltradas}
              keyFn={(b) => b.id}
              renderRow={(b, key, style) => (
                <DeckListRow
                  key={key}
                  style={style}
                  photo={b.fotos[0]?.foto}
                  title={`Baja ${b.folio}`}
                  selected={seleccionado?.id === b.id}
                  subtitle={`${b.tecnico_nombre || ''} / ${b.almacenista_nombre || ''}`}
                  value={formatoFecha(b.fecha)}
                  onView={() => verDetalle(b)}
                  onDelete={puedeEscribir ? () => setAEliminar(b) : undefined}
                />
              )}
            />
          )}
        </Box>

        {seleccionado && (
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <BajaHerramientaDetailPanel
              baja={seleccionado}
              onDelete={puedeEscribir ? () => setAEliminar(seleccionado) : undefined}
              onClose={cerrarDetalle}
              onCambio={recargarSeleccionado}
            />
          </Box>
        )}
      </Box>

      <BajaHerramientaFormDialog
        open={dialogoAbierto}
        onClose={() => setDialogoAbierto(false)}
        empleados={empleados}
        productos={productos}
        onSaved={(id) => { setDialogoAbierto(false); cargar(); setSearchParams({ sel: id }) }}
      />

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar baja de herramienta"
        message={`¿Eliminar la baja "${aEliminar?.folio}"? Esta acción no se puede deshacer y regresa al stock las herramientas de este registro.`}
        onCancel={() => setAEliminar(null)}
        onConfirm={confirmarEliminar}
      />
    </Box>
  )
}
