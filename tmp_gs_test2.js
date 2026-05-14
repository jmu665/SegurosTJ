import * as fs from 'fs';

function extractFromGS(t) {
  let poliza = t.match(/(?:Inciso\s+\d+\s+)([\d\s\/]+)\s+Vigencia/i)?.[1]?.trim() || 'No detectado';
  
  let contratante = 'No detectado';
  let m = t.match(/P[OÓ]LIZA\s+DE\s+AUTOM[OÓ]VILES\s+([A-ZÀ-Ÿ\s]+?)(?=[A-Z0-9]{10,13}\s|TIJUANA)/i);
  if (m) contratante = m[1].trim();

  const datesRegex = /(\d{2}[\s]+[A-Za-z]+[\s]+\d{4})/g; // 04 MARZO 2026
  const allDates = [...t.matchAll(datesRegex)].map(match => match[1]);
  const inicio = allDates[1] || 'No detectado'; // Normally Desde is the second one in the flow
  const fin = allDates[0] || 'No detectado'; 

  const formaPagoMatch = t.match(/\b(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)\b/i)?.[1];
  const formaPago = formaPagoMatch ? formaPagoMatch : 'No detectado';

  let serie = t.match(/(?:Serie|NIV|Chasis|VIN).*?\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] || t.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1] || '';

  let rfc = t.match(/([A-Z]{4}\d{6}[A-Z0-9]{3})/i)?.[1] || '';
  
  let telefono = t.match(/Tel\.\s*([\d]{10,15})/i)?.[1]?.trim() || '';

  // TIJUANA, BAJA CALIFORNIA, C.P. 22637 Tel. 6641235423 DE LAS COLINAS 18 FRACC   TERRAZAS DEL RUBI 04 MARZO
  let dirMatch = t.match(/(?:[A-Z0-9]{10,13})\s+(.*?)\s+(?:Tel\.\s*\d+)?\s*(.*?)\s+(?:\d{2}\s+[A-Z]+\s+\d{4})/i);
  let direccion = '';
  if (dirMatch) {
      direccion = (dirMatch[2] + ' ' + dirMatch[1]).trim().replace(/\s+/g, ' ');
  }

  // 1GNFK13029R208547 2009 UTILITY 4D LS 4WD 5.3L V8 VERSIÓN: TIPO DE VEHÍCULO
  let vehMatch = t.match(/[A-Z0-9]{17}\s+(\d{4})\s+(.+?)\s+VERSI[OÓ]N/i);
  let version = '';
  let modelo = '';
  if (vehMatch) {
      version = vehMatch[1];
      modelo = vehMatch[2].trim();
  }

  // PESOS INDIVIDUAL CONFORT AMPLIA 478214
  let paquete = t.match(/CONFORT\s+([A-Z]+)/i)?.[1] || 'No contiene';

  // 5,387.31 Agente: Clave: Periodo de gracia: 12129 3,271.50 253.19 750.00 1,022.48 7,412.99 4,141.49 ANGELICA URIAS ESPINOZA
  // Prima Neta is "4,141.49" and Total is "5,387.31"?
  // "Prima Neta Forma de Pago Primer Recibo Subsecuentes Recargo por Pago Fraccionado Gastos de Expedición I.V.A. Cesión de Total a Pagar Comisión"
  // Let's grab all decimal numbers at the bottom
  let numbers = [...t.matchAll(/([\d,]+\.\d{2})/g)].map(match => match[1]);
  let primaNeta = '';
  let primaTotal = '';
  // Let's print the numbers array to see where the primas are
  console.log({numbers});

  console.log({
    rfc,
    telefono,
    direccion,
    version,
    modelo,
    paquete
  });
}

const text = fs.readFileSync('tmp_gs.txt', 'utf8');
extractFromGS(text);
