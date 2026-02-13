
import React, { useState, useMemo, useRef } from 'react';
import { Product, Order, User, WorkflowStageKey, StageData, Category, CartItem } from './types';
import { Package, Plus, Edit2, Trash2, CheckCircle, Lock, XCircle, DollarSign, UserCheck, Calendar, MapPin, ArrowRight, ClipboardList, FileText, X, Filter, RefreshCw, Bold, Italic, Sparkles, Loader2, List, Type, UserPlus, Clock, Tags, Shield, TrendingUp, AlertTriangle, Layers, Phone, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserManagement } from './components/UserManagement';
import { GoogleGenAI } from "@google/genai";

interface AdminDashboardProps {
  currentUser: User;
  products: Product[];
  orders: Order[];
  users: User[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateOrderDates: (id: string, start: string, end: string) => void;
  onApproveOrder: (id: string, coordinatorEmail: string) => void;
  onCancelOrder?: (id: string) => void;
  onDeleteOrder?: (id: string) => void;
  onToggleUserRole: (email: string) => void;
  onChangeUserRole?: (email: string, newRole: User['role']) => void;
  onChangeUserDiscount: (email: string, discount: number) => void;
  onUpdateUserDetails?: (email: string, details: Partial<User>) => void;
  onToggleUserStatus?: (email: string) => void;
  onDeleteUser?: (email: string) => void;
  onUpdateStage: (orderId: string, stageKey: WorkflowStageKey, data: StageData) => void;
}

const CATEGORIES: Category[] = ['Mobiliario', 'Electrónica', 'Arquitectura Efímera', 'Decoración', 'Servicios', 'Impresión'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser, products, orders, users,
  onAddProduct, onUpdateProduct, onDeleteProduct,
  onApproveOrder, onCancelOrder, onDeleteOrder,
  onChangeUserRole, onChangeUserDiscount, onUpdateUserDetails, onToggleUserStatus, onDeleteUser,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'users'>(currentUser.role === 'admin' ? 'inventory' : 'orders');
  const [isEditingProduct, setIsEditingProduct] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);
  const [approvalCoord, setApprovalCoord] = useState<Record<string, string>>({});
  const editorRef = useRef<HTMLDivElement>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [creationStart, setCreationStart] = useState('');
  const [creationEnd, setCreationEnd] = useState('');
  const [serviceStart, setServiceStart] = useState('');
  const [serviceEnd, setServiceEnd] = useState('');

  const isAdmin = currentUser.role === 'admin';

  const coordinators = useMemo(() => users.filter(u => u.role === 'coordinator' && u.status === 'active'), [users]);
  const logisticsStaff = useMemo(() => users.filter(u => u.role === 'logistics' && u.status === 'active'), [users]);

  // ANALYTICS CALCULATIONS
  const stats = useMemo(() => {
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.priceRent * p.stock), 0);
    const pendingOrders = orders.filter(o => o.status === 'Pendiente' || o.status === 'Cotización').length;
    const criticalStock = products.filter(p => p.stock > 0 && p.stock <= 3).length;
    const activeOrders = orders.filter(o => o.status === 'En Proceso' || o.status === 'Entregado').length;
    
