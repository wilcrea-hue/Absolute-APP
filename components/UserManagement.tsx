
import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { Search, User as UserIcon, Shield, Truck, UserCircle, Mail, Phone, MapPin, Trash2, Pause, Play, Clock, ArrowUpDown, ChevronUp, ChevronDown, Percent, Edit3 } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onChangeUserRole: (email: string, newRole: User['role']) => void;
  onChangeUserDiscount: (email: string, discount: number) => void;
  onUpdateUserDetails?: (email: string, details: Partial<User>) => void;
  onToggleStatus?: (email: string) => void;
  onDeleteUser?: (email: string) => void;
}

type SortField = 'name' | 'email' | 'role' | 'status' | 'discount';
type SortOrder = 'asc' | 'desc';

export const UserManagement: React.FC<UserManagementProps> = ({ 
  users, 
  currentUser, 
  onChangeUserRole,
  onChangeUserDiscount,
  onUpdateUserDetails,
  onToggleStatus,
  onDeleteUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; phone: string }>({ name: '', phone: '' });

  const sortedAndFilteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let result = users.filter(user => {
      const name = user.name.toLowerCase();
      const email = user.email.toLowerCase();
      const phone = (user.phone || '').toLowerCase();
      const status = (user.status || 'active').toLowerCase();
      
      // Mapeo semántico para búsqueda en español
      const statusLabel = status === 'on-hold' ? 'espera pendiente hold' : 'activo active';

      return name.includes(term) || 
             email.includes(term) || 
             phone.includes(term) || 
             status.includes(term) ||
             statusLabel.includes(term);
    });

    result.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'email':
          valA = a.email.toLowerCase();
          valB = b.email.toLowerCase();
          break;
        case 'role':
          valA = a.role.toLowerCase();
          valB = b.role.toLowerCase();
          break;
        case 'status':
          valA = a.status || 'active';
          valB = b.status || 'active';
          break;
        case 'discount':
          valA = a.discountPercentage || 0;
          valB = b.discountPercentage || 0;
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchTerm, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const startEditing = (user: User) => {
    setEditingEmail(user.email);
    setEditValues({ name: user.name, phone: user.phone || '' });
  };

  const saveEdit = (email: string) => {
    if (onUpdateUserDetails) {
      onUpdateUserDetails(email, { name: editValues.name, phone: editValues.phone });
    }
    setEditingEmail(null);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield size={14} className="mr-1" />;
      case 'logistics': return <Truck size={14} className="mr-1" />;
      case 'coordinator': return <MapPin size={14} className="mr-1" />;
      default: return <UserCircle size={14} className="mr-1" />;
    }
  };

  const getRoleStyles = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'logistics': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'coordinator': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="ml-1.5 opacity-30" />;
    return sortOrder === 'asc' 
      ? <ChevronUp size={12} className="ml-1.5 text-brand-900" /> 
      : <ChevronDown size={12} className="ml-1.5 text-brand-900" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest">Nómina del Sistema</h3>
          <p className="text-[11px] text-gray-500 font-bold uppercase">Gestión de privilegios, acceso jerárquico y datos de contacto.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, email, teléfono o estado (pendiente/activo)..." 
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-900 outline-none text-xs font-bold transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Identidad
                    <SortIndicator field="name" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('role')}
                >
                  <div className="flex items-center justify-center">
                    Rol
                    <SortIndicator field="role" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('discount')}
                >
                  <div className="flex items-center justify-center">
                    % Descuento
                    <SortIndicator field="discount" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center">
                    Estado
                    <SortIndicator field="status" />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Controles Operativos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedAndFilteredUsers.map(user => {
                const isOnHold = user.status === 'on-hold';
                const isEditing = editingEmail === user.email;

                return (
                  <tr key={user.email} className={`hover:bg-slate-50/30 transition-colors group ${isOnHold ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isOnHold ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-brand-50 text-brand-900 border-brand-100'}`}>
                          {isOnHold ? <Clock size={20} /> : <UserIcon size={20} />}
                        </div>
                        <div className="flex-1 min-w-[180px]">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input 
                                type="text"
                                value={editValues.name}
                                onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                              />
                              <input 
                                type="tel"
                                value={editValues.phone}
                                onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                                placeholder="Teléfono"
                              />
                              <button 
                                onClick={() => saveEdit(user.email)}
                                className="text-[8px] bg-brand-900 text-white px-3 py-1 rounded-md uppercase font-black"
                              >Guardar</button>
                            </div>
                          ) : (
                            <>
                              <div className="text-sm font-black text-gray-900 flex items-center">
                                {user.name}
                                {user.email === currentUser.email && (
                                  <span className="ml-2 text-[9px] bg-brand-900 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Tú</span>
                                )}
                                <button onClick={() => startEditing(user)} className="ml-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-900 transition-all">
                                  <Edit3 size={12} />
                                </button>
                              </div>
                              <div className="text-[10px] text-gray-400 font-bold flex flex-col mt-0.5">
                                <span className="flex items-center"><Mail size={12} className="mr-1.5 opacity-50" /> {user.email}</span>
                                <span className="flex items-center mt-1"><Phone size={12} className="mr-1.5 opacity-50" /> {user.phone || 'Sin número'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getRoleStyles(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="relative inline-flex items-center group">
                        <Percent size={10} className="absolute left-3 text-slate-400" />
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={user.discountPercentage || 0}
                          onChange={(e) => onChangeUserDiscount(user.email, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-20 pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-[11px] font-black text-brand-900 focus:ring-2 focus:ring-brand-900 focus:bg-white outline-none transition-all"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {isOnHold ? (
                        <span className="text-[8px] bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-black inline-block">EN ESPERA</span>
                      ) : (
                        <span className="text-[8px] bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-black inline-block">ACTIVO</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end space-x-4">
                        <div className="inline-flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                          <button 
                            onClick={() => onChangeUserRole(user.email, 'user')}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${user.role === 'user' ? 'bg-white text-blue-700 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            Usuario
                          </button>
                          <button 
                            onClick={() => onChangeUserRole(user.email, 'logistics')}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${user.role === 'logistics' ? 'bg-white text-orange-700 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            Bodega
                          </button>
                          <button 
                            onClick={() => onChangeUserRole(user.email, 'coordinator')}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${user.role === 'coordinator' ? 'bg-white text-emerald-700 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            Coord
                          </button>
                          <button 
                            onClick={() => onChangeUserRole(user.email, 'admin')}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${user.role === 'admin' ? 'bg-white text-purple-700 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            Admin
                          </button>
                        </div>
                        
                        <div className="flex space-x-1 border-l border-slate-200 pl-4">
                            {onToggleStatus && user.email !== currentUser.email && (
                                <button 
                                    onClick={() => onToggleStatus(user.email)}
                                    className={`p-2 rounded-xl transition-all shadow-sm ${isOnHold ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white'}`}
                                    title={isOnHold ? "Activar Usuario" : "Poner en Espera"}
                                >
                                    {isOnHold ? <Play size={16} /> : <Pause size={16} />}
                                </button>
                            )}
                            {onDeleteUser && user.email !== currentUser.email && (
                                <button 
                                    onClick={() => onDeleteUser(user.email)}
                                    className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                    title="Eliminar Usuario"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
