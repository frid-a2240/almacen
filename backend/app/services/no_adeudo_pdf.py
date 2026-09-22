"""Constancia de No Adeudo: certifica que un empleado no tiene ninguna
herramienta a su resguardo — se exige antes de darlo de baja (ver
routers/empleados.py, endpoint no-adeudo-pdf y el bloqueo en DELETE).

Recreado con reportlab en una sola hoja fija (como el vale, no como
resguardo_pdf.py) porque a diferencia del inventario, aquí la tabla siempre
trae pocos renglones (hasta 10, como en "FORMATO NO ADEUDO PARA TOOL ID.xlsx",
el Excel real que se usaba a mano) — mismo estilo visual (logo, franja teal,
tabla con encabezado oscuro, checkboxes de área, firmas), no una conversión
pixel a pixel del Excel real.
"""
from datetime import date
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

_ANCHO_PAGINA, _ALTO_PAGINA = landscape(letter)
_MARGEN = 1.1 * cm
_MAX_HERRAMIENTAS = 10

_ENCABEZADOS = ["No. Vale", "Descripción", "Qty", "# Económico", "Costo"]
_ANCHOS_COL = [2.4 * cm, 10.5 * cm, 2 * cm, 3.6 * cm, 3 * cm]


def _y(top):
    """"Distancia desde arriba" (como se mide a simple vista) a la
    coordenada Y de reportlab (origen abajo) — mismo criterio que vale_pdf.py."""
    return _ALTO_PAGINA - top


def _fecha_str(f):
    return f.strftime("%d/%m/%Y") if isinstance(f, date) else (f or "")


def _checkbox(c, x, top, etiqueta):
    lado = 0.35 * cm
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.75)
    c.rect(x, _y(top) - lado + 2, lado, lado, fill=0, stroke=1)
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.black)
    c.drawString(x + lado + 6, _y(top), etiqueta)


