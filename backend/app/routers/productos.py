from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Producto, MovimientoResguardo, ClaseFamilia, Usuario
from app.schemas.producto import ProductoOut, ProductoCreate, ProductoUpdate
from app.schemas.movimiento_resguardo import MovimientoOut
from app.schemas.historial_numero_economico import HistorialNumeroEconomicoOut
from app.services.uploads import guardar_archivo
from app.services.stock import stock_subquery, stock_de
from app.services.resguardo import tenedores_actuales_de, saldos_por_empleado
from app.services.asignados_excel import generar_asignados_excel
from app.services.historico_excel import generar_historico_producto_excel
from app.services.historial_numero_economico import registrar_cambio, historial_de
from app.deps_auth import usuario_actual, bloquear_solo_consulta

router = APIRouter(prefix="/productos", tags=["Productos"], dependencies=[Depends(usuario_actual)])


def _to_out(prod: Producto, stock, clases_por_id=None) -> ProductoOut:
    out = ProductoOut.model_validate(prod)
    if clases_por_id is not None:
        cf = clases_por_id.get(prod.clase_familia_id)
        out.clase_familia_nombre = cf.clase_familia if cf else None
    else:
        out.clase_familia_nombre = prod.clase_familia_ref.clase_familia if prod.clase_familia_ref else None
    out.stock = stock
    return out


@router.get("/", response_model=list[ProductoOut])
def listar(db: Session = Depends(get_db)):
    clases_por_id = {c.id: c for c in db.query(ClaseFamilia).all()}
    rows = stock_subquery(db).order_by(Producto.descripcion).all()
    return [_to_out(p, s, clases_por_id) for p, s in rows]


@router.get("/stock-inventory", response_model=list[ProductoOut])
def stock_inventory(db: Session = Depends(get_db)):
    """Misma data que PRODUCTOS pero pensada para la vista de tabla STOCK INVENTORY,
    ordenada por stock descendente (como en la app original)."""
    clases_por_id = {c.id: c for c in db.query(ClaseFamilia).all()}
    rows = stock_subquery(db).order_by(text("stock DESC")).all()
    return [_to_out(p, s, clases_por_id) for p, s in rows]


@router.get("/{codigo_sai_sku}", response_model=ProductoOut)
def obtener(codigo_sai_sku: str, db: Session = Depends(get_db)):
    prod = db.get(Producto, codigo_sai_sku)
    if not prod:
        raise HTTPException(404, "Producto no encontrado")
    return _to_out(prod, stock_de(db, codigo_sai_sku))


@router.post("/", response_model=ProductoOut, status_code=201)
def crear(datos: ProductoCreate, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    if db.get(Producto, datos.codigo_sai_sku):
        raise HTTPException(409, "Ya existe un producto con ese código SAI/SKU")
    prod = Producto(**datos.model_dump())
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return _to_out(prod, prod.inventario_inicial)


@router.put("/{codigo_sai_sku}", response_model=ProductoOut)
def actualizar(
    codigo_sai_sku: str, datos: ProductoUpdate, db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual), _=Depends(bloquear_solo_consulta),
):
    prod = db.get(Producto, codigo_sai_sku)
    if not prod:
        raise HTTPException(404, "Producto no encontrado")
    cambios = datos.model_dump(exclude_unset=True)
    if "numero_economico" in cambios and cambios["numero_economico"] != prod.numero_economico:
        registrar_cambio(
            db, entidad_tipo="producto", entidad_id=codigo_sai_sku,
            anterior=prod.numero_economico, nuevo=cambios["numero_economico"],
            usuario_nombre=usuario.nombre,
        )
    for campo, valor in cambios.items():
        setattr(prod, campo, valor)
    db.commit()
    db.refresh(prod)
    return _to_out(prod, stock_de(db, codigo_sai_sku))


@router.get("/{codigo_sai_sku}/historial-numero-economico", response_model=list[HistorialNumeroEconomicoOut])
def historial_numero_economico(codigo_sai_sku: str, db: Session = Depends(get_db)):
    return historial_de(db, entidad_tipo="producto", entidad_id=codigo_sai_sku)


