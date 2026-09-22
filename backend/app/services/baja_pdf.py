"""Baja de Herramienta y Equipos (SGC-FORM-PAÑ-PAÑ-002).

Dos caminos, según qué tan grande sea la baja:

- **Pocas herramientas y pocas fotos** (lo normal — 1 o 2 piezas): se dibuja
  una hoja compacta desde cero (_generar_compacto), del mismo estilo que la
  plantilla real (mismo logo, mismos colores, misma tipografía) pero SOLO
  con los renglones/fotos que de verdad hay — nada de 18 renglones vacíos ni
  casillas de "INSERTE IMAGEN AQUI" sin usar. Todo cabe en 1 hoja si alcanza
  (tabla + Observaciones + Firma + Nota + fotos), o 2 si las fotos no caben
  en la misma.
- **Baja grande** (más de _UMBRAL_COMPACTO herramientas): se usa la
  plantilla real completa (_generar_con_plantilla), escribiendo los datos
  directo sobre el PDF real de la plantilla (backend/app/templates/
  baja_herramienta.pdf) — igual que vale_pdf.py, no se recrea el diseño a
  mano, se le escribe encima. Esa plantilla salió de exportar a PDF la hoja
  "BAJA DE HERRAMIENTA" del Excel oficial ("Copy of SGC-FORM-PAÑ-PAÑ-002 -
  FORMATO DE BAJA DE HERRAMIENTA MCR.xlsm") vía Excel/COM, después de borrar
  los datos de muestra y las 3 fotos de ejemplo (dejando el logo y las
  líneas de firma intactos) — un proceso hecho una sola vez, no en cada
  request. Trae 20 renglones fijos (19 en la página 1, el 20o al inicio de
  la página 2) y 4 espacios de foto fijos (páginas 2 y 3) — si hay más de 4
  fotos se agregan páginas extra reutilizando el diseño de la página 3.

Coordenadas calibradas a mano contra la plantilla con pdfplumber (mismo
método que vale_pdf.py); los colores/proporciones de la hoja compacta salen
de medir esa misma plantilla, para que las dos se vean como el mismo
documento.
"""
from datetime import date
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.colors import black, HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

from app.services.uploads import UPLOAD_ROOT

_ASSETS = Path(__file__).resolve().parent.parent / "assets"
_LOGO = _ASSETS / "logo_isp.jpg"
_PLANTILLA = Path(__file__).resolve().parent.parent / "templates" / "baja_herramienta.pdf"
_ANCHO_PAGINA, _ALTO_PAGINA = 612.0, 792.0
_MAX_FILAS_P1 = 19
_MAX_FILAS_TOTAL = 20
_GRIS = HexColor("#999999")

# A partir de cuántas herramientas se usa la plantilla real completa en vez
# de la hoja compacta — con más de esto, compactar ya no ahorra papel de
# verdad (la plantilla real ya trae 19 renglones en su primera hoja).
_UMBRAL_COMPACTO = 12

# Colores medidos directo en la plantilla real (mismo azul marino de la
# franja del título, mismo celeste de las casillas FECHA/FOLIO, mismo verde/
# rojo de sus valores, mismo durazno de la nota) — para que la hoja compacta
# se vea como parte del mismo documento.
_NAVY = HexColor("#273246")
_AZUL_CLARO = HexColor("#C5D9F1")
_VERDE_FECHA = HexColor("#00863D")
_ROJO_FOLIO = HexColor("#C00000")
_NOTA_BG = HexColor("#FDF2E8")
_NOTA_FG = HexColor("#7E5008")

_NOTA_IMPORTANTE = (
    "IMPORTANTE: Toda herramienta o equipo relacionado en este formato debe contar obligatoriamente con un "
    'diagnóstico técnico previo, emitido por el personal de mantenimiento responsable o personal técnico, '
    'validando su estado como "No Reparable" o "Vida Útil Concluida".'
)

