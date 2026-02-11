
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
import { EmailNotification } from './components/EmailNotification';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { PRODUCTS, LOGO_URL } from './constants';
import { GoogleGenAI } from "@google/genai";
import { CheckCircle, Eye } from 'lucide-react';

const API_URL = './api/sync.php'; 
const ADMIN_EMAIL = 'admin@absolutecompany.co';

const DEFAULT_USERS: User[] = [
  { email: ADMIN_EMAIL, password: 'absolute2024', name: 'Administrador Principal', role: 'admin', phone: '3101234567', status: 'active', discountPercentage: 0 },
  { email: 'bodegaabsolutecompany@gmail.com', password: 'absolute2024', name: 'Jefe de Bodega', role: 'logistics', phone: '3218533959', status: 'active', discountPercentage: 0 },
  { email: 'manager@absolutecompany.co', password: 'absolute2024', name: 'Gerente de Operaciones', role: 'operations_manager', phone: '3151112233', status: 'active', discountPercentage: 0 },
  // Nómina de Coordinadores Nacionales
  { email: 'Coordinadordavidabsolute@gmail.com', password: 'absolute2024', name: 'David (Coordinador)', role: 'coordinator', phone: '3000000001', status: 'active', discountPercentage: 0 },
  { email: 'Coordinadorharoldabsolute@gmail.com', password: 'absolute2024', name: 'Harold (Coordinador)', role: 'coordinator', phone: '3000000002', status: 'active', discountPercentage: 0 },
  { email: 'Coordinadoredwinabsolute@gmail.com', password: 'absolute2024', name: 'Edwin (Coordinador)', role: 'coordinator', phone: '3000000003', status: 'active', discountPercentage: 0 },
  { email: 'Coordinadormichaelabsolute@gmail.com', password: 'absolute2024', name: 'Michael (Coordinador)', role: 'coordinator', phone: '3000000004', status: 'active', discountPercentage: 0 },
  { email: 'Coordinadorwilliamabsolute@gmail.com', password: 'absolute2024', name: 'William (Coordinador)', role: 'coordinator', phone: '3000000005', status: 'active', discountPercentage: 0 },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sentEmail, setSentEmail] = useState<{ to: string, cc: string, subject: string, body: string, stage: string, order?: Order } | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('absolute_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('absolute_orders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [orderCounter, setOrderCounter] = useState<number>(() => {
    const saved = localStorage.getItem('absolute_order_counter');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('absolute_inventory');
    if (saved) {
      const parsed = JSON.parse(saved);
      return (parsed && parsed.length > 0) ? parsed : PRODUCTS;
    }
    return PRODUCTS;
  });

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission();
      }, 3000);
    }
  }, []);

  const syncData = useCallback(async (dataToPush?: any) => {
    try {
      const response = await fetch(API_URL, {
        method: dataToPush ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: dataToPush ? JSON.stringify(dataToPush) : null,
      });

      if (response.ok) {
        const serverData = await response.json();
        if (serverData.orders) setOrders(serverData.orders);
        if (serverData.inventory && serverData.inventory.length > 0) setProducts(serverData.inventory);
        if (serverData.orderCounter) setOrderCounter(serverData.orderCounter);
        if (serverData.users && serverData.users.length > 0) {
          const mergedUsers = [...serverData.users];
          DEFAULT_USERS.forEach(du => {
            if (!mergedUsers.some(u => u.email === du.email)) {
              mergedUsers.push(du);
            }
          });
          setUsers(mergedUsers);
        }
        setIsOnline(true);
        setLastSync(new Date());
        return true;
      }
      setIsOnline(false);
      return false;
    } catch (error) {
      setIsOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    syncData();
    const interval = setInterval(() => syncData(), 45000);
    return () => clearInterval(interval);
  }, [syncData]);

  useEffect(() => {
    localStorage.setItem('absolute_orders', JSON.stringify(orders));
    localStorage.setItem('absolute_inventory', JSON.stringify(products));
    localStorage.setItem('absolute_users', JSON.stringify(users));
    localStorage.setItem('absolute_order_counter', orderCounter.toString());
  }, [orders, products, users, orderCounter]);

  const isDateOverlap = (s1: string, e1: string, s2: string, e2: string) => {
    const start1 = new Date(s1).getTime();
    const end1 = new Date(e1).getTime();
    const start2 = new Date(s2).getTime();
    const end2 = new Date(e2).getTime();
    return (start1 <= end2) && (end1 >= start2);
  };

  const getAvailableStock = (productId: string, startDate: string, endDate: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    if (!startDate || !endDate) return product.stock;

    const committedQuantity = orders
      .filter(o => 
        o.status !== 'Cancelado' && 
        o.status !== 'Finalizado' &&
        o.items.some(i => i.id === productId) &&
        isDateOverlap(o.startDate, o.endDate, startDate, endDate)
      )
      .reduce((sum, o) => {
        const item = o.items.find(i => i.id === productId);
        return sum + (item?.quantity || 0);
      }, 0);

    return Math.max(0, product.stock - committedQuantity);
  };

  const triggerEmailNotification = async (recipientEmail: string, subject: string, stage: string, context: string, order?: Order) => {
    try {
      const apiKey = process.env.API_KEY;
      let emailBody = "";

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Escribe un correo electrónico profesional y ejecutivo para ABSOLUTE COMPANY. 
        Contexto: ${context}. 
        Etapa: ${stage}. 
        Si es una cotización, asegúrate de mencionar que el detalle de los ítems está adjunto en la tabla superior.
        Políticas obligatorias a incluir al final:
        - La duración de esta cotización es de 15 días hábiles.
        - La oferta está sujeta a disponibilidad de insumos físicos.
        Suena muy corporativo y servicial.`;
        
        const response = await ai.models.generateContent({ 
          model: 'gemini-3-flash-preview', 
          contents: prompt 
        });
        emailBody = response.text || "";
      }

      if (!emailBody) {
        emailBody = `Estimado cliente, se ha registrado una actividad importante en su cuenta relacionada con ${context}.\n\nPolíticas:\n- Validez: 15 días hábiles.\n- Sujeto a disponibilidad de inventario.`;
      }

      if (user?.role === 'admin') {
        setSentEmail({
          to: recipientEmail,
          cc: ADMIN_EMAIL,
          subject: `ABSOLUTE: ${subject}`,
          body: emailBody,
          stage: stage,
          order: order
        });
      }
    } catch (err) {
      console.error("Error generating email:", err);
    }
  };

  const saveAndSync = async (type: 'orders' | 'inventory' | 'users' | 'all', newData: any) => {
    if (type === 'orders') setOrders(newData);
    if (type === 'inventory') setProducts(newData);
    if (type === 'users') setUsers(newData);
    await syncData({ type, data: newData, timestamp: new Date().toISOString(), updatedBy: user?.email });
  };

  const handleLogin = (email: string, password?: string) => {
    const lowerEmail = email.toLowerCase().trim();
    const foundUser = users.find(u => u.email.toLowerCase() === lowerEmail);
    if (foundUser) {
      if (foundUser.password && password && foundUser.password !== password) return { success: false, message: 'Contraseña incorrecta.' };
      if (foundUser.status === 'on-hold') return { success: false, message: 'Cuenta en espera. Contacte al administrador.' };
      setUser(foundUser);
      return { success: true };
    }
    return { success: false, message: 'Usuario no encontrado.' };
  };

  const handleRegister = (name: string, email: string, phone: string, password?: string) => {
    const lowerEmail = email.toLowerCase().trim();
    if (users.some(u => u.email.toLowerCase() === lowerEmail)) return false;
    const newUser: User = { name, email: lowerEmail, role: 'user', phone, status: 'on-hold', discountPercentage: 0, password };
    saveAndSync('users', [...users, newUser]);
    return true;
  };

  const handleUpdatePassword = (newPassword: string) => {
    if (!user) return;
    const updatedUsers = users.map(u => u.email === user.email ? { ...u, password: newPassword } : u);
    setUser({ ...user, password: newPassword });
    saveAndSync('users', updatedUsers);
  };

  const handleUpdateStage = (orderId: string, stageKey: WorkflowStageKey, data: StageData) => {
    const updatedOrders = orders.map(order => {
      if (order.id !== orderId) return order;
      const updatedWorkflow = { ...order.workflow, [stageKey]: data };
      let newStatus: OrderStatus = order.status;
      if (data.status === 'completed') {
        const stageLabels: Record<WorkflowStageKey, string> = {
          'bodega_check': 'Verificación en Bodega', 'bodega_to_coord': 'Salida a Tránsito',
          'coord_to_client': 'Entrega en el Evento', 'client_to_coord': 'Recogida de Equipos',
          'coord_to_bodega': 'Retorno a Bodega Central'
        };
        if (stageKey === 'bodega_check') newStatus = 'En Proceso';
        else if (stageKey === 'coord_to_client') newStatus = 'Entregado';
        else if (stageKey === 'coord_to_bodega') newStatus = 'Finalizado';
        triggerEmailNotification(order.userEmail, `Avance Logístico: ${order.id}`, stageLabels[stageKey], `Su pedido ha completado con éxito la etapa de ${stageLabels[stageKey]}.`, order);
      }
      return { ...order, status: newStatus, workflow: updatedWorkflow };
    });
    saveAndSync('orders', updatedOrders);
  };

  const handleConfirmQuote = (orderId: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId && order.status === 'Cotización') {
        let canConfirm = true;
        order.items.forEach(item => {
          const available = getAvailableStock(item.id, order.startDate, order.endDate);
          if (item.quantity > available) canConfirm = false;
        });
        if (!canConfirm) {
          alert("No se puede confirmar la cotización: El inventario ya no está disponible.");
          return order;
        }
        triggerEmailNotification(order.userEmail, `Confirmación de Cotización ${order.id}`, "Cotización Confirmada", "Su cotización ha sido confirmada y ahora es una reserva pendiente de despacho.", order);
        return { ...order, status: 'Pendiente' as OrderStatus };
      }
      return order;
    });
    saveAndSync('orders', updatedOrders);
  };

  const createOrder = (startDate: string, endDate: string, origin: string, destination: string, type: OrderType = 'rental') => {
    if (!user) return;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const days = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const orderId = `${type === 'quote' ? 'COT' : 'ORD'}-${String(orderCounter).padStart(4, '0')}`;
    const emptyStage: StageData = { status: 'pending', itemChecks: {}, photos: [], files: [] };
    const coordinators = users.filter(u => u.role === 'coordinator');
    const assignedCoord = coordinators[orderCounter % (coordinators.length || 1)];

    const newOrder: Order = {
      id: orderId, items: [...cart], userEmail: user.email, assignedCoordinatorEmail: assignedCoord?.email,
      status: type === 'quote' ? 'Cotización' : 'Pendiente', orderType: type,
      startDate, endDate, createdAt: new Date().toISOString(),
      originLocation: origin, destinationLocation: destination,
      totalAmount: cart.reduce((acc, item) => acc + (item.priceRent * item.quantity * days), 0) * (1 - (user.discountPercentage || 0) / 100),
      discountApplied: user.discountPercentage,
      workflow: { 'bodega_check': {...emptyStage}, 'bodega_to_coord': {...emptyStage}, 'coord_to_client': {...emptyStage}, 'client_to_coord': {...emptyStage}, 'coord_to_bodega': {...emptyStage} }
    };

    setOrderCounter(orderCounter + 1);
    saveAndSync('orders', [newOrder, ...orders]);
    setCart([]);
    triggerEmailNotification(user.email, `${type === 'quote' ? 'Nueva Cotización' : 'Nueva Reserva'}: ${orderId}`, type === 'quote' ? 'Cotización Registrada' : 'Creación de Reserva', `Se ha generado un documento de ${type === 'quote' ? 'cotización' : 'reserva'} para el evento en ${destination}.`, newOrder);
  };

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) } 
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const handleUpdateUserDetails = (email: string, details: Partial<User>) => {
    const updatedUsers = users.map(u => u.email === email ? { ...u, ...details } : u);
    saveAndSync('users', updatedUsers);
  };

  return (
    <HashRouter>
      {!user ? <Login onLogin={handleLogin} onRegister={handleRegister} /> : (
        <Layout user={user} cartCount={cart.length} onLogout={() => setUser(null)} syncStatus={{ isOnline, lastSync }} onChangePassword={() => setIsPasswordModalOpen(true)}>
          <Routes>
            <Route path="/" element={(user.role === 'logistics' || user.role === 'coordinator') ? <Navigate to="/orders" replace /> : <Catalog products={products} onAddToCart={handleAddToCart} />} />
            <Route path="/cart" element={(user.role === 'logistics' || user.role === 'coordinator') ? <Navigate to="/orders" replace /> : <Cart items={cart} currentUser={user} orders={orders} onRemove={(id) => setCart(prev => prev.filter(i => i.id !== id))} onUpdateQuantity={(id, q) => setCart(prev => prev.map(i => i.id === id ? {...i, quantity: Math.max(1, q)} : i))} onCheckout={createOrder} getAvailableStock={getAvailableStock} />} />
            <Route path="/orders" element={<div className="space-y-6"><h2 className="text-2xl font-black text-brand-900 uppercase">Reservas</h2><div className="grid gap-4">{orders.filter(o => user.role === 'admin' || user.role === 'logistics' || o.userEmail === user.email || o.assignedCoordinatorEmail === user.email).map(o => (<div key={o.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"><div className="flex items-center space-x-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${o.orderType === 'quote' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-900'}`}>{o.orderType === 'quote' ? 'Q' : 'R'}</div><div><span className="text-[10px] font-black text-slate-400 uppercase">REF: {o.id}</span><h4 className="font-black text-brand-900 uppercase text-sm">{o.destinationLocation}</h4></div></div><div className="flex items-center space-x-3 w-full md:w-auto justify-end"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${o.status === 'Finalizado' ? 'bg-green-50 text-green-700' : 'bg-brand-50 text-brand-900'}`}>{o.status}</span><div className="flex space-x-2"><Link to={`/tracking/${o.id}`} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center space-x-2"> <Eye size={14} /> <span>Detalles</span> </Link> {o.status === 'Cotización' && (<button onClick={() => handleConfirmQuote(o.id)} className="bg-brand-900 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase flex items-center space-x-2"> <CheckCircle size={14} /> <span>Confirmar</span> </button>)}</div></div></div>))}</div></div>} />
            <Route path="/tracking/:id" element={<Tracking orders={orders} onUpdateStage={handleUpdateStage} onConfirmQuote={handleConfirmQuote} currentUser={user} users={users} />} />
            <Route path="/admin" element={<AdminDashboard currentUser={user} products={products} orders={orders} users={users} onAddProduct={(p) => saveAndSync('inventory', [...products, p])} onUpdateProduct={(p) => saveAndSync('inventory', products.map(old => old.id === p.id ? p : old))} onDeleteProduct={(id) => saveAndSync('inventory', products.filter(p => p.id !== id))} onApproveOrder={(id) => saveAndSync('orders', orders.map(o => o.id === id ? {...o, status: 'En Proceso'} : o))} onCancelOrder={(id) => saveAndSync('orders', orders.map(o => o.id === id ? {...o, status: 'Cancelado'} : o))} onDeleteOrder={(id) => saveAndSync('orders', orders.filter(o => o.id !== id))} onUpdateOrderDates={() => {}} onChangeUserRole={(email, role) => saveAndSync('users', users.map(u => u.email === email ? {...u, role} : u))} onChangeUserDiscount={(email, disc) => saveAndSync('users', users.map(u => u.email === email ? {...u, discountPercentage: disc} : u))} onToggleUserStatus={(email) => saveAndSync('users', users.map(u => u.email === email ? {...u, status: u.status === 'active' ? 'on-hold' : 'active'} : u))} onDeleteUser={(email) => saveAndSync('users', users.filter(u => u.email !== email))} onUpdateStage={handleUpdateStage} onToggleUserRole={() => {}} onUpdateUserDetails={handleUpdateUserDetails} />} />
            <Route path="/logistics-map" element={<ServiceMap />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onUpdate={handleUpdatePassword} currentUser={user} />
        </Layout>
      )}
      {user?.role === 'admin' && <EmailNotification email={sentEmail} onClose={() => setSentEmail(null)} />}
    </HashRouter>
  );
};

export default App;
