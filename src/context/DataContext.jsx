import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Utilidades para limpiar datos extraídos antes de enviarlos a PgSQL
const parseDateToPg = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.includes('No detectado')) return null;
  const parts = dateStr.split(/[\/\-\s]+/);
  if (parts.length === 3) {
    let [d, m, y] = parts;
    d = d.trim(); m = m.trim().toLowerCase(); y = y.trim();
    
    const monthMap = {
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };
    if (isNaN(m)) m = monthMap[m.substring(0,3)] || m;

    if (d.length <= 2 && y.length === 4) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (d.length === 4 && y.length <= 2) return `${d}-${m.padStart(2, '0')}-${y.padStart(2, '0')}`;
  }
  return null;
};

const parseCurrency = (currencyStr) => {
  if (!currencyStr || typeof currencyStr !== 'string') return null;
  const cleaned = currencyStr.replace(/[^\d\.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [policies, setPolicies] = useState([]);
  const [clients, setClients] = useState([]);

  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'ACA_TU_URL_DE_SUPABASE';

  const refreshClients = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: cData, error: cErr } = await supabase
        .from('cliente')
        .select('*')
        .order('id', { ascending: false }); 
        
      if (cErr) {
        console.error('Error cargando clientes de Supabase:', cErr);
        // Si hay error, mejor vaciamos para no mostrar basura de cache
        setClients([]); 
        return;
      }
      
      // Si cData es [] o null, actualizamos el estado con eso
      setClients(cData || []);
    } catch (e) {
      console.error('Error crítico en refreshClients:', e);
      setClients([]);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadData = async () => {
      const { data: pData, error: pErr } = await supabase
        .from('poliza')
        .select(`
          *,
          cliente:cliente_id(id, nombre, correo, telefono, celular, rfc, direccion),
          vehiculo:vehiculo_id(id, marca, modelo, tipo_vehiculo, version, serie, servicio, puertas, paquete, fronterizo_modelo)
        `)
        .order('id', { ascending: false });

      if (pErr) console.error('Error cargando pólizas:', pErr);
      if (pData) {
        setPolicies(pData.map(p => ({
          ...p,
          poliza: p.numero_poliza,
          formaPago: p.forma_pago,
          primaNeta: p.prima_neta,
          primaTotal: p.prima_total,
          contratante: p.cliente?.nombre || 'Desconocido',
          vehiculoInfo: p.vehiculo ? `${p.vehiculo.marca} ${p.vehiculo.modelo}` : ''
        })));
      }

      await refreshClients();
    };

    loadData();
  }, [isSupabaseConfigured]);

  const parseCurrency = (val) => {
    const num = parseFloat(String(val).replace(/[$,]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const parseDateToPg = (dateStr) => {
    if (!dateStr || dateStr === 'No detectado') return null;
    const parts = String(dateStr).split(/[\/\-\s]+/);
    if (parts.length === 3) {
      let [d, m, y] = parts;
      d = d.trim(); m = m.trim().toLowerCase(); y = y.trim();
      
      const monthMap = {
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
      };
      if (isNaN(m)) m = monthMap[m.substring(0,3)] || m;

      if (y.length === 4) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Si la fecha ya viene como YYYY-MM-DD (ej: "2025-08-11"), pásala. Si no, anúlala (null) para no tronar la base de datos DATE
    if (String(dateStr).match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    return null; 
  };

  // Flujo: 1) Crear vehículo → 2) Crear póliza con vehiculo_id
  const addPolicy = async (policy, vehicleData) => {
    if (isSupabaseConfigured) {
      // 1. Insertar vehículo (nombre de tabla sin acento 'vehiculos')
      const { data: vData, error: vErr } = await supabase.from('vehiculos').insert([{
        marca: vehicleData.marca,
        modelo: vehicleData.modelo,
        tipo_vehiculo: vehicleData.tipo_vehiculo || 'Auto',
        version: vehicleData.version,
        serie: vehicleData.serie,
        servicio: vehicleData.servicio,
        puertas: vehicleData.puertas,
        paquete: vehicleData.paquete,
        fronterizo_modelo: vehicleData.fronterizo_modelo
      }]).select();

      if (vErr) { console.error('Error vehículo:', vErr); throw vErr; }

      // 2. Insertar póliza con vehiculo_id y nuevos campos (agente, tarifa)
      const { data, error } = await supabase.from('poliza').insert([{
        cliente_id: policy.cliente_id,
        vehiculo_id: vData[0].id,
        aseguradora: policy.aseguradora,
        numero_poliza: policy.poliza,
        inicio: parseDateToPg(policy.inicio),
        fin: parseDateToPg(policy.fin),
        forma_pago: policy.formaPago,
        prima_neta: parseCurrency(policy.primaNeta),
        prima_total: parseCurrency(policy.primaTotal),
        estado: policy.estado,
        agente: policy.agente,
        conducto: policy.conducto,
        tarifa: policy.tarifa
      }]).select();

      if (error) { console.error('Error póliza:', error); throw error; }
      if (data) {
        const cd = policy._clienteData || {};
        setPolicies(prev => [{
          ...data[0],
          poliza: data[0].numero_poliza,
          formaPago: data[0].forma_pago,
          primaNeta: data[0].prima_neta,
          primaTotal: data[0].prima_total,
          tarifa: data[0].tarifa,
          conducto: data[0].conducto,
          contratante: policy.contratante,
          vehiculoInfo: `${vehicleData.marca} ${vehicleData.modelo}`,
          cliente: {
            nombre: policy.contratante,
            rfc: cd.rfc || '',
            telefono: cd.telefono || '',
            celular: cd.telefono || '',
            direccion: cd.direccion || ''
          },
          vehiculo: vData[0]
        }, ...prev]);
      }
    } else {
      setPolicies(prev => [{ id: Date.now(), ...policy }, ...prev]);
    }
  };

  const deletePolicy = async (id) => {
    if (isSupabaseConfigured) {
      // 1. Obtener los IDs relacionados antes de borrar la póliza
      const { data: pol } = await supabase.from('poliza').select('cliente_id, vehiculo_id').eq('id', id).single();
      
      // 2. Eliminar póliza
      await supabase.from('poliza').delete().match({ id });

      if (pol) {
        // 3. Eliminar vehículo asociado (se creó específicamente para esta póliza)
        if (pol.vehiculo_id) {
          await supabase.from('vehiculos').delete().match({ id: pol.vehiculo_id });
        }
        
        // 4. Eliminar cliente sólo si no tiene otras pólizas activas
        if (pol.cliente_id) {
          const { count } = await supabase.from('poliza').select('*', { count: 'exact', head: true }).eq('cliente_id', pol.cliente_id);
          if (count === 0) {
            await supabase.from('cliente').delete().match({ id: pol.cliente_id });
            setClients(prev => prev.filter(c => c.id !== pol.cliente_id));
          }
        }
      }
    }
    setPolicies(prev => prev.filter(p => p.id !== id));
  };

  const addClient = async (client) => {
    if (isSupabaseConfigured) {
      const { telefono, celular, rfc, direccion, ...rest } = client;
      const { data, error } = await supabase.from('cliente').insert([{
        ...rest,
        telefono: telefono || celular || '',
        celular: celular || telefono || '',
        rfc: rfc || '',
        direccion: direccion || ''
      }]).select();

      if (error) { console.error('Error cliente:', error); throw error; }
      if (data) {
        setClients(prev => [data[0], ...prev]);
        return data[0];
      }
    } else {
      const newClient = { id: Date.now(), ...client };
      setClients(prev => [newClient, ...prev]);
      return newClient;
    }
  };

  const updatePolicy = async (id, updatedData) => {
    if (isSupabaseConfigured) {
      const { cliente, vehiculo, ...rawPolizaData } = updatedData;
      
      const { data: pol } = await supabase.from('poliza').select('cliente_id, vehiculo_id').eq('id', id).single();
      
      // Solo enviar columnas válidas de la tabla poliza
      const validPolizaCols = ['aseguradora', 'numero_poliza', 'inicio', 'fin', 'forma_pago', 'prima_neta', 'prima_total', 'estado', 'agente', 'conducto', 'tarifa'];
      const polizaUpdate = {};
      for (const key of validPolizaCols) {
        if (rawPolizaData[key] !== undefined && rawPolizaData[key] !== null) {
          polizaUpdate[key] = rawPolizaData[key];
        }
      }
      
      // Limpiar prima_neta y prima_total a número
      if (polizaUpdate.prima_neta) polizaUpdate.prima_neta = parseFloat(String(polizaUpdate.prima_neta).replace(/[$,]/g, '')) || 0;
      if (polizaUpdate.prima_total) polizaUpdate.prima_total = parseFloat(String(polizaUpdate.prima_total).replace(/[$,]/g, '')) || 0;
      
      // Asegurar que inicio/fin sean formato YYYY-MM-DD
      if (polizaUpdate.inicio && !String(polizaUpdate.inicio).match(/^\d{4}-\d{2}-\d{2}$/)) {
        polizaUpdate.inicio = parseDateToPg(polizaUpdate.inicio) || polizaUpdate.inicio;
      }
      if (polizaUpdate.fin && !String(polizaUpdate.fin).match(/^\d{4}-\d{2}-\d{2}$/)) {
        polizaUpdate.fin = parseDateToPg(polizaUpdate.fin) || polizaUpdate.fin;
      }

      if (Object.keys(polizaUpdate).length > 0) {
        const { error: pErr } = await supabase.from('poliza').update(polizaUpdate).eq('id', id);
        if (pErr) console.error('Error actualizando póliza:', pErr);
      }
      
      if (cliente && pol?.cliente_id) {
        const { error: cErr } = await supabase.from('cliente').update(cliente).eq('id', pol.cliente_id);
        if (cErr) console.error('Error actualizando cliente:', cErr);
      }
      
      if (vehiculo && pol?.vehiculo_id) {
        const { error: vErr } = await supabase.from('vehiculos').update(vehiculo).eq('id', pol.vehiculo_id);
        if (vErr) console.error('Error actualizando vehículo:', vErr);
      }
      
      setPolicies(prev => prev.map(p => {
        if (p.id === id) {
           return {
             ...p,
             ...polizaUpdate,
             cliente: { ...p.cliente, ...cliente },
             vehiculo: { ...p.vehiculo, ...vehiculo },
             poliza: polizaUpdate.numero_poliza || p.poliza,
             formaPago: polizaUpdate.forma_pago || p.formaPago,
             primaNeta: polizaUpdate.prima_neta || p.primaNeta,
             primaTotal: polizaUpdate.prima_total || p.primaTotal,
             conducto: polizaUpdate.conducto !== undefined ? polizaUpdate.conducto : p.conducto,
             contratante: cliente?.nombre || p.contratante,
           };
        }
        return p;
      }));
      refreshClients();
    }
  };

  return (
    <DataContext.Provider value={{ policies, setPolicies, addPolicy, deletePolicy, updatePolicy, clients, addClient, refreshClients }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