# Columnas de la tabla de herramientas (medidas en la plantilla).
_COL_X = [52, 140, 303, 388]
_COL_ANCHO = [86, 161, 83, 169]

# Renglones de la tabla en la página 1 — el primero empieza justo debajo
# del encabezado (top=211.3 en la plantilla), cada uno 27.1pt más abajo.
_FILA_1 = 211.3
_ALTO_FILA = 27.1

# Offset horizontal fijo entre la columna izquierda y derecha de cada par de
# fotos (foto impar/par), medido en la plantilla.
_FOTO_OFFSET_X = 255.1
_FOTO_ANCHOS = [249, 252.7]


def _y(top):
    """"Distancia desde arriba" (como se mide a simple vista en la
    plantilla) a la coordenada Y de reportlab (origen abajo) — mismo
    criterio que vale_pdf.py."""
    return _ALTO_PAGINA - top


def _fecha_str(f):
    return f.strftime("%d/%m/%Y") if isinstance(f, date) else (f or "")


def _texto(c, x, top, texto, size=9, max_width=None, size_min=None, bold=False):
    """Dibuja texto; si no cabe en max_width, primero reduce el tamaño de
    letra (hasta size_min) y si aun así no cabe, trunca — mismo criterio que
    vale_pdf.py, para no desbordar sobre la columna de al lado."""
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


def _encabezado(c, baja, top_fecha, top_persona, tapar_folio=False):
    if tapar_folio:
        # La 2a hoja trae el folio por fórmula (=H3) en vez de directo — con
        # el molde en blanco (H3 vacío) esa fórmula queda en "No. 00000" en
        # vez de en blanco, y se ve encimado con el folio real. Se tapa con
        # un rectángulo blanco antes de escribir encima.
        c.setFillColor(HexColor("#FFFFFF"))
        c.rect(426, _y(343), 133, 18, fill=1, stroke=0)

    c.setFillColor(black)
    _texto(c, 282, top_fecha, _fecha_str(baja.fecha), size=11, max_width=100)
    _texto(c, 430, top_fecha, str(baja.folio), size=12, max_width=125, bold=True)

    _texto(c, 57, top_persona, baja.tecnico_empleado_id, size=11, max_width=76, size_min=7)
    _texto(c, 144, top_persona, baja.tecnico_nombre, size=11, max_width=276, size_min=7)
    _texto(c, 430, top_persona, baja.tecnico_puesto, size=10, max_width=124, size_min=7)

    _texto(c, 57, top_persona + 31, baja.almacenista_empleado_id, size=11, max_width=76, size_min=7)
    _texto(c, 144, top_persona + 31, baja.almacenista_nombre, size=11, max_width=276, size_min=7)
    _texto(c, 430, top_persona + 31, baja.almacenista_puesto, size=10, max_width=124, size_min=7)


def _fila_tabla(c, top, item):
    valores = [item.codigo_sai_sku, item.descripcion, item.numero_economico, item.diagnostico]
    for x, ancho, valor in zip(_COL_X, _COL_ANCHO, valores):
        _texto(c, x + 3, top, valor, size=8, max_width=ancho - 5, size_min=6)


def _pareja_fotos(c, fotos, top_imagen, alto_imagen, top_texto):
    cols_x = [52, 52 + _FOTO_OFFSET_X]
    for i in range(min(2, len(fotos))):
        foto = fotos[i]
        x = cols_x[i]
        ancho = _FOTO_ANCHOS[i]
        ruta = UPLOAD_ROOT / foto.foto if foto.foto else None
        if ruta and ruta.is_file():
            try:
                c.drawImage(
                    ImageReader(str(ruta)), x, _y(top_imagen + alto_imagen),
                    width=ancho, height=alto_imagen,
                    preserveAspectRatio=True, anchor="c", mask="auto",
                )
            except Exception:
                pass
        c.setFillColor(black)
        _texto(c, x + 90, top_texto, foto.descripcion, size=8, max_width=ancho - 95, size_min=6)
        _texto(c, x + 90, top_texto + 13, foto.numeros_economicos, size=8, max_width=ancho - 95, size_min=6)


