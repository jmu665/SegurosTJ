import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { CalendarClock, AlertTriangle, Printer, ChevronRight, FileWarning, CheckCircle2, Circle, Phone, Clock } from 'lucide-react';

function getDaysLeftFromDate(dateObj) {
  if (!dateObj) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateObj);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function formatTimeLeft(days) {
  if (days === null) return '—';
  if (days < 0) return `Venció hace ${Math.abs(days)}d`;
  if (days === 0) return 'Vence hoy';
  if (days >= 365) {
    const y = Math.floor(days / 365);
    const m = Math.floor((days % 365) / 30);
    return m > 0 ? `${y} año${y > 1 ? 's' : ''} ${m}m` : `${y} año${y > 1 ? 's' : ''}`;
  }
  if (days >= 30) return `${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? 'es' : ''}`;
  return `${days} día${days !== 1 ? 's' : ''}`;
}

function getPhone(policy) {
  return policy.cliente?.celular || policy.cliente?.telefono || '';
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const capitalize = (s) => {
  if (typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export default function Expirations() {
  const { policies, updatePolicy } = useData();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [filterMode, setFilterMode] = useState('vencidos');
  const [selectedMonthStr, setSelectedMonthStr] = useState(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);

  const selectedYear = parseInt(selectedMonthStr.split('-')[0], 10) || currentYear;
  const selectedMonth = (parseInt(selectedMonthStr.split('-')[1], 10) || (currentMonth + 1)) - 1;

  const getPagosRegistrados = (policy) => {
    if (!policy || !policy.tarifa) return {};
    try {
      return JSON.parse(policy.tarifa);
    } catch { return {}; }
  };

  const [reviewed, setReviewed] = useState({});

  useEffect(() => {
    const initialReviewed = {};
    policies.forEach(p => {
      const pagos = getPagosRegistrados(p);
      Object.assign(initialReviewed, pagos);
    });
    setReviewed(initialReviewed);
  }, [policies]);

  const toggleReviewed = async (eventId, policyId) => {
    const isNowChecked = !reviewed[eventId];
    setReviewed(prev => ({ ...prev, [eventId]: isNowChecked }));

    try {
      const policy = policies.find(p => p.id === policyId);
      if (!policy) return;
      
      const currentPagos = getPagosRegistrados(policy);
      currentPagos[eventId] = isNowChecked;
      
      await updatePolicy(policyId, { tarifa: JSON.stringify(currentPagos) });
    } catch (e) {
      console.error('Error guardando pago en BD:', e);
    }
  };

  const allEvents = useMemo(() => {
    const events = [];
    policies.forEach(p => {
      let tarifa = {};
      try { if (p.tarifa) tarifa = JSON.parse(p.tarifa); } catch {}

      if (!p.inicio || !p.fin) {
         if (p.fin) {
             events.push({
                 id: p.id + '_renovacion',
                 date: new Date(p.fin + (p.fin.includes('T') ? '' : 'T00:00:00')),
                 type: 'Renovación',
                 originalType: 'Renovación',
                 policy: p,
                 monto: p.primaTotal || 0
             });
         }
         return;
      }
      
      const start = new Date(p.inicio + (p.inicio.includes('T') ? '' : 'T00:00:00'));
      const end = new Date(p.fin + (p.fin.includes('T') ? '' : 'T00:00:00'));
      const formaPago = (p.formaPago || 'Anual').toLowerCase();
      
      let monthsToAdd = 12;
      if (formaPago.includes('semestral')) monthsToAdd = 6;
      else if (formaPago.includes('trimestral')) monthsToAdd = 3;
      else if (formaPago.includes('mensual')) monthsToAdd = 1;
      
      const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      const totalPayments = Math.max(1, Math.round(totalMonths / monthsToAdd));
      
      const primerPago = parseFloat(tarifa.primerPago) || 0;
      const pagoSubsecuente = parseFloat(tarifa.pagoSubsecuente) || 0;
      const primaTotal = parseFloat(String(p.primaTotal || '0').replace(/,/g, '')) || 0;
      
      let montoPago1 = 0;
      let montoPagoN = 0;
      
      if (primerPago > 0) {
          montoPago1 = primerPago;
          montoPagoN = pagoSubsecuente > 0 ? pagoSubsecuente : (totalPayments > 1 ? (primaTotal - primerPago) / (totalPayments - 1) : 0);
      } else {
          montoPago1 = totalPayments > 0 ? primaTotal / totalPayments : primaTotal;
          montoPagoN = montoPago1;
      }

      events.push({
          id: p.id + '_pago_1',
          date: new Date(start),
          type: `Cobro ${capitalize(formaPago)} (1/${totalPayments})`,
          originalType: 'Pago',
          policy: p,
          monto: montoPago1
      });
      
      let current = new Date(start);
      current.setMonth(current.getMonth() + monthsToAdd);
      
      let paymentCount = 2; // Payment 1 is at start
      while (current < end) {
         events.push({
             id: p.id + '_pago_' + paymentCount,
             date: new Date(current),
             type: `Cobro ${capitalize(formaPago)} (${paymentCount}/${totalPayments})`,
             originalType: 'Pago',
             policy: p,
             monto: montoPagoN
         });
         current.setMonth(current.getMonth() + monthsToAdd);
         paymentCount++;
      }
      
      events.push({
          id: p.id + '_renovacion',
          date: end,
          type: 'Vencimiento / Renovación',
          originalType: 'Renovación',
          policy: p,
          monto: p.primaTotal || 0
      });
    });
    return events;
  }, [policies]);

  const expiredEvents = useMemo(() => {
    return allEvents.filter(e => {
      const days = getDaysLeftFromDate(e.date);
      return days !== null && days < 0 && !reviewed[e.id];
    }).sort((a, b) => a.date - b.date);
  }, [allEvents, reviewed]);

  const proximosEvents = useMemo(() => {
    return allEvents.filter(e => {
      const days = getDaysLeftFromDate(e.date);
      return days !== null && days >= 0 && days <= 15 && !reviewed[e.id];
    }).sort((a, b) => a.date - b.date);
  }, [allEvents, reviewed]);

  const monthEvents = useMemo(() => {
    return allEvents.filter(e => {
      return e.date.getMonth() === selectedMonth && e.date.getFullYear() === selectedYear && !reviewed[e.id];
    }).sort((a, b) => a.date - b.date);
  }, [allEvents, selectedMonth, selectedYear, reviewed]);

  const displayData = filterMode === 'vencidos' ? expiredEvents : filterMode === 'proximos' ? proximosEvents : monthEvents;
  const reviewedCount = displayData.filter(e => reviewed[e.id]).length;

  const handlePrint = () => {
    const title = filterMode === 'vencidos'
      ? 'Reporte de Pólizas Vencidas'
      : filterMode === 'proximos'
      ? 'Próximos a Vencerse (15 días)'
      : 'Vencimientos de ' + MONTHS[selectedMonth] + ' ' + selectedYear;
    const fecha = now.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    const hora = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const total = displayData.length;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=900"><title>' + title + '</title></head><body></body></html>');
    doc.close();

    const s = doc.createElement('style');
    s.textContent = [
      '* { margin:0; padding:0; box-sizing:border-box; }',
      'body { font-family:-apple-system,BlinkMacSystemFont,sans-serif; color:#1d1d1f; padding:16px; background:#fff; -webkit-print-color-adjust:exact; min-width:700px; }',
      '.hdr { margin-bottom:14px; padding-bottom:10px; border-bottom:2px solid #1d1d1f; }',
      '.hdr h1 { font-size:14px; font-weight:700; }',
      '.hdr p { font-size:9px; color:#86868b; margin-top:2px; }',
      'table { width:100%; border-collapse:collapse; margin-top:4px; table-layout:fixed; }',
      'th { text-align:left; padding:4px 6px; font-size:8px; font-weight:700; color:#86868b; text-transform:uppercase; letter-spacing:0.4px; border-bottom:1px solid #ccc; white-space:nowrap; }',
      'td { padding:5px 6px; border-bottom:1px solid #eee; font-size:9px; color:#333; word-wrap:break-word; }',
      'tr:nth-child(even) { background:#f9f9fb; }',
      '.name { font-weight:600; color:#1d1d1f; }',
      '.mono { font-family:monospace; font-size:8px; color:#666; }',
      '.ft { margin-top:16px; padding-top:8px; border-top:1px solid #ddd; display:flex; justify-content:space-between; font-size:8px; color:#999; }',
      '@page { size:landscape; margin:8mm; }',
      '@media print { body { padding:0; min-width:0; } }'
    ].join('\n');
    doc.head.appendChild(s);

    const body = doc.body;

    const hdr = doc.createElement('div');
    hdr.className = 'hdr';
    hdr.innerHTML = '<h1>' + title + '</h1><p>' + fecha + ' — ' + total + ' registro' + (total !== 1 ? 's' : '') + '</p>';
    body.appendChild(hdr);

    const tbl = doc.createElement('table');
    const cg = doc.createElement('colgroup');
    ['25%', '22%', '20%', '18%', '15%'].forEach(pct => { const c = doc.createElement('col'); c.style.width = pct; cg.appendChild(c); });
    tbl.appendChild(cg);
    const thead = doc.createElement('thead');
    const hr = doc.createElement('tr');
    ['Contratante', 'Póliza', 'Evento', 'Importe', 'Estado'].forEach(h => {
      const th = doc.createElement('th');
      th.textContent = h;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    tbl.appendChild(thead);

    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

    const tbody = doc.createElement('tbody');
    displayData.forEach(e => {
      const p = e.policy;
      const tr = doc.createElement('tr');
      const phone = getPhone(p);
      const isChecked = reviewed[e.id];
      const eventName = e.type === 'Renovación' ? 'Renovación' : e.type.replace('Pago ', 'Cobro ');
      
      const cells = [
        { text: `<b style="color:#1d1d1f; font-size:10px;">${p.contratante || '—'}</b><br/><span style="color:#666">${phone || 'Sin tel.'}</span>`, html: true },
        { text: `<b>${p.aseguradora || '—'}</b><br/><span style="font-family:monospace; color:#666">${p.poliza || '—'}</span><br/><span style="color:#666">Inicio: ${p.inicio || 'N/D'}</span>`, html: true },
        { text: `<span style="color:${e.type==='Renovación' ? '#DC2626' : '#2563EB'}"><b>${eventName}</b></span><br/><span style="color:#333">${e.date.toLocaleDateString('es-MX')}</span>`, html: true },
        { text: `<b style="color:#059669">${formatter.format(e.monto || 0)}</b><br/><span style="color:#666">${p.formaPago || '—'}</span>`, html: true },
        { text: `<span style="font-weight:bold; font-size:10px; color:${isChecked ? '#059669' : '#DC2626'}">${isChecked ? 'PAGADO ✓' : 'PENDIENTE'}</span>`, html: true }
      ];
      
      cells.forEach(c => {
        const td = doc.createElement('td');
        if (c.html) td.innerHTML = c.text;
        else td.textContent = c.text;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    body.appendChild(tbl);

    const ft = doc.createElement('div');
    ft.className = 'ft';
    ft.innerHTML = '<span>Administrador de Seguros</span><span>' + fecha + ' ' + hora + '</span>';
    body.appendChild(ft);

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 400);
  };

  const selectClass = "bg-white/60 border border-border/40 rounded-xl py-2.5 px-3 pr-8 text-[14px] text-apple-600 outline-none transition-all hover:bg-white focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,102,204,0.15)] focus:border-apple-blue backdrop-blur-md appearance-none cursor-pointer";

  return (
    <div className="flex flex-col max-w-4xl mx-auto animate-in fade-in duration-500 w-full mb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-apple-600 tracking-tight leading-none mb-2">Vencimientos</h2>
          <p className="text-[15px] text-apple-400">Control de vigencias y reportes de expiración.</p>
        </div>
        <button
          onClick={handlePrint}
          disabled={displayData.length === 0}
          className="apple-button px-5 py-2.5 rounded-xl text-[14px] font-medium flex items-center gap-2 shadow-sm focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Printer size={16} />
          Imprimir Reporte
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setFilterMode('vencidos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all border ${
            filterMode === 'vencidos'
              ? 'bg-red-50 border-red-200 text-red-600 shadow-sm'
              : 'bg-white/60 border-border/40 text-apple-500 hover:bg-white'
          }`}
        >
          <AlertTriangle size={15} />
          Vencidos Hoy
          {expiredEvents.length > 0 && (
            <span className="ml-1 w-6 h-6 rounded-full bg-red-500 text-white text-[12px] font-bold flex items-center justify-center">
              {expiredEvents.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilterMode('proximos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all border ${
            filterMode === 'proximos'
              ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm'
              : 'bg-white/60 border-border/40 text-apple-500 hover:bg-white'
          }`}
        >
          <Clock size={15} />
          Próximos a Vencerse
          {proximosEvents.length > 0 && (
            <span className="ml-1 w-6 h-6 rounded-full bg-amber-500 text-white text-[12px] font-bold flex items-center justify-center">
              {proximosEvents.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilterMode('mes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all border ${
            filterMode === 'mes'
              ? 'bg-apple-blue/5 border-apple-blue/30 text-apple-blue shadow-sm'
              : 'bg-white/60 border-border/40 text-apple-500 hover:bg-white'
          }`}
        >
          <CalendarClock size={15} />
          Por Mes / Año
        </button>
      </div>

      {/* Month/Year Selectors */}
      {filterMode === 'mes' && (
        <div className="flex flex-wrap items-center gap-3 mb-6 animate-in slide-in-from-top-4 duration-200">
          <div className="relative">
            <input 
              type="month" 
              value={selectedMonthStr} 
              onChange={e => {
                if (e.target.value) {
                  setSelectedMonthStr(e.target.value);
                }
              }} 
              className={selectClass}
            />
          </div>
          <span className="text-[13px] text-apple-400 ml-1">
            {monthEvents.length} evento{monthEvents.length !== 1 ? 's' : ''}
            {reviewedCount > 0 && (
              <span className="ml-2 text-emerald-600 font-medium">· {reviewedCount} revisado{reviewedCount !== 1 ? 's' : ''}</span>
            )}
          </span>
        </div>
      )}

      {/* Results Card */}
      <div className="apple-card overflow-visible">
        <div className="px-6 py-4 border-b border-border bg-white/40 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-apple-600 tracking-tight flex items-center gap-2">
            {filterMode === 'vencidos' ? (
              <><AlertTriangle size={16} className="text-red-500" /> Pólizas Vencidas</>
            ) : filterMode === 'proximos' ? (
              <><Clock size={16} className="text-amber-500" /> Próximos a Vencerse</>
            ) : (
              <><CalendarClock size={16} className="text-apple-blue" /> {MONTHS[selectedMonth]} {selectedYear}</>
            )}
          </h3>
          <span className="text-[13px] text-apple-400 font-medium">{displayData.length} resultado{displayData.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Lista de resultados */}
        <div className="divide-y divide-border/50">
          {displayData.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-apple-100 flex items-center justify-center text-apple-400">
                  <FileWarning size={28} strokeWidth={1.5} />
                </div>
                <p className="text-[15px] font-medium text-apple-500">
                  {filterMode === 'vencidos' ? '¡Sin eventos pendientes!' : filterMode === 'proximos' ? 'No hay eventos próximos a vencer.' : 'No hay pagos o vencimientos en este período.'}
                </p>
                <p className="text-[13px] text-apple-400">
                  {filterMode === 'vencidos' ? 'Todos los cobros están al corriente. 🎉' : filterMode === 'proximos' ? 'Todo tranquilo para los próximos 15 días.' : 'Intenta seleccionar otro mes o año.'}
                </p>
              </div>
            </div>
          ) : (
            displayData.map((item) => {
              const days = getDaysLeftFromDate(item.date);
              const isExpired = days !== null && days < 0;
              const isCritical = days !== null && days >= 0 && days <= 15;
              const isChecked = reviewed[item.id];
              const phone = getPhone(item.policy);
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-4 px-6 py-5 transition-colors ${
                    isChecked ? 'bg-emerald-50/40' :
                    isExpired ? 'bg-red-50/50' :
                    isCritical ? 'bg-amber-50/30' :
                    'hover:bg-white/60'
                  }`}
                >
                  {/* Info principal con más detalle */}
                  <div className="flex-1 min-w-0 flex flex-col gap-2.5 mt-0.5">
                     
                     {/* Fila 1: Fecha exacta, Tipo de Evento y Estado de Pago */}
                     <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-[12px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${item.originalType === 'Renovación' ? 'bg-red-100 text-red-700' : 'bg-apple-blue/10 text-apple-blue'}`}>
                            {item.type}
                          </span>
                          <span className="text-[15px] font-medium text-apple-600 capitalize">
                            {item.date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                           {isExpired && !isChecked && <span className="text-red-500 text-[12px] font-bold tracking-wider uppercase bg-red-100 px-2 py-0.5 rounded">Vencido hace {Math.abs(days)}d</span>}
                           {isCritical && !isChecked && <span className="text-amber-600 text-[12px] font-bold tracking-wider uppercase bg-amber-100 px-2 py-0.5 rounded">Vence en {days}d</span>}
                           <button
                             onClick={() => toggleReviewed(item.id, item.policy.id)}
                             className={`px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                               isChecked
                                 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                 : 'bg-white border-2 border-border text-apple-400 hover:border-apple-300 hover:text-apple-500'
                             }`}
                           >
                             {isChecked ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                             {isChecked ? 'Pagado' : 'Pendiente'}
                           </button>
                        </div>
                     </div>

                     {/* Fila 2: Cliente y Póliza */}
                     <div>
                        <h4 className={`text-[18px] font-bold tracking-tight ${isChecked ? 'text-apple-400 line-through' : 'text-apple-600'}`}>
                          {item.policy.contratante || 'Sin Nombre'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[14px] text-apple-500 font-medium">{item.policy.aseguradora}</span>
                           <span className="text-apple-300">•</span>
                           <span className="font-mono text-[13px] text-apple-400">Pol: {item.policy.poliza}</span>
                        </div>
                     </div>

                     {/* Fila 3: Detalles financieros y Contacto */}
                     <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mt-2 pt-3 border-t border-border/60">
                        <div className="flex flex-col">
                           <span className="text-[11px] text-apple-400 font-medium uppercase tracking-wider mb-0.5">Inicio</span>
                           <span className="text-[14px] text-apple-600 font-medium">{item.policy.inicio || 'N/D'}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[11px] text-apple-400 font-medium uppercase tracking-wider mb-0.5">Forma de Pago</span>
                           <span className="text-[14px] text-apple-600 font-semibold">{item.policy.formaPago || 'No especificada'}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[11px] text-apple-400 font-medium uppercase tracking-wider mb-0.5">Importe</span>
                           <span className="text-[14px] text-emerald-600 font-bold">${(item.monto || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
                        </div>
                        {phone && (
                          <div className="flex flex-col sm:ml-auto">
                             <span className="text-[11px] text-apple-400 font-medium uppercase tracking-wider mb-0.5">Contacto WhatsApp</span>
                             <a 
                                href={'https://wa.me/52' + phone.replace(/\D/g, '')} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[14px] text-apple-blue font-medium hover:underline flex items-center gap-1.5"
                             >
                                <Phone size={14} />
                                {phone}
                             </a>
                          </div>
                        )}
                     </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
