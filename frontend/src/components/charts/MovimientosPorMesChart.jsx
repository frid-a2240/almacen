import { useState } from 'react'
import { Box, Typography, useTheme } from '@mui/material'

// Colores categóricos tomados del par adjacente 1-2 de la paleta validada
// (ver skill de dataviz): pasa el piso de daltonismo y de contraste en claro
// y oscuro sin necesidad de volver a correr el validador para este par.
const COLOR_SALIDAS = { light: '#2a78d6', dark: '#3987e5' }
const COLOR_ENTRADAS = { light: '#eb6834', dark: '#d95926' }

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatoMes(mes) {
  const [, m] = mes.split('-')
  return MESES_CORTOS[Number(m) - 1] || mes
}

const ANCHO = 640
const ALTO = 220
const MARGEN = { izq: 34, der: 8, sup: 12, inf: 26 }

/**
 * Barras agrupadas (Salidas vs Entradas) de los últimos meses — construida a
 * mano con SVG (sin librería) siguiendo la guía de dataviz: un solo eje,
 * marcas delgadas con esquinas redondeadas, leyenda siempre visible (2
 * series), tooltip al pasar el mouse en vez de una etiqueta en cada barra.
 */
export default function MovimientosPorMesChart({ datos }) {
  const theme = useTheme()
  const oscuro = theme.palette.mode === 'dark'
  const [hover, setHover] = useState(null)

  const colorSalidas = oscuro ? COLOR_SALIDAS.dark : COLOR_SALIDAS.light
  const colorEntradas = oscuro ? COLOR_ENTRADAS.dark : COLOR_ENTRADAS.light
  const colorEje = oscuro ? '#383835' : '#c3c2b7'
  const colorGrid = oscuro ? '#2c2c2a' : '#e1e0d9'
  const colorMuted = '#898781'

  const anchoPlot = ANCHO - MARGEN.izq - MARGEN.der
  const altoPlot = ALTO - MARGEN.sup - MARGEN.inf

  if (!datos || datos.length === 0) {
    return <Typography variant="body2" color="text.secondary">Todavía no hay movimientos registrados.</Typography>
  }

  const maxValor = Math.max(1, ...datos.flatMap((d) => [d.salidas, d.entradas]))
  const maxEje = Math.ceil(maxValor / 5) * 5 || 5

  const anchoGrupo = anchoPlot / datos.length
  const anchoBarra = Math.min(22, (anchoGrupo - 16) / 2)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>Movimientos por mes</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 'auto' }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: colorSalidas }} />
          <Typography variant="caption" color="text.secondary">Salidas</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: colorEntradas }} />
          <Typography variant="caption" color="text.secondary">Entradas</Typography>
        </Box>
      </Box>

      <Box sx={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
          <g transform={`translate(${MARGEN.izq},${MARGEN.sup})`}>
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = altoPlot * (1 - frac)
              return (
                <g key={frac}>
                  <line x1={0} x2={anchoPlot} y1={y} y2={y} stroke={colorGrid} strokeWidth={1} />
                  <text x={-8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={colorMuted}>
                    {Math.round(maxEje * frac)}
                  </text>
                </g>
              )
            })}
            <line x1={0} x2={anchoPlot} y1={altoPlot} y2={altoPlot} stroke={colorEje} strokeWidth={1} />

            {datos.map((d, i) => {
              const xGrupo = i * anchoGrupo + anchoGrupo / 2
              const xSalidas = xGrupo - 1 - anchoBarra
              const xEntradas = xGrupo + 1
              const hSalidas = (d.salidas / maxEje) * altoPlot
              const hEntradas = (d.entradas / maxEje) * altoPlot
              const atenuarSalidas = hover && hover.indice === i && hover.serie === 'entradas'
              const atenuarEntradas = hover && hover.indice === i && hover.serie === 'salidas'
              return (
                <g key={d.mes}>
                  <rect
                    x={xSalidas} y={altoPlot - hSalidas} width={anchoBarra} height={Math.max(hSalidas, 0)}
                    rx={3} fill={colorSalidas} opacity={atenuarSalidas ? 0.45 : 1}
                    onMouseEnter={() => setHover({ indice: i, serie: 'salidas' })}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: 'pointer' }}
                  />
                  <rect
                    x={xEntradas} y={altoPlot - hEntradas} width={anchoBarra} height={Math.max(hEntradas, 0)}
                    rx={3} fill={colorEntradas} opacity={atenuarEntradas ? 0.45 : 1}
                    onMouseEnter={() => setHover({ indice: i, serie: 'entradas' })}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: 'pointer' }}
                  />
                  <text x={xGrupo} y={altoPlot + 16} textAnchor="middle" fontSize={10} fill={colorMuted}>
                    {formatoMes(d.mes)}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        {hover && (
          <Box
            sx={{
              position: 'absolute', pointerEvents: 'none', top: 4, left: 4,
              bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
              borderRadius: 1, px: 1.2, py: 0.6, boxShadow: 3,
            }}
          >
            <Typography variant="caption" fontWeight={700} display="block">
              {datos[hover.indice].mes}
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: colorSalidas }}>
              Salidas: {datos[hover.indice].salidas}
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: colorEntradas }}>
              Entradas: {datos[hover.indice].entradas}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
