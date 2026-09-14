"""PDF imprimible del resguardo actual de un empleado — mismos datos que
generan el Excel (`inventario_excel.py` + `resguardo_actual_de`), pero
armado desde cero con reportlab en vez de convertir el .xlsm real: el
contenido tiene un número de renglones variable (cada empleado trae los que
trae), así que no hay coordenadas fijas que calibrar como en el vale — en
cambio se recrea aquí el mismo estilo visual de la plantilla oficial (logo,
título, íconos, franja de "Costo Total Resguardo", colores).

Todo cabe en una sola hoja siempre que se pueda: la letra/el relleno de la
tabla se van encogiendo (hasta un mínimo legible) para que quepan más
renglones, como "Fit Sheet on One Page" de Excel. Si aun así el resguardo
trae tantas herramientas que ni con la letra mínima cabe todo, se deja que
pagine solo (mejor eso que cortar datos) — pero es un caso extremo que no
debería pasar en la práctica.
"""
from datetime import date
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph

_ASSETS = Path(__file__).resolve().parent.parent / "assets"
_LOGO = _ASSETS / "logo_isp.jpg"
_ICONO_TRABAJADOR = _ASSETS / "icono_trabajador.png"
_ICONO_COSTO = _ASSETS / "icono_costo.png"
_AZUL_OSCURO = colors.HexColor("#1c2b3a")
_TEAL = colors.HexColor("#00afaa")

_PAGINA = landscape(letter)
_ANCHO_PAGINA, _ALTO_PAGINA = _PAGINA
_MARGEN = 1.2 * cm
_ALTO_ENCABEZADO = 3.9 * cm
_ANCHO_TABLA = _ANCHO_PAGINA - 2 * _MARGEN
_ALTO_TABLA_DISPONIBLE = _ALTO_PAGINA - _ALTO_ENCABEZADO - _MARGEN

_ENCABEZADOS = ["Fecha Adq.", "# Vale", "Codigo SAI SKU", "Descripción", "UDM", "#Econom", "Qty", "Observaciones", "Costo Unit.", "Costo Total"]
_ANCHOS_COL = [2.1 * cm, 1.6 * cm, 2.8 * cm, 6.5 * cm, 1.4 * cm, 2.0 * cm, 1.2 * cm, 4.0 * cm, 2.2 * cm, 2.2 * cm]

# De más grande a más chico — se prueba en orden hasta que quepa completa en
# una sola hoja; si ni la última (más chica) cabe, esa es la que se usa de
# todos modos y el documento pagina solo (ver generar_resguardo_pdf).
_CANDIDATOS_FUENTE = [(8, 4), (7, 3), (6, 2.2), (5.5, 1.6), (5, 1.2)]


def _fecha_str(f):
    return f.strftime("%d/%m/%Y") if isinstance(f, date) else (f or "")


