from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario
from app.schemas.usuario import UsuarioOut, UsuarioCreate, UsuarioUpdate
from app.services.auth import hashear_password
from app.deps_auth import usuario_admin

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("/", response_model=list[UsuarioOut])
def listar(db: Session = Depends(get_db), _admin: Usuario = Depends(usuario_admin)):
    return db.query(Usuario).order_by(Usuario.nombre).all()


@router.post("/", response_model=UsuarioOut, status_code=201)
def crear(datos: UsuarioCreate, db: Session = Depends(get_db), _admin: Usuario = Depends(usuario_admin)):
    if db.query(Usuario).filter(Usuario.numero_control == datos.numero_control).first():
        raise HTTPException(409, "Ya existe un usuario con ese número de control")
    usuario = Usuario(
        numero_control=datos.numero_control,
        nombre=datos.nombre,
        password_hash=hashear_password(datos.password),
        es_admin=datos.es_admin,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.put("/{usuario_id}", response_model=UsuarioOut)
def actualizar(
    usuario_id: int, datos: UsuarioUpdate,
    db: Session = Depends(get_db), _admin: Usuario = Depends(usuario_admin),
):
    usuario = db.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")
    cambios = datos.model_dump(exclude_unset=True)
    if "password" in cambios:
        password = cambios.pop("password")
        if password:
            usuario.password_hash = hashear_password(password)
    for campo, valor in cambios.items():
        setattr(usuario, campo, valor)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}", status_code=204)
def eliminar(usuario_id: int, db: Session = Depends(get_db), admin: Usuario = Depends(usuario_admin)):
    if usuario_id == admin.id:
        raise HTTPException(400, "No puedes eliminar tu propio usuario")
    usuario = db.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")
    db.delete(usuario)
    db.commit()
