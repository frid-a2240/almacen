from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Producto(Base):
    __tablename__ = "productos"

    codigo_sai_sku = Column(String(60), primary_key=True)
    appsheet_row_id = Column(String(60), unique=True, nullable=True)
    tool_id = Column(String(60), nullable=True)
    descripcion = Column(String, nullable=False)
    udm = Column(String(20), nullable=True)
    almacen = Column(String(100), nullable=True)
    clase_familia_id = Column(Integer, ForeignKey("clases_familia.id"), nullable=True)
    numero_economico = Column(String(50), nullable=True)
    inventario_inicial = Column(Numeric(12, 2), nullable=False, default=0)
    costo_unitario = Column(Numeric(12, 2), nullable=True)
    foto_producto = Column(String(500), nullable=True)
    ubicacion = Column(String(100), nullable=True)
    minimo = Column(Numeric(12, 2), nullable=True)
    maximo = Column(Numeric(12, 2), nullable=True)
    fecha_de_alta = Column(Date, nullable=True)
    scan_document = Column(String(500), nullable=True)

    clase_familia_ref = relationship("ClaseFamilia", back_populates="productos")

    def __repr__(self):
        return f"<Producto {self.codigo_sai_sku}>"
