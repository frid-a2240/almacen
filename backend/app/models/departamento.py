from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class Departamento(Base):
    __tablename__ = "departamentos"

    id = Column(Integer, primary_key=True)
    appsheet_id = Column(String(20), unique=True, nullable=True)
    departamento = Column(String(150), unique=True, nullable=False)
    foto_depto = Column(String(500), nullable=True)
    encargado_departamento = Column(String(200), nullable=True)

    empleados = relationship("Empleado", back_populates="departamento_ref")

    def __repr__(self):
        return f"<Departamento {self.departamento}>"
