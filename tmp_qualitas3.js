import * as fs from 'fs';

function extractFromQualitas(t) {
  let contratante = 'DIANA KAREN RINCON ORTEGA';
  let rfc = 'RIOD9502071J1';
  let direccion = '';

  if (contratante !== 'No detectado' && rfc) {
      // Usar la última ocurrencia del contratante
      let lastIndex = t.lastIndexOf(contratante);
      if (lastIndex !== -1) {
          let substring = t.substring(lastIndex + contratante.length);
          let rfcIndex = substring.indexOf(rfc);
          if (rfcIndex !== -1) {
              direccion = substring.substring(0, rfcIndex).trim();
          }
      }
  }
  
  console.log({direccion});
}

const text = `PLAN: AMPLIA PÓLIZA DE SEGURO DE AUTOMÓVILES PÓLIZA ENDOSO INCISO 6370082792 000000 0001 INFORMACIÓN DEL ASEGURADO Vigencia Desde las 12:00 P.M. del: Hasta las 12:00 P.M. del: DIANA KAREN RINCON ORTEGA 2379 (I)NISSAN KICKS ADVANCE 5P L4 1.6L ABS BA AC R17 CVT AUT. 30/ABR/2026 30/ABR/2027 R.F.C.: Domicilio: C.P.: Municipio: Estado: Colonia: DIANA KAREN RINCON ORTEGA NARANJOS No. EXT. 7 No. INT. LT15 21480 TECATE BAJA CALIFORNIA EL PEDREGAL RIOD9502071J1 DESCRIPCIÓN DEL VEHÍCULO ASEGURADO Tipo: Modelo: Serie: Motor: Placas: Color: 2379 (I)NISSAN KICKS ADVANCE 5P L4 1.6L ABS BA AC R17 CVT AUT. Automoviles Nacionales 2019 Ocupantes: 05 TRAMITE 3N8CP5HD0KL479611 XHR16686795T3N`;
extractFromQualitas(text);
