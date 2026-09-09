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
 * Manda a imprimir un PDF (el vale electrónico, ya armado sobre la
 * plantilla real). En la tablet (APK) usa el plugin nativo Printer, que abre
 * el diálogo nativo de impresión de Android. En el navegador (dashboard web)
 * abre el PDF en una pestaña nueva y dispara el diálogo de impresión ahí.
 */
export async function imprimirPdf(arrayBuffer, nombre) {
  if (esNativo) {
    await Printer.printPdf({ base64: comoBase64(arrayBuffer), jobName: nombre })
    return
  }

  const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const ventana = window.open(url, '_blank')
  if (!ventana) return
  ventana.addEventListener('load', () => {
    ventana.print()
  })
}
