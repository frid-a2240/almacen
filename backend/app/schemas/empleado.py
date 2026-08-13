from datetime import date
from pydantic import BaseModel, ConfigDict
from typing import Optional


class EmpleadoBase(BaseModel):
    nombre_de_empleado: str
    puesto_posicion: Optional[str] = None
    departamento_id: Optional[int] = None
    jefe_inmediato: Optional[str] = None
    status_empleado: Optional[str] = None
    fecha_de_ingreso: Optional[date] = None
    correo_electronico: Optional[str] = None
    telefono: Optional[str] = None


class EmpleadoCreate(EmpleadoBase):
    id_numero_empleado: str


class EmpleadoUpdate(BaseModel):
    nombre_de_empleado: Optional[str] = None
    puesto_posicion: Optional[str] = None
    departamento_id: Optional[int] = None
    jefe_inmediato: Optional[str] = None
    status_empleado: Optional[str] = None
    fecha_de_ingreso: Optional[date] = None
    correo_electronico: Optional[str] = None
    telefono: Optional[str] = None


class EmpleadoOut(EmpleadoBase):
    model_config = ConfigDict(from_attributes=True)

    id_numero_empleado: str
    appsheet_row_id: Optional[str] = None
    foto_empleado: Optional[str] = None
    departamento_nombre: Optional[str] = None