def _pagina1(c, baja):
    _encabezado(c, baja, top_fecha=104, top_persona=142)
    for i, item in enumerate(baja.items[:_MAX_FILAS_P1]):
        _fila_tabla(c, _FILA_1 + (i + 1) * _ALTO_FILA - 8, item)


def _pagina2(c, baja):
    # Renglón 20 de la tabla (si lo hay) — el único que no cupo en la página 1.
    if len(baja.items) > _MAX_FILAS_P1:
        _fila_tabla(c, 73, baja.items[_MAX_FILAS_P1])

    if len(baja.items) > _MAX_FILAS_TOTAL:
        c.setFont("Helvetica-Oblique", 7)
        c.setFillColor(_GRIS)
        c.drawString(59, _y(96), f"+ {len(baja.items) - _MAX_FILAS_TOTAL} herramienta(s) más — ver el registro en el sistema.")

    if baja.observaciones:
        c.setFillColor(black)
        for i, linea in enumerate(_envolver(c, baja.observaciones, 9, 495)[:5]):
            _texto(c, 59, 122 + 12 * i, linea, size=9)

    # El encabezado se repite antes de "EVIDENCIA FOTOGRAFICA" (así viene en
    # la plantilla real: es una hoja aparte pensada para entregarse sola).
    _encabezado(c, baja, top_fecha=340, top_persona=377, tapar_folio=True)
    _pareja_fotos(c, baja.fotos[0:2], top_imagen=453, alto_imagen=164, top_texto=634)


def _pagina_fotos_extra(c, fotos_par):
    _pareja_fotos(c, fotos_par, top_imagen=55, alto_imagen=88, top_texto=159)


def _generar_con_plantilla(baja) -> bytes:
    """Baja grande (más de _UMBRAL_COMPACTO herramientas): usa la plantilla
    real completa (20 renglones fijos, 4 espacios de foto fijos + páginas
    extra si hacen falta más)."""
    base = PdfReader(str(_PLANTILLA))
    writer = PdfWriter()

    overlay1 = BytesIO()
    c = canvas.Canvas(overlay1, pagesize=(_ANCHO_PAGINA, _ALTO_PAGINA))
    _pagina1(c, baja)
    c.showPage()
    c.save()
    overlay1.seek(0)
    p1 = base.pages[0]
    p1.merge_page(PdfReader(overlay1).pages[0])
    writer.add_page(p1)

    overlay2 = BytesIO()
    c = canvas.Canvas(overlay2, pagesize=(_ANCHO_PAGINA, _ALTO_PAGINA))
    _pagina2(c, baja)
    c.showPage()
    c.save()
    overlay2.seek(0)
    p2 = base.pages[1]
    p2.merge_page(PdfReader(overlay2).pages[0])
    writer.add_page(p2)

    overlay3 = BytesIO()
    c = canvas.Canvas(overlay3, pagesize=(_ANCHO_PAGINA, _ALTO_PAGINA))
    _pagina_fotos_extra(c, baja.fotos[2:4])
    c.showPage()
    c.save()
    overlay3.seek(0)
    p3 = base.pages[2]
    p3.merge_page(PdfReader(overlay3).pages[0])
    writer.add_page(p3)

    # Fotos 5 en adelante: páginas extra reutilizando el diseño de la
    # página 3 (2 fotos cada una) — la plantilla real solo trae 4 espacios,
    # pero aquí el número de fotos es libre.
    fotos_extra = baja.fotos[4:]
    for i in range(0, len(fotos_extra), 2):
        overlay = BytesIO()
        c = canvas.Canvas(overlay, pagesize=(_ANCHO_PAGINA, _ALTO_PAGINA))
        _pagina_fotos_extra(c, fotos_extra[i:i + 2])
        c.showPage()
        c.save()
        overlay.seek(0)
        p_extra = PdfReader(str(_PLANTILLA)).pages[2]
        p_extra.merge_page(PdfReader(overlay).pages[0])
        writer.add_page(p_extra)

    # El documento real es una hoja de doble cara (tabla al frente, evidencia
    # fotográfica al reverso — por eso el encabezado se repite antes de esa
    # sección). Esta preferencia hace que "Imprimir a doble cara" salga
    # marcado solo al abrir el diálogo de impresión (respetada por Adobe
    # Acrobat/Reader y por la impresión nativa de Android; el navegador de
    # escritorio no la lee, ahí se activa aparte desde imprimir.js).
    vp = writer.create_viewer_preferences()
    vp.duplex = "/DuplexFlipLongEdge"

    salida = BytesIO()
    writer.write(salida)
    salida.seek(0)
    return salida.read()


