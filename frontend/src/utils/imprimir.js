import { Capacitor, registerPlugin } from '@capacitor/core'

const esNativo = Capacitor.isNativePlatform()

// Plugin nativo propio (android/app/.../PrinterPlugin.java) — usa el
// framework de impresión de Android directo, sin librerías externas.
const Printer = registerPlugin('Printer')

/**
 * Manda a imprimir un documento HTML autocontenido (el vale electrónico).
 * En la tablet (APK) usa el plugin nativo Printer, que abre el diálogo
 * nativo de impresión de Android. En el navegador (dashboard web) abre una
 * pestaña con el documento y dispara window.print(), que abre el diálogo
 * del navegador — mismo resultado para quien imprime.
 */
export function imprimirHtml(html, nombre) {
  if (esNativo) {
    Printer.print({ html, jobName: nombre })
    return
  }

  const ventana = window.open('', '_blank')
  if (!ventana) return
  ventana.document.write(html)
  ventana.document.close()
  ventana.focus()
  // Esperar a que las imágenes (logo, firma) carguen antes de imprimir —
  // si no, a veces sale la hoja con los recuadros de imagen en blanco.
  ventana.onload = () => {
    ventana.print()
  }
}
