from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings


engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency de FastAPI: entrega una sesión y la cierra al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def asegurar_columnas():
    """No hay Alembic — las tablas ya existían (vienen de AppSheet) y se
    editan a mano con ALTER TABLE idempotentes como este, corridos una vez
    al arrancar, tanto en local como en el servidor (con el próximo `git
    pull` + `iisreset` ahí se aplica solo, sin tocar la base a mano)."""
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE movimientos_resguardo "
            "ADD COLUMN IF NOT EXISTS nombre_usuario_entrega VARCHAR(200)"
        ))
        conn.execute(text(
            "ALTER TABLE usuarios "
            "ADD COLUMN IF NOT EXISTS solo_consulta BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        conn.execute(text(
            "ALTER TABLE movimientos_resguardo "
            "ADD COLUMN IF NOT EXISTS id_traspaso VARCHAR(20)"
        ))


def asegurar_tablas_nuevas():
    """A diferencia de las tablas de arriba (vienen de AppSheet, se editan con
    ALTER TABLE), bajas_herramienta y sus tablas hijas son nuevas del todo —
    create_all() de SQLAlchemy ya es idempotente (solo crea lo que falta), así
    que basta con pasarle exactamente esas tablas sin tocar las demás."""
    from app.models import (
        BajaHerramienta, BajaHerramientaItem, BajaHerramientaFoto,
        IncidenciaHerramienta, IncidenciaHerramientaItem,
    )
    Base.metadata.create_all(bind=engine, tables=[
        BajaHerramienta.__table__, BajaHerramientaItem.__table__, BajaHerramientaFoto.__table__,
        IncidenciaHerramienta.__table__, IncidenciaHerramientaItem.__table__,
    ])