# ==========================================================================
# Hoja compacta (baja chica: pocas herramientas, pocas o ninguna foto)
# ==========================================================================

_MARGEN_C = 51.5
_ANCHO_UTIL_C = _ANCHO_PAGINA - 2 * _MARGEN_C  # 509
_ALTO_FILA_C = 22
_PIE_TOP = 757.5


def _pie_pagina_compacto(c):
    c.setFont("Helvetica", 8)
    c.setFillColor(_GRIS)
    c.drawString(_MARGEN_C, _y(_PIE_TOP + 10), "Formato Baja de Herramienta")
    c.drawCentredString(_ANCHO_PAGINA / 2, _y(_PIE_TOP + 10), "SGC-FORM-PAÑ-PAÑ-002 R0")
    c.drawRightString(_ANCHO_PAGINA - _MARGEN_C, _y(_PIE_TOP + 10), "05-Junio-2026")


def _encabezado_compacto(c, baja, top, titulo):
    """Logo + franja con título + FECHA/FOLIO + técnico/almacenista — mismos
    colores y proporciones que la plantilla real (medidos con pdfplumber),
    dibujados desde cero porque aquí no hay PDF de plantilla debajo. Regresa
    el "top" donde puede empezar lo siguiente."""
    alto_logo = 36
    logo_ancho = alto_logo * (932 / 358)
    try:
        c.drawImage(ImageReader(str(_LOGO)), _MARGEN_C, _y(top + alto_logo), width=logo_ancho, height=alto_logo, mask="auto")
    except Exception:
        pass

    banner_x0 = _MARGEN_C + logo_ancho + 8
    banner_ancho = (_ANCHO_PAGINA - _MARGEN_C) - banner_x0
    c.setFillColor(_NAVY)
    c.rect(banner_x0, _y(top + alto_logo), banner_ancho, alto_logo, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(banner_x0 + banner_ancho / 2, _y(top + alto_logo / 2 + 5), titulo)

    # FECHA / FOLIO
    top_ff = top + alto_logo + 4
    alto_ff = 25.1
    c.setFillColor(_AZUL_CLARO)
    c.rect(206.8, _y(top_ff + alto_ff), 69.7, alto_ff, fill=1, stroke=0)
    c.rect(387.3, _y(top_ff + alto_ff), 38, alto_ff, fill=1, stroke=0)
    c.setStrokeColor(black)
    c.setLineWidth(0.75)
    c.rect(_MARGEN_C, _y(top_ff + alto_ff), _ANCHO_UTIL_C, alto_ff, fill=0, stroke=1)
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(224.9, _y(top_ff + 17), "FECHA:")
    c.drawString(391.5, _y(top_ff + 17), "FOLIO:")
    c.setFillColor(_VERDE_FECHA)
    _texto(c, 282, top_ff + 17, _fecha_str(baja.fecha), size=11, max_width=98)
    c.setFillColor(_ROJO_FOLIO)
    _texto(c, 430, top_ff + 17, str(baja.folio), size=12, max_width=125, bold=True)

    # Técnico evaluador / Personal de almacén
    top_p = top_ff + alto_ff + 5.7
    alto_p = 62.7
    c.setStrokeColor(black)
    c.rect(_MARGEN_C, _y(top_p + alto_p), _ANCHO_UTIL_C, alto_p, fill=0, stroke=1)
    c.line(_MARGEN_C, _y(top_p + alto_p / 2), _MARGEN_C + _ANCHO_UTIL_C, _y(top_p + alto_p / 2))
    for div_x in (138.7, 425.2):
        c.line(div_x, _y(top_p), div_x, _y(top_p + alto_p))

    def _fila_persona(sub_top, etiqueta2, empleado_id, nombre, puesto):
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 6)
        c.drawString(_MARGEN_C + 1.5, _y(sub_top + 6), "No. DE EMPLEADO:")
        c.drawString(139.7, _y(sub_top + 6), etiqueta2)
        c.drawString(426.5, _y(sub_top + 6), "PUESTO:")
        _texto(c, _MARGEN_C + 5, sub_top + 23, empleado_id, size=11, max_width=76, size_min=7)
        _texto(c, 144, sub_top + 23, nombre, size=11, max_width=276, size_min=7)
        _texto(c, 430, sub_top + 23, puesto, size=10, max_width=124, size_min=7)

    _fila_persona(top_p, "NOMBRE COMPLETO DEL TECNICO EVALUADOR:", baja.tecnico_empleado_id, baja.tecnico_nombre, baja.tecnico_puesto)
    _fila_persona(top_p + alto_p / 2, "NOMBRE COMPLETO DE PERSONAL DE ALMACEN:", baja.almacenista_empleado_id, baja.almacenista_nombre, baja.almacenista_puesto)

    return top_p + alto_p


