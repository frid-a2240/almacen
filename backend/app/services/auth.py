from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hashear_password(password: str) -> str:
    return pwd_context.hash(password)


def verificar_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def crear_token(usuario_id: int) -> str:
    """Token de sesión de larga duración (JWT_EXPIRE_DAYS, por defecto ~10
    años) — el usuario debe cerrar sesión manualmente, no expira solo."""
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario_id),
        "iat": ahora,
        "exp": ahora + timedelta(days=settings.JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decodificar_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return int(payload["sub"])
    except jwt.PyJWTError:
        return None
