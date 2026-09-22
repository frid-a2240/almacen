import { Box, Typography } from '@mui/material'

/**
 * Tarjeta de estadística para el Dashboard: ícono + etiqueta chica arriba,
 * número grande al centro, sub-etiqueta opcional abajo (como el % de
 * empleados activos). `pendiente` la pinta apagada con la leyenda
 * "Próximamente" para los apartados que todavía no tienen datos reales
 * (mantenimiento de herramienta).
 */
export default function StatTile({ icon: Icon, label, value, sublabel, pendiente = false }) {
  return (
    <Box
      sx={{
        flex: '1 1 220px',
        minWidth: 220,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2.5,
        opacity: pendiente ? 0.7 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        {Icon && <Icon sx={{ color: pendiente ? 'text.secondary' : 'primary.main', fontSize: 20 }} />}
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Box>
      {pendiente ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Próximamente
        </Typography>
      ) : (
        <>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
          {sublabel && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {sublabel}
            </Typography>
          )}
        </>
      )}
    </Box>
  )
}
