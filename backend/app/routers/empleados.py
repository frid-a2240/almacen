from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Empleado, MovimientoResguardo
from app.schemas.empleado import EmpleadoOut, EmpleadoCreate, EmpleadoUpdate
from app.schemas.movimiento_resguardo import MovimientoOut
from app.services.uploads import guardar_archivo
from app.services.resguardo import resguardo_actual_de
from app.services.inventario_excel import generar_inventario_xlsm
from app.deps_auth import usuario_actual

router = APIRouter(prefix="/empleados", tags=["Empleados"], dependencies=[Depends(usuario_actual)])


def _to_out(emp: Empleado) -> EmpleadoOut:
    out = EmpleadoOut.model_validate(emp)
    out.departamento_nombre = emp.departamento_ref.departamento if emp.departamento_ref else None
    return out


@router.get("/", response_model=list[EmpleadoOut])
def listar(db: Session = Depends(get_db)):
    empleados = (
        db.query(Empleado)
        .options(joinedload(Empleado.departamento_ref))
        .order_by(Empleado.nombre_de_empleado)
        .all()
    )
    return [_to_out(e) for e in empleados]


@router.get("/{id_numero_empleado}", response_model=EmpleadoOut)
def obtener(id_numero_empleado: str, db: Session = Depends(get_db)):
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")
    return _to_out(emp)


@router.post("/", response_model=EmpleadoOut, status_code=201)
def crear(datos: EmpleadoCreate, db: Session = Depends(get_db)):
    if db.get(Empleado, datos.id_numero_empleado):
        raise HTTPException(409, "Ya existe un empleado con ese número")
    emp = Empleado(**datos.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _to_out(emp)


@router.put("/{id_numero_empleado}", response_model=EmpleadoOut)
def actualizar(id_numero_empleado: str, datos: EmpleadoUpdate, db: Session = Depends(get_db)):
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(emp, campo, valor)
    db.commit()
    db.refresh(emp)
    return _to_out(emp)


@router.delete("/{id_numero_empleado}", status_code=204)
def eliminar(id_numero_empleado: str, db: Session = Depends(get_db)):
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")
    db.delete(emp)
    db.commit()


@router.get("/{id_numero_empleado}/movimientos", response_model=list[MovimientoOut])
def movimientos_de_empleado(id_numero_empleado: str, db: Session = Depends(get_db)):
    return (
        db.query(MovimientoResguardo)
        .options(joinedload(MovimientoResguardo.producto_ref), joinedload(MovimientoResguardo.empleado_ref))
        .filter(MovimientoResguardo.empleado_id == id_numero_empleado)
        .order_by(MovimientoResguardo.fecha_movimiento.desc())
        .all()
    )



@router.get("/{id_numero_empleado}/resguardo-excel")
def resguardo_excel(id_numero_empleado: str, db: Session = Depends(get_db)):
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")

    filas = resguardo_actual_de(db, id_numero_empleado)
    contenido = generar_inventario_xlsm(
        emp.nombre_de_empleado, emp.id_numero_empleado, emp.puesto_posicion, filas,
    )

    nombre_archivo = f"inventario_{id_numero_empleado}.xlsm"
    return StreamingResponse(
        BytesIO(contenido),
        media_type="application/vnd.ms-excel.sheet.macroEnabled.12",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


@router.post("/{id_numero_empleado}/foto", response_model=EmpleadoOut)
def subir_foto(id_numero_empleado: str, archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")
    emp.foto_empleado = guardar_archivo(archivo, "EMPLEADOS", id_numero_empleado, "FOTO_EMPLEADO")
    db.commit()
    db.refresh(emp)
    return _to_out(emp)
