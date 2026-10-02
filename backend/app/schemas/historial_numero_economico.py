from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class HistorialNumeroEconomicoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    valor_anterior: Optional[str] = None
    valor_nuevo: Optional[str] = None
    usuario_nombre: Optional[str] = None
    fecha: datetime
