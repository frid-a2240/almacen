"""Genera el Excel de "INVENTARIO DE HERRAMIENTA" por empleado editando
directamente el XML interno de la plantilla real (backend/app/templates/
inventario_herramienta.xlsm), en vez de cargarla y volver a guardarla con
openpyxl.

Por qué: openpyxl no conserva perfecto los objetos de dibujo complejos
(el botón "CLEAN", la tarjeta de "Costo Total" con degradado/sombra y
texto enlazado a una celda) al volver a serializar el archivo — se ven
degradados o rotos. Editando solo xl/worksheets/sheet1.xml (con los
datos) y xl/tables/table1.xml (el rango de la tabla) dentro del .zip,
y copiando todo lo demás (dibujos, imágenes, macro) tal cual, el
resultado sale idéntico a la plantilla original salvo por los datos.
"""
import re
import zipfile
from datetime import date
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET

from openpyxl.utils.cell import coordinate_from_string, column_index_from_string

_PLANTILLA = Path(__file__).resolve().parent.parent / "templates" / "inventario_herramienta.xlsm"

_NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
_NS_XML = "http://www.w3.org/XML/1998/namespace"

for _prefijo, _uri in {
    "": _NS_MAIN,
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
    "x14ac": "http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac",
    "xr": "http://schemas.microsoft.com/office/spreadsheetml/2014/revision",
    "xr2": "http://schemas.microsoft.com/office/spreadsheetml/2015/revision2",
    "xr3": "http://schemas.microsoft.com/office/spreadsheetml/2016/revision3",
}.items():
    ET.register_namespace(_prefijo, _uri)


def _q(tag: str) -> str:
    return f"{{{_NS_MAIN}}}{tag}"


_EPOCA_EXCEL = date(1899, 12, 30)


def _serial_excel(d: date) -> int:
    return (d - _EPOCA_EXCEL).days


def _celda(fila_el: ET.Element, letra_columna: str, estilo_si_nueva: str | None = None) -> ET.Element:
    """Busca <c r="{letra}{fila}"> dentro de <row>; si no existe la crea en
    la posición correcta (las celdas dentro de <row> van en orden de
    columna). `estilo_si_nueva` solo aplica si la celda no existía — si ya
    existía se respeta el estilo que trajera la plantilla."""
    fila_num = fila_el.get("r")
    ref = f"{letra_columna}{fila_num}"
    idx_buscado = column_index_from_string(letra_columna)

    hijos = list(fila_el)
    for i, c in enumerate(hijos):
        if c.get("r") == ref:
            return c
        col_c, _ = coordinate_from_string(c.get("r"))
        if column_index_from_string(col_c) > idx_buscado:
            atributos = {"r": ref}
            if estilo_si_nueva is not None:
                atributos["s"] = estilo_si_nueva
            nueva = ET.Element(_q("c"), atributos)
            fila_el.insert(i, nueva)
            return nueva
    atributos = {"r": ref}
    if estilo_si_nueva is not None:
        atributos["s"] = estilo_si_nueva
    nueva = ET.Element(_q("c"), atributos)
    fila_el.append(nueva)
    return nueva


def _limpiar_celda(celda: ET.Element):
    for tag in ("v", "is", "f"):
        el = celda.find(_q(tag))
        if el is not None:
            celda.remove(el)


def _set_texto(celda: ET.Element, texto):
    _limpiar_celda(celda)
    if texto in (None, ""):
        celda.attrib.pop("t", None)
        return
    celda.set("t", "inlineStr")
    is_el = ET.SubElement(celda, _q("is"))
    t_el = ET.SubElement(is_el, _q("t"))
    t_el.text = str(texto)
    texto_str = str(texto)
    if texto_str != texto_str.strip():
        t_el.set(f"{{{_NS_XML}}}space", "preserve")


def _set_numero(celda: ET.Element, numero):
    _limpiar_celda(celda)
    celda.attrib.pop("t", None)
    if numero is None:
        return
    v_el = ET.SubElement(celda, _q("v"))
    v_el.text = repr(float(numero)) if isinstance(numero, float) else str(numero)


# Ancho de fábrica de la tabla (Tabla5 = A7:J50) — si un empleado tiene más
# artículos que eso, hay que extender el rango de la tabla.
_ULTIMA_FILA_TABLA_PLANTILLA = 50


