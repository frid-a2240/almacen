from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Producto, MovimientoResguardo, BajaHerramientaItem


def stock_subquery(db: Session):
    """Query base de PRODUCTOS con el STOCK calculado a partir de la bitácora
    de movimientos y las bajas de herramienta: INVENTARIO INICIAL -
    SUM(SALIDA) + SUM(ENTRADA) - COUNT(bajas). No se guarda en la tabla
    productos para que nunca se desincronice del ledger real.

    Subqueries correlacionadas (no JOIN) a propósito: movimientos y bajas son
    dos relaciones "uno a muchos" independientes contra productos — juntarlas
    en un solo JOIN + GROUP BY multiplicaría cada renglón de una contra cada
    renglón de la otra (producto cartesiano) e inflaría las sumas."""
    salida_sq = (
        db.query(func.coalesce(func.sum(MovimientoResguardo.cantidad), 0))
        .filter(
            MovimientoResguardo.producto_sku == Producto.codigo_sai_sku,
            MovimientoResguardo.tipo_movimiento == "SALIDA",
        )
        .correlate(Producto)
        .scalar_subquery()
    )
    entrada_sq = (
        db.query(func.coalesce(func.sum(MovimientoResguardo.cantidad), 0))
        .filter(
            MovimientoResguardo.producto_sku == Producto.codigo_sai_sku,
            MovimientoResguardo.tipo_movimiento == "ENTRADA",
        )
        .correlate(Producto)
        .scalar_subquery()
    )
    baja_sq = (
        db.query(func.coalesce(func.count(BajaHerramientaItem.id), 0))
        .filter(BajaHerramientaItem.producto_sku == Producto.codigo_sai_sku)
        .correlate(Producto)
        .scalar_subquery()
    )
    stock_expr = (Producto.inventario_inicial - salida_sq + entrada_sq - baja_sq).label("stock")

    return db.query(Producto, stock_expr)


def stock_de(db: Session, codigo_sai_sku: str) -> Decimal:
    row = stock_subquery(db).filter(Producto.codigo_sai_sku == codigo_sai_sku).first()
    if not row:
        return Decimal(0)
    return row[1]
