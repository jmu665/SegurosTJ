import * as fs from 'fs';

function extractFromChubb(t) {
  let poliza = 'No detectado';
  let mPol1 = t.match(/P[óo]liza\s*\/\s*Policy\s*No\.\s*([A-Z0-9\-\/]{5,})/i);
  if (mPol1 && mPol1[1] !== 'C.P.') poliza = mPol1[1];
  
  if (poliza === 'No detectado') {
     let mPol2 = t.match(/P[óo]liza:\s*([A-Z0-9\-\/]{5,})/i);
     if (mPol2 && mPol2[1].toLowerCase() !== 'vigencia') poliza = mPol2[1];
  }

  if (poliza === 'No detectado') {
     let mPol = t.match(/\b([A-Z0-9]{2}\s+\d{8,})\b/i);
     if (mPol) poliza = mPol[1].replace(/\s+/g, '');
  }

  if (poliza === 'No detectado') {
     let mPol3 = t.match(/(?:Servicio:|Capacidad:)\s*([A-Z0-9\s]+?)\s+\d{2}\/[A-Za-z]{3}\/\d{4}/i);
     if (mPol3) poliza = mPol3[1].trim().replace(/\s+/g, '');
  }

  let contratante = 'No detectado';
  let m = t.match(/Nombre\s*\/\s*Name:\s*([A-ZÀ-Ÿ\s]+?)\s+Tel[eé]fono/i) || 
          t.match(/Asegurado:\s*([A-ZÀ-Ÿ\s]+?)\s+Domicilio/i) ||
          t.match(/Nombre\s*\/\s*Name:\s*([A-ZÀ-Ÿ\s]+?)(?=Tel[eé]fono|Fecha|Y\/O)/i);
  if (m) contratante = m[1].trim();

  let paquete = '';
  let direccion = '';

  if (contratante === 'No detectado') {
     let mTab = t.match(/(AMPLIA|LIMITADA|COBERTURA AMPLIA|PAQUETE)\s+([A-ZÁÉÍÓÚÑ\s]+?)(?=\s+(?:EXT|INT|CALLE|AVE|BLVD|STA|SAN|COLONIA|C\.|R\.|#|\d{2,}))/i);
     if (!mTab) mTab = t.match(/(AMPLIA|LIMITADA)\s+([A-ZÁÉÍÓÚÑ\s]+?)(?=\s+\d{4,5})/i);
     
     if (mTab) {
         paquete = mTab[1].trim();
         contratante = mTab[2].trim();
         
         let dirRegex = new RegExp(contratante.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+') + '\\s+(.*?)(?=\\s*(?:\\d{10}|\\b[A-Z]{4}\\d{6}[A-Z0-9]{3}\\b|TIJUANA|MEXICO|\\b\\d{2}\\/\\b|SEMESTRAL|ANUAL|MENSUAL))', 'i');
         let mDir = t.match(dirRegex);
         if (mDir) direccion = mDir[1].trim();
     }
  }

  const datesRegex = /(\d{2}[\/\-](?:\d{2}|[A-Za-z]{3})[\/\-]\d{4})/g;
  const allDates = [...t.matchAll(datesRegex)].map(match => match[1]);
  const inicio = allDates[0] || 'No detectado';
  const fin = allDates[1] || 'No detectado';

  const formaPagoMatch = t.match(/\b(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)\b/i)?.[1];
  const formaPago = formaPagoMatch ? formaPagoMatch : 'No detectado';

  let rfc = t.match(/\b([A-Z]{4}\d{6}[A-Z0-9]{3})\b/i)?.[1] || '';
  if (rfc === 'ASE901221SM4' || !rfc) { 
     let matchesRFC = [...t.matchAll(/\b([A-Z]{4}\d{6}[A-Z0-9]{3})\b/ig)];
     if (matchesRFC.length > 1) {
         rfc = matchesRFC.find(r => r[1] !== 'ASE901221SM4')?.[1] || rfc;
     }
  }
  
  let serie = t.match(/(?:Serie|NIV|Chasis|VIN).*?\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] || t.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1] || '';
  
  let modelo = t.match(/Modelo\s*\/\s*Model:\s*.*?\s*(\d{4})/i)?.[1] || t.match(/Modelo:\s*(\d{4})/i)?.[1] || '';
  let version = '';
  
  let mMod = t.match(/\b([A-Z\s0-9\.]+?)\s+(\d{4})\s+[A-HJ-NPR-Z0-9]{17}\b/i);
  if (mMod) {
      version = mMod[1].replace(/.*?(?:NACIONAL|FRONTERIZO)?\s*\d{1,2}\s+DE\s+[A-Z]+\s+DE\s+\d{4}\s+/i, '').trim();
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

  let telefono = t.match(/\b(\d{10})\b/)?.[1] || '';

  let agente = t.match(/Clave\s*interna\s*del\s*agente:\s*(\d+)/i)?.[1] || '';
  if (!agente) {
      let agMatch = t.match(/(?:SEMESTRAL|ANUAL|MENSUAL|TRIMESTRAL)\s+(\d+)\s+0\s+\-/i);
      if (agMatch) agente = agMatch[1];
  }

  console.log({ poliza, contratante, inicio, fin, formaPago, rfc, telefono, direccion, agente, serie, paquete, modelo, version, primaNeta, primaTotal });
}

const text = fs.readFileSync('tmp_chubb_full.txt', 'utf8');
extractFromChubb(text);
