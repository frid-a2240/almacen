"""
Actualización incremental: aplica un sync_response más reciente de AppSheet
(ya extraído a extracted_YYYY-MM-DD/ y con imágenes descargadas/relinkeadas)
sobre la base ya migrada. Cada tabla presente en la carpeta viene completa
(no es un diff por fila de AppSheet, solo algunas tablas vienen con
DataSet=None cuando no cambiaron) — así que se hace upsert por llave natural:
actualiza los campos que cambiaron, inserta lo que sea nuevo, nunca borra.

Uso: python update_incremental.py extracted_2026-08-13
"""
import csv
import sys
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from app.database import SessionLocal
from app import models  # noqa: F401
from app.models import Departamento, ClaseFamilia, Empleado, Producto, MovimientoResguardo

BASE = Path(__file__).resolve().parent.parent
CSV_DIR = BASE / sys.argv[1]


def read_csv(name):
    path = CSV_DIR / name
    if not path.exists():
        return None
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def s(row, col):
    v = row.get(col)
    return v.strip() if v else ""


def s_path(row, col):
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


def upsert(db, modelo, pk_valor, campos, contador):
    """Inserta si no existe, actualiza solo los campos que cambiaron si ya existe."""
    obj = db.get(modelo, pk_valor)
    if obj is None:
        obj = modelo(**campos)
        db.add(obj)
        contador["nuevos"] += 1
        return obj
    cambios = []
    for campo, valor in campos.items():
        actual = getattr(obj, campo)
        if actual != valor and not (actual is None and valor is None):
            setattr(obj, campo, valor)
            cambios.append(campo)
    if cambios:
        contador["actualizados"] += 1
        contador["campos_cambiados"][pk_valor] = cambios
    return obj


