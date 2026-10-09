import { Box, Typography, Button, Stack, IconButton } from '@mui/material'
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CloseIcon from '@mui/icons-material/Close'
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
 * Lista de fotos "libres" (número abierto, no un solo slot) — usada para las
 * fotos adicionales de la herramienta en Control de Resguardo. Trabaja sobre
 * archivos locales (`value`/`onChange`, un array de File) antes de guardarse
 * — quien la usa decide cuándo subirlos (al guardar el movimiento, ya con
 * row_id). Mismo criterio de cámara/galería que CampoFoto.
 */
export default function FotosMultiples({ label = 'Fotos adicionales', value = [], onChange }) {
  const agregar = (archivo) => {
    if (archivo) onChange([...value, archivo])
  }
  const quitar = (i) => onChange(value.filter((_, idx) => idx !== i))

  const tomarFoto = async () => {
    try {
      const foto = await Camera.getPhoto({ quality: 80, resultType: CameraResultType.Uri, source: CameraSource.Camera, saveToGallery: true })
      agregar(await comoArchivo(foto))
    } catch (err) {
      if (err?.message !== 'User cancelled photos app') console.error('Error al tomar foto:', err)
    }
  }

  const elegirImagen = async () => {
    try {
      const foto = await Camera.getPhoto({ quality: 80, resultType: CameraResultType.Uri, source: CameraSource.Photos })
      agregar(await comoArchivo(foto))
    } catch (err) {
      if (err?.message !== 'User cancelled photos app') console.error('Error al elegir imagen:', err)
    }
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 0.5, gap: 1, flexWrap: 'wrap' }}>
        {value.map((archivo, i) => (
          <Box key={i} sx={{ position: 'relative' }}>
            <Thumbnail src={URL.createObjectURL(archivo)} size={56} />
            <IconButton
              size="small" onClick={() => quitar(i)}
              sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 0.2 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        {esNativo ? (
          <>
            <Button size="small" startIcon={<ImageOutlinedIcon />} onClick={elegirImagen}>Elegir</Button>
            <Button size="small" startIcon={<AddAPhotoOutlinedIcon />} onClick={tomarFoto}>Tomar foto</Button>
          </>
        ) : (
          <>
            <Button component="label" size="small" startIcon={<ImageOutlinedIcon />}>
              Elegir
              <input hidden type="file" accept="image/*" onChange={(e) => agregar(e.target.files[0])} />
            </Button>
            <Button component="label" size="small" startIcon={<AddAPhotoOutlinedIcon />}>
              Tomar foto
              <input hidden type="file" accept="image/*" capture="environment" onChange={(e) => agregar(e.target.files[0])} />
            </Button>
          </>
        )}
      </Stack>
    </Box>
  )
}
