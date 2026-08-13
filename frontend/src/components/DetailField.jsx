import { Box, Typography } from '@mui/material'

export default function DetailField({ label, value, action }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 0.25, wordBreak: 'break-word' }}>{value}</Typography>
      </Box>
      {action}
    </Box>
  )
}
