"""
Migración de un solo uso: carga los 5 CSV rescatados de AppSheet (almacen/extracted/)
a PostgreSQL, y copia almacen/images/ -> backend/uploads/.

Hallazgos de calidad de datos (verificados a mano antes de escribir este script):
- En PRODUCTOS y EMPLEADOS, "Row ID" es la llave real de AppSheet: siempre única, nunca en
  blanco. Las columnas "de negocio" (CODIGO SAI SKU, ID NUMERO EMPLEADO) casi siempre
  coinciden con Row ID, pero hay ~30 filas por tabla donde no (blancos, o un Row ID viejo tipo
  hex que quedó de cuando el campo de negocio estaba vacío al crear el registro) e incluso 1
  colisión real de SKU y 1 de número de empleado ('0' usado por dos personas distintas).
- Estrategia: se usa el valor de negocio como llave primaria cuando es único y no está en
  blanco; si está en blanco o ya fue usado por otra fila, se usa el Row ID de AppSheet como
  respaldo (garantizado único). Se guarda el Row ID original en `appsheet_row_id` para
  trazabilidad. Las referencias en CONTROL DE RESGUARDO que no logren resolverse (blancas o
  apuntando a una llave colisionada) quedan con FK en NULL — se listan al final, no se inventan.
"""
import csv
import shutil
import sys
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from app.database import Base, engine, SessionLocal
from app import models  # noqa: F401
from app.models import Departamento, ClaseFamilia, Empleado, Producto, MovimientoResguardo

BASE = Path(__file__).resolve().parent.parent  # almacen/
CSV_DIR = BASE / "extracted"
IMAGES_SRC = BASE / "images"
UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"


