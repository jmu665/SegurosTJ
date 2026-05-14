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
  
  console.log({
    poliza,
    contratante,
    inicio,
    fin,
    formaPago,
    serie
  });
}

const text = fs.readFileSync('tmp_gs.txt', 'utf8');
extractFromGS(text);
