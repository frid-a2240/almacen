from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class MovimientoFoto(Base):
    """Fotos adicionales de la herramienta en un movimiento de Control de
    Resguardo — además de las 2 fijas (foto_producto_snapshot/foto_numero_serie),
    aquí se pueden agregar las que hagan falta (p.ej. varios ángulos, daños
    puntuales), igual que las fotos libres de Baja de Herramienta."""
    __tablename__ = "movimiento_fotos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(20), ForeignKey("movimientos_resguardo.row_id", ondelete="CASCADE"), nullable=False)
    orden = Column(Integer, nullable=False, default=0)
    foto = Column(String(500), nullable=True)

    movimiento = relationship("MovimientoResguardo", back_populates="fotos")

    def __repr__(self):
        return f"<MovimientoFoto {self.id} row_id={self.row_id}>"
