from datetime import date
from decimal import Decimal

from sqlalchemy import func, case, desc
from sqlalchemy.orm import Session

from app.models import MovimientoResguardo


def resguardo_actual_de(db: Session, empleado_id: str):
    """Lo que un empleado tiene actualmente a su resguardo: por cada producto,
    SALIDA - ENTRADA (mismo criterio que el STOCK general, ver stock.py), solo
    los que tienen saldo positivo (lo demás ya se regresó). Fecha/vale/
    observaciones/costo se toman de la SALIDA más reciente de ese producto —
    son los datos del vale vigente, no un promedio de todo el historial."""
    m = MovimientoResguardo
    clave = func.coalesce(m.producto_sku, m.codigo_sai_sku)

    salida = func.coalesce(func.sum(case((m.tipo_movimiento == "SALIDA", m.cantidad), else_=0)), 0)
    entrada = func.coalesce(func.sum(case((m.tipo_movimiento == "ENTRADA", m.cantidad), else_=0)), 0)
    saldos = {
        fila.sku: fila.cantidad
        for fila in (
            db.query(clave.label("sku"), (salida - entrada).label("cantidad"))
            .filter(m.empleado_id == empleado_id)
            .group_by(clave)
            .having(salida - entrada > 0)
            .all()
        )
    }
    if not saldos:
        return []

    ultimas_salidas = (
        db.query(m)
        .filter(m.empleado_id == empleado_id, m.tipo_movimiento == "SALIDA", clave.in_(saldos.keys()))
        .order_by(clave, desc(m.fecha_movimiento), desc(m.row_id))
        .distinct(clave)
        .all()
    )

    filas = [
        {
            "fecha": mov.fecha_movimiento,
            "numero_de_vale": mov.numero_de_vale,
            "tipo_movimiento": mov.tipo_movimiento,
            "sku": mov.producto_sku or mov.codigo_sai_sku,
            "descripcion": mov.descripcion,
            "udm": mov.udm,
            "numero_economico": mov.numero_economico,
            "clase_familia": mov.clase_familia,
            "cantidad": saldos[mov.producto_sku or mov.codigo_sai_sku],
            "observaciones": mov.observaciones,
            "costo_unitario": mov.costo_unitario,
            "foto_producto": mov.producto_ref.foto_producto if mov.producto_ref else mov.foto_producto_snapshot,
        }
        for mov in ultimas_salidas
    ]
    filas.sort(key=lambda f: f["fecha"] or date.min, reverse=True)
    return filas


def historial_herramientas_de(db: Session, empleado_id: str):
    """Herramientas que alguna vez se le asignaron a un empleado (una por
    SKU, la última SALIDA de cada una) — a diferencia de resguardo_actual_de,
    aquí no importa el saldo actual: es para la Constancia de No Adeudo, que
    solo se emite cuando el saldo de TODAS ya es 0 (ver no-adeudo-pdf), así
    que esta lista sirve como comprobante de lo que tuvo y ya devolvió."""
    m = MovimientoResguardo
    clave = func.coalesce(m.producto_sku, m.codigo_sai_sku)
    ultimas_salidas = (
        db.query(m)
        .filter(m.empleado_id == empleado_id, m.tipo_movimiento == "SALIDA")
        .order_by(clave, desc(m.fecha_movimiento), desc(m.row_id))
        .distinct(clave)
        .all()
    )
    filas = [
        {
            "numero_de_vale": mov.numero_de_vale,
            "sku": mov.producto_sku or mov.codigo_sai_sku,
            "descripcion": mov.descripcion,
            "cantidad": mov.cantidad,
            "numero_economico": mov.numero_economico,
            "costo_unitario": mov.costo_unitario,
            "fecha": mov.fecha_movimiento,
        }
        for mov in ultimas_salidas
    ]
    filas.sort(key=lambda f: f["fecha"] or date.min, reverse=True)
    return filas


def saldo_actual(db: Session, empleado_id: str, sku: str) -> Decimal:
    """Cuánto de UN producto tiene actualmente un empleado a su resguardo
    (SALIDA - ENTRADA, mismo criterio que resguardo_actual_de) — usado para
    validar cuánto se puede traspasar sin dejarlo en negativo."""
    m = MovimientoResguardo
    clave = func.coalesce(m.producto_sku, m.codigo_sai_sku)
    salida = func.coalesce(func.sum(case((m.tipo_movimiento == "SALIDA", m.cantidad), else_=0)), 0)
    entrada = func.coalesce(func.sum(case((m.tipo_movimiento == "ENTRADA", m.cantidad), else_=0)), 0)
    resultado = (
        db.query(salida - entrada)
        .filter(m.empleado_id == empleado_id, clave == sku)
        .scalar()
    )
    return resultado or Decimal(0)


