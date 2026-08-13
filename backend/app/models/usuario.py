from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True)
    numero_control = Column(String(30), unique=True, nullable=False)
    nombre = Column(String(200), nullable=False)
    password_hash = Column(String(255), nullable=False)
    es_admin = Column(Boolean, default=False, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Usuario {self.numero_control} {self.nombre}>"
