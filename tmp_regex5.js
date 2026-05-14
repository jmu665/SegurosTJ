import * as fs from 'fs';

function extractFromChubb(t) {
  let contratante = 'No detectado';
  let m = t.match(/Nombre\s*\/\s*Name:\s*([A-ZÀ-Ÿ\s]+?)\s+Tel[eé]fono/i) || 
          t.match(/Asegurado:\s*([A-ZÀ-Ÿ\s]+?)\s+Domicilio/i) ||
          t.match(/Nombre\s*\/\s*Name:\s*([A-ZÀ-Ÿ\s]+?)(?=Tel[eé]fono|Fecha|Y\/O)/i);
  console.log("m:", m);
}

const text = fs.readFileSync('tmp_chubb_full.txt', 'utf8');
extractFromChubb(text);
