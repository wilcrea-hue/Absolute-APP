
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Product, CartItem, Order, OrderStatus, WorkflowStageKey, StageData } from './types';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Catalog } from './components/Catalog';
import { Cart } from './components/Cart';
import { Tracking } from './components/Tracking';
import { AdminDashboard } from './components/AdminDashboard';
import { ServiceMap } from './components/ServiceMap';
import { EmailNotification } from './components/EmailNotification';
import { PRODUCTS } from './constants';
import { Package, MapPin, Navigation, ArrowRight, Map as MapIcon, User as UserIcon, ClipboardList } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sentEmail, setSentEmail] = useState<{ to: string, subject: string, body: string, stage: string } | null>(null);
  
  // --- Persisted States ---
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
    return saved ? JSON.parse(saved) : PRODUCTS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('absolute_users');
    return saved ? JSON.parse(saved) : [
      { email: 'admin@absolute.com', name: 'Administrador Principal', role: 'admin', phone: '3101234567' },
      { email: 'logistics@absolute.com', name: 'Encargado Logística', role: 'logistics', phone: '3119876543' },
      { email: 'user@absolute.com', name: 'Usuario Demo', role: 'user', phone: '3000000000' }
    ];
  });

  // --- Sync to LocalStorage ---
  useEffect(() => {
    localStorage.setItem('absolute_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('absolute_order_counter', orderCounter.toString());
  }, [orderCounter]);

  useEffect(() => {
    localStorage.setItem('absolute_inventory', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('absolute_users', JSON.stringify(users));
  }, [users]);

  // --- Auth Handlers ---
  const handleLogin = (email: string) => {
    const foundUser = users.find(u => u.email === email);
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const handleRegister = (name: string, email: string, phone: string) => {
    if (users.some(u => u.email === email)) {
      return false;
    }
    const newUser: User = { name, email, role: 'user', phone };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setUser(newUser);
    return true;
  };

  const handleLogout = () => {
    setUser(null);
    setCart([]);
  };

  // --- Email Simulation Logic with AI ---
  const triggerEmailNotification = async (order: Order, stageKey: WorkflowStageKey) => {
    const stageLabels: Record<WorkflowStageKey, string> = {
      'bodega_check': 'Verificación en Bodega',
      'bodega_to_coord': 'Salida a Tránsito',
      'coord_to_client': 'Entrega en el Evento',
      'client_to_coord': 'Recogida de Equipos',
      'coord_to_bodega': 'Retorno a Bodega Central'
    };

    const stageLabel = stageLabels[stageKey];
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Redacta un correo electrónico profesional y breve para un cliente de ABSOLUTE COMPANY. 
      Información clave:
      - Pedido: ${order.id}
      - Cliente: ${order.userEmail}
      - Etapa Alcanzada: ${stageLabel}
      - Ciudad del Evento: ${order.destinationLocation}
      
      El tono debe ser corporativo, eficiente y amable. Incluye una breve recomendación logística según la etapa. 
      No uses placeholders como [Nombre], intenta que sea un cuerpo de texto fluido.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      const bodyText = response.text || "Su pedido ha avanzado a la siguiente etapa.";
      
      setSentEmail({
        to: order.userEmail,
        subject: `Actualización ABSOLUTE: Pedido ${order.id} - ${stageLabel}`,
        body: bodyText,
        stage: stageLabel
      });

      // Auto-hide after 10 seconds if not clicked
      setTimeout(() => setSentEmail(null), 10000);
    } catch (err) {
      console.error("Error generating AI email:", err);
      // Fallback notification
      setSentEmail({
        to: order.userEmail,
        subject: `Actualización de Pedido ${order.id}`,
        body: `Su pedido ha cambiado al estado: ${stageLabel}. Por favor verifique el seguimiento en la plataforma.`,
        stage: stageLabel
      });
    }
  };

  // --- Inventory Handlers ---
  const handleAddProduct = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm("¿Está seguro de que desea eliminar este artículo del inventario?")) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleChangeUserRole = (email: string, newRole: 'admin' | 'user' | 'logistics') => {
    setUsers(prev => prev.map(u => u.email === email ? { ...u, role: newRole } : u));
    if (user && user.email === email) {
      setUser({ ...user, role: newRole });
    }
  };

  // --- Cart Handlers ---
  const addToCart = (product: Product) => {
    const currentProduct = products.find(p => p.id === product.id);
    if (!currentProduct || currentProduct.stock <= 0) {
      alert("No hay más stock disponible.");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...currentProduct, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setCart(prev => prev.map(item => id === item.id ? { ...item, quantity: qty } : item));
  };

  // --- Order Handlers ---
  const createOrder = (startDate: string, endDate: string, destination: string) => {
    if (!user) return;
    
    const orderNumber = `ORD-${String(orderCounter).padStart(4, '0')}`;
    const emptyStage: StageData = { status: 'pending', itemChecks: {}, photos: [], files: [] };
    
    const newOrder: Order = {
      id: orderNumber,
      items: [...cart],
      userEmail: user.email,
      status: 'Pendiente',
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
      originLocation: 'Bogotá, Colombia',
      destinationLocation: destination,
      workflow: {
        'bodega_check': { ...emptyStage },
        'bodega_to_coord': { ...emptyStage },
        'coord_to_client': { ...emptyStage },
        'client_to_coord': { ...emptyStage },
        'coord_to_bodega': { ...emptyStage },
      }
    };
    
    setProducts(prev => prev.map(p => {
      const cartItem = cart.find(ci => ci.id === p.id);
      if (cartItem) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      }
      return p;
    }));

    setOrders(prev => [newOrder, ...prev]);
    setOrderCounter(prev => prev + 1);
    setCart([]);
  };

  const handleUpdateStage = (orderId: string, stageKey: WorkflowStageKey, data: StageData) => {
    setOrders(prev => {
      const updatedOrders = prev.map(order => {
        if (order.id === orderId) {
          const updatedWorkflow = { ...order.workflow, [stageKey]: data };
          let newStatus: OrderStatus = order.status;
          
          if (updatedWorkflow.coord_to_bodega.status === 'completed') newStatus = 'Finalizado';
          else if (updatedWorkflow.coord_to_client.status === 'completed') newStatus = 'Entregado';
          else newStatus = 'En Proceso';

          const updatedOrder = { ...order, workflow: updatedWorkflow, status: newStatus };
          
          // Only trigger email if the stage was just completed
          if (data.status === 'completed' && order.workflow[stageKey].status !== 'completed') {
            triggerEmailNotification(updatedOrder, stageKey);
          }
          
          return updatedOrder;
        }
        return order;
      });
      return updatedOrders;
    });
  };

  const handleApproveOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'En Proceso' } : o));
  };

  if (!user) return <Login onLogin={handleLogin} onRegister={handleRegister} />;

  // Logic to filter orders for the view based on role
  const visibleOrders = orders.filter(o => 
    user.role === 'admin' || user.role === 'logistics' || o.userEmail === user.email
  );

  return (
    <HashRouter>
      <EmailNotification email={sentEmail} onClose={() => setSentEmail(null)} />
      <Layout user={user} cartCount={cart.reduce((a, b) => a + b.quantity, 0)} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Catalog products={products} onAddToCart={addToCart} />} />
          <Route path="/cart" element={<Cart items={cart} onRemove={removeFromCart} onUpdateQuantity={updateQuantity} onCheckout={createOrder} />} />
          <Route path="/orders" element={<OrdersList orders={visibleOrders} currentUser={user} />} />
          <Route path="/orders/:id" element={<Tracking orders={orders} onUpdateStage={handleUpdateStage} />} />
          <Route path="/admin" element={
            <AdminDashboard 
              currentUser={user} products={products} orders={orders} users={users}
              onAddProduct={handleAddProduct} 
              onUpdateProduct={handleUpdateProduct} 
              onDeleteProduct={handleDeleteProduct}
              onUpdateOrderDates={() => {}} 
              onApproveOrder={handleApproveOrder} 
              onToggleUserRole={() => {}} 
              onChangeUserRole={handleChangeUserRole}
              onUpdateStage={handleUpdateStage}
            />
          } />
          <Route path="/logistics-map" element={<ServiceMap />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

// Subcomponent for the list
const OrdersList: React.FC<{ orders: Order[], currentUser: User }> = ({ orders, currentUser }) => {
  const isAdminOrLogistics = currentUser.role === 'admin' || currentUser.role === 'logistics';

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed flex flex-col items-center">
        <Package className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-900">No hay pedidos registrados</h3>
        <p className="text-gray-500">
          {isAdminOrLogistics 
            ? "Aún no se han generado órdenes en el sistema global." 
            : "Todavía no has realizado ninguna reserva. ¡Ve al catálogo!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isAdminOrLogistics ? 'Gestión Global de Pedidos' : 'Mis Pedidos'}
          </h2>
          <p className="text-gray-500 text-sm">
            {isAdminOrLogistics 
              ? 'Vista completa de todas las operaciones logísticas.' 
              : 'Historial personal de tus solicitudes y eventos.'}
          </p>
        </div>
        <div className="bg-brand-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center">
          <ClipboardList size={16} className="mr-2" />
          {isAdminOrLogistics ? 'Total Sistema' : 'Mis Reservas'}: {orders.length}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-xl transition-all group border-l-4 border-l-brand-900">
            <div className="p-5 border-b bg-gray-50/50 flex justify-between items-start">
              <div>
                <span className="font-mono text-xs bg-brand-900 text-white px-2 py-1 rounded font-bold mb-2 inline-block">
                  {order.id}
                </span>
                <h3 className="font-bold text-gray-900">{order.destinationLocation}</h3>
                {isAdminOrLogistics && (
                  <p className="text-[10px] text-brand-600 font-bold flex items-center mt-1">
                    <UserIcon size={10} className="mr-1" /> {order.userEmail}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Registrado: {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                ${order.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : ''}
                ${order.status === 'En Proceso' ? 'bg-blue-100 text-blue-800' : ''}
                ${order.status === 'Finalizado' ? 'bg-green-100 text-green-800' : ''}
              `}>
                {order.status}
              </span>
            </div>

            <div className="p-5">
              <div className="flex items-center space-x-4 mb-4 text-xs">
                <div className="flex-1">
                  <p className="text-gray-400 font-bold uppercase text-[9px]">Salida</p>
                  <p className="font-medium text-gray-700">{order.startDate}</p>
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 font-bold uppercase text-[9px]">Retorno</p>
                  <p className="font-medium text-gray-700">{order.endDate}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                 <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Artículos en Orden</p>
                 <div className="flex flex-wrap gap-1">
                   {order.items.map(i => (
                     <span key={i.id} className="bg-white border text-[10px] px-2 py-0.5 rounded shadow-sm">
                       {i.name} (x{i.quantity})
                     </span>
                   ))}
                 </div>
              </div>

              <a 
                href={`#/orders/${order.id}`}
                className="w-full bg-brand-900 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl text-center hover:bg-brand-800 transition flex items-center justify-center space-x-2"
              >
                <Navigation size={14} />
                <span>Gestionar Seguimiento</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
