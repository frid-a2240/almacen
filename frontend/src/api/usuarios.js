import client from './client.js'

export const listarUsuarios = () => client.get('/usuarios/').then((r) => r.data)
export const crearUsuario = (datos) => client.post('/usuarios/', datos).then((r) => r.data)
export const actualizarUsuario = (id, datos) => client.put(`/usuarios/${id}`, datos).then((r) => r.data)
export const eliminarUsuario = (id) => client.delete(`/usuarios/${id}`)
