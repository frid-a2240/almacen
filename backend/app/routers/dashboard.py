from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Producto, Empleado, MovimientoResguardo, BajaHerramientaItem
from app.schemas.dashboard import DashboardResumen, MovimientoMes
from app.deps_auth import usuario_actual

router = APIRouter(prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(usuario_actual)])


@router.get("/resumen", response_model=DashboardResumen)
def resumen(db: Session = Depends(get_db)):
    hoy = date.today()
    m = MovimientoResguardo

    productos_alta_mes = (
        db.query(func.count(Producto.codigo_sai_sku))
        .filter(
            func.extract("year", Producto.fecha_de_alta) == hoy.year,
            func.extract("month", Producto.fecha_de_alta) == hoy.month,
        )
        .scalar()
    )
    productos_total = db.query(func.count(Producto.codigo_sai_sku)).scalar()

    # Mismo criterio que stock.py (inventario inicial - salidas + entradas -
    # bajas), pero sumado de una vez para todos los productos en vez de por
    # renglón.
    total_inicial = db.query(func.coalesce(func.sum(Producto.inventario_inicial), 0)).scalar()
    total_salida = db.query(func.coalesce(func.sum(case((m.tipo_movimiento == "SALIDA", m.cantidad), else_=0)), 0)).scalar()
    total_entrada = db.query(func.coalesce(func.sum(case((m.tipo_movimiento == "ENTRADA", m.cantidad), else_=0)), 0)).scalar()
    total_baja = db.query(func.coalesce(func.count(BajaHerramientaItem.id), 0)).scalar()
    stock_total = float(total_inicial) - float(total_salida) + float(total_entrada) - float(total_baja)

    empleados_total = db.query(func.count(Empleado.id_numero_empleado)).scalar()
    empleados_activos = (
        db.query(func.count(Empleado.id_numero_empleado))
        .filter(Empleado.status_empleado == "ACTIVO")
        .scalar()
    )

    # Últimos 6 meses con movimiento (SALIDA/ENTRADA), agrupados por mes.
    mes_expr = func.to_char(m.fecha_movimiento, "YYYY-MM")
    filas = (
        db.query(
            mes_expr.label("mes"),
            func.sum(case((m.tipo_movimiento == "SALIDA", 1), else_=0)).label("salidas"),
            func.sum(case((m.tipo_movimiento == "ENTRADA", 1), else_=0)).label("entradas"),
        )
        .group_by(mes_expr)
        .order_by(mes_expr.desc())
        .limit(6)
        .all()
    )
    movimientos_por_mes = [
        MovimientoMes(mes=f.mes, salidas=int(f.salidas), entradas=int(f.entradas))
        for f in reversed(filas)
    ]

    return DashboardResumen(
        productos_alta_mes=productos_alta_mes or 0,
        productos_total=productos_total or 0,
        stock_total=stock_total,
        empleados_total=empleados_total or 0,
        empleados_activos=empleados_activos or 0,
        empleados_inactivos=(empleados_total or 0) - (empleados_activos or 0),
        movimientos_por_mes=movimientos_por_mes,
    )