def generar_inventario_xlsm(nombre_empleado: str, numero_empleado: str, puesto: str, filas: list[dict]) -> bytes:
    with zipfile.ZipFile(_PLANTILLA) as z:
        nombres = z.namelist()
        contenidos = {n: z.read(n) for n in nombres}

    # --- xl/worksheets/sheet1.xml: datos del empleado + tabla ---
    xml_original = contenidos["xl/worksheets/sheet1.xml"]
    # ElementTree solo declara los xmlns que detecta en uso dentro del árbol
    # — el original declara algunos (xr2, xr3) que aquí no se usan en
    # ningún elemento propio, solo se mencionan dentro del texto plano de
    # mc:Ignorable. Si se pierden esas declaraciones, Excel las rechaza
    # como archivo corrupto. Más simple y seguro que perseguir eso vía
    # ET: se guarda la etiqueta <worksheet ...> original tal cual y se
    # vuelve a poner después de reserializar, en vez de confiar en que
    # ElementTree la reconstruya igual.
    etiqueta_raiz_original = re.search(rb"<worksheet\b[^>]*>", xml_original).group(0)

    arbol_hoja = ET.fromstring(xml_original)
    sheet_data = arbol_hoja.find(_q("sheetData"))
    filas_por_numero = {int(f.get("r")): f for f in sheet_data.findall(_q("row"))}

    _set_texto(_celda(filas_por_numero[4], "D"), f"{nombre_empleado} ({numero_empleado})")
    _set_texto(_celda(filas_por_numero[5], "D"), puesto)

    ultima_fila_usada = 7
    for offset, f in enumerate(filas):
        num_fila = 8 + offset
        ultima_fila_usada = num_fila
        fila_el = filas_por_numero.get(num_fila)
        if fila_el is None:
            # Más allá de la fila 200 (caso extremo, no debería pasar en la
            # práctica) — fila nueva al final, sin más adorno que lo básico.
            fila_el = ET.Element(_q("row"), {"r": str(num_fila), "spans": "1:10", "x14ac:dyDescent": "0.3"})
            sheet_data.append(fila_el)
            filas_por_numero[num_fila] = fila_el

        # Estilo de fecha/moneda forzado siempre, sin importar si la celda
        # ya existía en la plantilla: NO todas las filas 8-50 vienen con A/I
        # pre-armadas por igual (algunas bandas, ej. 14-29, no traen celda A
        # ni I en absoluto), así que confiar en "si ya existe, ya está bien"
        # dejaba esas filas en formato general (se veía el número de serie
        # de la fecha en vez de la fecha, y el costo sin signo de moneda).
        if f["fecha"]:
            celda_a = _celda(fila_el, "A", "21")
            celda_a.set("s", "21")
            _set_numero(celda_a, _serial_excel(f["fecha"]))
        _set_texto(_celda(fila_el, "B"), f["numero_de_vale"])
        _set_texto(_celda(fila_el, "C"), f["sku"])
        _set_texto(_celda(fila_el, "D"), f["descripcion"])
        _set_texto(_celda(fila_el, "E"), f["udm"])
        _set_texto(_celda(fila_el, "F"), f["numero_economico"])
        _set_numero(_celda(fila_el, "G"), float(f["cantidad"]))
        _set_texto(_celda(fila_el, "H"), f["observaciones"])
        costo = float(f["costo_unitario"]) if f["costo_unitario"] is not None else None
        celda_i = _celda(fila_el, "I", "27")
        celda_i.set("s", "27")
        _set_numero(celda_i, costo)

        celda_j = _celda(fila_el, "J", "15")
        celda_j.set("s", "15")
        if celda_j.find(_q("f")) is None:
            # Las filas que ya traían la fórmula de la plantilla (8-50) la
            # conservan tal cual; las que no (51-200, fuera de lo que
            # cubre el grupo de fórmulas compartidas original) reciben una
            # normal con el mismo resultado.
            ET.SubElement(celda_j, _q("f")).text = f"I{num_fila}*G{num_fila}"

    xml_hoja = ET.tostring(arbol_hoja, encoding="UTF-8", xml_declaration=False)
    xml_hoja = re.sub(rb"^<worksheet\b[^>]*>", etiqueta_raiz_original, xml_hoja, count=1)
    xml_hoja = b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml_hoja
    contenidos["xl/worksheets/sheet1.xml"] = xml_hoja

    # --- xl/tables/table1.xml: extender el rango si hubo más de 43 filas ---
    ultima_fila_tabla = max(_ULTIMA_FILA_TABLA_PLANTILLA, ultima_fila_usada)
    if ultima_fila_tabla > _ULTIMA_FILA_TABLA_PLANTILLA:
        xml_tabla = contenidos["xl/tables/table1.xml"].decode("utf-8")
        xml_tabla = xml_tabla.replace('ref="A7:J50"', f'ref="A7:J{ultima_fila_tabla}"')
        contenidos["xl/tables/table1.xml"] = xml_tabla.encode("utf-8")

    # --- xl/workbook.xml: forzar recálculo completo al abrir, para que la
    # tarjeta de Costo Total (enlazada a $I$4) y los totales de cada fila
    # se vean actualizados y no el "$-" en caché de la plantilla vacía ---
    xml_wb = contenidos["xl/workbook.xml"].decode("utf-8")
    xml_wb = xml_wb.replace('<calcPr calcId="191029"/>', '<calcPr calcId="191029" fullCalcOnLoad="1"/>')
    contenidos["xl/workbook.xml"] = xml_wb.encode("utf-8")

    # --- reempaquetar: todo lo demás (dibujos, imágenes, vba, estilos,
    # tema) se copia byte a byte tal cual venía ---
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
        for nombre in nombres:
            z.writestr(nombre, contenidos[nombre])
    buffer.seek(0)
    return buffer.read()
