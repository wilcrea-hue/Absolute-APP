
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { LOGO_URL } from '../constants';
import { Mail, Lock, User as UserIcon, ArrowRight, CheckCircle2, Phone, ShieldCheck, Download, Smartphone } from 'lucide-react';
import { InstallModal } from './InstallModal';

interface LoginProps {
  onLogin: (email: string, password?: string) => { success: boolean, message?: string };
  onRegister: (name: string, email: string, phone: string, password?: string) => boolean;
  deferredPrompt: any;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onRegister, deferredPrompt }) => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegister) {
      if (name && email && password && phone) {
        const registered = onRegister(name, email, phone, password);
        if (registered) {
          setSuccess('¡Cuenta creada con éxito! Espere aprobación del administrador.');
          setIsRegister(false);
        } else {
          setError('El correo electrónico ya está registrado.');
        }
      } else {
        setError('Por favor complete todos los campos.');
      }
    } else {
      if (email && password) {
        const result = onLogin(email, password);
        if (result.success) {
          navigate('/'); // Redirección automática al catálogo al ingresar
        } else {
          setError(result.message || 'Error al iniciar sesión.');
        }
      } else {
        setError('Por favor ingrese su correo y contraseña.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000033] px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/20 rounded-full blur-[160px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-400/10 rounded-full blur-[140px]"></div>
      </div>

      <div className="max-w-lg w-full relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden border border-white/10 backdrop-blur-sm">
          <div className="p-10 md:p-14">
            <div className="text-center mb-10">
              <div className="flex justify-center mb-6">
                <div className="w-full max-w-[220px] transform hover:scale-105 transition-transform duration-500 overflow-hidden rounded-[2rem]">
                  <img src={LOGO_URL} alt="ABSOLUTE COMPANY" className="w-full h-auto object-contain drop-shadow-xl" />
                </div>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-brand-50 rounded-full border border-brand-100">
                <ShieldCheck size={14} className="text-brand-900" />
                <p className="text-brand-900 font-black text-[10px] uppercase tracking-[0.3em]">
                  {isRegister ? 'Registro de Usuario' : 'Acceso Autorizado'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-[11px] font-black uppercase tracking-tight flex items-center border border-red-100 animate-in slide-in-from-top-2 duration-300">
                  <span className="mr-3 text-lg">⚠️</span> {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-[11px] font-black uppercase tracking-tight flex items-center border border-emerald-100 animate-in slide-in-from-top-2 duration-300">
                  <CheckCircle2 size={18} className="mr-3" /> {success}
                </div>
              )}
              
              {isRegister && (
                <>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-900 transition-colors" size={20} />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-brand-900/5 focus:bg-white focus:border-brand-900 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                        placeholder="Juan Pérez"
                        required={isRegister}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Celular</label>
                    <div className="relative group">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-900 transition-colors" size={20} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-brand-900/5 focus:bg-white focus:border-brand-900 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                        placeholder="+57 300 123 4567"
                        required={isRegister}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-900 transition-colors" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-brand-900/5 focus:bg-white focus:border-brand-900 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                    placeholder="usuario@absolutecompany.co"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-900 transition-colors" size={20} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-brand-900/5 focus:bg-white focus:border-brand-900 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#000033] text-white py-5 rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.3em] hover:bg-brand-900 transition-all duration-300 shadow-2xl shadow-brand-900/40 active:scale-[0.96] flex items-center justify-center space-x-3 group mt-4"
              >
                <span>{isRegister ? 'Crear mi Cuenta' : 'Entrar al Portal'}</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-8">
               <button 
                onClick={() => setIsInstallModalOpen(true)}
                className="w-full flex items-center justify-center space-x-3 bg-brand-900/5 hover:bg-brand-900/10 text-brand-900 py-4 rounded-2xl border border-brand-900/10 transition-all group"
               >
                  <div className="w-8 h-8 bg-brand-900 text-white rounded-lg flex items-center justify-center shadow-md">
                    <Smartphone size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Descargar App</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Instalar en este dispositivo</p>
                  </div>
                  <Download size={14} className="ml-auto mr-2 text-brand-400 group-hover:translate-y-0.5 transition-transform" />
               </button>
            </div>

            <div className="mt-14 pt-8 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                {isRegister ? '¿Ya tiene acceso?' : '¿No tiene una cuenta aún?'}
              </p>
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                  setSuccess('');
                }}
                className="mt-4 text-[11px] font-black text-brand-900 uppercase tracking-[0.2em] hover:text-blue-800 transition-colors border-b-2 border-brand-900/20 hover:border-brand-900 pb-1"
              >
                {isRegister ? 'Volver al Inicio de Sesión' : 'Solicitar Registro de Usuario'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <InstallModal 
        isOpen={isInstallModalOpen} 
        onClose={() => setIsInstallModalOpen(false)} 
        deferredPrompt={deferredPrompt} 
      />
    </div>
  );
};
