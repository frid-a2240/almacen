import { Box, Typography, IconButton, Tooltip } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import Thumbnail from './Thumbnail.jsx'

/**
 * Fila de lista estilo AppSheet: foto + título/subtítulo + valor a la derecha +
 * íconos de acción (borrar/editar siempre, más íconos de "ir al registro
 * relacionado" pasados en extraActions). Clic en el cuerpo de la fila abre el
 * panel de detalle (onView), como en AppSheet. En modo selección (modoSeleccion),
 * el clic marca/desmarca la fila en vez de abrir el detalle.
 */
export default function DeckListRow({
  photo,
  photoShape = 'square',
  title,
  subtitle,
  value,
  onView,
  onEdit,
  onDelete,
  extraActions = [],
  selected = false,
  style,
  modoSeleccion = false,
  marcado = false,
  onToggleMarcado,
}) {
  const marcadoActivo = modoSeleccion && marcado
  return (
    <Box
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: (selected || marcadoActivo) ? 'rgba(0, 175, 170, 0.12)' : 'transparent',
        boxSizing: 'border-box',
        '&:hover': { bgcolor: (selected || marcadoActivo) ? 'rgba(0, 175, 170, 0.18)' : 'rgba(255,255,255,0.03)' },
      }}
    >
      <Box
        onClick={modoSeleccion ? onToggleMarcado : onView}
        sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1, minWidth: 0, cursor: (onView || modoSeleccion) ? 'pointer' : 'default' }}
      >
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Thumbnail src={photo} shape={photoShape} />
          {marcadoActivo && (
            <CheckCircleIcon
              sx={{
                position: 'absolute', inset: 0, m: 'auto', color: 'primary.main',
                bgcolor: 'background.default', borderRadius: '50%', fontSize: 24,
              }}
            />
          )}
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography fontWeight={600} fontSize={15} noWrap>
            {title}
          </Typography>
          {subtitle && (
            <Typography fontSize={13} color="text.secondary" noWrap component="div">
              {subtitle}
            </Typography>
          )}
        </Box>

        {value !== undefined && value !== null && value !== '' && (
          <Typography fontSize={13} color="text.secondary" sx={{ flexShrink: 0, ml: 1 }}>
            {value}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, ml: 1 }}>
        {onDelete && (
          <IconButton size="small" onClick={onDelete} sx={{ color: 'text.secondary' }}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        )}
        {onEdit && (
          <IconButton size="small" onClick={onEdit} sx={{ color: 'text.secondary' }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        )}
        {extraActions.map(({ icon: Icon, onClick, title: tip }, i) => (
          <Tooltip key={i} title={tip || ''}>
            <span>
              <IconButton size="small" onClick={onClick} disabled={!onClick} sx={{ color: 'text.secondary' }}>
                <Icon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ))}
      </Box>
    </Box>
  )
}
