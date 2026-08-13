import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Alias con el que el backend cuelga el dashboard en IIS (debe coincidir
// con ALIAS en backend/app/main.py). Ver README de despliegue.
const ALIAS = 'almacen'

// Este mismo frontend se compila de 2 formas distintas:
//  - `npm run build`            -> dashboard web, servido por FastAPI bajo /almacen/
//  - `npm run build:capacitor`  -> fuente del APK, vive dentro del teléfono, sin prefijo
export default defineConfig(({ command, mode }) => {
  const esCapacitor = mode === 'capacitor'
  return {
    plugins: [react()],
    base: command === 'build' && !esCapacitor ? `/${ALIAS}/` : '/',
    build: {
      outDir: esCapacitor ? 'dist' : '../backend/dist',
      emptyOutDir: true,
    },
    server: {
      port: 5173,
    },
  }
})