def _medidas_tabla(n_items):
    """Con pocas herramientas se agranda la tabla (renglón y letra más
    grandes) en vez de dejarla chica con toda la hoja vacía debajo."""
    if n_items <= 2:
        return {"alto_header": 30, "alto_fila": 34, "size_header": 10, "size_fila": 10.5}
    if n_items <= 5:
        return {"alto_header": 26, "alto_fila": 26, "size_header": 9, "size_fila": 9}
    return {"alto_header": 24, "alto_fila": _ALTO_FILA_C, "size_header": 8, "size_fila": 8}


def _tabla_compacta(c, baja, top):
    """Tabla de herramientas con exactamente las filas que hay — nada de
    renglones vacíos de relleno."""
    m = _medidas_tabla(len(baja.items))
    alto_header = m["alto_header"]
    c.setFillColor(_NAVY)
    c.rect(_MARGEN_C, _y(top + alto_header), _ANCHO_UTIL_C, alto_header, fill=1, stroke=0)
    c.setFillColor(colors.white)
    x = _MARGEN_C
    for encabezado, ancho in zip(["CODIGO SAI (SKU)", "DESCRIPCION", "NUMERO ECONOMICO", "DIAGNOSTICO"], _COL_ANCHO):
        _texto(c, x + 4, top + alto_header - 9, encabezado, size=m["size_header"], bold=True, max_width=ancho - 6, size_min=6)
        x += ancho

    fila_top = top + alto_header
    for item in baja.items:
        c.setStrokeColor(_GRIS)
        c.setLineWidth(0.5)
        c.rect(_MARGEN_C, _y(fila_top + m["alto_fila"]), _ANCHO_UTIL_C, m["alto_fila"], fill=0, stroke=1)
        c.setFillColor(black)
        valores = [item.codigo_sai_sku, item.descripcion, item.numero_economico, item.diagnostico]
        xi = _MARGEN_C
        for valor, ancho in zip(valores, _COL_ANCHO):
            _texto(c, xi + 3, fila_top + m["alto_fila"] - 9, valor, size=m["size_fila"], max_width=ancho - 5, size_min=6)
            xi += ancho
        fila_top += m["alto_fila"]

    return fila_top


