
import React, { useState, useMemo, useRef } from 'react';
import { Product, Order, User, WorkflowStageKey, StageData, Category, CartItem } from './types';
import { Package, Plus, Edit2, Trash2, CheckCircle, Lock, XCircle, DollarSign, UserCheck, Calendar, MapPin, ArrowRight, ClipboardList, FileText, X, Filter, RefreshCw, Bold, Italic, Sparkles, Loader2, List, Type } from 'lucide-react';
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
  onApproveOrder: (id: string) => void;
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

const CATEGORIES: Category[] = ['Mobiliario', 'Electrónica', 'Arquitectura Efímera', 'Decoración', 'Servicios'];

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
  const editorRef = useRef<HTMLDivElement>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [creationStart, setCreationStart] = useState('');
  const [creationEnd, setCreationEnd] = useState('');
  const [serviceStart, setServiceStart] = useState('');
  const [serviceEnd, setServiceEnd] = useState('');

  const isAdmin = currentUser.role === 'admin';
  const apiKey = process.env.API_KEY;

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

  const professionalizeDescription = async () => {
    const currentText = editorRef.current?.innerHTML || editForm.description || '';
    if (!currentText || isAiOptimizing || !apiKey) return;
    setIsAiOptimizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
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

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-[1.5rem] w-fit border border-slate-200">
          {isAdmin && <button onClick={() => setActiveTab('inventory')} className={`px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-brand-900 text-white shadow-xl' : 'text-slate-500'}`}>Inventario</button>}
          <button onClick={() => setActiveTab('orders')} className={`px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-brand-900 text-white shadow-xl' : 'text-slate-500'}`}>Pedidos</button>
          {isAdmin && <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-brand-900 text-white shadow-xl' : 'text-slate-500'}`}>Usuarios</button>}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl p-8 min-h-[500px]">
        {activeTab === 'inventory' && isAdmin && (
          <div>
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black text-brand-900 uppercase flex items-center"><Package size={18} className="mr-2" /> Artículos de Alquiler</h3>
                <button onClick={() => startEdit()} className="bg-brand-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center"><Plus size={16} className="mr-2" /> Nuevo</button>
             </div>
             <table className="w-full text-left">
                <thead className="bg-slate-50">
                    <tr className="border-b">
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Ítem</th>
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center">Tarifa Alquiler / día</th>
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
                <ClipboardList size={18} className="mr-2" /> Listado Maestro de Alquileres
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

                return (
                  <div key={order.id} className={`bg-white border rounded-[2rem] overflow-hidden transition-all duration-300 ${isExpanded ? 'border-brand-900 shadow-2xl scale-[1.01]' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
                    <div className="p-6 cursor-pointer" onClick={() => toggleExpandOrder(order.id)}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.orderType === 'quote' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-900'}`}>
                            {order.orderType === 'quote' ? <FileText size={20} /> : <Package size={20} />}
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">ID: {order.id} • {new Date(order.createdAt).toLocaleDateString()}</span>
                            <h4 className="font-black text-brand-900 uppercase text-sm flex items-center">
                              <MapPin size={12} className="mr-1 text-brand-400" /> {order.destinationLocation}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 w-full md:w-auto justify-between md:justify-end">
                           <div className="text-center md:text-right">
                             <p className="text-[9px] font-black text-slate-400 uppercase">Inversión Alquiler</p>
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="space-y-6">
                            <h5 className="text-[10px] font-black text-brand-900 uppercase tracking-widest border-b pb-2">Artículos Rentados</h5>
                            <div className="space-y-2">
                              {order.items.map((item: CartItem, idx: number) => (
                                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center space-x-3">
                                    <img src={item.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                    <span className="text-[11px] font-bold text-slate-700 uppercase">{item.name}</span>
                                  </div>
                                  <span className="text-[10px] font-black text-brand-900 bg-brand-50 px-2.5 py-1 rounded-lg">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-6">
                            <h5 className="text-[10px] font-black text-brand-900 uppercase tracking-widest border-b pb-2">Administración</h5>
                            {isAdmin && (
                              <div className="bg-brand-900 p-6 rounded-[2rem] shadow-xl space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  {isApprovable && (
                                    <button 
                                      onClick={() => onApproveOrder(order.id)}
                                      className="col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-2"
                                    >
                                      <CheckCircle size={16} />
                                      <span>Aprobar Reserva</span>
                                    </button>
                                  )}
                                  {canCancel && (
                                    <button 
                                      onClick={() => onCancelOrder?.(order.id)}
                                      className="col-span-2 bg-brand-800 hover:bg-red-600 text-brand-300 hover:text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-brand-700"
                                    >
                                      <XCircle size={16} className="inline mr-2" />
                                      <span>Anular</span>
                                    </button>
                                  )}
                                </div>
                                <div className="pt-2 text-center">
                                   <Link to={`/tracking/${order.id}`} className="text-[9px] font-black text-brand-400 hover:text-white uppercase tracking-widest flex items-center justify-center group">
                                     Ver detalles de seguimiento <ArrowRight size={10} className="ml-1 group-hover:translate-x-1 transition-transform" />
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
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full p-10 space-y-6 animate-in zoom-in duration-300">
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
                    {apiKey && (
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
                    <label className="text-[10px] font-black uppercase text-slate-400 flex items-center ml-1"><DollarSign size={10} className="mr-1" /> Tarifa Alquiler / día</label>
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
