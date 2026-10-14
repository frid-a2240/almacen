import { Capacitor, registerPlugin } from '@capacitor/core'
import { App } from '@capacitor/app'
import { API_URL } from '../api/client.js'

const esNativo = Capacitor.isNativePlatform()

// Plugin nativo propio (android/.../ActualizadorPlugin.java) — descarga la
// APK nueva dentro de la app y abre el instalador de Android, sin pasar por
// Chrome (un <a href="...apk"> normal solo abre el navegador y ahí no hay
// forma de disparar el instalador directo).
const Actualizador = registerPlugin('Actualizador')

// version.json + la APK viven en /descargas, al lado de /api (ver
// backend/app/main.py) — no dentro de /api porque no son parte de la API,
// son archivos estáticos que se copian a mano al servidor (ver README).
const DESCARGAS_URL = API_URL.replace(/\/api\/?$/, '/descargas')

const CLAVE_PENDIENTE = 'almacen_actualizacion_pendiente'
const CLAVE_REVISADA = 'almacen_actualizacion_revisada'

function esMayor(a, b) {
  const pa = String(a).split('.').map(Number)
  const pb = String(b).split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0)
  }
  return false
}

/**
 * Revisa si hay una APK más nueva que la instalada — una sola vez por
 * sesión de la app (sessionStorage), para no mandar la petición en cada
 * cambio de pantalla. Devuelve null si no hay nada nuevo o esto no corre en
 * el APK (en el dashboard web no aplica).
 */
export async function revisarActualizacion() {
  if (!esNativo) return null

  const guardada = sessionStorage.getItem(CLAVE_REVISADA)
  if (guardada) return guardada === 'null' ? null : JSON.parse(guardada)

  try {
    const [infoApp, respuesta] = await Promise.all([
      App.getInfo(),
      fetch(`${DESCARGAS_URL}/version.json?t=${Date.now()}`),
    ])
    if (!respuesta.ok) {
      sessionStorage.setItem(CLAVE_REVISADA, 'null')
      return null
    }
    const info = await respuesta.json()
    if (!info.version || !esMayor(info.version, infoApp.version)) {
      sessionStorage.setItem(CLAVE_REVISADA, 'null')
      return null
    }
    const resultado = { ...info, url: `${DESCARGAS_URL}/${encodeURIComponent(info.archivo || 'AlmacenISP.apk')}` }
    sessionStorage.setItem(CLAVE_REVISADA, JSON.stringify(resultado))
    return resultado
  } catch {
    // Sin conexión al servidor (p.ej. fuera del wifi de la empresa) — no es
    // error del usuario, simplemente no hay nada que avisar todavía.
    return null
  }
}

/** Descarga la APK con progreso y abre el instalador — `onProgreso(pct)` se
 * llama en cada cambio de porcentaje. */
export async function descargarActualizacion(url, onProgreso) {
  const escucha = await Actualizador.addListener('progreso', (p) => onProgreso(p.porcentaje))
  try {
    await Actualizador.descargar({ url })
  } finally {
    escucha.remove()
  }
}

/**
 * Abre el instalador nativo. Si Android todavía no tiene permiso de
 * "instalar apps desconocidas" para esta app, abre esa pantalla de ajustes
 * y guarda una marca (localStorage, sobrevive incluso si el permiso
 * reinicia la app) para retomar el instalador solo en cuanto la persona
 * regrese — así no hay que darle "Actualizar" dos veces.
 */
export async function abrirInstalador() {
  const r = await Actualizador.instalar()
  if (!r.permiso) {
    localStorage.setItem(CLAVE_PENDIENTE, String(Date.now()))
  }
  return r.permiso
}

/** true si hay una instalación pendiente de retomar (se guardó hace menos
 * de 10 minutos — más que eso, mejor que la persona le dé "Actualizar" de
 * nuevo a mano). */
export function hayInstalacionPendiente() {
  const marca = Number(localStorage.getItem(CLAVE_PENDIENTE) || 0)
  return marca > 0 && Date.now() - marca < 10 * 60 * 1000
}

export function limpiarInstalacionPendiente() {
  localStorage.removeItem(CLAVE_PENDIENTE)
}
