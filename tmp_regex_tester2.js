import * as fs from 'fs';

function extractData(t) {
  t = t.replace(/\s+/g, ' ');
  let aseguradora = 'Qualitas';

  // 4. FECHAS (Qualitas usa: 30/ABR/2026)
  const datesRegex = /(\d{2}[\/\-](?:\d{2}|[A-Za-z]{3})[\/\-]\d{4})/g;
  const allDates = [...t.matchAll(datesRegex)].map(m => m[1]);
  let inicio = allDates[0] || 'No detectado';
  let fin = allDates[1] || 'No detectado';

  // Qualitas primas (tabular format)
  // Prima Neta Tasa Financiamiento Gastos por Expedición. Subtotal 8% I.V.A.  IMPORTE TOTAL  Tarifa Aplicada: 8,931.23 214.35 670.00 9,815.58 785.25  10,600.83
  let primaNeta = t.match(/Prima\s*Neta[\s\$\:]*([\d,\.]+)/i)?.[1] || '';
  let primaTotal = t.match(/([\d,\.]+)\s*Total\s*a\s*Pagar/i)?.[1] || t.match(/Total\s*a\s*Pagar[\s\$\:]*([\d,\.]+)/i)?.[1] || '';
  
  if (aseguradora === 'Qualitas') {
     let m = t.match(/Tarifa\s*Aplicada:\s*([\d,\.]+)\s+[\d,\.]+\s+[\d,\.]+\s+[\d,\.]+\s+[\d,\.]+\s+([\d,\.]+)/i);
     if (m) {
       primaNeta = m[1];
       primaTotal = m[2];
     }
  }

  // RFC
  let rfc = t.match(/R\.?F\.?C\.?[\s:]*([A-Z0-9]{10,13})/i)?.[1] || '';
  if (aseguradora === 'Qualitas' && !rfc) {
      let mRFC = t.match(/([A-Z]{4}\d{6}[A-Z0-9]{3})/i);
      if (mRFC) rfc = mRFC[1];
  }

  // Direccion
  let direccion = 'No detectado';
  if (aseguradora === 'Qualitas') {
     // Domicilio: C.P.: Municipio: Estado: Colonia: DIANA KAREN RINCON ORTEGA NARANJOS No. EXT. 7 No. INT. LT15 21480 TECATE BAJA CALIFORNIA EL PEDREGAL RIOD9502071J1
     let dirMatch = t.match(/Colonia:\s+[A-ZÀ-Ÿ\s]+\s+(.*?)(?=\s+\d{4,5}\s+|$)/i);
     if (dirMatch) direccion = dirMatch[1].trim();
  }

  // Vehiculo extra (Modelo, Version)
  let modelo = t.match(/Modelo:\s*.*?\s*(\d{4})/i)?.[1] || '';
  
  // NISSAN KICKS ADVANCE 5P L4 1.6L ABS BA AC R17 CVT AUT.
  let version = t.match(/\(I\)[A-Z\s]+?([A-Z\s0-9\.]{10,})/i)?.[1] || '';
  if (aseguradora === 'Qualitas') {
     let vM = t.match(/\(I\)([A-Z\s0-9\.]+)\./i);
     if (vM) version = vM[1].trim();
  }

  console.log({ inicio, fin, primaNeta, primaTotal, rfc, direccion, modelo, version });
}

