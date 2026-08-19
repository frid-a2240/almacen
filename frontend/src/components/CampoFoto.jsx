import { Box, Typography, Button, Stack } from '@mui/material'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
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
 * Campo de foto reusado en todos los formularios (Productos, Empleados,
 * Departamento, Control de Resguardo): muestra el nombre del campo, la
 * miniatura actual, y dos botones — "Elegir imagen" (galería/archivos) y
 * "Tomar foto" (cámara directa) — para que quede claro de qué foto se trata
 * en cada apartado, igual en todos lados.
 *
 * Dentro del APK (Capacitor) usa el plugin nativo de cámara con
 * `saveToGallery: true`: la foto tomada queda guardada en la galería del
 * dispositivo, así que si hace falta volver a usarla (p.ej. otra salida de
 * la misma herramienta) ya aparece en "Elegir imagen" sin repetir la foto.
 * En el dashboard web (sin Capacitor) se sigue usando el <input type="file">
 * normal, que es lo único disponible en un navegador de escritorio.
 */
export default function CampoFoto({ label, thumb, shape = 'square', capture = 'environment', onChange }) {
  const tomarFoto = async () => {
    try {
      const foto = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: true,
      })
      onChange(await comoArchivo(foto))
    } catch (err) {
      if (err?.message !== 'User cancelled photos app') console.error('Error al tomar foto:', err)
    }
  }

  const elegirImagen = async () => {
    try {
      const foto = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      })
      onChange(await comoArchivo(foto))
    } catch (err) {
      if (err?.message !== 'User cancelled photos app') console.error('Error al elegir imagen:', err)
    }
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
        <Thumbnail src={thumb} shape={shape} size={56} />
        <Stack direction="row" spacing={1}>
          {esNativo ? (
            <Button startIcon={<ImageOutlinedIcon />} size="small" onClick={elegirImagen}>
              Elegir imagen
            </Button>
          ) : (
            <Button component="label" startIcon={<ImageOutlinedIcon />} size="small">
              Elegir imagen
              <input hidden type="file" accept="image/*" onChange={(e) => onChange(e.target.files[0])} />
            </Button>
          )}
          {esNativo ? (
            <Button startIcon={<PhotoCameraOutlinedIcon />} size="small" onClick={tomarFoto}>
              Tomar foto
            </Button>
          ) : (
            <Button component="label" startIcon={<PhotoCameraOutlinedIcon />} size="small">
              Tomar foto
              <input hidden type="file" accept="image/*" capture={capture} onChange={(e) => onChange(e.target.files[0])} />
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
