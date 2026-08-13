import { normalizar } from './search.js'

/**
 * Tipos de campo soportados por FilterPanel:
 *  - 'texto':  input de "contiene" (case/acento-insensible)
 *  - 'enum':   checklist de valores distintos presentes en los datos
 *  - 'fecha':  rango desde/hasta (comparación de strings ISO YYYY-MM-DD)
 *  - 'imagen': "con foto" / "sin foto"
 */

export function valoresDistintos(items, campo) {
  const set = new Set()
  for (const item of items) {
    const v = item[campo]
    if (v !== null && v !== undefined && v !== '') set.add(String(v))
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'es'))
}

function cumpleCampo(item, campo, filtro) {
  const valor = item[campo.key]
  switch (campo.tipo) {
    case 'enum':
      if (!filtro.valores || filtro.valores.size === 0) return true
      return filtro.valores.has(String(valor ?? ''))
    case 'fecha':
      if (!filtro.desde && !filtro.hasta) return true
      if (!valor) return false
      if (filtro.desde && valor < filtro.desde) return false
      if (filtro.hasta && valor > filtro.hasta) return false
      return true
    case 'imagen':
      if (!filtro.valor) return true
      return filtro.valor === 'con' ? !!valor : !valor
    default:
      if (!filtro.texto) return true
      return normalizar(valor).includes(normalizar(filtro.texto))
  }
}

/** true si `item` cumple TODOS los filtros activos en `filtros` (AND entre campos). */
export function cumpleFiltros(item, campos, filtros) {
  for (const campo of campos) {
    const filtro = filtros[campo.key]
    if (!filtro) continue
    if (!cumpleCampo(item, campo, filtro)) return false
  }
  return true
}

export function contarFiltrosActivos(campos, filtros) {
  let n = 0
  for (const campo of campos) {
    const f = filtros[campo.key]
    if (!f) continue
    if (campo.tipo === 'enum' && f.valores?.size) n++
    else if (campo.tipo === 'fecha' && (f.desde || f.hasta)) n++
    else if (campo.tipo === 'imagen' && f.valor) n++
    else if (campo.tipo === 'texto' && f.texto) n++
  }
  return n
}
