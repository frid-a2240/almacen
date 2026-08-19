from copy import copy as _copiar_estilo
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from openpyxl import load_workbook
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



# Se parte del archivo real que mandaron ("Copia de IMPRESION INVENTARIO
# APPSHEET MCR (003).xlsm", copiado tal cual a templates/) en vez de armar el
# Excel desde cero: así se conserva el diseño completo (logo, iconos, tarjeta
# de "Costo Total", colores/rayas de la tabla) sin tener que reconstruirlo a
# mano. Solo se escriben los datos en las celdas correctas; el resto del
# archivo (imágenes, estilos, fórmulas de fecha/total) se queda como está.
_PLANTILLA_INVENTARIO = Path(__file__).resolve().parent.parent / "templates" / "inventario_herramienta.xlsm"
_ULTIMA_FILA_CON_FORMATO = 50  # hasta aquí la plantilla ya trae formato y fórmula de Costo Total listos


def _asegurar_formato_fila(ws, r):
    """Filas más allá de las 50 que ya trae la plantilla no tienen formato/
    fórmula propios — se copian de la fila 50 antes de escribir el dato."""
    if r <= _ULTIMA_FILA_CON_FORMATO:
        return
    for c in range(1, 11):
        origen = ws.cell(row=_ULTIMA_FILA_CON_FORMATO, column=c)
        destino = ws.cell(row=r, column=c)
        destino.number_format = origen.number_format
        destino.font = _copiar_estilo(origen.font)
        destino.border = _copiar_estilo(origen.border)
        destino.fill = _copiar_estilo(origen.fill)


@router.get("/{id_numero_empleado}/resguardo-excel")
def resguardo_excel(id_numero_empleado: str, db: Session = Depends(get_db)):
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")

    filas = resguardo_actual_de(db, id_numero_empleado)

    wb = load_workbook(_PLANTILLA_INVENTARIO, keep_vba=True)
    ws = wb.active

    # D4/D5: las dos cajas con borde debajo del título — nombre completo +
    # número de empleado en una, puesto en la otra. FECHA (F1) ya trae
    # =TODAY() y el Total (I4) ya trae =SUM(Tabla5[...]) — no se tocan.
    ws["D4"] = f"{emp.nombre_de_empleado} ({emp.id_numero_empleado})"
    ws["D5"] = emp.puesto_posicion

    for offset, f in enumerate(filas):
        r = 8 + offset
        _asegurar_formato_fila(ws, r)
        ws.cell(row=r, column=1, value=f["fecha"])
        ws.cell(row=r, column=2, value=f["numero_de_vale"])
        ws.cell(row=r, column=3, value=f["sku"])
        ws.cell(row=r, column=4, value=f["descripcion"])
        ws.cell(row=r, column=5, value=f["udm"])
        ws.cell(row=r, column=6, value=f["numero_economico"])
        ws.cell(row=r, column=7, value=float(f["cantidad"]))
        ws.cell(row=r, column=8, value=f["observaciones"])
        costo = float(f["costo_unitario"]) if f["costo_unitario"] is not None else None
        ws.cell(row=r, column=9, value=costo)
        ws.cell(row=r, column=10, value=f"=I{r}*G{r}" if costo is not None else None)

    # La tabla (Tabla5) trae de fábrica hasta la fila 50 con espacio de sobra
    # para imprimir; si un empleado tiene más artículos que eso, se extiende.
    ultima_fila = max(_ULTIMA_FILA_CON_FORMATO, 7 + len(filas))
    ws.tables["Tabla5"].ref = f"A7:J{ultima_fila}"

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    nombre_archivo = f"inventario_{id_numero_empleado}.xlsm"
    return StreamingResponse(
        buffer,
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
