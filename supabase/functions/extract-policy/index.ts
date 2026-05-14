import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT_TEMPLATE = (pdfText: string) => `
Analiza el siguiente texto extraído de una póliza de seguros en México.
Extrae la información clave y devuélvela ÚNICAMENTE en formato JSON plano, sin markdown, sin bloques de código, sin explicaciones.

Campos requeridos:
- poliza (String)
- contratante (Nombre completo del cliente)
- rfc (RFC del cliente)
- direccion (Dirección completa del cliente)
- telefono (10 dígitos si existe)
- aseguradora (Nombre de la compañía)
- inicio (Fecha de inicio vigencia DD/MM/YYYY)
- fin (Fecha de fin vigencia DD/MM/YYYY)
- formaPago (Anual, Semestral, Trimestral o Mensual)
- primaNeta (Número con decimales)
- primaTotal (Número con decimales)
- primerPago (Monto del primer recibo o pago inicial)
- pagoSubsecuente (Monto de los recibos restantes)
- serie (VIN/NIV del vehículo, 17 caracteres)
- modelo (Nombre/Descripción del vehículo)
- version (Año)
- paquete (Tipo de cobertura)

TEXTO DEL PDF:
${pdfText}
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
