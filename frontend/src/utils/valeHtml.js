import { LOGO_ISP } from '../assets/logoIsp.js'
import { imageURL } from '../api/client.js'
import { formatoFecha } from './formatters.js'

const DISCLAIMER_1 = 'CUANDO LA HERRAMIENTA NO SEA RECIBIDA, SE PROCEDERÁ AL LLENADO DEL FORMATO "REPORTE DE INCIDENCIAS DE HERRAMIENTA".'
const DISCLAIMER_2 = 'EL EQUIPO Y LAS HERRAMIENTAS SE ENTREGAN EN CORRECTO ESTADO DE FUNCIONAMIENTO. EL RECEPTOR SE OBLIGA A SU RESGUARDO, CUIDADO Y USO ADECUADO. EN CASO DE ROBO, EXTRAVÍO, DAÑO O USO INDEBIDO, ACEPTA CUBRIR EL COSTO TOTAL DEL BIEN, SU EQUIVALENTE O LA PARTE PROPORCIONAL CORRESPONDIENTE A SU VIDA ÚTIL, AUTORIZANDO EXPRESAMENTE EL DESCUENTO VÍA NÓMINA.'

function esc(valor) {
  if (valor === null || valor === undefined) return ''
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Una copia del vale (se imprimen 2 idénticas por hoja: una para el
 * trabajador, otra se la queda el almacén — mismo layout que
 * "vale de equipo y herramienta doble nuevo.docx").
 */
function copiaVale(m) {
  const firmaSrc = m.firma_recibido_conformidad ? imageURL(m.firma_recibido_conformidad) : null

  return `
    <div class="copia">
      <table class="encabezado">
        <tr>
          <td class="logo" rowspan="3"><img src="${LOGO_ISP}" alt="" /></td>
          <td class="titulo" rowspan="3">VALE DE EQUIPO<br/>Y HERRAMIENTA</td>
          <td class="etiqueta">Fecha de Entrega:</td>
          <td class="valor">${esc(formatoFecha(m.fecha_movimiento))}</td>
          <td class="folio" rowspan="3">Folio:<br/>No. <b>${esc(m.numero_de_vale)}</b></td>
        </tr>
        <tr>
          <td class="etiqueta">No. de Empleado:</td>
          <td class="valor">${esc(m.id_numero_empleado)}</td>
        </tr>
        <tr>
          <td class="etiqueta">Nombre Completo:</td>
          <td class="valor">${esc(m.nombre_de_empleado)}</td>
        </tr>
        <tr>
          <td colspan="2" class="etiqueta">Puesto:</td>
          <td class="etiqueta">Proyecto o Área de Trabajo:</td>
          <td class="valor" colspan="2">${esc(m.departamento)}</td>
        </tr>
        <tr>
          <td colspan="2" class="valor">${esc(m.puesto_posicion)}</td>
          <td class="etiqueta">Nombre del Supervisor:</td>
          <td class="valor" colspan="2">${esc(m.jefe_inmediato)}</td>
        </tr>
      </table>

      <div class="titulo-seccion">DEVOLUCIÓN DE HERRAMIENTA</div>
      <table class="items">
        <thead>
          <tr>
            <th class="col-cant">Cant</th>
            <th class="col-eco">Nº Económico</th>
            <th class="col-desc">Descripción</th>
            <th class="col-check">BUEN<br/>ESTADO</th>
            <th class="col-check">DAÑADO</th>
            <th class="col-check">* NO<br/>RECIBIDO</th>
            <th class="col-firma">Fecha / Firma</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${esc(m.cantidad)}</td>
            <td>${esc(m.numero_economico)}</td>
            <td class="izq">${esc(m.descripcion)}</td>
            <td></td><td></td><td></td><td></td>
          </tr>
          <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        </tbody>
      </table>

      <table class="firmas">
        <tr>
          <td class="etiqueta">Autorizado</td>
          <td class="firma-caja"></td>
          <td class="etiqueta">Nombre y Firma de Entrega:</td>
          <td class="firma-caja"></td>
          <td class="etiqueta">Recibido</td>
          <td class="firma-caja">${firmaSrc ? `<img class="firma-img" src="${firmaSrc}" alt="" />` : ''}</td>
        </tr>
      </table>

      <table class="renovacion">
        <tr>
          <td class="etiqueta" rowspan="3">RENOVACIÓN</td>
          <td class="etiqueta">Fecha de Renovación:</td><td class="valor"></td>
        </tr>
        <tr><td class="etiqueta">Condiciones:</td><td class="valor"></td></tr>
        <tr><td class="etiqueta">Firma Almacén:</td><td class="valor"></td></tr>
        <tr><td class="etiqueta" colspan="3">Observaciones: ${esc(m.observaciones)}</td></tr>
      </table>

      <p class="nota">* NO RECIBIDO * ${DISCLAIMER_1}</p>
      <p class="legal">${DISCLAIMER_2}</p>

      <table class="pie">
        <tr>
          <td>Formato Vale de Equipo y Herramientas</td>
          <td>SGC-FORM-ALM-ALM-002 R0</td>
          <td>11-Mayo-2026</td>
        </tr>
      </table>
    </div>
  `
}

/** HTML completo listo para imprimir: la hoja "doble" con 2 copias del vale. */
export function generarValeHtml(movimiento) {
  return `
<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Vale ${esc(movimiento.numero_de_vale)}</title>
<style>
  @page { size: letter; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #000; margin: 0; }
  .copia {
    border: 1.5px solid #000;
    padding: 4px;
    margin-bottom: 4mm;
    page-break-inside: avoid;
  }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 2px 4px; vertical-align: middle; }

  .encabezado .logo { width: 22%; text-align: center; border: none; }
  .encabezado .logo img { max-width: 100%; max-height: 45px; }
  .encabezado .titulo { width: 26%; text-align: center; font-weight: bold; font-size: 12px; border: none; }
  .encabezado .folio { width: 14%; text-align: center; font-size: 9px; }
  .encabezado .etiqueta { font-weight: bold; white-space: nowrap; width: 1%; }
  .encabezado .valor { }

  .titulo-seccion { text-align: center; font-weight: bold; font-size: 9px; border: 1px solid #000; border-top: none; padding: 1px; background: #eee; }

  .items th { font-size: 7.5px; text-align: center; background: #f2f2f2; }
  .items td { height: 14px; text-align: center; font-size: 8.5px; }
  .items td.izq { text-align: left; }
  .items .col-cant { width: 6%; }
  .items .col-eco { width: 10%; }
  .items .col-desc { width: 34%; }
  .items .col-check { width: 10%; }
  .items .col-firma { width: 16%; }

  .firmas { margin-top: 2px; }
  .firmas .etiqueta { text-align: center; font-weight: bold; width: 10%; }
  .firmas .firma-caja { width: 23%; height: 32px; text-align: center; }
  .firma-img { max-width: 100%; max-height: 30px; }

  .renovacion { margin-top: 2px; }
  .renovacion .etiqueta { font-weight: bold; white-space: nowrap; width: 10%; }
  .renovacion .valor { }

  .nota { font-size: 7px; font-style: italic; margin: 2px 0 0; }
  .legal { font-size: 6.5px; margin: 1px 0 0; text-align: justify; }

  .pie { margin-top: 2px; }
  .pie td { font-size: 7px; text-align: center; }

  @media print {
    .copia { break-inside: avoid; }
  }
</style>
</head>
<body>
  ${copiaVale(movimiento)}
  ${copiaVale(movimiento)}
</body>
</html>
  `
}
