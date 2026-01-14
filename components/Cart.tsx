
import React, { useState, useEffect } from 'react';
import { CartItem } from '../types';
import { Trash2, Calendar, CheckCircle, MapPin, Navigation, Map as MapIcon, ArrowRight, Loader2, Clock, Ruler, CreditCard, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";

interface CartProps {
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onCheckout: (startDate: string, endDate: string, destination: string) => void;
}

interface RouteSummary {
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  tolls: string;
}

export const Cart: React.FC<CartProps> = ({ items, onRemove, onUpdateQuantity, onCheckout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const prefilledDestination = (location.state as any)?.prefilledDestination || '';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [destination, setDestination] = useState(prefilledDestination);
  const [showPreviewMap, setShowPreviewMap] = useState(!!prefilledDestination);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  const parseSummary = (text: string) => {
    const summaryMatch = text.match(/---RESUMEN---([\s\S]*?)---/);
    if (summaryMatch) {
      const content = summaryMatch[1];
      const getVal = (key: string) => {
        const match = content.match(new RegExp(`${key}:\\s*(.*)`, 'i'));
        return match ? match[1].trim() : '';
      };
      
      return {
        origin: getVal('Origen'),
        destination: getVal('Destino'),
        distance: getVal('Distancia'),
        duration: getVal('Tiempo'),
        tolls: getVal('Peajes')
      };
    }
    return null;
  };

  const analyzeRoute = async () => {
    if (destination.length < 3) return;
    
    setIsAnalyzing(true);
    setRouteSummary(null);
    setShowPreviewMap(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analiza la ruta logística para un despacho de eventos:
      - ORIGEN: Bogotá, Colombia
      - DESTINO: ${destination}
      
      Calcula distancia aproximada, tiempo de tránsito y peajes estimados para un vehículo de carga liviana en Colombia.
      
      IMPORTANTE: Incluye este resumen al final:
      ---RESUMEN---
      Origen: Bogotá, Colombia
      Destino: ${destination}
      Distancia: [km]
      Tiempo: [horas]
      Peajes: [peajes / valor]
      ---`;

      const res = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }]
        },
      });

      const fullText = res.text || "";
      const summary = parseSummary(fullText);
      setRouteSummary(summary);
    } catch (error) {
      console.error("Error analyzing route:", error);
      // Fallback to basic map display without summary cards
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (prefilledDestination) {
      analyzeRoute();
    }
  }, []);

  const handleCheckout = () => {
    if (!startDate || !endDate || !destination.trim()) {
      alert("Por favor complete todos los campos: Fechas y Ubicación del Evento");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        alert("La fecha de inicio no puede ser posterior a la fecha de fin");
        return;
    }
    onCheckout(startDate, endDate, destination);
    navigate('/orders');
  };

  const mapKey = process.env.API_KEY || '';
  const mapPreviewUrl = `https://www.google.com/maps/embed/v1/directions?key=${mapKey}&origin=Bogota,Colombia&destination=${encodeURIComponent(destination)}&mode=driving`;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Calendar size={32} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Su pedido está vacío</h2>
        <p className="text-gray-500 mb-6">Seleccione productos del catálogo para comenzar su reserva.</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-brand-900 text-white px-6 py-2 rounded-md hover:bg-gray-800 transition"
        >
          Ir al Catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Configuración de su Pedido</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Items and Map */}
        <div className="lg:col-span-8 space-y-6">
          {/* Cart Items List */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex items-center">
                <CheckCircle size={18} className="mr-2 text-brand-500" /> Artículos Seleccionados
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cantidad</th>
                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img src={item.image} alt={item.name} className="h-10 w-10 rounded-lg object-cover mr-3 border shadow-sm" />
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                          <div className="text-[10px] text-gray-400 uppercase font-black tracking-wider">{item.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-brand-900 hover:text-white flex items-center justify-center text-gray-600 transition-all font-bold"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, Math.min(item.stock, item.quantity + 1))}
                          className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-brand-900 hover:text-white flex items-center justify-center text-gray-600 transition-all font-bold"
                        >
                          +
                        </button>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onRemove(item.id)}
                        className="text-red-400 hover:text-red-600 transition p-2 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Map Preview with Route Summary */}
          <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-500 ${showPreviewMap ? 'opacity-100 translate-y-0' : 'opacity-50 grayscale pointer-events-none'}`}>
             <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex justify-between items-center">
                <div className="flex items-center">
                    <MapIcon size={18} className="mr-2 text-brand-500" /> Plan de Despacho Logístico
                </div>
                {isAnalyzing && (
                    <div className="flex items-center text-[10px] text-brand-600 font-black uppercase tracking-widest animate-pulse">
                        <Loader2 size={12} className="mr-1 animate-spin" /> Analizando Trayecto con IA...
                    </div>
                )}
                {routeSummary && !isAnalyzing && (
                    <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-lg font-black uppercase tracking-widest flex items-center">
                        <Zap size={10} className="mr-1" /> Optimizado por IA
                    </span>
                )}
             </div>

             {/* Route Stats Row */}
             {routeSummary && (
                <div className="grid grid-cols-3 divide-x border-b bg-white">
                  <div className="p-4 flex flex-col items-center text-center">
                    <Ruler size={16} className="text-blue-500 mb-1" />
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Distancia</p>
                    <p className="text-xs font-bold text-gray-900">{routeSummary.distance}</p>
                  </div>
                  <div className="p-4 flex flex-col items-center text-center">
                    <Clock size={16} className="text-purple-500 mb-1" />
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tiempo Tránsito</p>
                    <p className="text-xs font-bold text-gray-900">{routeSummary.duration}</p>
                  </div>
                  <div className="p-4 flex flex-col items-center text-center">
                    <CreditCard size={16} className="text-amber-500 mb-1" />
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Gastos Ruta</p>
                    <p className="text-xs font-bold text-gray-900 truncate w-full px-2" title={routeSummary.tolls}>{routeSummary.tolls}</p>
                  </div>
                </div>
             )}

             <div className="relative h-72 bg-gray-100">
                {showPreviewMap ? (
                    <iframe
                        title="Checkout Route Preview"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={mapPreviewUrl}
                    ></iframe>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                        <Navigation size={40} className="mb-2 opacity-20" />
                        <p className="text-sm font-medium">Ingrese un destino para previsualizar la ruta de transporte.</p>
                    </div>
                )}
             </div>
             {showPreviewMap && (
                 <div className="p-4 bg-brand-900 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-[10px] font-black uppercase tracking-[0.15em]">
                        <div className="flex items-center"><MapPin size={14} className="mr-1 text-brand-300"/> Bogotá</div>
                        <ArrowRight size={14} className="text-brand-300" />
                        <div className="flex items-center"><Navigation size={14} className="mr-1 text-brand-300"/> {destination}</div>
                    </div>
                    <div className="hidden md:block text-[9px] opacity-70 italic font-medium uppercase tracking-widest">Servicio de transporte nacional sincronizado</div>
                 </div>
             )}
          </div>
        </div>

        {/* Right Column: Reservation Details */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl shadow-xl border p-6 sticky top-8">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-8 flex items-center text-brand-900 border-b border-gray-100 pb-4">
              <Calendar className="mr-3 text-brand-500" size={18} />
              Confirmar Reserva
            </h3>
            
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Ubicación del Evento</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 group-focus-within:scale-110 transition-transform" size={18} />
                  <input 
                    type="text" 
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    onBlur={() => analyzeRoute()}
                    placeholder="Ciudad (Ej: Cali, Valle)"
                    className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-brand-900 focus:bg-white focus:border-transparent text-sm font-bold transition-all outline-none"
                  />
                  {!isAnalyzing && destination.length > 3 && !routeSummary && (
                    <button 
                        onClick={analyzeRoute}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-brand-900 text-white rounded-lg hover:bg-brand-800 transition-colors"
                        title="Analizar Ruta"
                    >
                        <Zap size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Fecha de Montaje</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-brand-900 focus:bg-white focus:border-transparent text-sm font-bold transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Fecha de Desmonte</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-brand-900 focus:bg-white focus:border-transparent text-sm font-bold transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 mb-8 space-y-4 border border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Artículos</span>
                <span className="font-black text-brand-900">{totalItems}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Flete Nacional</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${showPreviewMap ? 'text-green-600' : 'text-gray-400'}`}>
                    {showPreviewMap ? 'Validado' : 'Pendiente'}
                </span>
              </div>
              {routeSummary && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest">Distancia Est.</span>
                    <span className="text-[11px] font-black text-gray-700">{routeSummary.distance}</span>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleCheckout}
              disabled={!startDate || !endDate || !destination || isAnalyzing}
              className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-2xl ${
                startDate && endDate && destination && !isAnalyzing
                  ? 'bg-brand-900 text-white hover:bg-brand-800 shadow-brand-900/20' 
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Procesando Ruta...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>Finalizar Reserva</span>
                </>
              )}
            </button>
            <p className="text-[9px] font-bold text-gray-400 text-center mt-6 leading-relaxed px-4 uppercase tracking-widest opacity-60">
                Al confirmar, se iniciará el flujo de despacho sincronizado con bodega central.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
