"""Vale electrónico: escribe los datos del movimiento directo sobre el PDF
real de la plantilla (backend/app/templates/vale_equipo_herramienta.pdf),
en vez de recrear el diseño — mismo criterio que inventario_excel.py con la
plantilla .xlsm: la plantilla real no se toca, solo se le escribe encima.

La plantilla se arma en dos pasos, ambos hechos una sola vez (no en cada
request):
1. El Excel oficial "vale equipo excel.xlsx" (una sola copia del vale, sin
   duplicar) se exporta a PDF vía Excel/COM a la escala que mejor llena el
   ancho de una hoja Carta sin deformar las casillas de "Buen Estado/
   Dañado/No Recibido" (que en el Excel original no eran cuadradas).
2. Ese PDF de una sola copia se "apila" dos veces en una misma hoja con
   pypdf (Transformation().translate + merge_page) — así no depende de que
   alguien duplique filas a mano en el Excel.

Coordenadas en puntos PDF (origen abajo-izquierda), calibradas a mano contra
la plantilla en Carta (612x792pt) — DELTA_COPIA_2 es la distancia vertical
entre la copia de arriba y la de abajo: es EXACTA (391.913pt), la misma que
se usó para apilar las dos copias en el paso 2, no una medición aproximada.
"""
from datetime import date
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import black
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

_PLANTILLA = Path(__file__).resolve().parent.parent / "templates" / "vale_equipo_herramienta.pdf"
_ALTO_PAGINA = 792.0
# Distancia vertical entre la copia de arriba y la de abajo. El título mismo
# ("VALE...") baja 402.3pt, pero la fila del encabezado (Fecha de
# Entrega/Folio/No.) mide ~4pt menos alta en la copia de abajo — como todo
# lo que escribimos en esa fila va pegado a su borde inferior (no a la
# etiqueta), usamos el delta medido sobre ese borde (398.25), que es el que
# de verdad le aplica a nuestro texto.
_DELTA_COPIA_2 = 391.913

# Mismo tipo de letra que usa la plantilla ("Mont Book") — el .otf original
# tiene contornos PostScript que reportlab no soporta, así que se usa una
# conversión a contornos TrueType (backend/app/assets/fonts), hecha una sola
# vez con otf2ttf; no hay variante negrita disponible, se usa la misma para
# todo el texto.
_FUENTE = "MontBook"
pdfmetrics.registerFont(
    TTFont(_FUENTE, str(Path(__file__).resolve().parent.parent / "assets" / "fonts" / "Mont-Book.ttf"))
)


def _y(top):
    """Convierte "distancia desde arriba" (como se mide a simple vista en la
    plantilla) a la coordenada Y de reportlab (origen abajo)."""
    return _ALTO_PAGINA - top


def _texto(c, x, top, texto, size=8, center=False, max_width=None, size_min=None):
    """Dibuja texto; si no cabe en max_width, primero reduce el tamaño de
    letra (hasta size_min, cuando se da) para no perder ninguna letra —
    solo trunca si ni con la letra más chica permitida cabe."""
    if not texto:
        return
    texto = str(texto)
    if max_width:
        tam = size
        while size_min and tam > size_min and c.stringWidth(texto, _FUENTE, tam) > max_width:
            tam -= 0.2
        size = tam
        while texto and c.stringWidth(texto, _FUENTE, size) > max_width:
            texto = texto[:-1]
    c.setFont(_FUENTE, size)
    if center:
        c.drawCentredString(x, _y(top), texto)
    else:
        c.drawString(x, _y(top), texto)


def _campos_copia(c, m, d):
    fecha = m["fecha_movimiento"]
    fecha_str = fecha.strftime("%d/%m/%Y") if isinstance(fecha, date) else (fecha or "")

    # Fecha de Entrega: la etiqueta va en una sola línea, ocupando casi toda
    # la celda — el valor va debajo, apretado.
    _texto(c, 352, 38 + d, fecha_str, size=6.5, max_width=75)
    # Folio / No.: celda angosta a la derecha del título — poca altura
    # disponible debajo del encabezado "No." en rojo.
    _texto(c, 518.9, 38 + d, str(m.get("numero_de_vale") or ""), size=10, center=True)

    # No. de Empleado / Nombre Completo / Puesto: una sola línea cada uno,
    # el valor a la derecha de su etiqueta.
    _texto(c, 76, 51 + d, m.get("id_numero_empleado"), size=6.5, max_width=30, size_min=5)
    _texto(c, 179, 51 + d, m.get("nombre_de_empleado"), size=7, max_width=167, size_min=5.5)
    _texto(c, 379, 51 + d, m.get("puesto_posicion"), size=7, max_width=180)

    # Proyecto o Área de Trabajo (=Departamento) / Nombre del Supervisor —
    # valor en la misma línea, a la derecha de cada etiqueta.
    _texto(c, 112, 69 + d, m.get("departamento"), size=7, max_width=109)
    _texto(c, 308, 69 + d, m.get("jefe_inmediato"), size=7, max_width=251)

    # Primer (y único, por ahora) renglón de herramienta de la tabla
    fila_y = 131 + d
    _texto(c, 29.6, fila_y, m.get("cantidad"), size=7, center=True)
    _texto(c, 77.2, fila_y, m.get("numero_economico"), size=6.5, center=True)
    _texto(c, 113, fila_y, m.get("descripcion"), size=6.5, max_width=206)


def generar_vale_pdf(movimiento: dict) -> bytes:
    buffer_overlay = BytesIO()
    c = canvas.Canvas(buffer_overlay, pagesize=(612, 792))
    c.setFillColor(black)
    _campos_copia(c, movimiento, 0.0)
    _campos_copia(c, movimiento, _DELTA_COPIA_2)
    c.save()
    buffer_overlay.seek(0)

    overlay = PdfReader(buffer_overlay)
    base = PdfReader(str(_PLANTILLA))
    writer = PdfWriter()

    pagina = base.pages[0]
    pagina.merge_page(overlay.pages[0])
    writer.add_page(pagina)
    for extra in base.pages[1:]:
        writer.add_page(extra)

    salida = BytesIO()
    writer.write(salida)
    salida.seek(0)
    return salida.read()
