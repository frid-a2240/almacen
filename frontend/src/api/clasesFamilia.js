import client from './client.js'

export const listarClasesFamilia = () => client.get('/clases-familia/').then((r) => r.data)
export const productosDeClase = (id) => client.get(`/clases-familia/${id}/productos`).then((r) => r.data)
export const movimientosDeClase = (id) => client.get(`/clases-familia/${id}/movimientos`).then((r) => r.data)
export const crearClaseFamilia = (datos) => client.post('/clases-familia/', datos).then((r) => r.data)
export const actualizarClaseFamilia = (id, datos) => client.put(`/clases-familia/${id}`, datos).then((r) => r.data)
export const eliminarClaseFamilia = (id) => client.delete(`/clases-familia/${id}`)
