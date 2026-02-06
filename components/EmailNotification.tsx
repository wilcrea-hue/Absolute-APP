
import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, X, ExternalLink, ShieldCheck, Edit3, Save, Send, ShieldAlert, Lock } from 'lucide-react';
import { LOGO_URL } from '../constants';

interface EmailNotificationProps {
  email: {
    to: string;
    cc: string;
    subject: string;
    body: string;
    stage: string;
  } | null;
  onClose: () => void;
}

export const EmailNotification: React.FC<EmailNotificationProps> = ({ email, onClose }) => {
  const [editableBody, setEditableBody] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Sincronizar el cuerpo editable cuando llega un nuevo correo
  useEffect(() => {
    if (email) {
      setEditableBody(email.body);
      setIsSent(false);
      setIsEditing(false);
    }
  }, [email]);

  if (!email) return null;

  const handleSend = () => {
    setIsSent(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const openPreview = () => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>ABSOLUTE - Previsualización Final</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #000033; background: #f1f5f9; margin: 0; padding: 40px; }
              .card { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,51,0.15); border: 1px solid #e2e8f0; }
              .header { background: #000033; padding: 50px 40px; text-align: center; position: relative; }
              .logo { height: 45px; filter: brightness(1.1); }
              .content { padding: 50px 60px; }
              h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #000033; border-bottom: 3px solid #f1f5f9; padding-bottom: 25px; margin-bottom: 35px; }
              .body-text { font-size: 15px; color: #334155; white-space: pre-wrap; line-height: 1.8; }
              .footer { padding: 35px 40px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
              .cc-notice { margin-top: 40px; padding: 20px; background: #f0f9ff; border-radius: 20px; font-size: 11px; font-weight: 800; color: #0ea5e9; text-align: center; border: 1px border-blue-100; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header"><img src="${LOGO_URL}" class="logo" /></div>
              <div class="content">
                <h1>${email.subject}</h1>
                <div class="body-text">${editableBody}</div>
                <div class="cc-notice">COPIA DE SEGURIDAD ENVIADA A: admin@absolutecompany.co</div>
              </div>
              <div class="footer">&copy; ${new Date().getFullYear()} ABSOLUTE COMPANY - LOGÍSTICA DE EVENTOS</div>
            </div>
          </body>
        </html>
      `);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-brand-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0c0c2a] text-white w-full max-w-2xl rounded-[3rem] shadow-[0_60px_120px_-20px_rgba(0,0,51,0.6)] border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 relative">
        
        {/* Marca de Agua Admin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none rotate-[-15deg]">
           <ShieldAlert size={400} />
        </div>

        {/* Header del Editor Administrativo */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/40">
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-brand-400/10 rounded-2xl flex items-center justify-center text-brand-400 border border-brand-400/20 shadow-inner">
              <Lock size={28} />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-400">Panel de Control de Mensajería</span>
                <span className="bg-brand-400/10 text-brand-400 px-2 py-0.5 rounded text-[7px] font-black uppercase border border-brand-400/20">Admin Only</span>
              </div>
              <h3 className="text-base font-black uppercase tracking-widest">{email.stage}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/30 hover:text-white transition-colors bg-white/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-y-auto no-scrollbar max-h-[65vh] relative z-10">
          {/* Logo en el cuerpo para contexto visual */}
          <div className="flex justify-center mb-8 opacity-40">
            <img src={LOGO_URL} alt="ABSOLUTE" className="h-6 w-auto" />
          </div>

          {/* Destinatarios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <p className="text-[9px] text-white/40 font-black uppercase mb-1.5 flex items-center tracking-widest">
                <Mail size={10} className="mr-1.5" /> Cliente (Para):
              </p>
              <p className="text-[11px] font-bold text-white/90 truncate">{email.to}</p>
            </div>
            <div className="bg-emerald-500/5 rounded-2xl p-5 border border-emerald-500/20 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[9px] text-emerald-400/60 font-black uppercase mb-1.5 flex items-center tracking-widest">
                  <ShieldCheck size={10} className="mr-1.5" /> Copia (Admin):
                </p>
                <p className="text-[11px] font-bold text-emerald-400 truncate">{email.cc}</p>
              </div>
              <CheckCircle size={16} className="text-emerald-500 ml-3 shrink-0" />
            </div>
          </div>

          {/* Asunto */}
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <p className="text-[9px] text-white/40 font-black uppercase mb-1.5 tracking-widest">Asunto del Comunicado:</p>
            <p className="text-[12px] font-black text-white">{email.subject}</p>
          </div>

          {/* Cuerpo Editable */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <p className="text-[9px] text-white/30 font-black uppercase flex items-center tracking-widest">
                <Edit3 size={10} className="mr-2" /> Redacción de Mensaje
              </p>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`text-[9px] font-black uppercase flex items-center space-x-2 px-3 py-1.5 rounded-xl transition-all ${isEditing ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/5 text-brand-400 hover:bg-white/10'}`}
              >
                {isEditing ? <><Save size={12} /> <span>Validar Cambios</span></> : <><Edit3 size={12} /> <span>Modificar Texto</span></>}
              </button>
            </div>
            
            <div className="relative">
              <textarea 
                value={editableBody}
                readOnly={!isEditing}
                onChange={(e) => setEditableBody(e.target.value)}
                className={`w-full min-h-[220px] p-8 rounded-[2.5rem] text-[13px] font-medium leading-relaxed outline-none transition-all resize-none shadow-inner ${
                  isEditing 
                    ? 'bg-white text-brand-900 ring-4 ring-brand-400/30' 
                    : 'bg-black/20 text-white/60 border border-white/5 cursor-default'
                }`}
              />
              {!isEditing && (
                <div className="absolute bottom-6 right-8 pointer-events-none">
                   <div className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full text-[8px] font-black uppercase text-white/30 border border-white/5">Vista de Lectura</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones de Despacho */}
        <div className="p-8 bg-black/40 border-t border-white/5 flex flex-col md:flex-row gap-4 relative z-10">
          <button 
            onClick={openPreview}
            className="flex-1 bg-white/5 text-white/70 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center space-x-3 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98] border border-white/5"
          >
            <ExternalLink size={16} />
            <span>Previsualización</span>
          </button>

          <button 
            onClick={handleSend}
            disabled={isSent}
            className={`flex-[1.5] py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center space-x-3 shadow-2xl transition-all active:scale-[0.98] ${
              isSent 
                ? 'bg-emerald-500 text-white' 
                : 'bg-brand-400 text-brand-900 hover:bg-white'
            }`}
          >
            {isSent ? (
              <><CheckCircle size={18} /> <span>Correo Despachado</span></>
            ) : (
              <><Send size={18} /> <span>Autorizar Despacho</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