    return { totalInventoryValue, pendingOrders, criticalStock, activeOrders };
  }, [products, orders]);

  const startEdit = (product?: Product) => {
    if (product) {
      setIsEditingProduct(product.id);
      setEditForm(product);
    } else {
      setIsEditingProduct('new');
      setEditForm({ name: '', category: 'Mobiliario', description: '', image: '', stock: 10, priceRent: 0 });
    }
  };

  const saveProduct = () => {
    const finalDescription = editorRef.current?.innerHTML || editForm.description || '';
    if (!editForm.name || !editForm.category || !editForm.image) {
      alert("Complete los campos obligatorios.");
      return;
    }
    const productData = { ...editForm, description: finalDescription } as Product;
    if (isEditingProduct === 'new') onAddProduct({ ...productData, id: Math.random().toString(36).substr(2, 9) });
    else onUpdateProduct(productData);
    setIsEditingProduct(null);
  };

  const toggleExpandOrder = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const getTieredPrice = (item: CartItem, days: number) => {
    if (item.category !== 'Mobiliario') return item.priceRent;
    if (item.priceRent === 14000) {
      if (days <= 3) return 14800;
      if (days <= 5) return 17800;
      if (days <= 15) return 21400;
      return 25700;
    }
    const baseIPC = item.priceRent * 1.057;
    if (days <= 3) return baseIPC;
    if (days <= 5) return baseIPC * 1.20;
    if (days <= 15) return baseIPC * 1.44;
    return baseIPC * 1.73;
  };

  const professionalizeDescription = async () => {
    const currentText = editorRef.current?.innerHTML || editForm.description || '';
    if (!currentText || isAiOptimizing || !process.env.API_KEY) return;
    setIsAiOptimizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Actúa como un experto en marketing de eventos para ABSOLUTE COMPANY. 
      Optimiza la siguiente descripción de producto para que sea profesional, elegante y persuasiva. 
      MANTÉN EL FORMATO HTML (etiquetas b, i, ul, li) para resaltar características clave.
      Producto: ${editForm.name}
      Descripción original: "${currentText}"`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      if (response.text && editorRef.current) {
        const optimizedHtml = response.text.trim();
        editorRef.current.innerHTML = optimizedHtml;
        setEditForm({ ...editForm, description: optimizedHtml });
      }
    } catch (err) {
      console.error("AI Optimization Error:", err);
    } finally {
      setIsAiOptimizing(false);
    }
  };

  const execFormat = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (creationStart || creationEnd) {
        const orderDate = new Date(order.createdAt).getTime();
        if (creationStart && orderDate < new Date(creationStart).getTime()) return false;
        if (creationEnd) {
          const endDate = new Date(creationEnd);
          endDate.setDate(endDate.getDate() + 1);
          if (orderDate >= endDate.getTime()) return false;
        }
      }
      if (serviceStart || serviceEnd) {
        const orderStart = new Date(order.startDate).getTime();
        const orderEnd = new Date(order.endDate).getTime();
        if (serviceStart && orderEnd < new Date(serviceStart).getTime()) return false;
        if (serviceEnd && orderStart > new Date(serviceEnd).getTime()) return false;
      }
      return true;
    });
  }, [orders, creationStart, creationEnd, serviceStart, serviceEnd]);

  const clearFilters = () => {
    setCreationStart('');
    setCreationEnd('');
    setServiceStart('');
    setServiceEnd('');
  };

  const handleDeleteOrder = (orderId: string) => {
    if (window.confirm("¿Está seguro de eliminar este pedido permanentemente? Esta acción borrará todo el historial y no se puede deshacer.")) {
      onDeleteOrder?.(orderId);
    }
  };

  const handleApproveWithCoord = (orderId: string) => {
    const coordEmail = approvalCoord[orderId];
    if (!coordEmail) {
      alert("Debe seleccionar un coordinador responsable antes de aprobar.");
      return;
    }
    onApproveOrder(orderId, coordEmail);
  };

  return (
    <div className="space-y-6">
      {/* QUICK ANALYTICS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-500">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-3 text-brand-900/40 mb-2">
            <Layers size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Valor Inventario</span>
          </div>
          <p className="text-xl font-black text-brand-900">${stats.totalInventoryValue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-3 text-brand-900/40 mb-2">
            <ClipboardList size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Pendientes</span>
          </div>
          <p className="text-xl font-black text-brand-900">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-3 text-amber-500 mb-2">
            <AlertTriangle size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Stock Crítico</span>
          </div>
          <p className="text-xl font-black text-amber-600">{stats.criticalStock}</p>
        </div>
        <div className="bg-brand-900 p-6 rounded-[2rem] shadow-xl text-white">
          <div className="flex items-center space-x-3 text-brand-400 mb-2">
            <TrendingUp size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-400">En Curso</span>
          </div>
          <p className="text-xl font-black">{stats.activeOrders}</p>
        </div>
      </div>

      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-[1.5rem] w-fit border border-slate-200">
          {isAdmin && <button onClick={() => setActiveTab('inventory')} className={`px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-brand-900 text-white shadow-xl' : 'text-slate-500'}`}>Inventario</button>}
          <button onClick={() => setActiveTab('orders')} className={`px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-brand-900 text-white shadow-xl' : 'text-slate-500'}`}>Pedidos</button>
          {isAdmin && <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-brand-900 text-white shadow-xl' : 'text-slate-500'}`}>Usuarios</button>}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl p-8 min-h-[500px]">
        {activeTab === 'inventory' && isAdmin && (
          <div>
             <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-sm font-black text-brand-900 uppercase flex items-center"><Package size={18} className="mr-2" /> Artículos de Alquiler</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Todos los valores expresados fuera de IVA</p>
                </div>
                <button onClick={() => startEdit()} className="bg-brand-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center"><Plus size={16} className="mr-2" /> Nuevo</button>
             </div>
             <table className="w-full text-left">
                <thead className="bg-slate-50">
                    <tr className="border-b">
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Ítem</th>
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center">Tarifa Alquiler (Antes IVA)</th>
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center">Stock</th>
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-right">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-5">
                                <div className="flex items-center space-x-4">
                                    <img src={p.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                                    <span className="font-bold text-sm">{p.name}</span>
                                </div>
                            </td>
                            <td className="p-5 text-center text-sm font-black text-brand-900">${p.priceRent?.toLocaleString()}</td>
                            <td className="p-5 text-center font-black text-brand-900">{p.stock}</td>
                            <td className="p-5 text-right space-x-2">
                                <button onClick={() => startEdit(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                <button onClick={() => onDeleteProduct(p.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest flex items-center">
                <ClipboardList size={18} className="mr-2" /> Listado Maestro de Alquileres (Precios + IVA)
              </h3>
              <div className="flex items-center space-x-3">
                 <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showFilters ? 'bg-brand-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                 >
                   <Filter size={14} />
                   <span>Filtros { (creationStart || creationEnd || serviceStart || serviceEnd) && '•' }</span>
                 </button>
                 {(creationStart || creationEnd || serviceStart || serviceEnd) && (
                   <button 
                    onClick={clearFilters}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Limpiar Filtros"
                   >
                     <RefreshCw size={14} />
                   </button>
                 )}
              </div>
            </div>

            {showFilters && (
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-widest flex items-center">
                    <Calendar size={12} className="mr-2" /> Fecha de Creación (Registro)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Desde</label>
                      <input type="date" value={creationStart} onChange={e => setCreationStart(e.target.value)} className="w-full bg-white p-3 rounded-xl font-bold text-[11px] border border-slate-200 focus:ring-1 focus:ring-brand-900 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Hasta</label>
                      <input type="date" value={creationEnd} onChange={e => setCreationEnd(e.target.value)} className="w-full bg-white p-3 rounded-xl font-bold text-[11px] border border-slate-200 focus:ring-1 focus:ring-brand-900 outline-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-widest flex items-center">
                    <MapPin size={12} className="mr-2" /> Fechas de Servicio (Evento)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Desde</label>
                      <input type="date" value={serviceStart} onChange={e => setServiceStart(e.target.value)} className="w-full bg-white p-3 rounded-xl font-bold text-[11px] border border-slate-200 focus:ring-1 focus:ring-brand-900 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Hasta</label>
                      <input type="date" value={serviceEnd} onChange={e => setServiceEnd(e.target.value)} className="w-full bg-white p-3 rounded-xl font-bold text-[11px] border border-slate-200 focus:ring-1 focus:ring-brand-900 outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {filteredOrders.length > 0 ? filteredOrders.map(order => {
                const isExpanded = expandedOrders.has(order.id);
                const isApprovable = isAdmin && (order.status === 'Pendiente' || order.status === 'Cotización');
                const canCancel = isAdmin && order.status !== 'Cancelado' && order.status !== 'Finalizado';
                const clientUser = users.find(u => u.email === order.userEmail);
                const assignedCoord = users.find(u => u.email === order.assignedCoordinatorEmail);
                const warehouseLead = logisticsStaff[0]; // Assuming first logistics is lead
                const eventDays = calculateDays(order.startDate, order.endDate);

                return (
                  <div key={order.id} className={`bg-white border rounded-[2rem] overflow-hidden transition-all duration-300 ${isExpanded ? 'border-brand-900 shadow-2xl scale-[1.01]' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
                    <div className="p-6 cursor-pointer" onClick={() => toggleExpandOrder(order.id)}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.orderType === 'quote' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-900'}`}>
                            {order.orderType === 'quote' ? <FileText size={20} /> : <Package size={20} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">ID: {order.id} • {new Date(order.createdAt).toLocaleDateString()}</span>
                               {clientUser && (
                                 <span className="text-[8px] font-black text-brand-900 bg-brand-50 px-2 py-0.5 rounded-lg uppercase tracking-tighter flex items-center border border-brand-100">
                                   <UserIcon size={10} className="mr-1" /> {clientUser.name} | {clientUser.phone}
                                 </span>
                               )}
                            </div>
                            <h4 className="font-black text-brand-900 uppercase text-sm flex items-center">
                              <MapPin size={12} className="mr-1 text-brand-400" /> {order.destinationLocation}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 w-full md:w-auto justify-between md:justify-end">
                           <div className="text-center md:text-right">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inversión (Sin IVA)</p>
                             <p className="text-sm font-black text-brand-900">${order.totalAmount.toLocaleString()}</p>
                           </div>
                           <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${order.status === 'Finalizado' ? 'bg-green-50 text-green-700 border-green-100' : order.status === 'Cancelado' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-brand-50 text-brand-900 border-brand-100'}`}>
                             {order.status}
                           </span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-8 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                          <div className="lg:col-span-8 space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                              <h5 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center">
                                <List size={14} className="mr-2" /> Detalle Técnico (Sin IVA)
                              </h5>
                              <div className="flex items-center text-[9px] font-black text-slate-400 uppercase bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                                <Clock size={10} className="mr-1.5" /> Permanencia: {eventDays} {eventDays === 1 ? 'día' : 'días'}
                              </div>
                            </div>
                            
                            <div className="overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm">
                              <table className="w-full text-left">
                                <thead className="bg-slate-50">
                                  <tr>
                                    <th className="p-4 text-[8px] font-black text-slate-400 uppercase">Artículo / Categoría</th>
                                    <th className="p-4 text-[8px] font-black text-slate-400 uppercase text-center">Tarifa Unit.</th>
                                    <th className="p-4 text-[8px] font-black text-slate-400 uppercase text-center">Cant.</th>
                                    <th className="p-4 text-[8px] font-black text-slate-400 uppercase text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {order.items.map((item: CartItem, idx: number) => {
                                    const unitPrice = getTieredPrice(item, eventDays);
                                    const lineSubtotal = unitPrice * item.quantity * (item.category === 'Mobiliario' ? 1 : eventDays);
                                    
                                    return (
                                      <tr key={idx} className="hover:bg-brand-50/20 transition-colors">
                                        <td className="p-4">
                                          <div className="flex items-center space-x-3">
                                            <img src={item.image} className="w-10 h-10 rounded-xl object-cover shadow-sm" alt="" />
                                            <div className="overflow-hidden">
                                              <p className="text-[11px] font-black text-slate-700 uppercase truncate">{item.name}</p>
                                              <p className="text-[7px] font-bold text-brand-500 uppercase tracking-widest">{item.category}</p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-4 text-center">
                                          <span className="text-[10px] font-black text-slate-600">${unitPrice.toLocaleString()}</span>
                                          {item.category === 'Mobiliario' && (
                                            <span className="block text-[6px] font-black text-brand-400 uppercase tracking-tighter">Plan Escalonado</span>
                                          )}
                                        </td>
                                        <td className="p-4 text-center">
                                          <span className="text-[10px] font-black text-brand-900 bg-slate-100 px-2 py-1 rounded-lg">x{item.quantity}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                          <span className="text-[11px] font-black text-brand-900">${lineSubtotal.toLocaleString()}</span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            
                            {/* SECCIÓN DE CONTACTOS DE OPERACIÓN */}
                            <div className="space-y-4">
                               <h5 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center">
                                 <Phone size={14} className="mr-2" /> Directorio de la Operación
                               </h5>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {clientUser && (
                                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group">
                                      <p className="text-[8px] font-black text-brand-500 uppercase tracking-widest mb-2">Cliente / Solicitante</p>
                                      <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-900"><UserIcon size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[11px] font-black text-slate-800 uppercase truncate">{clientUser.name}</p>
                                          <p className="text-[10px] font-bold text-slate-400">{clientUser.phone}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {warehouseLead && (
                                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group">
                                      <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mb-2">Jefe de Bodega</p>
                                      <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600"><Package size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[11px] font-black text-slate-800 uppercase truncate">{warehouseLead.name}</p>
                                          <p className="text-[10px] font-bold text-slate-400">{warehouseLead.phone}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {assignedCoord && (
                                    <div className="p-4 bg-white rounded-2xl border border-[#4fb7f7]/20 shadow-sm group">
                                      <p className="text-[8px] font-black text-[#4fb7f7] uppercase tracking-widest mb-2">Coordinador Asignado</p>
                                      <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-[#4fb7f7]/10 rounded-xl flex items-center justify-center text-[#4fb7f7]"><UserCheck size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[11px] font-black text-slate-800 uppercase truncate">{assignedCoord.name}</p>
                                          <p className="text-[10px] font-bold text-slate-400">{assignedCoord.phone}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                               </div>
                            </div>
                          </div>
                          
                          <div className="lg:col-span-4 space-y-6">
                            <h5 className="text-[10px] font-black text-brand-900 uppercase tracking-widest border-b border-slate-200 pb-3 flex items-center">
                              <Shield size={14} className="mr-2" /> Panel Administrativo
                            </h5>
                            {isAdmin && (
                              <div className="bg-brand-900 p-8 rounded-[2.5rem] shadow-2xl space-y-5 border border-white/5 relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-400/5 rounded-full blur-3xl group-hover:bg-brand-400/10 transition-all duration-700"></div>
                                
                                {isApprovable && (
                                  <div className="space-y-4 mb-4 relative z-10">
                                    <div className="space-y-2">
                                      <label className="text-[9px] font-black uppercase text-brand-400 ml-1 flex items-center tracking-widest">
                                        <UserPlus size={10} className="mr-1.5" /> Adjudicar Coordinador de Campo
                                      </label>
                                      <select 
                                        value={approvalCoord[order.id] || ''}
                                        onChange={(e) => setApprovalCoord({...approvalCoord, [order.id]: e.target.value})}
                                        className="w-full bg-brand-800 border-0 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest focus:ring-2 focus:ring-brand-400 outline-none shadow-inner"
                                      >
                                        <option value="">Seleccione Responsable...</option>
                                        {coordinators.map(c => <option key={c.email} value={c.email}>{c.name} | {c.phone}</option>)}
                                      </select>
                                    </div>
                                    <button 
                                      onClick={() => handleApproveWithCoord(order.id)}
                                      className="w-full bg-[#4fb7f7] hover:bg-[#3ea0e6] text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center space-x-2 shadow-xl shadow-[#4fb7f7]/20 active:scale-95"
                                    >
                                      <CheckCircle size={18} />
                                      <span>Aprobar y Asignar</span>
                                    </button>
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-1 gap-3 relative z-10">
                                  {canCancel && (
                                    <button 
                                      onClick={() => onCancelOrder?.(order.id)}
                                      className="w-full bg-brand-800 hover:bg-red-600 text-brand-300 hover:text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-brand-700 flex items-center justify-center space-x-2"
                                    >
                                      <XCircle size={16} />
                                      <span>Anular Reserva</span>
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="w-full bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-red-200/50 flex items-center justify-center space-x-2"
                                  >
                                    <Trash2 size={16} />
                                    <span>Eliminar Registro</span>
                                  </button>
                                </div>
                                <div className="pt-4 text-center border-t border-white/5 relative z-10">
                                   <Link to={`/tracking/${order.id}`} className="text-[9px] font-black text-brand-400 hover:text-white uppercase tracking-[0.3em] flex items-center justify-center group transition-colors">
                                     Rastrear Logística <ArrowRight size={10} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
                                   </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="py-20 text-center space-y-4">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                      <XCircle size={32} />
                   </div>
                   <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin resultados</h4>
                   <button onClick={clearFilters} className="text-[10px] font-black text-brand-900 uppercase border-b border-brand-900 pb-1">Limpiar Filtros</button>
                </div>
              )}
            </div>
          </div>
        )}

        {isEditingProduct && (
          <div className="fixed inset-0 bg-brand-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full p-10 space-y-6 animate-in zoom-in duration-300 overflow-hidden">
                <div className="flex justify-between items-center border-b pb-6">
                  <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest flex items-center">
                    <Edit2 size={18} className="mr-2" /> {isEditingProduct === 'new' ? 'Nuevo Artículo' : 'Editor de Artículo'}
                  </h3>
                  <button onClick={() => setIsEditingProduct(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Comercial</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border-0 focus:ring-2 focus:ring-brand-900 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Categoría</label>
                    <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value as Category})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border-0 focus:ring-2 focus:ring-brand-900 outline-none">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 flex items-center">
                      <Type size={12} className="mr-2" /> Descripción Enriquecida
                    </label>
                    {process.env.API_KEY && (
                      <button 
                        onClick={professionalizeDescription}
                        disabled={isAiOptimizing}
                        className="text-[9px] font-black text-brand-500 uppercase flex items-center space-x-2 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100 hover:bg-brand-900 hover:text-white transition-all disabled:opacity-30 shadow-sm"
                      >
                        {isAiOptimizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        <span>Absolute AI: Optimizar</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="border border-slate-200 rounded-[2rem] overflow-hidden bg-slate-50/50 group focus-within:border-brand-900 transition-all">
                    <div className="bg-white/80 backdrop-blur-sm p-3 flex items-center space-x-2 border-b border-slate-200">
                      <button type="button" onClick={() => execFormat('bold')} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-all active:scale-90" title="Negrita"><Bold size={16} /></button>
                      <button type="button" onClick={() => execFormat('italic')} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-all active:scale-90" title="Cursiva"><Italic size={16} /></button>
                      <div className="w-px h-6 bg-slate-200 mx-1" />
                      <button type="button" onClick={() => execFormat('insertUnorderedList')} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-all active:scale-90" title="Lista"><List size={16} /></button>
                    </div>
                    <div ref={editorRef} contentEditable onBlur={() => editorRef.current && setEditForm({ ...editForm, description: editorRef.current.innerHTML })} dangerouslySetInnerHTML={{ __html: editForm.description || '' }} className="min-h-[160px] p-8 text-sm font-medium text-slate-700 outline-none leading-relaxed prose prose-sm max-w-none focus:bg-white transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 flex items-center ml-1"><DollarSign size={10} className="mr-1" /> Tarifa Alquiler (Antes IVA)</label>
                    <input type="number" value={editForm.priceRent} onChange={e => setEditForm({...editForm, priceRent: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-sm border-0 focus:ring-2 focus:ring-brand-900 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Stock Físico</label>
                    <input type="number" value={editForm.stock} onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-sm border-0 focus:ring-2 focus:ring-brand-900 outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">URL de Imagen de Alta Resolución</label>
                  <input type="text" value={editForm.image} onChange={e => setEditForm({...editForm, image: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border-0 focus:ring-2 focus:ring-brand-900 outline-none" />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                  <button onClick={() => setIsEditingProduct(null)} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all">Cancelar</button>
                  <button onClick={saveProduct} className="px-10 py-4 bg-brand-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95">Guardar Cambios</button>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <UserManagement 
            users={users} 
            currentUser={currentUser} 
            onChangeUserRole={onChangeUserRole!} 
            onChangeUserDiscount={onChangeUserDiscount}
            onUpdateUserDetails={onUpdateUserDetails}
            onToggleStatus={onToggleUserStatus} 
            onDeleteUser={onDeleteUser} 
          />
        )}
      </div>
    </div>
  );
};
