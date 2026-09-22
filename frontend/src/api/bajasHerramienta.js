import client from './client.js'

export const listarBajasHerramienta = () => client.get('/bajas-herramienta/').then((r) => r.data)
export const obtenerBajaHerramienta = (id) => client.get(`/bajas-herramienta/${id}`).then((r) => r.data)
export const crearBajaHerramienta = (datos) => client.post('/bajas-herramienta/', datos).then((r) => r.data)
export const eliminarBajaHerramienta = (id) => client.delete(`/bajas-herramienta/${id}`)

export const obtenerBajaHerramientaPdf = (id) =>
  client.get(`/bajas-herramienta/${id}/pdf`, { responseType: 'arraybuffer' }).then((r) => r.data)

export const agregarFotoBaja = (id, archivo, descripcion, numerosEconomicos) => {
  const form = new FormData()
  form.append('archivo', archivo)
  if (descripcion) form.append('descripcion', descripcion)
  if (numerosEconomicos) form.append('numeros_economicos', numerosEconomicos)
  return client.post(`/bajas-herramienta/${id}/fotos`, form).then((r) => r.data)
}

export const quitarFotoBaja = (id, fotoId) =>
  client.delete(`/bajas-herramienta/${id}/fotos/${fotoId}`).then((r) => r.data)
