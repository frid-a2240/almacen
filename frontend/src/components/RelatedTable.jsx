import { Box, Table, TableHead, TableBody, TableRow, TableCell, Typography } from '@mui/material'

/**
 * Sección "Related Xs" en formato tabla con scroll horizontal (usada por
 * PRODUCTOS/EMPLEADOS/DEPARTAMENTO/CLASE FAMILIA -> movimientos de CONTROL DE RESGUARDO).
 */
export default function RelatedTable({ title, columns, rows, keyFn, onRowClick }) {
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {title}
        <Box component="span" sx={{ bgcolor: '#2A2A2A', px: 1, borderRadius: 1, fontSize: 12 }}>
          {rows.length}
        </Box>
      </Typography>
      <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.field} sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: 12 }}>
                  {c.headerName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={keyFn(row)} hover onClick={() => onRowClick?.(row)}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((c) => (
                  <TableCell key={c.field} sx={{ whiteSpace: 'nowrap' }}>
                    {c.renderCell ? c.renderCell(row) : (row[c.field] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography color="text.secondary" fontSize={13}>Sin registros</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}
