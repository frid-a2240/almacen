from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Empleado(Base):
    __tablename__ = "empleados"

    id_numero_empleado = Column(String(30), primary_key=True)
    appsheet_row_id = Column(String(30), unique=True, nullable=True)
    nombre_de_empleado = Column(String(200), nullable=False)
    puesto_posicion = Column(String(150), nullable=True)
    departamento_id = Column(Integer, ForeignKey("departamentos.id"), nullable=True)
    jefe_inmediato = Column(String(200), nullable=True)
    status_empleado = Column(String(30), nullable=True)
    foto_empleado = Column(String(500), nullable=True)
    fecha_de_ingreso = Column(Date, nullable=True)
    correo_electronico = Column(String(200), nullable=True)
    telefono = Column(String(50), nullable=True)

    departamento_ref = relationship("Departamento", back_populates="empleados")

    def __repr__(self):
        return f"<Empleado {self.id_numero_empleado} {self.nombre_de_empleado}>"
