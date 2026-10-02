from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base


class HistorialNumeroEconomico(Base):
    """Bitácora de cambios al número económico — tanto el de un vale
    (movimientos_resguardo, por renglón/herramienta) como el del catálogo de
    productos. Un renglón por cada edición, para poder mostrar quién lo
    cambió, cuándo y el valor anterior/nuevo."""
    __tablename__ = "historial_numero_economico"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # 'movimiento' | 'producto'
    entidad_tipo = Column(String(20), nullable=False)
    # row_id del movimiento o codigo_sai_sku del producto, según entidad_tipo
    entidad_id = Column(String(60), nullable=False)
    valor_anterior = Column(String(50), nullable=True)
    valor_nuevo = Column(String(50), nullable=True)
    usuario_nombre = Column(String(200), nullable=True)
    fecha = Column(DateTime, nullable=False)

    def __repr__(self):
        return f"<HistorialNumeroEconomico {self.entidad_tipo}:{self.entidad_id} {self.valor_anterior!r}->{self.valor_nuevo!r}>"
