import { ShieldCheck, ChevronRight } from 'lucide-react';

export default function Auth({ onLogin }) {
  const handleLogin = async () => {
    try {
      await onLogin();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 relative overflow-hidden bg-apple-100">
      {/* Luz ambiente central */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-300/30 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Panel Izquierdo - Login */}
      <div className="flex flex-col justify-center items-center p-8 md:p-16 relative z-10 w-full">
        {/* Decorative Brand Top */}
        <div className="absolute top-8 left-8 flex items-center gap-2 text-apple-500 font-semibold text-[15px] tracking-tight">
          <ShieldCheck size={20} className="text-apple-blue" strokeWidth={2} />
          SEGUROS ADMINISTRADOR
        </div>
        
        <div className="w-full max-w-sm apple-card p-10 relative flex flex-col pt-12">
          
          <h1 className="text-[26px] font-semibold text-apple-600 mb-2 tracking-tight">
            Acceso Autorizado
          </h1>
          <p className="text-[14px] text-apple-500 mb-10 leading-relaxed">
            Ingresa utilizando tu ID Corporativo mediante Single Sign-On (SSO).
          </p>

          <button
            onClick={handleLogin}
            className="w-full apple-button h-12 rounded-full flex items-center justify-center gap-3 focus-ring text-[15px]"
          >
            {/* Google SVG Logo */}
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" fillRule="evenodd">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </g>
            </svg>
            <span>Continuar con Google</span>
          </button>
          
          <div className="mt-8 pt-6 border-t border-border/30 text-center text-[12px] text-apple-400">
            Apple Data Protection Policies aplicadas localmente. <br/>
            Cifrado de extremo a extremo.
          </div>

          {/* User Credit */}
          <a 
            href="https://agendaapp360.com/marketing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-6 flex flex-col items-center opacity-40 hover:opacity-100 transition-opacity duration-500 group no-underline"
          >
            <span className="text-[10px] uppercase tracking-[3px] text-apple-400 mb-1 group-hover:text-apple-blue transition-colors font-medium">Powered by design</span>
          </a>
        </div>
      </div>
      
      {/* Panel Derecho - Apple Promo Style */}
      <div className="hidden md:flex flex-col justify-center bg-black/5 backdrop-blur-[60px] border-l border-white/20 p-16 relative overflow-hidden z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/20 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative">
          <h2 className="text-[44px] font-semibold text-apple-600 mb-4 tracking-tighter leading-tight">
            El poder de procesar pólizas, <br/><span className="text-apple-blue">ahora automatizado.</span>
          </h2>
          <p className="text-[19px] text-apple-500 max-w-md font-medium tracking-tight">
            Agrega documentos sin esfuerzo y extrae registros clave instantáneamente combinando IA y OCR nativo.
          </p>
        </div>
      </div>
    </div>
  );
}
