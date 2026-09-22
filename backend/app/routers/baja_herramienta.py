from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import BajaHerramienta, BajaHerramientaItem, BajaHerramientaFoto, Empleado, Producto
from app.schemas.baja_herramienta import BajaCreate, BajaOut
from app.services.uploads import guardar_archivo
from app.services.baja_pdf import generar_baja_pdf
from app.deps_auth import usuario_actual, bloquear_solo_consulta

router = APIRouter(prefix="/bajas-herramienta", tags=["Baja de Herramienta"], dependencies=[Depends(usuario_actual)])


def _con_referencias(query):
    return query.options(
        joinedload(BajaHerramienta.tecnico_ref),
        joinedload(BajaHerramienta.almacenista_ref),
        joinedload(BajaHerramienta.items).joinedload(BajaHerramientaItem.producto_ref),
        joinedload(BajaHerramienta.fotos),
    )


def _obtener(baja_id: int, db: Session) -> BajaHerramienta:
    baja = _con_referencias(db.query(BajaHerramienta)).filter(BajaHerramienta.id == baja_id).first()
    if not baja:
        raise HTTPException(404, "Baja no encontrada")
    return baja


@router.get("/", response_model=list[BajaOut])
def listar(db: Session = Depends(get_db)):
    return (
        _con_referencias(db.query(BajaHerramienta))
        .order_by(BajaHerramienta.fecha.desc(), BajaHerramienta.id.desc())
        .all()
    )


@router.get("/{baja_id}", response_model=BajaOut)
def obtener(baja_id: int, db: Session = Depends(get_db)):
    return _obtener(baja_id, db)


@router.post("/", response_model=BajaOut, status_code=201)
def crear(datos: BajaCreate, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    if not datos.items:
        raise HTTPException(422, "Debe incluir al menos una herramienta")

    tecnico = db.get(Empleado, datos.id_numero_empleado_tecnico)
    almacenista = db.get(Empleado, datos.id_numero_empleado_almacenista)
    if not tecnico or not almacenista:
        raise HTTPException(404, "Empleado no encontrado")

    productos = {}
    for item in datos.items:
        if item.codigo_sai_sku not in productos:
            producto = db.get(Producto, item.codigo_sai_sku)
            if not producto:
                raise HTTPException(404, f"Producto no encontrado: {item.codigo_sai_sku}")
            productos[item.codigo_sai_sku] = producto

    baja = BajaHerramienta(
        folio=datos.folio,
        fecha=datos.fecha,
        tecnico_empleado_id=tecnico.id_numero_empleado,
        tecnico_nombre_snapshot=tecnico.nombre_de_empleado,
        tecnico_puesto_snapshot=tecnico.puesto_posicion,
        almacenista_empleado_id=almacenista.id_numero_empleado,
        almacenista_nombre_snapshot=almacenista.nombre_de_empleado,
        almacenista_puesto_snapshot=almacenista.puesto_posicion,
        observaciones=datos.observaciones,
    )
    for orden, item in enumerate(datos.items):
        producto = productos[item.codigo_sai_sku]
        baja.items.append(BajaHerramientaItem(
            orden=orden,
            producto_sku=producto.codigo_sai_sku,
            codigo_sai_sku=producto.codigo_sai_sku,
            descripcion_snapshot=producto.descripcion,
            numero_economico=item.numero_economico or producto.numero_economico,
            diagnostico=item.diagnostico,
        ))

    db.add(baja)
    db.commit()
    return _obtener(baja.id, db)


@router.delete("/{baja_id}", status_code=204)
def eliminar(baja_id: int, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    baja = db.get(BajaHerramienta, baja_id)
    if not baja:
        raise HTTPException(404, "Baja no encontrada")
    db.delete(baja)
    db.commit()


@router.post("/{baja_id}/fotos", response_model=BajaOut)
def agregar_foto(
    baja_id: int,
    archivo: UploadFile = File(...),
    descripcion: str | None = Form(None),
    numeros_economicos: str | None = Form(None),
    db: Session = Depends(get_db),
    _=Depends(bloquear_solo_consulta),
):
    baja = db.get(BajaHerramienta, baja_id)
    if not baja:
        raise HTTPException(404, "Baja no encontrada")
    orden = len(baja.fotos)
    ruta = guardar_archivo(archivo, "BAJA_HERRAMIENTA", f"{baja_id}_{orden}", "FOTO")
    baja.fotos.append(BajaHerramientaFoto(orden=orden, foto=ruta, descripcion=descripcion, numeros_economicos=numeros_economicos))
    db.commit()
    return _obtener(baja_id, db)


@router.delete("/{baja_id}/fotos/{foto_id}", response_model=BajaOut)
def quitar_foto(baja_id: int, foto_id: int, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    foto = (
        db.query(BajaHerramientaFoto)
        .filter(BajaHerramientaFoto.id == foto_id, BajaHerramientaFoto.baja_id == baja_id)
        .first()
    )
    if not foto:
        raise HTTPException(404, "Foto no encontrada")
    db.delete(foto)
    db.commit()
    return _obtener(baja_id, db)


@router.get("/{baja_id}/pdf")
def baja_pdf(baja_id: int, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    """No es un Excel — a un usuario de solo consulta se le bloquea (ver
    bloquear_solo_consulta): es "imprimir", no "consultar"."""
    baja = _obtener(baja_id, db)
    contenido = generar_baja_pdf(baja)
    nombre_archivo = f"baja_{baja.folio}.pdf"
    return StreamingResponse(
        BytesIO(contenido),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{nombre_archivo}"'},
    )
