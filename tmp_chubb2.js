import * as fs from 'fs';

function extractFromChubb(t) {
  let poliza = 'No detectado';
  // Try to find the exact policy format like A9 45011812
  let mPol = t.match(/\b([A-Z0-9]{2}\s+\d{8,})\b/i);
  if (mPol) poliza = mPol[1].replace(/\s+/g, ''); // Removes spaces to have A945011812
  
  if (poliza === 'No detectado') {
     let mPol3 = t.match(/(?:Servicio:|Capacidad:)\s*([A-Z0-9\s]+?)\s+\d{2}\/[A-Za-z]{3}\/\d{4}/i);
     if (mPol3) poliza = mPol3[1].trim().replace(/\s+/g, '');
  }

  let contratante = 'No detectado';
  let paquete = '';
  let direccion = '';

  let mTab = t.match(/(AMPLIA|LIMITADA|COBERTURA AMPLIA|PAQUETE)\s+([A-ZÁÉÍÓÚÑ\s]+?)\s+(EXT|INT|CALLE|AVE|BLVD|STA|SAN|COLONIA|C\.|R\.|#|\d{2,})/i);
  if (mTab) {
      paquete = mTab[1].trim();
      contratante = mTab[2].trim();
      
      // Try to extract address which comes after name and before phone or RFC or State
      let dirRegex = new RegExp(contratante.replace(/\s+/g, '\\s+') + '\\s+(.*?)(?=\\s*\\d{10}|\\b[A-Z]{4}\\d{6}[A-Z0-9]{3}\\b|TIJUANA|MEXICO|\\b\\d{2}\\/\\b)', 'i');
      let mDir = t.match(dirRegex);
      if (mDir) direccion = mDir[1].trim();
  } else {
     let mTab2 = t.match(/(AMPLIA|LIMITADA)\s+([A-ZÁÉÍÓÚÑ\s]+?)\s+\d{4,5}/i);
     if (mTab2) {
         paquete = mTab2[1].trim();
         contratante = mTab2[2].trim();
     }
  }

  const datesRegex = /(\d{2}[\/\-](?:\d{2}|[A-Za-z]{3})[\/\-]\d{4})/g;
  const allDates = [...t.matchAll(datesRegex)].map(match => match[1]);
  const inicio = allDates[0] || 'No detectado';
  const fin = allDates[1] || 'No detectado';

  const formaPagoMatch = t.match(/\b(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)\b/i)?.[1];
  const formaPago = formaPagoMatch ? formaPagoMatch : 'No detectado';

  let rfc = t.match(/R\.?F\.?C\.?[\s:/]*([A-Z0-9]{10,13})/i)?.[1] || t.match(/\b([A-Z]{4}\d{6}[A-Z0-9]{3})\b/i)?.[1] || '';
  let telefono = t.match(/\b(\d{10})\b/)?.[1] || '';

  let serie = t.match(/(?:Serie|NIV|Chasis|VIN).*?\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] || t.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1] || '';
  
  let modelo = '';
  let version = '';
  
  // NISSAN SENTRA SEDAN 4D S 1.8L I4 2016 3N1AB7AP1GY243886
  let mMod = t.match(/\b([A-Z\s0-9\.]+)\s+(\d{4})\s+[A-HJ-NPR-Z0-9]{17}\b/i);
  if (mMod) {
      version = mMod[1].trim();
      modelo = mMod[2];
  }

  let primaTotal = t.match(/Total\s*a\s*pagar\s*[\$\s]*([\d,\.]+)/i)?.[1];
  let primaNeta = '';
  
  if (!primaTotal) {
     let nums = t.match(/([\d,\.]+)\s+[\d,\.]+\s+[\d,\.]+\s+[\d,\.]+\s+[\d,\.]+\s+([\d,\.]+)\s+CARÁTULA/i);
     if (nums) {
         primaNeta = nums[1];
         primaTotal = nums[2];
     }
  }

  let agente = t.match(/Clave\s*interna\s*del\s*agente:\s*(\d+)/i)?.[1] || '';
  if (!agente) {
      let agMatch = t.match(/(?:SEMESTRAL|ANUAL|MENSUAL)\s+(\d+)\s+0\s+\-/i);
      if (agMatch) agente = agMatch[1];
  }

  console.log({ poliza, contratante, inicio, fin, formaPago, rfc, serie, modelo, version, primaNeta, primaTotal, telefono, direccion, paquete, agente });
}

const text = "Póliza: Vigencia: 12:00 horas al 12:00 horas Del Endoso: Datos del asegurado y/o propietario Suma asegurada Coberturas amparadas Deducible Prima Desglose de coberturas *Descripción de abreviaturas en Condiciones Generales Conducto: Motor: Inspección Vehicular Requerida: Uso: Modelo: Capacidad: Servicio: A9 45011812 1 22/Dic/2025 22/Dic/2026 29528392 212546777 AMPLIA DANIELA CAROLINA AGUILAR PEREZ STA ELENA EXT. 7 INT. A 22170 SANTA ELENA 6641234566 TIJUANA, BAJA CALIFORNIA, MEXICO AUPD84112314A SEMESTRAL 291874 0 - SILVIA CERON OLVERA NACIONAL 22 DE DICIEMBRE DE 2025 NISSAN SENTRA SEDAN 4D S 1.8L I4 2016 3N1AB7AP1GY243886 NISSAN 5 Y243886 02060500101 PARTICULAR EN TRAMITE PRIVADO A9221220252212202545011812 5,321.86 0.00 237.35 799.00 1,017.31 7,375.52 CARÁTULA";
extractFromChubb(text);
