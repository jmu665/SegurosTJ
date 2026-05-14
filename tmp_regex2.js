const text = `Asegurado: Asegurado: Paquete: Domicilio:   C.P.: Propietario/Contratante:`;
let m = text.match(/Asegurado:\s*([A-ZÀ-Ÿ\s]+?)\s+Domicilio/i);
console.log(m);

const text2 = `Asegurado: Domicilio:`;
console.log(text2.match(/Asegurado:\s*([A-ZÀ-Ÿ\s]+?)\s+Domicilio/i));
