import dayjs from 'dayjs'

export function formatoMoneda(valor) {
  if (valor === null || valor === undefined || valor === '') return ''
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor)
}

export function formatoFecha(valor) {
  if (!valor) return ''
  return dayjs(valor).format('DD/MM/YYYY')
}

export function formatoFechaLarga(valor) {
  if (!valor) return ''
  return dayjs(valor).format('D/M/YYYY')
}
