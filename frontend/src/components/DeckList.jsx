import { useCallback, useMemo } from 'react'
import { Typography } from '@mui/material'
import { List } from 'react-window'

// Altura fija de fila (debe calzar con el padding/avatar de DeckListRow) y de
// encabezado de grupo — necesarias para que react-window calcule qué filas
// están en pantalla sin tener que medir el DOM.
const ROW_HEIGHT = 80
const HEADER_HEIGHT = 36

function Row({ index, style, flat, renderRow, groupLabel }) {
  const entry = flat[index]
  if (entry.type === 'header') {
    return (
      <Typography
        style={style}
        sx={{
          px: 3,
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'background.paper',
          fontWeight: 700,
          fontSize: 13,
          boxSizing: 'border-box',
        }}
      >
        {groupLabel ? groupLabel(entry.clave) : entry.clave}
      </Typography>
    )
  }
  return renderRow(entry.item, entry.key, style)
}

/**
 * Lista de filas virtualizada (react-window): solo monta en el DOM las filas
 * visibles en pantalla, sin importar si `items` trae 30 o 3800 registros.
 * Agrupación opcional bajo encabezados en negrita (usado por CONTROL DE
 * RESGUARDO, agrupado por fecha) aplanando grupo+filas a una sola lista.
 */
export default function DeckList({ items, keyFn, renderRow, groupBy, groupLabel }) {
  const flat = useMemo(() => {
    if (!groupBy) {
      return items.map((item) => ({ type: 'row', item, key: keyFn(item) }))
    }
    const out = []
    const vistos = new Set()
    for (const item of items) {
      const clave = groupBy(item)
      if (!vistos.has(clave)) {
        vistos.add(clave)
        out.push({ type: 'header', clave, key: `__header_${clave}` })
      }
      out.push({ type: 'row', item, key: keyFn(item) })
    }
    return out
  }, [items, groupBy, keyFn])

  const rowHeight = useCallback(
    (index) => (flat[index].type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT),
    [flat],
  )
  const rowKey = useCallback((index) => flat[index].key, [flat])
  const rowProps = useMemo(() => ({ flat, renderRow, groupLabel }), [flat, renderRow, groupLabel])

  return (
    <List
      rowComponent={Row}
      rowCount={flat.length}
      rowHeight={rowHeight}
      rowProps={rowProps}
      rowKey={rowKey}
      overscanCount={6}
      style={{ height: '100%' }}
    />
  )
}
