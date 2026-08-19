import client from './client.js'

export const listarEmpleados = () => client.get('/empleados/').then((r) => r.data)
export const movimientosDeEmpleado = (id) => client.get(`/empleados/${id}/movimientos`).then((r) => r.data)
export const obtenerEmpleado = (id) => client.get(`/empleados/${id}`).then((r) => r.data)
export const crearEmpleado = (datos) => client.post('/empleados/', datos).then((r) => r.data)
export const actualizarEmpleado = (id, datos) => client.put(`/empleados/${id}`, datos).then((r) => r.data)
export const eliminarEmpleado = (id) => client.delete(`/empleados/${id}`)
export const subirFotoEmpleado = (id, archivo) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return client.post(`/empleados/${id}/foto`, form).then((r) => r.data)
}

export const descargarResguardoExcel = async (id) => {
  const respuesta = await client.get(`/empleados/${id}/resguardo-excel`, { responseType: 'blob' })
  const url = URL.createObjectURL(respuesta.data)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `inventario_${id}.xlsx`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
