from sqlalchemy import Column, Integer, String, Date, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class IncidenciaHerramienta(Base):
    """Reporte de incidencia de herramienta (SGC-FORM-PAÑ-PAÑ-001): a
    diferencia de la baja, aquí no se descuenta el stock — es un reporte de
    lo que le pasó a una o varias herramientas que un empleado ya tenía en
    resguardo (robo, extravío, daño, etc.), jalando sus datos del vale
    correspondiente (ver IncidenciaHerramientaItem)."""
    __tablename__ = "incidencias_herramienta"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # Folio con formato IH-MMDDAA-NNN — se sugiere solo (consecutivo del día,
    # ver services/folio.py) pero se captura como texto libre, editable.
    folio = Column(String(30), nullable=False)
    fecha_reporte = Column(Date, nullable=False)
    hora_reporte = Column(String(10), nullable=True)
    lugar_fecha_suceso = Column(String(200), nullable=True)

    empleado_id = Column(String(30), ForeignKey("empleados.id_numero_empleado"), nullable=True)
    empleado_nombre_snapshot = Column(String(200), nullable=True)
    empleado_puesto_snapshot = Column(String(150), nullable=True)
    empleado_supervisor_snapshot = Column(String(200), nullable=True)
    empleado_departamento_snapshot = Column(String(150), nullable=True)

    # Los 8 tipos de incidente del formato (ROBO, EXTRAVIO, NEGLIGENCIA,
    # APLASTAMIENTO, CONATO DE INCENDIO, CAIDA AL MAR, AUSENTISMO, ACCIDENTE)
    # se pueden marcar varios a la vez — se guardan como texto separado por
    # comas (mismo criterio simple que numeros_economicos en baja_herramienta).
    tipos_incidente = Column(String(300), nullable=True)
    descripcion_evento = Column(Text, nullable=True)

    empleado_ref = relationship("Empleado", foreign_keys=[empleado_id])
    items = relationship(
        "IncidenciaHerramientaItem", order_by="IncidenciaHerramientaItem.orden",
        cascade="all, delete-orphan", back_populates="incidencia",
    )

    @property
    def empleado_nombre(self):
        if self.empleado_ref and self.empleado_ref.nombre_de_empleado:
            return self.empleado_ref.nombre_de_empleado
        return self.empleado_nombre_snapshot

    @property
    def empleado_puesto(self):
        if self.empleado_ref and self.empleado_ref.puesto_posicion:
            return self.empleado_ref.puesto_posicion
        return self.empleado_puesto_snapshot

    @property
    def empleado_supervisor(self):
        if self.empleado_ref and self.empleado_ref.jefe_inmediato:
            return self.empleado_ref.jefe_inmediato
        return self.empleado_supervisor_snapshot

    @property
    def empleado_departamento(self):
        if self.empleado_ref and self.empleado_ref.departamento_ref:
            return self.empleado_ref.departamento_ref.departamento
        return self.empleado_departamento_snapshot

    def __repr__(self):
        return f"<IncidenciaHerramienta {self.id} folio={self.folio}>"


class IncidenciaHerramientaItem(Base):
    """Un renglón de la tabla de herramientas del reporte — se arma al elegir
    un vale del cardex del empleado (ver resguardo_actual_de), que aporta
    cantidad/# económico/# de vale; estado previo y valor aproximado se
    capturan a mano en el reporte."""
    __tablename__ = "incidencia_herramienta_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incidencia_id = Column(Integer, ForeignKey("incidencias_herramienta.id", ondelete="CASCADE"), nullable=False)
    orden = Column(Integer, nullable=False, default=0)

    producto_sku = Column(String(60), ForeignKey("productos.codigo_sai_sku"), nullable=True)
    descripcion_snapshot = Column(String, nullable=True)
    numero_vale = Column(String(30), nullable=True)
    cantidad = Column(Numeric(12, 2), nullable=True)
    numero_economico = Column(String(50), nullable=True)
    estado_previo = Column(String(100), nullable=True)
    valor_aprox = Column(Numeric(12, 2), nullable=True)

    incidencia = relationship("IncidenciaHerramienta", back_populates="items")
    producto_ref = relationship("Producto")

    @property
    def descripcion(self):
        if self.producto_ref and self.producto_ref.descripcion:
            return self.producto_ref.descripcion
        return self.descripcion_snapshot

    @property
    def foto_producto(self):
        return self.producto_ref.foto_producto if self.producto_ref else None
