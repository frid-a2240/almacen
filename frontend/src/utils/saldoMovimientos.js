/**
 * Saldo (SALIDA - ENTRADA) por empleado+producto a partir de una lista de
 * movimientos ya cargada en el navegador — mismo criterio que
 * resguardo_actual_de en el backend, pero del lado del cliente para no pedir
 * un endpoint aparte solo para saber si una fila ya quedó en 0.
 *
 * Se usa tanto para decidir qué ícono mostrar en Control de Resguardo
 * (Traspasar vs Editar) como para marcar, en las tablas de "Related CONTROL
 * DE RESGUARDOs", una fila de SALIDA que ya se devolvió o se traspasó — para
 * que no se confunda con que "todavía la tiene" ese empleado.
 */
export function calcularSaldosMovimientos(movimientos) {
  const mapa = new Map() // empleado_id -> Map(sku -> { saldo, traspaso })
  for (const m of movimientos) {
    const sku = m.producto_sku || m.codigo_sai_sku
    if (!m.empleado_id || !sku) continue
    const signo = m.tipo_movimiento === 'SALIDA' ? 1 : m.tipo_movimiento === 'ENTRADA' ? -1 : 0
    if (!signo) continue
    if (!mapa.has(m.empleado_id)) mapa.set(m.empleado_id, new Map())
    const porSku = mapa.get(m.empleado_id)
    const actual = porSku.get(sku) || { saldo: 0, traspaso: false }
    actual.saldo += signo * Number(m.cantidad)
    if (m.tipo_movimiento === 'ENTRADA' && m.id_traspaso) actual.traspaso = true
    porSku.set(sku, actual)
  }
  return mapa
}

export function saldoDeMovimiento(mapaSaldos, empleadoId, sku) {
  return mapaSaldos.get(empleadoId)?.get(sku)?.saldo || 0
}

export function herramientasActivasDeMovimiento(mapaSaldos, empleadoId) {
  const porSku = mapaSaldos.get(empleadoId)
  if (!porSku) return 0
  let n = 0
  for (const info of porSku.values()) if (info.saldo > 0) n++
  return n
}

/** Para una fila de SALIDA ya con saldo en 0: "Traspasada" si se cerró con un
 * traspaso, "Devuelta" si se cerró con una entrada normal. null si todavía
 * está vigente (o la fila no es una SALIDA). */
export function estadoSalida(mapaSaldos, m) {
  if (m.tipo_movimiento !== 'SALIDA') return null
  const sku = m.producto_sku || m.codigo_sai_sku
  if (!m.empleado_id || !sku) return null
  const info = mapaSaldos.get(m.empleado_id)?.get(sku)
  if (!info || info.saldo > 0) return null
  return info.traspaso ? 'Traspasada' : 'Devuelta'
}
