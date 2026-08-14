# ALMACEN ISP

Reconstrucción como app propia del sistema "TOOLS ID ISP WAREHOUSE" que antes vivía
en AppSheet: catálogo de productos, empleados, control de resguardo (préstamos con
firma), stock por producto, departamentos y clase/familia. Mismas 7 vistas, mismos
campos y datos que la app de AppSheet — pensado para dejar de depender de ella.

## Estructura

```
backend/    API en FastAPI + SQLAlchemy + PostgreSQL
frontend/   App en React 19 + MUI + Vite — sirve de dashboard web y de fuente del APK
```

El mismo código de `frontend/` se compila de dos formas distintas (ver
`vite.config.js`):
- `npm run build` → dashboard web, lo sirve el propio backend bajo `/almacen/`.
- `npm run build:capacitor` → fuente del APK de Android (`frontend/android/`).

## Puesta en marcha (desarrollo)

```bash
# Backend (API en :8001)
cd backend
cp .env.example .env      # rellenar DATABASE_URL y generar un JWT_SECRET propio
python -m venv venv
./venv/Scripts/activate
pip install -r requirements.txt
python -m uvicorn app.main:api --host 127.0.0.1 --port 8001
```

> No uses `--reload`: en esta máquina genera un segundo proceso duplicado (worker
> viejo) por un problema conocido de uvicorn con el Python del sistema en Windows.
> Si vas a reiniciar el backend, verifica antes que no haya quedado un `python.exe`
> corriendo de una sesión anterior.

```bash
# Frontend (Vite en :5173)
cd frontend
cp .env.example .env       # VITE_API_URL=http://localhost:8001
npm install
npm run dev
```

Abre `http://localhost:5173`. El login no tiene registro público — los usuarios se
crean desde la sección "Usuarios" del sidebar (solo visible para administradores).

## Despliegue en el servidor (IIS — GACENSSV03)

Mismo patrón ya usado y probado en un proyecto hermano en este mismo servidor
(ver Parte 09 de esa guía para los problemas ya resueltos). Resumen adaptado a
este proyecto — alias `almacen`, IP fija del servidor `192.168.4.13`.

### 1. Backend, en el servidor

```powershell
cd D:\Aplicaciones\wwwroot
git clone https://github.com/frid-a2240/almacen.git almacen
cd almacen\backend
& "C:\Program Files\Python312\python.exe" -m venv venv312   # confirmar antes qué Python hay en el servidor
.\venv312\Scripts\Activate.ps1
pip install -r requirements.txt
```

Crear `backend\.env` en el servidor (parte de `backend/.env.example`, con los
valores reales — **no reutilizar el `JWT_SECRET` de la laptop**):

```
DATABASE_URL=postgresql://postgres:<password del Postgres del servidor>@localhost:5432/tools_id_isp_warehouse
UPLOAD_DIR=D:\Aplicaciones\wwwroot\almacen\backend\uploads   # ruta ABSOLUTA, IIS no comparte cwd con la terminal
JWT_SECRET=<generar uno nuevo>
JWT_EXPIRE_DAYS=3650
CORS_ORIGINS=http://localhost
```

`CORS_ORIGINS` **no se puede dejar vacío** aunque el dashboard web no lo
necesite (mismo origen que la API): el APK sí lo necesita, porque Capacitor
sirve la app desde el origen `http://localhost`, distinto al del servidor.

### 2. Base de datos

```powershell
# En la laptop
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h localhost -d tools_id_isp_warehouse -F p -f almacen_backup.sql
# copiar el .sql al servidor por escritorio remoto/carpeta compartida (nunca por git)

# En el servidor
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres tools_id_isp_warehouse
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d tools_id_isp_warehouse -f C:\ruta\almacen_backup.sql
```

La carpeta `backend/uploads/` (fotos y firmas) tampoco viaja con git ni con el
dump: comprimir (`Compress-Archive`) y copiar aparte, luego `Expand-Archive` en
el servidor dentro de la ruta que apunta `UPLOAD_DIR`.

### 3. Dashboard web (build en la laptop, se sube con git)

```powershell
cd frontend
npm run build          # cae en backend/dist, que SÍ va a git
git add backend/dist
git commit -m "Build de producción"
git push
```

En el servidor: `git pull` (y listo, no hace falta Node.js ahí).

### 4. IIS

`runserver.py` y `web.config` ya están en la raíz del repo — solo ajustar las 3
rutas de `web.config` si el clon queda en un lugar distinto de
`D:\Aplicaciones\wwwroot\almacen`. En IIS Manager:

1. Sites → Default Web Site → Add Application… → Alias `almacen`, Physical path
   `D:\Aplicaciones\wwwroot\almacen`.
2. Application Pools → nueva pool `almacen`, .NET CLR version **No Managed
   Code** → asignarla a la sub-aplicación.
3. `icacls` (PowerShell como administrador):
   ```powershell
   icacls "D:\Aplicaciones\wwwroot\almacen" /grant "IIS AppPool\almacen:(OI)(CI)F" /T
   icacls "C:\Program Files\Python312" /grant "IIS AppPool\almacen:(OI)(CI)R" /T
   ```
4. `iisreset`.

Probar desde cualquier equipo de la red: `http://gacenssv03/almacen/` debe
mostrar el dashboard, y `http://gacenssv03/almacen/api/` debe devolver JSON.

### Actualizar después de la primera vez

```powershell
# Solo backend
git push          # laptop
git pull; iisreset  # servidor

# Dashboard web
npm run build; git add backend/dist; git commit; git push   # laptop
git pull; iisreset                                            # servidor
```

## El APK

No se sube a IIS — el build vive dentro del teléfono/tablet. La URL de la API
para el APK apunta a la **IP fija** del servidor, nunca a su nombre: el WebView
de Android no resuelve `gacenssv03` aunque el navegador del teléfono sí puede
(limitación de DNS de la red interna hacia celulares/tablets, ya confirmada).
Ver `frontend/.env.capacitor`.

```powershell
cd frontend
npm run build:capacitor
npx cap sync android

cd android
.\gradlew.bat assembleDebug      # apk de prueba, sin firmar para release
.\gradlew.bat assembleRelease     # apk firmado con el keystore de producción
```

APKs generados en `android/app/build/outputs/apk/{debug,release}/`.

- El keystore de firma vive **fuera del repo**, en
  `..\almacen-keystore\almacen-isp-release.jks` (ver el `LEEME_IMPORTANTE.txt`
  en esa misma carpeta) — **hacerle respaldo en al menos un lugar más**. Si se
  pierde, ya no se pueden firmar actualizaciones sobre los APK ya instalados.
- Un APK release y uno debug firmados con llaves distintas **no coexisten** en
  el mismo dispositivo — desinstalar antes de instalar el otro.
- No hay actualización automática: reinstalar el APK a mano en cada tableta
  cuando cambie el código o la URL del backend.

## Variables de entorno

| Archivo | Uso |
|---|---|
| `backend/.env` | Backend (dev y producción) — ver `backend/.env.example` |
| `frontend/.env` | Dashboard en desarrollo local (`npm run dev`) |
| `frontend/.env.production` | Dashboard para el build web (`npm run build`) — URL relativa, mismo origen que la API |
| `frontend/.env.capacitor` | APK (`npm run build:capacitor`) — IP fija del servidor |
