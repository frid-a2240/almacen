from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ClaseFamilia, Producto, MovimientoResguardo
from app.schemas.clase_familia import ClaseFamiliaOut, ClaseFamiliaCreate, ClaseFamiliaUpdate
from app.schemas.producto import ProductoOut
from app.schemas.movimiento_resguardo import MovimientoOut
from app.services.stock import stock_subquery
from app.deps_auth import usuario_actual

router = APIRouter(prefix="/clases-familia", tags=["Clases y Familias"], dependencies=[Depends(usuario_actual)])


def _con_conteo(db: Session):
    return (
        db.query(ClaseFamilia, func.count(Producto.codigo_sai_sku))
        .outerjoin(Producto, Producto.clase_familia_id == ClaseFamilia.id)
        .group_by(ClaseFamilia.id)
    )


def _to_out(cf: ClaseFamilia, num_productos: int) -> ClaseFamiliaOut:
    out = ClaseFamiliaOut.model_validate(cf)
    out.num_productos = num_productos
    return out


@router.get("/", response_model=list[ClaseFamiliaOut])
def listar(db: Session = Depends(get_db)):
    return [_to_out(c, n) for c, n in _con_conteo(db).order_by(ClaseFamilia.clase_familia).all()]


@router.get("/{clase_id}", response_model=ClaseFamiliaOut)
def obtener(clase_id: int, db: Session = Depends(get_db)):
    row = _con_conteo(db).filter(ClaseFamilia.id == clase_id).first()
    if not row:
        raise HTTPException(404, "Clase / Familia no encontrada")
    return _to_out(*row)


@router.post("/", response_model=ClaseFamiliaOut, status_code=201)
def crear(datos: ClaseFamiliaCreate, db: Session = Depends(get_db)):
    cf = ClaseFamilia(**datos.model_dump())
    db.add(cf)
    db.commit()
    db.refresh(cf)
    return _to_out(cf, 0)


@router.put("/{clase_id}", response_model=ClaseFamiliaOut)
def actualizar(clase_id: int, datos: ClaseFamiliaUpdate, db: Session = Depends(get_db)):
    cf = db.get(ClaseFamilia, clase_id)
    if not cf:
        raise HTTPException(404, "Clase / Familia no encontrada")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(cf, campo, valor)
    db.commit()
    db.refresh(cf)
    row = _con_conteo(db).filter(ClaseFamilia.id == clase_id).first()
    return _to_out(*row)


@router.get("/{clase_id}/productos", response_model=list[ProductoOut])
def productos_de_clase(clase_id: int, db: Session = Depends(get_db)):
    rows = stock_subquery(db).filter(Producto.clase_familia_id == clase_id).order_by(Producto.descripcion).all()
    salida = []
    for p, s in rows:
        out = ProductoOut.model_validate(p)
        out.clase_familia_nombre = p.clase_familia_ref.clase_familia if p.clase_familia_ref else None
        out.stock = s
        salida.append(out)
    return salida


@router.get("/{clase_id}/movimientos", response_model=list[MovimientoOut])
def movimientos_de_clase(clase_id: int, db: Session = Depends(get_db)):
    cf = db.get(ClaseFamilia, clase_id)
    if not cf:
        raise HTTPException(404, "Clase / Familia no encontrada")
    return (
        db.query(MovimientoResguardo)
        .filter(MovimientoResguardo.clase_familia == cf.clase_familia)
        .order_by(MovimientoResguardo.fecha_movimiento.desc())
        .all()
    )


@router.delete("/{clase_id}", status_code=204)
def eliminar(clase_id: int, db: Session = Depends(get_db)):
    cf = db.get(ClaseFamilia, clase_id)
    if not cf:
        raise HTTPException(404, "Clase / Familia no encontrada")
    db.delete(cf)
    db.commit()
