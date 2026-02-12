
import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, X, ExternalLink, ShieldCheck, Edit3, Save, Send, ShieldAlert, Lock, FileText } from 'lucide-react';
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
    setTimeout(() => onClose(), 2000);
  };

  const openPreview = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const isQuote = email.order?.orderType === 'quote';
    const s = new Date(email.order?.startDate || '');
    const e = new Date(email.order?.endDate || '');
    const days = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const itemsHtml = email.order?.items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center;">$${item.priceRent.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center;">${days}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; text-align: right;">$${(item.priceRent * item.quantity * days).toLocaleString()}</td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>ABSOLUTE - Documento Corporativo</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #000033; background: #f1f5f9; margin: 0; padding: 40px; }
            .card { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 40px; overflow: hidden; box-shadow: 0 40px 100px -20px rgba(0,0,51,0.2); border: 1px solid #e2e8f0; }
            .header { background: #000033; padding: 60px 40px; text-align: center; }
            .logo { height: 70px; filter: brightness(1.2); }
            .content { padding: 60px; }
            h1 { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #000033; border-bottom: 4px solid #f1f5f9; padding-bottom: 30px; margin-bottom: 40px; }
            .item-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .item-table th { background: #f8fafc; padding: 15px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            .body-text { font-size: 15px; color: #334155; white-space: pre-wrap; line-height: 1.8; margin-bottom: 40px; }
            .summary { background: #000033; color: #fff; padding: 30px; border-radius: 24px; text-align: right; margin-bottom: 40px; }
            .summary p { margin: 0; font-size: 12px; text-transform: uppercase; opacity: 0.7; }
            .summary h2 { margin: 5px 0 0; font-size: 32px; font-weight: 900; }
            .vat-note { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #4fb7f7; margin-top: 5px; display: block; }
            .policies { background: #fff7ed; border: 1px solid #ffedd5; padding: 25px; border-radius: 20px; font-size: 12px; color: #9a3412; }
            .policies h4 { margin: 0 0 10px; text-transform: uppercase; font-weight: 900; }
            .footer { padding: 40px; background: #f8fafc; text-align: center; font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header"><img src="${LOGO_URL}" class="logo" /></div>
            <div class="content">
              <h1>${email.subject}</h1>
              
              <table class="item-table">
                <thead>
                  <tr>
                    <th>Descripción Item</th>
                    <th style="text-align: center;">V. Unitario</th>
                    <th style="text-align: center;">Días</th>
                    <th style="text-align: center;">Cant.</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>

              <div class="summary">
                <p>Inversión Total Estimada (Antes de IVA)</p>
                <h2>$${email.order?.totalAmount.toLocaleString() || '0'}</h2>
                <span class="vat-note">Valores fuera de IVA</span>
              </div>

              <div class="body-text">${editableBody}</div>

              <div class="policies">
                <h4>Políticas de Cotización</h4>
                <p>• La validez de esta cotización es de 15 días hábiles a partir de la fecha de emisión.</p>
                <p>• Los valores expresados no incluyen el impuesto al valor agregado (IVA).</p>
                <p>• La disponibilidad de los ítems y servicios está sujeta a la existencia física en el inventario al momento de la confirmación formal del pedido.</p>
              </div>
            </div>
            <div class="footer">&copy; ${new Date().getFullYear()} ABSOLUTE COMPANY - LOGÍSTICA Y EVENTOS DE ALTO IMPACTO</div>
          </div>
        </body>
      </html>
    `);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-brand-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0c0c2a] text-white w-full max-w-3xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/40">
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-brand-400/10 rounded-2xl flex items-center justify-center text-brand-400 border border-brand-400/20">
              <FileText size={28} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-400">Editor Administrativo de Despacho</span>
              <h3 className="text-base font-black uppercase tracking-widest">{email.stage}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/30 hover:text-white transition-colors bg-white/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-y-auto no-scrollbar max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <p className="text-[9px] text-white/40 font-black uppercase mb-1 tracking-widest">Enviar A:</p>
              <p className="text-[11px] font-bold text-white/90 truncate">{email.to}</p>
            </div>
            <div className="bg-[#4fb7f7]/10 rounded-2xl p-5 border border-[#4fb7f7]/20">
              <p className="text-[9px] text-[#4fb7f7] font-black uppercase mb-1 tracking-widest">Copia de Respaldo:</p>
              <p className="text-[11px] font-bold text-[#4fb7f7]">admin@absolutecompany.co</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <p className="text-[9px] text-white/40 font-black uppercase mb-1 tracking-widest">Asunto:</p>
            <p className="text-[12px] font-black text-white">{email.subject}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">Cuerpo del Mensaje (Editable)</p>
              <button onClick={() => setIsEditing(!isEditing)} className={`text-[9px] font-black uppercase flex items-center space-x-2 px-3 py-1.5 rounded-xl transition-all ${isEditing ? 'bg-[#4fb7f7] text-white' : 'bg-white/5 text-brand-400'}`}>
                {isEditing ? <><Save size={12} /> <span>Guardar</span></> : <><Edit3 size={12} /> <span>Editar</span></>}
              </button>
            </div>
            <textarea 
              value={editableBody}
              readOnly={!isEditing}
              onChange={(e) => setEditableBody(e.target.value)}
              className={`w-full min-h-[200px] p-8 rounded-[2rem] text-[13px] font-medium leading-relaxed outline-none transition-all resize-none ${isEditing ? 'bg-white text-brand-900' : 'bg-black/20 text-white/60 border border-white/5'}`}
            />
            <p className="text-[10px] text-amber-400 font-bold uppercase italic tracking-widest">* La tabla de ítems, las políticas y los valores fuera de IVA se generarán automáticamente en el envío final.</p>
          </div>
        </div>

        <div className="p-8 bg-black/40 border-t border-white/5 flex flex-col md:flex-row gap-4">
          <button onClick={openPreview} className="flex-1 bg-white/5 text-white/70 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center space-x-3 hover:bg-white/10 transition-all">
            <ExternalLink size={16} />
            <span>Previsualizar</span>
          </button>
          <button onClick={handleSend} disabled={isSent} className={`flex-[1.5] py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center space-x-3 shadow-2xl transition-all ${isSent ? 'bg-[#4fb7f7] text-white' : 'bg-[#4fb7f7] text-white hover:bg-white hover:text-[#4fb7f7]'}`}>
            {isSent ? <><CheckCircle size={18} /> <span>Enviado</span></> : <><Send size={18} /> <span>Autorizar Despacho</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};
