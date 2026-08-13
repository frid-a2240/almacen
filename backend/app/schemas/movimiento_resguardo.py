from datetime import date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from typing import Optional


class MovimientoCreate(BaseModel):
    fecha_movimiento: date
    numero_de_vale: Optional[str] = None
    tipo_movimiento: str  # 'SALIDA' | 'ENTRADA'
    id_numero_empleado: str
    codigo_sai_sku: str
    cantidad: Decimal
    status: str = "ACTIVO"
    numero_economico: Optional[str] = None
    observaciones: Optional[str] = None


class MovimientoUpdate(BaseModel):
    fecha_movimiento: Optional[date] = None
    numero_de_vale: Optional[str] = None
    tipo_movimiento: Optional[str] = None
    cantidad: Optional[Decimal] = None
    status: Optional[str] = None
    observaciones: Optional[str] = None


class MovimientoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    row_id: str
    fecha_movimiento: date
    numero_de_vale: Optional[str] = None
    foto_vale_de_salida: Optional[str] = None
    tipo_movimiento: str
    id_numero_empleado: Optional[str] = None
    empleado_id: Optional[str] = None
    nombre_de_empleado: Optional[str] = None
    puesto_posicion: Optional[str] = None
    departamento: Optional[str] = None
    jefe_inmediato: Optional[str] = None
    status: Optional[str] = None
    codigo_sai_sku: Optional[str] = None
    producto_sku: Optional[str] = None
    descripcion: Optional[str] = None
    udm: Optional[str] = None
    numero_economico: Optional[str] = None
    clase_familia: Optional[str] = None
    costo_unitario: Optional[Decimal] = None
    cantidad: Decimal
    foto_producto_snapshot: Optional[str] = None
    foto_numero_serie: Optional[str] = None
    firma_recibido_conformidad: Optional[str] = None
    observaciones: Optional[str] = None
