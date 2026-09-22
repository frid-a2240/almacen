from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

# Folio consecutivo del vale electrónico — independiente del histórico de
# "numero_de_vale" (que trae folios de los vales de papel, capturados a mano,
# sin relación con esta numeración nueva). Arranca en 1 mientras se prueba;
# cuando quede listo para producción se reinicia con
# "ALTER SEQUENCE folio_vale_seq RESTART WITH 1001".
_SECUENCIA = "folio_vale_seq"
# Folio de la Constancia de No Adeudo — numeración propia, independiente de
# la del vale (son documentos distintos).
_SECUENCIA_NO_ADEUDO = "folio_no_adeudo_seq"


def asegurar_secuencia(engine):
    with engine.begin() as conn:
        conn.execute(text(f"CREATE SEQUENCE IF NOT EXISTS {_SECUENCIA} START WITH 1"))
        conn.execute(text(f"CREATE SEQUENCE IF NOT EXISTS {_SECUENCIA_NO_ADEUDO} START WITH 1"))


def siguiente_folio(db: Session) -> str:
    return str(db.execute(text(f"SELECT nextval('{_SECUENCIA}')")).scalar())


def siguiente_folio_no_adeudo(db: Session) -> str:
    return str(db.execute(text(f"SELECT nextval('{_SECUENCIA_NO_ADEUDO}')")).scalar())


def siguiente_folio_incidencia(db: Session, fecha: date) -> str:
    """Folio IH-MMDDAA-NNN del reporte de incidencia — a diferencia del vale
    (secuencia global de Postgres), el consecutivo aquí reinicia en 001 cada
    día (va embebido en el propio folio), así que basta con buscar el mayor
    ya usado ese día. Es solo una sugerencia precargada: el campo se manda
    editable, así que no hace falta una secuencia de base de datos."""
    from app.models import IncidenciaHerramienta

    prefijo = f"IH-{fecha.strftime('%m%d%y')}-"
    ultimo = (
        db.query(IncidenciaHerramienta.folio)
        .filter(IncidenciaHerramienta.folio.like(f"{prefijo}%"))
        .order_by(IncidenciaHerramienta.folio.desc())
        .first()
    )
    siguiente = 1
    if ultimo:
        try:
            siguiente = int(ultimo[0].rsplit("-", 1)[-1]) + 1
        except ValueError:
            pass
    return f"{prefijo}{siguiente:03d}"
