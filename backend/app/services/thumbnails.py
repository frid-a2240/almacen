from pathlib import Path

from PIL import Image, UnidentifiedImageError

from app.config import settings

# 240px alcanza de sobra los usos reales (56-80px en listas, 180px en el
# detalle) sin acercarse al peso de la foto original.
MAX_DIM = 240


def _thumb_dir() -> Path:
    base = Path(settings.UPLOAD_DIR)
    return base.parent / f"{base.name}_thumbs"


def ruta_miniatura(ruta_relativa: str) -> Path | None:
    """Ruta en disco de la miniatura de `ruta_relativa`, generándola y
    cacheándola la primera vez. None si el original no existe o Pillow no
    puede abrirlo como imagen (p.ej. un PDF de scan_document) — en ese caso
    quien llama debe servir el archivo original tal cual."""
    original = Path(settings.UPLOAD_DIR) / ruta_relativa
    if not original.is_file():
        return None

    destino = _thumb_dir() / ruta_relativa
    if destino.exists() and destino.stat().st_mtime >= original.stat().st_mtime:
        return destino

    try:
        with Image.open(original) as img:
            img.thumbnail((MAX_DIM, MAX_DIM))
            destino.parent.mkdir(parents=True, exist_ok=True)
            img.save(destino, format=img.format)
    except (UnidentifiedImageError, OSError):
        return None

    return destino
