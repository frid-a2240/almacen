import client from './client.js'

export const listarMovimientos = () => client.get('/movimientos/').then((r) => r.data)
export const listarReporteSalidas = () => client.get('/movimientos/reporte-salidas').then((r) => r.data)
export const crearMovimiento = (datos) => client.post('/movimientos/', datos).then((r) => r.data)
export const actualizarMovimiento = (rowId, datos) => client.put(`/movimientos/${rowId}`, datos).then((r) => r.data)
export const eliminarMovimiento = (rowId) => client.delete(`/movimientos/${rowId}`)

const subirArchivo = (rowId, endpoint, archivo) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return client.post(`/movimientos/${rowId}/${endpoint}`, form).then((r) => r.data)
}
export const subirFotoVale = (rowId, archivo) => subirArchivo(rowId, 'foto-vale', archivo)
export const subirFotoProductoMovimiento = (rowId, archivo) => subirArchivo(rowId, 'foto-producto', archivo)
export const subirFotoNumeroSerie = (rowId, archivo) => subirArchivo(rowId, 'foto-numero-serie', archivo)
export const subirFirma = (rowId, archivo) => subirArchivo(rowId, 'firma', archivo)
