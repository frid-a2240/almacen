import { useState } from 'react'
import {
  Drawer, Box, Typography, IconButton, List, ListItemButton, ListItemText,
  Checkbox, TextField, Button, Stack, ToggleButtonGroup, ToggleButton,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { valoresDistintos, contarFiltrosActivos } from '../utils/filters.js'
import { APPBAR_HEIGHT } from './Sidebar.jsx'

const PANEL_WIDTH = 320

function campoActivoTiene(campo, filtro) {
  if (!filtro) return false
  if (campo.tipo === 'enum') return !!filtro.valores?.size
  if (campo.tipo === 'fecha') return !!(filtro.desde || filtro.hasta)
  if (campo.tipo === 'imagen') return !!filtro.valor
  return !!filtro.texto
}

function EditorEnum({ campo, items, filtro, onChange }) {
  const valores = valoresDistintos(items, campo.key)
  const seleccion = filtro?.valores || new Set()

  const toggle = (v) => {
    const nuevo = new Set(seleccion)
    nuevo.has(v) ? nuevo.delete(v) : nuevo.add(v)
    onChange({ valores: nuevo })
  }

  if (valores.length === 0) {
    return <Typography sx={{ px: 2, py: 2 }} color="text.secondary" fontSize={14}>No hay valores para filtrar.</Typography>
  }

  return (
    <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
      {valores.map((v) => (
        <ListItemButton key={v} onClick={() => toggle(v)} dense>
          <Checkbox size="small" checked={seleccion.has(v)} tabIndex={-1} disableRipple />
          <ListItemText primary={v} />
        </ListItemButton>
      ))}
    </List>
  )
}

function EditorTexto({ filtro, onChange }) {
  return (
    <Box sx={{ px: 2, py: 2 }}>
      <TextField
        autoFocus fullWidth size="small" label="Contiene"
        value={filtro?.texto || ''}
        onChange={(e) => onChange({ texto: e.target.value })}
      />
    </Box>
  )
}

function EditorFecha({ filtro, onChange }) {
  return (
    <Stack spacing={2} sx={{ px: 2, py: 2 }}>
      <TextField
        type="date" label="Desde" fullWidth size="small"
        slotProps={{ inputLabel: { shrink: true } }}
        value={filtro?.desde || ''}
        onChange={(e) => onChange({ ...filtro, desde: e.target.value })}
      />
      <TextField
        type="date" label="Hasta" fullWidth size="small"
        slotProps={{ inputLabel: { shrink: true } }}
        value={filtro?.hasta || ''}
        onChange={(e) => onChange({ ...filtro, hasta: e.target.value })}
      />
    </Stack>
  )
}

function EditorImagen({ filtro, onChange }) {
  return (
    <Box sx={{ px: 2, py: 2 }}>
      <ToggleButtonGroup
        exclusive fullWidth size="small"
        value={filtro?.valor || null}
        onChange={(_, v) => onChange({ valor: v })}
      >
        <ToggleButton value="con">Con foto</ToggleButton>
        <ToggleButton value="sin">Sin foto</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  )
}

function CampoEditor({ campo, items, filtro, onVolver, onChange }) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <IconButton size="small" onClick={onVolver}><ArrowBackIcon fontSize="small" /></IconButton>
        <Typography variant="subtitle1" fontWeight={700} noWrap>{campo.label}</Typography>
      </Box>
      {campo.tipo === 'enum' && <EditorEnum campo={campo} items={items} filtro={filtro} onChange={onChange} />}
      {campo.tipo === 'texto' && <EditorTexto filtro={filtro} onChange={onChange} />}
      {campo.tipo === 'fecha' && <EditorFecha filtro={filtro} onChange={onChange} />}
      {campo.tipo === 'imagen' && <EditorImagen filtro={filtro} onChange={onChange} />}
    </>
  )
}

/**
 * Panel de filtros estilo AppSheet: lista de campos de la vista actual, cada
 * uno navega a un editor específico según su tipo (texto/enum/fecha/imagen).
 * `campos`: [{ key, label, tipo }]. `items`: lista completa sin filtrar (para
 * derivar los valores distintos de los campos tipo 'enum').
 */
export default function FilterPanel({ open, onClose, campos, items, filtros, onChange }) {
  const [campoActivo, setCampoActivo] = useState(null)

  const cerrar = () => {
    setCampoActivo(null)
    onClose()
  }

  const activos = contarFiltrosActivos(campos, filtros)

  return (
    <Drawer
      anchor="right" open={open} onClose={cerrar}
      slotProps={{ paper: { sx: { top: APPBAR_HEIGHT, height: `calc(100% - ${APPBAR_HEIGHT}px)` } } }}
    >
      <Box sx={{ width: PANEL_WIDTH, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {!campoActivo ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <IconButton size="small" onClick={cerrar}><CloseIcon fontSize="small" /></IconButton>
              <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>Filter</Typography>
              {activos > 0 && (
                <Button size="small" onClick={() => onChange({})}>Limpiar ({activos})</Button>
              )}
            </Box>
            <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
              {campos.map((campo) => {
                const activo = campoActivoTiene(campo, filtros[campo.key])
                return (
                  <ListItemButton key={campo.key} onClick={() => setCampoActivo(campo)}>
                    <ListItemText
                      primary={campo.label}
                      slotProps={{ primary: { fontWeight: activo ? 700 : 400, color: activo ? 'primary.main' : 'text.primary' } }}
                    />
                    <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </ListItemButton>
                )
              })}
            </List>
          </>
        ) : (
          <CampoEditor
            campo={campoActivo}
            items={items}
            filtro={filtros[campoActivo.key]}
            onVolver={() => setCampoActivo(null)}
            onChange={(valor) => onChange({ ...filtros, [campoActivo.key]: valor })}
          />
        )}
      </Box>
    </Drawer>
  )
}
