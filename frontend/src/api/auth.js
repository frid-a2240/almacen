import client from './client.js'

export const login = (numero_control, password) =>
  client.post('/auth/login', { numero_control, password }).then((r) => r.data)

export const obtenerUsuarioActual = () =>
  client.get('/auth/me').then((r) => r.data)
