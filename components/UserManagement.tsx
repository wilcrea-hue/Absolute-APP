
import React, { useState } from 'react';
import { User } from '../types';
import { Search, User as UserIcon, Shield, Truck, UserCircle, Mail, ChevronRight } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onChangeUserRole: (email: string, newRole: 'admin' | 'user' | 'logistics') => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, currentUser, onChangeUserRole }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield size={14} className="mr-1" />;
      case 'logistics': return <Truck size={14} className="mr-1" />;
      default: return <UserCircle size={14} className="mr-1" />;
    }
  };

  const getRoleStyles = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'logistics': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Directorio de Usuarios</h3>
          <p className="text-sm text-gray-500">Administre los permisos y roles de acceso al sistema.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por email o nombre..." 
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-900 outline-none text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuario</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rol Actual</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Cambiar Permisos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredUsers.map(user => (
              <tr key={user.email} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-900 border border-brand-100">
                      <UserIcon size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 flex items-center">
                        {user.name}
                        {user.email === currentUser.email && (
                          <span className="ml-2 text-[9px] bg-gray-900 text-white px-1.5 py-0.5 rounded-full uppercase">Tú</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <Mail size={12} className="mr-1 opacity-50" /> {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getRoleStyles(user.role)}`}>
                    {getRoleIcon(user.role)}
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex bg-gray-100 p-1 rounded-xl gap-1">
                    <button 
                      onClick={() => onChangeUserRole(user.email, 'user')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${user.role === 'user' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Usuario
                    </button>
                    <button 
                      onClick={() => onChangeUserRole(user.email, 'logistics')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${user.role === 'logistics' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Logística
                    </button>
                    <button 
                      onClick={() => onChangeUserRole(user.email, 'admin')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${user.role === 'admin' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Admin
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-gray-500 italic text-sm">
                  No se encontraron usuarios que coincidan con "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
