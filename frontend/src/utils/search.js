export function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * true si `query` aparece como substring (sin distinguir mayúsculas/acentos)
 * en alguno de los `campos` del objeto `item`.
 */
export function coincideBusqueda(item, campos, query) {
  const q = normalizar(query).trim()
  if (!q) return true
  return campos.some((campo) => normalizar(item[campo]).includes(q))
}
