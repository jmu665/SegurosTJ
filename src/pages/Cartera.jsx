import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Wallet, Search, ChevronDown, FileText, CheckCircle2, AlertTriangle, User, Filter } from 'lucide-react';
import jsPDF from 'jspdf';

const capitalize = (s) => {
  if (typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

function getPaymentEvents(p) {
  const events = [];
  let tarifa = {};
  try { if (p.tarifa) tarifa = JSON.parse(p.tarifa); } catch {}
  if (!p.inicio || !p.fin) return events;

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
  const primaTotal = parseFloat(String(p.primaTotal || '0').replace(/,/g, '')) || 0;
  
  let montoPago1 = 0;
  let montoPagoN = 0;
  
  if (primerPago > 0) {
      montoPago1 = primerPago;
      montoPagoN = totalPayments > 1 ? (primaTotal - primerPago) / (totalPayments - 1) : 0;
  } else {
      montoPago1 = totalPayments > 0 ? primaTotal / totalPayments : primaTotal;
      montoPagoN = montoPago1;
  }

  events.push({ id: p.id + '_pago_1', date: start, type: `Cobro ${capitalize(formaPago)} (1/${totalPayments})`, paid: true, monto: montoPago1 });

  let cur = new Date(start);
  cur.setMonth(cur.getMonth() + monthsToAdd);
  let n = 2;
  while (cur < end) {
    const eid = p.id + '_pago_' + n;
    events.push({ id: eid, date: new Date(cur), type: `Cobro ${capitalize(formaPago)} (${n}/${totalPayments})`, paid: !!tarifa[eid], monto: montoPagoN });
    cur.setMonth(cur.getMonth() + monthsToAdd);
    n++;
  }
  return events;
}

export default function Cartera() {
  const { policies } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [aseguradoraFilter, setAseguradoraFilter] = useState('');
  const [expandedClient, setExpandedClient] = useState(null);
  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  const aseguradoras = useMemo(() => {
    const set = new Set(policies.map(p => p.aseguradora).filter(Boolean));
    return Array.from(set).sort();
  }, [policies]);

  // Group policies by client
  const clientGroups = useMemo(() => {
    const map = {};
    policies.forEach(p => {
      const name = (p.contratante || 'Sin Nombre').trim();
      if (!map[name]) map[name] = { name, policies: [] };

      const events = getPaymentEvents(p);
      const paidEvents = events.filter(e => e.paid);
      const paidCount = paidEvents.length;
      const totalCount = events.length || 1;
      
      const totalPagado = paidEvents.reduce((sum, e) => sum + e.monto, 0);
      const primaTotalNum = parseFloat(String(p.primaTotal || '0').replace(/,/g, '')) || 0;
      const saldoPendiente = Math.max(0, primaTotalNum - totalPagado);

      map[name].policies.push({
        ...p,
        primaTotal: primaTotalNum,
        paymentEvents: events,
        cuotasPagadas: paidCount,
        totalPayments: totalCount,
        totalPagado: totalPagado,
        saldoPendiente: saldoPendiente,
        porcentajePagado: primaTotalNum > 0 ? (totalPagado / primaTotalNum) * 100 : 100
      });
    });

    return Object.values(map).map(g => {
      const prima = g.policies.reduce((s, p) => s + (p.primaTotal || 0), 0);
      const pagado = g.policies.reduce((s, p) => s + p.totalPagado, 0);
      const pendiente = g.policies.reduce((s, p) => s + p.saldoPendiente, 0);
      const pct = prima > 0 ? (pagado / prima) * 100 : 100;
      return { ...g, prima, pagado, pendiente, pct, count: g.policies.length };
    });
  }, [policies]);

  const filtered = useMemo(() => {
    let res = clientGroups;

    if (aseguradoraFilter) {
      res = res.map(g => ({
        ...g,
        policies: g.policies.filter(p => p.aseguradora === aseguradoraFilter)
      })).filter(g => g.policies.length > 0);
      
      // Update totals for the filtered subset
      res = res.map(g => {
        const prima = g.policies.reduce((s, p) => s + (p.primaTotal || 0), 0);
        const pagado = g.policies.reduce((s, p) => s + p.totalPagado, 0);
        const pendiente = g.policies.reduce((s, p) => s + p.saldoPendiente, 0);
        const pct = prima > 0 ? (pagado / prima) * 100 : 100;
        return { ...g, prima, pagado, pendiente, pct, count: g.policies.length };
      });
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      res = res.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.policies.some(p => (p.poliza && String(p.poliza).toLowerCase().includes(q)) || (p.aseguradora && p.aseguradora.toLowerCase().includes(q)))
      );
    }
    
    return res;
  }, [clientGroups, searchTerm, aseguradoraFilter]);

  const generatePDF = (group) => {
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.setFontSize(18); doc.setFont(undefined, 'bold');
    doc.text('Reporte de Pagos', 14, 22);
    doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(100);
    doc.text(`Generado: ${fecha}`, 14, 30);
    doc.line(14, 35, W - 14, 35);

    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(30);
    doc.text(group.name, 14, 44);
    doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(80);
    doc.text(`${group.count} póliza${group.count > 1 ? 's' : ''}  •  Prima Total: ${formatter.format(group.prima)}`, 14, 52);

    let y = 62;

    group.policies.forEach((p, pi) => {
      if (y > 250) { doc.addPage(); y = 20; }

      // Policy header
      doc.setFillColor(240, 240, 245); doc.rect(14, y - 4, W - 28, 8, 'F');
      doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(40);
      doc.text(`${p.aseguradora || '—'}  •  Pól: ${p.poliza || '—'}  •  ${p.formaPago || 'Anual'}  •  ${formatter.format(p.primaTotal || 0)}`, 16, y + 1);
      y += 12;

      // Table header
      doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(120);
      ['FECHA', 'CONCEPTO', 'MONTO', 'ESTADO'].forEach((h, i) => doc.text(h, [16, 55, 110, 150][i], y));
      y += 6;

      doc.setFont(undefined, 'normal'); doc.setFontSize(8);
      (p.paymentEvents || []).forEach(ev => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setTextColor(50);
        doc.text(ev.date.toLocaleDateString('es-MX'), 16, y);
        doc.text(ev.type.length > 30 ? ev.type.substring(0, 28) + '…' : ev.type, 55, y);
        doc.text(formatter.format(ev.monto), 110, y);
        doc.setTextColor(ev.paid ? 5 : 220, ev.paid ? 150 : 38, ev.paid ? 105 : 38);
        doc.text(ev.paid ? 'PAGADO ✓' : 'PENDIENTE', 150, y);
        y += 6;
      });
      y += 6;
    });

    // Totals
    y += 2;
    doc.setDrawColor(200); doc.line(14, y, W - 14, y); y += 8;
    doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.setTextColor(5, 150, 105); doc.text(`Total Pagado: ${formatter.format(group.pagado)}`, 14, y);
    doc.setTextColor(220, 120, 0); doc.text(`Pendiente: ${formatter.format(group.pendiente)}`, 110, y);
    y += 10;
    doc.setFontSize(7); doc.setTextColor(150);
    doc.text('Administrador de Seguros — Reporte generado automáticamente', 14, y);

    doc.save(`Reporte_${group.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="flex flex-col max-w-5xl mx-auto animate-in fade-in duration-500 w-full mb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-apple-600 tracking-tight leading-none mb-2">Cartera</h2>
          <p className="text-[15px] text-apple-400">Estado de pagos y adeudos por cliente.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-400" size={18} />
            <input type="text" placeholder="Buscar cliente, póliza..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-border/40 rounded-xl text-[14px] text-apple-600 outline-none transition-all hover:bg-white focus:bg-white focus:border-apple-blue shadow-sm backdrop-blur-md" />
          </div>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={16} className="text-apple-400" />
            </div>
            <select
              value={aseguradoraFilter}
              onChange={(e) => setAseguradoraFilter(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 bg-white/60 border border-border/40 rounded-xl text-[14px] text-apple-600 outline-none transition-all hover:bg-white focus:bg-white focus:border-apple-blue shadow-sm backdrop-blur-md appearance-none cursor-pointer"
            >
              <option value="">Todas las aseguradoras</option>
              {aseguradoras.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown size={14} className="text-apple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Policy table grouped by client */}
      <div className="apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-apple-50/50 border-b border-border/60">
                <th className="px-5 py-3 text-[12px] font-semibold text-apple-400 uppercase tracking-wider">Cliente / Póliza</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-apple-400 uppercase tracking-wider">Forma de Pago</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-apple-400 uppercase tracking-wider">Prima Total</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-emerald-600 uppercase tracking-wider">Pagado</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-amber-600 uppercase tracking-wider">Pendiente</th>
                <th className="px-5 py-3 text-[12px] font-semibold text-apple-400 uppercase tracking-wider text-center">Progreso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Wallet size={32} className="text-apple-300 mb-2" />
                      <p className="text-[15px] font-medium text-apple-500">No se encontraron registros</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((g, gi) => (
                  <>
                    {/* Spacer between client groups */}
                    {gi > 0 && (
                      <tr key={g.name + '_spacer'}>
                        <td colSpan="6" className="bg-apple-100/50 h-3 border-y border-border/40 p-0" />
                      </tr>
                    )}

                    {/* Client group header if multiple policies */}
                    {g.count > 1 && (
                      <tr
                        key={g.name + '_header'}
                        onClick={() => setExpandedClient(prev => prev === g.name ? null : g.name)}
                        className={`cursor-pointer transition-colors border-l-4 border-l-apple-blue/40 ${expandedClient === g.name ? 'bg-apple-blue/5' : 'hover:bg-apple-50/50'}`}
                      >
                        <td colSpan="6" className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`transition-transform duration-200 text-apple-400 ${expandedClient === g.name ? 'rotate-180' : ''}`}>
                              <ChevronDown size={14} />
                            </span>
                            <span className="text-[15px] font-bold text-apple-600">{g.name}</span>
                            <span className="text-[11px] font-bold bg-apple-blue/10 text-apple-blue px-2 py-0.5 rounded-full">
                              {g.count} pólizas
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Policy rows */}
                    {g.policies.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => setExpandedClient(prev => prev === g.name ? null : g.name)}
                        className={`cursor-pointer transition-colors border-b border-border/40 ${expandedClient === g.name ? 'bg-apple-blue/[0.03]' : 'hover:bg-white/40'}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {g.count === 1 && (
                              <span className={`transition-transform duration-200 text-apple-400 ${expandedClient === g.name ? 'rotate-180' : ''}`}>
                                <ChevronDown size={14} />
                              </span>
                            )}
                            <div className="flex flex-col">
                              {g.count === 1 && <span className="text-[14px] font-semibold text-apple-600">{p.contratante || 'Sin Nombre'}</span>}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[12px] text-apple-500 font-medium">{p.aseguradora}</span>
                                <span className="text-apple-300 text-[10px]">•</span>
                                <span className="text-[12px] text-apple-400 font-mono">{p.poliza}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="text-[14px] font-medium text-apple-600 capitalize">{p.formaPago || 'Anual'}</span>
                            <span className="text-[12px] text-apple-400">{p.cuotasPagadas} de {p.totalPayments} pagos</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[14px] font-semibold text-apple-600">{formatter.format(p.primaTotal || 0)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[14px] font-semibold text-emerald-600">{formatter.format(p.totalPagado)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[14px] font-semibold text-amber-600">{formatter.format(p.saldoPendiente)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[11px] font-bold text-apple-500">{Math.round(p.porcentajePagado)}%</span>
                            <div className="w-24 h-2 bg-apple-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${p.porcentajePagado === 100 ? 'bg-emerald-500' : 'bg-apple-blue'}`} style={{ width: `${p.porcentajePagado}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Expanded detail panel */}
                    {expandedClient === g.name && (
                      <tr key={g.name + '_detail'}>
                        <td colSpan="6" className="p-0">
                          <div className="bg-gradient-to-b from-apple-blue/[0.03] to-white/80 border-t border-apple-blue/10 px-6 py-5 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-[15px] font-semibold text-apple-600 flex items-center gap-2">
                                <FileText size={16} className="text-apple-blue" />
                                Detalle de Pagos — {g.name}
                              </h4>
                              <button onClick={(e) => { e.stopPropagation(); generatePDF(g); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-apple-blue text-white hover:bg-apple-blue/90 transition-all shadow-sm">
                                <FileText size={14} /> Descargar PDF
                              </button>
                            </div>

                            {g.policies.map(p => (
                              <div key={p.id} className="mb-4 last:mb-0">
                                <div className="flex items-center justify-between bg-apple-50/80 rounded-t-xl px-4 py-2.5 border border-b-0 border-border/40">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[13px] font-bold text-apple-600">{p.aseguradora}</span>
                                    <span className="text-apple-300">•</span>
                                    <span className="text-[12px] font-mono text-apple-400">Pol: {p.poliza}</span>
                                    <span className="text-apple-300">•</span>
                                    <span className="text-[12px] text-apple-500 capitalize">{p.formaPago || 'Anual'}</span>
                                  </div>
                                  <span className="text-[13px] font-semibold text-apple-600">{formatter.format(p.primaTotal || 0)}</span>
                                </div>

                                <div className="bg-white rounded-b-xl border border-border/50 overflow-hidden shadow-sm">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-apple-50/40">
                                        <th className="px-4 py-2 text-[11px] font-semibold text-apple-400 uppercase tracking-wider">Fecha</th>
                                        <th className="px-4 py-2 text-[11px] font-semibold text-apple-400 uppercase tracking-wider">Concepto</th>
                                        <th className="px-4 py-2 text-[11px] font-semibold text-apple-400 uppercase tracking-wider">Monto</th>
                                        <th className="px-4 py-2 text-[11px] font-semibold text-apple-400 uppercase tracking-wider text-right">Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                      {(p.paymentEvents || []).map(ev => (
                                        <tr key={ev.id} className={ev.paid ? 'bg-emerald-50/30' : ''}>
                                          <td className="px-4 py-2.5 text-[13px] text-apple-600">{ev.date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                          <td className="px-4 py-2.5">
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md bg-apple-blue/10 text-apple-blue`}>{ev.type}</span>
                                          </td>
                                          <td className="px-4 py-2.5 text-[13px] font-semibold text-apple-600">{formatter.format(ev.monto)}</td>
                                          <td className="px-4 py-2.5 text-right">
                                            {ev.paid ? (
                                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg"><CheckCircle2 size={12} /> Pagado</span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-lg"><AlertTriangle size={12} /> Pendiente</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <div className="flex items-center justify-between px-4 py-2.5 bg-apple-50/40 border-t border-border/30">
                                    <div className="flex items-center gap-5">
                                      <span className="text-[12px] text-apple-500">Prima: <b className="text-apple-600">{formatter.format(p.primaTotal || 0)}</b></span>
                                      <span className="text-[12px] text-emerald-600">Pagado: <b>{formatter.format(p.totalPagado)}</b></span>
                                      <span className="text-[12px] text-amber-600">Pendiente: <b>{formatter.format(p.saldoPendiente)}</b></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-bold text-apple-500">{Math.round(p.porcentajePagado)}%</span>
                                      <div className="w-16 h-1.5 bg-apple-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${p.porcentajePagado === 100 ? 'bg-emerald-500' : 'bg-apple-blue'}`} style={{ width: `${p.porcentajePagado}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
