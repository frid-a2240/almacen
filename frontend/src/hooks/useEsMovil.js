import { useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// Punto de quiebre para tratar la app como "móvil": abajo de este ancho el
// layout de dos paneles (lista + detalle) no cabe, así que las páginas
// colapsan a un solo panel a la vez.
export default function useEsMovil() {
  const theme = useTheme()
  return useMediaQuery(theme.breakpoints.down('md'))
}

