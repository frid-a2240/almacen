import client from './client.js'

export const listarIncidenciasHerramienta = () => client.get('/incidencias-herramienta/').then((r) => r.data)
export const obtenerIncidenciaHerramienta = (id) => client.get(`/incidencias-herramienta/${id}`).then((r) => r.data)
export const crearIncidenciaHerramienta = (datos) => client.post('/incidencias-herramienta/', datos).then((r) => r.data)
export const eliminarIncidenciaHerramienta = (id) => client.delete(`/incidencias-herramienta/${id}`)

export const obtenerSiguienteFolioIncidencia = (fecha) =>
  client.get('/incidencias-herramienta/siguiente-folio', { params: { fecha } }).then((r) => r.data.folio)

export const obtenerIncidenciaHerramientaPdf = (id) =>
  client.get(`/incidencias-herramienta/${id}/pdf`, { responseType: 'arraybuffer' }).then((r) => r.data)
