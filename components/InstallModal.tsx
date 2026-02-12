
import React, { useEffect, useState } from 'react';
import { X, Smartphone, Download, Share, PlusSquare, Monitor, CheckCircle2 } from 'lucide-react';

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
    } else {
      // Si no hay prompt detectado, informar al usuario
      alert("Su navegador ya ha instalado la aplicación o no soporta instalación automática. Busque el icono 'ABSOLUTE' en su lista de programas.");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-900/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
        <div className="relative h-56 bg-brand-900 flex flex-col items-center justify-center p-10 text-center">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors">
            <X size={24} />
          </button>
          <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center mb-4 border border-white/10 shadow-inner">
            <Download size={40} className="text-brand-400 animate-bounce" />
          </div>
          <h2 className="text-white font-black text-2xl uppercase tracking-tighter">Instalar ABSOLUTE App</h2>
          <p className="text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Como programa en este dispositivo</p>
        </div>

        <div className="p-8 space-y-8">
          {platform === 'ios' ? (
            <div className="space-y-6">
              <p className="text-xs font-bold text-gray-500 text-center uppercase leading-relaxed">
                Apple no permite instalación automática. Siga estos pasos manuales:
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-brand-900"><Share size={20} /></div>
                  <p className="text-[11px] font-black text-slate-700 uppercase">1. Toca el botón 'Compartir' de Safari</p>
                </div>
                <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-brand-900"><PlusSquare size={20} /></div>
                  <p className="text-[11px] font-black text-slate-700 uppercase">2. Selecciona 'Agregar al inicio'</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <p className="text-xs font-bold text-gray-500 uppercase leading-relaxed">
                Descargue la aplicación para acceder sin usar el navegador y recibir notificaciones.
              </p>
              
              {deferredPrompt ? (
                <button 
                  onClick={handleInstallClick}
                  className="w-full bg-brand-900 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center space-x-3"
                >
                  {platform === 'desktop' ? <Monitor size={20} /> : <Smartphone size={20} />}
                  <span>Descargar e Instalar</span>
                </button>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] text-center space-y-3">
                  <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                  <p className="text-[11px] font-black text-emerald-800 uppercase tracking-widest">
                    ¡Aplicación ya instalada o abierta en modo nativo!
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center"><Smartphone size={14} className="text-slate-500" /></div>
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center"><Monitor size={14} className="text-slate-500" /></div>
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter italic">Optimizado para Teléfonos y Computadores</p>
          </div>
        </div>
      </div>
    </div>
  );
};
