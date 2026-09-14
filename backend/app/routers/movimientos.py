import uuid
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import MovimientoResguardo, Empleado, Producto, Usuario
from app.schemas.movimiento_resguardo import MovimientoOut, MovimientoCreate, MovimientoUpdate, SalidaMultipleCreate
from app.services.uploads import guardar_archivo
from app.services.folio import siguiente_folio
from app.services.vale_pdf import generar_vale_pdf
from app.deps_auth import usuario_actual

router = APIRouter(prefix="/movimientos", tags=["Control de Resguardo"], dependencies=[Depends(usuario_actual)])


def _nuevo_row_id(db: Session) -> str:
    for _ in range(5):
        candidato = uuid.uuid4().hex[:8]
        if not db.get(MovimientoResguardo, candidato):
            return candidato
    raise HTTPException(500, "No se pudo generar un Row ID único")


def _con_referencias(query):
    """MovimientoOut serializa `descripcion`/`nombre_de_empleado`, propiedades que
    resuelven vía producto_ref/empleado_ref — sin precargarlas, cada fila dispara
    2 consultas propias (N+1) al armar la respuesta: con ~3900 movimientos son
    miles de consultas extra en cada listado."""
    return query.options(
        joinedload(MovimientoResguardo.producto_ref),
        joinedload(MovimientoResguardo.empleado_ref),
    )


@router.get("/", response_model=list[MovimientoOut])
def listar(db: Session = Depends(get_db)):
    return (
        _con_referencias(db.query(MovimientoResguardo))
        .order_by(MovimientoResguardo.fecha_movimiento.desc())
        .all()
    )


@router.get("/reporte-salidas", response_model=list[MovimientoOut])
def reporte_salidas(db: Session = Depends(get_db)):
    """Vista REPORTE DE SALIDAS: bitácora filtrada a movimientos de tipo SALIDA."""
    return (
        _con_referencias(db.query(MovimientoResguardo))
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


def _fila_movimiento(
    db: Session, *, empleado: Empleado, producto: Producto, usuario: Usuario,
    fecha_movimiento, numero_de_vale, tipo_movimiento: str, status: str,
    cantidad, numero_economico: str | None, observaciones: str | None,
) -> MovimientoResguardo:
    """Arma UN renglón (una herramienta) del movimiento — reusado tanto por el
    alta de un solo producto (ENTRADA, o edición) como por el vale con varias
    herramientas (POST /salida-multiple), donde se llama una vez por cada
    herramienta pero TODAS comparten el mismo numero_de_vale."""
    return MovimientoResguardo(
        row_id=_nuevo_row_id(db),
        fecha_movimiento=fecha_movimiento,
        numero_de_vale=numero_de_vale,
        tipo_movimiento=tipo_movimiento,
        id_numero_empleado=empleado.id_numero_empleado,
        empleado_id=empleado.id_numero_empleado,
        nombre_de_empleado_snapshot=empleado.nombre_de_empleado,
        puesto_posicion=empleado.puesto_posicion,
        departamento=empleado.departamento_ref.departamento if empleado.departamento_ref else None,
        jefe_inmediato=empleado.jefe_inmediato,
        # Quien tiene la sesión iniciada al capturar el movimiento es quien
        # entrega la herramienta — se imprime en el vale en automático.
        nombre_usuario_entrega=usuario.nombre,
        status=status,
        codigo_sai_sku=producto.codigo_sai_sku,
        producto_sku=producto.codigo_sai_sku,
        descripcion_snapshot=producto.descripcion,
        udm=producto.udm,
        numero_economico=numero_economico or producto.numero_economico,
        clase_familia=producto.clase_familia_ref.clase_familia if producto.clase_familia_ref else None,
        costo_unitario=producto.costo_unitario,
        cantidad=cantidad,
        # Si la herramienta ya tiene foto de referencia (de un resguardo anterior
        # o capturada en su ficha), se reusa aquí para no obligar a retomarla en
        # cada salida — se sobreescribe más abajo si en este vale sí se sube una.
        foto_producto_snapshot=producto.foto_producto,
        observaciones=observaciones,
    )


@router.post("/", response_model=MovimientoOut, status_code=201)
def crear(datos: MovimientoCreate, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)):
    if datos.tipo_movimiento not in ("SALIDA", "ENTRADA"):
        raise HTTPException(422, "tipo_movimiento debe ser SALIDA o ENTRADA")

    empleado = db.get(Empleado, datos.id_numero_empleado)
    producto = db.get(Producto, datos.codigo_sai_sku)
    if not empleado:
        raise HTTPException(404, "Empleado no encontrado")
    if not producto:
        raise HTTPException(404, "Producto no encontrado")

    # El folio del vale electrónico se asigna solo (consecutivo) cuando es una
    # SALIDA nueva y no se mandó uno a mano — así el vale sale listo para
    # imprimir sin que nadie tenga que capturarlo.
    numero_de_vale = datos.numero_de_vale
    if not numero_de_vale and datos.tipo_movimiento == "SALIDA":
        numero_de_vale = siguiente_folio(db)

    mov = _fila_movimiento(
        db, empleado=empleado, producto=producto, usuario=usuario,
        fecha_movimiento=datos.fecha_movimiento, numero_de_vale=numero_de_vale,
        tipo_movimiento=datos.tipo_movimiento, status=datos.status,
        cantidad=datos.cantidad, numero_economico=datos.numero_economico,
        observaciones=datos.observaciones,
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return mov


@router.post("/salida-multiple", response_model=list[MovimientoOut], status_code=201)
def crear_salida_multiple(
    datos: SalidaMultipleCreate, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual),
):
    """Un solo vale (un solo folio) con varias herramientas (1 a 6) — cada
    herramienta queda como su propio renglón en la base de datos (igual que
    siempre, para no romper el cálculo de stock ni los reportes), pero todos
    comparten el mismo numero_de_vale, así que /vale-pdf los imprime juntos."""
    if not (1 <= len(datos.items) <= 6):
        raise HTTPException(422, "Un vale debe tener entre 1 y 6 herramientas")

    empleado = db.get(Empleado, datos.id_numero_empleado)
    if not empleado:
        raise HTTPException(404, "Empleado no encontrado")

    productos = {}
    for item in datos.items:
        if item.codigo_sai_sku not in productos:
            producto = db.get(Producto, item.codigo_sai_sku)
            if not producto:
                raise HTTPException(404, f"Producto no encontrado: {item.codigo_sai_sku}")
            productos[item.codigo_sai_sku] = producto

    numero_de_vale = siguiente_folio(db)
    filas = [
        _fila_movimiento(
            db, empleado=empleado, producto=productos[item.codigo_sai_sku], usuario=usuario,
            fecha_movimiento=datos.fecha_movimiento, numero_de_vale=numero_de_vale,
            tipo_movimiento="SALIDA", status=datos.status,
            cantidad=item.cantidad, numero_economico=item.numero_economico,
            observaciones=datos.observaciones,
        )
        for item in datos.items
    ]
    db.add_all(filas)
    db.commit()
    for fila in filas:
        db.refresh(fila)
    return filas


