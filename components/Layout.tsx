
import React, { useEffect, useState } from 'react';
import { 
  LayoutGrid, ShoppingCart, ClipboardList, LogOut, User as UserIcon, Menu, X, ShieldCheck, Map, Wifi, WifiOff, Key, DownloadCloud
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
}

export const Layout: React.FC<LayoutProps> = ({ children, user, cartCount, onLogout, onChangePassword, syncStatus }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const location = useLocation();
  const isStaff = user.role === 'admin' || user.role === 'logistics' || user.role === 'coordinator';

  // Usuarios que NO pueden ver el catálogo (Solo flujos operativos)
  const isOperationalOnly = user.role === 'logistics' || user.role === 'coordinator';

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
          isActive 
            ? 'bg-white/10 text-brand-400 shadow-lg border border-white/5 scale-[1.02]' 
            : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
        }`}
      >
        <Icon size={16} className={isActive ? 'text-brand-400' : 'text-slate-500'} />
        <span className="font-bold text-[12px] tracking-tight">{label}</span>
        {to === '/cart' && cartCount > 0 && (
          <span className="ml-auto bg-brand-400 text-brand-900 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">{cartCount}</span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans selection:bg-brand-400 selection:text-brand-900">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#000033] border-b border-white/5 p-4 flex justify-between items-center sticky top-0 z-50 shadow-xl">
        <div className="flex items-center h-7">
          <img src={LOGO_URL} alt="ABSOLUTE" className="h-full w-auto opacity-90" />
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#000033] shadow-[10px_0_30px_-15px_rgba(0,0,51,0.5)] transform transition-transform duration-500 ease-in-out md:translate-x-0 md:static md:h-screen flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Logo Section - Extra Compact */}
        <div className="p-4 border-b border-white/5 flex flex-col items-center">
          <Link to="/" className="w-full max-w-[100px] mb-3 transform hover:scale-105 transition-transform">
            <img src={LOGO_URL} alt="ABSOLUTE Logo" className="w-full h-auto brightness-110 contrast-125" />
          </Link>
          
          <div className="w-full space-y-1.5">
             <div className={`flex items-center justify-center px-3 py-1.5 rounded-lg transition-colors ${syncStatus?.isOnline ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                {syncStatus?.isOnline ? (
                  <>
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">En Línea</p>
                  </>
                ) : (
                  <>
                    <WifiOff size={10} className="text-red-400 mr-2" />
                    <p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Desconectado</p>
                  </>
                )}
             </div>
             
             <button 
                onClick={() => setIsInstallModalOpen(true)}
                className="w-full flex items-center justify-center space-x-2 bg-white/5 text-slate-300 py-2 rounded-lg border border-white/5 hover:bg-white/10 hover:text-white transition-all group"
             >
                <DownloadCloud size={12} className="group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-black uppercase tracking-widest">Instalar App</span>
             </button>
          </div>
        </div>

        {/* Navigation - Very compact */}
        <div className="p-4 space-y-0.5 flex-1 overflow-y-auto no-scrollbar">
          <div className="mb-4">
             <p className="px-4 text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Principal</p>
             {!isOperationalOnly && <NavItem to="/" icon={LayoutGrid} label="Catálogo" />}
             {!isOperationalOnly && <NavItem to="/cart" icon={ShoppingCart} label="Configurar Pedido" />}
             <NavItem to="/orders" icon={ClipboardList} label={isStaff ? "Listado Maestro" : "Mis Reservas"} />
          </div>
          
          <div className="pt-2 border-t border-white/5">
             <p className="px-4 text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 mt-2">Operaciones</p>
             {isStaff && (
                <>
                  <NavItem to="/admin" icon={ShieldCheck} label={user.role === 'admin' ? "Panel de Control" : "Flujo Operativo"} />
                  <NavItem to="/logistics-map" icon={Map} label="Logística Nacional" />
                </>
             )}
          </div>
        </div>

        {/* User / Logout Section */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="relative group mb-3">
            <div className="flex items-center space-x-2.5 p-2.5 bg-white/5 rounded-xl border border-white/5 overflow-hidden group-hover:border-white/20 transition-all">
              <div className="w-8 h-8 rounded-lg bg-brand-400/20 flex items-center justify-center text-brand-400 shrink-0">
                <UserIcon size={16} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-white truncate leading-tight">{user.name}</p>
                <p className="text-[8px] font-black text-brand-400 uppercase tracking-widest mt-0.5 opacity-70">{user.role}</p>
              </div>
              <button 
                onClick={onChangePassword}
                className="p-1 hover:bg-white/10 rounded-lg text-white/30 hover:text-white transition-all"
                title="Seguridad"
              >
                <Key size={12} />
              </button>
            </div>
          </div>
          
          <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 bg-red-500/10 border border-red-500/20 text-red-400 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all group">
            <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-60px)] md:h-screen flex flex-col bg-slate-50/50 relative">
        <div className="p-4 md:p-8 flex-1">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
        <Footer />
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-brand-900/80 backdrop-blur-sm z-[45] md:hidden animate-in fade-in duration-300" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}
      
      <InstallModal 
        isOpen={isInstallModalOpen} 
        onClose={() => setIsInstallModalOpen(false)} 
        deferredPrompt={deferredPrompt} 
      />

      {/* Floating Action Button for Mobile */}
      {!isOperationalOnly && (
        <Link 
          to="/cart" 
          className="md:hidden fixed bottom-6 right-6 z-[60] bg-brand-900 text-white w-12 h-12 rounded-2xl shadow-[0_15px_40px_rgba(0,0,51,0.4)] flex items-center justify-center border border-white/10 animate-in zoom-in duration-500 active:scale-90 transition-transform"
        >
          <div className="relative">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 bg-brand-400 text-brand-900 text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-brand-900 shadow-sm">
                {cartCount}
              </span>
            )}
          </div>
        </Link>
      )}
    </div>
  );
};
