import { Box, Typography, Button, Stack } from '@mui/material'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import Thumbnail from './Thumbnail.jsx'

/**
 * Campo de foto reusado en todos los formularios (Productos, Empleados,
 * Departamento, Control de Resguardo): muestra el nombre del campo, la
 * miniatura actual, y dos botones — "Elegir imagen" (galería/archivos) y
 * "Tomar foto" (cámara directa) — para que quede claro de qué foto se trata
 * en cada apartado, igual en todos lados.
 */
export default function CampoFoto({ label, thumb, shape = 'square', capture = 'environment', onChange }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
        <Thumbnail src={thumb} shape={shape} size={56} />
        <Stack direction="row" spacing={1}>
          <Button component="label" startIcon={<ImageOutlinedIcon />} size="small">
            Elegir imagen
            <input hidden type="file" accept="image/*" onChange={(e) => onChange(e.target.files[0])} />
          </Button>
          <Button component="label" startIcon={<PhotoCameraOutlinedIcon />} size="small">
            Tomar foto
            <input hidden type="file" accept="image/*" capture={capture} onChange={(e) => onChange(e.target.files[0])} />
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
