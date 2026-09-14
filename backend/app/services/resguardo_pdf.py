"""PDF imprimible del resguardo actual de un empleado — mismos datos que
generan el Excel (`inventario_excel.py` + `resguardo_actual_de`), pero
armado desde cero con reportlab (no hay aquí una plantilla "oficial" que
respetar, a diferencia del vale): es un reporte interno para imprimir en la
tablet, donde bajar el .xlsm no tiene mucho sentido."""
from datetime import date
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer


def _fecha_str(f):
    return f.strftime("%d/%m/%Y") if isinstance(f, date) else (f or "")


def generar_resguardo_pdf(nombre_empleado: str, id_numero_empleado: str, puesto_posicion: str, filas: list[dict]) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm, leftMargin=1.2 * cm, rightMargin=1.2 * cm,
    )

    titulo = ParagraphStyle("titulo", fontSize=14, leading=18, spaceAfter=4, fontName="Helvetica-Bold")
    subtitulo = ParagraphStyle("subtitulo", fontSize=10, leading=14, textColor=colors.HexColor("#555555"))

    elementos = [
        Paragraph("Resguardo actual de herramienta", titulo),
        Paragraph(f"{nombre_empleado} — No. de empleado: {id_numero_empleado}", subtitulo),
        Paragraph(puesto_posicion or "", subtitulo),
        Spacer(1, 12),
    ]

    encabezados = ["Fecha", "Vale", "SKU", "Descripción", "N° Econ.", "Cant.", "Costo unit.", "Total"]
    filas_tabla = [encabezados]
    total_general = 0
    for f in filas:
        costo = f.get("costo_unitario") or 0
        cantidad = f.get("cantidad") or 0
        total_linea = float(costo) * float(cantidad)
        total_general += total_linea
        filas_tabla.append([
            _fecha_str(f.get("fecha")),
            f.get("numero_de_vale") or "",
            f.get("sku") or "",
            Paragraph(f.get("descripcion") or "", ParagraphStyle("celda", fontSize=8, leading=10)),
            f.get("numero_economico") or "",
            str(f.get("cantidad") or ""),
            f"${float(costo):,.2f}" if costo else "",
            f"${total_linea:,.2f}" if total_linea else "",
        ])
    filas_tabla.append(["", "", "", "", "", "", "Total:", f"${total_general:,.2f}"])

    anchos = [2.0 * cm, 1.6 * cm, 2.6 * cm, 6.5 * cm, 2.0 * cm, 1.4 * cm, 2.2 * cm, 2.2 * cm]
    tabla = Table(filas_tabla, colWidths=anchos, repeatRows=1)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1c2b3a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -2), 0.5, colors.HexColor("#cccccc")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (5, 1), (7, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f5f5f5")]),
        ("SPAN", (0, -1), (5, -1)),
        ("FONTNAME", (6, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#1c2b3a")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elementos.append(tabla)

    if not filas:
        elementos.append(Spacer(1, 12))
        elementos.append(Paragraph("Este empleado no tiene herramienta a su resguardo actualmente.", subtitulo))

    doc.build(elementos)
    buffer.seek(0)
    return buffer.read()
