import { Box, Typography, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import Thumbnail from './Thumbnail.jsx'
import DetailField from './DetailField.jsx'

/**
 * Panel maestro-detalle: se muestra a la derecha de la lista cuando hay un
 * registro seleccionado, replicando la vista "Detail" de AppSheet (foto grande +
 * todos los campos + secciones de registros relacionados pasadas como children).
 */
export default function DetailPanel({
  title, photo, photoShape = 'rounded', fields = [], onEdit, onDelete, onClose, extraActions, children,
}) {
  return (
    <Box sx={{ height: '100%', overflowY: 'auto', bgcolor: 'background.default' }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider',
          position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 1,
        }}
      >
        <Typography variant="h6" fontWeight={700} noWrap sx={{ mr: 2 }}>{title}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {extraActions}
          {onDelete && (
            <IconButton size="small" onClick={onDelete} sx={{ color: 'text.secondary' }}>
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          )}
          {onEdit && (
            <IconButton size="small" onClick={onEdit} sx={{ color: 'text.secondary' }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      <Box sx={{ p: 3 }}>
        {photo !== undefined && (
          <Box sx={{ mb: 3 }}>
            <Thumbnail src={photo} shape={photoShape} size={180} />
          </Box>
        )}
        {fields.map((f, i) => (f ? <DetailField key={i} {...f} /> : null))}
        {children}
      </Box>
    </Box>
  )
}
