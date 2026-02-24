
import React, { useState, useMemo, useRef } from 'react';
import { CartItem, OrderType, User, Order } from './types';
import { Trash2, Calendar, ShoppingBag, Clock, MapPin, FileText, CheckCircle, Percent, AlertTriangle, RefreshCw, XCircle, Navigation, Info, Upload, FileUp, FileCheck, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CartProps {
  items: CartItem[];
  currentUser: User | null;
  orders: Order[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateItem?: (id: string, updates: Partial<CartItem>) => void;
  onCheckout: (startDate: string, endDate: string, origin: string, destination: string, type: OrderType) => void;
  getAvailableStock: (productId: string, startDate: string, endDate: string) => number;
  
  // Props elevadas desde App.tsx para persistencia
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  origin: string;
  setOrigin: (val: string) => void;
  destination: string;
  setDestination: (val: string) => void;
}

export const Cart: React.FC<CartProps> = ({ 
  items, currentUser, orders, onRemove, onUpdateQuantity, onUpdateItem, onCheckout, getAvailableStock,
  startDate, setStartDate, endDate, setEndDate, origin, setOrigin, destination, setDestination
}) => {
  const navigate = useNavigate();
  const [isReplenishing, setIsReplenishing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  const eventDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  }, [startDate, endDate]);

  const getTieredPrice = (item: CartItem, days: number) => {
    if (item.category === 'Impresión') {
      const area = (item.width || 1) * (item.height || 1);
      return item.priceRent * area; // No days multiplier
    }

    if (item.category === 'Servicios' && item.name.toLowerCase().includes('diseño')) {
      return item.priceRent; // No days multiplier
    }

    if (item.category !== 'Mobiliario') {
      return item.priceRent * days; 
    }

    if (item.priceRent === 14000) {
      if (days <= 3) return 14800;
      if (days <= 5) return 17800;
      if (days <= 15) return 21400;
      return 25700;
    }

    const baseIPC = item.priceRent * 1.057; 
    if (days <= 3) return baseIPC;
    if (days <= 5) return baseIPC * 1.20; 
    if (days <= 15) return baseIPC * 1.44; 
    return baseIPC * 1.73; 
  };

  const subtotalAmount = useMemo(() => {
    return items.reduce((acc, item) => {
      return acc + (getTieredPrice(item, eventDays) * item.quantity);
    }, 0);
  }, [items, eventDays]);

  const discountPercentage = currentUser?.discountPercentage || 0;
  const discountAmount = (subtotalAmount * discountPercentage) / 100;
  const totalAmount = subtotalAmount - discountAmount;

  const overbookedProducts = useMemo(() => {
    if (!startDate || !endDate) return [];
    return items.filter(item => {
      const available = getAvailableStock(item.id, startDate, endDate);
      return item.quantity > available;
    });
  }, [items, startDate, endDate, getAvailableStock]);

  const handleCheckout = (type: OrderType) => {
    if (!startDate || !endDate || !origin || !destination) {
      alert("Por favor complete los datos de origen, destino y fechas.");
      return;
    }
    
    if (type === 'rental' && overbookedProducts.length > 0) {
      alert("No se puede confirmar la reserva: Algunos artículos exceden el stock disponible para estas fechas.");
      return;
    }

    onCheckout(startDate, endDate, origin, destination, type);
    navigate('/orders');
  };

  const handleRequestReplenishment = (item: CartItem) => {
    setIsReplenishing(item.id);
    setTimeout(() => {
      alert(`Se ha enviado una solicitud de reposición para: ${item.name}.`);
      setIsReplenishing(null);
    }, 1500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateItem) return;

    // Validación de tamaño (200MB)
    const MAX_SIZE = 200 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("El archivo es demasiado grande. El tamaño máximo permitido es 200MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validación de tipo de archivo
    const allowedExtensions = ['pdf', 'ai', 'psd', 'jpg', 'jpeg', 'png', 'tiff', 'cdr', 'eps'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      alert("Formato de archivo no permitido. Formatos aceptados: " + allowedExtensions.join(', '));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(itemId);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('./api/upload_impresion.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64, name: file.name })
        });
        const data = await res.json();
        if (data.url) {
          onUpdateItem(itemId, { fileUrl: data.url });
        } else {
          alert("Error al subir archivo: " + (data.error || 'Error desconocido'));
        }
      } catch (err) {
        alert("Error de conexión al intentar subir el archivo.");
      } finally {
        setIsUploading(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const getTierLabel = (days: number) => {
    if (days <= 3) return "Tramo 1-3 días";
    if (days <= 5) return "Tramo 3-5 días";
    if (days <= 15) return "Tramo 5-15 días";
    return "Tramo 15+ días";
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
          <ShoppingBag size={40} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-black text-brand-900 uppercase">Reserva Vacía</h2>
        <button onClick={() => navigate('/')} className="px-10 py-4 bg-brand-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all">Ir al Catálogo</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-lg md:text-2xl font-black text-brand-900 uppercase">Configuración de Reserva</h2>
          <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Costos ajustados según tabla de permanencia IPC 2024.</p>
        </div>
        {overbookedProducts.length > 0 && (
          <div className="bg-red-50 text-red-600 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-red-100 flex items-center space-x-2 animate-pulse">
            <XCircle size={14} className="md:w-4 md:h-4" />
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tighter">Error: Stock</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-4">
          {items.map(item => {
            const itemFinalPrice = getTieredPrice(item, eventDays);
            const subtotal = itemFinalPrice * item.quantity;
            const availableForDates = (startDate && endDate) ? getAvailableStock(item.id, startDate, endDate) : item.stock;
            const isOverbooked = item.quantity > availableForDates;
            const isMobiliario = item.category === 'Mobiliario';

            return (
              <div key={item.id} className={`bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all flex flex-col space-y-3 md:space-y-4 group hover:shadow-md ${isOverbooked ? 'border-red-200 shadow-lg shadow-red-500/5' : 'border-slate-100 shadow-sm'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4 md:space-x-6">
                    <img src={item.image} className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl object-cover shadow-sm" alt="" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className={`font-black uppercase text-[11px] md:text-sm ${isOverbooked ? 'text-red-600' : 'text-slate-900'}`}>{item.name}</h4>
                        {isMobiliario && (
                          <span className="bg-brand-900 text-white text-[6px] md:text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">Plan Escalonado</span>
                        )}
                      </div>
                      <p className="text-[9px] md:text-[10px] font-bold text-brand-500 uppercase mt-0.5 md:mt-1 tracking-widest flex items-center">
                        <Clock size={8} className="mr-1 md:mr-1.5" /> 
                        {item.category === 'Impresión' 
                          ? `Tarifa Única: $${item.priceRent.toLocaleString()} / m²`
                          : (item.category === 'Servicios' && item.name.toLowerCase().includes('diseño'))
                            ? `Tarifa Única: $${item.priceRent.toLocaleString()}`
                            : isMobiliario 
                              ? `${getTierLabel(eventDays)}: $${itemFinalPrice.toLocaleString()}` 
                              : `Alquiler/día: $${item.priceRent.toLocaleString()}`
                        }
                      </p>
                      {item.category === 'Impresión' && item.width && item.height && (
                        <div className="mt-1 flex items-center space-x-2 bg-brand-50 px-2 py-1 rounded-lg border border-brand-100 w-fit">
                          <span className="text-[8px] font-black text-brand-900 uppercase tracking-tighter">
                            {item.width}m x {item.height}m = {(item.width * item.height).toFixed(2)}m²
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto space-x-4 md:space-x-8">
                     <div className="flex flex-col items-center">
                        <div className={`flex items-center border rounded-xl md:rounded-2xl p-1 md:p-1.5 transition-all ${isOverbooked ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                            <button 
                              disabled={item.quantity <= 1}
                              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} 
                              className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center font-black hover:text-brand-900 transition-colors disabled:opacity-20 disabled:cursor-not-allowed text-xs md:text-base"
                            >-</button>
                            <span className="w-8 md:w-12 text-center font-black text-xs md:text-sm">{item.quantity}</span>
                            <button 
                              disabled={item.quantity >= availableForDates}
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} 
                              className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center font-black transition-colors hover:text-brand-900 disabled:opacity-20 disabled:cursor-not-allowed text-xs md:text-base"
                            >+</button>
                        </div>
                        <div className="mt-1.5 md:mt-2 flex flex-col items-center">
                          <div className={`px-1.5 py-0.5 rounded-full text-[6px] md:text-[7px] font-black uppercase tracking-widest border ${
                            isOverbooked 
                              ? 'bg-red-100 text-red-600 border-red-200' 
                              : availableForDates <= 5 
                                ? 'bg-amber-100 text-amber-600 border-amber-200' 
                                : 'bg-emerald-100 text-emerald-600 border-emerald-200'
                          }`}>
                            {isOverbooked ? 'Sin Disponibilidad' : availableForDates <= 5 ? 'Stock Limitado' : 'Disponible'}
                          </div>
                          <p className={`text-[6px] md:text-[7px] font-black uppercase mt-0.5 md:mt-1 ${isOverbooked ? 'text-red-500' : 'text-slate-400'}`}>
                            {availableForDates} disponibles
                          </p>
                        </div>
                     </div>
                     <div className="text-right min-w-[80px] md:min-w-[120px]">
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {(item.category === 'Impresión' || (item.category === 'Servicios' && item.name.toLowerCase().includes('diseño'))) ? 'Cobro Único' : `${eventDays} ${eventDays === 1 ? 'día' : 'días'}`}
                        </p>
                        <p className="font-black text-brand-900 text-sm md:text-base">${subtotal.toLocaleString()}</p>
                     </div>
                     <button onClick={() => onRemove(item.id)} className="p-2 md:p-3 text-red-200 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>

                {isMobiliario && (
                  <div className="flex items-center space-x-2 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100">
                    <Info size={12} className="text-brand-900" />
                    <p className="text-[8px] font-bold text-slate-500 uppercase">Tarifa aplicada por tramo de días para mobiliario corporativo.</p>
                  </div>
                )}

                {item.category === 'Impresión' && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-brand-50/50 p-4 rounded-2xl border border-brand-100/50">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.fileUrl ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'}`}>
                        {item.fileUrl ? <FileCheck size={20} /> : <FileUp size={20} />}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-900 uppercase tracking-widest">Archivo de Impresión</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase truncate max-w-[200px]">
                          {item.fileUrl ? 'Archivo cargado correctamente' : 'Pendiente por subir (.pdf, .ai, .psd, .jpg)'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <input 
                        type="file" 
                        className="hidden" 
                        ref={uploadingItemId === item.id ? fileInputRef : null}
                        onChange={(e) => handleFileUpload(e, item.id)}
                        accept=".pdf,.ai,.psd,.jpg,.jpeg,.png,.tiff,.cdr,.eps"
                      />
                      <button 
                        onClick={() => {
                          setUploadingItemId(item.id);
                          setTimeout(() => fileInputRef.current?.click(), 100);
                        }}
                        disabled={isUploading === item.id}
                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
                          item.fileUrl 
                            ? 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50' 
                            : 'bg-brand-900 text-white shadow-lg shadow-brand-900/20 hover:bg-black'
                        }`}
                      >
                        {isUploading === item.id ? (
                          <><Loader2 size={14} className="animate-spin" /> <span>Subiendo...</span></>
                        ) : (
                          <>
                            <Upload size={14} /> 
                            <span>{item.fileUrl ? 'Cambiar Archivo' : 'Subir Arte Final'}</span>
                          </>
                        )}
                      </button>
                      {item.fileUrl && (
                        <a 
                          href={item.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2.5 bg-white text-brand-900 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                          title="Ver archivo subido"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {isOverbooked && (
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                    <div className="flex items-center space-x-3">
                       <AlertTriangle size={16} className="text-red-500" />
                       <p className="text-[9px] font-black text-red-700 uppercase tracking-tight">
                         Excede disponibilidad para estas fechas. Ajuste cantidad o cambie fechas.
                       </p>
                    </div>
                    <button 
                      onClick={() => handleRequestReplenishment(item)}
                      disabled={isReplenishing === item.id}
                      className="bg-white text-red-600 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border border-red-200 shadow-sm hover:bg-red-600 hover:text-white transition-all flex items-center space-x-2"
                    >
                      {isReplenishing === item.id ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      <span>Solicitud Urgente</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-50 sticky top-8">
            <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest mb-8 flex items-center"><Calendar className="mr-2" size={16} /> Parámetros del Evento</h3>
            
            <div className="space-y-6 mb-10">
              <div className="space-y-4">
                <div className="relative">
                  <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Ciudad Origen" value={origin} onChange={e => setOrigin(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-brand-900" />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Ciudad Destino" value={destination} onChange={e => setDestination(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-brand-900" />
                </div>
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
                  <span>Subtotal Servicios/Mobiliario</span>
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
                  <span className="text-[9px] font-black text-brand-500 uppercase mt-1 tracking-widest">(precios sin IVA.)</span>
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
                  onClick={() => handleCheckout('rental')} 
                  disabled={overbookedProducts.length > 0}
                  className={`w-full py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2 ${
                    overbookedProducts.length > 0 
                      ? 'bg-slate-300 cursor-not-allowed' 
                      : 'bg-brand-900 hover:bg-black shadow-brand-900/20'
                  }`}
                >
                  <CheckCircle size={16} />
                  <span>Confirmar Reserva</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
