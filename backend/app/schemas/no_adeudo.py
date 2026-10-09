from decimal import Decimal
from pydantic import BaseModel
from typing import Optional


class NoAdeudoItemIn(BaseModel):
    """Vida útil (%) que el pañol le asigna a cada herramienta pendiente al
    emitir la constancia — determina cuánto se descuenta del costo (ver
    services/no_adeudo_pdf.py): 0% = se cobra el costo completo, 100% = ya
    cumplió su vida útil, no se cobra nada."""
    row_id: str
    vida_util_pct: Decimal = Decimal(0)


class NoAdeudoGenerar(BaseModel):
    items: list[NoAdeudoItemIn] = []
    observaciones: Optional[str] = None
