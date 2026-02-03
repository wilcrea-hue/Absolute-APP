
import React, { useEffect, useState } from 'react';
import { X, Smartphone, Download, Share, PlusSquare, ArrowBigDown, Monitor, ChevronRight, CheckCircle2 } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose, deferredPrompt }) => {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) setPlatform('ios');
    else if (/android/.test(userAgent)) setPlatform('android');
    else setPlatform('desktop');
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-900/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
        <div className="relative h-48 bg-brand-900 flex flex-col items-center justify-center p-8 text-center">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors">
            <X size={24} />
          </button>
          <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center mb-4 border border-white/10 shadow-inner">
            <Download size={32} className="text-brand-400 animate-bounce" />
          </div>
          <h2 className="text-white font-black text-xl uppercase tracking-tighter">Descargar ABSOLUTE</h2>
          <p className="text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Versión Nativa de Escritorio y Móvil</p>
        </div>

        <div className="p-8 space-y-8">
          {platform === 'ios' ? (
            <div className="space-y-6">
              <p className="text-xs font-bold text-gray-500 text-center uppercase leading-relaxed">
                Para instalar en iPhone o iPad, siga estos pasos:
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-brand-900"><Share size={20} /></div>
                  <p className="text-[11px] font-black text-slate-700 uppercase">1. Toca el botón 'Compartir' en Safari</p>
                </div>
                <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-brand-900"><PlusSquare size={20} /></div>
                  <p className="text-[11px] font-black text-slate-700 uppercase">2. Selecciona 'Agregar al inicio'</p>
                </div>
              </div>
            </div>
          ) : platform === 'android' && deferredPrompt ? (
            <div className="space-y-6 text-center">
              <p className="text-xs font-bold text-gray-500 uppercase leading-relaxed">
                Haz clic abajo para instalar la aplicación en tu dispositivo Android.
              </p>
              <button 
                onClick={handleInstallClick}
                className="w-full bg-brand-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center space-x-3"
              >
                <Smartphone size={20} />
                <span>Instalar Aplicación</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-xs font-bold text-gray-500 text-center uppercase leading-relaxed">
                Instale la aplicación para un acceso rápido y notificaciones en tiempo real.
              </p>
              {deferredPrompt ? (
                <button 
                  onClick={handleInstallClick}
                  className="w-full bg-brand-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3"
                >
                  <Monitor size={20} />
                  <span>Descargar para PC / Mac</span>
                </button>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] text-center space-y-2">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                  <p className="text-[10px] font-black text-emerald-700 uppercase">Si ya estás en la versión instalada, ¡estás listo para trabajar!</p>
                </div>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center"><Smartphone size={14} className="text-slate-500" /></div>
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center"><Monitor size={14} className="text-slate-500" /></div>
            </div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter italic">Optimizado para todos los dispositivos</p>
          </div>
        </div>
      </div>
    </div>
  );
};
