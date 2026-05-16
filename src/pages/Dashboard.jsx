import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import InsuranceTable from '../components/dashboard/InsuranceTable';
import { Search, RefreshCw, UserPlus, DollarSign, ChevronDown, ChevronRight, FileCheck2, Filter } from 'lucide-react';

const Section = ({ id, icon: Icon, title, subtitle, count, color, bgLight, borderColor, dotColor, iconBg, data, isCollapsed, onToggle, zIndex }) => {
  return (
    <div className={`rounded-3xl border ${borderColor} transition-all duration-300 relative`} style={{ zIndex }}>
      {/* Header */}
      <button
        onClick={() => onToggle(id)}
        className={`w-full flex items-center justify-between px-6 py-4 ${bgLight} transition-colors hover:brightness-[0.98] ${isCollapsed ? 'rounded-3xl' : 'rounded-t-3xl'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${iconBg} ${color} flex items-center justify-center`}>
            <Icon size={20} strokeWidth={2} />
          </div>
          <div className="text-left">
            <h3 className={`text-[16px] font-semibold ${color} tracking-tight`}>{title}</h3>
            <p className="text-[12px] text-apple-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[13px] font-bold ${color} px-3 py-1 rounded-full ${bgLight}`}>
            {count} póliza{count !== 1 ? 's' : ''}
          </span>
          {isCollapsed ? <ChevronRight size={18} className="text-apple-400" /> : <ChevronDown size={18} className="text-apple-400" />}
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          {data.length > 0 ? (
            <InsuranceTable data={data} />
          ) : (
            <div className="px-6 py-10 text-center">
              <p className="text-[14px] text-apple-400">No hay pólizas en esta sección.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { policies, clients } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [aseguradoraFilter, setAseguradoraFilter] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({
    'renovaciones': true,
    'nuevos': true,
    'cobranza-mensual': true,
    'cobranza-semestral': true,
    'cobranza-trimestral': true,
    'normales': true
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const years = useMemo(() => {
    const range = [];
    for (let i = 2022; i <= 2030; i++) {
      range.push(i);
    }
    return range;
  }, []);

  const aseguradoras = useMemo(() => {
    const set = new Set(policies.map(p => p.aseguradora).filter(Boolean));
    return Array.from(set).sort();
  }, [policies]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const toggleSection = (key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Clasificación de pólizas ──────────────────────────────────
  const { renovaciones, nuevos, cobranzaMensual, cobranzaSemestral, cobranzaTrimestral, normales } = useMemo(() => {
    const sortedByDate = [...policies].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    
    // Pólizas de renovación creadas en el periodo seleccionado
    const renovaciones = policies.filter(p => {
      if (!p.created_at) return false;
      const created = new Date(p.created_at);
      const isInPeriod = created.getMonth() === selectedMonth && created.getFullYear() === selectedYear;
      if (!isInPeriod) return false;
      
      const cid = p.cliente_id;
      if (!cid) return false;
      const firstPolicy = sortedByDate.find(sp => sp.cliente_id === cid);
      return firstPolicy && firstPolicy.id !== p.id;
    });

    // Pólizas creadas en el periodo seleccionado para clientes nuevos
    const nuevos = policies.filter(p => {
      if (!p.created_at) return false;
      const created = new Date(p.created_at);
      const isInPeriod = created.getMonth() === selectedMonth && created.getFullYear() === selectedYear;
      if (!isInPeriod) return false;
      
      const cid = p.cliente_id;
      if (!cid) return true;
      const firstPolicy = sortedByDate.find(sp => sp.cliente_id === cid);
      return firstPolicy && firstPolicy.id === p.id;
    });

    // Cobranza: pólizas fraccionadas activas
    const cobranzaMensual = policies.filter(p => (p.formaPago || '').toLowerCase() === 'mensual');
    const cobranzaSemestral = policies.filter(p => (p.formaPago || '').toLowerCase() === 'semestral');
    const cobranzaTrimestral = policies.filter(p => (p.formaPago || '').toLowerCase() === 'trimestral');

    // Pólizas "Normales"
    const normales = policies.filter(p => {
      const fp = (p.formaPago || '').toLowerCase();
      const isContadoOrAnual = ['contado', 'anual'].includes(fp);

      if (p.created_at) {
        const created = new Date(p.created_at);
        const isInPeriod = created.getMonth() === selectedMonth && created.getFullYear() === selectedYear;
        
        if (isInPeriod) {
          return isContadoOrAnual;
        } else {
          return true;
        }
      }
      return true;
    });

    return { renovaciones, nuevos, cobranzaMensual, cobranzaSemestral, cobranzaTrimestral, normales };
  }, [policies, selectedMonth, selectedYear]);

  // ── Filtro de búsqueda global ──────────────────────────────────
  const filterPolicies = (list) => {
    let filtered = list;
    if (aseguradoraFilter) {
      filtered = filtered.filter(p => p.aseguradora === aseguradoraFilter);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.contratante?.toLowerCase().includes(q) ||
        p.poliza?.toLowerCase().includes(q) ||
        p.aseguradora?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const filteredRenovaciones = filterPolicies(renovaciones);
  const filteredNuevos = filterPolicies(nuevos);
  const filteredCobranzaMensual = filterPolicies(cobranzaMensual);
  const filteredCobranzaSemestral = filterPolicies(cobranzaSemestral);
  const filteredCobranzaTrimestral = filterPolicies(cobranzaTrimestral);
  const filteredNormales = filterPolicies(normales);

  const selectedMonthName = months[selectedMonth];



  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div>
          <h2 className="text-[32px] font-semibold text-apple-600 tracking-tight leading-none mb-2">Resumen</h2>
          <p className="text-[15px] text-apple-500 font-medium">Panel operativo de {selectedMonthName} {selectedYear}</p>
        </div>

        {/* Month/Year Filter */}
        <div className="flex items-center gap-2 bg-white/40 p-1.5 rounded-2xl border border-white/60 backdrop-blur-md shadow-sm self-start lg:self-auto">
          <div className="relative min-w-[140px]">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full bg-transparent pl-4 pr-10 py-2.5 rounded-xl text-[14px] font-semibold text-apple-600 appearance-none outline-none cursor-pointer hover:bg-white/50 transition-colors"
            >
              {months.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-apple-400 pointer-events-none" />
          </div>
          
          <div className="w-[1px] h-6 bg-border/40 mx-1" />

          <div className="relative min-w-[100px]">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full bg-transparent pl-4 pr-10 py-2.5 rounded-xl text-[14px] font-semibold text-apple-600 appearance-none outline-none cursor-pointer hover:bg-white/50 transition-colors"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-apple-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-4xl">
        <div className="relative w-full flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-apple-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar póliza, cliente, aseguradora..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/60 border border-border/40 rounded-2xl text-[15px] text-apple-600 outline-none transition-all hover:bg-white focus:bg-white focus:border-apple-blue shadow-sm backdrop-blur-md"
          />
        </div>
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Filter size={18} className="text-apple-400" />
          </div>
          <select
            value={aseguradoraFilter}
            onChange={(e) => setAseguradoraFilter(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-white/60 border border-border/40 rounded-2xl text-[14px] text-apple-600 outline-none transition-all hover:bg-white focus:bg-white focus:border-apple-blue shadow-sm backdrop-blur-md appearance-none cursor-pointer"
          >
            <option value="">Todas las aseguradoras</option>
            {aseguradoras.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <ChevronDown size={16} className="text-apple-400" />
          </div>
        </div>
      </div>

      {/* Sección 1: Renovaciones (Azul) */}
      <Section
        id="renovaciones"
        icon={RefreshCw}
        title={`Renovaciones de ${selectedMonthName}`}
        subtitle={`Pólizas de renovación dadas de alta en ${selectedMonthName}`}
        count={filteredRenovaciones.length}
        color="text-blue-600"
        bgLight="bg-blue-50/60"
        borderColor="border-blue-200/60"
        dotColor="bg-blue-500"
        iconBg="bg-blue-100"
        data={filteredRenovaciones}
        isCollapsed={collapsedSections['renovaciones']}
        onToggle={toggleSection}
        zIndex={60}
      />

      {/* Sección 2: Clientes Nuevos (Lila) */}
      <Section
        id="nuevos"
        icon={UserPlus}
        title="Clientes Nuevos"
        subtitle="Pólizas de clientes dados de alta este mes"
        count={filteredNuevos.length}
        color="text-purple-600"
        bgLight="bg-purple-50/60"
        borderColor="border-purple-200/60"
        dotColor="bg-purple-500"
        iconBg="bg-purple-100"
        data={filteredNuevos}
        isCollapsed={collapsedSections['nuevos']}
        onToggle={toggleSection}
        zIndex={50}
      />

      {/* Sección 3: Cobranza Mensual */}
      <Section
        id="cobranza-mensual"
        icon={DollarSign}
        title="Cobranza Mensual"
        subtitle="Pólizas con pagos fraccionados cada mes"
        count={filteredCobranzaMensual.length}
        color="text-emerald-600"
        bgLight="bg-emerald-50/60"
        borderColor="border-emerald-200/60"
        dotColor="bg-emerald-500"
        iconBg="bg-emerald-100"
        data={filteredCobranzaMensual}
        isCollapsed={collapsedSections['cobranza-mensual']}
        onToggle={toggleSection}
        zIndex={40}
      />

      {/* Sección 4: Cobranza Semestral */}
      <Section
        id="cobranza-semestral"
        icon={DollarSign}
        title="Cobranza Semestral"
        subtitle="Pólizas con pagos cada 6 meses"
        count={filteredCobranzaSemestral.length}
        color="text-emerald-600"
        bgLight="bg-emerald-50/60"
        borderColor="border-emerald-200/60"
        dotColor="bg-emerald-500"
        iconBg="bg-emerald-100"
        data={filteredCobranzaSemestral}
        isCollapsed={collapsedSections['cobranza-semestral']}
        onToggle={toggleSection}
        zIndex={30}
      />

      {/* Sección 5: Cobranza Trimestral */}
      <Section
        id="cobranza-trimestral"
        icon={DollarSign}
        title="Cobranza Trimestral"
        subtitle="Pólizas con pagos cada 3 meses"
        count={filteredCobranzaTrimestral.length}
        color="text-emerald-600"
        bgLight="bg-emerald-50/60"
        borderColor="border-emerald-200/60"
        dotColor="bg-emerald-500"
        iconBg="bg-emerald-100"
        data={filteredCobranzaTrimestral}
        isCollapsed={collapsedSections['cobranza-trimestral']}
        onToggle={toggleSection}
        zIndex={20}
      />

      {/* Sección 6: Normales */}
      <Section
        id="normales"
        icon={FileCheck2}
        title="Pólizas Normales"
        subtitle="Cartera de pólizas de meses anteriores"
        count={filteredNormales.length}
        color="text-slate-600"
        bgLight="bg-slate-50/60"
        borderColor="border-slate-200/60"
        dotColor="bg-slate-500"
        iconBg="bg-slate-100"
        data={filteredNormales}
        isCollapsed={collapsedSections['normales']}
        onToggle={toggleSection}
        zIndex={10}
      />
    </div>
  );
}
