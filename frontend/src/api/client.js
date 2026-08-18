import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const TOKEN_KEY = 'almacen_token'

export const client = axios.create({ baseURL: API_URL })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// AuthContext se registra aquí para reaccionar a un 401 de "sesión inválida"
// sin recargar la página (evita perder el estado de React a medias).
let manejadorNoAutorizado = null
export function alRecibirNoAutorizado(fn) {
  manejadorNoAutorizado = fn
}

client.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const esLogin = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !esLogin) {
      localStorage.removeItem(TOKEN_KEY)
      manejadorNoAutorizado?.()
    }
    return Promise.reject(error)
  },
)

function esURLCompleta(rutaRelativa) {
  // blob:/data: son previsualizaciones locales (foto recién tomada, aún sin
  // subir) — ya son una URL completa, no se les debe anteponer la API.
  return rutaRelativa.startsWith('http') || rutaRelativa.startsWith('blob:') || rutaRelativa.startsWith('data:')
}

export function imageURL(rutaRelativa) {
  if (!rutaRelativa) return null
  if (esURLCompleta(rutaRelativa)) return rutaRelativa
  return `${API_URL}/uploads/${rutaRelativa}`
}

// Versión chica (240px) para miniaturas en listas/avatares — mismo archivo,
// pero sin bajar la foto a tamaño completo solo para verse en 56-180px.
export function thumbURL(rutaRelativa) {
  if (!rutaRelativa) return null
  if (esURLCompleta(rutaRelativa)) return rutaRelativa
  return `${API_URL}/thumb/${rutaRelativa}`
}

export default client
