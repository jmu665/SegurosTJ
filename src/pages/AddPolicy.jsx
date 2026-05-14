import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../lib/auth';
import UploadZone from '../components/dashboard/UploadZone';
import { ChevronRight, FileCheck2, CheckCircle, UploadCloud, UserPlus, RefreshCw, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AddPolicy({ onComplete }) {
  const { user } = useAuth();
  const { clients, addClient, addPolicy, refreshClients } = useData();
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  // Estados de Procesamiento (Subidos para persistencia)
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');

  const userName = user?.user_metadata?.full_name || user?.email || '';

  useEffect(() => {
    refreshClients();
  }, []);

  const inputClass = "w-full bg-white/60 border border-border/40 rounded-2xl py-3.5 px-4 text-[15px] text-apple-600 outline-none transition-all hover:bg-white focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,102,204,0.15)] focus:border-apple-blue placeholder:text-apple-400 backdrop-blur-md";
  const selectClass = "w-full bg-white/60 border border-border/40 rounded-2xl py-3.5 px-4 text-[15px] text-apple-600 outline-none transition-all hover:bg-white focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,102,204,0.15)] focus:border-apple-blue backdrop-blur-md appearance-none cursor-pointer";

  // State del Cliente (Paso 1)
  // isNewClient: null (no seleccionado), true (Nuevo), false (Registrado)
  const [isNewClient, setIsNewClient] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');

  // State extraído del PDF (Pasos 2 y 3)
  const [extractedData, setExtractedData] = useState({
    nombre: '', rfc: '', direccion: '',
    aseguradora: '', poliza: '', inicio: '', fin: '',
    formaPago: 'Anual', primaNeta: '', primaTotal: '', estado: 'Activa',
    agente: userName,
    modelo: '', tipo_vehiculo: 'Auto', version: '', serie: '',
    puertas: '', paquete: ''
  });

  // Actualizar agente si el usuario cambia o se carga
  useEffect(() => {
    if (userName && !extractedData.agente) {
      setExtractedData(prev => ({ ...prev, agente: userName }));
    }
  }, [userName]);

  const updateExtractedField = (field, value) => setExtractedData(prev => ({ ...prev, [field]: value }));

  const handleNextFromClient = () => {
    if (isNewClient === false && !selectedClientId) return alert('Debes seleccionar un cliente de la lista.');
    setStep(2);
  };

  const handleDataExtracted = (data) => {
    setExtractedData(prev => ({
      ...prev,
      nombre: data.contratante || data.nombre || data.asegurado || prev.nombre,
      rfc: data.rfc || prev.rfc,
      direccion: data.direccion || data.calle || prev.direccion,
      telefono: data.telefono || prev.telefono,
      aseguradora: data.aseguradora || prev.aseguradora,
      poliza: data.poliza || prev.poliza,
      inicio: data.inicio || prev.inicio,
      fin: data.fin || prev.fin,
      formaPago: data.formaPago || prev.formaPago,
      primaNeta: data.primaNeta || prev.primaNeta,
      primaTotal: data.primaTotal || prev.primaTotal,
      primerPago: data.primerPago || prev.primerPago,
      pagoSubsecuente: data.pagoSubsecuente || prev.pagoSubsecuente,
      agente: prev.agente || userName, // Mantener el agente actual (usuario logueado)
      modelo: data.modelo || prev.modelo,
      serie: data.serie || prev.serie,
      version: data.version || prev.version,
      paquete: data.paquete || prev.paquete
    }));
    setStep(3);
  };

  const handleSave = async () => {
    try {
      if (!extractedData.aseguradora) return alert("Selecciona o escribe una aseguradora.");
      if (!extractedData.poliza) return alert("El número de póliza es requerido.");

      let resolvedClientId = null;
      let finalClientName = '';

      if (isNewClient) {
        if (!extractedData.nombre) return alert('Nombre faltante. Revisa el campo de nombre del contratante antes de guardar.');
        finalClientName = extractedData.nombre.trim();

        const added = await addClient({
          nombre: finalClientName,
          rfc: extractedData.rfc || '',
          direccion: extractedData.direccion || '',
          telefono: extractedData.telefono || '',
          celular: '', correo: ''
        });
        resolvedClientId = added.id;
      } else {
        resolvedClientId = selectedClientId;
        const existing = clients.find(c => c.id.toString() === selectedClientId.toString());
        finalClientName = existing ? existing.nombre : '';
      }

      const finalVehicleData = {
        marca: 'N/D',
        modelo: extractedData.modelo || 'N/D',
        tipo_vehiculo: extractedData.tipo_vehiculo || 'Auto',
        version: extractedData.version,
        serie: extractedData.serie,
        servicio: 'Particular',
        puertas: extractedData.puertas,
        paquete: extractedData.paquete
      };

      const tarifaObj = {
        primerPago: parseFloat(String(extractedData.primerPago).replace(/[$,]/g, '')) || 0,
        pagoSubsecuente: parseFloat(String(extractedData.pagoSubsecuente).replace(/[$,]/g, '')) || 0
      };

      const finalPolicyData = {
        ...extractedData,
        cliente_id: resolvedClientId,
        contratante: finalClientName,
        tarifa: JSON.stringify(tarifaObj)
      };

      // Preservar datos del cliente antes de eliminarlos del objeto de póliza
      finalPolicyData._clienteData = {
        rfc: extractedData.rfc || '',
        direccion: extractedData.direccion || '',
        telefono: extractedData.telefono || ''
      };

      delete finalPolicyData.nombre; delete finalPolicyData.rfc; delete finalPolicyData.direccion;
      delete finalPolicyData.modelo; delete finalPolicyData.tipo_vehiculo;
      delete finalPolicyData.version; delete finalPolicyData.serie;
      delete finalPolicyData.puertas; delete finalPolicyData.paquete;

      await addPolicy(finalPolicyData, finalVehicleData);
      setIsSuccess(true);
      setTimeout(() => {
        // Reset state to start over
        setIsSuccess(false);
        setStep(1);
        setIsNewClient(null);
        setSelectedClientId('');
        setExtractedData({
          nombre: '', rfc: '', direccion: '',
          aseguradora: '', poliza: '', inicio: '', fin: '',
          formaPago: 'Anual', primaNeta: '', primaTotal: '', estado: 'Activa',
          primerPago: '', pagoSubsecuente: '',
          agente: userName,
          modelo: '', tipo_vehiculo: 'Auto', version: '', serie: '',
          puertas: '', paquete: ''
        });
      }, 2500);
    } catch (err) {
      console.error(err);
      alert('Error guardando la póliza. Revisa el formato.');
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto h-[50vh] animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-success-bg/50 rounded-full flex items-center justify-center text-success mb-6 animate-in zoom-in duration-300">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-[32px] font-semibold text-apple-600 tracking-tight mb-2">¡Completado!</h2>
        <p className="text-[16px] text-apple-500 text-center">La póliza y sus datos han sido vinculados correctamente.</p>
      </div>
    );
  }

  const stepsList = ['Destino', 'Documento', 'Revisión Final'];

  return (
    <div className="flex flex-col max-w-4xl mx-auto animate-in fade-in duration-500 w-full mb-10">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-apple-600 tracking-tight leading-none mb-2">Nueva Póliza</h2>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-8">
        {stepsList.map((s, i) => {
          const active = step === i + 1;
          const passed = step > i + 1;
          return (
            <div key={s} className="flex items-center gap-3">
              <span className={`text-[14px] font-medium transition-colors ${active ? 'text-apple-blue' : passed ? 'text-apple-600' : 'text-apple-400'}`}>
                {i + 1}. {s}
              </span>
              {i < stepsList.length - 1 && <ChevronRight size={14} className="text-apple-300" />}
            </div>
          );
        })}
      </div>

      <div className="apple-card p-8 sm:p-12 relative overflow-hidden shadow-xl shadow-black/5">

        {/* PASO 1 : Modalidad de Cliente (Cards) */}
        {step === 1 && (
          <div className="animate-in slide-in-from-right-8 duration-300 flex flex-col">
            <h3 className="text-[24px] font-semibold text-apple-600 tracking-tight mb-2">Destino de la Póliza</h3>
            <p className="text-[15px] text-apple-400 mb-8">¿A dónde vamos a guardar este documento?</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

              {/* Card 1: Renovación */}
              <button
                onClick={() => setIsNewClient(false)}
                className={`flex flex-col text-left p-6 rounded-[20px] transition-all duration-300 border ${isNewClient === false
                    ? 'bg-blue-500/5 border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,1)] scale-[0.98]'
                    : 'bg-white/60 border-border/40 hover:bg-white hover:border-blue-400/40 hover:shadow-md hover:-translate-y-1'
                  }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 ${isNewClient === false ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'bg-blue-50 text-blue-500'}`}>
                  <RefreshCw size={24} />
                </div>
                <h4 className="text-[18px] font-semibold text-apple-600 mb-2">Renovación</h4>
                <p className="text-[14px] text-apple-500 leading-relaxed">
                  Renueva la póliza de un cliente que ya existe en tu directorio.
                </p>
              </button>

              {/* Card 2: Cliente Nuevo (Lila) */}
              <button
                onClick={() => setIsNewClient(true)}
                className={`flex flex-col text-left p-6 rounded-[20px] transition-all duration-300 border ${isNewClient === true
                    ? 'bg-purple-500/5 border-purple-500 shadow-[0_0_0_1px_rgba(168,85,247,1)] scale-[0.98]'
                    : 'bg-white/60 border-border/40 hover:bg-white hover:border-purple-400/40 hover:shadow-md hover:-translate-y-1'
                  }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 ${isNewClient === true ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30' : 'bg-purple-50 text-purple-500'}`}>
                  <UserPlus size={24} />
                </div>
                <h4 className="text-[18px] font-semibold text-apple-600 mb-2">Cliente Nuevo</h4>
                <p className="text-[14px] text-apple-500 leading-relaxed">
                  El sistema extraerá el nombre directamente del PDF y creará el perfil por ti.
                </p>
              </button>

            </div>

            {/* Contenido Condicional según la Card elegida */}
            {isNewClient === false && (
              <div className="w-full max-w-md mx-auto animate-in slide-in-from-bottom-4">
                <label className="text-[14px] font-medium text-apple-500 mb-3 block text-center">Selecciona al cliente de tu directorio</label>
                <div className="relative">
                  <select
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="" disabled>Presiona para seleccionar...</option>
                    {clients.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-apple-400">
                    <ChevronRight size={16} className="rotate-90" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6 pt-6 border-t border-border/40">
              <button
                onClick={handleNextFromClient}
                className={`apple-button px-8 py-3 rounded-full text-[15px] font-medium flex items-center gap-2 shadow-sm focus-ring ${isNewClient === null ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isNewClient === null}
              >
                Continuar al Escáner <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* PASO 2 : Cargar PDF */}
        {step === 2 && (
          <div className="flex flex-col items-center animate-in slide-in-from-right-8 duration-300 min-h-[300px]">
            <div className="w-16 h-16 bg-blue-50 text-apple-blue rounded-full flex justify-center items-center mb-6">
              <UploadCloud size={28} />
            </div>
            <h3 className="text-[24px] font-semibold text-apple-600 tracking-tight text-center mb-2">Sube el Documento</h3>
            <p className="text-[15px] text-apple-400 mb-8 text-center max-w-md">
              Arrastra el PDF de la póliza para {isNewClient ? 'auto-completar perfil, datos y vehículo' : 'asignarle los datos y vehículo'}.
            </p>
            <div className="w-full max-w-md mb-8">
              <UploadZone 
                onDataExtracted={handleDataExtracted} 
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                statusText={statusText}
                setStatusText={setStatusText}
              />
            </div>

            <div className="flex justify-between w-full mt-auto pt-6 border-t border-border/40">
              <button onClick={() => setStep(1)} className="px-6 py-2.5 rounded-full text-[15px] font-medium text-apple-500 hover:bg-apple-200/50 transition-colors">Volver</button>
              <button onClick={() => setStep(3)} className="px-5 py-2.5 rounded-full border border-border/80 bg-white/60 shadow-sm hover:border-apple-blue/40 hover:text-apple-blue hover:bg-white transition-all text-[14px] font-medium text-apple-500 flex items-center gap-2">Llenar Manualmente <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* PASO 3 : Formulario Final */}
        {step === 3 && (
          <div className="flex flex-col animate-in slide-in-from-right-8 duration-300">

            <h3 className="text-[24px] font-semibold text-apple-600 tracking-tight mb-2">Revisión Final</h3>
            <p className="text-[15px] text-apple-400 mb-8">Revisa los datos antes de guardar la póliza en sistema.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

              {isNewClient && (
                <>
                  <div className="md:col-span-2 mb-2">
                    <h4 className="text-[17px] font-semibold text-apple-600 tracking-tight border-b border-border/40 pb-3">Nuevo Perfil de Cliente (Auto-generado)</h4>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Nombre Extraído *</label>
                    <input type="text" value={extractedData.nombre} onChange={e => updateExtractedField('nombre', e.target.value)} className={inputClass} placeholder="Ej. Juan Pérez" />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">RFC</label>
                    <input type="text" value={extractedData.rfc} onChange={e => updateExtractedField('rfc', e.target.value)} className={inputClass} placeholder="Si se detectó" />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Teléfono</label>
                    <input type="text" value={extractedData.telefono} onChange={e => updateExtractedField('telefono', e.target.value)} className={inputClass} placeholder="10 dígitos" />
                  </div>

                </>
              )}

              <div className="md:col-span-2 mt-4 mb-2">
                <h4 className="text-[17px] font-semibold text-apple-600 tracking-tight border-b border-border/40 pb-3">Detalles de Póliza</h4>
              </div>

              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Aseguradora *</label>
                <input type="text" value={extractedData.aseguradora} onChange={e => updateExtractedField('aseguradora', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Número de Póliza *</label>
                <input type="text" value={extractedData.poliza} onChange={e => updateExtractedField('poliza', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Inicio Vigencia</label>
                <input type="text" value={extractedData.inicio} onChange={e => updateExtractedField('inicio', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Fin Vigencia</label>
                <input type="text" value={extractedData.fin} onChange={e => updateExtractedField('fin', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Forma de Pago</label>
                <div className="relative">
                  <select value={extractedData.formaPago} onChange={e => updateExtractedField('formaPago', e.target.value)} className={selectClass}>
                    <option value="Anual">Anual</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Contado">Contado</option>
                  </select>
                  <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-apple-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Estado</label>
                <div className="relative">
                  <select value={extractedData.estado} onChange={e => updateExtractedField('estado', e.target.value)} className={selectClass}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Activa">Activa</option>
                    <option value="Vencida">Vencida</option>
                  </select>
                  <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-apple-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Prima Neta</label>
                <input type="text" value={extractedData.primaNeta} onChange={e => updateExtractedField('primaNeta', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Prima Total</label>
                <input type="text" value={extractedData.primaTotal} onChange={e => updateExtractedField('primaTotal', e.target.value)} className={inputClass} />
              </div>

              <div className="md:col-span-2">
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Dirección del Contratante</label>
                <input type="text" value={extractedData.direccion} onChange={e => updateExtractedField('direccion', e.target.value)} className={inputClass} placeholder="Dirección completa" />
              </div>

              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1 flex items-center gap-2">
                  Importe Primer Pago
                  <span className="text-[10px] bg-blue-50 text-apple-blue px-1.5 py-0.5 rounded-full font-bold"></span>
                </label>
                <input type="text" value={extractedData.primerPago} onChange={e => updateExtractedField('primerPago', e.target.value)} className={`${inputClass} border-apple-blue/20 bg-apple-blue/[0.02]`} />
              </div>

              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Agente</label>
                <input type="text" value={extractedData.agente} onChange={e => updateExtractedField('agente', e.target.value)} className={inputClass} />
              </div>

              <div className="md:col-span-2 mt-4 mb-2">
                <h4 className="text-[17px] font-semibold text-apple-600 tracking-tight border-b border-border/40 pb-3">Vehículo Asegurado</h4>
              </div>

              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Modelo del Vehículo</label>
                <input type="text" value={extractedData.modelo} onChange={e => updateExtractedField('modelo', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Tipo de Vehículo</label>
                <div className="relative">
                  <select value={extractedData.tipo_vehiculo} onChange={e => updateExtractedField('tipo_vehiculo', e.target.value)} className={selectClass}>
                    <option value="Auto">Auto</option>
                    <option value="Camioneta">Camioneta</option>
                    <option value="Motocicleta">Motocicleta</option>
                    <option value="Camión">Camión</option>
                    <option value="Otro">Otro</option>
                  </select>
                  <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-apple-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Serie (NIV)</label>
                <input type="text" value={extractedData.serie} onChange={e => updateExtractedField('serie', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Versión</label>
                <input type="text" value={extractedData.version} onChange={e => updateExtractedField('version', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Puertas / Placas</label>
                <input type="text" value={extractedData.puertas} onChange={e => updateExtractedField('puertas', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-apple-500 mb-1.5 block ml-1">Paquete / Cobertura</label>
                <input type="text" value={extractedData.paquete} onChange={e => updateExtractedField('paquete', e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-12 pt-6 border-t border-border/40">
              <button onClick={() => setStep(2)} className="px-6 py-3 rounded-full text-[15px] font-medium text-apple-500 hover:bg-apple-200/50 transition-colors focus-ring">Atrás al PDF</button>
              <button onClick={handleSave} className="apple-button px-8 py-3 rounded-full text-[15px] ml-auto focus-ring flex items-center gap-2 shadow-sm font-semibold">
                <FileCheck2 size={18} />
                Guardar Póliza
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Modal de Carga Simplificado (Sin Portal para mayor compatibilidad) */}
      <AnimatePresence>
        {isProcessing && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/60 backdrop-blur-xl"
            />
            
            {/* Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white border border-white/80 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] rounded-[2.5rem] p-10 max-w-[360px] w-full flex flex-col items-center text-center overflow-hidden"
            >
              {/* Spinner Premium */}
              <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-apple-blue border-l-apple-blue"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 rounded-full border-[3px] border-transparent border-b-blue-400 border-r-blue-400"
                />
                <div className="relative w-14 h-14 flex items-center justify-center bg-blue-50/80 rounded-xl border border-blue-100 overflow-hidden shadow-inner">
                  <FileText size={28} className="text-apple-blue z-10" />
                  <motion.div 
                    animate={{ y: [-30, 30], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute w-full h-[3px] bg-blue-500 shadow-[0_0_12px_rgba(28,66,232,1)] z-20"
                  />
                </div>
              </div>

              <h3 className="text-[24px] font-bold text-apple-600 mb-2">Analizando Póliza</h3>
              <p className="text-apple-500 text-[15px] font-medium leading-relaxed h-14">
                {statusText}
              </p>
              
              <div className="mt-6 flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm">
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2.5 h-2.5 rounded-full bg-apple-blue"
                />
                <span className="text-[12px] font-bold text-apple-blue uppercase tracking-widest">Motor Gemini 2.5 Flash</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
