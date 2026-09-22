import { createContext, useContext, useMemo, useState } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { TEMAS, MODO_POR_DEFECTO } from '../theme/paletas.js'

const CLAVE = 'almacen_tema'
const ThemeModeContext = createContext(null)

function modoGuardado() {
  try {
    const guardado = localStorage.getItem(CLAVE)
    return guardado && TEMAS[guardado] ? guardado : MODO_POR_DEFECTO
  } catch {
    return MODO_POR_DEFECTO
  }
}

export function ThemeModeProvider({ children }) {
  const [modo, setModoState] = useState(modoGuardado)

  const setModo = (nuevoModo) => {
    if (!TEMAS[nuevoModo]) return
    setModoState(nuevoModo)
    try {
      localStorage.setItem(CLAVE, nuevoModo)
    } catch {
      // localStorage puede fallar en modo privado — no es crítico, solo no se recuerda la próxima vez.
    }
  }

  const valor = useMemo(() => ({ modo, setModo, opciones: TEMAS }), [modo])

  return (
    <ThemeModeContext.Provider value={valor}>
      <ThemeProvider theme={TEMAS[modo].theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode() {
  return useContext(ThemeModeContext)
}
