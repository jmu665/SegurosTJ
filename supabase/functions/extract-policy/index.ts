import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT_TEMPLATE = (pdfText: string) => `
Eres un sistema automatizado experto en la extracción de datos de pólizas de seguros de automóviles en México.
Tu única tarea es analizar el texto extraído del PDF de la póliza y mapear la información exacta en formato JSON.

### REGLAS DE NEGOCIO CRÍTICAS:

1. **formaPago**:
   - Valores permitidos: "Contado", "Anual", "Semestral", "Trimestral", "Mensual".
   - CUIDADO: La frase "Prima Anual" NO significa que la forma de pago sea Anual. Es solo el nombre del costo total.
   - Si el documento dice "SEMESTRAL" cerca de "Forma de Pago", es "Semestral".
   - Si existen "Primer Recibo" y "Subsecuentes" con montos diferentes, es pago fraccionado.

2. **Nombres (Contratante vs Asegurado)**:
   - Para el campo "contratante", busca explícitamente la etiqueta "Contratante".
   - Si la póliza (especialmente Chubb) muestra tanto un "Contratante" como un "Asegurado", DEBES extraer SIEMPRE el nombre del "Contratante". Solo usa el Asegurado si la palabra Contratante no existe.

3. **Montos - Reglas por Aseguradora**:
   - General de Seguros: primaNeta = "Prima Neta de Coberturas" | primaTotal = "Total a Pagar" | primerPago = "Primer Recibo" | pagoSubsecuente = "Subsecuentes".
   - Chubb:
     * "primaNeta" y "primaTotal" deben ser extraídos únicamente de la carátula principal de la póliza (normalmente en la Página 2, donde está el desglose de Prima Neta, Derechos de Póliza, IVA y Prima Total).
     * "primerPago" (el importe a pagar del primer recibo) y "pagoSubsecuente" (el importe de los recibos siguientes) deben ser extraídos únicamente de la sección del plan de pagos o del recibo de cobro (normalmente en las hojas de facturación al final, típicamente en la Página 5). NUNCA uses el total anual de la carátula como primer pago si la póliza está fraccionada.
   - Qualitas, AXA, HDI, etc.: primaNeta = Prima Neta | primaTotal = Total a Pagar o Prima Total | primerPago = Primer Pago, Primer Recibo, o Total a Pagar si es pago único | pagoSubsecuente = Pago Subsecuente o Subsecuentes.

3. **Formato de Fechas y Textos**:
   - Fechas ("inicio" y "fin"): SIEMPRE en formato DD/MM/YYYY.
   - "serie" (VIN/NIV): Deben ser exactamente 17 caracteres alfanuméricos continuos.

### REGLAS DE FORMATO Y SALIDA (JSON ESTRICTO):
- Devuelve ÚNICAMENTE un objeto JSON plano.
- NO incluyas bloques de código markdown (como \\\`\\\`\\\`json).
- NO incluyas saludos, explicaciones, ni texto adicional.
- Si un dato no se encuentra en el texto, el valor debe ser explícitamente null (no "N/A" ni "").
- Los montos monetarios deben ser números enteros o decimales (ej. 12500.50), ELIMINA el símbolo "$" y las comas ",".

### ESTRUCTURA JSON REQUERIDA:
{
  "poliza": "Número de póliza",
  "contratante": "Nombre completo del cliente",
  "rfc": "RFC del cliente (12 o 13 caracteres, no el de la aseguradora)",
  "direccion": "Dirección completa del cliente",
  "telefono": "10 dígitos si existe, de lo contrario null",
  "aseguradora": "Nombre de la compañía aseguradora",
  "inicio": "DD/MM/YYYY",
  "fin": "DD/MM/YYYY",
  "formaPago": "Contado, Anual, Semestral, Trimestral o Mensual",
  "primaNeta": 0.00,
  "primaTotal": 0.00,
  "primerPago": 0.00,
  "pagoSubsecuente": 0.00,
  "serie": "17 caracteres",
  "modelo": "Descripción del vehículo (marca, línea, tipo)",
  "version": "Año del modelo (Ej. 2024)",
  "paquete": "Tipo de cobertura (Amplia, Limitada, RC, etc.)"
}

<TEXTO_POLIZA>
${pdfText}
</TEXTO_POLIZA>
`;

serve(async (req) => {
  // Manejar pre-flight de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pdfText } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY no configurada en Supabase")
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT_TEMPLATE(pdfText) }] }]
      })
    })

    const data = await response.json()
    
    // Extraer el texto JSON de la respuesta de Gemini
    let result = {};
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      let jsonText = data.candidates[0].content.parts[0].text;
      jsonText = jsonText.replace(/```json\n?|```/g, '').trim();
      result = JSON.parse(jsonText);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
