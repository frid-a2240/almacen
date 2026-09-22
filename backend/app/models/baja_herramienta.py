from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class BajaHerramienta(Base):
    """Baja de herramienta/equipo (SGC-FORM-PAÑ-PAÑ-002): a diferencia de un
    movimiento de Control de Resguardo, esto NO es un préstamo — la
    herramienta sale del inventario para siempre, así que no usa la tabla
    movimientos_resguardo (que es de custodia/resguardo). El stock baja vía
    services/stock.py, que descuenta 1 por cada renglón (BajaHerramientaItem)
    ligado al producto."""
    __tablename__ = "bajas_herramienta"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # A diferencia del folio del vale (consecutivo automático), este folio se
    # captura a mano — es el mismo consecutivo que ya se llevaba en el Excel.
    folio = Column(String(30), nullable=False)
    fecha = Column(Date, nullable=False)

    tecnico_empleado_id = Column(String(30), ForeignKey("empleados.id_numero_empleado"), nullable=True)
    tecnico_nombre_snapshot = Column(String(200), nullable=True)
    tecnico_puesto_snapshot = Column(String(150), nullable=True)

    almacenista_empleado_id = Column(String(30), ForeignKey("empleados.id_numero_empleado"), nullable=True)
    almacenista_nombre_snapshot = Column(String(200), nullable=True)
    almacenista_puesto_snapshot = Column(String(150), nullable=True)

    observaciones = Column(Text, nullable=True)

    tecnico_ref = relationship("Empleado", foreign_keys=[tecnico_empleado_id])
    almacenista_ref = relationship("Empleado", foreign_keys=[almacenista_empleado_id])
    items = relationship(
        "BajaHerramientaItem", order_by="BajaHerramientaItem.orden",
        cascade="all, delete-orphan", back_populates="baja",
    )
    fotos = relationship(
        "BajaHerramientaFoto", order_by="BajaHerramientaFoto.orden",
        cascade="all, delete-orphan", back_populates="baja",
    )

    @property
    def tecnico_nombre(self):
        if self.tecnico_ref and self.tecnico_ref.nombre_de_empleado:
            return self.tecnico_ref.nombre_de_empleado
        return self.tecnico_nombre_snapshot

    @property
    def tecnico_puesto(self):
        if self.tecnico_ref and self.tecnico_ref.puesto_posicion:
            return self.tecnico_ref.puesto_posicion
        return self.tecnico_puesto_snapshot

    @property
    def almacenista_nombre(self):
        if self.almacenista_ref and self.almacenista_ref.nombre_de_empleado:
            return self.almacenista_ref.nombre_de_empleado
        return self.almacenista_nombre_snapshot

    @property
    def almacenista_puesto(self):
        if self.almacenista_ref and self.almacenista_ref.puesto_posicion:
            return self.almacenista_ref.puesto_posicion
        return self.almacenista_puesto_snapshot

    def __repr__(self):
        return f"<BajaHerramienta {self.id} folio={self.folio}>"


class BajaHerramientaItem(Base):
    """Un renglón de la tabla de herramientas de la baja (SKU + # económico +
    diagnóstico) — cada renglón resta 1 al stock calculado del producto."""
    __tablename__ = "baja_herramienta_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    baja_id = Column(Integer, ForeignKey("bajas_herramienta.id", ondelete="CASCADE"), nullable=False)
    orden = Column(Integer, nullable=False, default=0)

    producto_sku = Column(String(60), ForeignKey("productos.codigo_sai_sku"), nullable=True)
    codigo_sai_sku = Column(String(60), nullable=True)
    descripcion_snapshot = Column(String, nullable=True)
    numero_economico = Column(String(50), nullable=True)
    diagnostico = Column(Text, nullable=True)

    baja = relationship("BajaHerramienta", back_populates="items")
    producto_ref = relationship("Producto")

    @property
    def descripcion(self):
        if self.producto_ref and self.producto_ref.descripcion:
            return self.producto_ref.descripcion
        return self.descripcion_snapshot


class BajaHerramientaFoto(Base):
    """Evidencia fotográfica de la baja (hoja 2 del formato) — número libre de
    fotos, no las 4 fijas del Excel original: cada una con su propia
    descripción y lista de números económicos que cubre (texto libre, igual
    que en el Excel real)."""
    __tablename__ = "baja_herramienta_fotos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    baja_id = Column(Integer, ForeignKey("bajas_herramienta.id", ondelete="CASCADE"), nullable=False)
    orden = Column(Integer, nullable=False, default=0)

    foto = Column(String(500), nullable=True)
    descripcion = Column(String(300), nullable=True)
    numeros_economicos = Column(String(300), nullable=True)

    baja = relationship("BajaHerramienta", back_populates="fotos")

    def __repr__(self):
        return f"<BajaHerramientaFoto {self.id} baja_id={self.baja_id}>"
