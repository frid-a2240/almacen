"""Vale electrónico: escribe los datos del movimiento directo sobre el PDF
real de la plantilla (backend/app/templates/vale_equipo_herramienta.pdf),
en vez de recrear el diseño — mismo criterio que inventario_excel.py con la
plantilla .xlsm: la plantilla real no se toca, solo se le escribe encima.

La plantilla es la exportación a PDF del Excel oficial "vale equipo
excel.xlsx" (con el pie de página/leyenda agregado) — se usa esa fuente en
vez del .docx porque Word exportaba el borde entre "No. de Empleado" y
"Nombre Completo" con un grosor irregular ("línea gruesa"); el mismo
documento exportado desde Excel no tiene ese problema.

Coordenadas en puntos PDF (origen abajo-izquierda), calibradas a mano contra
la plantilla en Carta (612x792pt) — DELTA_COPIA_2 es la distancia vertical
entre la copia de arriba y la de abajo (idéntica en ambas, medida sobre el
título "VALE..." de cada una).
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
_DELTA_COPIA_2 = 398.25

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

    # Fecha de Entrega: la etiqueta ya va en una sola línea — el valor va
    # debajo, dentro de la misma celda (queda apretado a la derecha si se
    # pone junto a la etiqueta).
    _texto(c, 296, 52 + d, fecha_str, size=7, max_width=56)
    # Folio / No.: celda angosta a la derecha, debajo del encabezado "No."
    # en rojo — centrado en la celda.
    _texto(c, 418.4, 54 + d, str(m.get("numero_de_vale") or ""), size=11, center=True)

    # No. de Empleado / Nombre Completo / Puesto: las tres etiquetas ya
    # vienen en una sola línea en esta plantilla (a diferencia de la
    # exportada desde Word) — el valor va a la derecha de cada una, en el
    # espacio que le queda a la celda.
    _texto(c, 82, 61 + d, m.get("id_numero_empleado"), size=6.5, max_width=24, size_min=5)
    _texto(c, 175, 61 + d, m.get("nombre_de_empleado"), size=7, max_width=113, size_min=5.5)
    _texto(c, 320, 61 + d, m.get("puesto_posicion"), size=7, max_width=123)

    # Proyecto o Área de Trabajo (=Departamento) / Nombre del Supervisor —
    # valor en la misma línea, a la derecha de cada etiqueta.
    _texto(c, 123, 71 + d, m.get("departamento"), size=7, max_width=75)
    _texto(c, 279, 71 + d, m.get("jefe_inmediato"), size=7, max_width=160)

    # Primer (y único, por ahora) renglón de herramienta de la tabla
    fila_y = 114 + d
    _texto(c, 42.8, fila_y, m.get("cantidad"), size=7, center=True)
    _texto(c, 82.9, fila_y, m.get("numero_economico"), size=6.5, center=True)
    _texto(c, 113, fila_y, m.get("descripcion"), size=6.5, max_width=198)


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
