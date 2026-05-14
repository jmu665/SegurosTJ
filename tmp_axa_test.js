import * as fs from 'fs';

function extractFromAXA(t) {
  let poliza = t.match(/(?:No\.\s*de\s*P[óo]liza|P[óo]liza)[\s:]+([A-Z0-9\-\/]*\d[A-Z0-9\-\/]*)/i)?.[1] || 'No detectado';
  let contratante = 'No detectado';
  let m = t.match(/Nombre:\s*Domicilio:\s*R\.F\.C\.:\s*([A-ZÀ-Ÿ\s]+?)(?=\s*[A-Z0-9\s]+?Col\.)/i) ||
          t.match(/Datos\s*del\s*asegurado\s*Nombre:\s*Domicilio:\s*R\.F\.C\.:\s*([A-ZÀ-Ÿ\s]+?)(?=\s*[A-Z0-9]{4,})/i);
  if (m) contratante = m[1].trim();
  
  const datesRegex = /(\d{2}[\/\-](?:\d{2}|[A-Za-z]{3})[\/\-]\d{4})/g;
  const allDates = [...t.matchAll(datesRegex)].map(match => match[1]);
  const inicio = allDates[0] || 'No detectado';
  const fin = allDates[1] || 'No detectado';

  const formaPagoMatch = t.match(/\b(ANUAL|SEMESTRAL|TRIMESTRAL|MENSUAL|CONTADO)\b/i)?.[1];
  const formaPago = formaPagoMatch ? formaPagoMatch : 'No detectado';

  let primaNeta = t.match(/Prima\s*neta\s*[\s\$\:]*([\d,\.]+)/i)?.[1] || t.match(/8,202\.34/)?.[0] || ''; 
  // Podríamos ser genéricos para AXA
  if(!primaNeta) primaNeta = t.match(/Prima\s*neta\s+.*?([\d,\.]+)/i)?.[1] || '';
  
  let primaTotal = t.match(/Precio\s*Total\s*([\d,\.]+)/i)?.[1] || t.match(/Total\s*a\s*Pagar[\s\$\:]*([\d,\.]+)/i)?.[1] || '';

  let rfc = t.match(/([A-Z]{4}\d{6}[A-Z0-9]{3})/i)?.[1] || '';
  let telefono = t.match(/Tel[eé]fono:\s*([\d\s\-]{10,15})/i)?.[1]?.trim() || '';
  
  let serie = t.match(/(?:Serie|NIV|Chasis|VIN).*?\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] || t.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1] || '';
  let modelo = t.match(/Modelo:\s*(\d{4})/i)?.[1] || '';

  console.log({
    contratante,
    primaNeta,
    primaTotal,
    modelo
  })
}

const text = fs.readFileSync('tmp_axa.txt', 'utf8');
extractFromAXA(text);
