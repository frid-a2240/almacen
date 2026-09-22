from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Empleado, MovimientoResguardo
from app.schemas.empleado import EmpleadoOut, EmpleadoCreate, EmpleadoUpdate
from app.schemas.movimiento_resguardo import MovimientoOut
from app.services.uploads import guardar_archivo
from app.services.resguardo import resguardo_actual_de, saldos_por_sku, historial_herramientas_de
from app.services.inventario_excel import generar_inventario_xlsm
from app.services.resguardo_pdf import generar_resguardo_pdf
from app.services.historico_excel import generar_historico_empleado_excel
from app.services.no_adeudo_pdf import generar_no_adeudo_pdf
from app.services.folio import siguiente_folio_no_adeudo
from app.deps_auth import usuario_actual, bloquear_solo_consulta

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
def crear(datos: EmpleadoCreate, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    if db.get(Empleado, datos.id_numero_empleado):
        raise HTTPException(409, "Ya existe un empleado con ese número")
    emp = Empleado(**datos.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _to_out(emp)


@router.put("/{id_numero_empleado}", response_model=EmpleadoOut)
def actualizar(id_numero_empleado: str, datos: EmpleadoUpdate, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(emp, campo, valor)
    db.commit()
    db.refresh(emp)
    return _to_out(emp)


@router.delete("/{id_numero_empleado}", status_code=204)
def eliminar(id_numero_empleado: str, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")
    # No se puede dar de baja con herramienta pendiente de devolver — primero
    # hay que traspasarla/regresarla (o emitir la Constancia de No Adeudo,
    # que de por sí ya exige esto mismo para poder generarse).
    pendientes = resguardo_actual_de(db, id_numero_empleado)
    if pendientes:
        raise HTTPException(
            422,
            f"No se puede dar de baja: {emp.nombre_de_empleado} todavía tiene "
            f"{len(pendientes)} herramienta(s) en resguardo.",
        )
    # Sus movimientos históricos (ya con saldo en 0) se quedan — solo se
    # suelta la referencia al empleado (la llave foránea) para poder
    # borrarlo; cada renglón ya trae su propia copia de nombre/puesto/etc.
    # (nombre_de_empleado_snapshot y similares), así que el historial se
    # sigue viendo bien aunque el empleado ya no exista.
    db.query(MovimientoResguardo).filter(MovimientoResguardo.empleado_id == id_numero_empleado).update(
        {"empleado_id": None}
    )
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



@router.get("/{id_numero_empleado}/resguardo-actual")
def resguardo_actual(id_numero_empleado: str, db: Session = Depends(get_db)):
    """Lo que el empleado tiene ahorita en resguardo (su "cardex"), en JSON —
    a diferencia de resguardo-excel/resguardo-pdf (para imprimir), esto lo
    usa el formulario de Incidencia de Herramienta para que, al elegir el
    empleado, se pueda escoger de qué vale es la herramienta del reporte."""
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")
    return resguardo_actual_de(db, id_numero_empleado)


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


@router.get("/{id_numero_empleado}/historico-excel")
def historico_excel(id_numero_empleado: str, db: Session = Depends(get_db)):
    """Registro histórico completo (Excel): TODOS los movimientos del
    empleado, actuales y ya devueltos/traspasados — a diferencia de
    resguardo-excel, que solo trae lo que tiene ahorita."""
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")

    movimientos = (
        db.query(MovimientoResguardo)
        .options(joinedload(MovimientoResguardo.producto_ref))
        .filter(MovimientoResguardo.empleado_id == id_numero_empleado)
        .order_by(MovimientoResguardo.fecha_movimiento.desc(), MovimientoResguardo.row_id.desc())
        .all()
    )
    saldos = saldos_por_sku(db, id_numero_empleado)
    filas = [
        {
            "fecha": mov.fecha_movimiento,
            "tipo_movimiento": mov.tipo_movimiento,
            "numero_de_vale": mov.numero_de_vale,
            "sku": mov.producto_sku or mov.codigo_sai_sku,
            "descripcion": mov.descripcion,
            "cantidad": mov.cantidad,
            "numero_economico": mov.numero_economico,
            "costo_unitario": mov.costo_unitario,
            "observaciones": mov.observaciones,
            "activo": saldos.get(mov.producto_sku or mov.codigo_sai_sku, 0) > 0,
        }
        for mov in movimientos
    ]
    contenido = generar_historico_empleado_excel(
        emp.nombre_de_empleado, emp.id_numero_empleado, emp.puesto_posicion, filas,
    )

    nombre_archivo = f"historico_{id_numero_empleado}.xlsx"
    return StreamingResponse(
        BytesIO(contenido),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


@router.get("/{id_numero_empleado}/resguardo-pdf")
def resguardo_pdf(id_numero_empleado: str, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    """Mismos datos que resguardo-excel, pero como PDF listo para imprimir
    (en la tablet, bajar un .xlsm no sirve de mucho). A un usuario de solo
    consulta se le bloquea (no es un Excel, es "imprimir")."""
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")

    filas = resguardo_actual_de(db, id_numero_empleado)
    contenido = generar_resguardo_pdf(
        emp.nombre_de_empleado, emp.id_numero_empleado, emp.puesto_posicion, filas,
    )

    nombre_archivo = f"resguardo_{id_numero_empleado}.pdf"
    return StreamingResponse(
        BytesIO(contenido),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{nombre_archivo}"'},
    )


@router.get("/{id_numero_empleado}/no-adeudo-pdf")
def no_adeudo_pdf(id_numero_empleado: str, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    """Constancia de No Adeudo — solo se puede generar si el empleado ya no
    tiene ninguna herramienta en resguardo (mismo requisito que para darlo de
    baja). Cada vez que se genera se le asigna un folio nuevo."""
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")

    pendientes = resguardo_actual_de(db, id_numero_empleado)
    if pendientes:
        raise HTTPException(
            422,
            f"No se puede emitir la constancia: {emp.nombre_de_empleado} todavía tiene "
            f"{len(pendientes)} herramienta(s) en resguardo.",
        )

    folio = siguiente_folio_no_adeudo(db)
    herramientas = historial_herramientas_de(db, id_numero_empleado)
    contenido = generar_no_adeudo_pdf(
        emp.nombre_de_empleado, emp.id_numero_empleado, emp.puesto_posicion, folio, herramientas,
    )

    nombre_archivo = f"no_adeudo_{id_numero_empleado}.pdf"
    return StreamingResponse(
        BytesIO(contenido),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{nombre_archivo}"'},
    )


@router.post("/{id_numero_empleado}/foto", response_model=EmpleadoOut)
def subir_foto(id_numero_empleado: str, archivo: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    emp = db.get(Empleado, id_numero_empleado)
    if not emp:
        raise HTTPException(404, "Empleado no encontrado")
    emp.foto_empleado = guardar_archivo(archivo, "EMPLEADOS", id_numero_empleado, "FOTO_EMPLEADO")
    db.commit()
    db.refresh(emp)
    return _to_out(emp)
