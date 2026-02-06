
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
  { email: 'logistics@absolutecompany.co', password: 'absolute2024', name: 'Encargado Logística', role: 'logistics', phone: '3119876543', status: 'active', discountPercentage: 0 },
  { email: 'manager@absolutecompany.co', password: 'absolute2024', name: 'Gerente de Operaciones', role: 'operations_manager', phone: '3151112233', status: 'active', discountPercentage: 0 },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sentEmail, setSentEmail] = useState<{ to: string, cc: string, subject: string, body: string, stage: string } | null>(null);
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

  const triggerEmailNotification = async (recipientEmail: string, subject: string, stage: string, context: string) => {
    try {
      const apiKey = process.env.API_KEY;
      let emailBody = "Notificación automática de ABSOLUTE COMPANY.";

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Escribe un correo electrónico profesional y elegante para ABSOLUTE COMPANY. 
        Contexto: ${context}. 
        Etapa/Asunto: ${stage}. 
        Debe sonar ejecutivo, servicial y corporativo. Incluye despedida del equipo de ABSOLUTE.`;
        
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        emailBody = response.text || emailBody;
      }

      // Solo mostramos el editor si el usuario actual es administrador
      if (user?.role === 'admin') {
        setSentEmail({
          to: recipientEmail,
          cc: ADMIN_EMAIL,
          subject: `ABSOLUTE: ${subject}`,
          body: emailBody,
          stage: stage
        });
      } else {
        // Para no-admins, simulamos el envío en consola (o lo registramos en logs)
        console.log(`[Email Auto-Sent] To: ${recipientEmail}, Subject: ${subject}`);
      }
    } catch (err) {
      console.error("Error generating email:", err);
      if (user?.role === 'admin') {
        setSentEmail({
          to: recipientEmail,
          cc: ADMIN_EMAIL,
          subject: `ABSOLUTE: ${subject}`,
          body: `Se ha registrado una actividad importante en su cuenta: ${context}. Por favor verifique el portal.`,
          stage: stage
        });
      }
    }
  };

  const saveAndSync = async (type: 'orders' | 'inventory' | 'users' | 'all', newData: any) => {
    if (type === 'orders') setOrders(newData);
    if (type === 'inventory') setProducts(newData);
    if (type === 'users') setUsers(newData);
    
    await syncData({
      type,
      data: newData,
      timestamp: new Date().toISOString(),
      updatedBy: user?.email
    });
  };

  const handleLogin = (email: string, password?: string) => {
    const lowerEmail = email.toLowerCase().trim();
    const foundUser = users.find(u => u.email.toLowerCase() === lowerEmail);
    if (foundUser) {
      if (foundUser.password && password && foundUser.password !== password) {
        return { success: false, message: 'Contraseña incorrecta.' };
      }
      if (foundUser.status === 'on-hold') {
        return { success: false, message: 'Cuenta en espera. Contacte al administrador.' };
      }
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
    
    // El disparador intentará mostrar el editor si un admin lo está haciendo (ej. desde panel)
    // Pero si es un registro externo, solo lo enviaría silenciosamente
    triggerEmailNotification(
      lowerEmail, 
      "Registro Exitoso - Pendiente de Aprobación", 
      "Registro de Usuario", 
      `El usuario ${name} se ha registrado y espera aprobación.`
    );
    
    return true;
  };

  const handleUpdatePassword = (newPassword: string) => {
    if (!user) return;
    const updatedUsers = users.map(u => u.email === user.email ? { ...u, password: newPassword } : u);
    const updatedUser = { ...user, password: newPassword };
    setUser(updatedUser);
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
        
        triggerEmailNotification(
          order.userEmail, 
          `Avance Logístico: ${order.id}`, 
          stageLabels[stageKey], 
          `Su pedido ha completado con éxito la etapa de ${stageLabels[stageKey]}.`
        );
      }
      return { ...order, status: newStatus, workflow: updatedWorkflow };
    });
    saveAndSync('orders', updatedOrders);
  };

  const handleConfirmQuote = (orderId: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId && order.status === 'Cotización') {
        triggerEmailNotification(
          order.userEmail,
          `Confirmación de Cotización ${order.id}`,
          "Cotización Confirmada",
          "Su cotización ha sido confirmada y ahora es una reserva pendiente de despacho."
        );
        return { ...order, status: 'Pendiente' as OrderStatus };
      }
      return order;
    });
    saveAndSync('orders', updatedOrders);
  };

  const createOrder = (startDate: string, endDate: string, destination: string, type: OrderType = 'rental') => {
    if (!user) return;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const subtotal = cart.reduce((acc, item) => {
      return acc + (item.priceRent * item.quantity * days);
    }, 0);
    const discountPerc = user.discountPercentage || 0;
    const totalAmount = subtotal * (1 - discountPerc / 100);
    const orderId = `${type === 'quote' ? 'COT' : 'ORD'}-${String(orderCounter).padStart(4, '0')}`;
    
    const emptyStage: StageData = { status: 'pending', itemChecks: {}, photos: [], files: [] };
    const coordinators = users.filter(u => u.role === 'coordinator');
    const assignedCoord = coordinators[orderCounter % (coordinators.length || 1)];

    const newOrder: Order = {
      id: orderId, items: [...cart], userEmail: user.email, assignedCoordinatorEmail: assignedCoord?.email,
      status: type === 'quote' ? 'Cotización' : 'Pendiente', orderType: type,
      startDate, endDate, createdAt: new Date().toISOString(),
      originLocation: 'Bogotá, Colombia', destinationLocation: destination,
      totalAmount, discountApplied: discountPerc,
      workflow: { 'bodega_check': {...emptyStage}, 'bodega_to_coord': {...emptyStage}, 'coord_to_client': {...emptyStage}, 'client_to_coord': {...emptyStage}, 'coord_to_bodega': {...emptyStage} }
    };

    const nextCounter = orderCounter + 1;
    setOrderCounter(nextCounter);
    saveAndSync('orders', [newOrder, ...orders]);
    setCart([]);

    triggerEmailNotification(
      user.email,
      `${type === 'quote' ? 'Nueva Cotización' : 'Nueva Reserva'} Registrada: ${orderId}`,
      type === 'quote' ? 'Generación de Cotización' : 'Creación de Reserva',
      `Se ha generado un documento de ${type === 'quote' ? 'cotización' : 'reserva'} para el evento en ${destination}.`
    );
  };

  return (
    <HashRouter>
      {!user ? (
        <Login onLogin={handleLogin} onRegister={handleRegister} />
      ) : (
        <Layout 
          user={user} 
          cartCount={cart.length} 
          onLogout={() => setUser(null)}
          syncStatus={{ isOnline, lastSync }}
          onChangePassword={() => setIsPasswordModalOpen(true)}
        >
          <Routes>
            <Route path="/" element={<Catalog products={products} onAddToCart={(p) => setCart(prev => [...prev, { ...p, quantity: 1 }])} />} />
            <Route path="/cart" element={<Cart items={cart} currentUser={user} onRemove={(id) => setCart(prev => prev.filter(i => i.id !== id))} onUpdateQuantity={(id, q) => setCart(prev => prev.map(i => i.id === id ? {...i, quantity: Math.max(1, q)} : i))} onCheckout={createOrder} />} />
            <Route path="/orders" element={
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-brand-900 uppercase">Reservas</h2>
                </div>
                <div className="grid gap-4">
                  {orders.filter(o => user.role === 'admin' || user.role === 'logistics' || o.userEmail === user.email || o.assignedCoordinatorEmail === user.email).map(o => (
                    <div key={o.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${o.orderType === 'quote' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-900'}`}>
                          {o.orderType === 'quote' ? 'Q' : 'R'}
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase">REF: {o.id}</span>
                          <h4 className="font-black text-brand-900 uppercase text-sm leading-tight">{o.destinationLocation}</h4>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${o.status === 'Finalizado' ? 'bg-green-50 text-green-700 border-green-100' : o.status === 'Cotización' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-brand-50 text-brand-900 border-brand-100'}`}>{o.status}</span>
                        <div className="flex space-x-2">
                           <Link to={`/tracking/${o.id}`} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center space-x-2 hover:bg-slate-200 transition-all">
                              <Eye size={14} />
                              <span>Detalles</span>
                           </Link>
                           {o.status === 'Cotización' && (
                             <button onClick={() => handleConfirmQuote(o.id)} className="bg-brand-900 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase flex items-center space-x-2 shadow-lg">
                               <CheckCircle size={14} />
                               <span>Confirmar</span>
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            } />
            <Route path="/tracking/:id" element={<Tracking orders={orders} onUpdateStage={handleUpdateStage} onConfirmQuote={handleConfirmQuote} currentUser={user} users={users} />} />
            <Route path="/admin" element={
              <AdminDashboard 
                currentUser={user} products={products} orders={orders} users={users} 
                onAddProduct={(p) => saveAndSync('inventory', [...products, p])} 
                onUpdateProduct={(p) => saveAndSync('inventory', products.map(old => old.id === p.id ? p : old))} 
                onDeleteProduct={(id) => saveAndSync('inventory', products.filter(p => p.id !== id))} 
                onApproveOrder={(id) => saveAndSync('orders', orders.map(o => o.id === id ? {...o, status: 'En Proceso'} : o))} 
                onCancelOrder={(id) => saveAndSync('orders', orders.map(o => o.id === id ? {...o, status: 'Cancelado'} : o))}
                onDeleteOrder={(id) => saveAndSync('orders', orders.filter(o => o.id !== id))}
                onUpdateOrderDates={() => {}} 
                onChangeUserRole={(email, role) => saveAndSync('users', users.map(u => u.email === email ? {...u, role} : u))} 
                onChangeUserDiscount={(email, disc) => saveAndSync('users', users.map(u => u.email === email ? {...u, discountPercentage: disc} : u))}
                onToggleUserStatus={(email) => {
                  const updatedUsers = users.map(u => u.email === email ? {...u, status: u.status === 'active' ? 'on-hold' : 'active'} : u);
                  const targetedUser = updatedUsers.find(u => u.email === email);
                  if (targetedUser && targetedUser.status === 'active') {
                    triggerEmailNotification(
                      email, 
                      "Cuenta Activada con Éxito", 
                      "Activación de Cuenta", 
                      "Su cuenta ha sido aprobada por un administrador. Ya puede acceder a todas las funcionalidades de ABSOLUTE."
                    );
                  }
                  saveAndSync('users', updatedUsers);
                }} 
                onDeleteUser={(email) => saveAndSync('users', users.filter(u => u.email !== email))} 
                onUpdateStage={handleUpdateStage} onToggleUserRole={() => {}}
              />
            } />
            <Route path="/logistics-map" element={<ServiceMap />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onUpdate={handleUpdatePassword} currentUser={user} />
        </Layout>
      )}
      {/* Solo mostramos el editor si el rol es Admin */}
      {user?.role === 'admin' && <EmailNotification email={sentEmail} onClose={() => setSentEmail(null)} />}
    </HashRouter>
  );
};

export default App;
