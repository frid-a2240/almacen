package com.isp.almacen;

import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.util.Base64;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Imprime el vale electrónico (ya armado como PDF en el backend, sobre la
 * plantilla real) usando el framework de impresión nativo de Android
 * (android.print, disponible desde la API 19 — no hace falta ninguna
 * librería externa).
 *
 * El PDF llega como base64 desde JS, se guarda en un archivo temporal y se
 * manda al PrintManager con un adaptador que solo copia esos bytes — mismo
 * patrón que usa Android para "imprimir un PDF existente".
 */
@CapacitorPlugin(name = "Printer")
public class PrinterPlugin extends Plugin {

    @PluginMethod
    public void printPdf(PluginCall call) {
        String base64 = call.getString("base64");
        String jobName = call.getString("jobName", "documento");

        if (base64 == null) {
            call.reject("Falta el PDF a imprimir");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                File archivo = new File(getContext().getCacheDir(), jobName + ".pdf");
                try (FileOutputStream fos = new FileOutputStream(archivo)) {
                    fos.write(bytes);
                }

                PrintManager printManager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                if (printManager == null) {
                    call.reject("El sistema no tiene servicio de impresión");
                    return;
                }
                // El vale ya es una sola página (con las dos copias) — se
                // manda "una sola cara" por default para que no haya que
                // desmarcar el doble lado a mano cada vez. La impresora
                // igual permite cambiarlo desde el propio diálogo.
                PrintAttributes atributos = new PrintAttributes.Builder()
                        .setDuplexMode(PrintAttributes.DUPLEX_MODE_NONE)
                        .build();
                printManager.print(jobName, new PdfDocumentAdapter(archivo, jobName), atributos);
                call.resolve();
            } catch (IOException e) {
                call.reject("No se pudo preparar el PDF para imprimir", e);
            }
        });
    }

    /** Adaptador mínimo: el "layout" es el PDF entero, "escribir" es copiar el archivo tal cual. */
    private static class PdfDocumentAdapter extends PrintDocumentAdapter {
        private final File archivo;
        private final String jobName;

        PdfDocumentAdapter(File archivo, String jobName) {
            this.archivo = archivo;
            this.jobName = jobName;
        }

        @Override
        public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                              CancellationSignal cancellationSignal, LayoutResultCallback callback, Bundle extras) {
            if (cancellationSignal.isCanceled()) {
                callback.onLayoutCancelled();
                return;
            }
            PrintDocumentInfo info = new PrintDocumentInfo.Builder(jobName)
                    .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                    .build();
            callback.onLayoutFinished(info, true);
        }

        @Override
        public void onWrite(PageRange[] pages, ParcelFileDescriptor destination,
                             CancellationSignal cancellationSignal, WriteResultCallback callback) {
            try (InputStream in = new FileInputStream(archivo);
                 OutputStream out = new FileOutputStream(destination.getFileDescriptor())) {
                byte[] buffer = new byte[4096];
                int leidos;
                while ((leidos = in.read(buffer)) > 0) {
                    out.write(buffer, 0, leidos);
                }
                callback.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
            } catch (IOException e) {
                callback.onWriteFailed(e.getMessage());
            }
        }
    }
}
