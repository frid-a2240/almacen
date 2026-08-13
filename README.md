# Almacén ISP — Control de Herramienta

Sistema de control de herramienta de almacén: catálogo de herramientas por TOOL ID,
catálogo de empleados/responsables (foto, supervisor, área) y registro de
préstamos/devoluciones con firma. Reemplaza el control anterior en Google Sheets.

## Estructura

```
backend/    API en Node.js + TypeScript + Express + SQLite
frontend/   App en React + TypeScript + Vite + Tailwind CSS
```

## Cómo funciona

- **Pantalla principal (modo kiosko, sin login)** — la opera quien está en almacén:
  - Buscar herramienta por TOOL ID / nombre / número de serie (compatible con lector
    de código de barras).
  - Iniciar préstamo: se captura el número de empleado.
    - Si el empleado ya está registrado, se autocompletan sus datos (nombre, foto,
      supervisor, área) y solo falta firmar.
    - Si no está registrado, se da de alta ahí mismo (foto + datos) y luego firma.
  - Ver qué herramienta está prestada y a cargo de quién.
  - Devolver herramienta: deja de aparecer como "a cargo de" ese empleado.
- **Panel administrativo (`/admin`, con login)** — para gestionar el catálogo:
  - Familias y herramientas (alta, edición, baja, cambio de estado).
  - Consulta/edición de empleados registrados.
  - Historial completo de préstamos y devoluciones, con enlace a la firma capturada.

## Requisitos

- Node.js 18 o superior.

## Puesta en marcha (desarrollo)

```bash
# Backend (API en :4000)
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend (Vite en :5173, con proxy a la API)
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. La primera vez que arranca el backend crea
automáticamente:
- Un usuario administrador (usuario/contraseña definidos en `.env`, por defecto
  `admin` / `admin123` — **cámbialos** editando `ADMIN_USERNAME`/`ADMIN_PASSWORD` en
  `backend/.env` antes de usarlo en producción).
- Un catálogo de ejemplo (familias + una herramienta `TOOL-0001`) para probar el flujo.

## Despliegue en el almacén (producción, un solo servidor en red local)

```bash
cd frontend
npm install
npm run build        # genera frontend/dist

cd ../backend
npm install
npm run build         # compila a backend/dist
npm start              # sirve la API y el frontend compilado en un solo puerto
```

El backend sirve el frontend ya compilado desde el mismo puerto (por defecto
`4000`), así que basta con levantar `backend` en una PC del almacén y entrar desde
cualquier otro dispositivo de la red local a `http://<IP-de-esa-PC>:4000`.

Para correr el backend como servicio persistente en Windows (que siga corriendo
aunque se cierre la sesión), se recomienda usar [PM2](https://pm2.keymetrics.io/) o
el Programador de tareas de Windows apuntando a `npm start` dentro de `backend/`.

## Datos y archivos

- Base de datos SQLite en `backend/data/almacen.db` (un solo archivo, sin
  necesidad de instalar motor de base de datos aparte).
- Fotos de empleados y firmas en `backend/uploads/photos` y
  `backend/uploads/signatures`.
- **Respaldo**: para hacer backup del sistema basta con copiar la carpeta
  `backend/data/` y `backend/uploads/`.

## Variables de entorno (`backend/.env`)

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (default `4000`) |
| `JWT_SECRET` | Secreto para firmar la sesión del panel admin — cámbialo en producción |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Credenciales del admin sembrado la primera vez que arranca (si ya existe un admin, no se vuelve a crear) |
