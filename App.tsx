
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Product, Order, CartItem, WorkflowStageKey, StageData, OrderType, OrderStatus } from './types';
import { PRODUCTS, INITIAL_USERS } from './constants';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Catalog } from './Catalog';
import { Cart } from './Cart';
import { Tracking } from './components/Tracking';
import { AdminDashboard } from './AdminDashboard';
import { ServiceMap } from './components/ServiceMap';
import { ChangePasswordModal } from './components/ChangePasswordModal';

const App: React.FC = () => {
  // Inicialización ultra-defensiva
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('absolute_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('absolute_inventory');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(p => p && p.id && p.name);
      }
      return PRODUCTS;
    } catch (e) { return PRODUCTS; }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('absolute_orders');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed.filter(o => o && o.id) : [];
    } catch (e) { return []; }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('absolute_users');
      const parsed = saved ? JSON.parse(saved) : [];
      const merged = [...INITIAL_USERS];
      if (Array.isArray(parsed)) {
        parsed.forEach((u: User) => {
          if (u && u.email && !merged.find(m => m.email.toLowerCase() === u.email.toLowerCase())) {
            merged.push(u);
          }
        });
      }
      return merged;
    } catch (e) { return INITIAL_USERS; }
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState({ isOnline: navigator.onLine, lastSync: new Date() });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Guardado seguro
  const saveAndSync = (type: 'orders' | 'inventory' | 'users', newData: any) => {
    try {
      if (type === 'orders') setOrders(newData);
      if (type === 'inventory') setProducts(newData);
      if (type === 'users') setUsers(newData);
      localStorage.setItem('absolute_' + type, JSON.stringify(newData));
      setSyncStatus(prev => ({ ...prev, lastSync: new Date() }));
    } catch (e) {
      console.error("Error al guardar datos:", e);
    }
  };

  const handleLogin = (email: string, password?: string) => {
    const emailNorm = email.toLowerCase().trim();
    const found = users.find(u => u.email.toLowerCase() === emailNorm && u.password === password);
    if (found) {
      if (found.status === 'on-hold') return { success: false, message: 'Cuenta pendiente de aprobación.' };
      setUser(found);
      localStorage.setItem('absolute_user', JSON.stringify(found));
      return { success: true };
    }
    return { success: false, message: 'Correo o contraseña incorrectos.' };
  };

  const handleUpdateStage = (orderId: string, stageKey: WorkflowStageKey, data: StageData) => {
    const newOrders = orders.map(o => {
      if (o.id === orderId) {
        const updatedWorkflow = { ...o.workflow, [stageKey]: data };
        let status = o.status;
        if (stageKey === 'bodega_check' && data.status === 'completed') status = 'En Proceso';
        if (stageKey === 'coord_to_client' && data.status === 'completed') status = 'Entregado';
        if (stageKey === 'coord_to_bodega' && data.status === 'completed') status = 'Finalizado';
        return { ...o, workflow: updatedWorkflow, status };
      }
      return o;
    });
    saveAndSync('orders', newOrders);
  };

  const sharedAdminProps = {
    products,
    orders,
    users,
    onAddProduct: (p: Product) => saveAndSync('inventory', [...products, p]),
    onUpdateProduct: (p: Product) => saveAndSync('inventory', products.map(x => x.id === p.id ? p : x)),
    onDeleteProduct: (id: string) => saveAndSync('inventory', products.filter(x => x.id !== id)),
    onUpdateOrderDates: (id: string, s: string, e: string) => saveAndSync('orders', orders.map(o => o.id === id ? { ...o, startDate: s, endDate: e } : o)),
    onApproveOrder: (id: string, coord: string) => saveAndSync('orders', orders.map(o => o.id === id ? { ...o, status: 'Pendiente', assignedCoordinatorEmail: coord } : o)),
    onCancelOrder: (id: string) => saveAndSync('orders', orders.map(o => o.id === id ? { ...o, status: 'Cancelado' } : o)),
    onDeleteOrder: (id: string) => saveAndSync('orders', orders.filter(o => o.id !== id)),
    onUpdateStage: handleUpdateStage,
    onChangeUserDiscount: (em: string, d: number) => saveAndSync('users', users.map(u => u.email === em ? { ...u, discountPercentage: d } : u)),
    onToggleUserRole: (em: string) => {},
    onChangeUserRole: (em: string, r: User['role']) => saveAndSync('users', users.map(u => u.email === em ? { ...u, role: r } : u)),
    onUpdateUserDetails: (em: string, det: Partial<User>) => saveAndSync('users', users.map(u => u.email === em ? { ...u, ...det } : u)),
    onToggleUserStatus: (em: string) => saveAndSync('users', users.map(u => u.email === em ? { ...u, status: u.status === 'active' ? 'on-hold' : 'active' } : u)),
    onDeleteUser: (em: string) => saveAndSync('users', users.filter(u => u.email !== em))
  };

  const isStaff = user && (user.role === 'admin' || user.role === 'logistics' || user.role === 'coordinator');

  return (
    <BrowserRouter>
      {!user ? (
        <Login 
          onLogin={handleLogin} 
          onRegister={(n, e, ph, pass) => {
            if (users.find(u => u.email.toLowerCase() === e.toLowerCase())) return false;
            saveAndSync('users', [...users, { name: n, email: e, phone: ph, password: pass, role: 'user', status: 'on-hold' }]);
            return true;
          }} 
          deferredPrompt={deferredPrompt} 
        />
      ) : (
        <Layout 
          user={user} 
          cartCount={cart.length} 
          onLogout={() => { setUser(null); localStorage.removeItem('absolute_user'); }} 
          onChangePassword={() => setIsPasswordModalOpen(true)}
          syncStatus={syncStatus}
          deferredPrompt={deferredPrompt}
        >
          <Routes>
            <Route path="/" element={
              (user.role === 'logistics' || user.role === 'coordinator') ? <Navigate to="/orders" /> : 
              <Catalog products={products} onAddToCart={(p, q) => setCart(prev => {
                const ex = prev.find(i => i.id === p.id);
                if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + q } : i);
                return [...prev, { ...p, quantity: q }];
              })} />
            } />
            <Route path="/orders" element={<AdminDashboard currentUser={user} {...sharedAdminProps} initialTab="orders" />} />
            <Route path="/admin" element={user.role === 'admin' ? <AdminDashboard currentUser={user} {...sharedAdminProps} initialTab="inventory" /> : <Navigate to="/" />} />
            <Route path="/cart" element={
              <Cart 
                items={cart} currentUser={user} orders={orders} 
                onRemove={(id) => setCart(c => c.filter(i => i.id !== id))} 
                onUpdateQuantity={(id, q) => setCart(c => c.map(i => i.id === id ? { ...i, quantity: q } : i))} 
                getAvailableStock={(pid, s, e) => {
                  const p = products.find(x => x.id === pid);
                  return p ? p.stock : 0;
                }}
                onCheckout={(s, e, o, d, t) => {
                  const newO: Order = { id: 'ABS-' + Math.random().toString(36).substr(2, 6).toUpperCase(), items: [...cart], userEmail: user.email, status: t === 'quote' ? 'Cotización' : 'Pendiente', orderType: t, startDate: s, endDate: e, createdAt: new Date().toISOString(), originLocation: o, destinationLocation: d, totalAmount: cart.reduce((acc, i) => acc + (i.priceRent * i.quantity), 0), workflow: { bodega_check: { status: 'pending', itemChecks: {}, photos: [], files: [] }, bodega_to_coord: { status: 'pending', itemChecks: {}, photos: [], files: [] }, coord_to_client: { status: 'pending', itemChecks: {}, photos: [], files: [] }, client_to_coord: { status: 'pending', itemChecks: {}, photos: [], files: [] }, coord_to_bodega: { status: 'pending', itemChecks: {}, photos: [], files: [] } } };
                  saveAndSync('orders', [...orders, newO]);
                  setCart([]);
                }} 
              />
            } />
            <Route path="/tracking/:id" element={<Tracking orders={orders} onUpdateStage={handleUpdateStage} currentUser={user} users={users} />} />
            <Route path="/logistics-map" element={<ServiceMap />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      )}
      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onUpdate={(p) => saveAndSync('users', users.map(u => u.email === user?.email ? { ...u, password: p } : u))} currentUser={user!} />
    </BrowserRouter>
  );
};

export default App;
