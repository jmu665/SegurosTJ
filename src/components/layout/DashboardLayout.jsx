import { useState } from 'react';
import { LogOut, LayoutGrid, UserCircle, Search, FilePlus, BarChart3, CalendarClock, Menu, X, Wallet } from 'lucide-react';

export default function DashboardLayout({ children, currentView, setView, onLogout, user }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutGrid },
    { id: 'add', label: 'Nueva Póliza', icon: FilePlus },
    { id: 'expirations', label: 'Vencimientos', icon: CalendarClock },
    { id: 'cartera', label: 'Cartera', icon: Wallet },
    { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  ];

  const handleNavClick = (id) => {
    setView(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-apple-100 relative">
      
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-[100] !bg-white border-b border-border p-4 shadow-sm !opacity-100">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2 text-apple-600 font-semibold text-[17px] tracking-tight flex-shrink-0">
            <LayoutGrid size={22} className="text-apple-blue" strokeWidth={2.5} />
            <span className="hidden xl:inline">Administrador</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center justify-center flex-1 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-[13px] lg:text-[14px] transition-all focus-ring ${
                    isActive 
                      ? 'bg-apple-blue text-white shadow-md' 
                      : 'text-apple-500 hover:bg-apple-200/50 hover:text-apple-600'
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                  <span className={item.id === 'stats' ? 'hidden lg:inline' : ''}>{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          <div className="hidden md:flex items-center gap-3 ml-2 pl-4 border-l border-border flex-shrink-0">
            <div className="flex items-center gap-2 text-[13px] lg:text-[14px] text-apple-500">
              {(user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ? (
                <img src={user.user_metadata.avatar_url || user.user_metadata.picture} alt="Avatar" className="w-7 h-7 rounded-full" />
              ) : (
                <UserCircle size={22} strokeWidth={1.5} />
              )}
              <span className="font-medium truncate max-w-[80px] lg:max-w-none">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Operador'}</span>
            </div>
            
            <button 
              onClick={onLogout}
              className="p-2 text-apple-500 hover:text-error transition-colors rounded-xl hover:bg-error-bg/50"
              title="Salir"
            >
              <LogOut size={18} strokeWidth={1.5} />
            </button>
          </div>

          {/* Mobile menu toggle button */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-apple-500 hover:text-apple-600 hover:bg-apple-200/50 rounded-xl transition-colors focus-ring"
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <aside className={`
        fixed top-0 right-0 h-[100dvh] w-64
        !bg-white border-l border-border p-6 flex flex-col 
        z-50 transform transition-transform duration-300 ease-in-out md:hidden
        !opacity-100 shadow-2xl
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex items-center justify-between text-apple-600 font-semibold text-[17px] tracking-tight mb-8 mt-2">
          <span className="text-apple-500 text-sm uppercase tracking-wider font-bold">Menú</span>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 -mr-2 text-apple-500 hover:text-apple-600 hover:bg-apple-200/50 rounded-xl transition-colors focus-ring"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 -mr-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-[15px] transition-all focus-ring w-full ${
                  isActive 
                    ? 'bg-apple-blue text-white shadow-md' 
                    : 'text-apple-500 hover:bg-apple-200/50 hover:text-apple-600'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-border flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[14px] text-apple-500 min-w-0">
            {(user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ? (
              <img src={user.user_metadata.avatar_url || user.user_metadata.picture} alt="Avatar" className="w-8 h-8 rounded-full flex-shrink-0" />
            ) : (
              <UserCircle size={28} strokeWidth={1.5} className="flex-shrink-0" />
            )}
            <span className="truncate font-medium">{user?.user_metadata?.full_name || user?.email || 'Operador'}</span>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2 text-apple-500 hover:text-error focus-ring text-[14px] font-medium transition-colors rounded-xl hover:bg-error-bg/50 w-full"
          >
            <LogOut size={18} strokeWidth={1.5} />
            Salir
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-6 sm:py-10 relative overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
