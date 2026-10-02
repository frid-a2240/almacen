from datetime import date, datetime
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
    hora_entrega: Optional[str] = None
    observaciones: Optional[str] = None


class ItemVale(BaseModel):
    codigo_sai_sku: str
    cantidad: Decimal
    numero_economico: Optional[str] = None


class SalidaMultipleCreate(BaseModel):
    """Un solo vale (un solo folio) con varias herramientas — de 1 a 6."""
    fecha_movimiento: date
    id_numero_empleado: str
    status: str = "ACTIVO"
    hora_entrega: Optional[str] = None
    observaciones: Optional[str] = None
    items: list[ItemVale]


class MovimientoUpdate(BaseModel):
    fecha_movimiento: Optional[date] = None
    numero_de_vale: Optional[str] = None
    tipo_movimiento: Optional[str] = None
    cantidad: Optional[Decimal] = None
    status: Optional[str] = None
    observaciones: Optional[str] = None
    # Campos editables cuando el movimiento es un vale de SALIDA (ver PUT
    # /movimientos/{row_id}): al cambiar cualquiera de estos se regenera el
    # PDF del vale (mismo folio) con el dato actualizado.
    nombre_usuario_entrega: Optional[str] = None
    numero_economico: Optional[str] = None
    hora_entrega: Optional[str] = None


class TraspasoCreate(BaseModel):
    """Mueve UNA herramienta (row_id_origen) de quien la tiene actualmente a
    otro empleado: se genera un ENTRADA para quien la entrega (baja su saldo)
    y una SALIDA nueva —con folio nuevo— para quien la recibe (con su propio
    vale para imprimir)."""
    row_id_origen: str
    id_numero_empleado_destino: str
    cantidad: Optional[Decimal] = None  # en blanco: se traspasa el saldo completo de esa herramienta
    fecha_movimiento: date
    observaciones: Optional[str] = None


class MovimientoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    row_id: str
    fecha_movimiento: date
    creado_en: Optional[datetime] = None
    hora_entrega: Optional[str] = None
    numero_de_vale: Optional[str] = None
    foto_vale_de_salida: Optional[str] = None
    tipo_movimiento: str
    id_traspaso: Optional[str] = None
    id_numero_empleado: Optional[str] = None
    empleado_id: Optional[str] = None
    nombre_de_empleado: Optional[str] = None
    puesto_posicion: Optional[str] = None
    departamento: Optional[str] = None
    jefe_inmediato: Optional[str] = None
    nombre_usuario_entrega: Optional[str] = None
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
