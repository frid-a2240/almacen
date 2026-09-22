"""Reporte de Incidencia de Herramienta (SGC-FORM-PAÑ-PAÑ-001): mismo
criterio que vale_pdf.py/baja_pdf.py — se escribe encima del PDF real de la
plantilla (backend/app/templates/incidencia_herramienta.pdf) en vez de
recrear el diseño a mano.

Esa plantilla salió de exportar a PDF la hoja "BASE" del Excel oficial
("Copy of SGC-FORM-PAÑ-PAÑ-001 - FORMATO INCIDENCIA HERRAMIENTA.xlsx") vía
Excel/COM, cubriendo con blanco el folio de muestra ("No. 000001") — proceso
hecho una sola vez, no en cada request (ver backend/_scratch_build_template.py,
ya borrado tras usarlo).

A diferencia de la baja, este formato es de una sola hoja y no trae ningún
espacio para foto en el diseño original — la miniatura de cada herramienta
(jalada del catálogo de Productos) se dibuja en el margen derecho, junto a
su renglón de la tabla.

Coordenadas calibradas a mano contra la plantilla con pdfplumber (mismo
método que vale_pdf.py/baja_pdf.py).
"""
from datetime import date
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter, Transformation
from reportlab.lib.colors import black, white, HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.services.uploads import UPLOAD_ROOT

_PLANTILLA = Path(__file__).resolve().parent.parent / "templates" / "incidencia_herramienta.pdf"
_ANCHO_PAGINA, _ALTO_PAGINA = 612.0, 792.0
_ROJO_FOLIO = HexColor("#C00000")

# La plantilla real (título, tabla, casillas, firmas — todo el contenido)
# deja bastante margen sin usar alrededor (medido con pdfplumber: el
# contenido va de x=81.36 a x=560.10 y de y=94.68 a y=767.55 en la hoja
# Carta), así que se ve chica al imprimir. _ESCALA agranda TODA la hoja ya
# fusionada (plantilla + lo escrito encima) para que ocupe más espacio,
# recentrada con márgenes parejos — mismo criterio que las copias del vale
# (pypdf Transformation), pero aplicado a la hoja completa en vez de a una
# copia repetida.
_ESCALA = 1.0938
_ESCALA_TX = -44.82
_ESCALA_TY = 1.26

# Tabla de herramientas: 10 renglones fijos (los que trae la plantilla real),
# medidos directo en ella.
_FILA_1 = 254.9
_ALTO_FILA = 13.06
_MAX_FILAS = 10
_TABLA_X0 = 81.8
_TABLA_X1 = 512.6
# Tope de la tabla completa (renglón 10) — de ahí para abajo empieza el
# cuadro de "Descripción del evento". Si hay menos herramientas que
# renglones, todo lo que sobra entre el último renglón usado y este tope se
# tapa de blanco y se aprovecha para mostrar la foto más grande.
_TABLA_FONDO = _FILA_1 + _MAX_FILAS * _ALTO_FILA

# Columnas de la tabla (medidas en la plantilla).
_COL_CANTIDAD_X = 102.9
_COL_ECONOMICO_X = 150.5
_COL_DESCRIPCION_X = 186.0
_COL_ESTADO_X = 382.3
_COL_VALOR_X = 469.5
_COL_DESCRIPCION_ANCHO = 149.0

# Miniatura de foto — por default, chica y en el margen derecho, junto a
# cada renglón (el formato real no trae espacio para fotos, así que se
# agrega ahí sin invadir la tabla oficial). Cuando sobra suficiente espacio
# libre (pocas herramientas, ver _fotos_libres) se muestra más grande ahí en
# vez de la miniatura de cada renglón.
_FOTO_X = 516.0
_FOTO_LADO = 11.5
_ALTO_LIBRE_MINIMO = 35.0
_FOTO_GRANDE_MAX_ALTO = 110.0
_FOTO_GRANDE_MAX_ANCHO = 150.0

# Casillas de "MARCAR EL TIPO DE INCIDENTE" — centro de cada cuadrito,
# medido en la plantilla (imágenes del checkbox).
_CHECKS = {
    "ROBO": (414.3, 183.8),
    "EXTRAVIO": (414.3, 198.8),
    "CAIDA AL MAR": (414.3, 213.8),
    "NEGLIGENCIA": (414.3, 228.8),
    "APLASTAMIENTO": (499.6, 183.8),
    "CONATO DE INCENDIO": (499.6, 198.8),
    "AUSENTISMO": (499.6, 213.8),
    "ACCIDENTE": (499.6, 228.8),
}


