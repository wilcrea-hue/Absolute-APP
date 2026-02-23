
import React, { useState, useRef } from 'react';
import { Product, Order, User, WorkflowStageKey, StageData, Category, CartItem } from './types';
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  MapPin, 
  ArrowRight, 
  ClipboardList, 
  FileText, 
  X, 
  Database,
  RefreshCw,
  Eye,
  UserCheck,
  Search,
  Calendar,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserManagement } from './components/UserManagement';

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
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterCustomerName, setFilterCustomerName] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const editorRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser.role === 'admin';
  const coordinators = users.filter(u => u.role === 'coordinator' || u.role === 'admin');

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
      if (next.has(id)) {
        next.delete(id);
        setSelectedCoordinator(''); // Reset al cerrar
      } else {
        next.add(id);
      }
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
          <div className="space-y-8">
             <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-brand-900 uppercase flex items-center"><Package size={18} className="mr-2" /> Gestión de Inventario</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Control de stock y tarifas para {products.length} artículos</p>
                </div>
                <div className="flex space-x-3">
                   <button onClick={() => startEdit()} className="bg-brand-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center"><Plus size={16} className="mr-2" /> Nuevo Artículo</button>
                </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50">
                      <tr className="border-b">
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase">Ítem</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center">Tarifa Alquiler</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-center">Stock</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase text-right">Acción</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {products.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-5">
                                  <div className="flex items-center space-x-4">
                                      <img src={p.image} className="w-10 h-10 rounded-lg object-cover shadow-sm" alt="" />
                                      <span className="font-bold text-sm text-slate-800">{p.name}</span>
                                  </div>
                              </td>
                              <td className="p-5 text-center text-sm font-black text-brand-900">${p.priceRent?.toLocaleString()}</td>
                              <td className="p-5 text-center font-black text-brand-900">{p.stock}</td>
                              <td className="p-5 text-right space-x-2">
                                  <button onClick={() => startEdit(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                  <button onClick={() => { if(confirm('¿Eliminar producto?')) onDeleteProduct(p.id) }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest flex items-center">
                <ClipboardList size={18} className="mr-2" /> Reservas y Cotizaciones
              </h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterCustomerName('');
                    setFilterStatus('');
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-3 flex items-center">
                  <Search size={10} className="mr-1" /> Cliente / ID
                </label>
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={filterCustomerName}
                  onChange={(e) => setFilterCustomerName(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-brand-400 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-3 flex items-center">
                  <Filter size={10} className="mr-1" /> Estado
                </label>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-brand-400 outline-none transition-all"
                >
                  <option value="">Todos los Estados</option>
                  <option value="Cotización">Cotización</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En Proceso">En Proceso</option>
                  <option value="Entregado">Entregado</option>
                  <option value="Finalizado">Finalizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-3 flex items-center">
                  <Calendar size={10} className="mr-1" /> Desde
                </label>
                <input 
                  type="date" 
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-brand-400 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-3 flex items-center">
                  <Calendar size={10} className="mr-1" /> Hasta
                </label>
                <input 
                  type="date" 
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-brand-400 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              {orders
                .filter(order => {
                  const user = users.find(u => u.email === order.userEmail);
                  const userName = user ? user.name.toLowerCase() : '';
                  const userEmail = order.userEmail.toLowerCase();
                  const orderId = order.id.toLowerCase();
                  const searchMatch = !filterCustomerName || 
                    userName.includes(filterCustomerName.toLowerCase()) || 
                    userEmail.includes(filterCustomerName.toLowerCase()) ||
                    orderId.includes(filterCustomerName.toLowerCase());
                  
                  const statusMatch = !filterStatus || order.status === filterStatus;
                  
                  const orderStart = new Date(order.startDate).getTime();
                  const orderEnd = new Date(order.endDate).getTime();
                  const filterStart = filterStartDate ? new Date(filterStartDate).getTime() : null;
                  const filterEnd = filterEndDate ? new Date(filterEndDate).getTime() : null;
                  
                  const dateMatch = (!filterStart || orderStart >= filterStart) && 
                                   (!filterEnd || orderEnd <= filterEnd);
                  
                  return searchMatch && statusMatch && dateMatch;
                })
                .map(order => {
                  const isExpanded = expandedOrders.has(order.id);
                  const isQuote = order.status === 'Cotización';
                  const isApprovable = isQuote || order.status === 'Pendiente';
                  
                  return (
                    <div key={order.id} className={`bg-white border rounded-[2rem] overflow-hidden transition-all ${isExpanded ? 'border-brand-900 shadow-xl' : 'border-slate-100 shadow-sm'} ${isQuote ? 'border-l-4 border-amber-400' : ''}`}>
                      <div className="p-6 cursor-pointer" onClick={() => toggleExpandOrder(order.id)}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isQuote ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-900'}`}>
                              {isQuote ? <FileText size={20} /> : <Package size={20} />}
                            </div>
                            <div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">ID: {order.id} • {new Date(order.createdAt).toLocaleDateString()}</span>
                              <h4 className="font-black text-brand-900 uppercase text-sm flex items-center">
                                <MapPin size={12} className="mr-1 text-brand-400" /> {order.destinationLocation}
                              </h4>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                             <div className="text-right">
                               <p className="text-[9px] font-black text-slate-400 uppercase">Total</p>
                               <p className="text-sm font-black text-brand-900">${order.totalAmount.toLocaleString()}</p>
                             </div>
                             <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${isQuote ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-brand-50 text-brand-900'}`}>{order.status}</span>
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="p-8 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                             <div className="space-y-4">
                                <h5 className="text-[10px] font-black text-brand-900 uppercase mb-4 border-b pb-2">Artículos Solicitados</h5>
                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
                                   {order.items.map(i => (
                                     <div key={i.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center space-x-3">
                                          <img src={i.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                          <span className="text-[11px] font-bold text-slate-700">{i.name}</span>
                                        </div>
                                        <span className="text-[11px] font-black text-brand-900 bg-brand-50 px-2 py-1 rounded-lg">x{i.quantity}</span>
                                     </div>
                                   ))}
                                </div>
                             </div>
                             
                             <div className="space-y-6">
                                <h5 className="text-[10px] font-black text-brand-900 uppercase mb-4 border-b pb-2">Acciones de Gestión</h5>
                                
                                {isApprovable ? (
                                  <div className="bg-white p-6 rounded-[2rem] border-2 border-emerald-100 shadow-xl shadow-emerald-500/5 space-y-4">
                                     <div className="space-y-2">
                                        <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center">
                                          <UserCheck size={12} className="mr-1" /> Coordinador Responsable
                                        </label>
                                        <select 
                                          value={selectedCoordinator} 
                                          onChange={(e) => setSelectedCoordinator(e.target.value)}
                                          className="w-full p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-[11px] font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                          <option value="">-- Seleccionar Coordinador --</option>
                                          {coordinators.map(u => (
                                            <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
                                          ))}
                                        </select>
                                     </div>
  
                                     <button 
                                        disabled={!selectedCoordinator}
                                        onClick={() => {
                                          onApproveOrder(order.id, selectedCoordinator);
                                          setSelectedCoordinator('');
                                        }} 
                                        className="w-full py-5 bg-emerald-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg disabled:opacity-30 disabled:grayscale transition-all hover:scale-[1.02] active:scale-95"
                                      >
                                        <CheckCircle size={18} /> <span>Aprobar y Notificar Equipo</span>
                                     </button>
                                  </div>
                                ) : (
                                  <div className="bg-brand-900 p-8 rounded-[2rem] text-white space-y-4">
                                     <div className="flex items-start space-x-3 text-brand-400">
                                        <UserCheck size={20} className="mt-1" />
                                        <div className="flex-1">
                                           <p className="text-[8px] font-black uppercase tracking-widest opacity-50">Coordinador Asignado</p>
                                           {(() => {
                                             const coord = users.find(u => u.email === order.assignedCoordinatorEmail);
                                             return coord ? (
                                               <div className="mt-1 space-y-1">
                                                 <p className="text-[11px] font-bold text-white">{coord.name}</p>
                                                 <p className="text-[9px] font-medium text-brand-400">{coord.email}</p>
                                                 {coord.phone && (
                                                   <p className="text-[9px] font-medium text-brand-400 flex items-center">
                                                     <span className="opacity-50 mr-1">Tel:</span> {coord.phone}
                                                   </p>
                                                 )}
                                               </div>
                                             ) : (
                                               <p className="text-[11px] font-bold text-white">{order.assignedCoordinatorEmail || 'Pendiente'}</p>
                                             );
                                           })()}
                                        </div>
                                     </div>
                                     <Link to={`/tracking/${order.id}`} className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 border border-white/10 transition-all">
                                        <Eye size={16} /> <span>Ver Gestión Logística</span>
                                     </Link>
                                  </div>
                                )}
  
                                <div className="grid grid-cols-2 gap-3">
                                  <button onClick={() => onCancelOrder?.(order.id)} className="py-4 bg-red-50 text-red-600 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center space-x-2 border border-red-100 hover:bg-red-600 hover:text-white transition-all">
                                    <XCircle size={14} /> <span>Anular Registro</span>
                                  </button>
                                  {order.status === 'Finalizado' && (
                                    <button onClick={() => onDeleteOrder?.(order.id)} className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center space-x-2 border border-slate-200 hover:bg-red-500 hover:text-white transition-all">
                                      <Trash2 size={14} /> <span>Archivar</span>
                                    </button>
                                  )}
                                </div>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              {orders.filter(order => {
                const user = users.find(u => u.email === order.userEmail);
                const userName = user ? user.name.toLowerCase() : '';
                const userEmail = order.userEmail.toLowerCase();
                const orderId = order.id.toLowerCase();
                const searchMatch = !filterCustomerName || 
                  userName.includes(filterCustomerName.toLowerCase()) || 
                  userEmail.includes(filterCustomerName.toLowerCase()) ||
                  orderId.includes(filterCustomerName.toLowerCase());
                
                const statusMatch = !filterStatus || order.status === filterStatus;
                
                const orderStart = new Date(order.startDate).getTime();
                const orderEnd = new Date(order.endDate).getTime();
                const filterStart = filterStartDate ? new Date(filterStartDate).getTime() : null;
                const filterEnd = filterEndDate ? new Date(filterEndDate).getTime() : null;
                
                const dateMatch = (!filterStart || orderStart >= filterStart) && 
                                 (!filterEnd || orderEnd <= filterEnd);
                
                return searchMatch && statusMatch && dateMatch;
              }).length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                  <ClipboardList size={40} className="text-slate-300 mb-4" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No se encontraron pedidos con los filtros aplicados</p>
                </div>
              )}
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

      {isEditingProduct && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-brand-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-brand-900 uppercase tracking-widest">
                  {isEditingProduct === 'new' ? 'Nuevo Artículo' : 'Editar Artículo'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Complete los detalles del producto</p>
              </div>
              <button onClick={() => setIsEditingProduct(null)} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-brand-900 shadow-sm hover:shadow-md">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-900 uppercase tracking-widest ml-1">Nombre del Producto *</label>
                  <input 
                    type="text" 
                    value={editForm.name || ''} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-400 outline-none transition-all"
                    placeholder="Ej: Silla Tiffany Blanca"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-900 uppercase tracking-widest ml-1">Categoría *</label>
                  <select 
                    value={editForm.category || ''} 
                    onChange={e => setEditForm({...editForm, category: e.target.value as Category})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-400 outline-none transition-all"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-900 uppercase tracking-widest ml-1">Tarifa Alquiler ($) *</label>
                  <input 
                    type="number" 
                    value={editForm.priceRent || 0} 
                    onChange={e => setEditForm({...editForm, priceRent: Number(e.target.value)})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-400 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-900 uppercase tracking-widest ml-1">Stock Disponible *</label>
                  <input 
                    type="number" 
                    value={editForm.stock || 0} 
                    onChange={e => setEditForm({...editForm, stock: Number(e.target.value)})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-900 uppercase tracking-widest ml-1">URL de Imagen *</label>
                <input 
                  type="text" 
                  value={editForm.image || ''} 
                  onChange={e => setEditForm({...editForm, image: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-400 outline-none transition-all"
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-900 uppercase tracking-widest ml-1">Descripción</label>
                <div 
                  ref={editorRef}
                  contentEditable
                  dangerouslySetInnerHTML={{ __html: editForm.description || '' }}
                  className="w-full min-h-[150px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-400 outline-none transition-all overflow-y-auto"
                />
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex space-x-4">
              <button 
                onClick={() => setIsEditingProduct(null)}
                className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={saveProduct}
                className="flex-1 py-4 bg-brand-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-900/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Guardar Producto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
