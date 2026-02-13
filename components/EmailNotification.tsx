
import React, { useState, useEffect } from 'react';
// Correctly imported FileCheck to resolve the compilation error on line 112
import { Mail, CheckCircle, X, ExternalLink, ShieldCheck, Edit3, Save, Send, ShieldAlert, Lock, FileText, Loader2, AlertCircle, Copy, ClipboardCheck, FileCheck, Users } from 'lucide-react';
import { LOGO_URL } from '../constants';
import { Order } from '../types';

interface EmailNotificationProps {
  email: {
    to: string;
    cc: string;
    subject: string;
    body: string;
    stage: string;
    order?: Order;
  } | null;
  onClose: () => void;
}

export const EmailNotification: React.FC<EmailNotificationProps> = ({ email, onClose }) => {
  const [editableBody, setEditableBody] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'text' | 'html' | null>(null);

  useEffect(() => {
    if (email) {
      setEditableBody(email.body);
      setIsSent(false);
      setIsEditing(false);
      setError(null);
      setCopiedType(null);
    }
  }, [email]);

  if (!email) return null;

  const copyToClipboard = async (type: 'text' | 'html') => {
    try {
      const content = type === 'text' ? editableBody.replace(/<[^>]*>?/gm, '') : editableBody;
      await navigator.clipboard.writeText(content);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setError(null);

    try {
      // Intentamos envío vía API
      const response = await fetch('./api/send_email.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.to,
          cc: email.cc,
          subject: email.subject,
          body: editableBody,
          orderId: email.order?.id
        })
      });

      if (response.ok) {
        setIsSent(true);
        setTimeout(() => onClose(), 2000);
      } else {
        throw new Error("Servidor de correo no configurado");
      }
    } catch (err) {
      // Fallback a Mailto: con CC incluido
      const cleanBody = editableBody.replace(/<[^>]*>?/gm, '');
      const mailtoUrl = `mailto:${email.to}?cc=${email.cc}&subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(cleanBody)}`;
      
      // Abrimos el cliente de correo
      window.open(mailtoUrl, '_blank');
      
      setIsSent(true);
      setError("Redirigiendo a su aplicación de correo local...");
      setTimeout(() => onClose(), 3000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-brand-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0a0a25] text-white w-full max-w-4xl rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
        
        {/* Panel Izquierdo: Configuración */}
        <div className="w-full md:w-80 bg-black/40 p-8 border-r border-white/5 flex flex-col">
          <div className="mb-10">
            <img src={LOGO_URL} alt="ABSOLUTE" className="h-10 mb-6 brightness-125" />
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-brand-400/10 rounded-full border border-brand-400/20">
              <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse"></div>
              <span className="text-[8px] font-black uppercase tracking-widest text-brand-400">Canal de Notificación</span>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Destinatario</p>
              <p className="text-[11px] font-bold text-white truncate">{email.to}</p>
            </div>
            
            <div className="space-y-1 p-3 bg-brand-400/5 rounded-xl border border-brand-400/10">
              <p className="text-[9px] font-black text-brand-400 uppercase tracking-widest flex items-center">
                <Users size={10} className="mr-1.5" /> Copia de Seguridad (CC)
              </p>
              <p className="text-[10px] font-bold text-white truncate mt-1 opacity-70">{email.cc}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Etapa Actual</p>
              <div className="flex items-center text-[#4fb7f7] font-black text-[10px] uppercase">
                <FileCheck size={12} className="mr-2" /> {email.stage}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 space-y-3">
            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2 text-center">Herramientas Manuales</p>
            <button 
              onClick={() => copyToClipboard('text')}
              className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-between group"
            >
              <span className="flex items-center"><Copy size={12} className="mr-2 opacity-50" /> Copiar Texto</span>
              {copiedType === 'text' && <ClipboardCheck size={12} className="text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Panel Derecho: Editor y Envío */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail size={18} className="text-brand-400" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em]">Despacho de Mensajería Absolute</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X size={20} className="text-white/20" />
            </button>
          </div>

          <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-6">
            {error && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center space-x-3 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                 <AlertCircle size={16} />
                 <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest">Asunto del Correo</label>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-sm font-black text-white">
                {email.subject}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest">Vista Previa del Contenido</label>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${isEditing ? 'bg-brand-400 text-brand-900' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                >
                  {isEditing ? 'Guardar Cambios' : 'Editar Mensaje'}
                </button>
              </div>
              
              <div className="relative">
                {!isEditing && (
                  <div className="absolute top-6 left-6 pointer-events-none opacity-20">
                    <img src={LOGO_URL} alt="ABSOLUTE" className="h-6" />
                  </div>
                )}
                <textarea 
                  value={editableBody}
                  readOnly={!isEditing}
                  onChange={(e) => setEditableBody(e.target.value)}
                  className={`w-full min-h-[250px] p-6 rounded-3xl text-[13px] font-medium leading-relaxed outline-none transition-all resize-none ${isEditing ? 'bg-white text-brand-900' : 'bg-black/40 text-white/80 border border-white/5 shadow-inner'}`}
                  placeholder="Escriba el contenido del correo..."
                />
              </div>
            </div>
          </div>

          <div className="p-8 bg-black/40 border-t border-white/5 flex items-center gap-4">
            <div className="flex-1 flex items-center space-x-2 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
               <ShieldCheck size={14} className="text-emerald-400" />
               <p className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">Branding y CC Administrativa Validados</p>
            </div>
            
            <button 
              onClick={handleSend}
              disabled={isSending || isSent}
              className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center space-x-3 transition-all ${isSent ? 'bg-emerald-500 text-white' : 'bg-[#4fb7f7] text-white hover:bg-white hover:text-[#4fb7f7] shadow-xl shadow-[#4fb7f7]/20 active:scale-95'}`}
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : isSent ? <CheckCircle size={16} /> : <Send size={16} />}
              <span>{isSent ? 'Procesado' : 'Autorizar Envío'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