def _y(top):
    return _ALTO_PAGINA - top


def _fecha_str(f):
    return f.strftime("%d/%m/%Y") if isinstance(f, date) else (f or "")


def _texto(c, x, top, texto, size=8, max_width=None, size_min=None, bold=False, center=False):
    if not texto:
        return
    fuente = "Helvetica-Bold" if bold else "Helvetica"
    texto = str(texto)
    if max_width:
        tam = size
        while size_min and tam > size_min and c.stringWidth(texto, fuente, tam) > max_width:
            tam -= 0.2
        size = tam
        while texto and c.stringWidth(texto, fuente, size) > max_width:
            texto = texto[:-1]
    c.setFont(fuente, size)
    if center:
        c.drawCentredString(x, _y(top), texto)
    else:
        c.drawString(x, _y(top), texto)


def _envolver(c, texto, size, max_width, fuente="Helvetica"):
    palabras = (texto or "").split()
    lineas, actual = [], ""
    for palabra in palabras:
        prueba = f"{actual} {palabra}".strip()
        if c.stringWidth(prueba, fuente, size) <= max_width:
            actual = prueba
        else:
            if actual:
                lineas.append(actual)
            actual = palabra
    if actual:
        lineas.append(actual)
    return lineas


def _encabezado(c, incidencia):
    c.setFillColor(black)
    _texto(c, 246.0, 138.1, _fecha_str(incidencia.fecha_reporte), size=8, max_width=91)
    _texto(c, 246.0, 154.9, incidencia.hora_reporte, size=8, max_width=92)
    _texto(c, 426.0, 154.5, incidencia.lugar_fecha_suceso, size=7.5, max_width=82, size_min=6)

    c.setFillColor(_ROJO_FOLIO)
    _texto(c, 467.3, 138.9, f"No. {incidencia.folio}", size=9, bold=True, center=True, max_width=86, size_min=6.5)

    c.setFillColor(black)
    _texto(c, 191.5, 172.2, incidencia.empleado_id, size=8, max_width=146)
    _texto(c, 191.5, 187.1, incidencia.empleado_nombre, size=8, max_width=146, size_min=6)
    _texto(c, 191.5, 202.0, incidencia.empleado_puesto, size=8, max_width=146, size_min=6)
    _texto(c, 191.5, 216.9, incidencia.empleado_supervisor, size=8, max_width=146, size_min=6)
    _texto(c, 191.5, 231.8, incidencia.empleado_departamento, size=8, max_width=146, size_min=6)

    marcados = {t.strip().upper() for t in (incidencia.tipos_incidente or "").split(",") if t.strip()}
    c.setFont("Helvetica-Bold", 8)
    for tipo, (x, y) in _CHECKS.items():
        if tipo in marcados:
            c.drawCentredString(x, _y(y), "X")


def _fila_tabla(c, fila_top, item, foto_inline=True):
    base = fila_top + 9.5
    c.setFillColor(black)
    _texto(c, _COL_CANTIDAD_X, base, item.cantidad, size=8, center=True, max_width=40)
    _texto(c, _COL_ECONOMICO_X, base, item.numero_economico, size=7.5, center=True, max_width=50, size_min=6)
    _texto(c, _COL_DESCRIPCION_X, base, item.descripcion, size=7.5, max_width=_COL_DESCRIPCION_ANCHO, size_min=6)
    _texto(c, _COL_ESTADO_X, base, item.estado_previo, size=7.5, center=True, max_width=84, size_min=6)
    if item.valor_aprox is not None:
        _texto(c, _COL_VALOR_X, base, f"${item.valor_aprox:,.2f}", size=7.5, center=True, max_width=80, size_min=6)

    if not foto_inline:
        return
    ruta = UPLOAD_ROOT / item.foto_producto if item.foto_producto else None
    if ruta and ruta.is_file():
        try:
            relleno = (_ALTO_FILA - _FOTO_LADO) / 2
            c.drawImage(
                ImageReader(str(ruta)), _FOTO_X, _y(fila_top + relleno + _FOTO_LADO),
                width=_FOTO_LADO, height=_FOTO_LADO,
                preserveAspectRatio=True, anchor="c", mask="auto",
            )
        except Exception:
            pass


