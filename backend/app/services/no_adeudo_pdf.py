"""Constancia de No Adeudo: certifica que un empleado no tiene ninguna
herramienta a su resguardo — se exige antes de darlo de baja (ver
routers/empleados.py, endpoint no-adeudo-pdf).

A diferencia de la primera versión, ahora SIEMPRE se puede emitir aunque el
empleado todavía tenga herramienta pendiente de devolver: en ese caso el
documento se convierte en el cobro del adeudo, calculado según el % de vida
útil que el pañol le asigna a cada herramienta al momento de emitirla (0% =
se cobra el costo completo, 100% = ya cumplió su vida útil, no se cobra
nada) — `costo_a_cobrar = costo_unitario * cantidad * (1 - vida_util_pct/100)`.

Salen 2 hojas en un solo PDF:
1. Grande: el formato completo a toda la hoja (tabla con hasta 10
   herramientas).
2. Doble: el mismo contenido repetido 2 veces en una sola hoja Carta
   VERTICAL (612x792, a diferencia de la grande que es landscape), una en
   cada mitad, para cortar con tijeras — mismo criterio que el vale
   electrónico (vale_pdf.py): la copia chica se dibuja directo a su tamaño
   reducido (nunca reescalando un PDF ya dibujado con un scale() dispar,
   que achata el texto). Para que quepan 2 sin dejar la letra ilegible,
   además de encoger fuente/renglones parejo (ver `escala`) se recorta la
   tabla a `_FILAS_DOBLE` renglones (ver `max_filas`) y las columnas se
   escalan al ancho más angosto (ver `_ANCHO_UTIL_BASE`).
"""
from datetime import date
from decimal import Decimal
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

_ASSETS = Path(__file__).resolve().parent.parent / "assets"
_LOGO = _ASSETS / "logo_isp.jpg"
_AZUL_OSCURO = colors.HexColor("#1c2b3a")
_TEAL = colors.HexColor("#009999")
_GRIS = colors.HexColor("#999999")
_ROJO = colors.HexColor("#b00020")

_ANCHO_PAGINA, _ALTO_PAGINA = landscape(letter)
_MARGEN = 1.1 * cm
_MAX_HERRAMIENTAS = 10

_ENCABEZADOS = ["Fecha Adq.", "# Serie", "SKU", "Descripción", "# Económico", "Cant.", "Costo Unit.", "Vida Útil %", "Costo a Pagar"]
_ANCHOS_COL = [2.1 * cm, 2.5 * cm, 2.7 * cm, 6.7 * cm, 2.3 * cm, 1.6 * cm, 2.3 * cm, 2.0 * cm, 2.7 * cm]
_CENTRADAS = [True, False, False, False, False, True, False, True, False]
# Ancho útil de la hoja grande (landscape) — las columnas de arriba están
# medidas para llenarlo; en una hoja más angosta (la doble, en vertical) se
# escalan las columnas proporcionalmente a este mismo ancho base, nunca se
# usan tal cual (se saldrían de la hoja).
_ANCHO_UTIL_BASE = _ANCHO_PAGINA - 2 * _MARGEN


def _fecha_str(f):
    return f.strftime("%d/%m/%Y") if isinstance(f, date) else (f or "")


def _moneda(v):
    return f"${float(v):,.2f}" if v not in (None, "") else ""


def _envolver(c, texto, fuente, size, max_width):
    """Parte `texto` en varias líneas si no cabe en `max_width` a ese
    tamaño — la hoja doble es más angosta que la grande, y el texto de
    certificación (una sola línea en la grande) se salía de la hoja sin
    esto."""
    if c.stringWidth(texto, fuente, size) <= max_width:
        return [texto]
    lineas, actual = [], ''
    for palabra in texto.split(' '):
        candidato = f'{actual} {palabra}'.strip()
        if actual and c.stringWidth(candidato, fuente, size) > max_width:
            lineas.append(actual)
            actual = palabra
        else:
            actual = candidato
    if actual:
        lineas.append(actual)
    return lineas


def _texto_celda(c, fuente, size, texto, x, y_base, ancho, centrada, size_min=None):
    """Dibuja el valor de una celda de la tabla sin que se encime con la
    columna de al lado: si no cabe en `ancho` primero reduce la letra (hasta
    size_min) y, si ni así cabe, trunca — mismo criterio que `_texto` en
    vale_pdf.py. Antes esto se dibujaba con drawString/drawCentredString
    liso, sin checar ancho, y un SKU/descripción largos se encimaban sobre
    la columna siguiente."""
    if not texto:
        return
    texto = str(texto)
    if size_min is None:
        size_min = max(5.0, size * 0.6)
    max_width = ancho - 8
    tam = size
    while tam > size_min and c.stringWidth(texto, fuente, tam) > max_width:
        tam -= 0.2
    c.setFont(fuente, tam)
    while texto and c.stringWidth(texto, fuente, tam) > max_width:
        texto = texto[:-1]
    if centrada:
        c.drawCentredString(x + ancho / 2, y_base, texto)
    else:
        c.drawString(x + 4, y_base, texto)


