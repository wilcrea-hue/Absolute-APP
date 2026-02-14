
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Order, User, WorkflowStageKey, StageData, Category } from './types';
import { Package, Plus, Edit2, Trash2, X, Filter, ChevronRight, ClipboardList, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserManagement } from './components/UserManagement';

interface AdminDashboardProps {
  currentUser: User;
  products: Product[];
  orders: Order[];
  users: User[];
  initialTab?: 'inventory' | 'orders' | 'users';
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

export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  // Desestructuración defensiva: si alguna prop falta, evitamos el crash
  const {
    currentUser, 
    products = [], 
    orders = [], 
    users = [], 
    initialTab = 'orders',
    onAddProduct, 
    onUpdateProduct, 
    onDeleteProduct,
    onApproveOrder, 
    onCancelOrder, 
    onDeleteOrder,
    onChangeUserRole, 
    onChangeUserDiscount, 
    onUpdateUserDetails, 
    onToggleUserStatus, 
    onDeleteUser
  } = props;

  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'users'>(initialTab);
  
  // Sincronizar tab si cambia externamente
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const [isEditingProduct, setIsEditingProduct] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [approvalCoord, setApprovalCoord] = useState<Record<string, string>>({});

  // Estadísticas blindadas contra nulos
  const stats = useMemo(() => {
    try {
      const pArr = Array.isArray(products) ? products : [];
      const oArr = Array.isArray(orders) ? orders : [];
      
      return {
        totalValue: pArr.reduce((acc, p) => acc + ((p?.priceRent || 0) * (p?.stock || 0)), 0),
        pending: oArr.filter(o => o?.status === 'Pendiente' || o?.status === 'Cotización').length,
        critical: pArr.filter(p => p?.stock > 0 && p?.stock <= 3).length,
        active: oArr.filter(o => o?.status === 'En Proceso' || o?.status === 'Entregado').length
      };
    } catch (e) {
      console.error("Fallo en cálculo de estadísticas", e);
      return { totalValue: 0, pending: 0, critical: 0, active: 0 };
    }
  }, [products, orders]);

  const coordinators = useMemo(() => 
    users.filter(u => u && u.role === 'coordinator' && u.status === 'active'), [users]
  );

  if (!currentUser) return <div className="p-20 text-center font-black">ERROR: SESIÓN NO VÁLIDA</div>;

