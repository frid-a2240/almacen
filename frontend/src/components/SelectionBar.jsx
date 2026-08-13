import { Box, Typography, IconButton, Button } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'

/**
 * Reemplaza al ViewHeader mientras el modo de selección múltiple está activo
 * (estilo AppSheet: "X Selected" + botón Delete), para borrado masivo.
 */
export default function SelectionBar({ cantidad, onCancelar, onEliminar }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'rgba(0, 175, 170, 0.08)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton size="small" onClick={onCancelar}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>
          {cantidad} Selected
        </Typography>
      </Box>
      <Button
        color="error" variant="outlined" size="small"
        startIcon={<DeleteOutlineIcon />}
        disabled={cantidad === 0}
        onClick={onEliminar}
      >
        Delete
      </Button>
    </Box>
  )
}