def _checkbox(c, x, top, etiqueta, y, e):
    lado = 0.35 * cm * e
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.75)
    c.rect(x, y(top) - lado + 2 * e, lado, lado, fill=0, stroke=1)
    c.setFont("Helvetica", 9 * e)
    c.setFillColor(colors.black)
    c.drawString(x + lado + 6 * e, y(top), etiqueta)


def _dibujar_pagina(c, nombre_empleado, id_numero_empleado, puesto, folio, herramientas, hay_adeudo, observaciones, escala=1.0, max_filas=_MAX_HERRAMIENTAS, alto_lienzo=None, ancho_pagina=None):
    """Dibuja la constancia completa dentro de un lienzo de `ancho_pagina` x
    `alto_lienzo` (la hoja grande, landscape, si no se dan). El origen (0,0)
    del canvas ya debe estar puesto donde se quiere la esquina inferior
    izquierda de este lienzo (ver generar_no_adeudo_pdf, que traslada el
    canvas para la copia de arriba).

    `escala` encoge cada tamaño —fuente, renglón, logo, checkbox,
    espaciados— de forma pareja (mismo factor en X y en Y de cada
    elemento), nunca aplastando solo el alto (eso deforma las letras).
    `max_filas` reduce cuántos renglones trae la tabla —igual que el vale
    electrónico, que recorta su tabla de 8 a 6 renglones para que quepan
    las 2 copias— para no tener que encoger tanto la letra. `alto_lienzo`
    es el límite físico real del espacio disponible (la hoja completa, o
    la mitad); mientras el contenido quede por debajo de ese límite, el
    sobrante se deja como margen abajo (igual que al final de la hoja
    grande). `ancho_pagina` es el ancho real de la hoja —la doble usa una
    hoja vertical, más angosta que la grande— y las columnas de la tabla se
    escalan proporcionalmente a ese ancho (ver _ANCHO_UTIL_BASE)."""
    e = escala
    alto = _ALTO_PAGINA if alto_lienzo is None else alto_lienzo
    ancho_pag = _ANCHO_PAGINA if ancho_pagina is None else ancho_pagina

    def y(top):
        return alto - top

    margen_x = _MARGEN
    margen = _MARGEN * e
    ancho_util = ancho_pag - 2 * margen_x
    anchos_col = [a * (ancho_util / _ANCHO_UTIL_BASE) for a in _ANCHOS_COL]

    # --- Logo + franja teal con el título ---
    logo_alto = 1.6 * cm * e
    logo_ancho = logo_alto * (932 / 358)
    try:
        c.drawImage(ImageReader(str(_LOGO)), margen_x, y(margen + logo_alto), width=logo_ancho, height=logo_alto, mask="auto")
    except Exception:
        pass

    franja_x0 = margen_x + logo_ancho + 14 * e
    franja_ancho = ancho_util - logo_ancho - 14 * e - 3.6 * cm - 10 * e
    c.setFillColor(_TEAL)
    c.rect(franja_x0, y(margen + logo_alto), franja_ancho, logo_alto, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 20 * e)
    titulo = "CONSTANCIA DE ADEUDO" if hay_adeudo else "CONSTANCIA DE NO ADEUDO"
    c.drawCentredString(franja_x0 + franja_ancho / 2, y(margen + logo_alto / 2 + 7 * e), titulo)

    # Folio / Fecha, a la derecha de la franja
    caja_x0 = franja_x0 + franja_ancho + 10 * e
    c.setFont("Helvetica-Bold", 9 * e)
    c.setFillColor(colors.black)
    c.drawString(caja_x0, y(margen + 14 * e), "FOLIO:")
    c.drawString(caja_x0, y(margen + 32 * e), "FECHA:")
    c.setFont("Helvetica", 9 * e)
    c.drawString(caja_x0 + 40 * e, y(margen + 14 * e), str(folio))
    c.drawString(caja_x0 + 40 * e, y(margen + 32 * e), date.today().strftime("%d/%m/%Y"))

    # --- Checkboxes de área ---
    top_checks = margen + logo_alto + 30 * e
    _checkbox(c, margen_x, top_checks, "PAÑOL DE HERRAMIENTA", y, e)
    _checkbox(c, margen_x + 6 * cm, top_checks, "ALMACÉN", y, e)
    _checkbox(c, margen_x + 10.5 * cm, top_checks, "SEGURIDAD E HIGIENE", y, e)

    # --- Nombre / Puesto ---
    top_nombre = top_checks + 30 * e
    c.setFont("Helvetica-Bold", 10 * e)
    c.drawString(margen_x, y(top_nombre), "NOMBRE:")
    c.setFont("Helvetica", 10 * e)
    c.drawString(margen_x + 55 * e, y(top_nombre), f"{nombre_empleado} ({id_numero_empleado})")
    c.setFont("Helvetica-Bold", 10 * e)
    c.drawString(margen_x, y(top_nombre + 22 * e), "PUESTO:")
    c.setFont("Helvetica", 10 * e)
    c.drawString(margen_x + 55 * e, y(top_nombre + 22 * e), puesto or "")

    # --- Texto de certificación ---
    top_texto = top_nombre + 48 * e
    fuente_texto, tam_texto = "Helvetica-Oblique", 9.5 * e
    c.setFont(fuente_texto, tam_texto)
    c.setFillColor(_ROJO if hay_adeudo else _AZUL_OSCURO)
    if hay_adeudo:
        texto = (
            "A la fecha de este documento, la persona arriba mencionada TIENE PENDIENTE de devolver la(s) "
            "herramienta(s) de abajo — el costo a descontar ya considera su % de vida útil."
        )
    else:
        texto = "Se hace constar que la persona arriba mencionada NO tiene ninguna herramienta ni equipo a su resguardo a la fecha de este documento."
    lineas_texto = _envolver(c, texto, fuente_texto, tam_texto, ancho_util)
    for i, linea in enumerate(lineas_texto):
        c.drawString(margen_x, y(top_texto + i * 11 * e), linea)
    c.setFillColor(colors.black)

    # --- Tabla de herramientas ---
    top_tabla = top_texto + (len(lineas_texto) - 1) * 11 * e + 18 * e
    alto_fila = 20 * e
    x = margen_x
    c.setFillColor(_AZUL_OSCURO)
    c.rect(margen_x, y(top_tabla + alto_fila), ancho_util, alto_fila, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 7.6 * e)
    for encabezado, ancho, centrada in zip(_ENCABEZADOS, anchos_col, _CENTRADAS):
        _texto_celda(c, "Helvetica-Bold", 7.6 * e, encabezado, x, y(top_tabla + alto_fila - 4 * e), ancho, centrada)
        x += ancho

    filas_mostradas = herramientas[:max_filas]
    c.setFont("Helvetica", 7.8 * e)
    # El total se saca de TODAS las pendientes, no solo de las que caben en
    # la tabla — si hay más, el total no debe quedar de menos.
    total_a_descontar = sum((f.get("costo_a_cobrar") or Decimal(0)) for f in herramientas) if hay_adeudo else Decimal(0)
    costo_total_general = sum((f.get("costo_total") or Decimal(0)) for f in herramientas) if hay_adeudo else Decimal(0)
    for i in range(max_filas):
        fila_top = top_tabla + alto_fila * (i + 2)
        c.setStrokeColor(_GRIS)
        c.setLineWidth(0.5)
        c.rect(margen_x, y(fila_top), ancho_util, alto_fila, fill=0, stroke=1)
        if i < len(filas_mostradas):
            f = filas_mostradas[i]
            x = margen_x
            valores = [
                _fecha_str(f.get("fecha_adquisicion")),
                str(f.get("numero_serie") or ""),
                str(f.get("sku") or ""),
                str(f.get("descripcion") or ""),
                str(f.get("numero_economico") or ""),
                str(f.get("cantidad") or ""),
                _moneda(f.get("costo_unitario")),
                (f"{float(f['vida_util_pct']):.0f}%" if hay_adeudo and f.get("vida_util_pct") is not None else ""),
                (_moneda(f.get("costo_a_cobrar")) if hay_adeudo else ""),
            ]
            c.setFillColor(colors.black)
            for valor, ancho, centrada in zip(valores, anchos_col, _CENTRADAS):
                _texto_celda(c, "Helvetica", 7.8 * e, valor, x, y(fila_top + alto_fila - 4 * e), ancho, centrada)
                x += ancho

    top_extra = top_tabla + alto_fila * (max_filas + 2) + 14 * e
    if len(herramientas) > max_filas:
        c.setFont("Helvetica-Oblique", 7.5 * e)
        c.setFillColor(_GRIS)
        restantes = len(herramientas) - max_filas
        nota = f"+ {restantes} herramienta(s) más pendiente(s) (no caben en esta hoja)." if hay_adeudo else f"+ {restantes} herramienta(s) más en el registro histórico."
        c.drawString(margen_x, y(top_extra), nota)
        top_extra += 14 * e

    if hay_adeudo:
        c.setFont("Helvetica-Bold", 9.5 * e)
        c.setFillColor(colors.black)
        c.drawRightString(margen_x + ancho_util, y(top_extra + 6 * e), f"Costo total (sin descuento) = {_moneda(costo_total_general)}")
        top_extra += 18 * e
        c.setFont("Helvetica-Bold", 11 * e)
        c.setFillColor(_ROJO)
        c.drawRightString(margen_x + ancho_util, y(top_extra + 6 * e), f"Costo total a pagar = {_moneda(total_a_descontar)}")
        c.setFillColor(colors.black)
        top_extra += 26 * e

    # --- Observaciones ---
    top_obs = top_extra + 8 * e
    c.setFont("Helvetica-Bold", 9 * e)
    c.setFillColor(colors.black)
    c.drawString(margen_x, y(top_obs), "OBSERVACIONES:")
    c.setStrokeColor(_GRIS)
    obs_alto = 40 * e
    c.rect(margen_x, y(top_obs + obs_alto), ancho_util, obs_alto, fill=0, stroke=1)
    if observaciones:
        c.setFont("Helvetica", 8.5 * e)
        c.drawString(margen_x + 6 * e, y(top_obs + obs_alto / 2 + 3 * e), observaciones[:140])

    # --- Firmas --- (se empuja hasta cerca del borde inferior, para no
    # dejar un hueco vacío abajo)
    top_firmas = top_obs + obs_alto + 14 * e
    c.setFont("Helvetica", 9.5 * e)
    c.drawString(margen_x, y(top_firmas), "FIRMA COLABORADOR: _______________________________________")
    c.drawString(margen_x + ancho_util / 2 + 10 * e, y(top_firmas), "FIRMA PAÑOL: _______________________________________")


