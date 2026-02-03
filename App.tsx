
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, Product, CartItem, Order, OrderStatus, WorkflowStageKey, StageData, TransactionType, OrderType } from './types';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Catalog } from './components/Catalog';
import { Cart } from './components/Cart';
import { Tracking } from './components/Tracking';
import { AdminDashboard } from './components/AdminDashboard';
import { ServiceMap } from './components/ServiceMap';
import { EmailNotification } from './components/EmailNotification';
import { PRODUCTS, LOGO_URL } from './constants';
import { Package, User as UserIcon, ClipboardList, Trash2, XCircle, Calendar, FileText, CheckCircle, ArrowRight, UserCheck } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const DEFAULT_USERS: User[] = [
  { email: 'admin@absolute.com', name: 'Administrador Principal', role: 'admin', phone: '3101234567', status: 'active', discountPercentage: 0 },
  { email: 'logistics@absolute.com', name: 'Encargado Logística', role: 'logistics', phone: '3119876543', status: 'active', discountPercentage: 0 },
  { email: 'manager@absolute.com', name: 'Gerente de Operaciones', role: 'operations_manager', phone: '3151112233', status: 'active', discountPercentage: 0 },
  { email: 'user@absolute.com', name: 'Usuario Demo', role: 'user', phone: '3000000000', status: 'active', discountPercentage: 10 },
  { email: 'coord1@absolute.com', name: 'Coordinador Zona Norte', role: 'coordinator', phone: '3100000001', status: 'active', discountPercentage: 0 },
  { email: 'coord2@absolute.com', name: 'Coordinador Zona Sur', role: 'coordinator', phone: '3100000002', status: 'active', discountPercentage: 0 },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sentEmail, setSentEmail] = useState<{ to: string, subject: string, body: string, stage: string } | null>(null);
  
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('absolute_users');
    if (!saved) return DEFAULT_USERS;
    
    const parsed = JSON.parse(saved);
    // Asegurar que el admin siempre esté presente incluso si se borró localmente
    if (!parsed.some((u: User) => u.email === 'admin@absolute.com')) {
      return [...DEFAULT_USERS, ...parsed.filter((u: User) => !DEFAULT_USERS.some(du => du.email === u.email))];
    }
    return parsed;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('absolute_orders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [orderCounter, setOrderCounter] = useState<number>(() => {
    const saved = localStorage.getItem('absolute_order_counter');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [coordIndex, setCoordIndex] = useState<number>(() => {
    const saved = localStorage.getItem('absolute_coord_index');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('absolute_inventory');
    return saved ? JSON.parse(saved) : PRODUCTS;
  });

  useEffect(() => {
    localStorage.setItem('absolute_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('absolute_order_counter', orderCounter.toString());
  }, [orderCounter]);

  useEffect(() => {
    localStorage.setItem('absolute_coord_index', coordIndex.toString());
  }, [coordIndex]);

  useEffect(() => {
    localStorage.setItem('absolute_inventory', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('absolute_users', JSON.stringify(users));
  }, [users]);

  const getAvailableStock = useCallback((productId: string, startDate?: string, endDate?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    let baseStock = product.stock;
    if (!startDate || !endDate) return baseStock;
    const requestedStart = new Date(startDate).getTime();
    const requestedEnd = new Date(endDate).getTime();
    const rentedQuantity = orders.reduce((total, order) => {
      if (order.status === 'Cancelado' || order.status === 'Cotización') return total;
      const orderStart = new Date(order.startDate).getTime();
      const orderEnd = new Date(order.endDate).getTime();
      const overlaps = (requestedStart <= orderEnd && requestedEnd >= orderStart);
      if (overlaps) {
        const item = order.items.find(i => i.id === productId && i.type === 'Alquiler');
        return total + (item ? item.quantity : 0);
      }
      return total;
    }, 0);
    return Math.max(0, baseStock - rentedQuantity);
  }, [products, orders]);

  const handleLogin = (email: string) => {
    const lowerEmail = email.toLowerCase().trim();
    const foundUser = users.find(u => u.email.toLowerCase() === lowerEmail);
    if (foundUser) {
      if (foundUser.status === 'on-hold') {
        alert("Cuenta en espera. Contacte al administrador.");
        return false;
      }
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const handleRegister = (name: string, email: string, phone: string) => {
    const lowerEmail = email.toLowerCase().trim();
    if (users.some(u => u.email.toLowerCase() === lowerEmail)) return false;
    const newUser: User = { name, email: lowerEmail, role: 'user', phone, status: 'on-hold', discountPercentage: 0 };
    setUsers(prev => [...prev, newUser]);
    return true;
  };

  const handleUpdateStage = (orderId: string, stageKey: WorkflowStageKey, data: StageData) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const updatedWorkflow = { ...order.workflow, [stageKey]: data };
      let newStatus: OrderStatus = order.status;
      if (data.status === 'completed') {
        if (stageKey === 'bodega_check') newStatus = 'En Proceso';
        else if (stageKey === 'coord_to_client') newStatus = 'Entregado';
        else if (stageKey === 'coord_to_bodega') newStatus = 'Finalizado';
        triggerEmailNotification(order, stageKey);
      }
      return { ...order, status: newStatus, workflow: updatedWorkflow };
    }));
  };

  const triggerEmailNotification = async (order: Order, stageKey: WorkflowStageKey) => {
    const stageLabels: Record<WorkflowStageKey, string> = {
      'bodega_check': 'Verificación en Bodega',
      'bodega_to_coord': 'Salida a Tránsito',
      'coord_to_client': 'Entrega en el Evento',
      'client_to_coord': 'Recogida de Equipos',
      'coord_to_bodega': 'Retorno a Bodega Central'
    };
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        console.warn("No API_KEY found for AI notifications.");
        setSentEmail({ to: order.userEmail, subject: `Actualización ABSOLUTE: ${order.id}`, body: "Su pedido ha avanzado a la etapa: " + stageLabels[stageKey], stage: stageLabels[stageKey] });
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Escribe un correo profesional para: ${order.id}, Etapa: ${stageLabels[stageKey]}. Tono corporativo ABSOLUTE.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setSentEmail({ to: order.userEmail, subject: `Actualización ABSOLUTE: ${order.id}`, body: response.text || "Su pedido ha avanzado.", stage: stageLabels[stageKey] });
    } catch (err) {
      console.error(err);
    }
  };

  const createOrder = (startDate: string, endDate: string, destination: string, type: OrderType = 'purchase') => {
    if (!user) return;
    if (type === 'purchase') {
      for (const item of cart) {
        const avail = getAvailableStock(item.id, startDate, endDate);
        if (item.quantity > avail) {
          alert(`Stock insuficiente para ${item.name}. Disponibles: ${avail}`);
          return;
        }
      }
    }
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const subtotal = cart.reduce((acc, item) => {
      const unitPrice = item.type === 'Compra' ? item.priceSell : item.priceRent;
      const factor = item.type === 'Alquiler' ? days : 1;
      return acc + (unitPrice * item.quantity * factor);
    }, 0);
    const discountPerc = user.discountPercentage || 0;
    const totalAmount = subtotal * (1 - discountPerc / 100);
    const prefix = type === 'quote' ? 'COT' : 'ORD';
    const orderId = `${prefix}-${String(orderCounter).padStart(4, '0')}`;
    const emptyStage: StageData = { status: 'pending', itemChecks: {}, photos: [], files: [] };
    const coordinators = users.filter(u => u.role === 'coordinator');
    const assignedCoord = coordinators[coordIndex % coordinators.length];
    const newOrder: Order = {
      id: orderId,
      items: [...cart],
      userEmail: user.email,
      assignedCoordinatorEmail: assignedCoord?.email,
      status: type === 'quote' ? 'Cotización' : 'Pendiente',
      orderType: type,
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
      originLocation: 'Bogotá, Colombia',
      destinationLocation: destination,
      totalAmount,
      discountApplied: discountPerc,
      workflow: {
        'bodega_check': { ...emptyStage },
        'bodega_to_coord': { ...emptyStage },
        'coord_to_client': { ...emptyStage },
        'client_to_coord': { ...emptyStage },
        'coord_to_bodega': { ...emptyStage },
      }
    };
    if (type === 'purchase') {
      setProducts(prev => prev.map(p => {
        const purchaseItem = cart.find(ci => ci.id === p.id && ci.type === 'Compra');
        return purchaseItem ? { ...p, stock: Math.max(0, p.stock - purchaseItem.quantity) } : p;
      }));
    }
    setOrders(prev => [newOrder, ...prev]);
    setOrderCounter(prev => prev + 1);
    setCoordIndex(prev => prev + 1);
    setCart([]);
  };

  return (
    <HashRouter>
      {!user ? (
        <Login onLogin={handleLogin} onRegister={handleRegister} />
      ) : (
        <Layout user={user} cartCount={cart.length} onLogout={() => setUser(null)}>
          <Routes>
            <Route path="/" element={<Catalog products={products} onAddToCart={(p) => setCart(prev => [...prev, { ...p, quantity: 1, type: 'Alquiler' }])} />} />
            <Route path="/cart" element={
              <Cart 
                items={cart} 
                currentUser={user}
                onRemove={(id) => setCart(prev => prev.filter(i => i.id !== id))} 
                onUpdateQuantity={(id, q) => setCart(prev => prev.map(i => i.id === id ? {...i, quantity: Math.max(1, q)} : i))} 
                onUpdateType={(id, t) => setCart(prev => prev.map(i => i.id === id ? {...i, type: t} : i))} 
                onCheckout={createOrder} 
              />
            } />
            <Route path="/orders" element={
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-brand-900 uppercase">Gestión de Reservas</h2>
                <div className="grid gap-4">
                  {orders.filter(o => user.role === 'admin' || user.role === 'logistics' || o.userEmail === user.email || o.assignedCoordinatorEmail === user.email).map(o => (
                    <div key={o.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase">ID: {o.id}</span>
                        <h4 className="font-black text-brand-900 uppercase text-sm">{o.destinationLocation}</h4>
                        <p className="text-[9px] font-bold text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase bg-brand-50 text-brand-900 border border-brand-100">{o.status}</span>
                        <Link to={o.orderType === 'quote' ? '#' : `/tracking/${o.id}`} className="bg-brand-900 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase">Ver Tracking</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            } />
            <Route path="/tracking/:id" element={<Tracking orders={orders} onUpdateStage={handleUpdateStage} currentUser={user} users={users} />} />
            <Route path="/admin" element={
              <AdminDashboard 
                currentUser={user} 
                products={products} 
                orders={orders} 
                users={users} 
                onAddProduct={(p) => setProducts(prev => [...prev, p])} 
                onUpdateProduct={(p) => setProducts(prev => prev.map(old => old.id === p.id ? p : old))} 
                onDeleteProduct={(id) => setProducts(prev => prev.filter(p => p.id !== id))} 
                onApproveOrder={(id) => setOrders(prev => prev.map(o => o.id === id ? {...o, status: 'En Proceso'} : o))} 
                onCancelOrder={(id) => setOrders(prev => prev.map(o => o.id === id ? {...o, status: 'Cancelado'} : o))}
                onDeleteOrder={(id) => setOrders(prev => prev.filter(o => o.id !== id))}
                onUpdateOrderDates={() => {}} 
                onChangeUserRole={(email, role) => setUsers(prev => prev.map(u => u.email === email ? {...u, role} : u))} 
                onChangeUserDiscount={(email, disc) => setUsers(prev => prev.map(u => u.email === email ? {...u, discountPercentage: disc} : u))}
                onToggleUserStatus={(email) => setUsers(prev => prev.map(u => u.email === email ? {...u, status: u.status === 'active' ? 'on-hold' : 'active'} : u))} 
                onDeleteUser={(email) => setUsers(prev => prev.filter(u => u.email !== email))} 
                onUpdateStage={handleUpdateStage} 
                onToggleUserRole={() => {}}
              />
            } />
            <Route path="/logistics-map" element={<ServiceMap />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
      <EmailNotification email={sentEmail} onClose={() => setSentEmail(null)} />
    </HashRouter>
  );
};

export default App;