def read_csv(name):
    with open(CSV_DIR / name, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def s(row, col):
    v = row.get(col)
    return v.strip() if v else ""


def s_path(row, col):
    """Como s(), pero para columnas de archivo: quita el prefijo 'images/' que traían
    los CSV (relativo a almacen/) para que quede relativo a UPLOAD_DIR (backend/uploads/),
    que es donde migrate_data.py copia las imágenes y desde donde main.py las sirve.
    Las que ya son URL http(s) (no se alcanzaron a descargar) se dejan tal cual."""
    v = s(row, col)
    if not v or v.startswith("http"):
        return v or None
    if v.startswith("images/"):
        v = v[len("images/"):]
    return v


def to_date(v):
    v = (v or "").strip()
    if not v:
        return None
    return datetime.strptime(v, "%m/%d/%Y").date()


def to_decimal(v):
    v = (v or "").strip()
    if not v:
        return None
    try:
        return Decimal(v)
    except InvalidOperation:
        return None


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    db = SessionLocal()
    report = {"skipped": [], "unresolved_fk": []}

    # ── 1) DEPARTAMENTOS ──────────────────────────────────────────────
    dep_rows = read_csv("DEPARTAMENTO.csv")
    dep_by_name = {}
    for r in dep_rows:
        dep = Departamento(
            appsheet_id=s(r, "ID") or None,
            departamento=s(r, "DEPARTAMENTO"),
            foto_depto=s_path(r, "FOTO DEPTO."),
            encargado_departamento=s(r, "ENCARGADO DE DEPARTAMENTO") or None,
        )
        db.add(dep)
        dep_by_name[dep.departamento] = dep
    db.flush()
    print(f"departamentos: {len(dep_rows)} leídas, {len(dep_rows)} insertadas")

    # ── 2) CLASES_FAMILIA ─────────────────────────────────────────────
    cf_rows = read_csv("CLASE_FAM.csv")
    cf_by_name = {}
    for r in cf_rows:
        cf = ClaseFamilia(
            id_clase_fam=s(r, "ID CLASE FAM") or None,
            clase_familia=s(r, "CLASE / FAMILIA"),
        )
        db.add(cf)
        cf_by_name[cf.clase_familia] = cf
    db.flush()
    print(f"clases_familia: {len(cf_rows)} leídas, {len(cf_rows)} insertadas")

    # ── 3) EMPLEADOS ──────────────────────────────────────────────────
    emp_rows = read_csv("EMPLEADOS.csv")
    emp_business_to_pk = {}  # valor original ID NUMERO EMPLEADO -> pk usada en BD (solo 1a ocurrencia)
    emp_pks_used = set()
    n_emp_inserted = 0
    n_emp_fallback = 0
    for r in emp_rows:
        row_id = s(r, "Row ID")
        business_id = s(r, "ID NUMERO EMPLEADO")
        if business_id and business_id not in emp_pks_used:
            pk = business_id
        else:
            pk = row_id
            n_emp_fallback += 1
        emp_pks_used.add(pk)
        if business_id and business_id not in emp_business_to_pk:
            emp_business_to_pk[business_id] = pk

        dep_name = s(r, "DEPARTAMENTO")
        dep = dep_by_name.get(dep_name)

        emp = Empleado(
            id_numero_empleado=pk,
            appsheet_row_id=row_id,
            nombre_de_empleado=s(r, "NOMBRE DE EMPLEADO"),
            puesto_posicion=s(r, "PUESTO / POSICION") or None,
            departamento_id=dep.id if dep else None,
            jefe_inmediato=s(r, "JEFE INMEDIATO") or None,
            status_empleado=s(r, "STATUS EMPLEADO") or None,
            foto_empleado=s_path(r, "FOTO EMPLEADO"),
            fecha_de_ingreso=to_date(s(r, "FECHA DE INGRESO")),
            correo_electronico=s(r, "CORREO ELECTRONICO") or None,
            telefono=s(r, "TELEFONO") or None,
        )
        db.add(emp)
        n_emp_inserted += 1
    db.flush()
    print(f"empleados: {len(emp_rows)} leídas, {n_emp_inserted} insertadas ({n_emp_fallback} con Row ID como llave por blanco/duplicado)")

    # ── 4) PRODUCTOS ──────────────────────────────────────────────────
    prod_rows = read_csv("PRODUCTOS.csv")
    prod_business_to_pk = {}
    prod_pks_used = set()
    n_prod_inserted = 0
    n_prod_fallback = 0
    for r in prod_rows:
        row_id = s(r, "Row ID")
        business_sku = s(r, "CODIGO SAI SKU")
        if business_sku and business_sku not in prod_pks_used:
            pk = business_sku
        else:
            pk = row_id
            n_prod_fallback += 1
        prod_pks_used.add(pk)
        if business_sku and business_sku not in prod_business_to_pk:
            prod_business_to_pk[business_sku] = pk

        clase_name = s(r, "CLASE / FAMILIA")
        cf = cf_by_name.get(clase_name)

        prod = Producto(
            codigo_sai_sku=pk,
            appsheet_row_id=row_id,
            tool_id=s(r, "Tool Id") or None,
            descripcion=s(r, "DESCRIPCION"),
            udm=s(r, "UDM") or None,
            almacen=s(r, "ALMACEN") or None,
            clase_familia_id=cf.id if cf else None,
            numero_economico=s(r, "NUMERO ECONOMICO") or None,
            inventario_inicial=to_decimal(s(r, "INVENTARIO INICIAL")) or Decimal(0),
            costo_unitario=to_decimal(s(r, "COSTO UNITARIO")),
            foto_producto=s_path(r, "FOTO PRODUCTO"),
            ubicacion=s(r, "UBICACION") or None,
            minimo=to_decimal(s(r, "MINIMO")),
            maximo=to_decimal(s(r, "MAXIMO")),
            fecha_de_alta=to_date(s(r, "FECHA DE ALTA")),
            scan_document=s_path(r, "SCAN DOCUMENT"),
        )
        db.add(prod)
        n_prod_inserted += 1
    db.flush()
    print(f"productos: {len(prod_rows)} leídas, {n_prod_inserted} insertadas ({n_prod_fallback} con Row ID como llave por blanco/duplicado)")

    # ── 5) MOVIMIENTOS_RESGUARDO ─────────────────────────────────────
    mov_rows = read_csv("CONTROL_DE_RESGUARDO.csv")
    n_mov_inserted = 0
    n_emp_unresolved = 0
    n_prod_unresolved = 0
    for r in mov_rows:
        emp_business = s(r, "ID NUMERO EMPLEADO")
        prod_business = s(r, "CODIGO SAI SKU")
        empleado_id = emp_business_to_pk.get(emp_business)
        producto_sku = prod_business_to_pk.get(prod_business)
        if emp_business and not empleado_id:
            n_emp_unresolved += 1
            report["unresolved_fk"].append(("movimiento->empleado", s(r, "Row ID"), emp_business))
        if prod_business and not producto_sku:
            n_prod_unresolved += 1
            report["unresolved_fk"].append(("movimiento->producto", s(r, "Row ID"), prod_business))

        mov = MovimientoResguardo(
            row_id=s(r, "Row ID"),
            fecha_movimiento=to_date(s(r, "Fecha Movimiento")),
            numero_de_vale=s(r, "Numero de Vale") or None,
            foto_vale_de_salida=s_path(r, "FOTO VALE DE SALIDA"),
            tipo_movimiento=s(r, "TIPO MOVIMIENTO"),
            id_numero_empleado=emp_business or None,
            empleado_id=empleado_id,
            nombre_de_empleado_snapshot=s(r, "NOMBRE DE EMPLEADO") or None,
            puesto_posicion=s(r, "PUESTO / POSICION") or None,
            departamento=s(r, "DEPARTAMENTO") or None,
            jefe_inmediato=s(r, "JEFE INMEDIATO") or None,
            status=s(r, "STATUS") or None,
            codigo_sai_sku=prod_business or None,
            producto_sku=producto_sku,
            descripcion_snapshot=s(r, "DESCRIPCION") or None,
            udm=s(r, "UDM") or None,
            numero_economico=s(r, "NUMERO ECONOMICO") or None,
            clase_familia=s(r, "CLASE / FAMILIA") or None,
            costo_unitario=to_decimal(s(r, "Costo Unitario")),
            cantidad=to_decimal(s(r, "CANTIDAD")) or Decimal(0),
            foto_producto_snapshot=s_path(r, "FOTO PRODUCTO"),
            foto_numero_serie=s_path(r, "FOTO # NUMERO SERIE"),
            firma_recibido_conformidad=s_path(r, "FIRMA DE RECIBIDO Y CONFORMIDAD"),
            observaciones=s(r, "OBSERVACIONES") or None,
        )
        db.add(mov)
        n_mov_inserted += 1
    db.commit()
    print(f"movimientos_resguardo: {len(mov_rows)} leídas, {n_mov_inserted} insertadas")
    print(f"  referencias a empleado sin resolver: {n_emp_unresolved}")
    print(f"  referencias a producto sin resolver: {n_prod_unresolved}")

    # ── 6) Verificación: recalcular STOCK y comparar contra el CSV ──
    print("\n═══ Verificación de STOCK ═══")
    stock_csv = {s(r, "CODIGO SAI SKU") or s(r, "Row ID"): to_decimal(s(r, "STOCK")) for r in prod_rows}
    # recalcular en Python contra lo que quedó insertado, agrupando por producto_sku resuelto
    from collections import defaultdict
    salidas = defaultdict(Decimal)
    entradas = defaultdict(Decimal)
    for r in mov_rows:
        prod_business = s(r, "CODIGO SAI SKU")
        pk = prod_business_to_pk.get(prod_business)
        if not pk:
            continue
        cantidad = to_decimal(s(r, "CANTIDAD")) or Decimal(0)
        if s(r, "TIPO MOVIMIENTO") == "SALIDA":
            salidas[pk] += cantidad
        elif s(r, "TIPO MOVIMIENTO") == "ENTRADA":
            entradas[pk] += cantidad

    mismatches = 0
    checked = 0
    for r in prod_rows:
        business_sku = s(r, "CODIGO SAI SKU")
        pk = prod_business_to_pk.get(business_sku) if business_sku else None
        if not pk:
            continue  # producto con SKU en blanco/colisión: se salta la verificación
        inv_inicial = to_decimal(s(r, "INVENTARIO INICIAL")) or Decimal(0)
        computed = inv_inicial - salidas[pk] + entradas[pk]
        expected = to_decimal(s(r, "STOCK"))
        checked += 1
        if expected is not None and computed != expected:
            mismatches += 1
            if mismatches <= 10:
                print(f"  MISMATCH {pk}: esperado={expected} calculado={computed}")
    print(f"Productos verificados: {checked}, coincidencias: {checked - mismatches}, mismatches: {mismatches}")

    # ── 7) Copiar imágenes ────────────────────────────────────────────
    print("\n═══ Copiando imágenes ═══")
    if UPLOADS_DIR.exists():
        print(f"  {UPLOADS_DIR} ya existe, se omite la copia (bórrala manualmente si quieres repetirla)")
    else:
        shutil.copytree(IMAGES_SRC, UPLOADS_DIR)
        n_files = sum(1 for _ in UPLOADS_DIR.rglob("*") if _.is_file())
        print(f"  copiados {n_files} archivos a {UPLOADS_DIR}")

    # ── 8) Reporte de FKs sin resolver ────────────────────────────────
    if report["unresolved_fk"]:
        print(f"\n═══ {len(report['unresolved_fk'])} referencias sin resolver (primeras 20) ═══")
        for kind, row_id, value in report["unresolved_fk"][:20]:
            print(f"  {kind}: movimiento {row_id} -> '{value}' no encontrado")

    db.close()
    print("\nMigración completa.")


if __name__ == "__main__":
    main()
