import * as fs from 'fs';

function extractFromAXA(t) {
  let poliza = t.match(/(?:No\.\s*de\s*P[óo]liza|P[óo]liza)[\s:]+([A-Z0-9\-\/]*\d[A-Z0-9\-\/]*)/i)?.[1] || 'No detectado';
  let rfc = t.match(/([A-Z]{4}\d{6}[A-Z0-9]{3})/i)?.[1] || '';
  
  let contratante = 'No detectado';
  let m = t.match(/Datos del asegurado Nombre: Domicilio: R\.F\.C\.:\s+([A-ZÀ-Ÿ\s]+?)\s+(?=(?:CALLE|AVENIDA|BLVD|ARTICULO|COL\.|[A-Z\s]+? \d+))/i);
  if (!m) m = t.match(/Nombre:\s*Domicilio:\s*R\.F\.C\.:\s+([A-ZÀ-Ÿ\s]+?)\s+(?=\b(?:CALLE|ARTICULO|BLVD|AV|C\.)\b|(?:\d{4,5}))/i);
  if (m) contratante = m[1].trim();

  // Better approach for AXA name: Look for Name and RFC, capture the name and address
  // "Datos del asegurado Nombre: Domicilio: R.F.C.: JESUS EFRAIN HERNANDEZ CHIQUETE ARTICULO 10 15736 Col. La Esperanza C.P. 22186 Tijuana Baja California XAXX010101000"
  let blockMatch = t.match(/Nombre:\s*Domicilio:\s*R\.F\.C\.:\s*(.+?)\s+([A-Z]{4}\d{6}[A-Z0-9]{3})/i);
  let direccion = '';
  if (blockMatch) {
      let combined = blockMatch[1].trim();
      // Assume the name is ALL CAPS. Address might have lower case or numbers
      let splitMatch = combined.match(/^([A-Z\s]+?)\s+([A-Z0-9].*)$/);
      if (splitMatch) {
          contratante = splitMatch[1].trim();
          direccion = splitMatch[2].trim();
      }
  }

  const datesRegex = /(\d{2}[\/\-](?:\d{2}|[A-Za-z]{3})[\/\-]\d{4})/g;
  const allDates = [...t.matchAll(datesRegex)].map(match => match[1]);
  const inicio = allDates[0] || 'No detectado';
  const fin = allDates[1] || 'No detectado';

  const formaPagoMatch = t.match(/\b(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)\b/i)?.[1];
  const formaPago = formaPagoMatch ? formaPagoMatch : 'No detectado';

  // "Prima neta Tasa de financiamiento Gastos por expedición I.V.A. Precio Total 8,202.34 410.12 630.00 739.40 9,981.86"
  let primaNeta = '';
  let primaTotal = '';
  let primasMatch = t.match(/Precio\s*Total\s*([\d,\.]+)\s+[\d,\.]+\s+[\d,\.]+\s+[\d,\.]+\s+([\d,\.]+)/i);
  if (primasMatch) {
      primaNeta = primasMatch[1];
      primaTotal = primasMatch[2];
  }

  let telefono = t.match(/Tel[eé]fono:\s*([\d\s\-]{10,15})/i)?.[1]?.trim() || '';
  
  let serie = t.match(/(?:Serie|NIV|Chasis|VIN).*?\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] || t.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1] || '';
  
  // Vehículo: Motor: Modelo: Serie: No. ocupantes: Placas: Uso: Servicio: NISSAN SENTRA GENERICA* 0 2019 3N1AB7AP5KY208860
  let version = t.match(/Modelo:\s*(\d{4})/i)?.[1] || t.match(/\b(\d{4})\b\s+[A-Z0-9]{17}/)?.[1] || '';
  
  let modelo = '';
  let modMatch = t.match(/Servicio:\s*([A-Z0-9\s\*]+?)\s+\d+\s+\d{4}\s+[A-Z0-9]{17}/i);
  if (modMatch) modelo = modMatch[1].replace('*', '').trim();

  let paquete = t.match(/PLAN:\s*([A-Z]+)/i)?.[1] || 'No contiene';
  if (paquete === 'No contiene') {
      if (t.toLowerCase().includes('amplia')) paquete = 'AMPLIA';
  }

  console.log({
    contratante,
    direccion,
    primaNeta,
    primaTotal,
    modelo,
    version
  })
}

const text = fs.readFileSync('tmp_axa.txt', 'utf8');
extractFromAXA(text);
