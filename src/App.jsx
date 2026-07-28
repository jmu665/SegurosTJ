import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import AddPolicy from './pages/AddPolicy';
import Stats from './pages/Stats';
import Expirations from './pages/Expirations';
import Cartera from './pages/Cartera';
import DashboardLayout from './components/layout/DashboardLayout';
import { useAuth } from './lib/auth';
import { DataProvider } from './context/DataContext';
import { supabase } from './lib/supabase';

const DEFAULT_ADMINS = [
  'jmu665@gmail.com',
  'geli.urias20@gmail.com',
  'jmu664@gmail.com',
  'angelicauriasseguros@gmail.com',
  'uriasma64@gmail.com'
];

export default function App() {
  const { user: realUser, loading: realLoading, loginWithGoogle, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [allowedEmails, setAllowedEmails] = useState(DEFAULT_ADMINS);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Hardcode auth para desarrollo local (npm run dev)
  const isDev = import.meta.env.DEV;
  const user = isDev ? { email: 'jmu665@gmail.com', name: 'Desarrollador Local' } : realUser;
  const loading = isDev ? false : realLoading;

  useEffect(() => {
    async function loadAllowedEmails() {
      try {
        const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://mock.supabase.co';
        if (!isConfigured) {
          setLoadingAdmins(false);
          return;
        }

        const { data, error } = await supabase
          .from('usuarios_autorizados')
          .select('correo');

        if (!error && data && data.length > 0) {
          const dbEmails = data.map(item => item.correo.toLowerCase());
          const combined = Array.from(new Set([...DEFAULT_ADMINS, ...dbEmails]));
          setAllowedEmails(combined);
        }
      } catch (e) {
        console.error('Error cargando usuarios autorizados desde DB:', e);
      } finally {
        setLoadingAdmins(false);
      }
    }

    if (user) {
      loadAllowedEmails();
    } else {
      setLoadingAdmins(false);
    }
  }, [user]);

  if (loading || (user && loadingAdmins)) {
    return <div className="h-screen w-full flex items-center justify-center bg-apple-100 text-apple-500">Cargando...</div>;
  }

  if (!user) {
    return <Auth onLogin={loginWithGoogle} />;
  }

  if (user && !allowedEmails.includes(user.email?.toLowerCase())) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FBFBFD] px-6 text-center animate-in fade-in">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-[32px] font-semibold text-apple-600 tracking-tight leading-none mb-3">Acceso Denegado</h2>
        <p className="text-[15px] text-apple-500 mb-8 max-w-sm">
          La cuenta <b>{user.email}</b> no tiene permisos administrativos para acceder a este sistema.
        </p>
        <button onClick={logout} className="px-8 py-3 bg-apple-600 text-white rounded-full font-medium hover:bg-apple-600/90 transition-colors focus-ring">
          Cerrar Sesión e intentar con otra cuenta
        </button>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'add': return <AddPolicy onComplete={() => setCurrentView('dashboard')} />;
      case 'stats': return <Stats />;
      case 'expirations': return <Expirations />;
      case 'cartera': return <Cartera />;
      default: return <Dashboard />;
    }
  };

  return (
    <DataProvider>
      <DashboardLayout currentView={currentView} setView={setCurrentView} onLogout={logout} user={user}>
        {renderView()}
      </DashboardLayout>
    </DataProvider>
  );
}