@router.get("/{row_id}/vale-pdf")
def vale_pdf(row_id: str, db: Session = Depends(get_db)):
    mov = db.get(MovimientoResguardo, row_id)
    if not mov:
        raise HTTPException(404, "Movimiento no encontrado")

    # Todas las herramientas del mismo vale comparten numero_de_vale — se
    # imprimen juntas en la misma hoja (hasta 6, lo que quepa en la plantilla).
    # Si por alguna razón no hay numero_de_vale (vale viejo/manual), se
    # imprime nada más esta herramienta sola.
    if mov.numero_de_vale:
        hermanos = (
            db.query(MovimientoResguardo)
            .filter(
                MovimientoResguardo.numero_de_vale == mov.numero_de_vale,
                MovimientoResguardo.tipo_movimiento == mov.tipo_movimiento,
                MovimientoResguardo.id_numero_empleado == mov.id_numero_empleado,
            )
            .order_by(MovimientoResguardo.row_id)
            .all()
        )
    else:
        hermanos = [mov]

    datos = {
        "fecha_movimiento": mov.fecha_movimiento,
        "numero_de_vale": mov.numero_de_vale,
        "id_numero_empleado": mov.id_numero_empleado,
        "nombre_de_empleado": mov.nombre_de_empleado,
        "puesto_posicion": mov.puesto_posicion,
        "departamento": mov.departamento,
        "jefe_inmediato": mov.jefe_inmediato,
        "nombre_usuario_entrega": mov.nombre_usuario_entrega,
        "herramientas": [
            {
                "cantidad": h.cantidad,
                "numero_economico": h.numero_economico,
                "descripcion": h.descripcion,
            }
            for h in hermanos[:6]
        ],
    }
    contenido = generar_vale_pdf(datos)

    nombre_archivo = f"vale_{mov.numero_de_vale or mov.row_id}.pdf"
    return StreamingResponse(
        BytesIO(contenido),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{nombre_archivo}"'},
    )


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
    mov = _subir(row_id, db, archivo, "foto_producto_snapshot", "FOTO_PRODUCTO")
    # Primera foto real de esta herramienta: queda también como su foto de
    # referencia, para que la próxima salida ya no la pida de nuevo (no se
    # sobreescribe si el producto ya tenía una).
    if mov.producto_ref is not None and not mov.producto_ref.foto_producto:
        mov.producto_ref.foto_producto = mov.foto_producto_snapshot
        db.commit()
        db.refresh(mov)
    return mov


@router.post("/{row_id}/foto-numero-serie", response_model=MovimientoOut)
def subir_foto_numero_serie(row_id: str, archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    return _subir(row_id, db, archivo, "foto_numero_serie", "FOTO_NUMERO_SERIE")


@router.post("/{row_id}/firma", response_model=MovimientoOut)
def subir_firma(row_id: str, archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    return _subir(row_id, db, archivo, "firma_recibido_conformidad", "FIRMA_DE_RECIBIDO_Y_CONFORMIDAD")
