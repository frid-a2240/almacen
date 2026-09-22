from pydantic import BaseModel


class MovimientoMes(BaseModel):
    mes: str  # "YYYY-MM"
    salidas: int
    entradas: int


class DashboardResumen(BaseModel):
    productos_alta_mes: int
    productos_total: int
    stock_total: float
    empleados_total: int
    empleados_activos: int
    empleados_inactivos: int
    movimientos_por_mes: list[MovimientoMes]
