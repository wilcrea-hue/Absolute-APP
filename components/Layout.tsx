
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
  Map
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

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
          isActive 
            ? 'bg-brand-900 text-white' 
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
        {to === '/cart' && cartCount > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {cartCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="Logo" className="h-8 w-auto object-contain" />
          <span className="font-bold text-xl text-brand-900">ABSOLUTE</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-white border-r shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-2">
            <img src={LOGO_URL} alt="Logo" className="h-10 w-auto object-contain" />
            <h1 className="text-2xl font-black text-brand-900 tracking-tighter">ABSOLUTE</h1>
          </div>
          <p className="text-xs text-gray-500">Inventario & Eventos</p>
        </div>

        <div className="p-4 space-y-2">
          {user.role !== 'logistics' && <NavItem to="/" icon={LayoutGrid} label="Catálogo" />}
          {user.role !== 'logistics' && <NavItem to="/cart" icon={ShoppingCart} label="Reservar / Pedido" />}
          {user.role !== 'logistics' && <NavItem to="/orders" icon={ClipboardList} label="Mis Pedidos" />}
          
          {(user.role === 'admin' || user.role === 'logistics') && (
             <>
               <NavItem to="/admin" icon={ShieldCheck} label={user.role === 'admin' ? "Administrador" : "Gestión Logística"} />
               <NavItem to="/logistics-map" icon={Map} label="Logística de Rutas" />
             </>
          )}
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t bg-gray-50">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-900">
              <UserIcon size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
              <p className="text-xs font-bold text-brand-500 uppercase mt-0.5">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 text-gray-700 py-2 rounded hover:bg-gray-50 transition"
          >
            <LogOut size={16} />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen flex flex-col">
        <div className="p-4 md:p-8 flex-1">
          {children}
        </div>
        <Footer />
      </main>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
