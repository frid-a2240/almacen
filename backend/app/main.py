from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from app.config import settings
from app.routers import departamentos, clases_familia, empleados, productos, movimientos, auth, usuarios

# Alias con el que esta app se cuelga de IIS: http://gacenssv03/almacen/
# Debe coincidir con el `base` de frontend/vite.config.js y con el Alias
# configurado en IIS Manager.
ALIAS = "almacen"

# --- API tal cual ya existía, sin tocar routers ni prefijos ---
api = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

api.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Listados como /movimientos/ pesan varios MB en JSON crudo (texto muy
# repetitivo: nombres, status, rutas de foto) — comprime ~90%, y es la parte
# que más se siente en Wi-Fi de tableta/oficina, más que el tiempo del server.
api.add_middleware(GZipMiddleware, minimum_size=1000)

Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
# El prefijo de URL siempre es "/uploads" (el frontend lo asume fijo en
# imageURL()), sin importar el valor de UPLOAD_DIR — que en el servidor es
# una ruta absoluta de disco (D:\...\uploads), no algo usable como URL.
api.mount(
    "/uploads",
    StaticFiles(directory=settings.UPLOAD_DIR),
    name="uploads",
)


@api.get("/", tags=["Salud"])
def root():
    return {"app": settings.APP_NAME, "version": settings.APP_VERSION, "status": "ok"}


api.include_router(auth.router)
api.include_router(usuarios.router)
api.include_router(departamentos.router)
api.include_router(clases_familia.router)
api.include_router(empleados.router)
api.include_router(productos.router)
api.include_router(movimientos.router)


# --- app envolvente: la que corre IIS en el servidor (ver runserver.py) ---
# En desarrollo local se sigue usando `api` directo (uvicorn app.main:api),
# así las rutas del día a día no cambian (http://localhost:8001/productos).
# Solo el servidor usa `app`, que cuelga la misma API bajo /almacen/api y
# además sirve el build del frontend (frontend/dist -> backend/dist).
app = FastAPI()
app.mount(f"/{ALIAS}/api", api)  # debe registrarse antes del catch-all de abajo

DIST = Path(__file__).resolve().parent.parent / "dist"

if DIST.exists():
    app.mount(f"/{ALIAS}/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get(f"/{ALIAS}")
    async def redirect_root():
        return RedirectResponse(f"/{ALIAS}/")

    @app.get(f"/{ALIAS}/{{full_path:path}}")
    async def serve_spa(full_path: str):
        file_path = DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST / "index.html")
