from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario
from app.schemas.usuario import LoginRequest, LoginResponse, UsuarioOut
from app.services.auth import verificar_password, crear_token
from app.deps_auth import usuario_actual

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.numero_control == datos.numero_control).first()
    if not usuario or not usuario.activo or not verificar_password(datos.password, usuario.password_hash):
        raise HTTPException(401, "Número de control o contraseña incorrectos")
    token = crear_token(usuario.id)
    return LoginResponse(token=token, usuario=usuario)


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(usuario_actual)):
    return usuario
