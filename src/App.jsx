import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';

import AddPolicy from './pages/AddPolicy';
import Stats from './pages/Stats';
import Expirations from './pages/Expirations';
import Cartera from './pages/Cartera';
import DashboardLayout from './components/layout/DashboardLayout';
import { useAuth } from './lib/auth';
import { DataProvider } from './context/DataContext';

export default function App() {
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-apple-100 text-apple-500">Cargando...</div>;
  }

  if (!user) {
    return <Auth onLogin={loginWithGoogle} />;
  }

  const admins = ['jmu665@gmail.com', 'geli.urias20@gmail.com', 'jmu664@gmail.com', 'angelicauriasseguros@gmail.com'];
  if (user && !admins.includes(user.email)) {
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
