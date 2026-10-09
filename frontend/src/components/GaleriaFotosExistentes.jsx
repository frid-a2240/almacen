import { Box, Typography, Button, Stack, IconButton, CircularProgress } from '@mui/material'
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import Thumbnail from './Thumbnail.jsx'

const esNativo = Capacitor.isNativePlatform()

async function comoArchivo(foto) {
  const respuesta = await fetch(foto.webPath)
  const blob = await respuesta.blob()
  return new File([blob], `foto_${Date.now()}.${foto.format || 'jpeg'}`, { type: blob.type || 'image/jpeg' })
}

/**
 * Igual que FotosMultiples pero para un movimiento que YA existe (ya tiene
 * row_id): cada foto que se agrega o se quita se sube/borra de inmediato
 * (onAdd/onDelete hacen la llamada al API), no se acumula como archivo local.
 */
export default function GaleriaFotosExistentes({ label = 'Fotos adicionales', fotos = [], onAdd, onDelete }) {
  const [subiendo, setSubiendo] = useState(false)

  const agregar = async (archivo) => {
    if (!archivo) return
    setSubiendo(true)
    try {
      await onAdd(archivo)
    } finally {
      setSubiendo(false)
    }
  }

  const tomarFoto = async () => {
    try {
      const foto = await Camera.getPhoto({ quality: 80, resultType: CameraResultType.Uri, source: CameraSource.Camera, saveToGallery: true })
      await agregar(await comoArchivo(foto))
    } catch (err) {
      if (err?.message !== 'User cancelled photos app') console.error('Error al tomar foto:', err)
    }
  }

  const elegirImagen = async () => {
    try {
      const foto = await Camera.getPhoto({ quality: 80, resultType: CameraResultType.Uri, source: CameraSource.Photos })
      await agregar(await comoArchivo(foto))
    } catch (err) {
      if (err?.message !== 'User cancelled photos app') console.error('Error al elegir imagen:', err)
    }
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, gap: 1, flexWrap: 'wrap' }}>
        {fotos.map((f) => (
          <Box key={f.id} sx={{ position: 'relative' }}>
            <Thumbnail src={f.foto} size={56} />
            <IconButton
              size="small" onClick={() => onDelete(f.id)}
              sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 0.2 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        {subiendo && <CircularProgress size={24} />}
        {esNativo ? (
          <>
            <Button size="small" disabled={subiendo} startIcon={<ImageOutlinedIcon />} onClick={elegirImagen}>Elegir</Button>
            <Button size="small" disabled={subiendo} startIcon={<AddAPhotoOutlinedIcon />} onClick={tomarFoto}>Tomar foto</Button>
          </>
        ) : (
          <>
            <Button component="label" size="small" disabled={subiendo} startIcon={<ImageOutlinedIcon />}>
              Elegir
              <input hidden type="file" accept="image/*" onChange={(e) => agregar(e.target.files[0])} />
            </Button>
            <Button component="label" size="small" disabled={subiendo} startIcon={<AddAPhotoOutlinedIcon />}>
              Tomar foto
              <input hidden type="file" accept="image/*" capture="environment" onChange={(e) => agregar(e.target.files[0])} />
            </Button>
          </>
        )}
      </Stack>
    </Box>
  )
}
