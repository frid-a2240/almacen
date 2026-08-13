import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MovimientoResguardo, Empleado, Producto
from app.schemas.movimiento_resguardo import MovimientoOut, MovimientoCreate, MovimientoUpdate
from app.services.uploads import guardar_archivo
from app.deps_auth import usuario_actual

router = APIRouter(prefix="/movimientos", tags=["Control de Resguardo"], dependencies=[Depends(usuario_actual)])


def _nuevo_row_id(db: Session) -> str:
    for _ in range(5):
        candidato = uuid.uuid4().hex[:8]
        if not db.get(MovimientoResguardo, candidato):
            return candidato
    raise HTTPException(500, "No se pudo generar un Row ID único")


@router.get("/", response_model=list[MovimientoOut])
def listar(db: Session = Depends(get_db)):
    return (
        db.query(MovimientoResguardo)
        .order_by(MovimientoResguardo.fecha_movimiento.desc())
        .all()
    )


@router.get("/reporte-salidas", response_model=list[MovimientoOut])
def reporte_salidas(db: Session = Depends(get_db)):
    """Vista REPORTE DE SALIDAS: bitácora filtrada a movimientos de tipo SALIDA."""
    return (
        db.query(MovimientoResguardo)
        .filter(MovimientoResguardo.tipo_movimiento == "SALIDA")
        .order_by(MovimientoResguardo.fecha_movimiento.desc())
        .all()
    )


@router.get("/{row_id}", response_model=MovimientoOut)
def obtener(row_id: str, db: Session = Depends(get_db)):
    mov = db.get(MovimientoResguardo, row_id)
    if not mov:
        raise HTTPException(404, "Movimiento no encontrado")
    return mov


@router.post("/", response_model=MovimientoOut, status_code=201)
def crear(datos: MovimientoCreate, db: Session = Depends(get_db)):
    if datos.tipo_movimiento not in ("SALIDA", "ENTRADA"):
        raise HTTPException(422, "tipo_movimiento debe ser SALIDA o ENTRADA")

    empleado = db.get(Empleado, datos.id_numero_empleado)
    producto = db.get(Producto, datos.codigo_sai_sku)
    if not empleado:
        raise HTTPException(404, "Empleado no encontrado")
    if not producto:
        raise HTTPException(404, "Producto no encontrado")

    mov = MovimientoResguardo(
        row_id=_nuevo_row_id(db),
        fecha_movimiento=datos.fecha_movimiento,
        numero_de_vale=datos.numero_de_vale,
        tipo_movimiento=datos.tipo_movimiento,
        id_numero_empleado=empleado.id_numero_empleado,
        empleado_id=empleado.id_numero_empleado,
        nombre_de_empleado_snapshot=empleado.nombre_de_empleado,
        puesto_posicion=empleado.puesto_posicion,
        departamento=empleado.departamento_ref.departamento if empleado.departamento_ref else None,
        jefe_inmediato=empleado.jefe_inmediato,
        status=datos.status,
        codigo_sai_sku=producto.codigo_sai_sku,
        producto_sku=producto.codigo_sai_sku,
        descripcion_snapshot=producto.descripcion,
        udm=producto.udm,
        numero_economico=datos.numero_economico or producto.numero_economico,
        clase_familia=producto.clase_familia_ref.clase_familia if producto.clase_familia_ref else None,
        costo_unitario=producto.costo_unitario,
        cantidad=datos.cantidad,
        observaciones=datos.observaciones,
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return mov


@router.put("/{row_id}", response_model=MovimientoOut)
def actualizar(row_id: str, datos: MovimientoUpdate, db: Session = Depends(get_db)):
    mov = db.get(MovimientoResguardo, row_id)
    if not mov:
        raise HTTPException(404, "Movimiento no encontrado")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(mov, campo, valor)
    db.commit()
    db.refresh(mov)
    return mov


@router.delete("/{row_id}", status_code=204)
def eliminar(row_id: str, db: Session = Depends(get_db)):
    mov = db.get(MovimientoResguardo, row_id)
    if not mov:
        raise HTTPException(404, "Movimiento no encontrado")
    db.delete(mov)
    db.commit()


def _subir(row_id: str, db: Session, archivo: UploadFile, columna_db: str, columna_archivo: str) -> MovimientoOut:
    mov = db.get(MovimientoResguardo, row_id)
    if not mov:
        raise HTTPException(404, "Movimiento no encontrado")
    ruta = guardar_archivo(archivo, "CONTROL_DE_RESGUARDO", row_id, columna_archivo)
    setattr(mov, columna_db, ruta)
    db.commit()
    db.refresh(mov)
    return mov


@router.post("/{row_id}/foto-vale", response_model=MovimientoOut)
def subir_foto_vale(row_id: str, archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    return _subir(row_id, db, archivo, "foto_vale_de_salida", "FOTO_VALE_DE_SALIDA")


@router.post("/{row_id}/foto-producto", response_model=MovimientoOut)
def subir_foto_producto(row_id: str, archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    return _subir(row_id, db, archivo, "foto_producto_snapshot", "FOTO_PRODUCTO")


@router.post("/{row_id}/foto-numero-serie", response_model=MovimientoOut)
def subir_foto_numero_serie(row_id: str, archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    return _subir(row_id, db, archivo, "foto_numero_serie", "FOTO_NUMERO_SERIE")


@router.post("/{row_id}/firma", response_model=MovimientoOut)
def subir_firma(row_id: str, archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    return _subir(row_id, db, archivo, "firma_recibido_conformidad", "FIRMA_DE_RECIBIDO_Y_CONFORMIDAD")
