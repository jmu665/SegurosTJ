import * as fs from 'fs';

function extractFromQualitas(t) {
  let contratante = 'DIANA KAREN RINCON ORTEGA';
  let rfc = 'RIOD9502071J1';
  let direccion = '';

  let dirRegex = new RegExp(contratante.replace(/\s+/g, '\\s+') + '\\s+(.*?)\\s+' + rfc, 'i');
  let dM = t.match(dirRegex);
  if (dM) direccion = dM[1].trim();
  
  console.log({direccion});
}

const text = `PLAN: AMPLIA PÓLIZA DE SEGURO DE AUTOMÓVILES PÓLIZA ENDOSO INCISO 6370082792 000000 0001 INFORMACIÓN DEL ASEGURADO R.F.C.: Domicilio: C.P.: Municipio: Estado: Colonia: DIANA KAREN RINCON ORTEGA NARANJOS No. EXT. 7 No. INT. LT15 21480 TECATE BAJA CALIFORNIA EL PEDREGAL RIOD9502071J1 DESCRIPCIÓN DEL VEHÍCULO ASEGURADO`;
extractFromQualitas(text);
