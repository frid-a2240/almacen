from sqlalchemy import Column, String, Numeric, Date, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class MovimientoResguardo(Base):
    __tablename__ = "movimientos_resguardo"

    row_id = Column(String(20), primary_key=True)
    fecha_movimiento = Column(Date, nullable=False)
    numero_de_vale = Column(String(30), nullable=True)
    foto_vale_de_salida = Column(String(500), nullable=True)
    tipo_movimiento = Column(String(10), nullable=False)  # 'SALIDA' | 'ENTRADA'

    id_numero_empleado = Column(String(30), nullable=True)
    empleado_id = Column(String(30), ForeignKey("empleados.id_numero_empleado"), nullable=True)
    nombre_de_empleado_snapshot = Column("nombre_de_empleado", String(200), nullable=True)
    puesto_posicion = Column(String(150), nullable=True)
    departamento = Column(String(150), nullable=True)
    jefe_inmediato = Column(String(200), nullable=True)
    status = Column(String(20), nullable=True)

    codigo_sai_sku = Column(String(60), nullable=True)
    producto_sku = Column(String(60), ForeignKey("productos.codigo_sai_sku"), nullable=True)
    descripcion_snapshot = Column("descripcion", String, nullable=True)
    udm = Column(String(20), nullable=True)
    numero_economico = Column(String(50), nullable=True)
    clase_familia = Column(String(150), nullable=True)
    costo_unitario = Column(Numeric(12, 2), nullable=True)

    cantidad = Column(Numeric(12, 2), nullable=False)
    foto_producto_snapshot = Column(String(500), nullable=True)
    foto_numero_serie = Column(String(500), nullable=True)
    firma_recibido_conformidad = Column(String(500), nullable=True)
    observaciones = Column(Text, nullable=True)

    empleado_ref = relationship("Empleado")
    producto_ref = relationship("Producto")

    @property
    def descripcion(self):
        """AppSheet muestra la descripción en vivo del producto vinculado (vía
        Ref), no el texto guardado en el vale — algunos vales (p.ej. ajustes de
        inventario masivos) quedaron con el SKU capturado como "descripción"
        por error de captura en el origen. Se usa el snapshot solo si no hay
        producto resuelto."""
        if self.producto_ref and self.producto_ref.descripcion:
            return self.producto_ref.descripcion
        return self.descripcion_snapshot

    @property
    def nombre_de_empleado(self):
        """Mismo caso que `descripcion`: AppSheet resuelve el nombre en vivo
        contra el empleado vinculado en vez de confiar en el texto del vale."""
        if self.empleado_ref and self.empleado_ref.nombre_de_empleado:
            return self.empleado_ref.nombre_de_empleado
        return self.nombre_de_empleado_snapshot

    __table_args__ = (
        Index("ix_movimientos_producto_sku", "producto_sku"),
        Index("ix_movimientos_fecha", "fecha_movimiento"),
        Index("ix_movimientos_empleado_id", "empleado_id"),
    )

    def __repr__(self):
        return f"<MovimientoResguardo {self.row_id} {self.tipo_movimiento}>"