def saldos_por_sku(db: Session, empleado_id: str) -> dict:
    """Saldo (SALIDA - ENTRADA) de CADA producto que un empleado alguna vez
    tuvo, sin filtrar a los positivos (a diferencia de resguardo_actual_de) —
    para el registro histórico, donde sí interesa marcar cuáles ya regresó."""
    m = MovimientoResguardo
    clave = func.coalesce(m.producto_sku, m.codigo_sai_sku)
    salida = func.coalesce(func.sum(case((m.tipo_movimiento == "SALIDA", m.cantidad), else_=0)), 0)
    entrada = func.coalesce(func.sum(case((m.tipo_movimiento == "ENTRADA", m.cantidad), else_=0)), 0)
    return {
        fila.sku: fila.saldo
        for fila in (
            db.query(clave.label("sku"), (salida - entrada).label("saldo"))
            .filter(m.empleado_id == empleado_id)
            .group_by(clave)
            .all()
        )
    }


def saldos_por_empleado(db: Session, codigo_sai_sku: str) -> dict:
    """Mismo criterio que saldos_por_sku pero al revés: cuánto tiene CADA
    empleado que alguna vez tocó este producto, sin filtrar a los positivos."""
    m = MovimientoResguardo
    clave = func.coalesce(m.producto_sku, m.codigo_sai_sku)
    salida = func.coalesce(func.sum(case((m.tipo_movimiento == "SALIDA", m.cantidad), else_=0)), 0)
    entrada = func.coalesce(func.sum(case((m.tipo_movimiento == "ENTRADA", m.cantidad), else_=0)), 0)
    return {
        fila.empleado_id: fila.saldo
        for fila in (
            db.query(m.empleado_id, (salida - entrada).label("saldo"))
            .filter(clave == codigo_sai_sku, m.empleado_id.isnot(None))
            .group_by(m.empleado_id)
            .all()
        )
    }


def tenedores_actuales_de(db: Session, codigo_sai_sku: str):
    """Quién tiene actualmente asignada una herramienta: mismo criterio que
    resguardo_actual_de pero mirado al revés — se agrupa por empleado en vez
    de por producto, para un solo producto (puede haber varios empleados con
    saldo positivo si hay más de una unidad en stock)."""
    m = MovimientoResguardo
    clave = func.coalesce(m.producto_sku, m.codigo_sai_sku)

    salida = func.coalesce(func.sum(case((m.tipo_movimiento == "SALIDA", m.cantidad), else_=0)), 0)
    entrada = func.coalesce(func.sum(case((m.tipo_movimiento == "ENTRADA", m.cantidad), else_=0)), 0)
    saldos = {
        fila.empleado_id: fila.cantidad
        for fila in (
            db.query(m.empleado_id, (salida - entrada).label("cantidad"))
            .filter(clave == codigo_sai_sku, m.empleado_id.isnot(None))
            .group_by(m.empleado_id)
            .having(salida - entrada > 0)
            .all()
        )
    }
    if not saldos:
        return []

    ultimas_salidas = (
        db.query(m)
        .filter(m.empleado_id.in_(saldos.keys()), clave == codigo_sai_sku, m.tipo_movimiento == "SALIDA")
        .order_by(m.empleado_id, desc(m.fecha_movimiento), desc(m.row_id))
        .distinct(m.empleado_id)
        .all()
    )

    filas = [
        {
            "empleado_id": mov.empleado_id,
            "nombre_de_empleado": mov.nombre_de_empleado,
            "puesto_posicion": mov.puesto_posicion,
            "departamento": mov.departamento,
            "fecha": mov.fecha_movimiento,
            "numero_de_vale": mov.numero_de_vale,
            "cantidad": saldos[mov.empleado_id],
            "observaciones": mov.observaciones,
        }
        for mov in ultimas_salidas
    ]
    filas.sort(key=lambda f: f["fecha"] or date.min, reverse=True)
    return filas
