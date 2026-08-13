import { Box, Typography, Button, IconButton, Badge, Tooltip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import ChecklistIcon from '@mui/icons-material/ChecklistOutlined'

export default function ViewHeader({ title, onAdd, onFiltrar, filtrosActivos = 0, onSeleccionar }) {
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
      }}
    >
      <Typography variant="h6" fontWeight={700} letterSpacing={0.5}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {onAdd && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd} disableElevation>
            Add
          </Button>
        )}
        {onFiltrar && (
          <Tooltip title="Filter">
            <IconButton size="small" onClick={onFiltrar} sx={{ color: filtrosActivos ? 'primary.main' : 'text.secondary' }}>
              <Badge badgeContent={filtrosActivos} color="primary" variant={filtrosActivos ? 'standard' : 'dot'} invisible={!filtrosActivos}>
                <FilterListIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
        )}
        {onSeleccionar && (
          <Tooltip title="Select">
            <IconButton size="small" onClick={onSeleccionar} sx={{ color: 'text.secondary' }}>
              <ChecklistIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  )
}
