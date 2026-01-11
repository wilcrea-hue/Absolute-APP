
import React, { useState, useEffect } from 'react';
import { Product, Order, User, WorkflowStageKey, StageData, Signature } from '../types';
import { Package, Users, ClipboardList, Plus, Edit2, Trash2, Check, Calendar, ChevronDown, ChevronUp, Clock, User as UserIcon, Camera, X, PenTool } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
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
  onToggleUserRole: (email: string) => void; // Keep for backward compatibility if needed
  onChangeUserRole?: (email: string, newRole: 'admin' | 'user' | 'logistics') => void;
  onUpdateStage: (orderId: string, stageKey: WorkflowStageKey, data: StageData) => void;
}

const WORKFLOW_STEPS: { key: WorkflowStageKey; label: string }[] = [
  { key: 'bodega_check', label: '1. Bodega' },
  { key: 'bodega_to_coord', label: '2. Entrega Coord' },
  { key: 'coord_to_client', label: '3. Entrega Cliente' },
  { key: 'client_to_coord', label: '4. Recogida' },
  { key: 'coord_to_bodega', label: '5. Retorno Bodega' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  products,
  orders,
  users,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateOrderDates,
  onApproveOrder,
  onToggleUserRole,
  onChangeUserRole,
  onUpdateStage,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'users'>(
    currentUser.role === 'logistics' ? 'orders' : 'inventory'
  );
  
  // Inventory State
  const [isEditingProduct, setIsEditingProduct] = useState<string | null>(null); // 'new' or id
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  // Order Expansion State
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Stage Editing State
  const [editingStage, setEditingStage] = useState<{orderId: string, stageKey: WorkflowStageKey} | null>(null);
  const [tempStageData, setTempStageData] = useState<StageData | null>(null);
  const [isSignaturePadOpen, setIsSignaturePadOpen] = useState<'signature' | 'receivedBy' | null>(null);

  useEffect(() => {
    if (editingStage) {
        const order = orders.find(o => o.id === editingStage.orderId);
        if (order) {
            setTempStageData(JSON.parse(JSON.stringify(order.workflow[editingStage.stageKey])));
        }
    } else {
        setTempStageData(null);
        setIsSignaturePadOpen(null);
    }
  }, [editingStage, orders]);

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const startEdit = (product?: Product) => {
    if (product) {
      setIsEditingProduct(product.id);
      setEditForm(product);
    } else {
      setIsEditingProduct('new');
      setEditForm({
        name: '',
        category: 'Arquitectura Efímera',
        description: '',
        image: 'https://picsum.photos/400/300',
        stock: 0
      });
    }
  };

  const saveProduct = () => {
    if (isEditingProduct === 'new') {
        const newProduct = {
            ...editForm,
            id: Math.random().toString(36).substr(2, 9),
        } as Product;
        onAddProduct(newProduct);
    } else {
        onUpdateProduct(editForm as Product);
    }
    setIsEditingProduct(null);
  };

  // Order Edit State
  const [editingOrderDates, setEditingOrderDates] = useState<string | null>(null);
  const [tempDates, setTempDates] = useState({ start: '', end: '' });

  // Stage Handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!tempStageData || !e.target.files) return;
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
          const result = reader.result as string;
          setTempStageData({ ...tempStageData, photos: [...tempStageData.photos, result] });
      };
      reader.readAsDataURL(file);
  };

  const handleSaveSignature = (sig: Signature) => {
      if (!tempStageData || !isSignaturePadOpen) return;
      setTempStageData({ ...tempStageData, [isSignaturePadOpen]: sig });
      setIsSignaturePadOpen(null);
  };

  const handleSaveStage = () => {
      if (editingStage && tempStageData) {
          onUpdateStage(editingStage.orderId, editingStage.stageKey, tempStageData);
          setEditingStage(null);
      }
  };

  const handleCompleteStage = () => {
      if (editingStage && tempStageData) {
          const completedData: StageData = {
              ...tempStageData,
              status: 'completed',
              timestamp: new Date().toISOString()
          };
          onUpdateStage(editingStage.orderId, editingStage.stageKey, completedData);
          setEditingStage(null);
      }
  };

  const isLogistics = currentUser.role === 'logistics';

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h2 className="text-2xl font-bold text-gray-900">
            {isLogistics ? 'Gestión de Flujo Logístico' : 'Panel de Administración'}
        </h2>
      </div>

      {/* Tabs - Only show for Admin */}
      {!isLogistics && (
        <div className="flex border-b bg-white rounded-t-lg px-2 pt-2">
            <button
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-3 font-medium text-sm flex items-center space-x-2 rounded-t-lg transition-colors ${
                activeTab === 'inventory' 
                ? 'bg-brand-900 text-white' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            >
            <Package size={18} />
            <span>Inventario</span>
            </button>
            <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 font-medium text-sm flex items-center space-x-2 rounded-t-lg transition-colors ${
                activeTab === 'orders' 
                ? 'bg-brand-900 text-white' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            >
            <ClipboardList size={18} />
            <span>Pedidos ({orders.length})</span>
            </button>
            <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium text-sm flex items-center space-x-2 rounded-t-lg transition-colors ${
                activeTab === 'users' 
                ? 'bg-brand-900 text-white' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            >
            <Users size={18} />
            <span>Usuarios</span>
            </button>
        </div>
      )}

      <div className="bg-white rounded-b-lg shadow-sm border p-6 min-h-[500px]">
        
        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && !isLogistics && (
          <div>
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Gestión de Productos</h3>
                <button 
                  onClick={() => startEdit()}
                  className="bg-green-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-green-700"
                >
                  <Plus size={16} />
                  <span>Nuevo Producto</span>
                </button>
             </div>

             {isEditingProduct && (
               <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300">
                  <h4 className="font-bold mb-4">{isEditingProduct === 'new' ? 'Agregar Producto' : 'Editar Producto'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Nombre</label>
                        <input 
                            className="w-full border rounded px-3 py-2" 
                            value={editForm.name || ''} 
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                        />
                    </div>
                     <div>
                        <label className="block text-sm text-gray-600 mb-1">Categoría</label>
                        <select 
                            className="w-full border rounded px-3 py-2"
                            value={editForm.category || ''}
                            onChange={e => setEditForm({...editForm, category: e.target.value as any})}
                        >
                            {['Arquitectura Efímera', 'Mobiliario', 'Electrónica', 'Decoración', 'Servicios'].map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Descripción</label>
                        <textarea 
                            className="w-full border rounded px-3 py-2"
                            value={editForm.description || ''}
                            onChange={e => setEditForm({...editForm, description: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Stock</label>
                        <input 
                            type="number"
                            className="w-full border rounded px-3 py-2" 
                            value={editForm.stock || 0} 
                            onChange={e => setEditForm({...editForm, stock: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">URL Imagen</label>
                        <input 
                            className="w-full border rounded px-3 py-2" 
                            value={editForm.image || ''} 
                            onChange={e => setEditForm({...editForm, image: e.target.value})}
                        />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                      <button onClick={() => setIsEditingProduct(null)} className="px-4 py-2 text-gray-600 bg-white border rounded">Cancelar</button>
                      <button onClick={saveProduct} className="px-4 py-2 bg-brand-900 text-white rounded">Guardar</button>
                  </div>
               </div>
             )}

             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-3 font-medium text-gray-600">Imagen</th>
                            <th className="p-3 font-medium text-gray-600">Nombre</th>
                            <th className="p-3 font-medium text-gray-600">Categoría</th>
                            <th className="p-3 font-medium text-gray-600">Stock</th>
                            <th className="p-3 font-medium text-gray-600 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">
                                    <img src={p.image} className="w-10 h-10 object-cover rounded bg-gray-200" alt="" />
                                </td>
                                <td className="p-3 font-medium">{p.name}</td>
                                <td className="p-3 text-sm text-gray-500">{p.category}</td>
                                <td className="p-3">{p.stock}</td>
                                <td className="p-3 text-right space-x-2">
                                    <button onClick={() => startEdit(p)} className="text-blue-600 hover:text-blue-800"><Edit2 size={18} /></button>
                                    <button onClick={() => onDeleteProduct(p.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
            <div>
                 <h3 className="font-bold text-lg mb-6">{isLogistics ? 'Pedidos Activos' : 'Gestión de Pedidos'}</h3>
                 <div className="space-y-4">
                    {orders.length === 0 && <p className="text-gray-500">No hay pedidos registrados.</p>}
                    {orders.map(order => {
                      const isExpanded = expandedOrders.has(order.id);
                      const totalItems = order.items.reduce((acc, item) => acc + item.quantity, 0);
                      
                      return (
                        <div key={order.id} className="border rounded-lg bg-white hover:shadow-md transition-shadow overflow-hidden">
                            <div 
                                className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => toggleOrderExpanded(order.id)}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">#{order.id}</span>
                                        <span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="font-medium mt-1">{order.userEmail}</div>
                                    <div className="text-sm text-gray-500 mt-1 flex items-center">
                                      <Package size={14} className="mr-1" />
                                      {totalItems} artículos en total
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border
                                        ${order.status === 'Pendiente' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : ''}
                                        ${order.status === 'En Proceso' ? 'bg-blue-50 text-blue-800 border-blue-200' : ''}
                                        ${order.status === 'Entregado' ? 'bg-purple-50 text-purple-800 border-purple-200' : ''}
                                        ${order.status === 'Finalizado' ? 'bg-green-50 text-green-800 border-green-200' : ''}
                                        ${order.status === 'Cancelado' ? 'bg-red-50 text-red-800 border-red-200' : ''}
                                    `}>
                                        {order.status}
                                    </span>
                                    
                                    {order.status === 'Pendiente' && !isLogistics && (
                                        <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onApproveOrder(order.id);
                                            }}
                                            className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                                        >
                                            <Check size={14} />
                                            <span>Aprobar</span>
                                        </button>
                                    )}
                                    
                                    {isExpanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t bg-gray-50 p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase">Productos</h4>
                                            <ul className="text-sm space-y-1 bg-white p-4 rounded border shadow-sm">
                                                {order.items.map((item, i) => (
                                                    <li key={i} className="flex justify-between items-center border-b last:border-0 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <img src={item.image} alt={item.name} className="w-8 h-8 rounded object-cover border" />
                                                            <span>{item.name}</span>
                                                        </div>
                                                        <span className="text-gray-500 font-mono">x{item.quantity}</span>
                                                    </li>
                                                ))}
                                                <li className="flex justify-between pt-2 mt-2 border-t font-bold">
                                                    <span>Total Unidades</span>
                                                    <span>{totalItems}</span>
                                                </li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase flex items-center">
                                                <Calendar size={14} className="mr-1"/> Fechas
                                            </h4>
                                            
                                            {editingOrderDates === order.id ? (
                                                <div className="flex flex-col space-y-2 bg-white p-4 rounded border shadow-sm">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="date" 
                                                            className="border rounded px-2 py-1 text-sm w-full"
                                                            value={tempDates.start}
                                                            onChange={e => setTempDates({...tempDates, start: e.target.value})}
                                                        />
                                                        <input 
                                                            type="date" 
                                                            className="border rounded px-2 py-1 text-sm w-full"
                                                            value={tempDates.end}
                                                            onChange={e => setTempDates({...tempDates, end: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                onUpdateOrderDates(order.id, tempDates.start, tempDates.end);
                                                                setEditingOrderDates(null);
                                                            }}
                                                            className="bg-brand-900 text-white px-3 py-1 rounded text-xs flex-1 hover:bg-brand-800"
                                                        >
                                                            Guardar
                                                        </button>
                                                        <button 
                                                            onClick={() => setEditingOrderDates(null)}
                                                            className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center bg-white p-4 rounded border shadow-sm">
                                                    <div className="text-sm">
                                                        <div><span className="text-gray-500">Inicio:</span> {order.startDate}</div>
                                                        <div><span className="text-gray-500">Fin:</span> {order.endDate}</div>
                                                    </div>
                                                    {!isLogistics && (
                                                        <button 
                                                            onClick={() => {
                                                                setEditingOrderDates(order.id);
                                                                setTempDates({ start: order.startDate, end: order.endDate });
                                                            }}
                                                            className="text-blue-600 p-2 hover:bg-blue-50 rounded"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Workflow Summary */}
                                    <div className="pt-6 border-t">
                                        <h4 className="text-sm font-semibold text-gray-500 mb-4 uppercase flex items-center">
                                            <ClipboardList size={14} className="mr-1"/> Estado del Flujo (Click para gestionar)
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            {WORKFLOW_STEPS.map((step) => {
                                                const stepData = order.workflow[step.key];
                                                const isCompleted = stepData?.status === 'completed';
                                                
                                                return (
                                                    <div 
                                                        key={step.key} 
                                                        onClick={() => setEditingStage({ orderId: order.id, stageKey: step.key })}
                                                        className={`p-3 rounded-lg border text-xs flex flex-col justify-between min-h-[100px] transition-all cursor-pointer hover:shadow-md ${
                                                            isCompleted 
                                                                ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                                                : 'bg-white border-gray-100 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-gray-700 mb-2 truncate" title={step.label}>
                                                                {step.label}
                                                            </div>
                                                            {isCompleted ? (
                                                                <div className="flex items-center text-green-700 font-medium mb-1">
                                                                    <Check size={12} className="mr-1" /> Completado
                                                                </div>
                                                            ) : (
                                                                <div className="text-gray-400 italic">Pendiente</div>
                                                            )}
                                                        </div>
                                                        
                                                        {isCompleted && stepData && (
                                                            <div className="mt-2 pt-2 border-t border-green-100">
                                                                <div className="flex items-center text-gray-600 mb-1" title={stepData.signature?.name}>
                                                                    <UserIcon size={10} className="mr-1 opacity-70" />
                                                                    <span className="truncate">{stepData.signature?.name || 'Admin'}</span>
                                                                </div>
                                                                <div className="flex items-center text-gray-500" title={stepData.timestamp}>
                                                                    <Clock size={10} className="mr-1 opacity-70" />
                                                                    <span className="font-mono text-[10px]">
                                                                        {stepData.timestamp ? new Date(stepData.timestamp).toLocaleString('es-ES', {month:'numeric', day:'numeric', hour: '2-digit', minute:'2-digit'}) : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
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

        {/* USERS TAB */}
        {activeTab === 'users' && !isLogistics && (
            <UserManagement 
              users={users} 
              currentUser={currentUser} 
              onChangeUserRole={onChangeUserRole || ((email, role) => onToggleUserRole(email))} 
            />
        )}
      </div>

      {/* Edit Stage Modal */}
      {editingStage && tempStageData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center">
                      <h3 className="text-xl font-bold text-gray-900">
                          Editar Etapa: {WORKFLOW_STEPS.find(s => s.key === editingStage.stageKey)?.label}
                      </h3>
                      <button onClick={() => setEditingStage(null)} className="text-gray-400 hover:text-gray-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-6 flex-1">
                      {/* Photos */}
                      <div>
                          <h4 className="font-bold text-gray-700 mb-3 flex items-center">
                              <Camera className="mr-2" size={18} /> Evidencia Fotográfica
                          </h4>
                          <div className="grid grid-cols-3 gap-3 mb-3">
                              {tempStageData.photos.map((photo, i) => (
                                  <img key={i} src={photo} className="w-full h-24 object-cover rounded border" alt="" />
                              ))}
                              <label className="border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center h-24 cursor-pointer hover:bg-gray-50">
                                  <Plus className="text-gray-400" />
                                  <span className="text-xs text-gray-500 mt-1">Agregar</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                              </label>
                          </div>
                      </div>

                      {/* Signatures */}
                      <div>
                          <h4 className="font-bold text-gray-700 mb-3 flex items-center">
                              <PenTool className="mr-2" size={18} /> Firmas
                          </h4>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                              {/* Authorized By */}
                              <div className="border p-4 rounded-lg">
                                  <div className="text-sm font-semibold mb-2 text-gray-600">Autorizado / Entregado por</div>
                                  {tempStageData.signature ? (
                                      <div className="bg-gray-50 p-2 rounded">
                                          <img src={tempStageData.signature.dataUrl} className="h-16 w-auto mb-2 mix-blend-multiply" alt="Firma" />
                                          <div className="text-xs font-bold">{tempStageData.signature.name}</div>
                                          <button 
                                              onClick={() => setTempStageData({...tempStageData, signature: undefined})}
                                              className="text-xs text-red-500 mt-2 underline"
                                          >
                                              Eliminar Firma
                                          </button>
                                      </div>
                                  ) : (
                                      <button 
                                          onClick={() => setIsSignaturePadOpen('signature')}
                                          className="w-full py-6 border-2 border-dashed rounded text-gray-400 text-sm hover:bg-gray-50"
                                      >
                                          + Agregar Firma
                                      </button>
                                  )}
                              </div>

                              {/* Received By */}
                              {['coord_to_client', 'client_to_coord', 'coord_to_bodega'].includes(editingStage.stageKey) && (
                                  <div className="border p-4 rounded-lg">
                                      <div className="text-sm font-semibold mb-2 text-gray-600">Recibido por</div>
                                      {tempStageData.receivedBy ? (
                                          <div className="bg-gray-50 p-2 rounded">
                                              <img src={tempStageData.receivedBy.dataUrl} className="h-16 w-auto mb-2 mix-blend-multiply" alt="Firma" />
                                              <div className="text-xs font-bold">{tempStageData.receivedBy.name}</div>
                                              <button 
                                                  onClick={() => setTempStageData({...tempStageData, receivedBy: undefined})}
                                                  className="text-xs text-red-500 mt-2 underline"
                                              >
                                                  Eliminar Firma
                                              </button>
                                          </div>
                                      ) : (
                                          <button 
                                              onClick={() => setIsSignaturePadOpen('receivedBy')}
                                              className="w-full py-6 border-2 border-dashed rounded text-gray-400 text-sm hover:bg-gray-50"
                                          >
                                              + Agregar Firma
                                          </button>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Signature Pad Modal Overlay inside Modal */}
                      {isSignaturePadOpen && (
                          <div className="fixed inset-0 z-[60] bg-black bg-opacity-25 flex items-center justify-center p-4">
                              <div className="bg-white p-4 rounded-lg shadow-2xl max-w-lg w-full">
                                  <SignaturePad 
                                      label={isSignaturePadOpen === 'signature' ? 'Autorizado / Entregado por' : 'Recibido por'}
                                      onSave={handleSaveSignature}
                                      onCancel={() => setIsSignaturePadOpen(null)}
                                  />
                              </div>
                          </div>
                      )}

                  </div>

                  <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                          Estado: <span className={`font-bold ${tempStageData.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {tempStageData.status === 'completed' ? 'Completado' : 'Pendiente'}
                          </span>
                      </div>
                      <div className="space-x-3">
                          <button 
                              onClick={handleSaveStage}
                              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-white"
                          >
                              Guardar (Sin completar)
                          </button>
                          <button 
                              onClick={handleCompleteStage}
                              className="px-4 py-2 bg-brand-900 text-white rounded hover:bg-brand-800 shadow-md"
                          >
                              {tempStageData.status === 'completed' ? 'Actualizar Datos' : 'Completar Etapa'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
