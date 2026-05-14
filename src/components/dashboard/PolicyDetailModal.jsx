import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileCheck2, User, Car, CreditCard, Calendar, Phone, MapPin, Hash, Tag, Layers, Edit3, Save } from 'lucide-react';
import { useData } from '../../context/DataContext';

const Field = ({ label, value, icon: Icon, isEditing, name, onChange }) => {
  const display = (!value || value === 'No detectado' || value === 'null' || value === 'undefined')
    ? '—'
    : value;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0">
      {Icon && (
        <div className="w-7 h-7 rounded-lg bg-apple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon size={13} className="text-apple-blue" strokeWidth={2} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-apple-400 uppercase tracking-wider mb-0.5">{label}</p>
        {isEditing ? (
          <input
            name={name}
            value={value || ''}
            onChange={onChange}
            className="w-full bg-white border border-border/80 rounded-lg py-1 px-3 text-[14px] text-apple-600 outline-none focus:border-apple-blue transition-all"
          />
        ) : (
          <p className={`text-[14px] font-medium break-words ${display === '—' ? 'text-apple-300' : 'text-apple-600'}`}>{display}</p>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, icon: Icon, children }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg bg-apple-blue/10 flex items-center justify-center">
        <Icon size={13} className="text-apple-blue" strokeWidth={2} />
      </div>
      <h4 className="text-[13px] font-semibold text-apple-500 uppercase tracking-wider">{title}</h4>
    </div>
    <div className="bg-apple-100/50 rounded-2xl px-4">
      {children}
    </div>
  </div>
);

const STATUS_CONFIG = {
  Activa: { color: 'text-success', bg: 'bg-success-bg', dot: 'bg-success' },
  Vencida: { color: 'text-error', bg: 'bg-error-bg', dot: 'bg-error' },
  Pendiente: { color: 'text-warning', bg: 'bg-warning-bg', dot: 'bg-warning' },
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function PolicyDetailModal({ policy, onClose }) {
  const { updatePolicy, policies } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  if (!policy) return null;

  const currentPolicy = policies.find(p => p.id === policy.id) || policy;
  const vehiculo = currentPolicy.vehiculo || {};
  const cliente = currentPolicy.cliente || {};
  const primaTotal = parseFloat(String(currentPolicy.primaTotal || currentPolicy.prima_total || 0).replace(/[$,]/g, ''));
  const primaNeta = parseFloat(String(currentPolicy.primaNeta || currentPolicy.prima_neta || 0).replace(/[$,]/g, ''));
  const polizaNum = currentPolicy.poliza || currentPolicy.numero_poliza || 'poliza';

  let tarifa = {};
  try { if (currentPolicy.tarifa) tarifa = JSON.parse(currentPolicy.tarifa); } catch {}
  const primerPago = parseFloat(tarifa.primerPago) || 0;

  const startEditing = () => {
    setFormData({
      poliza: polizaNum,
      aseguradora: currentPolicy.aseguradora,
      forma_pago: currentPolicy.forma_pago || currentPolicy.formaPago,
      agente: currentPolicy.agente,
      inicio: currentPolicy.inicio,
      fin: currentPolicy.fin,
      prima_neta: currentPolicy.primaNeta || currentPolicy.prima_neta,
      prima_total: currentPolicy.primaTotal || currentPolicy.prima_total,
      primerPago: primerPago || '',
      nombre: currentPolicy.contratante || cliente.nombre,
      rfc: currentPolicy.rfc || cliente.rfc,
      correo: cliente.correo,
      telefono: currentPolicy.telefono || cliente.telefono || cliente.celular,
      direccion: currentPolicy.direccion || cliente.direccion,
      modelo: vehiculo.modelo || currentPolicy.modelo,
      version: vehiculo.version || currentPolicy.version,
      serie: vehiculo.serie || currentPolicy.serie,
      servicio: vehiculo.servicio || currentPolicy.servicio,
      puertas: vehiculo.puertas || currentPolicy.puertas,
      paquete: vehiculo.paquete || currentPolicy.paquete,
      tipo_vehiculo: vehiculo.tipo_vehiculo
    });
    setIsEditing(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    let newTarifa = {};
    try { if (currentPolicy.tarifa) newTarifa = JSON.parse(currentPolicy.tarifa); } catch {}
    newTarifa.primerPago = formData.primerPago ? parseFloat(String(formData.primerPago).replace(/[$,]/g, '')) : 0;
    delete newTarifa.pagoSubsecuente;

    await updatePolicy(currentPolicy.id, {
      numero_poliza: formData.poliza,
      aseguradora: formData.aseguradora,
      forma_pago: formData.forma_pago,
      agente: formData.agente,
      inicio: formData.inicio,
      fin: formData.fin,
      prima_neta: formData.prima_neta,
      prima_total: formData.prima_total,
      tarifa: JSON.stringify(newTarifa),
      cliente: {
        nombre: formData.nombre,
        rfc: formData.rfc,
        correo: formData.correo,
        telefono: formData.telefono,
        direccion: formData.direccion
      },
      vehiculo: {
        modelo: formData.modelo,
        version: formData.version,
        serie: formData.serie,
        servicio: formData.servicio,
        puertas: formData.puertas,
        paquete: formData.paquete,
        tipo_vehiculo: formData.tipo_vehiculo
      }
    });
    setIsEditing(false);
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white w-full max-w-2xl h-full md:h-[90vh] md:rounded-[32px] rounded-t-[32px] shadow-2xl flex flex-col relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 pt-8 pb-5 border-b border-border/30 flex items-start justify-between flex-shrink-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-apple-blue/10 flex items-center justify-center flex-shrink-0">
                <FileCheck2 size={24} className="text-apple-blue" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[12px] font-medium text-apple-400 uppercase tracking-wider mb-0.5">Póliza</p>
                <h2 className="text-[22px] font-semibold text-apple-600 tracking-tight leading-none font-mono">
                  {isEditing ? formData.poliza : polizaNum}
                </h2>
                <p className="text-[14px] text-apple-500 mt-1">{isEditing ? formData.aseguradora : currentPolicy.aseguradora}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isEditing ? (
                <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-apple-blue hover:bg-blue-600 text-white font-medium text-[13px] transition-colors focus-ring flex items-center gap-2">
                  <Save size={16} /> Guardar
                </button>
              ) : (
                <button onClick={startEditing} className="px-4 py-2 rounded-xl bg-apple-100 hover:bg-apple-200 text-apple-600 font-medium text-[13px] transition-colors focus-ring flex items-center gap-2">
                  <Edit3 size={16} /> Editar
                </button>
              )}
              <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-apple-500 hover:bg-apple-200/50 transition-colors focus-ring">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-8 py-6">
            <Section title="Datos de Póliza" icon={FileCheck2}>
              <Field label="Número de Póliza" value={isEditing ? formData.poliza : polizaNum} icon={Hash} isEditing={isEditing} name="poliza" onChange={handleChange} />
              <Field label="Aseguradora" value={isEditing ? formData.aseguradora : currentPolicy.aseguradora} icon={Tag} isEditing={isEditing} name="aseguradora" onChange={handleChange} />
              <Field label="Forma de Pago" value={isEditing ? formData.forma_pago : (currentPolicy.formaPago || currentPolicy.forma_pago)} icon={CreditCard} isEditing={isEditing} name="forma_pago" onChange={handleChange} />
              <Field label="Agente" value={isEditing ? formData.agente : currentPolicy.agente} icon={User} isEditing={isEditing} name="agente" onChange={handleChange} />
              <Field label="Inicio de Vigencia" value={isEditing ? formData.inicio : formatDate(currentPolicy.inicio)} icon={Calendar} isEditing={isEditing} name="inicio" onChange={handleChange} />
              <Field label="Fin de Vigencia" value={isEditing ? formData.fin : formatDate(currentPolicy.fin)} icon={Calendar} isEditing={isEditing} name="fin" onChange={handleChange} />
            </Section>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-apple-100/50 rounded-2xl p-4 text-center flex flex-col justify-center">
                <p className="text-[11px] font-medium text-apple-400 uppercase tracking-wider mb-1">Prima Neta</p>
                {isEditing ? (
                  <input name="prima_neta" value={formData.prima_neta || ''} onChange={handleChange} className="w-full text-center bg-white border border-border/80 rounded-lg py-1 px-3 text-[14px] text-apple-600 outline-none focus:border-apple-blue font-bold" />
                ) : (
                  <p className="text-[18px] font-bold text-apple-600">${primaNeta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
              <div className="bg-blue-50 rounded-2xl p-4 text-center flex flex-col justify-center">
                <p className="text-[11px] font-medium text-apple-blue/60 uppercase tracking-wider mb-1">Prima Total</p>
                {isEditing ? (
                  <input name="prima_total" value={formData.prima_total || ''} onChange={handleChange} className="w-full text-center bg-white border border-blue-200 rounded-lg py-1 px-3 text-[14px] text-apple-blue outline-none focus:border-apple-blue font-bold" />
                ) : (
                  <p className="text-[18px] font-bold text-apple-blue">${primaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
              <div className="bg-apple-100/50 rounded-2xl p-4 text-center flex flex-col justify-center">
                <p className="text-[11px] font-medium text-apple-400 uppercase tracking-wider mb-1">Primer Pago</p>
                {isEditing ? (
                  <input name="primerPago" value={formData.primerPago || ''} onChange={handleChange} className="w-full text-center bg-white border border-border/80 rounded-lg py-1 px-3 text-[14px] text-apple-600 outline-none focus:border-apple-blue font-bold" placeholder="Automático" />
                ) : (
                  <p className="text-[16px] font-semibold text-apple-600">{primerPago > 0 ? `$${primerPago.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Automático'}</p>
                )}
              </div>
            </div>

            <Section title="Datos del Cliente" icon={User}>
              <Field label="Nombre" value={isEditing ? formData.nombre : (currentPolicy.contratante || cliente.nombre)} icon={User} isEditing={isEditing} name="nombre" onChange={handleChange} />
              <Field label="RFC" value={isEditing ? formData.rfc : (currentPolicy.rfc || cliente.rfc)} icon={Hash} isEditing={isEditing} name="rfc" onChange={handleChange} />
              <Field label="Correo" value={isEditing ? formData.correo : cliente.correo} icon={Hash} isEditing={isEditing} name="correo" onChange={handleChange} />
              <Field label="Teléfono" value={isEditing ? formData.telefono : (currentPolicy.telefono || cliente.telefono || cliente.celular)} icon={Phone} isEditing={isEditing} name="telefono" onChange={handleChange} />
              <Field label="Dirección" value={isEditing ? formData.direccion : (currentPolicy.direccion || cliente.direccion)} icon={MapPin} isEditing={isEditing} name="direccion" onChange={handleChange} />
            </Section>

            <Section title="Datos del Vehículo" icon={Car}>
              <Field label="Modelo" value={isEditing ? formData.modelo : (vehiculo.modelo || currentPolicy.modelo)} icon={Car} isEditing={isEditing} name="modelo" onChange={handleChange} />
              <Field label="Versión" value={isEditing ? formData.version : (vehiculo.version || currentPolicy.version)} icon={Tag} isEditing={isEditing} name="version" onChange={handleChange} />
              <Field label="No. Serie (NIV)" value={isEditing ? formData.serie : (vehiculo.serie || currentPolicy.serie)} icon={Hash} isEditing={isEditing} name="serie" onChange={handleChange} />
              <Field label="Tipo de Servicio" value={isEditing ? formData.servicio : (vehiculo.servicio || currentPolicy.servicio)} icon={Layers} isEditing={isEditing} name="servicio" onChange={handleChange} />
              <Field label="Puertas" value={isEditing ? formData.puertas : (vehiculo.puertas || currentPolicy.puertas)} icon={Layers} isEditing={isEditing} name="puertas" onChange={handleChange} />
              <Field label="Paquete" value={isEditing ? formData.paquete : (vehiculo.paquete || currentPolicy.paquete)} icon={Tag} isEditing={isEditing} name="paquete" onChange={handleChange} />
              <Field label="Tipo de Vehículo" value={isEditing ? formData.tipo_vehiculo : vehiculo.tipo_vehiculo} icon={Car} isEditing={isEditing} name="tipo_vehiculo" onChange={handleChange} />
            </Section>
          </div>

          <div className="px-5 sm:px-8 py-5 border-t border-border/30 flex-shrink-0 flex flex-col sm:flex-row gap-3 bg-apple-100/30">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-apple-blue hover:bg-blue-600 text-white shadow-sm font-medium text-[14px] transition-all focus-ring">Cerrar</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
