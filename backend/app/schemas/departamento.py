from pydantic import BaseModel, ConfigDict
from typing import Optional


class DepartamentoBase(BaseModel):
    departamento: str
    foto_depto: Optional[str] = None
    encargado_departamento: Optional[str] = None


class DepartamentoCreate(DepartamentoBase):
    pass


class DepartamentoUpdate(BaseModel):
    departamento: Optional[str] = None
    foto_depto: Optional[str] = None
    encargado_departamento: Optional[str] = None


class DepartamentoOut(DepartamentoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    appsheet_id: Optional[str] = None
    num_empleados: int = 0
