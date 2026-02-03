
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
import { PRODUCTS } from './constants';
import { Package, User as UserIcon, ClipboardList, Trash2, XCircle, Calendar, FileText, CheckCircle, ArrowRight, UserCheck } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const COORDINATORS_POOL = [
  { email: 'coord1@absolute.com', name: 'Coordinador Zona Norte', role: 'coordinator', phone: '3100000001', status: 'active', discountPercentage: 0 },
  { email: 'coord2@absolute.com', name: 'Coordinador Zona Sur', role: 'coordinator', phone: '3100000002', status: 'active', discountPercentage: 0 },
  { email: 'coord3@absolute.com', name: 'Coordinador Zona Este', role: 'coordinator', phone: '3100000003', status: 'active', discountPercentage: 0 },
  { email: 'coord4@absolute.com', name: 'Coordinador Zona Oeste', role: 'coordinator', phone: '3100000004', status: 'active', discountPercentage: 0 },
  { email: 'coord5@absolute.com', name: 'Coordinador Eventos Especiales', role: 'coordinator', phone: '3100000005', status: 'active', discountPercentage: 0 },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sentEmail, setSentEmail] = useState<{ to: string, subject: string, body: string, stage: string } | null>(null);
  
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

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('absolute_users');
    if (saved) return JSON.parse(saved);
    
    return [
      { email: 'admin@absolute.com', name: 'Administrador Principal', role: 'admin', phone: '3101234567', status: 'active', discountPercentage: 0 },
      { email: 'logistics@absolute.com', name: 'Encargado Logística', role: 'logistics', phone: '3119876543', status: 'active', discountPercentage: 0 },
      { email: 'manager@absolute.com', name: 'Gerente de Operaciones', role: 'operations_manager', phone: '3151112233', status: 'active', discountPercentage: 0 },
      { email: 'user@absolute.com', name: 'Usuario Demo', role: 'user', phone: '3000000000', status: 'active', discountPercentage: 10 },
      ...(COORDINATORS_POOL as User[])
    ];
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

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

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
    const foundUser = users.find(u => u.email === email);
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
    if (users.some(u => u.email === email)) return false;
    const newUser: User = { name, email, role: 'user', phone, status: 'on-hold', discountPercentage: 0 };
    setUsers(prev => [...prev, newUser]);
    return true;
  };

  const handleToggleUserStatus = (email: string) => {
    setUsers(prev => prev.map(u => 
      u.email === email 
        ? { ...u, status: u.status === 'active' ? 'on-hold' : 'active' } 
        : u
    ));
  };

  const handleDeleteUser = (email: string) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      setUsers(prev => prev.filter(u => u.email !== email));
    }
  };

  const handleChangeUserDiscount = (email: string, discount: number) => {
    setUsers(prev => prev.map(u => u.email === email ? { ...u, discountPercentage: discount } : u));
  };

  const handleLogout = () => {
    setUser(null);
    setCart([]);
  };

  const notifyAdminOfOrder = async (order: Order, isConversion = false) => {
    try {
      const assignedCoord = users.find(u => u.email === order.assignedCoordinatorEmail);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const conversionText = isConversion ? "CONVERSIÓN DE COTIZACIÓN A RESERVA" : (order.orderType === 'quote' ? 'SOLICITUD DE COTIZACIÓN' : 'PEDIDO CONFIRMADO');
      const prompt = `Actúa como el sistema automatizado de ABSOLUTE. Genera un resumen ejecutivo para el ADMINISTRADOR sobre un nuevo ${conversionText}.
      ID: ${order.id}
      Cliente: ${user?.name} (${user?.email})
      Ciudad Destino: ${order.destinationLocation}
      Monto Total: $${order.totalAmount.toLocaleString()}
      Descuento Aplicado: ${order.discountApplied || 0}%
      Coordinador Asignado: ${assignedCoord?.name || 'Pendiente'} (${order.assignedCoordinatorEmail})
      Artículos: ${order.items.map(i => `${i.quantity}x ${i.name} (${i.type})`).join(', ')}
      
      El tono debe ser informativo, profesional y destacar si requiere acción inmediata.`;

      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setSentEmail({ 
        to: 'admin@absolute.com', 
        subject: `[ADMIN] ${isConversion ? '¡COTIZACIÓN CONFIRMADA!' : 'Nueva Actividad'} - ${order.id}`, 
        body: response.text || "Nueva actividad en el sistema.", 
        stage: isConversion ? 'Conversión Confirmada' : (order.orderType === 'quote' ? 'Cotización Recibida' : 'Pedido Nuevo')
      });

      // Notificar al coordinador asignado
      if (order.assignedCoordinatorEmail) {
        const coordPrompt = `Actúa como el sistema ABSOLUTE. Notifica al COORDINADOR ${assignedCoord?.name} que se le ha asignado un nuevo evento.
        ID Pedido: ${order.id}
        Destino: ${order.destinationLocation}
        Fechas: ${order.startDate} a ${order.endDate}
        Responsabilidad: Supervisión en campo y firmas de entrega/recepción.
        Por favor, redacta un mensaje corto y motivador de bienvenida al proyecto.`;

        const coordResponse = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: coordPrompt });
        setSentEmail({ 
          to: order.assignedCoordinatorEmail, 
          subject: `[ASIGNACIÓN] Nuevo Evento en Campo - ${order.id}`, 
          body: coordResponse.text || "Se le ha asignado un nuevo pedido para supervisión.", 
          stage: 'Asignación de Coordinador'
        });
      }
    } catch (err) {
      console.error("Error notifying admin:", err);
    }
  };

  const handleApproveOrder = (id: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        const updatedOrder = {
          ...o,
          orderType: 'purchase' as OrderType,
          status: 'En Proceso' as OrderStatus
        };
        
        // Notificación al cliente
        triggerEmailNotification(updatedOrder, 'bodega_check');
        
        return updatedOrder;
      }
      return o;
    }));
    alert(`Pedido ${id} aprobado con éxito.`);
  };

  const handleCancelOrder = (id: string) => {
    if (window.confirm('¿Está seguro de cancelar este pedido?')) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Cancelado' as OrderStatus } : o));
    }
  };

  const handleDeleteOrder = (id: string) => {
    if (window.confirm('¿Está seguro de eliminar definitivamente este registro?')) {
      setOrders(prev => prev.filter(o => o.id !== id));
    }
  };

  const handleConvertQuoteToOrder = (orderId: string) => {
    const quote = orders.find(o => o.id === orderId);
    if (!quote) return;

    for (const item of quote.items) {
      const avail = getAvailableStock(item.id, quote.startDate, quote.endDate);
      if (item.quantity > avail) {
        alert(`No es posible confirmar la reserva. El stock para "${item.name}" ya no está disponible para las fechas seleccionadas.`);
        return;
      }
    }

    if (!window.confirm("¿Está seguro de confirmar esta cotización como una reserva firme? Esto descontará los artículos del inventario.")) {
      return;
    }

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = {
          ...o,
          orderType: 'purchase' as OrderType,
          status: 'Pendiente' as OrderStatus
        };
        notifyAdminOfOrder(updated, true);
        return updated;
      }
      return o;
    }));

    setProducts(prev => prev.map(p => {
      const purchaseItem = quote.items.find(ci => ci.id === p.id && ci.type === 'Compra');
      return purchaseItem ? { ...p, stock: Math.max(0, p.stock - purchaseItem.quantity) } : p;
    }));
    
    alert(`¡Cotización ${orderId} convertida a reserva con éxito! El equipo de logística iniciará el proceso.`);
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Escribe un correo profesional para: ${order.id}, Etapa: ${stageLabels[stageKey]}. Tono corporativo ABSOLUTE.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setSentEmail({ to: order.userEmail, subject: `Actualización ABSOLUTE: ${order.id}`, body: response.text || "Su pedido ha avanzado.", stage: stageLabels[stageKey] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStage = (orderId: string, stageKey: WorkflowStageKey, data: StageData) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;

      const updatedWorkflow = {
        ...order.workflow,
        [stageKey]: data
      };

      let newStatus: OrderStatus = order.status;
      if (data.status === 'completed') {
        if (stageKey === 'bodega_check') newStatus = 'En Proceso';
        else if (stageKey === 'coord_to_client') newStatus = 'Entregado';
        else if (stageKey === 'coord_to_bodega') newStatus = 'Finalizado';
        
        triggerEmailNotification(order, stageKey);
      }

      return {
        ...order,
        status: newStatus,
        workflow: updatedWorkflow
      };
    }));
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, type: 'Alquiler' }];
    });
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

    const days = calculateDays(startDate, endDate);
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
    
    // Selección secuencial del coordinador
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
    
    notifyAdminOfOrder(newOrder);
  };

  return (
    <HashRouter>
      {!user ? (
        <Login onLogin={handleLogin} onRegister={handleRegister} />
      ) : (
        <Layout user={user} cartCount={cart.length} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Catalog products={products} onAddToCart={addToCart} />} />
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
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-brand-900 uppercase">Gestión de Reservas</h2>
                  <div className="flex space-x-2">
                    <span className="flex items-center text-[10px] font-black text-slate-400 uppercase"><div className="w-2 h-2 bg-brand-400 rounded-full mr-2"></div> Orden</span>
                    <span className="flex items-center text-[10px] font-black text-slate-400 uppercase"><div className="w-2 h-2 bg-amber-400 rounded-full mr-2"></div> Cotización</span>
                  </div>
                </div>
                <div className="grid gap-4">
                  {orders.filter(o => 
                    user.role === 'admin' || 
                    user.role === 'logistics' || 
                    user.role === 'operations_manager' || 
                    o.userEmail === user.email ||
                    o.assignedCoordinatorEmail === user.email
                  ).map(o => {
                    const isQuote = o.orderType === 'quote';
                    const assignedCoord = users.find(u => u.email === o.assignedCoordinatorEmail);
                    return (
                      <div key={o.id} className="block bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-4">
                            <div className={`p-4 rounded-3xl ${isQuote ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-900'}`}>
                              {isQuote ? <FileText size={24} /> : <ClipboardList size={24} />}
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">ID: {o.id} • {isQuote ? 'Cotización' : 'Pedido'}</span>
                              <h4 className="font-black text-brand-900 uppercase text-sm">{o.destinationLocation}</h4>
                              <p className="text-[9px] font-bold text-slate-400 mt-1">CREADO: {new Date(o.createdAt).toLocaleDateString()}</p>
                              {assignedCoord && (
                                <div className="mt-2 flex items-center bg-brand-50 px-2 py-1 rounded-lg w-fit">
                                  <UserCheck size={12} className="text-brand-900 mr-1.5" />
                                  <span className="text-[9px] font-black text-brand-900 uppercase tracking-tight">Coordinador: {assignedCoord.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right flex flex-col items-end gap-3">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${o.status === 'Finalizado' ? 'bg-green-50 text-green-700 border-green-100' : (isQuote ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-brand-50 text-brand-900 border-brand-100')}`}>
                              {o.status}
                            </span>
                            <div className="flex flex-col items-end">
                              <p className="text-lg font-black text-brand-900 leading-none">${o.totalAmount.toLocaleString()}</p>
                              {o.discountApplied ? (
                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1">Desc. Aplicado: {o.discountApplied}%</p>
                              ) : null}
                            </div>
                            
                            <div className="flex items-center space-x-2 mt-2">
                               {isQuote && (user.role === 'user' || user.role === 'admin') && (
                                 <button 
                                   onClick={(e) => { e.preventDefault(); handleConvertQuoteToOrder(o.id); }}
                                   className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center"
                                 >
                                   <CheckCircle size={14} className="mr-2" /> Confirmar Reserva
                                 </button>
                               )}
                               {!isQuote && (
                                 <Link to={`/tracking/${o.id}`} className="bg-brand-900 hover:bg-black text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center">
                                   Ver Tracking <ArrowRight size={14} className="ml-2" />
                                 </Link>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {orders.length === 0 && (
                    <div className="text-center py-20 opacity-30">
                       <Package size={48} className="mx-auto mb-4" />
                       <p className="text-sm font-black uppercase">No hay registros de pedidos</p>
                    </div>
                  )}
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
                onApproveOrder={handleApproveOrder} 
                onCancelOrder={handleCancelOrder}
                onDeleteOrder={handleDeleteOrder}
                onUpdateOrderDates={() => {}} 
                onChangeUserRole={(email, role) => setUsers(prev => prev.map(u => u.email === email ? {...u, role} : u))} 
                onChangeUserDiscount={handleChangeUserDiscount}
                onToggleUserStatus={handleToggleUserStatus} 
                onDeleteUser={handleDeleteUser} 
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
