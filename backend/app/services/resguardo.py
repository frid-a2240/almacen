from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models import MovimientoResguardo, Producto


def resguardo_actual_de(db: Session, empleado_id: str):
    """Lo que un empleado tiene actualmente a su resguardo: por cada producto,
    SALIDA - ENTRADA (mismo criterio que el STOCK general, ver stock.py) filtrado
    a un solo empleado. Solo se listan productos con saldo positivo (lo demás ya
    se regresó). La llave de agrupación usa COALESCE(producto_sku, codigo_sai_sku)
    para no perder de vista vales con SKU sin resolver a un producto real."""
    clave = func.coalesce(MovimientoResguardo.producto_sku, MovimientoResguardo.codigo_sai_sku)
    salida = func.coalesce(
        func.sum(case((MovimientoResguardo.tipo_movimiento == "SALIDA", MovimientoResguardo.cantidad), else_=0)),
        0,
    )
    entrada = func.coalesce(
        func.sum(case((MovimientoResguardo.tipo_movimiento == "ENTRADA", MovimientoResguardo.cantidad), else_=0)),
        0,
    )
    neto = salida - entrada

    return (
        db.query(
            clave.label("sku"),
            func.max(func.coalesce(Producto.descripcion, MovimientoResguardo.descripcion_snapshot)).label("descripcion"),
            func.max(func.coalesce(Producto.numero_economico, MovimientoResguardo.numero_economico)).label("numero_economico"),
            func.max(MovimientoResguardo.udm).label("udm"),
            neto.label("cantidad"),
            func.max(MovimientoResguardo.fecha_movimiento).label("ultimo_movimiento"),
            func.max(MovimientoResguardo.numero_de_vale).label("numero_de_vale"),
        )
        .outerjoin(Producto, Producto.codigo_sai_sku == MovimientoResguardo.producto_sku)
        .filter(MovimientoResguardo.empleado_id == empleado_id)
        .group_by(clave)
        .having(salida - entrada > 0)
        .order_by(func.max(MovimientoResguardo.fecha_movimiento).desc())
        .all()
    )
