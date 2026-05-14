import * as fs from 'fs';

function extractFromQualitas(t) {
  let contratante = 'No detectado';
  let m = t.match(/R\.F\.C\.:\s+Domicilio:\s+C\.P\.:\s+Municipio:\s+Estado:\s+Colonia:\s+([A-ZÀ-Ÿ\s]+?)\s+(?=[A-Z])/i);
  // Actually let's just do a greedy match until the RFC
  let blockMatch = t.match(/Colonia:\s+([A-ZÀ-Ÿ\s]+?)\s+([A-Z0-9\s\.]+?)\s+([A-Z]{4}\d{6}[A-Z0-9]{3})/i);
  if (blockMatch) {
     contratante = blockMatch[1].trim();
     let dir = blockMatch[2].trim();
     let rfc = blockMatch[3];
     console.log({contratante, dir, rfc});
  }

  // Paquete
  let paqueteMatch = t.match(/PLAN:\s*([A-Z]+)/i);
  let paquete = paqueteMatch ? paqueteMatch[1] : 'No contiene';
  console.log({paquete});

  // Vehiculo
  let vM = t.match(/\(I\)([A-Z\s0-9\.]+)\./i);
  let description = vM ? vM[1].trim() : '';
  let anio = t.match(/Nacionales\s+(\d{4})/i)?.[1] || t.match(/Modelo:\s*.*?\s*(\d{4})/i)?.[1] || '';
  
  let modelo = description;
  let version = anio;
  console.log({modelo, version});

  // Telefono
  let telefono = 'No contiene';
}

const text = `PLAN: AMPLIA PÓLIZA DE SEGURO DE AUTOMÓVILES PÓLIZA ENDOSO INCISO 6370082792 000000 0001 INFORMACIÓN DEL ASEGURADO R.F.C.: Domicilio: C.P.: Municipio: Estado: Colonia: DIANA KAREN RINCON ORTEGA NARANJOS No. EXT. 7 No. INT. LT15 21480 TECATE BAJA CALIFORNIA EL PEDREGAL RIOD9502071J1 DESCRIPCIÓN DEL VEHÍCULO ASEGURADO Tipo: Modelo: Serie: Motor: Placas: Color: 2379 (I)NISSAN KICKS ADVANCE 5P L4 1.6L ABS BA AC R17 CVT AUT. Automoviles Nacionales 2019 Ocupantes: 05 TRAMITE 3N8CP5HD0KL479611 XHR16686795T3N`;
extractFromQualitas(text);
