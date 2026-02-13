
import React, { useEffect, useState } from 'react';
import { 
  LayoutGrid, ShoppingCart, ClipboardList, LogOut, User as UserIcon, ShieldCheck, Map, WifiOff, Key, DownloadCloud, CheckCircle
} from 'lucide-react';
import { User } from '../types';
import { Link, useLocation } from 'react-router-dom';
import { LOGO_URL } from '../constants';
import { Footer } from './Footer';
import { InstallModal } from './InstallModal';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  cartCount: number;
  onLogout: () => void;
  onChangePassword?: () => void;
  syncStatus?: { isOnline: boolean; lastSync: Date };
  deferredPrompt: any;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, cartCount, onLogout, onChangePassword, syncStatus, deferredPrompt }) => {
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const location = useLocation();
  const isStaff = user.role === 'admin' || user.role === 'logistics' || user.role === 'coordinator';
  const isOperationalOnly = user.role === 'logistics' || user.role === 'coordinator';

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }
  }, []);

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center justify-center md:justify-start space-x-0 md:space-x-3 px-2 md:px-4 py-3 rounded-xl transition-all duration-300 ${
          isActive 
            ? 'bg-white/10 text-brand-400 shadow-lg border border-white/5 scale-[1.05] md:scale-[1.02]' 
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`}
        title={label}
      >
        <Icon size={20} className={isActive ? 'text-brand-400' : 'text-slate-500'} />
        <span className="hidden md:block font-bold text-[12px] tracking-tight">{label}</span>
        {to === '/cart' && cartCount > 0 && (
          <span className="absolute md:static top-2 right-2 bg-brand-400 text-brand-900 text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
            {cartCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans selection:bg-brand-400 selection:text-brand-900">
      
      {/* Sidebar - Ahora permanente en todas las pantallas */}
      <aside className="w-16 md:w-64 bg-[#000033] shadow-[10px_0_30px_-15px_rgba(0,0,51,0.5)] flex flex-col sticky top-0 h-screen z-50 transition-all duration-300">
        
        {/* Logo Section */}
        <div className="p-2 md:p-4 border-b border-white/5 flex flex-col items-center">
          <Link to="/" className="w-full max-w-[40px] md:max-w-[100px] mb-4 transform hover:scale-110 transition-transform">
            <img src={LOGO_URL} alt="ABSOLUTE" className="w-full h-auto brightness-110 contrast-125" />
          </Link>
          
          <div className="w-full space-y-2 hidden md:block">
             <div className={`flex items-center justify-center px-3 py-1.5 rounded-lg transition-colors ${syncStatus?.isOnline ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                {syncStatus?.isOnline ? (
                  <><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2 animate-pulse"></div><p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">En Línea</p></>
                ) : (
                  <><WifiOff size={10} className="text-red-400 mr-2" /><p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Desconectado</p></>
                )}
             </div>
             
             {!isStandalone && (
               <button 
                  onClick={() => setIsInstallModalOpen(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-brand-400 text-brand-900 py-2 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-white transition-all shadow-lg"
               >
                  <DownloadCloud size={12} />
                  <span>Instalar</span>
               </button>
             )}
          </div>
        </div>

        {/* Navigation */}
        <div className="p-2 md:p-4 space-y-1 flex-1 overflow-y-auto no-scrollbar">
          <div className="mb-6">
             <p className="hidden md:block px-4 text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Menú</p>
             {!isOperationalOnly && <NavItem to="/" icon={LayoutGrid} label="Catálogo" />}
             {!isOperationalOnly && <NavItem to="/cart" icon={ShoppingCart} label="Configurar" />}
             <NavItem to="/orders" icon={ClipboardList} label={isStaff ? "Listado" : "Mis Reservas"} />
          </div>
          
          {isStaff && (
            <div className="pt-4 border-t border-white/5">
               <p className="hidden md:block px-4 text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Gestión</p>
               <NavItem to="/admin" icon={ShieldCheck} label="Panel" />
               <NavItem to="/logistics-map" icon={Map} label="Mapa" />
            </div>
          )}
        </div>

        {/* User / Logout */}
        <div className="p-2 md:p-4 border-t border-white/5 bg-black/20">
          <div className="flex flex-col items-center space-y-4">
            <button 
              onClick={onChangePassword}
              className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl md:hidden"
              title="Cambiar Contraseña"
            >
              <Key size={18} />
            </button>
            
            <div className="hidden md:block w-full">
              <div className="flex items-center space-x-2.5 p-2.5 bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-brand-400/20 flex items-center justify-center text-brand-400 shrink-0"><UserIcon size={16} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-white truncate">{user.name}</p>
                  <p className="text-[8px] font-black text-brand-400 uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
            </div>

            <button onClick={onLogout} className="w-full flex items-center justify-center space-x-0 md:space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 py-3 md:py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
              <LogOut size={16} />
              <span className="hidden md:block">Salir</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen flex flex-col bg-slate-50/50 relative">
        <div className="p-4 md:p-8 flex-1">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
        <Footer />
      </main>
      
      <InstallModal 
        isOpen={isInstallModalOpen} 
        onClose={() => setIsInstallModalOpen(false)} 
        deferredPrompt={deferredPrompt} 
      />
    </div>
  );
};
