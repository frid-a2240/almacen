from datetime import date
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Empleado, MovimientoResguardo
from app.schemas.empleado import EmpleadoOut, EmpleadoCreate, EmpleadoUpdate
from app.schemas.movimiento_resguardo import MovimientoOut
from app.services.uploads import guardar_archivo
from app.services.resguardo import resguardo_actual_de
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



# Layout de la plantilla nueva "Copia de IMPRESION INVENTARIO APPSHEET MCR
# (003).xlsm" (hoja "INVENTARIO PERSONAL") — reemplaza a la versión de 22
# columnas: ya no trae departamento/jefe inmediato/status/clase-familia ni
# columnas de foto/firma, solo lo esencial del vale. Se imprime y se firma a
# mano, por eso no hay nada de fotos.
_COLUMNAS_INVENTARIO = [
    "FECHA ADQ.", "# VALE", "CODIGO SAI SKU", "DESCRIPCIÓN", "UDM",
    "#ECONOM", "QTY", "OBSERVACIONES", "Costo Unitario", "Costo Total",
]
_ANCHOS_INVENTARIO = [12.9, 8.1, 19.0, 78.3, 9.3, 9.4, 9.4, 16.0, 10.4, 13.1]
_FILA_ENCABEZADO = 7
_FILA_PRIMER_DATO = 8
_FORMATO_FECHA = "mm-dd-yy"
_FORMATO_MONEDA = '"$"#,##0.00'


@router.get("/{id_numero_empleado}/resguardo-excel")
def resguardo_excel(id_numero_empleado: str, db: Session = Depends(get_db)):
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")

    filas = resguardo_actual_de(db, id_numero_empleado)

    wb = Workbook()
    ws = wb.active
    ws.title = "INVENTARIO PERSONAL"

    negrita = Font(bold=True)

    ws["D1"] = "INVENTARIO DE HERRAMIENTA"
    ws["D1"].font = Font(bold=True, size=14)
    # D4/D5: las dos cajas con borde debajo del título en la plantilla —
    # nombre completo + número de empleado en una, puesto en la otra.
    ws["D4"] = f"{emp.nombre_de_empleado} ({emp.id_numero_empleado})"
    ws["D5"] = emp.puesto_posicion

    ws["E1"] = "FECHA:"
    ws["E1"].font = negrita
    ws["F1"] = date.today()
    ws["F1"].number_format = _FORMATO_FECHA

    ws["I3"] = "Total :"
    ws["I3"].font = negrita
    ws["E4"] = "___________________________________________"
    ws["E5"] = "FIRMA DE CONFORMIDAD"

    for i, nombre in enumerate(_COLUMNAS_INVENTARIO, start=1):
        celda = ws.cell(row=_FILA_ENCABEZADO, column=i, value=nombre)
        celda.font = negrita

    for offset, f in enumerate(filas):
        r = _FILA_PRIMER_DATO + offset
        ws.cell(row=r, column=1, value=f["fecha"]).number_format = _FORMATO_FECHA
        ws.cell(row=r, column=2, value=f["numero_de_vale"])
        ws.cell(row=r, column=3, value=f["sku"])
        ws.cell(row=r, column=4, value=f["descripcion"])
        ws.cell(row=r, column=5, value=f["udm"])
        ws.cell(row=r, column=6, value=f["numero_economico"])
        ws.cell(row=r, column=7, value=float(f["cantidad"]))
        ws.cell(row=r, column=8, value=f["observaciones"])
        costo = float(f["costo_unitario"]) if f["costo_unitario"] is not None else None
        ws.cell(row=r, column=9, value=costo).number_format = _FORMATO_MONEDA
        if costo is not None:
            ws.cell(row=r, column=10, value=f"=I{r}*G{r}")
            ws.cell(row=r, column=10).number_format = _FORMATO_MONEDA

    if filas:
        ultima_fila = _FILA_PRIMER_DATO + len(filas) - 1
        ws["I4"] = f"=SUM(J{_FILA_PRIMER_DATO}:J{ultima_fila})"
    else:
        ws["I4"] = 0
    ws["I4"].number_format = _FORMATO_MONEDA

    for i, ancho in enumerate(_ANCHOS_INVENTARIO, start=1):
        ws.column_dimensions[get_column_letter(i)].width = ancho

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    nombre_archivo = f"inventario_{id_numero_empleado}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