def upsert_by_unique(db, modelo, campo_llave, llave_valor, campos, contador):
    """Igual que upsert(), pero para tablas con PK surrogate (id SERIAL) donde
    la llave natural real es una columna UNIQUE distinta de la PK (Departamento,
    ClaseFamilia)."""
    obj = db.query(modelo).filter_by(**{campo_llave: llave_valor}).first()
    if obj is None:
        obj = modelo(**campos)
        db.add(obj)
        contador["nuevos"] += 1
        return obj
    cambios = []
    for campo, valor in campos.items():
        actual = getattr(obj, campo)
        if actual != valor and not (actual is None and valor is None):
            setattr(obj, campo, valor)
            cambios.append(campo)
    if cambios:
        contador["actualizados"] += 1
        contador["campos_cambiados"][llave_valor] = cambios
    return obj


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    db = SessionLocal()

    # ── DEPARTAMENTOS ──────────────────────────────────────────────
    dep_rows = read_csv("DEPARTAMENTO.csv")
    if dep_rows is not None:
        c = {"nuevos": 0, "actualizados": 0, "campos_cambiados": {}}
        for r in dep_rows:
            upsert_by_unique(db, Departamento, "departamento", s(r, "DEPARTAMENTO"), {
                "appsheet_id": s(r, "ID") or None,
                "departamento": s(r, "DEPARTAMENTO"),
                "foto_depto": s_path(r, "FOTO DEPTO."),
                "encargado_departamento": s(r, "ENCARGADO DE DEPARTAMENTO") or None,
            }, c)
        db.flush()
        print(f"departamentos: {len(dep_rows)} leídas, {c['nuevos']} nuevas, {c['actualizados']} actualizadas")
        for pk, campos in list(c["campos_cambiados"].items())[:10]:
            print(f"    {pk}: cambió {campos}")
    else:
        print("departamentos: sin cambios en este sync")

    dep_by_name = {d.departamento: d for d in db.query(Departamento).all()}

    # ── CLASES_FAMILIA ─────────────────────────────────────────────
    cf_rows = read_csv("CLASE_FAM.csv")
    if cf_rows is not None:
        c = {"nuevos": 0, "actualizados": 0, "campos_cambiados": {}}
        for r in cf_rows:
            upsert_by_unique(db, ClaseFamilia, "clase_familia", s(r, "CLASE / FAMILIA"), {
                "id_clase_fam": s(r, "ID CLASE FAM") or None,
                "clase_familia": s(r, "CLASE / FAMILIA"),
            }, c)
        db.flush()
        print(f"clases_familia: {len(cf_rows)} leídas, {c['nuevos']} nuevas, {c['actualizados']} actualizadas")
    else:
        print("clases_familia: sin cambios en este sync")

    cf_by_name = {c.clase_familia: c for c in db.query(ClaseFamilia).all()}

    # ── EMPLEADOS ──────────────────────────────────────────────────
    emp_rows = read_csv("EMPLEADOS.csv")
    emp_business_to_pk = {}
    if emp_rows is not None:
        # llaves ya usadas en BD (para respetar la misma lógica de fallback a Row ID)
        pks_existentes = {e.id_numero_empleado for e in db.query(Empleado.id_numero_empleado).all()}
        # ya resueltos por appsheet_row_id, para no crear duplicados si una fila
        # que antes usó Row ID como llave ahora ya trae ID NUMERO EMPLEADO limpio
        by_row_id = {e.appsheet_row_id: e.id_numero_empleado for e in db.query(Empleado).all() if e.appsheet_row_id}

        c = {"nuevos": 0, "actualizados": 0, "campos_cambiados": {}}
        pks_usadas_este_batch = set()
        for r in emp_rows:
            row_id = s(r, "Row ID")
            business_id = s(r, "ID NUMERO EMPLEADO")
            ya_como = by_row_id.get(row_id)
            if ya_como:
                pk = ya_como
            elif business_id and business_id not in pks_usadas_este_batch:
                pk = business_id
            else:
                pk = row_id
            pks_usadas_este_batch.add(pk)
            if business_id and business_id not in emp_business_to_pk:
                emp_business_to_pk[business_id] = pk

            dep = dep_by_name.get(s(r, "DEPARTAMENTO"))
            upsert(db, Empleado, pk, {
                "id_numero_empleado": pk,
                "appsheet_row_id": row_id,
                "nombre_de_empleado": s(r, "NOMBRE DE EMPLEADO"),
                "puesto_posicion": s(r, "PUESTO / POSICION") or None,
                "departamento_id": dep.id if dep else None,
                "jefe_inmediato": s(r, "JEFE INMEDIATO") or None,
                "status_empleado": s(r, "STATUS EMPLEADO") or None,
                "foto_empleado": s_path(r, "FOTO EMPLEADO"),
                "fecha_de_ingreso": to_date(s(r, "FECHA DE INGRESO")),
                "correo_electronico": s(r, "CORREO ELECTRONICO") or None,
                "telefono": s(r, "TELEFONO") or None,
            }, c)
        db.flush()
        print(f"empleados: {len(emp_rows)} leídas, {c['nuevos']} nuevos, {c['actualizados']} actualizados")
        for pk, campos in list(c["campos_cambiados"].items())[:15]:
            print(f"    {pk}: cambió {campos}")
    else:
        print("empleados: sin cambios en este sync")
        emp_business_to_pk = {e.id_numero_empleado: e.id_numero_empleado for e in db.query(Empleado).all()}

    # ── PRODUCTOS ──────────────────────────────────────────────────
    prod_rows = read_csv("PRODUCTOS.csv")
    prod_business_to_pk = {}
    if prod_rows is not None:
        by_row_id = {p.appsheet_row_id: p.codigo_sai_sku for p in db.query(Producto).all() if p.appsheet_row_id}
        c = {"nuevos": 0, "actualizados": 0, "campos_cambiados": {}}
        pks_usadas_este_batch = set()
        for r in prod_rows:
            row_id = s(r, "Row ID")
            business_sku = s(r, "CODIGO SAI SKU")
            ya_como = by_row_id.get(row_id)
            if ya_como:
                pk = ya_como
            elif business_sku and business_sku not in pks_usadas_este_batch:
                pk = business_sku
            else:
                pk = row_id
            pks_usadas_este_batch.add(pk)
            if business_sku and business_sku not in prod_business_to_pk:
                prod_business_to_pk[business_sku] = pk

            cf = cf_by_name.get(s(r, "CLASE / FAMILIA"))
            upsert(db, Producto, pk, {
                "codigo_sai_sku": pk,
                "appsheet_row_id": row_id,
                "tool_id": s(r, "Tool Id") or None,
                "descripcion": s(r, "DESCRIPCION"),
                "udm": s(r, "UDM") or None,
                "almacen": s(r, "ALMACEN") or None,
                "clase_familia_id": cf.id if cf else None,
                "numero_economico": s(r, "NUMERO ECONOMICO") or None,
                "inventario_inicial": to_decimal(s(r, "INVENTARIO INICIAL")) or Decimal(0),
                "costo_unitario": to_decimal(s(r, "COSTO UNITARIO")),
                "foto_producto": s_path(r, "FOTO PRODUCTO"),
                "ubicacion": s(r, "UBICACION") or None,
                "minimo": to_decimal(s(r, "MINIMO")),
                "maximo": to_decimal(s(r, "MAXIMO")),
                "fecha_de_alta": to_date(s(r, "FECHA DE ALTA")),
                "scan_document": s_path(r, "SCAN DOCUMENT"),
            }, c)
        db.flush()
        print(f"productos: {len(prod_rows)} leídas, {c['nuevos']} nuevos, {c['actualizados']} actualizados")
        for pk, campos in list(c["campos_cambiados"].items())[:15]:
            print(f"    {pk}: cambió {campos}")
    else:
        print("productos: sin cambios en este sync")
        prod_business_to_pk = {p.codigo_sai_sku: p.codigo_sai_sku for p in db.query(Producto).all()}

    # ── MOVIMIENTOS_RESGUARDO ─────────────────────────────────────
    mov_rows = read_csv("CONTROL_DE_RESGUARDO.csv")
    if mov_rows is not None:
        c = {"nuevos": 0, "actualizados": 0, "campos_cambiados": {}}
        n_emp_unresolved = n_prod_unresolved = 0
        for r in mov_rows:
            emp_business = s(r, "ID NUMERO EMPLEADO")
            prod_business = s(r, "CODIGO SAI SKU")
            empleado_id = emp_business_to_pk.get(emp_business)
            producto_sku = prod_business_to_pk.get(prod_business)
            if emp_business and not empleado_id:
                n_emp_unresolved += 1
            if prod_business and not producto_sku:
                n_prod_unresolved += 1

            row_id = s(r, "Row ID")
            upsert(db, MovimientoResguardo, row_id, {
                "row_id": row_id,
                "fecha_movimiento": to_date(s(r, "Fecha Movimiento")),
                "numero_de_vale": s(r, "Numero de Vale") or None,
                "foto_vale_de_salida": s_path(r, "FOTO VALE DE SALIDA"),
                "tipo_movimiento": s(r, "TIPO MOVIMIENTO"),
                "id_numero_empleado": emp_business or None,
                "empleado_id": empleado_id,
                "nombre_de_empleado_snapshot": s(r, "NOMBRE DE EMPLEADO") or None,
                "puesto_posicion": s(r, "PUESTO / POSICION") or None,
                "departamento": s(r, "DEPARTAMENTO") or None,
                "jefe_inmediato": s(r, "JEFE INMEDIATO") or None,
                "status": s(r, "STATUS") or None,
                "codigo_sai_sku": prod_business or None,
                "producto_sku": producto_sku,
                "descripcion_snapshot": s(r, "DESCRIPCION") or None,
                "udm": s(r, "UDM") or None,
                "numero_economico": s(r, "NUMERO ECONOMICO") or None,
                "clase_familia": s(r, "CLASE / FAMILIA") or None,
                "costo_unitario": to_decimal(s(r, "Costo Unitario")),
                "cantidad": to_decimal(s(r, "CANTIDAD")) or Decimal(0),
                "foto_producto_snapshot": s_path(r, "FOTO PRODUCTO"),
                "foto_numero_serie": s_path(r, "FOTO # NUMERO SERIE"),
                "firma_recibido_conformidad": s_path(r, "FIRMA DE RECIBIDO Y CONFORMIDAD"),
                "observaciones": s(r, "OBSERVACIONES") or None,
            }, c)
        db.commit()
        print(f"movimientos_resguardo: {len(mov_rows)} leídas, {c['nuevos']} nuevos, {c['actualizados']} actualizados")
        print(f"  referencias a empleado sin resolver: {n_emp_unresolved}")
        print(f"  referencias a producto sin resolver: {n_prod_unresolved}")
        for pk, campos in list(c["campos_cambiados"].items())[:15]:
            print(f"    {pk}: cambió {campos}")
    else:
        print("movimientos_resguardo: sin cambios en este sync")
        db.commit()

    db.close()
    print("\nActualización incremental completa.")


if __name__ == "__main__":
    main()
