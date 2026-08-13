import { Box } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'

export default function DataTable({
  rows, columns, getRowId, onRowClick,
  checkboxSelection = false, rowSelectionModel, onRowSelectionModelChange,
}) {
  return (
    <Box sx={{ height: '100%', px: 2, py: 1 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        density="compact"
        disableRowSelectionOnClick={!checkboxSelection}
        onRowClick={checkboxSelection ? undefined : onRowClick}
        checkboxSelection={checkboxSelection}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={onRowSelectionModelChange}
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.paper' },
          '& .MuiDataGrid-cell': { borderColor: 'divider' },
          '& .MuiDataGrid-row': { cursor: onRowClick ? 'pointer' : 'default' },
        }}
      />
    </Box>
  )
}
