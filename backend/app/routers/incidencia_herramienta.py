from datetime import date
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import IncidenciaHerramienta, IncidenciaHerramientaItem, Empleado
from app.schemas.incidencia_herramienta import IncidenciaCreate, IncidenciaOut
from app.services.folio import siguiente_folio_incidencia
from app.services.incidencia_pdf import generar_incidencia_pdf
from app.deps_auth import usuario_actual, bloquear_solo_consulta

router = APIRouter(prefix="/incidencias-herramienta", tags=["Incidencia de Herramienta"], dependencies=[Depends(usuario_actual)])


def _con_referencias(query):
    return query.options(
        joinedload(IncidenciaHerramienta.empleado_ref),
        joinedload(IncidenciaHerramienta.items).joinedload(IncidenciaHerramientaItem.producto_ref),
    )


def _obtener(incidencia_id: int, db: Session) -> IncidenciaHerramienta:
    incidencia = (
        _con_referencias(db.query(IncidenciaHerramienta))
        .filter(IncidenciaHerramienta.id == incidencia_id)
        .first()
    )
    if not incidencia:
        raise HTTPException(404, "Incidencia no encontrada")
    return incidencia


@router.get("/", response_model=list[IncidenciaOut])
def listar(db: Session = Depends(get_db)):
    return (
        _con_referencias(db.query(IncidenciaHerramienta))
        .order_by(IncidenciaHerramienta.fecha_reporte.desc(), IncidenciaHerramienta.id.desc())
        .all()
    )


@router.get("/siguiente-folio")
def siguiente_folio(fecha: date, db: Session = Depends(get_db)):
    """Folio sugerido (IH-MMDDAA-NNN) para precargar el formulario — el
    campo sigue siendo editable, esto solo evita tener que calcularlo a mano."""
    return {"folio": siguiente_folio_incidencia(db, fecha)}


@router.get("/{incidencia_id}", response_model=IncidenciaOut)
def obtener(incidencia_id: int, db: Session = Depends(get_db)):
    return _obtener(incidencia_id, db)


@router.post("/", response_model=IncidenciaOut, status_code=201)
def crear(datos: IncidenciaCreate, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    if not datos.items:
        raise HTTPException(422, "Debe incluir al menos una herramienta")

    empleado = db.get(Empleado, datos.id_numero_empleado)
    if not empleado:
        raise HTTPException(404, "Empleado no encontrado")

    incidencia = IncidenciaHerramienta(
        folio=datos.folio,
        fecha_reporte=datos.fecha_reporte,
        hora_reporte=datos.hora_reporte,
        lugar_fecha_suceso=datos.lugar_fecha_suceso,
        empleado_id=empleado.id_numero_empleado,
        empleado_nombre_snapshot=empleado.nombre_de_empleado,
        empleado_puesto_snapshot=empleado.puesto_posicion,
        empleado_supervisor_snapshot=empleado.jefe_inmediato,
        empleado_departamento_snapshot=empleado.departamento_ref.departamento if empleado.departamento_ref else None,
        tipos_incidente=datos.tipos_incidente,
        descripcion_evento=datos.descripcion_evento,
    )
    for orden, item in enumerate(datos.items):
        incidencia.items.append(IncidenciaHerramientaItem(
            orden=orden,
            producto_sku=item.producto_sku,
            numero_vale=item.numero_vale,
            cantidad=item.cantidad,
            numero_economico=item.numero_economico,
            estado_previo=item.estado_previo,
            valor_aprox=item.valor_aprox,
        ))

    db.add(incidencia)
    db.commit()
    return _obtener(incidencia.id, db)


@router.delete("/{incidencia_id}", status_code=204)
def eliminar(incidencia_id: int, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    incidencia = db.get(IncidenciaHerramienta, incidencia_id)
    if not incidencia:
        raise HTTPException(404, "Incidencia no encontrada")
    db.delete(incidencia)
    db.commit()


@router.get("/{incidencia_id}/pdf")
def incidencia_pdf(incidencia_id: int, db: Session = Depends(get_db), _=Depends(bloquear_solo_consulta)):
    """No es un Excel — a un usuario de solo consulta se le bloquea (ver
    bloquear_solo_consulta): es "imprimir", no "consultar"."""
    incidencia = _obtener(incidencia_id, db)
    contenido = generar_incidencia_pdf(incidencia)
    nombre_archivo = f"incidencia_{incidencia.folio}.pdf"
    return StreamingResponse(
        BytesIO(contenido),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{nombre_archivo}"'},
    )
