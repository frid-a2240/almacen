from datetime import date

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
            "sku": mov.producto_sku or mov.codigo_sai_sku,
            "descripcion": mov.descripcion,
            "udm": mov.udm,
            "numero_economico": mov.numero_economico,
            "cantidad": saldos[mov.producto_sku or mov.codigo_sai_sku],
            "observaciones": mov.observaciones,
            "costo_unitario": mov.costo_unitario,
        }
        for mov in ultimas_salidas
    ]
    filas.sort(key=lambda f: f["fecha"] or date.min, reverse=True)
    return filas
