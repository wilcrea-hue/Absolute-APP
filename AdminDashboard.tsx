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
  // Fix: Added missing Eye import from lucide-react
  Eye
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
  const editorRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser.role === 'admin';

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
            <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest flex items-center">
              <ClipboardList size={18} className="mr-2" /> Reservas y Cotizaciones
            </h3>
            <div className="space-y-4">
              {orders.map(order => {
                const isExpanded = expandedOrders.has(order.id);
                const isQuote = order.status === 'Cotización';
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div>
                              <h5 className="text-[10px] font-black text-brand-900 uppercase mb-4">Artículos en Reserva</h5>
                              <div className="space-y-2">
                                 {order.items.map(i => (
                                   <div key={i.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                                      <span className="text-[11px] font-bold text-slate-700">{i.name}</span>
                                      <span className="text-[11px] font-black text-brand-900">x{i.quantity}</span>
                                   </div>
                                 ))}
                              </div>
                           </div>
                           <div className="flex flex-col justify-center space-y-4">
                              {isQuote && (
                                <button onClick={() => onApproveOrder(order.id, 'Coordinadordavidabsolute@gmail.com')} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg">
                                  <CheckCircle size={16} /> <span>Aprobar y Convertir a Pedido</span>
                                </button>
                              )}
                              <button onClick={() => onCancelOrder?.(order.id)} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 border border-red-100">
                                <XCircle size={16} /> <span>Anular Registro</span>
                              </button>
                              <Link to={`/tracking/${order.id}`} className="w-full py-4 bg-brand-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2">
                                <Eye size={16} /> <span>Ver Detalles Logísticos</span>
                              </Link>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