@router.delete("/{codigo_sai_sku}", status_code=204)
def eliminar(codigo_sai_sku: str, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    prod = db.get(Producto, codigo_sai_sku)
    if not prod:
        raise HTTPException(404, "Producto no encontrado")
    db.delete(prod)
    db.commit()


@router.get("/{codigo_sai_sku}/movimientos", response_model=list[MovimientoOut])
def movimientos_de_producto(codigo_sai_sku: str, db: Session = Depends(get_db)):
    return (
        db.query(MovimientoResguardo)
        .options(joinedload(MovimientoResguardo.producto_ref), joinedload(MovimientoResguardo.empleado_ref))
        .filter(MovimientoResguardo.producto_sku == codigo_sai_sku)
        .order_by(MovimientoResguardo.fecha_movimiento.desc())
        .all()
    )


@router.get("/{codigo_sai_sku}/asignados-excel")
def asignados_excel(codigo_sai_sku: str, db: Session = Depends(get_db)):
    prod = db.get(Producto, codigo_sai_sku)
    if not prod:
        raise HTTPException(404, "Producto no encontrado")

    filas = tenedores_actuales_de(db, codigo_sai_sku)
    contenido = generar_asignados_excel(prod.descripcion, codigo_sai_sku, filas)

    nombre_archivo = f"asignados_{codigo_sai_sku}.xlsx"
    return StreamingResponse(
        BytesIO(contenido),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


@router.get("/{codigo_sai_sku}/historico-excel")
def historico_excel(codigo_sai_sku: str, db: Session = Depends(get_db)):
    """Registro histórico completo (Excel) de esta herramienta: todos los
    empleados que alguna vez la tuvieron, actuales y ya devueltos/traspasados
    — a diferencia de asignados-excel, que solo trae quién la tiene ahorita.
    Incluye fecha de alta y antigüedad."""
    prod = db.get(Producto, codigo_sai_sku)
    if not prod:
        raise HTTPException(404, "Producto no encontrado")

    movimientos = (
        db.query(MovimientoResguardo)
        .options(joinedload(MovimientoResguardo.empleado_ref))
        .filter(MovimientoResguardo.producto_sku == codigo_sai_sku)
        .order_by(MovimientoResguardo.fecha_movimiento.desc(), MovimientoResguardo.row_id.desc())
        .all()
    )
    saldos = saldos_por_empleado(db, codigo_sai_sku)
    filas = [
        {
            "fecha": mov.fecha_movimiento,
            "tipo_movimiento": mov.tipo_movimiento,
            "numero_de_vale": mov.numero_de_vale,
            "nombre_de_empleado": mov.nombre_de_empleado,
            "empleado_id": mov.id_numero_empleado,
            "cantidad": mov.cantidad,
            "observaciones": mov.observaciones,
            "activo": saldos.get(mov.empleado_id, 0) > 0,
        }
        for mov in movimientos
    ]
    contenido = generar_historico_producto_excel(prod.descripcion, codigo_sai_sku, prod.fecha_de_alta, filas)

    nombre_archivo = f"historico_{codigo_sai_sku}.xlsx"
    return StreamingResponse(
        BytesIO(contenido),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


@router.post("/{codigo_sai_sku}/foto", response_model=ProductoOut)
def subir_foto(codigo_sai_sku: str, archivo: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    prod = db.get(Producto, codigo_sai_sku)
    if not prod:
        raise HTTPException(404, "Producto no encontrado")
    prod.foto_producto = guardar_archivo(archivo, "PRODUCTOS", codigo_sai_sku, "FOTO_PRODUCTO")
    db.commit()
    db.refresh(prod)
    return _to_out(prod, stock_de(db, codigo_sai_sku))


@router.post("/{codigo_sai_sku}/scan", response_model=ProductoOut)
def subir_scan(codigo_sai_sku: str, archivo: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    prod = db.get(Producto, codigo_sai_sku)
    if not prod:
        raise HTTPException(404, "Producto no encontrado")
    prod.scan_document = guardar_archivo(archivo, "PRODUCTOS", codigo_sai_sku, "SCAN_DOCUMENT")
    db.commit()
    db.refresh(prod)
    return _to_out(prod, stock_de(db, codigo_sai_sku))
