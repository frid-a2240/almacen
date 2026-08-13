from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import departamentos, clases_familia, empleados, productos, movimientos, auth, usuarios

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount(
    f"/{settings.UPLOAD_DIR}",
    StaticFiles(directory=settings.UPLOAD_DIR),
    name="uploads",
)


@app.get("/", tags=["Salud"])
def root():
    return {"app": settings.APP_NAME, "version": settings.APP_VERSION, "status": "ok"}


app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(departamentos.router)
app.include_router(clases_familia.router)
app.include_router(empleados.router)
app.include_router(productos.router)
app.include_router(movimientos.router)
