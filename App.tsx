
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, Product, CartItem, Order, OrderStatus, WorkflowStageKey, StageData, OrderType } from './types';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Catalog } from './Catalog';
import { Cart } from './Cart';
import { Tracking } from './components/Tracking';
import { AdminDashboard } from './AdminDashboard';
import { ServiceMap } from './components/ServiceMap';
import { PRODUCTS } from './constants';
import { Cloud, RefreshCw, Package, Eye, BellRing, X } from 'lucide-react';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { EmailNotification } from './components/EmailNotification';

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
  const [notification, setNotification] = useState<{title: string, msg: string} | null>(null);
  const [activeEmail, setActiveEmail] = useState<any>(null);
  
  const [eventStartDate, setEventStartDate] = useState<string>('');
  const [eventEndDate, setEventEndDate] = useState<string>('');
  const [eventOrigin, setEventOrigin] = useState<string>('Bogotá, Colombia');
  const [eventDestination, setEventDestination] = useState<string>('');

  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  
  const prevOrdersCount = useRef(0);

  const syncWithServer = useCallback(async (dataToPush?: any) => {
    try {
      const response = await fetch(API_URL, {
        method: dataToPush ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: dataToPush ? JSON.stringify(dataToPush) : null,
      });

      if (response.ok) {
        const serverData = await response.json();
        
        if (serverData.users.length === 0 && !dataToPush) {
           await syncWithServer({ type: 'sync_all', users: DEFAULT_USERS, inventory: PRODUCTS, orders: [] });
           return;
        }

        if (serverData.users?.length > 0) setUsers(serverData.users);
        if (serverData.inventory?.length > 0) setProducts(serverData.inventory);
        
        if (serverData.orders && serverData.orders.length > prevOrdersCount.current && prevOrdersCount.current !== 0) {
           const newOrder = serverData.orders[serverData.orders.length - 1];
           if (newOrder.userEmail !== user?.email) {
             setNotification({ title: 'Nueva Reserva Recibida', msg: `Se ha generado un nuevo pedido de: ${newOrder.destinationLocation}` });
             try { new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play(); } catch(e){}
           }
        }
        prevOrdersCount.current = serverData.orders?.length || 0;

        if (serverData.orders) setOrders(serverData.orders);
        
        setIsOnline(true);
        setLastSync(new Date());
        setHasUnsyncedChanges(false);
        return true;
      }
      return false;
    } catch (error) {
      setIsOnline(false);
      return false;
    }
  }, [user?.email]);

  useEffect(() => {
    syncWithServer();
    const interval = setInterval(() => syncWithServer(), 15000);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  const saveAndSync = async (type: 'orders' | 'inventory' | 'users', newData: any) => {
    setHasUnsyncedChanges(true);
    let finalUsers = users;
    let finalInventory = products;
    let finalOrders = orders;

    if (type === 'orders') { setOrders(newData); finalOrders = newData; }
    if (type === 'inventory') { setProducts(newData); finalInventory = newData; }
    if (type === 'users') { setUsers(newData); finalUsers = newData; }
    
    await syncWithServer({
      type: 'sync_all',
      users: finalUsers,
      inventory: finalInventory,
      orders: finalOrders
    });
  };

  const handleEditQuote = (orderId: string) => {
    const orderToEdit = orders.find(o => o.id === orderId);
    if (orderToEdit) {
      setCart([...orderToEdit.items]);
      setEventStartDate(orderToEdit.startDate);
      setEventEndDate(orderToEdit.endDate);
      setEventOrigin(orderToEdit.originLocation);
      setEventDestination(orderToEdit.destinationLocation);
      saveAndSync('orders', orders.filter(o => o.id !== orderId));
    }
  };

  const handleApproveOrder = (orderId: string, coordinatorEmail: string) => {
    const updatedOrders = orders.map(o => 
      o.id === orderId ? { ...o, status: 'En Proceso' as OrderStatus, assignedCoordinatorEmail: coordinatorEmail } : o
    );
    const approvedOrder = updatedOrders.find(o => o.id === orderId);
    saveAndSync('orders', updatedOrders);

    if (approvedOrder) {
      // Notificar al Jefe de Bodega y al Coordinador vía EmailNotification
      setActiveEmail({
        to: 'bodegaabsolutecompany@gmail.com', // Jefe de Bodega
        cc: coordinatorEmail, // Coordinador Asignado
        subject: `PEDIDO APROBADO: #${approvedOrder.id} - ${approvedOrder.destinationLocation}`,
        body: `Buen día,\n\nSe informa que el pedido #${approvedOrder.id} ha sido APROBADO formalmente por la administración para el evento en ${approvedOrder.destinationLocation}.\n\nCoordinador Asignado: ${coordinatorEmail}\n\nJefe de Bodega: Por favor iniciar alistamiento según las fechas programadas (${approvedOrder.startDate} al ${approvedOrder.endDate}).\n\nSaludos,\nEquipo ABSOLUTE.`,
        stage: 'Aprobación y Asignación de Coordinador',
        order: approvedOrder
      });
    }
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
      {!user ? <Login onLogin={(e, p) => {
        const lowerEmail = e.toLowerCase().trim();
        const foundUser = users.find(u => u.email.toLowerCase() === lowerEmail);
        if (foundUser) {
          if (foundUser.password && p && foundUser.password !== p) return { success: false, message: 'Contraseña incorrecta.' };
          if (foundUser.status === 'on-hold') return { success: false, message: 'Cuenta pendiente de aprobación.' };
          setUser(foundUser);
          return { success: true };
        }
        return { success: false, message: 'Usuario no encontrado.' };
      }} onRegister={(n, e, ph, pass) => {
        if (users.some(u => u.email.toLowerCase() === e.toLowerCase().trim())) return false;
        const newUsers = [...users, { name: n, email: e.trim(), role: 'user', phone: ph, status: 'on-hold', password: pass, discountPercentage: 0 }];
        saveAndSync('users', newUsers);
        return true;
      }} /> : (
        <Layout user={user} cartCount={cart.length} onLogout={() => setUser(null)} syncStatus={{ isOnline, lastSync }} onChangePassword={() => setIsPasswordModalOpen(true)}>
          
          {notification && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] w-[90%] max-w-sm animate-in slide-in-from-top-full duration-500">
              <div className="bg-white border-l-4 border-brand-400 shadow-[0_20px_50px_rgba(0,0,51,0.3)] rounded-2xl p-4 flex items-center space-x-4">
                 <div className="w-10 h-10 bg-brand-900 rounded-full flex items-center justify-center text-brand-400">
                    <BellRing size={20} className="animate-wiggle" />
                 </div>
                 <div className="flex-1">
                    <p className="text-[10px] font-black text-brand-900 uppercase tracking-widest">{notification.title}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{notification.msg}</p>
                 </div>
                 <button onClick={() => setNotification(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={16}/></button>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/" element={<Catalog products={products} onAddToCart={(p, q, w, h) => setCart(prev => {
              const ex = prev.find(i => i.id === p.id);
              if (ex) return prev.map(i => i.id === p.id ? {...i, quantity: Math.min(i.quantity + q, p.stock), width: w, height: h} : i);
              return [...prev, {...p, quantity: q, width: w, height: h}];
            })} />} />
            
            <Route path="/cart" element={<Cart 
                items={cart} 
                currentUser={user} 
                orders={orders}
                onRemove={(id) => setCart(cart.filter(i => i.id !== id))}
                onUpdateQuantity={(id, q) => setCart(cart.map(i => i.id === id ? {...i, quantity: q} : i))}
                onUpdateItem={(id, updates) => setCart(cart.map(i => i.id === id ? {...i, ...updates} : i))}
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
                       if (item.category === 'Impresión') {
                         const area = (item.width || 1) * (item.height || 1);
                         return acc + (item.priceRent * area * item.quantity);
                       }
                       if (item.category === 'Servicios' && item.name.toLowerCase().includes('diseño')) {
                         return acc + (item.priceRent * item.quantity);
                       }
                       return acc + (item.priceRent * item.quantity * days);
                    }, 0),
                    workflow: {
                      bodega_check: { status: 'pending', itemChecks: {}, photos: [], files: [] },
                      bodega_to_coord: { status: 'pending', itemChecks: {}, photos: [], files: [] },
                      coord_to_client: { status: 'pending', itemChecks: {}, photos: [], files: [] },
                      client_to_coord: { status: 'pending', itemChecks: {}, photos: [], files: [] },
                      coord_to_bodega: { status: 'pending', itemChecks: {}, photos: [], files: [] },
                    }
                  };
                  
                  const updatedOrders = [...orders, newOrder];
                  saveAndSync('orders', updatedOrders);
                  setCart([]);

                  setActiveEmail({
                    to: user.email,
                    cc: 'notificaciones@absolutecompany.co',
                    subject: type === 'quote' ? `Nueva Cotización #${newOrder.id}` : `Confirmación de Reserva #${newOrder.id}`,
                    body: `Gracias por confiar en ABSOLUTE. Adjuntamos el detalle de su ${type === 'quote' ? 'cotización' : 'reserva'} para el evento en ${dest}.\n\n(precios sin IVA.)\n\nSi desea realizar cambios, puede contactarnos citando el ID del pedido.`,
                    stage: type === 'quote' ? 'Generación de Cotización' : 'Confirmación de Reserva',
                    order: newOrder
                  });
                }}
                startDate={eventStartDate}
                setStartDate={setEventStartDate}
                endDate={eventEndDate}
                setEndDate={setEventEndDate}
                origin={eventOrigin}
                setOrigin={setEventOrigin}
                destination={eventDestination}
                setDestination={setEventDestination}
              />} />

            <Route path="/orders" element={<div className="space-y-6">
              <h2 className="text-2xl font-black text-brand-900 uppercase">Gestión de Reservas</h2>
              <div className="grid gap-4">
                {orders.filter(o => user.role === 'admin' || user.role === 'logistics' || o.userEmail === user.email || o.assignedCoordinatorEmail === user.email).map(o => (
                  <div key={o.id} className={`bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 ${o.status === 'Cotización' ? 'border-amber-200' : 'border-slate-100'}`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${o.status === 'Cotización' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-900'}`}><Package size={20} /></div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {o.id} • {o.status}</span>
                        <h4 className="font-black text-brand-900 uppercase text-sm">{o.destinationLocation}</h4>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                       {o.status === 'Cotización' && (
                         <button onClick={() => { handleEditQuote(o.id); window.location.hash = '#/cart'; }} className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center space-x-2"> <RefreshCw size={14} /> <span>Modificar</span> </button>
                       )}
                       <Link to={`/tracking/${o.id}`} className="bg-slate-100 text-slate-600 px-6 py-2 rounded-xl text-[9px] font-black uppercase flex items-center space-x-2"> <Eye size={14} /> <span>Detalle</span> </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>} />

            <Route path="/admin" element={<AdminDashboard 
                currentUser={user} products={products} orders={orders} users={users} 
                onAddProduct={(p) => saveAndSync('inventory', [...products, p])} 
                onUpdateProduct={(p) => saveAndSync('inventory', products.map(old => old.id === p.id ? p : old))} 
                onDeleteProduct={(id) => saveAndSync('inventory', products.filter(p => p.id !== id))} 
                onUpdateOrderDates={(id, s, e) => saveAndSync('orders', orders.map(o => o.id === id ? {...o, startDate: s, endDate: e} : o))}
                onApproveOrder={handleApproveOrder} 
                onCancelOrder={(id) => saveAndSync('orders', orders.map(o => o.id === id ? {...o, status: 'Cancelado'} : o))}
                onDeleteOrder={(id) => saveAndSync('orders', orders.filter(o => o.id !== id))}
                onToggleUserRole={(em) => saveAndSync('users', users.map(u => u.email === em ? {...u, role: u.role === 'admin' ? 'user' : 'admin'} : u))}
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
          </Routes>

          <EmailNotification email={activeEmail} onClose={() => setActiveEmail(null)} />
          <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onUpdate={(p) => saveAndSync('users', users.map(u => u.email === user?.email ? {...u, password: p} : u))} currentUser={user!} />
        </Layout>
      )}
    </HashRouter>
  );
};

export default App;
