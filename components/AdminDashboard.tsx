
import React, { useState, useEffect } from 'react';
import { Product, Order, User, WorkflowStageKey, StageData, Signature, OrderStatus, Category } from '../types';
// Added ClipboardList and FileText to lucide-react imports
import { Package, Plus, Edit2, Trash2, Check, Clock, X, PenTool, CheckCircle, Info, Lock, XCircle, ImageIcon, Type, BarChart3, DollarSign, User as UserIcon, Calendar, MapPin, ArrowRight, ClipboardList, FileText, UserCheck } from 'lucide-react';
// Added Link from react-router-dom to handle navigation in the dashboard
import { Link } from 'react-router-dom';
import { UserManagement } from './UserManagement';

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
  onToggleUserStatus?: (email: string) => void;
  onDeleteUser?: (email: string) => void;
  onUpdateStage: (orderId: string, stageKey: WorkflowStageKey, data: StageData) => void;
}

const WORKFLOW_STEPS: { key: WorkflowStageKey; label: string; stepNumber: number }[] = [
  { key: 'bodega_check', label: '1. Bodega', stepNumber: 1 },
  { key: 'bodega_to_coord', label: '2. Entrega Coord', stepNumber: 2 },
  { key: 'coord_to_client', label: '3. Entrega Cliente', stepNumber: 3 },
  { key: 'client_to_coord', label: '4. Recogida', stepNumber: 4 },
  { key: 'coord_to_bodega', label: '5. Retorno Bodega', stepNumber: 5 },
];