# Tamaño/renglones de la copia chica para la hoja doble — calibrados a mano
# (como el DELTA_COPIA_2 de vale_pdf.py) para que, con la tabla recortada a
# 6 renglones, 2 copias quepan exactas en una hoja Carta VERTICAL (más
# angosta que la grande, que es horizontal) sin encimarse y dejando ~16pt de
# margen abajo en cada mitad.
_ANCHO_DOBLE, _ALTO_DOBLE = letter  # Carta vertical (612x792) — no landscape
_ESCALA_DOBLE = 0.77
_FILAS_DOBLE = 6


def generar_no_adeudo_pdf(
    nombre_empleado: str, id_numero_empleado: str, puesto: str,
    folio: str, herramientas: list[dict], hay_adeudo: bool = False,
    observaciones: str | None = None,
) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(_ANCHO_PAGINA, _ALTO_PAGINA))

    # --- Página 1: grande, a toda la hoja ---
    _dibujar_pagina(c, nombre_empleado, id_numero_empleado, puesto, folio, herramientas, hay_adeudo, observaciones, escala=1.0)
    c.showPage()

    # --- Página 2: el mismo contenido, 2 veces en una hoja vertical (mitad y
    # mitad) --- cada copia se dibuja directo a su tamaño chico (fuente/
    # renglones ya reducidos a propósito, nunca aplastando un PDF grande ya
    # dibujado). Esta hoja es Carta VERTICAL (612x792), a diferencia de la
    # hoja grande (landscape) — algunas impresoras sacan rotada/de lado una
    # hoja landscape si su bandeja es Carta vertical, por eso esta se arma
    # directo en vertical.
    c.setPageSize((_ANCHO_DOBLE, _ALTO_DOBLE))
    mitad = _ALTO_DOBLE / 2
    c.saveState()
    _dibujar_pagina(
        c, nombre_empleado, id_numero_empleado, puesto, folio, herramientas, hay_adeudo, observaciones,
        escala=_ESCALA_DOBLE, max_filas=_FILAS_DOBLE, alto_lienzo=mitad, ancho_pagina=_ANCHO_DOBLE,
    )
    c.restoreState()

    c.saveState()
    c.translate(0, mitad)
    _dibujar_pagina(
        c, nombre_empleado, id_numero_empleado, puesto, folio, herramientas, hay_adeudo, observaciones,
        escala=_ESCALA_DOBLE, max_filas=_FILAS_DOBLE, alto_lienzo=mitad, ancho_pagina=_ANCHO_DOBLE,
    )
    c.restoreState()

    # Línea punteada para guiar el corte, justo al centro.
    c.setDash(4, 3)
    c.setStrokeColor(_GRIS)
    c.line(0, mitad, _ANCHO_DOBLE, mitad)
    c.showPage()
    c.save()

    buffer.seek(0)
    return buffer.read()
