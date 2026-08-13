import { createContext, useContext, useEffect, useState } from 'react'
import { TOKEN_KEY, alRecibirNoAutorizado } from '../api/client.js'
import { login as loginApi, obtenerUsuarioActual } from '../api/auth.js'

const AuthContext = createContext(null)

/**
 * Sesión persistente: el token se guarda en localStorage (sobrevive cerrar
 * la app, apagar/prender la tablet, etc.) y solo se borra cuando el usuario
 * le da explícitamente a "Cerrar sesión" — no expira sola mientras la use.
 */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setCargando(false)
      return
    }
    obtenerUsuarioActual()
      .then(setUsuario)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setCargando(false))
  }, [])

  const login = async (numeroControl, password) => {
    const { token, usuario: u } = await loginApi(numeroControl, password)
    localStorage.setItem(TOKEN_KEY, token)
    setUsuario(u)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setUsuario(null)
  }

  useEffect(() => {
    alRecibirNoAutorizado(() => setUsuario(null))
  }, [])

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
