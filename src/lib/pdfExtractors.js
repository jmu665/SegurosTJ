// src/lib/pdfExtractors.js

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Función principal que enruta el texto al extractor adecuado basado en la aseguradora
 */
export function extractPolicyData(text) {
  const t = text.replace(/\s+/g, ' '); // normalizar espacios
  
  // 1. Identificar Aseguradora (Genérico)
  const aseguradoras = ['HDI Seguros', 'HDI', 'Qualitas', 'Quálitas', 'GNP', 'AXA', 'Mapfre', 'Zurich', 'Chubb', 'Banorte', 'Atlas', 'Inbursa', 'General de Seguros'];
  let aseguradora = '';
  for (const name of aseguradoras) {
    if (t.toLowerCase().includes(name.toLowerCase())) { aseguradora = name; break; }
  }
  if (aseguradora === 'Quálitas') aseguradora = 'Qualitas';

  // 2. Enrutar a la estrategia específica
  switch(aseguradora) {
    case 'Qualitas':
      return { aseguradora, ...extractFromQualitas(t) };
    case 'AXA':
      return { aseguradora, ...extractFromAXA(t) };
    case 'Chubb':
      return { aseguradora, ...extractFromChubb(t) };
    case 'General de Seguros':
      return { aseguradora, ...extractFromGS(t) };
    case 'HDI Seguros':
    case 'HDI':
      return { aseguradora, ...extractFromHDI(t) };
    default:
      return { aseguradora: aseguradora || 'No detectado', ...extractGenericFallback(t) };
  }
}

// ============================================
// EXTRACTORES ESPECÍFICOS POR ASEGURADORA
// ============================================

function extractFromQualitas(t) {
  let poliza = t.match(/P[OÓ]LIZA\s+ENDOSO\s+INCISO\s+([A-Z0-9\-\/]+)/i)?.[1] || 'No detectado';
  
  let contratante = 'No detectado';
  let m = t.match(/Hasta\s+las\s+12:00\s+P\.M\.\s+del:\s+([A-ZÀ-Ÿ\s]+?)(?=\d{3,}|\(I\)|[A-Z0-9]{10})/i);
  if (!m) m = t.match(/R\.F\.C\.:.*?Colonia:\s+([A-ZÀ-Ÿ\s]+?)\s+[A-Z0-9]{3,}\s+No\./i);
  if (!m) m = t.match(/Colonia:\s*([A-ZÁÉÍÓÚÑ\s]+?)(?:\s+NARANJOS|\s+[A-Z0-9]{10,13})/i);
  if (!m) m = t.match(/Colonia:\s*([A-ZÁÉÍÓÚÑ\s]+?)\s+[A-Z\s]+No\.\s*EXT/i);
  if (m) contratante = m[1].trim();

  const datesRegex = /(\d{2}[\/\-](?:\d{2}|[A-Za-z]{3})[\/\-]\d{4})/g;
  const allDates = [...t.matchAll(datesRegex)].map(match => match[1]);
  const inicio = allDates[0] || 'No detectado';
  const fin = allDates[1] || 'No detectado';

  const formaPagoMatch = t.match(/Forma\s+de:\s*Pago:\s*(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)/i)?.[1] || t.match(/\b(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)\b/i)?.[1];
  const formaPago = formaPagoMatch ? capitalize(formaPagoMatch) : 'No detectado';

  let primaNeta = '';
  let primaTotal = '';
  let tarifaMatch = t.match(/Tarifa\s*Aplicada:\s*([\d,\.]+)\s+[\d,\.]+\s+[\d,\.]+\s+[\d,\.]+\s+[\d,\.]+\s+([\d,\.]+)/i);
  if (tarifaMatch) {
    primaNeta = tarifaMatch[1];
    primaTotal = tarifaMatch[2];
  } else {
    primaNeta = t.match(/Prima\s*Neta[\s\$\:]*([\d,\.]+)/i)?.[1] || '';
    primaTotal = t.match(/([\d,\.]+)\s*Total\s*a\s*Pagar/i)?.[1] || t.match(/Total\s*a\s*Pagar[\s\$\:]*([\d,\.]+)/i)?.[1] || '';
  }

  let primerPago = t.match(/Primer\s*pago[\s\$\:]*([\d,\.]+)/i)?.[1] || '';
  let pagoSubsecuente = t.match(/Subsecuente(?:s)?[\s\$\:]*([\d,\.]+)/i)?.[1] || '';

  let rfc = t.match(/R\.?F\.?C\.?[\s:]*([A-Z0-9]{10,13})/i)?.[1];
  if (!rfc) {
    let fallbackRFC = t.match(/([A-Z]{4}\d{6}[A-Z0-9]{3})/i);
    if (fallbackRFC) rfc = fallbackRFC[1];
  }

  let direccion = '';
  if (contratante !== 'No detectado' && rfc) {
      let dirRegex = new RegExp(contratante.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+') + '\\s+(.{5,250}?)\\s+' + rfc, 'i');
      let dM = t.match(dirRegex);
      if (dM) {
          direccion = dM[1].trim();
      }
  }
  if (!direccion) {
      let dirMatch = t.match(/Colonia:\s+[A-ZÀ-Ÿ\s]+\s+(.*?)(?=\s+\d{4,5}\s+|$)/i);
      if (dirMatch) direccion = dirMatch[1].trim();
  }

  let serie = t.match(/(?:Serie|NIV|Chasis|VIN).*?\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] || t.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1] || '';
  
  // El usuario pidió que la descripción vaya en 'modelo' y el año en 'version'
  let version = t.match(/Nacionales\s+(\d{4})/i)?.[1] || t.match(/Modelo:\s*.*?\s*(\d{4})/i)?.[1] || '';
  
  let modelo = '';
  let vM = t.match(/\(I\)([A-Z\s0-9\.]+)\./i);
  if (vM) modelo = vM[1].trim();

  let paqueteMatch = t.match(/PLAN:\s*([A-Z]+)/i);
  let paquete = paqueteMatch ? paqueteMatch[1] : 'No contiene';
  
  let telefono = t.match(/Tel(?:[eé]fono)?\s*[\:\.]?\s*([\d\s\-]{10,15})/i)?.[1]?.trim() || '';

  return {
    poliza, contratante, inicio, fin, formaPago,
    primaNeta, primaTotal, primerPago, pagoSubsecuente, rfc: rfc || '',
    telefono, direccion, agente: '', 
    serie, puertas: '', paquete, modelo, version
  };
}

