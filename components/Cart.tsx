
import React, { useState, useMemo } from 'react';
import { CartItem, TransactionType, OrderType, User } from '../types';
import { Trash2, Calendar, ShoppingBag, Clock, CreditCard, MapPin, Zap, ArrowRight, Info, FileText, CheckCircle, Percent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CartProps {
  items: CartItem[];
  currentUser: User | null;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateType: (id: string, type: TransactionType) => void;
  onCheckout: (startDate: string, endDate: string, destination: string, type: OrderType) => void;
}

export const Cart: React.FC<CartProps> = ({ items, currentUser, onRemove, onUpdateQuantity, onUpdateType, onCheckout }) => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [destination, setDestination] = useState('');

  const eventDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  }, [startDate, endDate]);

  const subtotalAmount = useMemo(() => {
    return items.reduce((acc, item) => {
      const price = item.type === 'Compra' ? item.priceSell : item.priceRent;
      const factor = item.type === 'Alquiler' ? eventDays : 1;
      return acc + (price * item.quantity * factor);
    }, 0);
  }, [items, eventDays]);

  const discountPercentage = currentUser?.discountPercentage || 0;
  const discountAmount = (subtotalAmount * discountPercentage) / 100;
  const totalAmount = subtotalAmount - discountAmount;

  const handleCheckout = (type: OrderType) => {
    if (!startDate || !endDate || !destination) {
      alert("Por favor complete los datos de destino y fechas.");
      return;
    }
    onCheckout(startDate, endDate, destination, type);
    navigate('/orders');
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
          <ShoppingBag size={40} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-black text-brand-900 uppercase">Carrito Vacío</h2>
        <button onClick={() => navigate('/')} className="px-10 py-4 bg-brand-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all">Ir al Catálogo</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <h2 className="text-2xl font-black text-brand-900 uppercase">Configuración de Pedido</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-4">
          {items.map(item => {
            const unitPrice = item.type === 'Compra' ? item.priceSell : item.priceRent;
            const itemFactor = item.type === 'Alquiler' ? eventDays : 1;
            const subtotal = unitPrice * item.quantity * itemFactor;

            return (
              <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                <div className="flex items-center space-x-6">
                  <img src={item.image} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                  <div>
                    <h4 className="font-black text-slate-900 uppercase text-sm">{item.name}</h4>
                    <div className="flex bg-slate-100 p-1 rounded-xl mt-3 w-fit">
                      <button 
                        onClick={() => onUpdateType(item.id, 'Alquiler')}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${item.type === 'Alquiler' ? 'bg-brand-900 text-white shadow-sm' : 'text-slate-400'}`}
                      >Alquiler</button>
                      <button 
                        onClick={() => onUpdateType(item.id, 'Compra')}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${item.type === 'Compra' ? 'bg-brand-900 text-white shadow-sm' : 'text-slate-400'}`}
                      >Compra</button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-8">
                   <div className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl p-1.5">
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center font-black hover:text-brand-900 transition-colors">-</button>
                      <span className="w-10 text-center font-black text-sm">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center font-black hover:text-brand-900 transition-colors">+</button>
                   </div>
                   <div className="text-right min-w-[120px]">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {item.type === 'Alquiler' ? `${eventDays} días x $${unitPrice.toLocaleString()}` : `Precio Venta`}
                      </p>
                      <p className="font-black text-brand-900 text-base">${subtotal.toLocaleString()}</p>
                   </div>
                   <button onClick={() => onRemove(item.id)} className="p-3 text-red-200 hover:text-red-500 transition-all"><Trash2 size={20} /></button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-50 sticky top-8">
            <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest mb-8 flex items-center"><Calendar className="mr-2" size={16} /> Parámetros del Evento</h3>
            
            <div className="space-y-6 mb-10">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Ciudad Destino" value={destination} onChange={e => setDestination(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-brand-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-3">Inicio</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-[11px] border-0 focus:ring-1 focus:ring-brand-900" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-3">Fin</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-[11px] border-0 focus:ring-1 focus:ring-brand-900" />
                </div>
              </div>

              <div className="bg-brand-50 p-4 rounded-2xl flex items-center justify-between border border-brand-100">
                <div className="flex items-center text-brand-900">
                  <Clock size={16} className="mr-2" />
                  <span className="text-[10px] font-black uppercase">Duración:</span>
                </div>
                <span className="text-sm font-black text-brand-900">{eventDays} {eventDays === 1 ? 'día' : 'días'}</span>
              </div>
            </div>

            <div className="border-t pt-8 space-y-4">
              <div className="flex flex-col space-y-1 bg-slate-50 p-5 rounded-2xl mb-4">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span>${subtotalAmount.toLocaleString()}</span>
                </div>
                {discountPercentage > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                    <span className="flex items-center"><Percent size={10} className="mr-1" /> Descuento Perfil ({discountPercentage}%)</span>
                    <span>-${discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 mt-4 pt-4 flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Final</span>
                  <span className="text-3xl font-black text-brand-900">${totalAmount.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => handleCheckout('quote')} 
                  className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-amber-600 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                  <FileText size={16} />
                  <span>Generar Cotización</span>
                </button>

                <button 
                  onClick={() => handleCheckout('purchase')} 
                  className="w-full py-4 bg-brand-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                  <CheckCircle size={16} />
                  <span>Confirmar Reserva</span>
                </button>
              </div>

              <div className="pt-4 flex items-start space-x-2 text-[8px] text-slate-400 font-bold uppercase italic text-center">
                <p>La cotización no garantiza stock hasta que sea aprobada por un administrador.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
