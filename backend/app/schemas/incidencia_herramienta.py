from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class IncidenciaItemIn(BaseModel):
    producto_sku: Optional[str] = None
    numero_vale: Optional[str] = None
    cantidad: Optional[Decimal] = None
    numero_economico: Optional[str] = None
    estado_previo: Optional[str] = None
    valor_aprox: Optional[Decimal] = None


class IncidenciaItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    producto_sku: Optional[str] = None
    descripcion: Optional[str] = None
    foto_producto: Optional[str] = None
    numero_vale: Optional[str] = None
    cantidad: Optional[Decimal] = None
    numero_economico: Optional[str] = None
    estado_previo: Optional[str] = None
    valor_aprox: Optional[Decimal] = None


class IncidenciaCreate(BaseModel):
    # Precargado (consecutivo del día, ver services/folio.py) pero editable —
    # no se fuerza a mano como en la baja de herramienta.
    folio: str
    fecha_reporte: date
    hora_reporte: Optional[str] = None
    lugar_fecha_suceso: Optional[str] = None
    id_numero_empleado: str
    tipos_incidente: Optional[str] = None
    descripcion_evento: Optional[str] = None
    items: list[IncidenciaItemIn]


class IncidenciaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    folio: str
    fecha_reporte: date
    hora_reporte: Optional[str] = None
    lugar_fecha_suceso: Optional[str] = None
    empleado_id: Optional[str] = None
    empleado_nombre: Optional[str] = None
    empleado_puesto: Optional[str] = None
    empleado_supervisor: Optional[str] = None
    empleado_departamento: Optional[str] = None
    tipos_incidente: Optional[str] = None
    descripcion_evento: Optional[str] = None
    items: list[IncidenciaItemOut] = []
