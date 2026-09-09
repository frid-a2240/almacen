from sqlalchemy import text
from sqlalchemy.orm import Session

# Folio consecutivo del vale electrónico — independiente del histórico de
# "numero_de_vale" (que trae folios de los vales de papel, capturados a mano,
# sin relación con esta numeración nueva). Arranca en 1 mientras se prueba;
# cuando quede listo para producción se reinicia con
# "ALTER SEQUENCE folio_vale_seq RESTART WITH 1001".
_SECUENCIA = "folio_vale_seq"


def asegurar_secuencia(engine):
    with engine.begin() as conn:
        conn.execute(text(f"CREATE SEQUENCE IF NOT EXISTS {_SECUENCIA} START WITH 1"))


def siguiente_folio(db: Session) -> str:
    return str(db.execute(text(f"SELECT nextval('{_SECUENCIA}')")).scalar())
