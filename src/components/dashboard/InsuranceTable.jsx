import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Trash2, AlertTriangle, Clock, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { createPortal } from 'react-dom';
import PolicyDetailModal from './PolicyDetailModal';

const WhatsAppIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ── Semáforo de vencimientos ──────────────────────────────────
function getDaysLeft(finDate) {
  if (!finDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fin = new Date(finDate + (finDate.includes('T') ? '' : 'T00:00:00'));
  const diff = Math.floor((fin - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatTimeLeft(days) {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remainMonths = Math.floor((days % 365) / 30);
    if (remainMonths > 0) return `${years} año${years > 1 ? 's' : ''} ${remainMonths}m`;
    return `${years} año${years > 1 ? 's' : ''}`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months} mes${months > 1 ? 'es' : ''}`;
  }
  return `${days} día${days !== 1 ? 's' : ''}`;
}

function Semaphore({ finDate, estado }) {
  const days = getDaysLeft(finDate);

  if (estado === 'Vencida' || (days !== null && days < 0)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-red-50 text-red-600">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        Vencida
      </span>
    );
  }
  if (days !== null && days <= 15) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-red-50 text-red-500">
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        {formatTimeLeft(days)}
      </span>
    );
  }
  if (days !== null && days <= 30) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-600">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        {formatTimeLeft(days)}
      </span>
    );
  }
  if (days !== null && days > 30) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-600">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        {formatTimeLeft(days)}
      </span>
    );
  }
  const fallback = {
    Activa: { label: 'Activa', cls: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-400' },
    Pendiente: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
    Vencida: { label: 'Vencida', cls: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
  }[estado] || { label: estado || '—', cls: 'bg-apple-100 text-apple-500', dot: 'bg-apple-400' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${fallback.cls}`}>
      <span className={`w-2 h-2 rounded-full ${fallback.dot}`} />
      {fallback.label}
    </span>
  );
}

function EditableStatus({ policy, updatePolicy }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(policy.estado || 'Activa');

  const handleChange = (e) => {
     const newStatus = e.target.value;
     setCurrentStatus(newStatus);
     updatePolicy(policy.id, { estado: newStatus });
     setIsEditing(false);
  };

  if (isEditing) {
    return (
      <select 
         value={currentStatus}
         onChange={handleChange}
         onBlur={() => setIsEditing(false)}
         autoFocus
         className="text-[12px] px-1 py-0.5 border border-apple-300 rounded-md outline-none bg-white text-apple-600 font-medium"
         onClick={e => e.stopPropagation()}
      >
         <option value="Activa">Activa</option>
         <option value="Pendiente">Pendiente</option>
         <option value="Vencida">Vencida</option>
         <option value="Cancelada">Cancelada</option>
      </select>
    );
  }

  return (
    <div onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="cursor-pointer hover:opacity-80 transition-opacity" title="Click para cambiar estatus">
      <Semaphore finDate={policy.fin} estado={currentStatus} />
    </div>
  );
}

function getPaymentsProgress(p) {
  if (!p.inicio || !p.fin) return "0/1";
  const start = new Date(p.inicio + (p.inicio.includes('T') ? '' : 'T00:00:00'));
  const end = new Date(p.fin + (p.fin.includes('T') ? '' : 'T00:00:00'));
  const formaPago = (p.formaPago || 'Anual').toLowerCase();
  
  let monthsToAdd = 12;
  if (formaPago.includes('semestral')) monthsToAdd = 6;
  else if (formaPago.includes('trimestral')) monthsToAdd = 3;
  else if (formaPago.includes('mensual')) monthsToAdd = 1;
  else monthsToAdd = 12; // Contado / Anual
  
  const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const totalPayments = Math.max(1, Math.round(totalMonths / monthsToAdd));

  // La primera cuota (o pago único) se asume como pagada por defecto
  let paidCount = 1;
  let tarifa = {};
  try { if (p.tarifa) tarifa = JSON.parse(p.tarifa); } catch {}
  
  for (let i = 2; i <= totalPayments; i++) {
     if (tarifa[`${p.id}_pago_${i}`]) paidCount++;
  }
  
  return `${Math.min(paidCount, totalPayments)}/${totalPayments}`;
}

const SORT_OPTIONS = [
  { key: 'vigencia-asc',  label: 'Vigencia más antigua', icon: '📅' },
  { key: 'vigencia-desc', label: 'Vigencia más nueva',   icon: '📅' },
  { key: 'aseguradora',   label: 'Aseguradora (A-Z)',    icon: '🏛️' },
  { key: 'contratante',   label: 'Contratante (A-Z)',    icon: '👤' },
];

export default function InsuranceTable({ data = [] }) {
  const { deletePolicy, updatePolicy } = useData();
  const [policyToDelete, setPolicyToDelete] = useState(null);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const menuRef = useRef(null);

  // Cierra el menú al hacer clic fuera
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowSortMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const sorted = [...data];
    switch (sortKey) {
      case 'vigencia-asc':
        return sorted.sort((a, b) => {
          const da = getDaysLeft(a.fin) ?? Infinity;
          const db = getDaysLeft(b.fin) ?? Infinity;
          return da - db; // menos días primero = más vieja
        });
      case 'vigencia-desc':
        return sorted.sort((a, b) => {
          const da = getDaysLeft(a.fin) ?? -Infinity;
          const db = getDaysLeft(b.fin) ?? -Infinity;
          return db - da; // más días primero = más nueva
        });
      case 'aseguradora':
        return sorted.sort((a, b) => (a.aseguradora || '').localeCompare(b.aseguradora || ''));
      case 'contratante':
        return sorted.sort((a, b) => (a.contratante || '').localeCompare(b.contratante || ''));
      default:
        return sorted;
    }
  }, [data, sortKey]);

  const activeLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.label;

  const confirmDelete = () => {
    if (policyToDelete) {
      deletePolicy(policyToDelete.id);
      setPolicyToDelete(null);
    }
  };

  return (
    <>
      <div className="apple-card overflow-visible">
        {/* Header & Filters */}
        <div className="px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40">
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-semibold text-apple-600 tracking-tight">Pólizas</h3>
            {/* Semaphore legend */}
            <div className="hidden md:flex items-center gap-3 ml-4 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Vigente</span>
              <span className="flex items-center gap-1 text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> &lt;30 días</span>
              <span className="flex items-center gap-1 text-red-600"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt;15 días</span>
            </div>
          </div>

          {/* Sort Button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all border ${
                sortKey
                  ? 'bg-apple-blue/5 border-apple-blue/30 text-apple-blue shadow-sm'
                  : 'bg-white/60 border-border/40 text-apple-500 hover:bg-white hover:shadow-sm'
              }`}
            >
              <SlidersHorizontal size={14} />
              {sortKey ? activeLabel : 'Ordenar'}
              {sortKey && (
                <span
                  onClick={(e) => { e.stopPropagation(); setSortKey(null); setShowSortMenu(false); }}
                  className="ml-1 w-5 h-5 rounded-full bg-apple-blue/10 hover:bg-apple-blue/20 flex items-center justify-center transition-colors"
                >
                  <X size={10} />
                </span>
              )}
            </button>

            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-xl shadow-black/10 border border-border/50 z-50 overflow-hidden"
                >
                  <div className="p-1.5">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => { setSortKey(opt.key); setShowSortMenu(false); }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                          sortKey === opt.key
                            ? 'bg-apple-blue/10 text-apple-blue'
                            : 'text-apple-600 hover:bg-black/5'
                        }`}
                      >
                        <span className="text-[16px]">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {sortKey && (
                    <div className="border-t border-border/40 p-1.5">
                      <button
                        onClick={() => { setSortKey(null); setShowSortMenu(false); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-50 transition-all"
                      >
                        <X size={14} />
                        Quitar Orden
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-border/50">
          <table className="w-full text-left whitespace-nowrap min-w-[900px]">
            <thead>
              <tr>
                <th className="px-6 py-3 font-semibold text-[12px] text-apple-400 border-b border-border">Aseguradora</th>
                <th className="px-6 py-3 font-semibold text-[12px] text-apple-400 border-b border-border">Póliza</th>
                <th className="px-6 py-3 font-semibold text-[12px] text-apple-400 border-b border-border">Contratante</th>
                <th className="px-6 py-3 font-semibold text-[12px] text-apple-400 border-b border-border">Teléfono</th>
                <th className="px-6 py-3 font-semibold text-[12px] text-apple-400 border-b border-border">Vigencia</th>
                <th className="px-6 py-3 font-semibold text-[12px] text-apple-400 border-b border-border text-center">F. Pago</th>
                <th className="px-6 py-3 font-semibold text-[12px] text-apple-400 border-b border-border text-center">Pagos</th>
                <th className="px-6 py-3 font-semibold text-[12px] text-apple-400 border-b border-border text-right">Prima Total</th>
                <th className="px-6 py-3 font-semibold text-[12px] text-apple-400 border-b border-border text-center">Estado</th>
                <th className="px-6 py-3 font-semibold text-[12px] border-b border-border w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-white/20">
              <AnimatePresence>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-16 text-center">
                      <p className="text-[15px] font-medium text-apple-500">No hay pólizas registradas.</p>
                      <p className="text-[13px] text-apple-400 mt-1">Sube un documento para comenzar.</p>
                    </td>
                  </tr>
                ) : (
                  sortedData.map((item) => {
                    const days = getDaysLeft(item.fin);
                    const rowWarning = days !== null && days >= 0 && days <= 15;
                    const rowCaution = days !== null && days > 15 && days <= 30;
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={`transition-colors group cursor-pointer ${
                          rowWarning ? 'bg-red-50/50 hover:bg-red-50' :
                          rowCaution ? 'bg-amber-50/30 hover:bg-amber-50/50' :
                          'hover:bg-white/60'
                        }`}
                        onClick={() => setSelectedPolicy(item)}
                      >
                        <td className="px-6 py-3.5 font-semibold text-[14px] text-apple-600">{item.aseguradora}</td>
                        <td className="px-6 py-3.5 text-apple-500 font-mono text-[12px] tracking-tight">{item.poliza}</td>
                        <td className="px-6 py-3.5 text-apple-600 text-[14px]">{item.contratante}</td>
                        <td className="px-6 py-3.5 text-apple-500 text-[13px]">
                          {(item.cliente?.celular || item.cliente?.telefono || item.telefono) ? (
                            <div className="flex items-center gap-2">
                              <span>{item.cliente?.celular || item.cliente?.telefono || item.telefono}</span>
                              <a
                                href={`https://wa.me/52${String(item.cliente?.celular || item.cliente?.telefono || item.telefono).replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-7 h-7 rounded-full bg-[#E8F8F5] text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title="Enviar mensaje por WhatsApp"
                              >
                                <WhatsAppIcon size={14} />
                              </a>
                            </div>
                          ) : (
                            <span className="text-apple-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-apple-500 text-[13px]">{item.inicio} — {item.fin}</td>
                        <td className="px-6 py-3.5 text-apple-500 text-[13px] text-center">{item.formaPago}</td>
                        <td className="px-6 py-3.5 text-apple-500 text-[13px] text-center">
                          <span className="bg-black/5 px-2 py-1 rounded-md font-semibold tracking-wide">{getPaymentsProgress(item)}</span>
                        </td>
                        <td className="px-6 py-3.5 text-apple-600 font-semibold text-[14px] text-right">${item.primaTotal}</td>
                        <td className="px-6 py-3.5 text-center">
                          <EditableStatus policy={item} updatePolicy={updatePolicy} />
                        </td>
                        <td className="px-6 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setPolicyToDelete(item)}
                              className="p-1.5 text-apple-400 hover:text-error hover:bg-error-bg rounded-full focus-ring transition-colors"
                              title="Eliminar registro"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              onClick={() => setSelectedPolicy(item)}
                              className="p-1.5 text-apple-400 hover:text-apple-600 hover:bg-apple-200/50 rounded-full focus-ring transition-colors"
                              title="Ver detalles"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Detail Modal */}
      {selectedPolicy && (
        <PolicyDetailModal policy={selectedPolicy} onClose={() => setSelectedPolicy(null)} />
      )}

      {/* Delete Confirmation Modal */}
      {createPortal(
        <AnimatePresence>
          {policyToDelete && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={() => setPolicyToDelete(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="w-full max-w-[380px] bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-[0_32px_64px_-12px_rgba(255,59,48,0.2)] relative z-10 overflow-hidden border border-white/60 p-7"
              >
                <div className="text-center">
                  {/* Warning Icon Container with Premium Glow */}
                  <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200/50 text-red-500 flex items-center justify-center mx-auto mb-5 shadow-[0_8px_20px_-4px_rgba(239,68,68,0.2)]">
                    <AlertTriangle size={28} className="animate-pulse" />
                  </div>
                  
                  <h3 className="text-[21px] font-bold text-apple-600 tracking-tight leading-tight mb-2">
                    ¿Eliminar póliza?
                  </h3>
                  
                  <p className="text-[14px] text-apple-500 leading-relaxed px-1">
                    Esta acción es irreversible. Se eliminarán de forma permanente la póliza y los vehículos vinculados.
                  </p>

                  {/* Elegant Information Card */}
                  <div className="bg-black/[0.02] border border-black/[0.04] rounded-2xl p-4 my-5 text-left">
                    <span className="text-[10px] uppercase tracking-wider text-apple-400 font-bold block mb-1">Elemento a eliminar</span>
                    <div className="text-[15px] font-bold text-apple-600 truncate">{policyToDelete.contratante}</div>
                    <div className="text-[13px] font-mono text-apple-400 mt-1">Póliza: {policyToDelete.poliza}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={confirmDelete}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold text-[15px] shadow-[0_8px_20px_-6px_rgba(239,68,68,0.4)] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus-ring"
                    >
                      Eliminar Documento
                    </button>
                    <button
                      onClick={() => setPolicyToDelete(null)}
                      className="w-full py-3.5 rounded-2xl bg-black/5 hover:bg-black/10 text-apple-600 font-semibold text-[15px] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-ring border border-transparent hover:border-black/5"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
