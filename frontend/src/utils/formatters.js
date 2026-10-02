import dayjs from 'dayjs'

export function formatoMoneda(valor) {
  if (valor === null || valor === undefined || valor === '') return ''
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor)
}

export function formatoFecha(valor) {
  if (!valor) return ''
  return dayjs(valor).format('DD/MM/YYYY')
}

export function formatoFechaHora(valor) {
  if (!valor) return ''
  return dayjs(valor).format('DD/MM/YYYY HH:mm')
}

export function formatoFechaLarga(valor) {
  if (!valor) return ''
  return dayjs(valor).format('D/M/YYYY')
}

/** "X años Y meses" desde `valor` hasta hoy — mismo criterio que el backend
 * (historico_excel.py) para que la antigüedad se vea igual en pantalla y en
 * el Excel descargado. */
export function antiguedadDesde(valor) {
  if (!valor) return ''
  const inicio = dayjs(valor)
  const hoy = dayjs()
  const meses = Math.max(hoy.diff(inicio, 'month'), 0)
  const anios = Math.floor(meses / 12)
  const mesesResto = meses % 12
  const partes = []
  if (anios) partes.push(`${anios} año${anios !== 1 ? 's' : ''}`)
  if (mesesResto || !partes.length) partes.push(`${mesesResto} mes${mesesResto !== 1 ? 'es' : ''}`)
  return partes.join(' ')
}
