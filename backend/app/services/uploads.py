import re
from pathlib import Path

from fastapi import UploadFile, HTTPException
from app.config import settings

UPLOAD_ROOT = Path(settings.UPLOAD_DIR)


def _safe(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", value)[:100]


def guardar_archivo(archivo: UploadFile, tabla: str, row_key: str, columna: str) -> str:
    """Guarda un archivo subido bajo uploads/<TABLA>/<row_key>__<COLUMNA>.<ext>
    y regresa la ruta relativa (la misma convención que ya usan los datos migrados)."""
    if archivo.size and archivo.size > settings.max_upload_size_bytes:
        raise HTTPException(413, f"Archivo mayor a {settings.MAX_UPLOAD_SIZE_MB}MB")

    ext = Path(archivo.filename or "").suffix or ".bin"
    dest_dir = UPLOAD_ROOT / tabla
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_name = f"{_safe(row_key)}__{_safe(columna)}{ext}"
    dest_path = dest_dir / dest_name

    with open(dest_path, "wb") as f:
        f.write(archivo.file.read())

    # Ruta relativa a UPLOAD_DIR (lo que se guarda en BD y se resuelve como /uploads/<esto>)
    return f"{tabla}/{dest_name}"