function extractFromAXA(t) {
  let poliza = t.match(/(?:No\.\s*de\s*P[óo]liza|P[óo]liza)[\s:]+([A-Z0-9\-\/]*\d[A-Z0-9\-\/]*)/i)?.[1] || 'No detectado';
  let rfc = t.match(/([A-Z]{4}\d{6}[A-Z0-9]{3})/i)?.[1] || '';
  
  let contratante = t.match(/celebrado\s+entre\s+AXA\s+Seguros.*?y\s+([A-ZÀ-Ÿ\s]+?)\s*\./i)?.[1]?.trim() || 'No detectado';
  
  if (contratante === 'No detectado') {
      let m = t.match(/Datos del asegurado Nombre: Domicilio: R\.F\.C\.:\s+([A-ZÀ-Ÿ\s]+?)\s+(?=(?:CALLE|AVENIDA|BLVD|ARTICULO|COL\.|[A-Z\s]+? \d+))/i);
      if (m) contratante = m[1].trim();
  }

  let direccion = '';
  let dirM = t.match(/Calle:\s*(.*?)\s*Colonia:\s*(.*?)\s*CP:\s*(.*?)\s*Municipio:\s*(.*?)\s*Estado:\s*(.*?)\s*Pais:/i);
  if (dirM) {
      direccion = `${dirM[1]} Col. ${dirM[2]} C.P. ${dirM[3]} ${dirM[4]}, ${dirM[5]}`.replace(/\s+/g, ' ').trim();
  } else if (contratante !== 'No detectado' && rfc) {
      let dirRegex = new RegExp(contratante.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+') + '\\s+(.{5,250}?)\\s+' + rfc, 'i');
      let dM2 = t.match(dirRegex);
      if (dM2) direccion = dM2[1].trim();
  }
  
  const datesRegex = /(\d{2}[\/\-](?:\d{2}|[A-Za-z]{3})[\/\-]\d{4})/g;
  const allDates = [...t.matchAll(datesRegex)].map(match => match[1]);
  const inicio = allDates[0] || 'No detectado';
  const fin = allDates[1] || 'No detectado';

  const formaPagoMatch = t.match(/\b(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)\b/i)?.[1];
  const formaPago = formaPagoMatch ? capitalize(formaPagoMatch) : 'No detectado';

  let primaNeta = '';
  let primaTotal = '';
  let primasMatch = t.match(/Precio\s*Total\s*([\d,\.]+)\s+[\d,\.]+\s+[\d,\.]+\s+[\d,\.]+\s+([\d,\.]+)/i);
  if (primasMatch) {
      primaNeta = primasMatch[1];
      primaTotal = primasMatch[2];
  } else {
      primaNeta = t.match(/Prima\s*neta\s*[\s\$\:]*([\d,\.]+)/i)?.[1] || ''; 
      primaTotal = t.match(/Precio\s*Total\s*([\d,\.]+)/i)?.[1] || t.match(/Total\s*a\s*Pagar[\s\$\:]*([\d,\.]+)/i)?.[1] || '';
  }

  let telefono = t.match(/Tel[eé]fono:\s*([\d\s\-]{10,15})/i)?.[1]?.trim() || '';
  
  let serie = t.match(/(?:Serie|NIV|Chasis|VIN).*?\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] || t.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1] || '';
  
  // El usuario pidió que la descripción vaya en 'modelo' y el año en 'version'
  let version = t.match(/Modelo:\s*(\d{4})/i)?.[1] || t.match(/\b(\d{4})\b\s+[A-Z0-9]{17}/)?.[1] || '';
  
  let modelo = '';
  // Allowed hyphens in vehicle description and alphanumeric motor before year and VIN
  let modMatch = t.match(/Servicio:\s*([A-Za-z0-9\s\*\-]+?)(?:\s+[A-Z0-9]+)?\s+\d{4}\s+[A-Z0-9]{17}/i);
  if (modMatch) modelo = modMatch[1].replace('*', '').trim();

  let paquete = t.match(/PLAN:\s*([A-Z]+)/i)?.[1] || 'No contiene';
  if (paquete === 'No contiene') {
      if (t.toLowerCase().includes('amplia')) paquete = 'AMPLIA';
  }

  return {
    poliza, contratante, inicio, fin, formaPago,
    primaNeta, primaTotal, recargo: '', gastosExpedicion: '', rfc, telefono,
    direccion, agente: '', serie, puertas: '', paquete, modelo, version
  };
}

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

  // Strategy 1: Look for clean name in coverage breakdown (e.g. "No ABEL ALTAMIRANO REBOLLAR")
  let mNo = t.match(/No\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+?)\s+(?:DAÑOS\s+MATERIALES|ROBO\s+TOTAL|RESPONSABILIDAD)/i);
  if (mNo && mNo[1].trim().length > 3) contratante = mNo[1].trim();

  // Strategy 2: Nombre / Name (USA/Canada certificate)
  if (contratante === 'No detectado') {
    let m = t.match(/Nombre\s*\/\s*Name:\s*([A-ZÀ-Ÿ\s]+?)\s+Tel[eé]fono/i) || 
            t.match(/Nombre\s*\/\s*Name:\s*([A-ZÀ-Ÿ\s]+?)(?=Tel[eé]fono|Fecha|Y\/O)/i);
    if (m && m[1].trim().length > 2) contratante = m[1].trim();
  }

  // Strategy 3: Asegurado: NAME before address-like patterns
  if (contratante === 'No detectado') {
    let m = t.match(/Asegurado:\s+Asegurado:\s+.*?(?:INTEGRAL|AMPLIA|LIMITADA)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+?)(?=\s+(?:JOSE\s|MARIA\s|CALLE\s|AVE\s|BLVD\s|AV\s|EXT\s|INT\s|COL\s|COLONIA\s|#|\d{1,5}\s))/i);
    if (m && m[1].trim().length > 3) contratante = m[1].trim();
  }

  let paquete = '';
  let direccion = '';

  // Strategy 4: Fallback via INTEGRAL/AMPLIA label
  if (contratante === 'No detectado') {
     let mTab = t.match(/(AMPLIA|LIMITADA|INTEGRAL|COBERTURA AMPLIA|PAQUETE)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+?)(?=\s+(?:JOSE|MARIA|CALLE|AVE|BLVD|AV|EXT|INT|COL|COLONIA|STA|SAN|#|\d{2,}))/i);
     if (!mTab) mTab = t.match(/(AMPLIA|LIMITADA|INTEGRAL)\s+([A-ZÁÉÍÓÚÑ\s]+?)(?=\s+\d{4,5})/i);
     
     if (mTab) {
         paquete = mTab[1].trim();
         contratante = mTab[2].trim();
     }
  }

  // Address extraction: find address between name and phone/RFC in main data block
  if (contratante !== 'No detectado') {
     // Pattern: INTEGRAL NAME ADDRESS CP ZONE PHONE
     let nameEsc = contratante.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
     let dirMatch = t.match(new RegExp('(?:INTEGRAL|AMPLIA|LIMITADA)\\s+' + nameEsc + '\\s+(.+?)\\s+\\d{10}\\b', 'i'));
     if (dirMatch) {
        direccion = dirMatch[1].trim();
     }
  }

  const datesRegex = /(\d{2}[\/\-](?:\d{2}|[A-Za-z]{3})[\/\-]\d{4})/g;
  const allDates = [...t.matchAll(datesRegex)].map(match => match[1]);
  const inicio = allDates[0] || 'No detectado';
  const fin = allDates[1] || 'No detectado';

  const formaPagoMatch = t.match(/Forma\s+de\s+pago[s]?[\s:]+(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)/i)?.[1] || t.match(/\b(SEMESTRAL|TRIMESTRAL|MENSUAL)\b/i)?.[1] || t.match(/\b(ANUAL|CONTADO)\b/i)?.[1];
  const formaPago = formaPagoMatch ? capitalize(formaPagoMatch) : 'No detectado';

  // Buscar el RFC del cliente en la línea principal primero
  let rfc = t.match(/\b([A-Z]{4}\d{6}[A-Z0-9]{3})\b/i)?.[1] || '';
  if (rfc === 'ASE901221SM4' || !rfc) { 
     // ASE9 es el RFC de Chubb, si encontró ese, seguimos buscando el segundo
     let matchesRFC = [...t.matchAll(/\b([A-Z]{4}\d{6}[A-Z0-9]{3})\b/ig)];
     if (matchesRFC.length > 1) {
         rfc = matchesRFC.find(r => r[1] !== 'ASE901221SM4')?.[1] || rfc;
     }
  }
  
  let serie = t.match(/(?:Serie|NIV|Chasis|VIN).*?\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] || t.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1] || '';
  
  let modelo = t.match(/Modelo\s*\/\s*Model:\s*.*?\s*(\d{4})/i)?.[1] || t.match(/Modelo:\s*(\d{4})/i)?.[1] || '';
  let version = '';
  
  // NISSAN SENTRA SEDAN 4D S 1.8L I4 2016 3N1AB7AP1GY243886
  // Including slashes and dashes for things like "D/T" or "F-150"
  let mMod = t.match(/\b([A-Z\s0-9\.\/\-]+?)\s+(\d{4})\s+[A-HJ-NPR-Z0-9]{17}\b/i);
  if (mMod) {
      // El usuario pidió que la descripción vaya en 'modelo' y el año en 'version'
      modelo = mMod[1].replace(/.*?(?:NACIONAL|FRONTERIZO)?\s*\d{1,2}\s+DE\s+[A-Z]+\s+DE\s+\d{4}\s+/i, '').trim();
      version = mMod[2];
  }

  // Extraer las cantidades globales de la póliza
  let primaNeta = '';
  let primaTotal = '';
  let primerPago = '';
  let pagoSubsecuente = '';

  // 1. Prima Neta: tomar el primer match global que aparezca (suele ser el más grande)
  let primaNetasMatches = [...t.matchAll(/Prima\s*neta\s*[\$\s]*([\d,\.]+)/ig)];
  if (primaNetasMatches.length > 0) {
    primaNeta = primaNetasMatches[0][1]; 
  }

  // 2. Prima Total: el costo total global anualizado
  let primaTotalMatch = t.match(/Prima\s*total\s*[\$\s]*([\d,\.]+)/i);
  if (primaTotalMatch) {
    primaTotal = primaTotalMatch[1];
  }

  // 3. Primer Pago: buscar específicamente "Total a Pagar" (Aviso de Cobro)
  let totalPagarMatch = t.match(/Total\s*a\s*pagar\s*:\s*[\$\s]*([\d,\.]+)/i) || t.match(/Total\s*a\s*pagar\s*[\$\s]*([\d,\.]+)/i);
  if (totalPagarMatch) {
    primerPago = totalPagarMatch[1];
  }

  // Si no se encuentra "Prima Total", usamos un fallback asumiendo que es pago único
  if (!primaTotal && primerPago) {
    primaTotal = primerPago;
  }

  // El teléfono del cliente viene suelto en formato de 10 dígitos después de la dirección
  let telefono = t.match(/\b(\d{10})\b/)?.[1] || '';

  let agente = t.match(/Clave\s*interna\s*del\s*agente:\s*(\d+)/i)?.[1] || '';
  if (!agente) {
      let agMatch = t.match(/(?:SEMESTRAL|ANUAL|MENSUAL|TRIMESTRAL)\s+(\d+)\s+0\s+\-/i);
      if (agMatch) agente = agMatch[1];
  }

  return {
    poliza, contratante, inicio, fin, formaPago,
    primaNeta, primaTotal, primerPago, pagoSubsecuente, rfc, telefono,
    direccion, agente, serie, puertas: '', paquete, modelo, version
  };
}

function extractFromGS(t) {
  let poliza = t.match(/(?:Inciso\s+\d+\s+)([\d\s\/]+)\s+Vigencia/i)?.[1]?.trim() || 'No detectado';
  
  let contratante = 'No detectado';
  let m = t.match(/P[OÓ]LIZA\s+DE\s+AUTOM[OÓ]VILES\s+([A-ZÀ-Ÿ\s]+?)(?=[A-Z0-9]{10,13}\s|TIJUANA)/i);
  if (m) contratante = m[1].trim();

  const datesRegex = /(\d{2}[\s]+[A-Za-z]+[\s]+\d{4})/g;
  const allDates = [...t.matchAll(datesRegex)].map(match => match[1]);
  const inicio = allDates[1] || 'No detectado';
  const fin = allDates[0] || 'No detectado'; 

  const formaPagoMatch = t.match(/\b(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)\b/i)?.[1];
  const formaPago = formaPagoMatch ? capitalize(formaPagoMatch) : 'No detectado';

  let rfc = t.match(/([A-Z]{4}\d{6}[A-Z0-9]{3})/i)?.[1] || '';
  let telefono = t.match(/Tel\.\s*([\d]{10,15})/i)?.[1]?.trim() || 'No contiene';

  let direccion = '';
  if (rfc) {
      let dirRegex = new RegExp(rfc + '\\s+(.*?)(?=\\d{2}\\s+[A-Z]+\\s+\\d{4})', 'i');
      let dirM = t.match(dirRegex);
      if (dirM) {
          direccion = dirM[1].replace(/Tel\.?\s*[\d\s\-]+/i, '').trim();
      }
  }

  let serie = t.match(/(?:Serie|NIV|Chasis|VIN).*?\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] || t.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1] || '';
  
  let vehMatch = t.match(/[A-Z0-9]{17}\s+(\d{4})\s+(.+?)\s+VERSI[OÓ]N/i);
  let version = '';
  let modelo = '';
  if (vehMatch) {
      version = vehMatch[1];
      modelo = vehMatch[2].trim();
  }

  let paquete = t.match(/CONFORT\s+([A-Z]+)/i)?.[1] || 'No contiene';

  let primaNeta = t.match(/GS\s+([\d,\.]+)\s+Agente/i)?.[1] || '';
  let primaTotal = '';
  let primerPago = '';
  let pagoSubsecuente = '';

  // GS: los números salen en orden: subsecuentes, recargo, gastos, iva, totalAPagar, primerRecibo NOMBRE SEMESTRAL
  let gsNums = t.match(/([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)\s+[A-ZÀ-Ÿ\s]+?(?:SEMESTRAL|ANUAL|MENSUAL|TRIMESTRAL)/i);
  if (gsNums) {
    pagoSubsecuente = gsNums[1]; // 4,194.20
    primaTotal      = gsNums[5]; // 9,258.38 (Total a Pagar)
    primerPago       = gsNums[6]; // 5,064.19 (Primer Recibo)
  } else {
    primaTotal = t.match(/([\d,\.]+)\s+[\d,\.]+\s+[A-ZÀ-Ÿ\s]+?(?:SEMESTRAL|ANUAL|MENSUAL|TRIMESTRAL)/i)?.[1] || '';
  }

  return {
    poliza, contratante, inicio, fin, formaPago,
    primaNeta, primaTotal, primerPago, pagoSubsecuente, recargo: '', gastosExpedicion: '', rfc, telefono,
    direccion, agente: '', serie, puertas: '', paquete, modelo, version
  };
}

function extractFromHDI(t) {
  let poliza = t.match(/(?:No\.\s*de\s*P[óo]liza|P[óo]liza)[\s:]+([A-Z0-9\-\/]*\d[A-Z0-9\-\/]*)/i)?.[1] || 'No detectado';
  
  // HDI a menudo no usa etiqueta "Asegurado", pone el nombre entre PÓLIZA y RFC
  let contratante = t.match(/Documento[\s:]*P[OÓ]LIZA[\s]+([A-ZÀ-Ÿ\s]+?)[\s]+RFC[:\s]/i)?.[1]?.trim();
  if (!contratante) contratante = t.match(/(?:Asegurado|Contratante)[\s:]+([A-ZÀ-Ÿ\s]+?)(?:RFC|Domicilio|Tel)/i)?.[1]?.trim() || 'No detectado';

  // HDI usa: Desde las 12:00 hrs. del 11/08/2025
  const datesRegex = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/g;
  const allDates = [...t.matchAll(datesRegex)].map(m => m[1]);
  const inicio = allDates[0] || 'No detectado';
  const fin = allDates[1] || 'No detectado';

  const formaPagoMatch = t.match(/\b(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)\b/i)?.[1];
  const formaPago = formaPagoMatch ? capitalize(formaPagoMatch) : 'No detectado';

  let primaNeta = t.match(/Prima\s*Neta[\s\$\:]*([\d,\.]+)/i)?.[1] || '';
  
  // En HDI, el número de Prima Total a veces sale ANTES de "Total a Pagar" por la lectura de columnas
  let primaTotal = t.match(/([\d,\.]+)\s*Total\s*a\s*Pagar/i)?.[1];
  if (!primaTotal) primaTotal = t.match(/Total\s*a\s*Pagar[\s\$\:]*([\d,\.]+)/i)?.[1] || '';

  let rfc = t.match(/RFC[\s:]*([A-Z0-9]{10,13})/i)?.[1] || '';
  let telefono = t.match(/(?:Tel[eé]fono|Celular|Tel)[\s:]*([\d\s\-]{10,15})/i)?.[1]?.trim() || '';

  let direccionMatch = t.match(/límite\s*de(.*?)Vigencia/i)?.[1] || t.match(/(?:Domicilio|Direcci[oó]n|Calle)[\s:]+([A-Za-z0-9À-ÿ\s\,\.\#]+?)(?:C\.P|Tel[eé]fono|RFC|\n)/i)?.[1];
  if (!telefono && direccionMatch) {
     const possiblePhone = direccionMatch.match(/((?:\d[\s\-]*){10,12})/);
     if (possiblePhone) {
        telefono = possiblePhone[1].trim();
        direccionMatch = direccionMatch.replace(possiblePhone[1], '');
     }
  }
  const direccion = direccionMatch ? direccionMatch.replace(/\s+/g, ' ').trim() : '';

  let agente = '';
  const idxAgente = t.toLowerCase().indexOf('agente');
  if (idxAgente !== -1) {
    let chunk = t.substring(idxAgente + 6, idxAgente + 66).replace(/^[\s:]+/, '');
    agente = chunk.split(/(?:Descrip|Paquet|Tarifa|Tipo Suma|Condicion|HDI|P[óo]liza|\n)/i)[0].trim();
  }

  let serie = t.match(/(?:Serie|NIV|Chasis|VIN).*?\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] || t.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1] || '';
  const puertas = t.match(/Puertas[\s:]*(\d+)/i)?.[1] || '';
  
  let descVehiculo = t.match(/(?:APLICA|Remolque|Carga[:\sNO]+)[\s\,]*((?:FRONTERIZO,?)?\s*[A-Za-z0-9\-\s\,]+?)(?=\s+CLAVE|\s+Versi[oó]n|Prima|Descrip)/i)?.[1]?.trim();
  if (!descVehiculo) descVehiculo = t.match(/([A-Za-z0-9\-\s\,]+?)(?=\s+CLAVE|\s+Versi[oó]n)/i)?.[1]?.trim() || '';
  const modelo = descVehiculo.replace(/^(?:Carga[:\sNO]+|APLICA|Remolque|Uso[:\sA-Za-z]+)[\s\,]*/i, '').replace(/^(?:FRONTERIZO,?\s*)/i, '').trim();
  
  const paqueteMatch = t.match(/Paquete[\s:]+([A-Za-z0-9À-ÿ\s]+?)(?=\d{1,3},\d{3}|Daños)/i);
  const paquete = paqueteMatch ? paqueteMatch[1].trim() : '';
  const versionMatch = t.match(/Versión[\s:]+(CG[A-Z0-9]+|[^D]+?)(?=Documento|Prima|Transmisi[oó]n)/i);
  const version = versionMatch ? versionMatch[1].trim() : '';

  return {
    poliza, contratante, inicio, fin, formaPago,
    primaNeta, primaTotal, recargo: '', gastosExpedicion: '', rfc, telefono,
    direccion, agente, serie, puertas, paquete, modelo, version
  };
}

function extractGenericFallback(t) {
  let poliza = t.match(/(?:No\.\s*de\s*P[óo]liza|P[óo]liza)[\s:]+([A-Z0-9\-\/]*\d[A-Z0-9\-\/]*)/i)?.[1] || 'No detectado';
  
  let contratante = t.match(/Documento[\s:]*P[OÓ]LIZA[\s]+([A-ZÀ-Ÿ\s]+?)[\s]+RFC[:\s]/i)?.[1]?.trim();
  if (!contratante) contratante = t.match(/(?:Asegurado|Contratante)[\s:]+([A-ZÀ-Ÿ\s]+?)(?:RFC|Domicilio|Tel)/i)?.[1]?.trim() || 'No detectado';

  const datesRegex = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/g;
  const allDates = [...t.matchAll(datesRegex)].map(m => m[1]);
  const inicio = allDates[0] || 'No detectado';
  const fin = allDates[1] || 'No detectado';

  const formaPagoMatch = t.match(/\b(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)\b/i)?.[1];
  const formaPago = formaPagoMatch ? capitalize(formaPagoMatch) : 'No detectado';

  let primaNeta = t.match(/Prima\s*Neta[\s\$\:]*([\d,\.]+)/i)?.[1] || '';
  let primaTotal = t.match(/Total\s*a\s*Pagar[\s\$\:]*([\d,\.]+)/i)?.[1] || '';

  let rfc = t.match(/RFC[\s:]*([A-Z0-9]{10,13})/i)?.[1] || '';
  let telefono = t.match(/(?:Tel[eé]fono|Celular|Tel)[\s:]*([\d\s\-]{10,15})/i)?.[1]?.trim() || '';

  let serie = t.match(/(?:Serie|NIV|Chasis).*?\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] || t.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1] || '';

  return {
    poliza, contratante, inicio, fin, formaPago,
    primaNeta, primaTotal, recargo: '', gastosExpedicion: '', rfc, telefono,
    direccion: '', agente: '', serie, puertas: '', paquete: '', modelo: '', version: ''
  };
}
