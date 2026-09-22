from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict


class BajaItemIn(BaseModel):
    codigo_sai_sku: str
    numero_economico: Optional[str] = None
    diagnostico: Optional[str] = None


class BajaItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo_sai_sku: Optional[str] = None
    descripcion: Optional[str] = None
    numero_economico: Optional[str] = None
    diagnostico: Optional[str] = None


class BajaFotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    foto: Optional[str] = None
    descripcion: Optional[str] = None
    numeros_economicos: Optional[str] = None


class BajaCreate(BaseModel):
    # A diferencia del folio del vale, este se captura a mano (ver
    # BajaHerramienta en el modelo) — no se genera solo.
    folio: str
    fecha: date
    id_numero_empleado_tecnico: str
    id_numero_empleado_almacenista: str
    observaciones: Optional[str] = None
    items: list[BajaItemIn]


class BajaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    folio: str
    fecha: date
    tecnico_empleado_id: Optional[str] = None
    tecnico_nombre: Optional[str] = None
    tecnico_puesto: Optional[str] = None
    almacenista_empleado_id: Optional[str] = None
    almacenista_nombre: Optional[str] = None
    almacenista_puesto: Optional[str] = None
    observaciones: Optional[str] = None
    items: list[BajaItemOut] = []
    fotos: list[BajaFotoOut] = []
