# -*- coding: utf-8 -*-
"""Siembra los usuarios iniciales del sistema (solo se corre una vez)."""
import sys

sys.stdout.reconfigure(encoding="utf-8")

from app.database import SessionLocal
from app.models import Usuario
from app.services.auth import hashear_password

USUARIOS = [
    {"numero_control": "204862", "nombre": "Sofia Arroyo", "password": "sistemas2026", "es_admin": True},
    {"numero_control": "201452", "nombre": "Gustavo Peña", "password": "peña2026", "es_admin": False},
    {"numero_control": "204325", "nombre": "Luis", "password": "vazquez2026", "es_admin": False},
]

db = SessionLocal()
for u in USUARIOS:
    existente = db.query(Usuario).filter(Usuario.numero_control == u["numero_control"]).first()
    if existente:
        print(f"  ya existe: {u['numero_control']} ({existente.nombre})")
        continue
    usuario = Usuario(
        numero_control=u["numero_control"],
        nombre=u["nombre"],
        password_hash=hashear_password(u["password"]),
        es_admin=u["es_admin"],
    )
    db.add(usuario)
    print(f"  creado: {u['numero_control']} - {u['nombre']} (admin={u['es_admin']})")

db.commit()
print("Listo.")
