from decimal import Decimal

from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models import Producto, MovimientoResguardo


def stock_subquery(db: Session):
    """Query base de PRODUCTOS con el STOCK calculado a partir de la bitácora de
    movimientos: INVENTARIO INICIAL - SUM(SALIDA) + SUM(ENTRADA). No se guarda en la
    tabla productos para que nunca se desincronice del ledger real."""
    salida = func.coalesce(
        func.sum(case((MovimientoResguardo.tipo_movimiento == "SALIDA", MovimientoResguardo.cantidad), else_=0)),
        0,
    )
    entrada = func.coalesce(
        func.sum(case((MovimientoResguardo.tipo_movimiento == "ENTRADA", MovimientoResguardo.cantidad), else_=0)),
        0,
    )
    stock_expr = (Producto.inventario_inicial - salida + entrada).label("stock")

    return (
        db.query(Producto, stock_expr)
        .outerjoin(MovimientoResguardo, MovimientoResguardo.producto_sku == Producto.codigo_sai_sku)
        .group_by(Producto.codigo_sai_sku)
    )


def stock_de(db: Session, codigo_sai_sku: str) -> Decimal:
    row = stock_subquery(db).filter(Producto.codigo_sai_sku == codigo_sai_sku).first()
    if not row:
        return Decimal(0)
    return row[1]
