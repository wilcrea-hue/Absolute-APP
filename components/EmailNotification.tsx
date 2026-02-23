
import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, X, ExternalLink, Edit3, Save, Send, FileText, Loader2, AlertCircle } from 'lucide-react';
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
  onSentSuccess?: () => void;
}

export const EmailNotification: React.FC<EmailNotificationProps> = ({ email, onClose, onSentSuccess }) => {
  const [editableBody, setEditableBody] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (email) {
      setEditableBody(email.body);
      setStatus('idle');
      setIsEditing(false);
    }
  }, [email]);

  if (!email) return null;

  const generateFullHtml = () => {
    const isQuote = email.order?.orderType === 'quote';
    const s = new Date(email.order?.startDate || '');
    const e = new Date(email.order?.endDate || '');
    const days = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const itemsHtml = email.order?.items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center; color: #334155;">$${item.priceRent.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center; color: #334155;">${days}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center; color: #334155;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; text-align: right; color: #000033;">$${(item.priceRent * item.quantity * days).toLocaleString()}</td>
      </tr>
    `).join('');

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #000033; background-color: #f1f5f9; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 30px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,51,0.1); border: 1px solid #e2e8f0;">
          <div style="background: #000033; padding: 40px; text-align: center;">
            <img src="${LOGO_URL}" style="height: 50px;" alt="ABSOLUTE" />
          </div>
          <div style="padding: 40px;">
            <h1 style="font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">${email.subject}</h1>
            <div style="font-size: 14px; color: #475569; margin-bottom: 30px; white-space: pre-wrap;">${editableBody}</div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0;">Ítem</th>
                  <th style="padding: 10px; text-align: center; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0;">Precio</th>
                  <th style="padding: 10px; text-align: center; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0;">Días</th>
                  <th style="padding: 10px; text-align: center; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0;">Cant.</th>
                  <th style="padding: 10px; text-align: right; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0;">Total</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <div style="background: #f8fafc; padding: 20px; border-radius: 15px; text-align: right; margin-bottom: 30px;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Inversión Total</p>
              <h2 style="margin: 5px 0 0; font-size: 24px; font-weight: 900; color: #000033;">$${email.order?.totalAmount.toLocaleString()}</h2>
              <p style="margin: 5px 0 0; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700;">(precios sin IVA.)</p>
            </div>

            <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; pt: 20px; text-align: center;">
              Este es un correo automático generado por ABSOLUTE App.<br>
              &copy; ${new Date().getFullYear()} ABSOLUTE COMPANY
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const handleSend = async () => {
    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch('./api/send_email.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.to,
          cc: email.cc,
          subject: email.subject,
          html: generateFullHtml()
        })
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        if (onSentSuccess) onSentSuccess();
        setTimeout(() => onClose(), 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.message || 'Error desconocido del servidor.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage('No se pudo conectar con el servidor de correo.');
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-brand-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0c0c2a] text-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-brand-400/10 rounded-2xl flex items-center justify-center text-brand-400 border border-brand-400/20">
              <FileText size={24} />
            </div>
            <div>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-brand-400">Notificación Logística</span>
              <h3 className="text-sm font-black uppercase tracking-widest">{email.stage}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/30 hover:text-white transition-colors bg-white/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-y-auto no-scrollbar max-h-[50vh]">
          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center space-x-3 text-red-400">
              <AlertCircle size={20} />
              <p className="text-[10px] font-black uppercase tracking-widest">{errorMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-[8px] text-white/40 font-black uppercase mb-1 tracking-widest">Enviar A:</p>
              <p className="text-[11px] font-bold text-white/90 truncate">{email.to}</p>
            </div>
            <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/20">
              <p className="text-[8px] text-emerald-400/60 font-black uppercase mb-1 tracking-widest">Copia (CC):</p>
              <p className="text-[11px] font-bold text-emerald-400">{email.cc || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <p className="text-[8px] text-white/30 font-black uppercase tracking-widest">Mensaje Personalizado</p>
              <button onClick={() => setIsEditing(!isEditing)} className={`text-[8px] font-black uppercase flex items-center space-x-2 px-3 py-1.5 rounded-xl transition-all ${isEditing ? 'bg-emerald-500 text-white' : 'bg-white/5 text-brand-400'}`}>
                {isEditing ? <><Save size={10} /> <span>Listo</span></> : <><Edit3 size={10} /> <span>Editar Texto</span></>}
              </button>
            </div>
            <textarea 
              value={editableBody}
              readOnly={!isEditing}
              onChange={(e) => setEditableBody(e.target.value)}
              className={`w-full min-h-[150px] p-6 rounded-[2rem] text-[12px] font-medium leading-relaxed outline-none transition-all resize-none ${isEditing ? 'bg-white text-brand-900 shadow-inner' : 'bg-black/20 text-white/60 border border-white/5'}`}
            />
          </div>
        </div>

        <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4">
          <button 
            disabled={status === 'sending' || status === 'success'}
            onClick={handleSend} 
            className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center space-x-3 shadow-2xl transition-all ${status === 'success' ? 'bg-emerald-500 text-white' : 'bg-brand-400 text-brand-900 hover:scale-[1.02]'}`}
          >
            {status === 'sending' ? (
              <><Loader2 size={18} className="animate-spin" /> <span>Enviando...</span></>
            ) : status === 'success' ? (
              <><CheckCircle size={18} /> <span>¡Correo Enviado!</span></>
            ) : (
              <><Send size={18} /> <span>Autorizar y Enviar Correo</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
