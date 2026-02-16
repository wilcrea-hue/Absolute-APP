
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, Product, CartItem, Order, OrderStatus, WorkflowStageKey, StageData, OrderType } from './types';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Catalog } from './Catalog';
import { Cart } from './Cart';
import { Tracking } from './components/Tracking';
import { AdminDashboard } from './AdminDashboard';
import { ServiceMap } from './components/ServiceMap';
import { PRODUCTS, LOGO_URL } from './constants';
import { GoogleGenAI } from "@google/genai";
// Fixed: Added missing 'Package' import from lucide-react
import { CheckCircle, Eye, UserCheck, AlertCircle, CloudSync, RefreshCw, Package } from 'lucide-react';
import { ChangePasswordModal } from './components/ChangePasswordModal';

const API_URL = './api/sync.php'; 
const ADMIN_EMAIL = 'admin@absolutecompany.co';

const DEFAULT_USERS: User[] = [
  { email: ADMIN_EMAIL, password: 'absolute2024', name: 'Administrador Principal', role: 'admin', phone: '3101234567', status: 'active', discountPercentage: 0 },
  { email: 'bodegaabsolutecompany@gmail.com', password: 'absolute2024', name: 'Jefe de Bodega', role: 'logistics', phone: '3218533959', status: 'active', discountPercentage: 0 },
  { email: 'manager@absolutecompany.co', password: 'absolute2024', name: 'Gerente de Operaciones', role: 'operations_manager', phone: '3151112233', status: 'active', discountPercentage: 0 },
  { email: 'Coordinadordavidabsolute@gmail.com', password: 'absolute2024', name: 'David (Coordinador)', role: 'coordinator', phone: '3000000001', status: 'active', discountPercentage: 0 },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('absolute_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('absolute_orders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('absolute_inventory');
    if (saved) {
      const parsed = JSON.parse(saved);
      return (parsed && parsed.length > 0) ? parsed : PRODUCTS;
    }
    return PRODUCTS;
  });

  // Persistencia local inmediata
  useEffect(() => {
    localStorage.setItem('absolute_orders', JSON.stringify(orders));
    localStorage.setItem('absolute_inventory', JSON.stringify(products));
    localStorage.setItem('absolute_users', JSON.stringify(users));
  }, [orders, products, users]);

  const syncData = useCallback(async (dataToPush?: any) => {
    try {
      const response = await fetch(API_URL, {
        method: dataToPush ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: dataToPush ? JSON.stringify(dataToPush) : null,
      });

      if (response.ok) {
        const serverData = await response.json();
        if (serverData.inventory && serverData.inventory.length > 0) setProducts(serverData.inventory);
        setIsOnline(true);
        setLastSync(new Date());
        setHasUnsyncedChanges(false);
        return true;
      }
      setIsOnline(false);
      if (dataToPush) setHasUnsyncedChanges(true);
      return false;
    } catch (error) {
      setIsOnline(false);
      if (dataToPush) setHasUnsyncedChanges(true);
      return false;
    }
  }, []);

  useEffect(() => {
    syncData();
    const interval = setInterval(() => syncData(), 60000);
    return () => clearInterval(interval);
  }, [syncData]);

  const saveAndSync = async (type: 'orders' | 'inventory' | 'users', newData: any) => {
    if (type === 'orders') setOrders(newData);
    if (type === 'inventory') setProducts(newData);
    if (type === 'users') setUsers(newData);
    setHasUnsyncedChanges(true);
    await syncData({ type, data: newData, timestamp: new Date().toISOString() });
  };

  const handleLogin = (email: string, password?: string) => {
    const lowerEmail = email.toLowerCase().trim();
    const foundUser = users.find(u => u.email.toLowerCase() === lowerEmail);
    if (foundUser) {
      if (foundUser.password && password && foundUser.password !== password) return { success: false, message: 'Contraseña incorrecta.' };
      if (foundUser.status === 'on-hold') return { success: false, message: 'Cuenta en espera.' };
      setUser(foundUser);
      return { success: true };
    }
    return { success: false, message: 'Usuario no encontrado.' };
  };

  const getAvailableStock = (productId: string, startStr: string, endStr: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    if (product.stock === 999) return 999;
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    let maxReserved = 0;
    const date = new Date(start);
    while (date <= end) {
      const reservedOnDate = orders
        .filter(o => o.status !== 'Cancelado' && o.status !== 'Finalizado')
        .reduce((sum, o) => {
          const oStart = new Date(o.startDate);
          const oEnd = new Date(o.endDate);
          if (date >= oStart && date <= oEnd) {
            const item = o.items.find(i => i.id === productId);
            return sum + (item ? item.quantity : 0);
          }
          return sum;
        }, 0);
      maxReserved = Math.max(maxReserved, reservedOnDate);
      date.setDate(date.getDate() + 1);
    }
    return Math.max(0, product.stock - maxReserved);
  };

  return (
    <HashRouter>
      {!user ? <Login onLogin={handleLogin} onRegister={(n, e, ph, pass) => {
        if (users.some(u => u.email.toLowerCase() === e.toLowerCase().trim())) return false;
        saveAndSync('users', [...users, { name: n, email: e.trim(), role: 'user', phone: ph, status: 'on-hold', password: pass }]);
        return true;
      }} /> : (
        <Layout user={user} cartCount={cart.length} onLogout={() => setUser(null)} syncStatus={{ isOnline, lastSync }} onChangePassword={() => setIsPasswordModalOpen(true)}>
          {hasUnsyncedChanges && (
            <div className="fixed top-20 right-8 z-[100] bg-brand-900 text-white p-4 rounded-2xl shadow-2xl border border-brand-400/20 animate-bounce flex items-center space-x-3">
               <CloudSync size={20} className="text-brand-400" />
               <div className="text-left">
                  <p className="text-[10px] font-black uppercase">Cambios Locales</p>
                  <p className="text-[8px] font-bold text-brand-400">Haga click para intentar sincronizar</p>
               </div>
               <button onClick={() => syncData({ type: 'all', products, orders })} className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
                  <RefreshCw size={14} />
               </button>
            </div>
          )}
          <Routes>
            <Route path="/" element={(user.role === 'logistics' || user.role === 'coordinator') ? <Navigate to="/orders" /> : <Catalog products={products} onAddToCart={(p, q) => setCart(prev => {
              const ex = prev.find(i => i.id === p.id);
              if (ex) return prev.map(i => i.id === p.id ? {...i, quantity: Math.min(i.quantity + q, p.stock)} : i);
              return [...prev, {...p, quantity: q}];
            })} />} />
            <Route path="/cart" element={<Cart 
                items={cart} 
                currentUser={user} 
                orders={orders}
                onRemove={(id) => setCart(cart.filter(i => i.id !== id))}
                onUpdateQuantity={(id, q) => setCart(cart.map(i => i.id === id ? {...i, quantity: q} : i))}
                getAvailableStock={getAvailableStock}
                onCheckout={(start, end, origin, dest, type) => {
                  const newOrder: Order = {
                    id: Math.random().toString(36).substr(2, 9).toUpperCase(),
                    items: [...cart],
                    userEmail: user.email,
                    status: type === 'quote' ? 'Cotización' : 'Pendiente',
                    orderType: type,
                    startDate: start,
                    endDate: end,
                    createdAt: new Date().toISOString(),
                    originLocation: origin,
                    destinationLocation: dest,
                    totalAmount: cart.reduce((acc, item) => {
                      const days = Math.ceil(Math.abs(new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      let price = item.priceRent;
                      if (item.category === 'Mobiliario') {
                        if (price === 14000) {
                          if (days <= 3) price = 14800;
                          else if (days <= 5) price = 17800;
                          else if (days <= 15) price = 21400;
                          else price = 25700;
                        } else {
                          const baseIPC = price * 1.057;
                          if (days <= 3) price = baseIPC;
                          else if (days <= 5) price = baseIPC * 1.20;
                          else if (days <= 15) price = baseIPC * 1.44;
                          else price = baseIPC * 1.73;
                        }
                      }
                      return acc + (price * item.quantity * (item.category === 'Mobiliario' ? 1 : days));
                    }, 0),
                    workflow: {
                      bodega_check: { status: 'pending', itemChecks: {}, photos: [], files: [] },
                      bodega_to_coord: { status: 'pending', itemChecks: {}, photos: [], files: [] },
                      coord_to_client: { status: 'pending', itemChecks: {}, photos: [], files: [] },
                      client_to_coord: { status: 'pending', itemChecks: {}, photos: [], files: [] },
                      coord_to_bodega: { status: 'pending', itemChecks: {}, photos: [], files: [] },
                    }
                  };
                  saveAndSync('orders', [...orders, newOrder]);
                  setCart([]);
                }}
              />} />
            <Route path="/orders" element={<div className="space-y-6">
              <h2 className="text-2xl font-black text-brand-900 uppercase">Reservas</h2>
              <div className="grid gap-4">
                {orders.filter(o => user.role === 'admin' || user.role === 'logistics' || o.userEmail === user.email || o.assignedCoordinatorEmail === user.email).map(o => (
                  <div key={o.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-900"><Package size={20} /></div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {o.id}</span>
                        <h4 className="font-black text-brand-900 uppercase text-sm">{o.destinationLocation}</h4>
                      </div>
                    </div>
                    <Link to={`/tracking/${o.id}`} className="bg-slate-100 text-slate-600 px-6 py-2 rounded-xl text-[9px] font-black uppercase flex items-center space-x-2"> <Eye size={14} /> <span>Detalle Logístico</span> </Link>
                  </div>
                ))}
              </div>
            </div>} />
            <Route path="/admin" element={<AdminDashboard 
                currentUser={user} 
                products={products} 
                orders={orders} 
                users={users} 
                onAddProduct={(p) => saveAndSync('inventory', [...products, p])} 
                onUpdateProduct={(p) => saveAndSync('inventory', products.map(old => old.id === p.id ? p : old))} 
                onDeleteProduct={(id) => saveAndSync('inventory', products.filter(p => p.id !== id))} 
                onApproveOrder={(id, em) => saveAndSync('orders', orders.map(o => o.id === id ? {...o, status: 'En Proceso', assignedCoordinatorEmail: em} : o))} 
                onCancelOrder={(id) => saveAndSync('orders', orders.map(o => o.id === id ? {...o, status: 'Cancelado'} : o))}
                onDeleteOrder={(id) => saveAndSync('orders', orders.filter(o => o.id !== id))}
                onChangeUserRole={(em, r) => saveAndSync('users', users.map(u => u.email === em ? {...u, role: r} : u))} 
                onChangeUserDiscount={(em, d) => saveAndSync('users', users.map(u => u.email === em ? {...u, discountPercentage: d} : u))} 
                onUpdateUserDetails={(em, details) => saveAndSync('users', users.map(u => u.email === em ? {...u, ...details} : u))}
                onToggleUserStatus={(em) => saveAndSync('users', users.map(u => u.email === em ? {...u, status: u.status === 'active' ? 'on-hold' : 'active'} : u))}
                onDeleteUser={(em) => saveAndSync('users', users.filter(u => u.email !== em))}
                onUpdateStage={(orderId, stageKey, data) => {
                  const order = orders.find(o => o.id === orderId);
                  if (order) {
                    const updatedWorkflow = { ...order.workflow, [stageKey]: data };
                    saveAndSync('orders', orders.map(o => o.id === orderId ? { ...o, workflow: updatedWorkflow } : o));
                  }
                }} 
              />} />
            <Route path="/logistics-map" element={<ServiceMap />} />
            <Route path="/tracking/:id" element={<Tracking orders={orders} currentUser={user} users={users} onUpdateStage={(orderId, stageKey, data) => {
                const order = orders.find(o => o.id === orderId);
                if (order) {
                  const updatedWorkflow = { ...order.workflow, [stageKey]: data };
                  saveAndSync('orders', orders.map(o => o.id === orderId ? { ...o, workflow: updatedWorkflow } : o));
                }
              }} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onUpdate={(p) => saveAndSync('users', users.map(u => u.email === user?.email ? {...u, password: p} : u))} currentUser={user!} />
        </Layout>
      )}
    </HashRouter>
  );
};

export default App;
