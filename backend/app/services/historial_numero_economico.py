from datetime import datetime
from sqlalchemy.orm import Session

from app.models import HistorialNumeroEconomico


def registrar_cambio(db: Session, *, entidad_tipo: str, entidad_id: str, anterior: str | None, nuevo: str | None, usuario_nombre: str | None) -> None:
    """Guarda un renglón de bitácora si el número económico realmente cambió
    (anterior y nuevo distintos) — no registra nada si se "edita" al mismo
    valor que ya tenía."""
    anterior = anterior or None
    nuevo = nuevo or None
    if anterior == nuevo:
        return
    db.add(HistorialNumeroEconomico(
        entidad_tipo=entidad_tipo,
        entidad_id=entidad_id,
        valor_anterior=anterior,
        valor_nuevo=nuevo,
        usuario_nombre=usuario_nombre,
        fecha=datetime.now(),
    ))


def historial_de(db: Session, *, entidad_tipo: str, entidad_id: str) -> list[HistorialNumeroEconomico]:
    return (
        db.query(HistorialNumeroEconomico)
        .filter(
            HistorialNumeroEconomico.entidad_tipo == entidad_tipo,
            HistorialNumeroEconomico.entidad_id == entidad_id,
        )
        .order_by(HistorialNumeroEconomico.fecha.desc())
        .all()
    )
