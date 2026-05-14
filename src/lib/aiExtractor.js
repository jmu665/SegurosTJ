// src/lib/aiExtractor.js
import { supabase } from './supabase';

/**
 * AHORA SEGURO: Esta función ya no llama a Google directamente.
 * Llama a una Edge Function de Supabase que tiene la llave protegida.
 */
export async function extractDataWithAI(pdfText) {
  console.log("🛡️ Iniciando extracción SEGURA mediante Supabase Edge Functions...");

  try {
    const { data, error } = await supabase.functions.invoke('extract-policy', {
      body: { pdfText }
    });

    if (error) {
      console.error("Error en la Edge Function:", error);
      throw new Error("La oficina secreta de Supabase reportó un error.");
    }

    if (data) {
      console.log("✅ Datos extraídos exitosamente y de forma segura.");
      return data;
    }

    throw new Error("No se recibieron datos de la IA.");
  } catch (error) {
    console.error("Error en el extractor seguro:", error);
    throw error;
  }
}
