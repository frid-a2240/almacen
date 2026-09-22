import { useState } from 'react'
import { Box, Typography, IconButton, Button, TextField, Stack, Tooltip, Autocomplete } from '@mui/material'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined'
import CloseIcon from '@mui/icons-material/Close'
import DetailPanel from './DetailPanel.jsx'
import RelatedTable from './RelatedTable.jsx'
import CampoFoto from './CampoFoto.jsx'
import Thumbnail from './Thumbnail.jsx'
import { formatoFecha } from '../utils/formatters.js'
import { agregarFotoBaja, quitarFotoBaja, obtenerBajaHerramientaPdf } from '../api/bajasHerramienta.js'
import { imprimirPdf, abrirVentanaImpresion } from '../utils/imprimir.js'

const COLUMNAS_ITEMS = [
  { field: 'codigo_sai_sku', headerName: 'SKU' },
  { field: 'descripcion', headerName: 'Descripción' },
  { field: 'numero_economico', headerName: '# Económico' },
  { field: 'diagnostico', headerName: 'Diagnóstico' },
]

export default function BajaHerramientaDetailPanel({ baja, onDelete, onClose, onCambio }) {
  const [agregandoFoto, setAgregandoFoto] = useState(false)
  const [nuevaFoto, setNuevaFoto] = useState({ archivo: null, items: [], descripcion: '', numeros_economicos: '' })
  const [subiendo, setSubiendo] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)

  const imprimir = async () => {
    const ventana = abrirVentanaImpresion()
    setImprimiendo(true)
    try {
      const pdf = await obtenerBajaHerramientaPdf(baja.id)
      await imprimirPdf(pdf, `baja_${baja.folio}`, ventana, { duplex: true })
    } catch (err) {
      ventana?.close()
    } finally {
      setImprimiendo(false)
    }
  }

  const guardarFoto = async () => {
    if (!nuevaFoto.archivo) return
    setSubiendo(true)
    try {
      await agregarFotoBaja(baja.id, nuevaFoto.archivo, nuevaFoto.descripcion, nuevaFoto.numeros_economicos)
      setNuevaFoto({ archivo: null, items: [], descripcion: '', numeros_economicos: '' })
      setAgregandoFoto(false)
      onCambio()
    } finally {
      setSubiendo(false)
    }
  }

  // Igual que al crear la baja: elegir a qué herramienta(s) corresponde la
  // foto autorrellena Descripción / # Económicos con los de esos renglones.
  const elegirHerramientasDeFoto = (seleccionados) => {
    const descripciones = [...new Set(seleccionados.map((it) => it.descripcion))]
    const economicos = seleccionados.map((it) => it.numero_economico).filter(Boolean)
    setNuevaFoto((f) => ({
      ...f,
      items: seleccionados,
      descripcion: descripciones.join(', '),
      numeros_economicos: economicos.join(', '),
    }))
  }

  const eliminarFoto = async (fotoId) => {
    await quitarFotoBaja(baja.id, fotoId)
    onCambio()
  }

  return (
    <DetailPanel
      title={`Baja ${baja.folio}`}
      onDelete={onDelete}
      onClose={onClose}
      extraActions={
        <Tooltip title="Reimprimir formato">
          <span>
            <IconButton size="small" onClick={imprimir} disabled={imprimiendo} sx={{ color: 'text.secondary' }}>
              <PrintOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      }
      fields={[
        { label: 'Folio', value: baja.folio },
        { label: 'Fecha', value: formatoFecha(baja.fecha) },
        { label: 'Técnico evaluador', value: `${baja.tecnico_nombre || ''} — ${baja.tecnico_puesto || ''}` },
        { label: 'Personal de almacén', value: `${baja.almacenista_nombre || ''} — ${baja.almacenista_puesto || ''}` },
        { label: 'Observaciones', value: baja.observaciones },
      ]}
    >
      <RelatedTable
        title="Herramientas dadas de baja"
        rows={baja.items}
        keyFn={(it) => it.id}
        columns={COLUMNAS_ITEMS}
      />

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Evidencia fotográfica
        </Typography>
        <Stack spacing={2}>
          {baja.fotos.map((foto) => (
            <Stack key={foto.id} direction="row" spacing={2} alignItems="flex-start">
              <Thumbnail src={foto.foto} shape="rounded" size={72} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography fontSize={13}>{foto.descripcion || '—'}</Typography>
                <Typography fontSize={12} color="text.secondary">{foto.numeros_economicos}</Typography>
              </Box>
              <IconButton size="small" onClick={() => eliminarFoto(foto.id)} sx={{ color: 'text.secondary' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}

          {agregandoFoto ? (
            <Stack spacing={1.5} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <CampoFoto
                label="Foto"
                thumb={nuevaFoto.archivo ? URL.createObjectURL(nuevaFoto.archivo) : undefined}
                onChange={(archivo) => setNuevaFoto((f) => ({ ...f, archivo }))}
              />
              <Autocomplete
                multiple
                size="small"
                options={baja.items}
                getOptionLabel={(it) => `${it.descripcion} (${it.numero_economico || it.codigo_sai_sku})`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={nuevaFoto.items}
                onChange={(_, seleccionados) => elegirHerramientasDeFoto(seleccionados)}
                renderInput={(params) => (
                  <TextField {...params} label="¿Qué herramienta(s) muestra esta foto?" />
                )}
              />
              <TextField
                label="Descripción" size="small" fullWidth
                value={nuevaFoto.descripcion}
                onChange={(e) => setNuevaFoto((f) => ({ ...f, descripcion: e.target.value }))}
                helperText="Se llena sola al elegir la(s) herramienta(s) de arriba — puedes ajustarla."
              />
              <TextField
                label="Números económicos que cubre" size="small" fullWidth
                value={nuevaFoto.numeros_economicos}
                onChange={(e) => setNuevaFoto((f) => ({ ...f, numeros_economicos: e.target.value }))}
                helperText="Se llena solo — puedes ajustarlo si hace falta."
              />
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setAgregandoFoto(false)}>Cancelar</Button>
                <Button size="small" variant="contained" disableElevation disabled={!nuevaFoto.archivo || subiendo} onClick={guardarFoto}>
                  Guardar foto
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Button startIcon={<AddAPhotoOutlinedIcon />} onClick={() => setAgregandoFoto(true)} sx={{ alignSelf: 'flex-start' }}>
              Agregar foto
            </Button>
          )}
        </Stack>
      </Box>
    </DetailPanel>
  )
}
