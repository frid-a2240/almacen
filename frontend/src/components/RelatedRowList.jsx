import { Box, Typography } from '@mui/material'
import Thumbnail from './Thumbnail.jsx'

/**
 * Sección "Related Xs" compacta (usada por DEPARTAMENTO -> empleados,
 * CLASE FAMILIA -> productos): título + contador + filas con foto/título/subtítulo.
 */
export default function RelatedRowList({ title, items, keyFn, photoFn, titleFn, subtitleFn, onRowClick }) {
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {title}
        <Box component="span" sx={{ bgcolor: '#2A2A2A', px: 1, borderRadius: 1, fontSize: 12 }}>
          {items.length}
        </Box>
      </Typography>
      {!items.length && (
        <Typography color="text.secondary" fontSize={13}>Sin registros relacionados</Typography>
      )}
      {items.map((item) => (
        <Box
          key={keyFn(item)}
          onClick={() => onRowClick?.(item)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, py: 1,
            borderBottom: '1px solid', borderColor: 'divider',
            cursor: onRowClick ? 'pointer' : 'default',
          }}
        >
          <Thumbnail src={photoFn(item)} size={40} />
          <Box sx={{ minWidth: 0 }}>
            <Typography fontSize={14} fontWeight={600} noWrap>{titleFn(item)}</Typography>
            {subtitleFn && (
              <Typography fontSize={12} color="text.secondary" noWrap>{subtitleFn(item)}</Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  )
}
