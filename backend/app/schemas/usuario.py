from pydantic import BaseModel, ConfigDict
from typing import Optional


class LoginRequest(BaseModel):
    numero_control: str
    password: str


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero_control: str
    nombre: str
    es_admin: bool
    activo: bool


class LoginResponse(BaseModel):
    token: str
    usuario: UsuarioOut


class UsuarioCreate(BaseModel):
    numero_control: str
    nombre: str
    password: str
    es_admin: bool = False


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    password: Optional[str] = None
    es_admin: Optional[bool] = None
    activo: Optional[bool] = None
