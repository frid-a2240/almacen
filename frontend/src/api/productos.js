import client from './client.js'

export const listarProductos = () => client.get('/productos/').then((r) => r.data)
export const movimientosDeProducto = (sku) => client.get(`/productos/${sku}/movimientos`).then((r) => r.data)
export const listarStockInventory = () => client.get('/productos/stock-inventory').then((r) => r.data)
export const obtenerProducto = (sku) => client.get(`/productos/${sku}`).then((r) => r.data)
export const crearProducto = (datos) => client.post('/productos/', datos).then((r) => r.data)
export const actualizarProducto = (sku, datos) => client.put(`/productos/${sku}`, datos).then((r) => r.data)
export const eliminarProducto = (sku) => client.delete(`/productos/${sku}`)
export const subirFotoProducto = (sku, archivo) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return client.post(`/productos/${sku}/foto`, form).then((r) => r.data)
}
export const subirScanProducto = (sku, archivo) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return client.post(`/productos/${sku}/scan`, form).then((r) => r.data)
}
