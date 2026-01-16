
import React, { useState } from 'react';
import { User } from '../types';
import { Search, User as UserIcon, Shield, Truck, UserCircle, Mail, Phone, MapPin, Trash2, Pause, Play, Clock } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onChangeUserRole: (email: string, newRole: User['role']) => void;
  onToggleStatus?: (email: string) => void;
  onDeleteUser?: (email: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ 
  users, 
  currentUser, 
  onChangeUserRole,
  onToggleStatus,
  onDeleteUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone && user.phone.includes(searchTerm))
  );

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest">Nómina del Sistema</h3>
          <p className="text-[11px] text-gray-500 font-bold uppercase">Gestión de privilegios y acceso jerárquico.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por email, nombre..." 
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identidad</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado / Rol</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Controles Operativos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => {
                const isOnHold = user.status === 'on-hold';
                return (
                  <tr key={user.email} className={`hover:bg-slate-50/30 transition-colors group ${isOnHold ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isOnHold ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-brand-50 text-brand-900 border-brand-100'}`}>
                          {isOnHold ? <Clock size={20} /> : <UserIcon size={20} />}
                        </div>
                        <div>
                          <div className="text-sm font-black text-gray-900 flex items-center">
                            {user.name}
                            {user.email === currentUser.email && (
                              <span className="ml-2 text-[9px] bg-brand-900 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Tú</span>
                            )}
                            {isOnHold && (
                                <span className="ml-2 text-[8px] bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-black">EN ESPERA</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold flex items-center mt-0.5">
                            <Mail size={12} className="mr-1.5 opacity-50" /> {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getRoleStyles(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
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
                            Logística
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