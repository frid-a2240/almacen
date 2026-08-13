from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Departamento, Empleado, MovimientoResguardo
from app.schemas.departamento import DepartamentoOut, DepartamentoCreate, DepartamentoUpdate
from app.schemas.empleado import EmpleadoOut
from app.schemas.movimiento_resguardo import MovimientoOut
from app.services.uploads import guardar_archivo
from app.deps_auth import usuario_actual

router = APIRouter(prefix="/departamentos", tags=["Departamentos"], dependencies=[Depends(usuario_actual)])


def _con_conteo(db: Session):
    return (
        db.query(Departamento, func.count(Empleado.id_numero_empleado))
        .outerjoin(Empleado, Empleado.departamento_id == Departamento.id)
        .group_by(Departamento.id)
    )


def _to_out(dep: Departamento, num_empleados: int) -> DepartamentoOut:
    out = DepartamentoOut.model_validate(dep)
    out.num_empleados = num_empleados
    return out


@router.get("/", response_model=list[DepartamentoOut])
def listar(db: Session = Depends(get_db)):
    return [_to_out(d, n) for d, n in _con_conteo(db).order_by(Departamento.departamento).all()]


@router.get("/{departamento_id}", response_model=DepartamentoOut)
def obtener(departamento_id: int, db: Session = Depends(get_db)):
    row = _con_conteo(db).filter(Departamento.id == departamento_id).first()
    if not row:
        raise HTTPException(404, "Departamento no encontrado")
    return _to_out(*row)


@router.post("/", response_model=DepartamentoOut, status_code=201)
def crear(datos: DepartamentoCreate, db: Session = Depends(get_db)):
    dep = Departamento(**datos.model_dump())
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return _to_out(dep, 0)


@router.put("/{departamento_id}", response_model=DepartamentoOut)
def actualizar(departamento_id: int, datos: DepartamentoUpdate, db: Session = Depends(get_db)):
    dep = db.get(Departamento, departamento_id)
    if not dep:
        raise HTTPException(404, "Departamento no encontrado")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(dep, campo, valor)
    db.commit()
    db.refresh(dep)
    row = _con_conteo(db).filter(Departamento.id == departamento_id).first()
    return _to_out(*row)


@router.delete("/{departamento_id}", status_code=204)
def eliminar(departamento_id: int, db: Session = Depends(get_db)):
    dep = db.get(Departamento, departamento_id)
    if not dep:
        raise HTTPException(404, "Departamento no encontrado")
    db.delete(dep)
    db.commit()


@router.get("/{departamento_id}/empleados", response_model=list[EmpleadoOut])
def empleados_de_departamento(departamento_id: int, db: Session = Depends(get_db)):
    empleados = (
        db.query(Empleado)
        .filter(Empleado.departamento_id == departamento_id)
        .order_by(Empleado.nombre_de_empleado)
        .all()
    )
    salida = []
    for e in empleados:
        out = EmpleadoOut.model_validate(e)
        out.departamento_nombre = e.departamento_ref.departamento if e.departamento_ref else None
        salida.append(out)
    return salida


@router.get("/{departamento_id}/movimientos", response_model=list[MovimientoOut])
def movimientos_de_departamento(departamento_id: int, db: Session = Depends(get_db)):
    dep = db.get(Departamento, departamento_id)
    if not dep:
        raise HTTPException(404, "Departamento no encontrado")
    return (
        db.query(MovimientoResguardo)
        .filter(MovimientoResguardo.departamento == dep.departamento)
        .order_by(MovimientoResguardo.fecha_movimiento.desc())
        .all()
    )


@router.post("/{departamento_id}/foto", response_model=DepartamentoOut)
def subir_foto(departamento_id: int, archivo: UploadFile = File(...), db: Session = Depends(get_db)):
    dep = db.get(Departamento, departamento_id)
    if not dep:
        raise HTTPException(404, "Departamento no encontrado")
    dep.foto_depto = guardar_archivo(archivo, "DEPARTAMENTO", str(departamento_id), "FOTO_DEPTO")
    db.commit()
    db.refresh(dep)
    row = _con_conteo(db).filter(Departamento.id == departamento_id).first()
    return _to_out(*row)
