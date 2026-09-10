"""Vale electrónico: escribe los datos del movimiento directo sobre el PDF
real de la plantilla (backend/app/templates/vale_equipo_herramienta.pdf,
exportada tal cual del .docx oficial "vale de equipo y herramienta doble"),
en vez de recrear el diseño — mismo criterio que inventario_excel.py con la
plantilla .xlsm: la plantilla real no se toca, solo se le escribe encima.

Coordenadas en puntos PDF (origen abajo-izquierda), calibradas a mano contra
la plantilla en Carta (612x792pt) — DELTA_COPIA_2 es la distancia vertical
entre la copia de arriba y la de abajo (idéntica en ambas, medida sobre el
logo de cada una).
"""
from datetime import date
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import black, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

_PLANTILLA = Path(__file__).resolve().parent.parent / "templates" / "vale_equipo_herramienta.pdf"
_ALTO_PAGINA = 792.0
_DELTA_COPIA_2 = 387.7  # distancia vertical entre la copia 1 y la copia 2 (medida sobre "VALE" del título de ambas)

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


def _borrar(c, x0, top0, x1, top1):
    """Tapa con blanco una región de la plantilla — para reescribir una
    etiqueta que viene partida en dos líneas dentro del PDF original."""
    c.setFillColor(white)
    c.rect(x0, _y(top1), x1 - x0, top1 - top0, fill=1, stroke=0)
    c.setFillColor(black)


def _campos_copia(c, m, delta):
    d = delta
    fecha = m["fecha_movimiento"]
    fecha_str = fecha.strftime("%d/%m/%Y") if isinstance(fecha, date) else (fecha or "")

    # Fecha de Entrega: la etiqueta ("Fecha"/"de"/"Entrega"/":") ocupa las 4
    # líneas de la celda — el valor va en la misma línea de ":", a su derecha.
    _texto(c, 430, 60 + d, fecha_str, size=6.5)
    # Folio / No.: celda ancha a la derecha, con toda la altura de las 3
    # primeras filas disponible, debajo del encabezado "No." en rojo.
    _texto(c, 558, 58 + d, str(m.get("numero_de_vale") or ""), size=14, center=True)

    # No. de Empleado: en el .docx original es una sola celda de tabla (sin
    # ningún recuadro extra) donde "No. de Empleado:" ya viene partido en dos
    # líneas por el ancho angosto de la columna (91pt) — se tapa y se
    # redibuja en una sola línea, junto con el número, sin agregar bordes
    # nuevos (un recuadro adicional pegado al borde real de la celda se veía
    # como una línea doble/gruesa).
    _borrar(c, 27, 62 + d, 116, 82 + d)
    numero_empleado = m.get("id_numero_empleado")
    etiqueta_empleado = f"No. de Empleado: {numero_empleado}" if numero_empleado else "No. de Empleado:"
    _texto(c, 29, 71 + d, etiqueta_empleado, size=7, max_width=85, size_min=6)
    # Nombre Completo: el valor va justo debajo de su etiqueta, alineado a la
    # misma posición horizontal — con todo el ancho de la celda disponible
    # no hace falta reducir la letra. El renglón sube un poco (79 en vez de
    # 81) para no rozar la línea de la celda que viene justo debajo (82.3).
    _texto(c, 259, 79 + d, m.get("nombre_de_empleado"), size=7, max_width=155, size_min=5)
    _texto(c, 468, 71 + d, m.get("puesto_posicion"), size=7, max_width=115)

    # Proyecto o Área de Trabajo (=Departamento) / Nombre del Supervisor —
    # valor en la misma línea, a la derecha de cada etiqueta.
    _texto(c, 189, 92 + d, m.get("departamento"), size=7.5, max_width=140)
    _texto(c, 468, 92 + d, m.get("jefe_inmediato"), size=7, max_width=115)

    # Primer (y único, por ahora) renglón de herramienta de la tabla
    fila_y = 139 + d
    _texto(c, 42, fila_y, m.get("cantidad"), size=7, center=True)
    _texto(c, 87, fila_y, m.get("numero_economico"), size=6.5, center=True)
    _texto(c, 122, fila_y, m.get("descripcion"), size=6.5, max_width=260)


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