def _tapar_filas_sobrantes(c, desde_top):
    """Cubre de blanco los renglones de la tabla que no se usaron (menos
    herramientas que los 10 renglones fijos de la plantilla) — ese espacio
    libre se aprovecha luego para mostrar la foto más grande (ver
    _fotos_libres)."""
    if desde_top >= _TABLA_FONDO:
        return
    c.setFillColor(white)
    c.rect(_TABLA_X0, _y(_TABLA_FONDO), _TABLA_X1 - _TABLA_X0, _TABLA_FONDO - desde_top, fill=1, stroke=0)


def _fotos_libres(c, items, top_libre, alto_libre):
    """Con el espacio que dejaron los renglones sobrantes ya tapado, se
    muestra ahí la foto de cada herramienta más grande (en vez de la
    miniatura chica junto al renglón) — una junto a otra, centradas."""
    con_foto = [it for it in items if it.foto_producto and (UPLOAD_ROOT / it.foto_producto).is_file()]
    if not con_foto:
        return
    n = len(con_foto)
    alto = min(_FOTO_GRANDE_MAX_ALTO, alto_libre - 18)
    if alto < 30:
        return
    espacio = 14
    ancho_disponible = _TABLA_X1 - _TABLA_X0
    ancho = min(_FOTO_GRANDE_MAX_ANCHO, (ancho_disponible - (n - 1) * espacio) / n)
    ancho_total = ancho * n + espacio * (n - 1)
    x0 = _TABLA_X0 + (ancho_disponible - ancho_total) / 2
    top_imagen = top_libre + 8

    for i, item in enumerate(con_foto):
        x = x0 + i * (ancho + espacio)
        ruta = UPLOAD_ROOT / item.foto_producto
        try:
            c.drawImage(
                ImageReader(str(ruta)), x, _y(top_imagen + alto),
                width=ancho, height=alto,
                preserveAspectRatio=True, anchor="c", mask="auto",
            )
        except Exception:
            continue
        c.setFillColor(black)
        etiqueta = item.numero_economico or item.descripcion
        _texto(c, x + ancho / 2, top_imagen + alto + 11, etiqueta, size=7.5, center=True, max_width=ancho, size_min=6)


def _descripcion_evento(c, incidencia):
    if not incidencia.descripcion_evento:
        return
    c.setFillColor(black)
    lineas = _envolver(c, incidencia.descripcion_evento, 8, 425)
    for i, linea in enumerate(lineas[:14]):
        _texto(c, 83.3, 420 + 15.3 * i, linea, size=8)


def generar_incidencia_pdf(incidencia) -> bytes:
    buffer_overlay = BytesIO()
    c = canvas.Canvas(buffer_overlay, pagesize=(612, 792))
    c.setFillColor(black)

    _encabezado(c, incidencia)

    items = incidencia.items[:_MAX_FILAS]
    n = len(items)
    fondo_usado = _FILA_1 + n * _ALTO_FILA
    alto_libre = _TABLA_FONDO - fondo_usado
    fotos_grandes = alto_libre >= _ALTO_LIBRE_MINIMO

    for i, item in enumerate(items):
        _fila_tabla(c, _FILA_1 + i * _ALTO_FILA, item, foto_inline=not fotos_grandes)

    if n < _MAX_FILAS:
        _tapar_filas_sobrantes(c, fondo_usado)
    if fotos_grandes:
        _fotos_libres(c, items, fondo_usado, alto_libre)

    _descripcion_evento(c, incidencia)

    c.showPage()
    c.save()
    buffer_overlay.seek(0)

    overlay = PdfReader(buffer_overlay)
    base = PdfReader(str(_PLANTILLA))
    writer = PdfWriter()

    pagina = base.pages[0]
    pagina.merge_page(overlay.pages[0])

    # Agranda la hoja completa (plantilla + lo escrito encima) para
    # aprovechar el margen de sobra — ver _ESCALA arriba.
    hoja = writer.add_blank_page(width=_ANCHO_PAGINA, height=_ALTO_PAGINA)
    transformacion = Transformation().scale(_ESCALA, _ESCALA).translate(_ESCALA_TX, _ESCALA_TY)
    hoja.merge_transformed_page(pagina, transformacion)

    salida = BytesIO()
    writer.write(salida)
    salida.seek(0)
    return salida.read()