const qualitasText = `Estimado   Asegurado   Quálitas   Compañía de Seguros... PLAN: AMPLIA PÓLIZA DE SEGURO DE AUTOMÓVILES   PÓLIZA   ENDOSO   INCISO 6370082792   000000   0001 INFORMACIÓN DEL ASEGURADO Vigencia   Desde las 12:00 P.M. del:   Hasta las 12:00 P.M. del: DIANA KAREN RINCON ORTEGA 2379   (I)NISSAN KICKS ADVANCE 5P L4 1.6L ABS BA AC R17 CVT AUT. 30/ABR/2026   30/ABR/2027 INFORMACIÓN IMPORTANTE  Quálitas Compañía de Seguros, S.A. de C.V.   con domicilio en Av. San Jerónimo #478, Colonia Jardines del Pedregal, se encuentra a su disposición el Aviso de Privacidad Integral en   www.qualitas.com.mx  OFICINA DE ATENCIÓN DE SERVICIO Oficina: Domicilio:   C.P.: Colonia: Teléfono:   Fax: De Lunes a Viernes de 8:30 a.m. a 6:30 p.m. Canal de Venta   Teléfono: Agente: BAJA CALIFORNIA ANGELICA URIAS ESPINOZA 67897 6643316118 TIJUANA OTAY BLVD. TIJUANA ZONA INDUSTRIAL #17226   22457 OTAY CONSTITUYENTES  En cumplimiento a lo dispuesto en el artículo 202 de la Ley de Instituciones de Seguros y de Fianzas, registrados ante la Comisión Nacional de Seguros y Fianzas a partir del día 7 de octubre de 2025 con el numero CNSF-S0046-0337-2025 / CONDUSEF-002429-20  Consulta de Significado de Abreviaturas en nuestra página Web: www.qualitas.com.mx PLAN: AMPLIA PÓLIZA DE SEGURO DE AUTOMÓVILES   PÓLIZA   ENDOSO   INCISO 6370082792   000000   0001 INFORMACIÓN DEL ASEGURADO R.F.C.: Domicilio: C.P.:   Municipio:   Estado:   Colonia: DIANA KAREN RINCON ORTEGA NARANJOS No. EXT. 7 No. INT. LT15 21480   TECATE   BAJA CALIFORNIA   EL PEDREGAL RIOD9502071J1 DESCRIPCIÓN DEL VEHÍCULO ASEGURADO Tipo:   Modelo: Serie:   Motor:   Placas: Color: 2379   (I)NISSAN KICKS ADVANCE 5P L4 1.6L ABS BA AC R17 CVT AUT. Automoviles Nacionales   2019   Ocupantes:   05 TRAMITE 3N8CP5HD0KL479611   XHR16686795T3N VIGENCIA Desde las 12:00 P.M. del: Hasta las 12:00 P.M. del: Fecha Vencimiento del pago: Plazo de pago: Uso: Servicio: Movimiento: 30/ABR/2026 30/ABR/2027   ALTA  14/MAY/2026 14 dias NORMAL PARTICULAR Textos: Forma de: Pago:   SEMESTRAL   5,662.21 Primer pago Pago(s) Subsecuente(s)   4,938.62  Exclusivo para reporte de Siniestros   800-288-6700 800-800-2880 800-062-0840 800-062-0841 Bilingual attention   English  MONEDA   PESOS Prima Neta Tasa Financiamiento Gastos por Expedición. Subtotal 8% I.V.A.  IMPORTE TOTAL  Tarifa Aplicada: 8,931.23 214.35 670.00 9,815.58 785.25  10,600.83  026033210   TIJUANA OTAY,BAJA CALIFORNIA A 19 DE ABRIL DE 2026 Funcionario Autorizado Condiciones generales aplicables QJ/01 1025-HA Póliza de Seguro registrada en el RECAS con el número CONDUSEF-002429-20 COBERTURAS CONTRATADAS   SUMA ASEGURADA   DEDUCIBLE   $   PRIMAS Daños materiales   $ 202,000.00   5%   3,303.28 Robo total   $ 202,000.00   10%   808.32 Responsabilidad Civil por Daños a Terceros   $ 3,000,000.00 POR EVENTO   0 uma   2,772.00 RC Complementaria Personas   $ 2,000,000.00 POR EVENTO   278.18 Gastos Médicos Ocupantes   $ 250,000.00 POR EVENTO   576.65 Gastos Legales   AMPARADA   464.00 Asistencia Vial Quálitas   AMPARADA   599.00 Muerte del Conductor por Accidente Automovilístico   $ 100,000.00   129.80`;

extractData(qualitasText);