def generar_no_adeudo_pdf(
    nombre_empleado: str, id_numero_empleado: str, puesto: str,
    folio: str, herramientas: list[dict], observaciones: str | None = None,
) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(_ANCHO_PAGINA, _ALTO_PAGINA))

    margen = _MARGEN
    ancho_util = _ANCHO_PAGINA - 2 * margen

    # --- Logo + franja teal con el título ---
    logo_alto = 1.6 * cm
    logo_ancho = logo_alto * (932 / 358)
    try:
        c.drawImage(ImageReader(str(_LOGO)), margen, _y(margen + logo_alto), width=logo_ancho, height=logo_alto, mask="auto")
    except Exception:
        pass

    franja_x0 = margen + logo_ancho + 14
    franja_ancho = ancho_util - logo_ancho - 14 - 3.6 * cm - 10
    c.setFillColor(_TEAL)
    c.rect(franja_x0, _y(margen + logo_alto), franja_ancho, logo_alto, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(franja_x0 + franja_ancho / 2, _y(margen + logo_alto / 2 + 7), "CONSTANCIA DE NO ADEUDO")

    # Folio / Fecha, a la derecha de la franja
    caja_x0 = franja_x0 + franja_ancho + 10
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.black)
    c.drawString(caja_x0, _y(margen + 14), "FOLIO:")
    c.drawString(caja_x0, _y(margen + 32), "FECHA:")
    c.setFont("Helvetica", 9)
    c.drawString(caja_x0 + 40, _y(margen + 14), str(folio))
    c.drawString(caja_x0 + 40, _y(margen + 32), date.today().strftime("%d/%m/%Y"))

    # --- Checkboxes de área ---
    top_checks = margen + logo_alto + 24
    _checkbox(c, margen, top_checks, "PAÑOL DE HERRAMIENTA")
    _checkbox(c, margen + 6 * cm, top_checks, "ALMACÉN")
    _checkbox(c, margen + 10.5 * cm, top_checks, "SEGURIDAD E HIGIENE")

    # --- Nombre / Puesto ---
    top_nombre = top_checks + 26
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margen, _y(top_nombre), "NOMBRE:")
    c.setFont("Helvetica", 10)
    c.drawString(margen + 55, _y(top_nombre), f"{nombre_empleado} ({id_numero_empleado})")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margen, _y(top_nombre + 18), "PUESTO:")
    c.setFont("Helvetica", 10)
    c.drawString(margen + 55, _y(top_nombre + 18), puesto or "")

    # --- Texto de certificación ---
    top_texto = top_nombre + 42
    c.setFont("Helvetica-Oblique", 9.5)
    c.setFillColor(_AZUL_OSCURO)
    c.drawString(
        margen, _y(top_texto),
        "Se hace constar que la persona arriba mencionada NO tiene ninguna herramienta ni equipo a su resguardo a la fecha de este documento.",
    )
    c.setFillColor(colors.black)

    # --- Tabla de herramientas (historial, ya devueltas) ---
    top_tabla = top_texto + 16
    alto_fila = 15.5
    x = margen
    c.setFillColor(_AZUL_OSCURO)
    c.rect(margen, _y(top_tabla + alto_fila) , ancho_util, alto_fila, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8.5)
    for encabezado, ancho in zip(_ENCABEZADOS, _ANCHOS_COL):
        centrado = encabezado in ("Qty",)
        if centrado:
            c.drawCentredString(x + ancho / 2, _y(top_tabla + alto_fila - 4), encabezado)
        else:
            c.drawString(x + 4, _y(top_tabla + alto_fila - 4), encabezado)
        x += ancho

    filas_mostradas = herramientas[:_MAX_HERRAMIENTAS]
    c.setFont("Helvetica", 8.5)
    for i in range(_MAX_HERRAMIENTAS):
        fila_top = top_tabla + alto_fila * (i + 2)
        c.setStrokeColor(_GRIS)
        c.setLineWidth(0.5)
        c.rect(margen, _y(fila_top), ancho_util, alto_fila, fill=0, stroke=1)
        if i < len(filas_mostradas):
            f = filas_mostradas[i]
            x = margen
            valores = [
                str(f.get("numero_de_vale") or ""),
                str(f.get("descripcion") or "")[:70],
                str(f.get("cantidad") or ""),
                str(f.get("numero_economico") or ""),
                f"${float(f['costo_unitario']):,.2f}" if f.get("costo_unitario") else "",
            ]
            c.setFillColor(colors.black)
            for valor, ancho, centrado in zip(valores, _ANCHOS_COL, [False, False, True, False, False]):
                if centrado:
                    c.drawCentredString(x + ancho / 2, _y(fila_top + alto_fila - 4), valor)
                else:
                    c.drawString(x + 4, _y(fila_top + alto_fila - 4), valor)
                x += ancho

    if len(herramientas) > _MAX_HERRAMIENTAS:
        c.setFont("Helvetica-Oblique", 7.5)
        c.setFillColor(_GRIS)
        c.drawString(margen, _y(top_tabla + alto_fila * (_MAX_HERRAMIENTAS + 2) + 10), f"+ {len(herramientas) - _MAX_HERRAMIENTAS} herramienta(s) más en el registro histórico.")

    # --- Observaciones ---
    top_obs = top_tabla + alto_fila * (_MAX_HERRAMIENTAS + 2) + 22
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.black)
    c.drawString(margen, _y(top_obs), "OBSERVACIONES:")
    c.setStrokeColor(_GRIS)
    c.rect(margen, _y(top_obs + 46), ancho_util, 46, fill=0, stroke=1)
    if observaciones:
        c.setFont("Helvetica", 8.5)
        c.drawString(margen + 6, _y(top_obs + 16), observaciones[:140])

    # --- Firmas ---
    top_firmas = top_obs + 68
    c.setFont("Helvetica", 9.5)
    c.drawString(margen, _y(top_firmas), "FIRMA COLABORADOR: _______________________________________")
    c.drawString(margen + ancho_util / 2 + 10, _y(top_firmas), "FIRMA PAÑOL: _______________________________________")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()
