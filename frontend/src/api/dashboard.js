import client from './client.js'

export const obtenerResumenDashboard = () => client.get('/dashboard/resumen').then((r) => r.data)
