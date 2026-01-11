
import React, { useState } from 'react';
import { User } from '../types';
import { LOGO_URL } from '../constants';
import { Mail, Lock, User as UserIcon, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string) => boolean;
  onRegister: (name: string, email: string) => boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegister) {
      if (name && email && password) {
        const registered = onRegister(name, email);
        if (registered) {
          setSuccess('¡Cuenta creada con éxito! Iniciando sesión...');
        } else {
          setError('El correo electrónico ya está registrado.');
        }
      } else {
        setError('Por favor complete todos los campos.');
      }
    } else {
      if (email && password) {
        const loggedIn = onLogin(email);
        if (!loggedIn) {
          setError('Credenciales incorrectas o usuario no encontrado.');
        }
      } else {
        setError('Por favor ingrese su correo y contraseña.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900 px-4 py-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8 md:p-10">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-brand-50 rounded-2xl border border-brand-100 shadow-inner">
                <img src={LOGO_URL} alt="ABSOLUTE Logo" className="h-16 w-auto object-contain" />
              </div>
            </div>
            <h1 className="text-4xl font-black text-brand-900 tracking-tighter uppercase">ABSOLUTE</h1>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">
              {isRegister ? 'Registro de Nuevo Usuario' : 'Acceso al Sistema Logístico'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center border border-red-100 animate-in fade-in slide-in-from-top-1">
                <span className="mr-2">⚠️</span> {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 p-4 rounded-xl text-xs font-bold flex items-center border border-green-100 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 size={16} className="mr-2" /> {success}
              </div>
            )}
            
            {isRegister && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Nombre Completo
                </label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-900 transition-colors" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-900 focus:bg-white focus:border-transparent outline-none transition-all text-sm font-medium"
                    placeholder="Juan Pérez"
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Correo Electrónico
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-900 transition-colors" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-900 focus:bg-white focus:border-transparent outline-none transition-all text-sm font-medium"
                  placeholder="usuario@absolute.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-900 transition-colors" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-900 focus:bg-white focus:border-transparent outline-none transition-all text-sm font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {!isRegister && (
              <div className="text-right">
                <button type="button" className="text-[10px] font-bold text-gray-400 hover:text-brand-900 transition-colors uppercase tracking-widest">
                  ¿Olvidó su contraseña?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-brand-800 transition-all duration-300 shadow-xl shadow-brand-900/20 active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <span>{isRegister ? 'Crear mi Cuenta' : 'Ingresar al Portal'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-medium">
              {isRegister ? '¿Ya tiene una cuenta?' : '¿No tiene una cuenta aún?'}
            </p>
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccess('');
              }}
              className="mt-2 text-[11px] font-black text-brand-900 uppercase tracking-widest hover:underline decoration-2 underline-offset-4 transition-all"
            >
              {isRegister ? 'Volver al Inicio de Sesión' : 'Registrarse Ahora'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-0 w-full text-center px-4">
        <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">
          &copy; {new Date().getFullYear()} ABSOLUTE COMPANY &bull; PLATAFORMA DE GESTIÓN OPERATIVA
        </p>
      </div>
    </div>
  );
};