def _observaciones_firma_nota_compacto(c, baja, top, alto_obs=42):
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(_MARGEN_C, _y(top + 10), "OBSERVACIONES:")
    top_obs_caja = top + 14
    c.setStrokeColor(_GRIS)
    c.rect(_MARGEN_C, _y(top_obs_caja + alto_obs), _ANCHO_UTIL_C, alto_obs, fill=0, stroke=1)
    if baja.observaciones:
        c.setFont("Helvetica", 9)
        max_lineas = max(3, int(alto_obs / 12))
        for i, linea in enumerate(_envolver(c, baja.observaciones, 9, _ANCHO_UTIL_C - 12)[:max_lineas]):
            _texto(c, _MARGEN_C + 6, top_obs_caja + 14 + 12 * i, linea, size=9)

    top_firma = top_obs_caja + alto_obs + 24
    c.setStrokeColor(black)
    c.setLineWidth(0.75)
    c.line(_MARGEN_C, _y(top_firma), _MARGEN_C + 220, _y(top_firma))
    c.line(_MARGEN_C + 255, _y(top_firma), _MARGEN_C + 475, _y(top_firma))
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(black)
    c.drawCentredString(_MARGEN_C + 110, _y(top_firma + 11), "FIRMA ALMACENISTA")
    c.drawCentredString(_MARGEN_C + 365, _y(top_firma + 11), "FIRMA PERSONAL TÉCNICO")

    top_nota = top_firma + 24
    lineas_nota = _envolver(c, _NOTA_IMPORTANTE, 7.5, _ANCHO_UTIL_C - 12, fuente="Helvetica-Oblique")
    alto_nota = 8 + 10 * len(lineas_nota)
    c.setFillColor(_NOTA_BG)
    c.rect(_MARGEN_C, _y(top_nota + alto_nota), _ANCHO_UTIL_C, alto_nota, fill=1, stroke=0)
    c.setFont("Helvetica-Oblique", 7.5)
    c.setFillColor(_NOTA_FG)
    for i, linea in enumerate(lineas_nota):
        c.drawString(_MARGEN_C + 6, _y(top_nota + 13 + 10 * i), linea)

    return top_nota + alto_nota


def _fotos_compactas(c, fotos, top, alto_disponible):
    """Evidencia fotográfica compacta: solo las fotos que hay, sin casillas
    vacías de más, agrandadas para llenar el espacio disponible en vez de
    dejarlo en blanco. Una foto sola (sin pareja, ej. es la única de toda la
    baja) ocupa el ancho completo, centrada, en vez de quedar apachurrada en
    la mitad izquierda."""
    alto_texto = 24
    gap_fila = 14
    n_filas = (len(fotos) + 1) // 2
    alto_imagen = (alto_disponible - n_filas * (alto_texto + gap_fila)) / max(n_filas, 1)
    alto_imagen = min(max(alto_imagen, 100), 380)

    cols_x = [_MARGEN_C, _MARGEN_C + _FOTO_OFFSET_X]
    fila_top = top
    for i in range(0, len(fotos), 2):
        par = fotos[i:i + 2]
        solita = len(par) == 1
        for j, foto in enumerate(par):
            x = _MARGEN_C if solita else cols_x[j]
            ancho = _ANCHO_UTIL_C if solita else _FOTO_ANCHOS[j]
            c.setStrokeColor(_GRIS)
            c.rect(x, _y(fila_top + alto_imagen), ancho, alto_imagen, fill=0, stroke=1)
            ruta = UPLOAD_ROOT / foto.foto if foto.foto else None
            if ruta and ruta.is_file():
                try:
                    c.drawImage(
                        ImageReader(str(ruta)), x + 2, _y(fila_top + alto_imagen) + 2,
                        width=ancho - 4, height=alto_imagen - 4,
                        preserveAspectRatio=True, anchor="c", mask="auto",
                    )
                except Exception:
                    pass
            c.setFillColor(black)
            _texto(c, x + 90, fila_top + alto_imagen + 15, foto.descripcion, size=8, max_width=ancho - 95, size_min=6)
            _texto(c, x + 90, fila_top + alto_imagen + 29, foto.numeros_economicos, size=8, max_width=ancho - 95, size_min=6)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(x, _y(fila_top + alto_imagen + 15), "DESCRIPCIÓN:")
            c.drawString(x, _y(fila_top + alto_imagen + 29), "# ECONÓMICO:")
        fila_top += alto_imagen + alto_texto + gap_fila
    return fila_top


