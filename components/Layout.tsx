
import React from 'react';
import { 
  LayoutGrid, 
  ShoppingCart, 
  ClipboardList, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  ShieldCheck,
  Map,
  Phone
} from 'lucide-react';
import { User } from '../types';
import { Link, useLocation } from 'react-router-dom';
import { LOGO_URL } from '../constants';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  cartCount: number;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, cartCount, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  const isStaff = user.role === 'admin' || user.role === 'logistics' || user.role === 'coordinator';

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
          isActive 
            ? 'bg-[#000033] text-white shadow-[0_10px_30px_-5px_rgba(0,0,51,0.4)] scale-[1.02]' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-brand-900 hover:translate-x-1'
        }`}
      >
        <Icon size={20} className={isActive ? 'text-brand-400' : ''} />
        <span className="font-extrabold text-sm tracking-tight">{label}</span>
        {to === '/cart' && cartCount > 0 && (
          <span className="ml-auto bg-brand-400 text-brand-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
            {cartCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col md:flex-row font-sans selection:bg-brand-400">
      {/* Mobile Header with brand color */}
      <div className="md:hidden bg-[#000033] border-b border-white/5 p-4 flex justify-between items-center sticky top-0 z-50 shadow-xl">
        <div className="flex items-center h-9">
          <img src={LOGO_URL} alt="ABSOLUTE" className="h-full w-auto object-contain rounded-lg" />
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2 active:scale-90 transition-transform">
          {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200 shadow-[20px_0_50px_-10px_rgba(0,0,0,0.05)] transform transition-transform duration-500 ease-in-out md:translate-x-0 md:static md:h-screen flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-10 border-b border-slate-50 flex flex-col items-center bg-gradient-to-b from-slate-50/50 to-transparent">
          <Link to="/" className="w-full max-w-[210px] mb-6 transform hover:scale-105 transition-transform duration-300 rounded-2xl overflow-hidden">
            <img src={LOGO_URL} alt="ABSOLUTE Logo" className="w-full h-auto object-contain drop-shadow-sm" />
          </Link>
          <div className="w-full">
             <div className="flex items-center justify-center px-4 py-2 bg-slate-900 rounded-2xl shadow-inner">
                <div className="w-2 h-2 bg-brand-400 rounded-full mr-3 animate-pulse"></div>
                <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Gestión Inteligente</p>
             </div>
          </div>
        </div>

        <div className="p-6 space-y-2 flex-1 overflow-y-auto no-scrollbar">
          <div className="mb-4">
             <p className="px-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4">Principal</p>
             {user.role !== 'logistics' && user.role !== 'coordinator' && <NavItem to="/" icon={LayoutGrid} label="Catálogo Global" />}
             {user.role !== 'logistics' && user.role !== 'coordinator' && <NavItem to="/cart" icon={ShoppingCart} label="Configurar Pedido" />}
             <NavItem to="/orders" icon={ClipboardList} label={isStaff ? "Listado Maestro" : "Mis Reservas"} />
          </div>
          
          <div className="pt-4">
             <p className="px-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4">Operaciones</p>
             {isStaff && (
                <>
                  <NavItem to="/admin" icon={ShieldCheck} label={user.role === 'admin' ? "Panel de Control" : "Flujo Operativo"} />
                  <NavItem to="/logistics-map" icon={Map} label="Logística Nacional" />
                </>
             )}
          </div>
        </div>

        <div className="p-8 border-t border-slate-50 bg-slate-50/30">
          <div className="flex items-center space-x-4 mb-6 p-4 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-[#000033] flex-shrink-0 flex items-center justify-center text-brand-400 shadow-[0_5px_15px_-5px_rgba(0,0,51,0.5)]">
              <UserIcon size={24} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900 truncate leading-tight">
                {user.name} 
                <span className="text-slate-400 font-bold ml-1">({user.phone || 'N/A'})</span>
              </p>
              <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mt-1 flex items-center">
                <ShieldCheck size={10} className="mr-1" /> {user.role}
              </p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-slate-200 text-slate-500 py-4 rounded-[1.25rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-300 active:scale-[0.97] group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Desconectar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen flex flex-col bg-slate-50/80">
        <div className="p-6 md:p-12 flex-1">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
        <Footer />
      </main>

      {/* Modern Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-brand-900/60 backdrop-blur-md z-[45] md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