const CATEGORIES: Category[] = ['Mobiliario', 'Electrónica', 'Arquitectura Efímera', 'Decoración', 'Servicios'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser, products, orders, users,
  onAddProduct, onUpdateProduct, onDeleteProduct,
  onApproveOrder, onCancelOrder, onDeleteOrder,
  onChangeUserRole, onChangeUserDiscount, onToggleUserStatus, onDeleteUser, onUpdateStage,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'users'>(currentUser.role === 'admin' ? 'inventory' : 'orders');
  const [isEditingProduct, setIsEditingProduct] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const isAdmin = currentUser.role === 'admin';

  const startEdit = (product?: Product) => {
    if (product) {
      setIsEditingProduct(product.id);
      setEditForm(product);
    } else {
      setIsEditingProduct('new');
      setEditForm({ name: '', category: 'Mobiliario', description: '', image: '', stock: 10, priceSell: 0, priceRent: 0 });
    }
  };

  const saveProduct = () => {
    if (!editForm.name || !editForm.category || !editForm.image || !editForm.description) {
      alert("Por favor complete los campos obligatorios, incluyendo la descripción.");
      return;
    }
    if (isEditingProduct === 'new') onAddProduct({ ...editForm, id: Math.random().toString(36).substr(2, 9) } as Product);
    else onUpdateProduct(editForm as Product);
    setIsEditingProduct(null);
  };

  const getStageManagementInfo = (order: Order, stageKey: WorkflowStageKey): { manageable: boolean; reason?: string } => {
    if (order.status === 'Cancelado') return { manageable: false, reason: 'Pedido cancelado.' };
    const stepIndex = WORKFLOW_STEPS.findIndex(s => s.key === stageKey);
    const prevStageKey = stepIndex > 0 ? WORKFLOW_STEPS[stepIndex - 1].key : null;
    const isPrevCompleted = prevStageKey ? order.workflow[prevStageKey].status === 'completed' : true;
    if (!isPrevCompleted) return { manageable: false, reason: 'Complete la etapa anterior.' };
    return { manageable: true };
  };

  const toggleExpandOrder = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
                <h3 className="text-sm font-black text-brand-900 uppercase flex items-center"><Package size={18} className="mr-2" /> Artículos y Precios</h3>
                <button onClick={() => startEdit()} className="bg-brand-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center"><Plus size={16} className="mr-2" /> Nuevo</button>
             </div>
             <table className="w-full text-left">
                <thead className="bg-slate-50">
                    <tr className="border-b">
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Ítem</th>
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center">Venta</th>
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center">Alquiler / día</th>
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
                            <td className="p-5 text-center text-sm font-black text-slate-600">${p.priceSell?.toLocaleString()}</td>
                            <td className="p-5 text-center text-sm font-black text-slate-600">${p.priceRent?.toLocaleString()}</td>
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
                <ClipboardList size={18} className="mr-2" /> Listado Maestro de Pedidos
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase italic">Auditoría General de Operaciones Nacionales</p>
            </div>

            <div className="space-y-4">
              {orders.map(order => {
                const isExpanded = expandedOrders.has(order.id);
                const isApprovable = isAdmin && (order.status === 'Pendiente' || order.status === 'Cotización');
                const canCancel = isAdmin && order.status !== 'Cancelado' && order.status !== 'Finalizado';
                const canDelete = isAdmin;
                const assignedCoord = users.find(u => u.email === order.assignedCoordinatorEmail);

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
                            {assignedCoord && (
                              <div className="mt-1 flex items-center bg-slate-100 px-2 py-0.5 rounded-lg w-fit">
                                <UserCheck size={10} className="text-slate-600 mr-1.5" />
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-tight">{assignedCoord.name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 w-full md:w-auto justify-between md:justify-end">
                           <div className="text-center md:text-right hidden sm:block">
                             <p className="text-[9px] font-black text-slate-400 uppercase">Cliente</p>
                             <p className="text-[11px] font-bold text-brand-900 truncate max-w-[150px]">{order.userEmail}</p>
                           </div>
                           <div className="text-center md:text-right">
                             <p className="text-[9px] font-black text-slate-400 uppercase">Inversión</p>
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
                          {/* Detalles del Pedido */}
                          <div className="space-y-6">
                            <h5 className="text-[10px] font-black text-brand-900 uppercase tracking-widest border-b pb-2">Artículos del Pedido</h5>
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center space-x-3">
                                    <img src={item.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                    <span className="text-[11px] font-bold text-slate-700 uppercase">{item.name}</span>
                                  </div>
                                  <span className="text-[10px] font-black text-brand-900 bg-brand-50 px-2.5 py-1 rounded-lg">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex space-x-4 bg-white p-4 rounded-2xl border border-slate-100">
                              <div className="flex-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Fechas del Evento</p>
                                <p className="text-[11px] font-bold text-brand-900 flex items-center mt-1">
                                  <Calendar size={12} className="mr-1.5 text-brand-400" />
                                  {new Date(order.startDate).toLocaleDateString()} → {new Date(order.endDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex-1 text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Origen</p>
                                <p className="text-[11px] font-bold text-brand-900 flex items-center justify-end mt-1">
                                  <MapPin size={12} className="mr-1.5 text-brand-400" /> {order.originLocation}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Acciones de Flujo y Admin */}
                          <div className="space-y-6">
                            <h5 className="text-[10px] font-black text-brand-900 uppercase tracking-widest border-b pb-2">Estado del Workflow</h5>
                            <div className="grid grid-cols-5 gap-2">
                              {WORKFLOW_STEPS.map(step => {
                                const isDone = order.workflow[step.key].status === 'completed';
                                return (
                                  <div key={step.key} className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center space-y-1 ${isDone ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white border-slate-200 text-slate-300'}`}>
                                    <span className="text-[8px] font-black uppercase leading-tight">{step.label.split(' ')[1]}</span>
                                    {isDone ? <CheckCircle size={14} /> : <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Controles Administrativos */}
                            {isAdmin && (
                              <div className="bg-brand-900 p-6 rounded-[2rem] shadow-xl space-y-4">
                                <h6 className="text-[9px] font-black text-brand-400 uppercase tracking-widest flex items-center">
                                  <Lock size={12} className="mr-2" /> Controles Maestros
                                </h6>
                                <div className="grid grid-cols-2 gap-3">
                                  {isApprovable && (
                                    <button 
                                      onClick={() => onApproveOrder(order.id)}
                                      className="col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-2 shadow-lg"
                                    >
                                      <CheckCircle size={16} />
                                      <span>Aprobar Pedido</span>
                                    </button>
                                  )}
                                  
                                  {canCancel && (
                                    <button 
                                      onClick={() => onCancelOrder?.(order.id)}
                                      className="bg-brand-800 hover:bg-red-600 text-brand-300 hover:text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-2 border border-brand-700"
                                    >
                                      <XCircle size={16} />
                                      <span>Anular</span>
                                    </button>
                                  )}
                                  
                                  {canDelete && (
                                    <button 
                                      onClick={() => onDeleteOrder?.(order.id)}
                                      className="bg-brand-800 hover:bg-red-700 text-brand-400 hover:text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-2 border border-brand-700"
                                    >
                                      <Trash2 size={16} />
                                      <span>Eliminar</span>
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
              })}
              {orders.length === 0 && (
                <div className="text-center py-20 opacity-30">
                   <ClipboardList size={48} className="mx-auto mb-4" />
                   <p className="text-sm font-black uppercase">No hay pedidos registrados para auditar</p>
                </div>
              )}
            </div>
          </div>
        )}

        {isEditingProduct && (
          <div className="fixed inset-0 bg-brand-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-xl w-full p-10 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-6">
                  <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest">Gestión de Producto</h3>
                  <button onClick={() => setIsEditingProduct(null)}><X size={24} className="text-slate-400" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Nombre <span className="text-red-500">*</span></label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border-0 focus:ring-2 focus:ring-brand-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Categoría <span className="text-red-500">*</span></label>
                    <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value as Category})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border-0">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Descripción <span className="text-red-500">*</span></label>
                  <textarea 
                    value={editForm.description} 
                    onChange={e => setEditForm({...editForm, description: e.target.value})} 
                    className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border-0 focus:ring-2 focus:ring-brand-900 min-h-[100px] resize-none"
                    placeholder="Describe las características..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 flex items-center"><DollarSign size={10} className="mr-1" /> Precio Venta</label>
                    <input type="number" value={editForm.priceSell} onChange={e => setEditForm({...editForm, priceSell: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-sm border-0" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 flex items-center"><Clock size={10} className="mr-1" /> Alquiler / día</label>
                    <input type="number" value={editForm.priceRent} onChange={e => setEditForm({...editForm, priceRent: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-sm border-0" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Stock Inicial</label>
                    <input type="number" value={editForm.stock} onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-sm border-0" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">URL Imagen <span className="text-red-500">*</span></label>
                  <input type="text" value={editForm.image} onChange={e => setEditForm({...editForm, image: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border-0" />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button onClick={() => setIsEditingProduct(null)} className="px-8 py-4 bg-slate-100 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
                  <button onClick={saveProduct} className="px-10 py-4 bg-brand-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Guardar Artículo</button>
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
            onToggleStatus={onToggleUserStatus} 
            onDeleteUser={onDeleteUser} 
          />
        )}
      </div>
    </div>
  );
};
