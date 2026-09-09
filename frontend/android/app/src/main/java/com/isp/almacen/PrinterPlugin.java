package com.isp.almacen;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Imprime un documento HTML (el vale electrónico de resguardo) usando el
 * framework de impresión nativo de Android (android.print, disponible desde
 * la API 19 — no hace falta ninguna librería externa ni la support library
 * vieja, que choca con AndroidX en este proyecto).
 *
 * Carga el HTML en un WebView invisible y, una vez renderizado, usa su
 * PrintDocumentAdapter para abrir el diálogo nativo de impresión (elegir
 * impresora, guardar como PDF, etc. — lo mismo que ve el usuario al imprimir
 * desde Chrome).
 */
@CapacitorPlugin(name = "Printer")
public class PrinterPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        String html = call.getString("html");
        String jobName = call.getString("jobName", "documento");

        if (html == null) {
            call.reject("Falta el HTML a imprimir");
            return;
        }

        getActivity().runOnUiThread(() -> {
            WebView webView = new WebView(getContext());
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    PrintManager printManager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                    if (printManager == null) {
                        call.reject("El sistema no tiene servicio de impresión");
                        return;
                    }
                    PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(jobName);
                    printManager.print(jobName, adapter, new PrintAttributes.Builder().build());
                    call.resolve();
                }
            });
            webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
        });
    }
}
