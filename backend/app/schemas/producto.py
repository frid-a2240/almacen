from datetime import date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from typing import Optional


class ProductoBase(BaseModel):
    descripcion: str
    tool_id: Optional[str] = None
    udm: Optional[str] = None
    almacen: Optional[str] = None
    clase_familia_id: Optional[int] = None
    numero_economico: Optional[str] = None
    inventario_inicial: Decimal = Decimal(0)
    costo_unitario: Optional[Decimal] = None
    ubicacion: Optional[str] = None
    minimo: Optional[Decimal] = None
    maximo: Optional[Decimal] = None
    fecha_de_alta: Optional[date] = None


class ProductoCreate(ProductoBase):
    codigo_sai_sku: str


class ProductoUpdate(BaseModel):
    descripcion: Optional[str] = None
    tool_id: Optional[str] = None
    udm: Optional[str] = None
    almacen: Optional[str] = None
    clase_familia_id: Optional[int] = None
    numero_economico: Optional[str] = None
    inventario_inicial: Optional[Decimal] = None
    costo_unitario: Optional[Decimal] = None
    ubicacion: Optional[str] = None
    minimo: Optional[Decimal] = None
    maximo: Optional[Decimal] = None
    fecha_de_alta: Optional[date] = None


class ProductoOut(ProductoBase):
    model_config = ConfigDict(from_attributes=True)

    codigo_sai_sku: str
    appsheet_row_id: Optional[str] = None
    foto_producto: Optional[str] = None
    scan_document: Optional[str] = None
    clase_familia_nombre: Optional[str] = None
    stock: Decimal = Decimal(0)
