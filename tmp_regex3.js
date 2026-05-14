const fs = require('fs');

function extractFromChubb(t) {
  let contratante = 'No detectado';
  let m = t.match(/Nombre\s*\/\s*Name:\s*([A-ZÀ-Ÿ\s]+?)\s+Tel[eé]fono/i) || 
          t.match(/Asegurado:\s*([A-ZÀ-Ÿ\s]+?)\s+Domicilio/i) ||
          t.match(/Nombre\s*\/\s*Name:\s*([A-ZÀ-Ÿ\s]+?)(?=Tel[eé]fono|Fecha|Y\/O)/i);
  if (m) contratante = m[1].trim();

  console.log("contratante before mTab:", contratante);

  let paquete = '';
  let direccion = '';

  if (contratante === 'No detectado') {
     let mTab = t.match(/(AMPLIA|LIMITADA|COBERTURA AMPLIA|PAQUETE)\s+([A-ZÁÉÍÓÚÑ\s]+?)(?=\s+(?:EXT|INT|CALLE|AVE|BLVD|STA|SAN|COLONIA|C\.|R\.|#|\d{2,}))/i);
     console.log("mTab:", mTab ? mTab[0] : null);
     if (!mTab) mTab = t.match(/(AMPLIA|LIMITADA)\s+([A-ZÁÉÍÓÚÑ\s]+?)(?=\s+\d{4,5})/i);
     
     if (mTab) {
         paquete = mTab[1].trim();
         contratante = mTab[2].trim();
     }
  }
  console.log("contratante after mTab:", contratante);
}

const text = fs.readFileSync('tmp_chubb_full.txt', 'utf8');
extractFromChubb(text);
