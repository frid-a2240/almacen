import { Capacitor, registerPlugin } from '@capacitor/core'

const esNativo = Capacitor.isNativePlatform()

// Plugin nativo propio (android/app/.../PrinterPlugin.java) — imprime un PDF
// existente con el framework de impresión de Android, sin librerías externas.
const Printer = registerPlugin('Printer')

function comoBase64(arrayBuffer) {
  let binario = ''
  const bytes = new Uint8Array(arrayBuffer)
  for (let i = 0; i < bytes.byteLength; i++) binario += String.fromCharCode(bytes[i])
  return btoa(binario)
}

/**
 * Abre la pestaña donde después se va a mostrar el PDF — hay que llamarla
 * de inmediato, dentro del mismo clic del usuario (antes de cualquier
 * await), porque los navegadores solo permiten window.open() sin bloqueo
 * de pop-ups como reacción directa a un gesto del usuario. Si se abre
 * después de esperar el guardado/las fotos, ya no cuenta como tal y el
 * navegador la bloquea en silencio (sin aviso ni error).
 */
export function abrirVentanaImpresion() {
  return esNativo ? null : window.open('', '_blank')
}

/**
 * Manda a imprimir un PDF (el vale electrónico, ya armado sobre la
 * plantilla real). En la tablet (APK) usa el plugin nativo Printer, que abre
 * el diálogo nativo de impresión de Android. En el navegador (dashboard web)
 * usa la pestaña de abrirVentanaImpresion() (o abre una nueva si no se le
 * pasó) y dispara el diálogo de impresión ahí.
 */
export async function imprimirPdf(arrayBuffer, nombre, ventanaPrevia) {
  if (esNativo) {
    await Printer.printPdf({ base64: comoBase64(arrayBuffer), jobName: nombre })
    return
  }

  const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const ventana = ventanaPrevia || window.open(url, '_blank')
  if (!ventana) return
  ventana.addEventListener('load', () => {
    // El evento "load" de la pestaña dispara en cuanto el visor de PDF del
    // navegador arranca, no cuando terminó de renderizar la página (imágenes
    // incluidas) — imprimir de inmediato puede capturar el PDF a medio
    // renderizar (el logo sale distorsionado/incompleto). Dando un respiro
    // antes de llamar a print() le da tiempo al visor de terminar.
    setTimeout(() => ventana.print(), 700)
  })
  if (ventanaPrevia) ventana.location = url
}
