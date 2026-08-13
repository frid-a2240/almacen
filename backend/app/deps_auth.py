from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario
from app.services.auth import decodificar_token

security = HTTPBearer(auto_error=False)


def usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Usuario:
    if not credenciales:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No autenticado")
    usuario_id = decodificar_token(credenciales.credentials)
    if usuario_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o expirado")
    usuario = db.get(Usuario, usuario_id)
    if not usuario or not usuario.activo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no encontrado o inactivo")
    return usuario


def usuario_admin(usuario: Usuario = Depends(usuario_actual)) -> Usuario:
    if not usuario.es_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Se requieren permisos de administrador")
    return usuario
