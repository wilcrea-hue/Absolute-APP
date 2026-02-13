import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Product, Order, CartItem, WorkflowStageKey, StageData, OrderType, OrderStatus } from './types';
import { PRODUCTS } from './constants';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Catalog } from './Catalog';
import { Cart } from './Cart';
import { Tracking } from './components/Tracking';
import { AdminDashboard } from './AdminDashboard';
import { ServiceMap } from './components/ServiceMap';
import { ChangePasswordModal } from './components/ChangePasswordModal';

// Helper function to handle data synchronization (placeholder)
const syncData = async (payload: any) => {
  console.log("Synchronizing data with backend...", payload);
  return new Promise((resolve) => setTimeout(resolve, 300));
};

const App: React.FC = () => {
  // Authentication and user state
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('absolute_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Application data state
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('absolute_inventory');
    return saved ? JSON.parse(saved) : PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('absolute_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('absolute_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState({ isOnline: navigator.onLine, lastSync: new Date() });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Centralized data saving and synchronization logic
  const saveAndSync = async (type: 'orders' | 'inventory' | 'users' | 'all', newData: any) => {
    try {
      if (type === 'orders') setOrders(newData);
      if (type === 'inventory') setProducts(newData);
      if (type === 'users') setUsers(newData);
      
      // Persist to local storage
      localStorage.setItem('absolute_' + type, JSON.stringify(newData));
      
      // Trigger background sync
      await syncData({ type, data: newData, timestamp: new Date().toISOString(), updatedBy: user?.email });
      setSyncStatus(prev => ({ ...prev, lastSync: new Date() }));
    } catch (error: any) {
      console.error("Storage Error:", error);
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        alert("¡Error Crítico de Memoria!: El navegador ha alcanzado su límite de almacenamiento. Por favor, elimine evidencias fotográficas de pedidos antiguos para liberar espacio.");
      } else {
        alert("Ocurrió un error al guardar los datos localmente. Verifique su conexión.");
      }
    }
  };

  // Browser environment listeners
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    const handleOnline = () => setSyncStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSyncStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auth management
  const handleLogin = (email: string, password?: string) => {
    const found = users.find(u => u.email === email && u.password === password);
    if (found) {
      if (found.status === 'on-hold') return { success: false, message: 'Cuenta pendiente de aprobación.' };
      setUser(found);
      localStorage.setItem('absolute_user', JSON.stringify(found));
      return { success: true };
    }
    // Hardcoded Admin for initial access
    if (email === 'admin@absolutecompany.co' && password === 'admin123') {
      const admin: User = { email, name: 'Administrador Principal', role: 'admin', status: 'active' };
      setUser(admin);
      return { success: true };
    }
    return { success: false, message: 'Correo o contraseña incorrectos.' };
  };

  const handleRegister = (name: string, email: string, phone: string, password?: string) => {
    if (users.find(u => u.email === email)) return false;
    const newUser: User = { name, email, phone, password, role: 'user', status: 'on-hold' };
    saveAndSync('users', [...users, newUser]);
    return true;
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('absolute_user');
  };

  const handleUpdatePassword = (newPassword: string) => {
    if (user) {
      const updatedUser = { ...user, password: newPassword };
      setUser(updatedUser);
      saveAndSync('users', users.map(u => u.email === user.email ? updatedUser : u));
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const handleRemoveFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));
  const handleUpdateCartQuantity = (id: string, qty: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, qty) } : item));
  };

  // Inventory and Availability Logic
  const getAvailableStock = (productId: string, startDate: string, endDate: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    if (product.stock === 999) return 999;
    
    const s1 = new Date(startDate).getTime();
    const e1 = new Date(endDate).getTime();
    
    const reserved = orders
      .filter(o => o.status !== 'Cancelado' && o.status !== 'Finalizado' && o.status !== 'Cotización')
      .reduce((acc, o) => {
        const s2 = new Date(o.startDate).getTime();
        const e2 = new Date(o.endDate).getTime();
        if (s1 <= e2 && e1 >= s2) {
          const item = o.items.find(i => i.id === productId);
          return acc + (item?.quantity || 0);
        }
        return acc;
      }, 0);
      
    return Math.max(0, product.stock - reserved);
  };

  const handleCheckout = (startDate: string, endDate: string, origin: string, destination: string, type: OrderType) => {
    if (!user) return;
    const newOrder: Order = {
      id: 'ABS-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      items: [...cart],
      userEmail: user.email,
      status: type === 'quote' ? 'Cotización' : 'Pendiente',
      orderType: type,
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
      originLocation: origin,
      destinationLocation: destination,
      totalAmount: cart.reduce((acc, item) => acc + (item.priceRent * item.quantity), 0),
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

  const handleConfirmQuote = (orderId: string) => {
    // Correctly cast status using imported OrderStatus type
    const newOrders = orders.map(o => o.id === orderId ? { ...o, status: 'Pendiente' as OrderStatus, orderType: 'rental' as OrderType } : o);
    saveAndSync('orders', newOrders);
  };

  return (
    <BrowserRouter>
      {!user ? (
        <Login onLogin={handleLogin} onRegister={handleRegister} deferredPrompt={deferredPrompt} />
      ) : (
        <>
          <Layout 
            user={user} 
            cartCount={cart.length} 
            onLogout={handleLogout} 
            onChangePassword={() => setIsPasswordModalOpen(true)}
            syncStatus={syncStatus}
            deferredPrompt={deferredPrompt}
          >
            <Routes>
              <Route path="/" element={<Catalog products={products} onAddToCart={handleAddToCart} />} />
              <Route path="/cart" element={
                <Cart 
                  items={cart} 
                  currentUser={user} 
                  orders={orders}
                  onRemove={handleRemoveFromCart} 
                  onUpdateQuantity={handleUpdateCartQuantity} 
                  onCheckout={handleCheckout} 
                  getAvailableStock={getAvailableStock}
                />
              } />
              <Route path="/orders" element={
                <AdminDashboard 
                  currentUser={user} 
                  products={products} 
                  orders={orders} 
                  users={users} 
                  onAddProduct={() => {}} 
                  onUpdateProduct={() => {}} 
                  onDeleteProduct={() => {}} 
                  onUpdateOrderDates={() => {}} 
                  onApproveOrder={() => {}} 
                  onUpdateStage={handleUpdateStage} 
                  onChangeUserDiscount={() => {}} 
                  onToggleUserRole={() => {}} 
                />
              } />
              <Route path="/tracking/:id" element={<Tracking orders={orders} onUpdateStage={handleUpdateStage} onConfirmQuote={handleConfirmQuote} currentUser={user} users={users} />} />
              <Route path="/logistics-map" element={<ServiceMap />} />
              <Route path="/admin" element={
                user.role === 'admin' ? 
                <AdminDashboard 
                  currentUser={user} 
                  products={products} 
                  orders={orders} 
                  users={users} 
                  onAddProduct={(p) => saveAndSync('inventory', [...products, p])}
                  onUpdateProduct={(p) => saveAndSync('inventory', products.map(prod => prod.id === p.id ? p : prod))}
                  onDeleteProduct={(id) => saveAndSync('inventory', products.filter(p => p.id !== id))}
                  onUpdateOrderDates={() => {}}
                  onApproveOrder={(id, coord) => saveAndSync('orders', orders.map(o => o.id === id ? { ...o, status: 'Pendiente', assignedCoordinatorEmail: coord } : o))}
                  onCancelOrder={(id) => saveAndSync('orders', orders.map(o => o.id === id ? { ...o, status: 'Cancelado' } : o))}
                  onDeleteOrder={(id) => saveAndSync('orders', orders.filter(o => o.id !== id))}
                  onToggleUserRole={(email) => console.log('Toggle role requested for:', email)}
                  onChangeUserRole={(email, role) => saveAndSync('users', users.map(u => u.email === email ? { ...u, role } : u))}
                  onChangeUserDiscount={(email, discount) => saveAndSync('users', users.map(u => u.email === email ? { ...u, discountPercentage: discount } : u))}
                  onUpdateUserDetails={(email, details) => saveAndSync('users', users.map(u => u.email === email ? { ...u, ...details } : u))}
                  onToggleUserStatus={(email) => saveAndSync('users', users.map(u => u.email === email ? { ...u, status: u.status === 'active' ? 'on-hold' : 'active' } : u))}
                  onDeleteUser={(email) => saveAndSync('users', users.filter(u => u.email !== email))}
                  onUpdateStage={handleUpdateStage}
                /> : <Navigate to="/" />
              } />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
          <ChangePasswordModal 
            isOpen={isPasswordModalOpen} 
            onClose={() => setIsPasswordModalOpen(false)} 
            onUpdate={handleUpdatePassword} 
            currentUser={user}
          />
        </>
      )}
    </BrowserRouter>
  );
};

export default App;