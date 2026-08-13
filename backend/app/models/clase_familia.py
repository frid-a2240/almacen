from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class ClaseFamilia(Base):
    __tablename__ = "clases_familia"

    id = Column(Integer, primary_key=True)
    id_clase_fam = Column(String(20), unique=True, nullable=True)
    clase_familia = Column(String(150), unique=True, nullable=False)

    productos = relationship("Producto", back_populates="clase_familia_ref")

    def __repr__(self):
        return f"<ClaseFamilia {self.clase_familia}>"