def _altura_fija_sin_fotos(baja):
    """Alto (en pt) del encabezado + tabla + observaciones/firma/nota, SIN
    contar fotos — para saber cuánto espacio libre queda en la hoja."""
    top = 54.2 + 36 + 4 + 25.1 + 5.7 + 62.7  # encabezado
    m = _medidas_tabla(len(baja.items))
    top += m["alto_header"] + len(baja.items) * m["alto_fila"]  # tabla
    top += 5 + 10 + 10 + 14 + 42 + 24 + 22 + 24  # gaps + observaciones + firma + nota (aprox, alto_obs base)
    return top


def _generar_compacto(baja) -> bytes:
    """Baja chica: se dibuja SOLO lo que hay (sin renglones ni casillas de
    foto vacías), agrandado para llenar la hoja — todo en 1 sola si alcanza,
    o 2 si las fotos no caben cómodas junto con la tabla."""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(_ANCHO_PAGINA, _ALTO_PAGINA))

    alto_disponible_total = _PIE_TOP - 15
    fijo = _altura_fija_sin_fotos(baja)
    espacio_libre = alto_disponible_total - fijo

    # ¿Caben las fotos junto con la tabla en la misma hoja? Solo si, después
    # de poner el banner "EVIDENCIA FOTOGRAFICA", queda un mínimo razonable
    # para que las fotos no se vean apachurradas.
    n_filas_foto = (len(baja.fotos) + 1) // 2
    minimo_fotos = n_filas_foto * (100 + 24 + 14)
    cabe_junto = (espacio_libre - 40) >= minimo_fotos if baja.fotos else True

    top = _encabezado_compacto(c, baja, top=54.2, titulo="BAJA DE HERRAMIENTA Y EQUIPOS")
    top = _tabla_compacta(c, baja, top + 5)

    # Sin fotos (o si las fotos se van a otra hoja), Observaciones se agranda
    # para llenar el espacio que sobra en esta hoja en vez de dejarlo en
    # blanco; si las fotos sí van junto con la tabla, se queda compacta y el
    # espacio libre se lo llevan ellas.
    if cabe_junto and baja.fotos:
        alto_obs = 42
    else:
        alto_obs = min(max(42 + espacio_libre, 42), 260)
    top = _observaciones_firma_nota_compacto(c, baja, top + 10, alto_obs=alto_obs)

    if baja.fotos:
        if not cabe_junto:
            _pie_pagina_compacto(c)
            c.showPage()
            top = _encabezado_compacto(c, baja, top=54.2, titulo="EVIDENCIA FOTOGRAFICA")
            alto_para_fotos = (_PIE_TOP - 15) - (top + 10)
        else:
            top += 20
            c.setFillColor(_NAVY)
            c.rect(_MARGEN_C, _y(top + 20), _ANCHO_UTIL_C, 20, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 11)
            c.drawCentredString(_ANCHO_PAGINA / 2, _y(top + 15), "EVIDENCIA FOTOGRAFICA:")
            top += 20
            alto_para_fotos = (_PIE_TOP - 15) - (top + 10)
        _fotos_compactas(c, baja.fotos, top + 10, alto_para_fotos)

    _pie_pagina_compacto(c)
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()


def generar_baja_pdf(baja) -> bytes:
    if len(baja.items) <= _UMBRAL_COMPACTO:
        return _generar_compacto(baja)
    return _generar_con_plantilla(baja)
