import { useEffect, useState } from 'react'
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack,
  ToggleButtonGroup, ToggleButton, Typography,
} from '@mui/material'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import CampoFoto from './CampoFoto.jsx'
import { crearProducto, actualizarProducto, subirFotoProducto, subirScanProducto } from '../api/productos.js'

const UDM_OPCIONES = ['PZA', 'JGO', 'KIT', 'MT', 'SET', 'PAR', 'CJA', 'GAL']
const ALMACEN_OPCIONES = ['ALMACEN GENERAL', 'ALMACEN PAÑOL', 'ALMACEN RESGUARDO']

const VACIO = {
  codigo_sai_sku: '', tool_id: '', descripcion: '', udm: '', almacen: '', clase_familia_id: '',
  numero_economico: '', inventario_inicial: 0, costo_unitario: '', ubicacion: '',
  minimo: '', maximo: '', fecha_de_alta: '',
}

export default function ProductoFormDialog({ open, onClose, onSaved, producto, clases }) {
  const [form, setForm] = useState(VACIO)
  const [foto, setFoto] = useState(null)
  const [scan, setScan] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    setFoto(null)
    setScan(null)
    setForm(producto ? {
      codigo_sai_sku: producto.codigo_sai_sku,
      tool_id: producto.tool_id || '',
      descripcion: producto.descripcion || '',
      udm: producto.udm || '',
      almacen: producto.almacen || '',
      clase_familia_id: producto.clase_familia_id || '',
      numero_economico: producto.numero_economico || '',
      inventario_inicial: producto.inventario_inicial || 0,
      costo_unitario: producto.costo_unitario || '',
      ubicacion: producto.ubicacion || '',
      minimo: producto.minimo || '',
      maximo: producto.maximo || '',
      fecha_de_alta: producto.fecha_de_alta || '',
    } : VACIO)
  }, [open, producto])

  const guardar = async () => {
    setGuardando(true)
    try {
      const payload = {
        ...form,
        clase_familia_id: form.clase_familia_id || null,
        costo_unitario: form.costo_unitario || null,
        minimo: form.minimo || null,
        maximo: form.maximo || null,
        fecha_de_alta: form.fecha_de_alta || null,
        inventario_inicial: form.inventario_inicial || 0,
      }
      let sku = producto?.codigo_sai_sku
      if (producto) {
        delete payload.codigo_sai_sku
        await actualizarProducto(sku, payload)
      } else {
        const creado = await crearProducto(payload)
        sku = creado.codigo_sai_sku
      }
      if (foto) await subirFotoProducto(sku, foto)
      if (scan) await subirScanProducto(sku, scan)
      onSaved(sku)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{producto ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {producto && (
            <TextField label="Row ID" value={producto.appsheet_row_id || producto.codigo_sai_sku} fullWidth disabled />
          )}
          <CampoFoto
            label="Foto Producto"
            thumb={foto ? URL.createObjectURL(foto) : producto?.foto_producto}
            onChange={setFoto}
          />
          {!producto && (
            <TextField
              label="Código SAI / SKU" required fullWidth
              value={form.codigo_sai_sku}
              onChange={(e) => setForm({ ...form, codigo_sai_sku: e.target.value })}
            />
          )}
          <TextField
            label="Tool Id" fullWidth value={form.tool_id}
            onChange={(e) => setForm({ ...form, tool_id: e.target.value })}
          />
          <TextField
            label="Descripción" required fullWidth
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
          <TextField
            label="UDM" select fullWidth value={form.udm}
            onChange={(e) => setForm({ ...form, udm: e.target.value })}
          >
            <MenuItem value="">(ninguna)</MenuItem>
            {UDM_OPCIONES.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
          </TextField>

          <Box>
            <Typography variant="caption" color="text.secondary">Almacén</Typography>
            <ToggleButtonGroup
              exclusive fullWidth size="small" sx={{ mt: 0.5 }}
              value={form.almacen || null}
              onChange={(_, v) => setForm({ ...form, almacen: v || '' })}
            >
              {ALMACEN_OPCIONES.map((a) => (
                <ToggleButton key={a} value={a} sx={{ fontSize: 11 }}>{a}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <TextField
            label="Clase / Familia" select fullWidth
            value={form.clase_familia_id}
            onChange={(e) => setForm({ ...form, clase_familia_id: e.target.value })}
          >
            <MenuItem value="">(ninguna)</MenuItem>
            {clases.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.clase_familia}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Número económico" fullWidth value={form.numero_economico}
              onChange={(e) => setForm({ ...form, numero_economico: e.target.value })}
            />
            <TextField
              label="Ubicación" fullWidth value={form.ubicacion}
              onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Inventario inicial" type="number" fullWidth value={form.inventario_inicial}
              onChange={(e) => setForm({ ...form, inventario_inicial: e.target.value })}
            />
            <TextField
              label="Costo unitario" type="number" fullWidth value={form.costo_unitario}
              onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })}
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Mínimo" type="number" fullWidth value={form.minimo}
              onChange={(e) => setForm({ ...form, minimo: e.target.value })}
            />
            <TextField
              label="Máximo" type="number" fullWidth value={form.maximo}
              onChange={(e) => setForm({ ...form, maximo: e.target.value })}
            />
          </Stack>
          <TextField
            label="Fecha de alta" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }}
            value={form.fecha_de_alta}
            onChange={(e) => setForm({ ...form, fecha_de_alta: e.target.value })}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button component="label" startIcon={<DescriptionOutlinedIcon />} size="small" variant="outlined">
              Scan Document
              <input hidden type="file" accept="application/pdf,image/*" onChange={(e) => setScan(e.target.files[0])} />
            </Button>
            <Typography variant="caption" color="text.secondary">
              {scan?.name || (producto?.scan_document ? 'Ya tiene un documento cargado' : 'Sin documento')}
            </Typography>
          </Box>

          {producto && (
            <TextField label="Stock" value={producto.stock} fullWidth disabled helperText="Se calcula automáticamente a partir de los movimientos" />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disableElevation onClick={guardar} disabled={guardando || !form.descripcion || (!producto && !form.codigo_sai_sku)}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
