import re

from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models import MovimientoResguardo, Producto
from app.services.resguardo import saldo_actual

# Lo que se captura cuando la herramienta no tiene número: no identifica a
# ninguna pieza, así que puede repetirse.
_SIN_NUMERO = {"", "NA", "SN", "NOAPLICA", "NOTIENE", "SINNUMERO"}


def normalizar(numero: str | None) -> str | None:
    """Forma comparable del número (sin espacios a los lados, mayúsculas), o
    None si está vacío o es un relleno tipo N/A, S/N, ???."""
    limpio = (numero or "").strip().upper()
    return None if re.sub(r"[^A-Z0-9]", "", limpio) in _SIN_NUMERO else limpio


def _sku_en_resguardo(db: Session, numero: str, *, excluir_sku: str | None, excluir_row_id: str | None) -> str | None:
    m = MovimientoResguardo
    sku = func.coalesce(m.producto_sku, m.codigo_sai_sku)
    saldo = func.sum(case(
        (m.tipo_movimiento == "SALIDA", m.cantidad),
        (m.tipo_movimiento == "ENTRADA", -m.cantidad),
        else_=0,
    ))
    consulta = db.query(m.empleado_id, sku.label("sku")).filter(
        func.upper(func.trim(m.numero_economico)) == numero, m.empleado_id.isnot(None), sku.isnot(None),
    )
    if excluir_sku:
        consulta = consulta.filter(sku != excluir_sku)
    if excluir_row_id:
        consulta = consulta.filter(m.row_id != excluir_row_id)
    for fila in consulta.group_by(m.empleado_id, sku).having(saldo > 0):
        # Muchas devoluciones se capturan sin número económico: si el empleado
        # ya no tiene nada de ese producto, la pieza está devuelta.
        if saldo_actual(db, fila.empleado_id, fila.sku) > 0:
            return fila.sku
    return None


def conflicto(
    db: Session, numero: str | None, sku: str, *, en_vale: bool, excluir_row_id: str | None = None,
) -> str | None:
    """Mensaje de error si `numero` ya está ocupado, o None si está libre para
    el producto `sku`. El número es el identificador de la herramienta: no
    puede ser de otro producto y, en un vale, la misma pieza no puede estar
    entregada dos veces a la vez."""
    buscado = normalizar(numero)
    if not buscado:
        return None

    propio = db.get(Producto, sku)
    otro = None
    # Las fichas que ya comparten número no deben bloquear los vales de ambas.
    if not (en_vale and propio and normalizar(propio.numero_economico) == buscado):
        otro = (
            db.query(Producto)
            .filter(func.upper(func.trim(Producto.numero_economico)) == buscado, Producto.codigo_sai_sku != sku)
            .first()
        )
    otro_sku = otro.codigo_sai_sku if otro else _sku_en_resguardo(
        db, buscado, excluir_sku=sku, excluir_row_id=excluir_row_id,
    )
    if otro_sku:
        otro = otro or db.get(Producto, otro_sku)
        herramienta = f"{otro.descripcion} ({otro_sku})" if otro else otro_sku
        return f"El número económico {buscado} ya ha sido asignado a la herramienta: {herramienta}."

    if en_vale and _sku_en_resguardo(db, buscado, excluir_sku=None, excluir_row_id=excluir_row_id):
        return f"La herramienta con número económico {buscado} ya está en resguardo."
    return None
