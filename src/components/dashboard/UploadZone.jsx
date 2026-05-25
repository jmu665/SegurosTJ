import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import { extractPolicyData } from '../../lib/pdfExtractors';

// La mejor manera de importar el worker en Vite 5/6+
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export default function UploadZone({ onDataExtracted, isProcessing, setIsProcessing, statusText, setStatusText }) {
  const [isDragging, setIsDragging] = useState(false);

  const processPDF = async (file) => {
    setIsProcessing(true);
    setStatusText('Iniciando motor de lectura (OCR)...');

    try {
      // Usar URL en vez de ArrayBuffer soluciona bugs de ReadableStream en Webkit/Safari
      const fileUrl = URL.createObjectURL(file);

      const getDocumentWithTimeout = Promise.race([
        pdfjsLib.getDocument(fileUrl).promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de PDF.js (El motor tardó más de 15 segundos en responder)')), 15000))
      ]);

      const pdf = await getDocumentWithTimeout;

      // Limpiar memoria
      URL.revokeObjectURL(fileUrl);

      let fullText = '';

      setStatusText('Extrayendo texto...');
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => 'str' in item ? item.str : '').join(' ');
        fullText += pageText + ' ';
      }

      // Si no hay suficiente texto, asumimos que es una imagen escaneada
      if (fullText.trim().length < 50) {
        setStatusText('Iniciando OCR de respaldo (esto puede tardar unos segundos)...');
        fullText = ''; // resetear

        // Importación dinámica para no afectar la carga inicial de la página
        const Tesseract = (await import('tesseract.js')).default;

        for (let i = 1; i <= Math.min(pdf.numPages, 2); i++) {
          const page = await pdf.getPage(i);
          // Scale 1.5 a 2 es ideal para el OCR, mejor calidad = más aciertos
          const viewport = page.getViewport({ scale: 2.0 });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport }).promise;

          setStatusText(`Ejecutando OCR (página ${i})...`);

          const result = await Tesseract.recognize(canvas, 'spa', {
            logger: m => {
              if (m.status === 'recognizing text') {
                setStatusText(`Leyendo imagen Pág ${i}: ${Math.round(m.progress * 100)}%`);
              }
            }
          });
          fullText += result.data.text + ' ';
        }
      }

      // === MOTOR DE EXTRACCIÓN INTELIGENTE (ESTRATEGIA REFACTORIZADA) ===
      const regexData = extractPolicyData(fullText);

      setStatusText('Analizando póliza con IA...');
      const { extractDataWithAI } = await import('../../lib/aiExtractor');
      const aiData = await extractDataWithAI(fullText);

      console.log('📊 DATOS EXTRAÍDOS (REGEX):', regexData);
      console.log('🧠 DATOS EXTRAÍDOS (IA):', aiData);

      // Limpiar propiedades vacías o 'No detectado' para evitar sobreescrituras en blanco
      const isValid = (v) => v != null && v !== '' && v !== 'No detectado' && v !== 'No contiene';

      // Campos numéricos/monetarios: REGEX manda, IA es respaldo
      const moneyFields = ['primaNeta', 'primaTotal', 'primerPago', 'pagoSubsecuente', 'recargo', 'gastosExpedicion'];
      // Campos de texto: IA puede ser mejor, pero REGEX tiene prioridad si encontró algo válido
      const allFields = new Set([...Object.keys(regexData), ...Object.keys(aiData)]);

      const finalData = {};
      for (const field of allFields) {
        const regexVal = regexData[field];
        const aiVal = aiData[field];

        if (moneyFields.includes(field)) {
          // Para dinero: REGEX es rey por defecto, pero EN CHUBB la IA tiene prioridad absoluta
          // porque sabe separar semánticamente las primas (pág 2) y el recibo del primer pago (pág 5).
          const isChubb = regexData.aseguradora === 'Chubb' || aiData.aseguradora === 'Chubb';
          if (isChubb) {
            finalData[field] = isValid(aiVal) ? aiVal : (isValid(regexVal) ? regexVal : (aiVal || ''));
          } else {
            finalData[field] = isValid(regexVal) ? regexVal : (isValid(aiVal) ? aiVal : (regexVal || ''));
          }
        } else {
          // Para texto: usar el que tenga valor, priorizando REGEX, pero dejando que IA gane si es 'contratante' o algo que la IA suele hacer mejor.
          // En este caso, dejaremos que la IA tenga prioridad en el texto ya que su prompt fue mejorado, EXCEPTO para RFC y fechas que el REGEX hace bien
          const regexPriorities = ['rfc', 'inicio', 'fin', 'serie', 'formaPago'];
          if (regexPriorities.includes(field)) {
             finalData[field] = isValid(regexVal) ? regexVal : (isValid(aiVal) ? aiVal : (regexVal || ''));
          } else {
             finalData[field] = isValid(aiVal) ? aiVal : (isValid(regexVal) ? regexVal : (aiVal || ''));
          }
        }
      }

      console.log('✅ DATOS FINALES (FUSIÓN INTELIGENTE):', finalData);

      const extractedData = {
        id: Date.now(),
        estado: 'Pendiente',
        ...finalData
      };

      onDataExtracted(extractedData);
      setIsProcessing(false);

    } catch (error) {
      console.error('Error al procesar el PDF:', error);
      // Pequeña espera para que el modal no desaparezca de golpe si falla muy rápido
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsProcessing(false);
      alert(`Ocurrió un error al leer el PDF.\n\nDetalle técnico: ${error.message}`);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files?.[0]?.type === 'application/pdf') {
      processPDF(files[0]);
    } else {
      alert('Solo se permiten archivos PDF');
    }
  }, []);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files?.[0]) processPDF(files[0]);
  };

  return (
    <>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 flex flex-col items-center justify-center p-8 transition-all duration-300 relative overflow-hidden rounded-2xl ${isDragging ? 'bg-apple-blue/10 border-apple-blue/50 scale-[1.02]' : 'bg-apple-200/20 border-dashed border-border hover:bg-apple-200/50'
          }`}
      >
        <div className="w-12 h-12 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-apple-blue flex items-center justify-center mb-4">
          <UploadCloud size={24} strokeWidth={1.5} />
        </div>
        <h3 className="text-[15px] font-semibold mb-2 text-apple-600 tracking-tight">Sube una Póliza</h3>
        <p className="text-[13px] text-apple-500 mb-6 text-center leading-relaxed px-2">
          Arrastra el archivo PDF aquí o selecciona tu archivo.
        </p>

        <label className="bg-white hover:bg-apple-50 text-apple-blue font-medium py-2 px-5 rounded-full text-[13px] cursor-pointer transition-colors focus-ring shadow-[0_1px_4px_rgba(0,0,0,0.1)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          Explorar Archivos
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isProcessing}
          />
        </label>
      </div>

    </>
  );
}