  const saveProduct = () => {
    if (!editForm.name || !editForm.category || !editForm.image) return alert("Campos obligatorios faltantes.");
    if (isEditingProduct === 'new') onAddProduct({ ...editForm, id: Math.random().toString(36).substr(2, 9) } as Product);
    else onUpdateProduct(editForm as Product);
    setIsEditingProduct(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Cards de Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isAdmin && (
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Valor Inventario</span>
            <p className="text-xl font-black text-brand-900">${stats.totalValue.toLocaleString()}</p>
          </div>
        )}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Pendientes</span>
          <p className="text-xl font-black text-brand-900">{stats.pending}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <span className="text-[9px] font-black uppercase text-amber-500 block mb-1">Stock Crítico</span>
          <p className="text-xl font-black text-amber-600">{stats.critical}</p>
        </div>
        <div className="bg-brand-900 p-6 rounded-[2rem] shadow-xl text-white">
          <span className="text-[9px] font-black uppercase text-brand-400 block mb-1">En Curso</span>
          <p className="text-xl font-black">{stats.active}</p>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-[1.5rem] w-fit border border-slate-200">
          {isAdmin && (
            <button onClick={() => setActiveTab('inventory')} className={`px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-brand-900 text-white shadow-xl' : 'text-slate-500'}`}>
              Inventario
            </button>
          )}
          <button onClick={() => setActiveTab('orders')} className={`px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-brand-900 text-white shadow-xl' : 'text-slate-500'}`}>
            Pedidos
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-brand-900 text-white shadow-xl' : 'text-slate-500'}`}>
              Usuarios
            </button>
          )}
      </div>

      {/* Contenido Dinámico */}
      <div className="bg-white rounded-[2.5rem] shadow-xl p-8 min-h-[500px]">
        {activeTab === 'inventory' && isAdmin && (
          <div className="animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black text-brand-900 uppercase">Gestión de Inventario</h3>
                <button onClick={() => { setIsEditingProduct('new'); setEditForm({ name: '', category: 'Mobiliario', description: '', image: '', stock: 10, priceRent: 0 }); }} className="bg-brand-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center"><Plus size={16} className="mr-2" /> Nuevo</button>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50">
                      <tr className="border-b">
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ítem</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center tracking-widest">Tarifa</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center tracking-widest">Stock</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-right tracking-widest">Acción</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {(products || []).filter(p => p && p.id).map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="p-5">
                                  <div className="flex items-center space-x-4">
                                      <img src={p.image} className="w-10 h-10 rounded-lg object-cover bg-slate-100" alt="" />
                                      <span className="font-bold text-sm text-slate-800">{p.name}</span>
                                  </div>
                              </td>
                              <td className="p-5 text-center text-sm font-black text-brand-900">${(p.priceRent || 0).toLocaleString()}</td>
                              <td className="p-5 text-center font-black text-brand-900">{p.stock || 0}</td>
                              <td className="p-5 text-right space-x-2">
                                  <button onClick={() => { setIsEditingProduct(p.id); setEditForm(p); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                  <button onClick={() => onDeleteProduct(p.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest flex items-center"><ClipboardList size={18} className="mr-2" /> Listado de Pedidos</h3>
            <div className="space-y-4">
              {(orders || []).filter(o => o && o.id).map(order => {
                const isExpanded = expandedOrders.has(order.id);
                const client = users.find(u => u && u.email === order.userEmail);
                return (
                  <div key={order.id} className={`bg-white border rounded-[2rem] overflow-hidden ${isExpanded ? 'border-brand-900 shadow-lg' : 'border-slate-100 shadow-sm'}`}>
                    <div className="p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4" onClick={() => { setExpandedOrders(prev => { const next = new Set(prev); if (next.has(order.id)) next.delete(order.id); else next.add(order.id); return next; }); }}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.orderType === 'quote' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-900'}`}><Package size={20} /></div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Ref: {order.id} | {client?.name || 'Cliente'}</span>
                          <h4 className="font-black text-brand-900 uppercase text-sm">{order.destinationLocation || 'Sin destino'}</h4>
                        </div>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${order.status === 'Finalizado' ? 'bg-green-50 text-green-700' : 'bg-brand-50 text-brand-900'}`}>{order.status}</span>
                    </div>
                    {isExpanded && (
                      <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                               <h5 className="text-[10px] font-black text-brand-900 uppercase mb-4 tracking-widest">Artículos en pedido</h5>
                               <div className="space-y-2">
                                  {order.items?.map((it, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                       <span className="text-[11px] font-bold text-slate-700 uppercase">{it.name}</span>
                                       <span className="text-[10px] font-black text-brand-900">x{it.quantity}</span>
                                    </div>
                                  ))}
                               </div>
                            </div>
                            <div className="space-y-4">
                               {isAdmin && (order.status === 'Pendiente' || order.status === 'Cotización') && (
                                 <div className="space-y-3 bg-brand-900 p-6 rounded-[2rem] text-white shadow-xl">
                                    <span className="text-[9px] font-black uppercase text-brand-400 tracking-widest mb-2 block">Acción administrativa</span>
                                    <select value={approvalCoord[order.id] || ''} onChange={(e) => setApprovalCoord({...approvalCoord, [order.id]: e.target.value})} className="w-full bg-brand-800 text-white p-3 rounded-xl border-0 text-xs font-bold">
                                      <option value="">Elegir coordinador...</option>
                                      {coordinators.map(c => <option key={c.email} value={c.email}>{c.name}</option>)}
                                    </select>
                                    <button onClick={() => { if (!approvalCoord[order.id]) return alert("Falta coordinador"); onApproveOrder(order.id, approvalCoord[order.id]); }} className="w-full bg-[#4fb7f7] py-4 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-white hover:text-[#4fb7f7] transition-all">Aprobar y Asignar</button>
                                 </div>
                               )}
                               <div className="flex flex-col space-y-2">
                                  <Link to={`/tracking/${order.id}`} className="w-full text-center py-4 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center hover:bg-brand-900 hover:text-white transition-all shadow-md">Ver Seguimiento <ChevronRight size={14} className="ml-2" /></Link>
                                  {isAdmin && <button onClick={() => onDeleteOrder?.(order.id)} className="w-full text-center py-3 text-red-500 text-[9px] font-black uppercase hover:bg-red-50 rounded-xl">Eliminar Definitivamente</button>}
                               </div>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {(!orders || orders.length === 0) && (
                <div className="text-center py-24 bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[3rem]">
                   <Info size={32} className="mx-auto text-slate-300 mb-4" />
                   <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No hay pedidos disponibles.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <div className="animate-in fade-in duration-300">
            <UserManagement 
              users={users} currentUser={currentUser} 
              onChangeUserRole={onChangeUserRole!} onChangeUserDiscount={onChangeUserDiscount}
              onUpdateUserDetails={onUpdateUserDetails} onToggleStatus={onToggleUserStatus} onDeleteUser={onDeleteUser} 
            />
          </div>
        )}
      </div>

      {/* Modal de Producto (se mantiene igual pero con estilos pulidos) */}
      {isEditingProduct && (
          <div className="fixed inset-0 bg-brand-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full p-10 space-y-6 animate-in zoom-in duration-300">
                <div className="flex justify-between items-center border-b pb-6">
                  <h3 className="text-sm font-black text-brand-900 uppercase">Editor de Producto</h3>
                  <button onClick={() => setIsEditingProduct(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={24} /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Nombre" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none" />
                  <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value as Category})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={editForm.priceRent} onChange={e => setEditForm({...editForm, priceRent: parseInt(e.target.value)})} placeholder="Precio" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none" />
                  <input type="number" value={editForm.stock} onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value)})} placeholder="Stock" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none" />
                </div>
                <input type="text" value={editForm.image} onChange={e => setEditForm({...editForm, image: e.target.value})} placeholder="Imagen URL" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none" />
                <button onClick={saveProduct} className="w-full py-5 bg-brand-900 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl">Guardar Cambios</button>
            </div>
          </div>
      )}
    </div>
  );
};