def _dibujar_encabezado(nombre_empleado, id_numero_empleado, puesto, total, c, doc):
    """Logo + ícono de trabajador + título + cuadro de empleado + franja de
    costo total, calcado del estilo de la plantilla .xlsm (los íconos son
    los mismos PNG que trae esa plantilla, extraídos una sola vez) — se
    dibuja directo sobre el canvas de cada página (no es parte de la tabla,
    que puede paginarse sola en el caso extremo de un resguardo enorme).
    Todo se posiciona desde el borde FÍSICO de arriba de la hoja (no desde
    donde empieza la tabla) — el canvas no respeta doc.topMargin, solo lo
    respetan los flowables (la tabla); ese margen se agrandó a propósito
    (_ALTO_ENCABEZADO) para dejarle este espacio al encabezado."""
    margen = doc.leftMargin
    techo = _ALTO_PAGINA - 0.5 * cm

    logo_alto = 1.5 * cm
    logo_ancho = logo_alto * (932 / 358)
    try:
        c.drawImage(ImageReader(str(_LOGO)), margen, techo - logo_alto, width=logo_ancho, height=logo_alto, mask="auto")
    except Exception:
        pass

    icono_lado = 1.7 * cm
    try:
        c.drawImage(
            ImageReader(str(_ICONO_TRABAJADOR)), margen + (logo_ancho - icono_lado) / 2, techo - logo_alto - 0.15 * cm - icono_lado,
            width=icono_lado, height=icono_lado, mask="auto",
        )
    except Exception:
        pass

    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(_AZUL_OSCURO)
    c.drawString(margen + logo_ancho + 20, techo - logo_alto / 2 - 7, "INVENTARIO DE HERRAMIENTA")

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#555555"))
    fecha_hoy = date.today().strftime("%d/%m/%Y")
    c.drawRightString(_ANCHO_PAGINA - doc.rightMargin, techo - 8, f"FECHA: {fecha_hoy}")

    # Cuadro de empleado (nombre/puesto), a la derecha del logo/título
    caja_x0 = margen + logo_ancho + 20
    caja_y0 = techo - logo_alto - 6
    caja_ancho = 9 * cm
    c.setStrokeColor(colors.HexColor("#999999"))
    c.setLineWidth(0.75)
    c.rect(caja_x0, caja_y0 - 0.9 * cm, caja_ancho, 0.9 * cm, fill=0, stroke=1)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.black)
    c.drawCentredString(caja_x0 + caja_ancho / 2, caja_y0 - 0.6 * cm, f"{nombre_empleado} ({id_numero_empleado})")
    c.rect(caja_x0, caja_y0 - 1.7 * cm, caja_ancho, 0.8 * cm, fill=0, stroke=1)
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(caja_x0 + caja_ancho / 2, caja_y0 - 1.4 * cm, puesto or "")

    # Franja de "Costo Total Resguardo" — a la derecha, con el ícono de
    # monedas encima (fuera de la franja, como en la plantilla)
    franja_ancho = 6.5 * cm
    franja_x0 = _ANCHO_PAGINA - doc.rightMargin - franja_ancho
    franja_y0 = caja_y0 - 1.7 * cm
    icono_costo_lado = 1.1 * cm
    try:
        c.drawImage(
            ImageReader(str(_ICONO_COSTO)), franja_x0 - icono_costo_lado - 8, franja_y0 + 1.5 * cm - icono_costo_lado,
            width=icono_costo_lado, height=icono_costo_lado, mask="auto",
        )
    except Exception:
        pass
    c.setFillColor(_TEAL)
    c.roundRect(franja_x0, franja_y0, franja_ancho, 1.5 * cm, 4, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(franja_x0 + franja_ancho / 2, franja_y0 + 1.05 * cm, "Costo Total Resguardo")
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(franja_x0 + franja_ancho / 2, franja_y0 + 0.35 * cm, f"${total:,.2f}")


def _construir_tabla(filas: list[dict], tam_fuente: float, relleno: float) -> Table:
    estilo_celda = ParagraphStyle("celda", fontSize=tam_fuente, leading=tam_fuente + 2)
    filas_tabla = [_ENCABEZADOS]
    for f in filas:
        costo = f.get("costo_unitario") or 0
        cantidad = f.get("cantidad") or 0
        total_linea = float(costo) * float(cantidad)
        filas_tabla.append([
            _fecha_str(f.get("fecha")),
            f.get("numero_de_vale") or "",
            f.get("sku") or "",
            Paragraph(f.get("descripcion") or "", estilo_celda),
            f.get("udm") or "",
            f.get("numero_economico") or "",
            str(f.get("cantidad") or ""),
            Paragraph(f.get("observaciones") or "", estilo_celda),
            f"${float(costo):,.2f}" if costo else "",
            f"${total_linea:,.2f}" if total_linea else "",
        ])

    tabla = Table(filas_tabla, colWidths=_ANCHOS_COL, repeatRows=1)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), _AZUL_OSCURO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), tam_fuente),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (6, 1), (6, -1), "CENTER"),
        ("ALIGN", (8, 1), (9, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
        ("TOPPADDING", (0, 0), (-1, -1), relleno),
        ("BOTTOMPADDING", (0, 0), (-1, -1), relleno),
    ]))
    return tabla


def _tabla_para_una_hoja(filas: list[dict]) -> Table:
    """Prueba de más grande a más chica hasta que la tabla completa quepa en
    el alto disponible de una sola hoja — si ni la más chica cabe (resguardo
    con muchísimas herramientas, caso extremo), se usa esa de todos modos y
    el documento pagina solo en vez de cortar datos."""
    ultima = None
    for tam_fuente, relleno in _CANDIDATOS_FUENTE:
        candidata = _construir_tabla(filas, tam_fuente, relleno)
        _, alto = candidata.wrap(_ANCHO_TABLA, _ALTO_TABLA_DISPONIBLE * 10)
        ultima = candidata
        if alto <= _ALTO_TABLA_DISPONIBLE:
            return candidata
    return ultima


def generar_resguardo_pdf(nombre_empleado: str, id_numero_empleado: str, puesto_posicion: str, filas: list[dict]) -> bytes:
    total_general = sum(float(f.get("costo_unitario") or 0) * float(f.get("cantidad") or 0) for f in filas)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=_PAGINA,
        topMargin=_ALTO_ENCABEZADO + 0.3 * cm, bottomMargin=_MARGEN, leftMargin=_MARGEN, rightMargin=_MARGEN,
    )

    if filas:
        elementos = [_tabla_para_una_hoja(filas)]
    else:
        elementos = [Paragraph(
            "Este empleado no tiene herramienta a su resguardo actualmente.",
            ParagraphStyle("vacio", fontSize=10, textColor=colors.HexColor("#555555")),
        )]

    def _con_encabezado(c, doc):
        _dibujar_encabezado(nombre_empleado, id_numero_empleado, puesto_posicion, total_general, c, doc)

    doc.build(elementos, onFirstPage=_con_encabezado, onLaterPages=_con_encabezado)
    buffer.seek(0)
    return buffer.read()
