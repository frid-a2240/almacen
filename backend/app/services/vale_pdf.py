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
from reportlab.lib.colors import black
from reportlab.pdfgen import canvas

_PLANTILLA = Path(__file__).resolve().parent.parent / "templates" / "vale_equipo_herramienta.pdf"
_ALTO_PAGINA = 792.0
_DELTA_COPIA_2 = 387.7  # distancia vertical entre la copia 1 y la copia 2 (medida sobre "VALE" del título de ambas)


def _y(top):
    """Convierte "distancia desde arriba" (como se mide a simple vista en la
    plantilla) a la coordenada Y de reportlab (origen abajo)."""
    return _ALTO_PAGINA - top


def _texto(c, x, top, texto, size=8, bold=False, center=False, max_width=None):
    if not texto:
        return
    texto = str(texto)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    if max_width:
        while texto and c.stringWidth(texto, "Helvetica-Bold" if bold else "Helvetica", size) > max_width:
            texto = texto[:-1]
    if center:
        c.drawCentredString(x, _y(top), texto)
    else:
        c.drawString(x, _y(top), texto)


def _campos_copia(c, m, delta):
    d = delta
    fecha = m["fecha_movimiento"]
    fecha_str = fecha.strftime("%d/%m/%Y") if isinstance(fecha, date) else (fecha or "")

    # Fecha de Entrega: la etiqueta ("Fecha"/"de"/"Entrega"/":") ocupa las 4
    # líneas de la celda — el valor va en la misma línea de ":", a su derecha.
    _texto(c, 430, 60 + d, fecha_str, size=6.5)
    # Folio / No.: celda ancha a la derecha, con toda la altura de las 3
    # primeras filas disponible, debajo del encabezado "No." en rojo.
    _texto(c, 558, 58 + d, str(m.get("numero_de_vale") or ""), size=14, bold=True, center=True)

    # No. de Empleado: en su propio recuadro, a la derecha de "Empleado:".
    _texto(c, 98, 80 + d, m.get("id_numero_empleado"), size=6.5, bold=True, center=True)
    # Nombre Completo: la etiqueta va a la mitad de la celda — el valor va en
    # el renglón de abajo, con todo el ancho de la celda disponible.
    _texto(c, 122, 81 + d, m.get("nombre_de_empleado"), size=6.5, max_width=290)
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
