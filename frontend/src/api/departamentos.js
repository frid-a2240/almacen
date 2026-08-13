import client from './client.js'

export const listarDepartamentos = () => client.get('/departamentos/').then((r) => r.data)
export const empleadosDeDepartamento = (id) => client.get(`/departamentos/${id}/empleados`).then((r) => r.data)
export const movimientosDeDepartamento = (id) => client.get(`/departamentos/${id}/movimientos`).then((r) => r.data)
export const obtenerDepartamento = (id) => client.get(`/departamentos/${id}`).then((r) => r.data)
export const crearDepartamento = (datos) => client.post('/departamentos/', datos).then((r) => r.data)
export const actualizarDepartamento = (id, datos) => client.put(`/departamentos/${id}`, datos).then((r) => r.data)
export const eliminarDepartamento = (id) => client.delete(`/departamentos/${id}`)
export const subirFotoDepartamento = (id, archivo) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return client.post(`/departamentos/${id}/foto`, form).then((r) => r.data)
}
