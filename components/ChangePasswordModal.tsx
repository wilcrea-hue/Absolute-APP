
import React, { useState } from 'react';
import { X, Lock, CheckCircle2, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { User } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (newPassword: string) => void;
  currentUser: User;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onUpdate, currentUser }) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar contraseña actual si el usuario tiene una definida
    if (currentUser.password && currentPass !== currentUser.password) {
      setError('La contraseña actual es incorrecta.');
      return;
    }

    if (newPass.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsProcessing(true);
    
    // Simular pequeño retraso para feedback visual
    setTimeout(() => {
      onUpdate(newPass);
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        onClose();
      }, 2000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-brand-900/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="p-10">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-900 border border-brand-100">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest">Seguridad</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Cambio de Contraseña</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {isSuccess ? (
            <div className="py-10 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto border border-emerald-100 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={40} />
              </div>
              <h4 className="text-lg font-black text-brand-900 uppercase">¡Actualizada!</h4>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Tu contraseña ha sido cambiada correctamente.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-[11px] font-black uppercase tracking-tight flex items-center border border-red-100 animate-in slide-in-from-top-2">
                  <ShieldAlert size={16} className="mr-3 shrink-0" /> {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Actual</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-900 transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-brand-900/5 focus:bg-white focus:border-brand-900 outline-none transition-all text-sm font-bold"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-900 transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-brand-900/5 focus:bg-white focus:border-brand-900 outline-none transition-all text-sm font-bold"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nueva Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-900 transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-brand-900/5 focus:bg-white focus:border-brand-900 outline-none transition-all text-sm font-bold"
                    placeholder="Repita la nueva contraseña"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-[#000033] text-white py-5 rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.2em] hover:bg-brand-900 transition-all duration-300 shadow-2xl shadow-brand-900/30 active:scale-[0.96] flex items-center justify-center space-x-3 group disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>Guardar Cambios</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
