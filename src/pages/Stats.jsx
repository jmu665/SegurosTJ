import { useData } from '../context/DataContext';
import { Target, TrendingUp, BarChart3, Activity, FileCheck2, Users, AlertTriangle, Wallet, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const CardGrid = ({ title, cards, startDelay = 0 }) => (
  <>
    <h3 className="text-[17px] font-semibold text-apple-600 tracking-tight mt-2">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (startDelay + i) * 0.1, ease: 'easeOut' }}
            className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-md transition-shadow rounded-3xl p-6 flex flex-col gap-4"
          >
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
              <Icon size={24} strokeWidth={2} />
            </div>
            <div className="mt-2">
              <p className="text-[13px] font-medium text-apple-400 uppercase tracking-widest mb-1.5">{stat.label}</p>
              <p className={`text-[32px] font-bold ${stat.color} tracking-tight leading-none`}>{stat.value}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  </>
);

export default function Stats() {
  const { policies, clients } = useData();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

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

    events.push({ paid: true, monto: montoPago1 });

    let cur = new Date(start);
    cur.setMonth(cur.getMonth() + monthsToAdd);
    let n = 2;
    while (cur < end) {
      const eid = p.id + '_pago_' + n;
      events.push({ paid: !!tarifa[eid], monto: montoPagoN });
      cur.setMonth(cur.getMonth() + monthsToAdd);
      n++;
    }
    return events;
  }

  const carteraTotals = policies.reduce((acc, p) => {
    const events = getPaymentEvents(p);
    const paidEvents = events.filter(e => e.paid);
    
    const primaNum = parseFloat(String(p.primaTotal || '0').replace(/,/g, '')) || 0;
    const totalPagado = paidEvents.reduce((sum, e) => sum + e.monto, 0);
    const saldoPendiente = Math.max(0, primaNum - totalPagado);

    acc.prima += primaNum;
    acc.pagado += totalPagado;
    acc.pendiente += saldoPendiente;
    return acc;
  }, { prima: 0, pagado: 0, pendiente: 0 });

  const isThisMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const policiesThisMonth = policies.filter(p => isThisMonth(p.time || p.created_at));
  const ingresosMes = policiesThisMonth.reduce((sum, p) => sum + (parseFloat(String(p.primaTotal || p.prima_total || 0).replace(/[$,]/g, '')) || 0), 0);
  const ventasTotales = policies.reduce((sum, p) => sum + (parseFloat(String(p.primaTotal || p.prima_total || 0).replace(/[$,]/g, '')) || 0), 0);

  const proximasAVencer = policies.filter(p => {
    if (!p.fin) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const fin = new Date(p.fin + (p.fin.includes('T') ? '' : 'T00:00:00'));
    const days = Math.floor((fin - today) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  }).length;

  const overviewCards = [
    { label: 'Total Pólizas', value: policies.length, icon: FileCheck2, color: 'text-apple-blue', bg: 'bg-blue-50' },
    { label: 'Clientes Registrados', value: clients.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Por Vencer (30 días)', value: proximasAVencer, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const performanceCards = [
    { label: 'Pólizas Nuevas este Mes', value: policiesThisMonth.length, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Ventas Generadas en el Mes', value: `$${ingresosMes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-apple-blue', bg: 'bg-blue-50' },
    { label: 'Ventas Históricas Totales', value: `$${ventasTotales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const carteraCards = [
    { label: 'Prima Total Global', value: `$${carteraTotals.prima.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: Wallet, color: 'text-apple-600', bg: 'bg-slate-100' },
    { label: 'Total Pagado Global', value: `$${carteraTotals.pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Saldo Pendiente Global', value: `$${carteraTotals.pendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];



  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-5xl">
      <div className="flex flex-col mb-2 pb-4 border-b border-border/40">
        <h2 className="text-[32px] font-semibold text-apple-600 tracking-tight leading-none mb-2">Estadísticas</h2>
        <p className="text-[15px] text-apple-500">Panorama general y métricas de crecimiento.</p>
      </div>

      <CardGrid title="Panorama General" cards={overviewCards} startDelay={0} />
      <CardGrid title="Cartera Global" cards={carteraCards} startDelay={3} />
      <CardGrid title="Rendimiento Mensual" cards={performanceCards} startDelay={6} />
    </div>
  );
}
