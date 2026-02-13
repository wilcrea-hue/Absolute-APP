
import React, { useState, useRef } from 'react';
import { Category, Product } from './types';
import { Search, Plus, Clock, PackageX, AlertCircle, Info, Minus, ChevronDown, ChevronUp, CalendarDays, Filter, ChevronRight, LayoutGrid, Sparkles, Loader2, Mic } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface CatalogProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
}

const CATEGORIES: Category[] = ['Mobiliario', 'Electrónica', 'Arquitectura Efímera', 'Decoración', 'Servicios', 'Impresión'];

export const Catalog: React.FC<CatalogProps> = ({ products, onAddToCart }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Todos'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});
  const [expandedPrices, setExpandedPrices] = useState<Record<string, boolean>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  
  const filteredProducts = (products || []).filter(product => {
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAiSearch = async () => {
    if (!searchTerm || isAiSearching || !process.env.API_KEY) return;
    setIsAiSearching(true);
    setAiSuggestion(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Actúa como un experto en logística de eventos para ABSOLUTE. Basado en esta necesidad: "${searchTerm}", sugiere cuáles de estos productos serían los más adecuados. 
      PRODUCTOS DISPONIBLES: ${products.map(p => p.name).join(', ')}.
      Responde de forma muy breve (máximo 15 palabras) recomendando 2 o 3 nombres de productos exactos.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      
      if (response.text) {
        setAiSuggestion(response.text.trim());
      }
    } catch (err) {
      console.error("AI Search Error:", err);
    } finally {
      setIsAiSearching(false);
    }
  };

  const getQuantity = (id: string) => localQuantities[id] || 1;

  const updateLocalQuantity = (id: string, delta: number, stock: number) => {
    const current = getQuantity(id);
    const next = Math.max(1, Math.min(stock, current + delta));
    setLocalQuantities(prev => ({ ...prev, [id]: next }));
  };

  const togglePriceTable = (id: string) => {
    setExpandedPrices(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getTieredPrices = (basePrice: number) => {
    const p1 = basePrice === 14000 ? 14800 : basePrice;
    return [
      { label: '1 - 3 días', value: p1 },
      { label: '3 - 5 días', value: Math.round(p1 * 1.20) },
      { label: '5 - 15 días', value: Math.round(p1 * 1.44) },
      { label: '15+ días', value: Math.round(p1 * 1.73) }
    ];
  };

  const handleSelectCategory = (cat: Category | 'Todos') => {
    setSelectedCategory(cat);
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-brand-900 uppercase tracking-tighter">Catálogo Corporativo</h2>
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">Equipamiento técnico para eventos de alto impacto</p>
        </div>
        
        <div className="w-full lg:w-[450px] space-y-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-900 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="¿Qué evento está planeando? (Ej: Gala para 100p)" 
              className="w-full pl-12 pr-24 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-900/5 focus:border-brand-900 shadow-sm text-sm font-bold outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
            />
            <button 
              onClick={handleAiSearch}
              disabled={isAiSearching || !searchTerm}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-brand-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center space-x-2 hover:bg-black transition-all disabled:opacity-30"
            >
              {isAiSearching ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              <span>Asistente AI</span>
            </button>
          </div>
          {aiSuggestion && (
            <div className="bg-brand-50 border border-brand-100 p-3 rounded-xl flex items-start space-x-3 animate-in slide-in-from-top-2 duration-300">
              <Sparkles size={14} className="text-brand-500 mt-0.5 shrink-0" />
              <p className="text-[10px] font-bold text-brand-900 leading-tight">
                <span className="opacity-50 uppercase tracking-tighter mr-1">Sugerencia Absolute:</span>
                {aiSuggestion}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CONTENEDOR DE CATEGORÍAS - AZUL CLARO Y DESPLEGABLE */}
      <div className="relative z-40">
        <div className="bg-[#d2eeff] p-3 rounded-2xl border border-blue-200/50 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center space-x-2 px-3 shrink-0">
            <Filter size={16} className="text-blue-600" />
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Filtrar inventario:</span>
          </div>

          <div className="relative flex-1 w-full">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-6 py-3.5 bg-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] text-brand-900 shadow-md hover:shadow-lg transition-all border border-blue-100 active:scale-[0.98]"
            >
              <div className="flex items-center">
                <LayoutGrid size={16} className="mr-3 text-brand-500" />
                <span>Mostrando: {selectedCategory}</span>
              </div>
              {isDropdownOpen ? <ChevronUp size={20} className="text-blue-400" /> : <ChevronDown size={20} className="text-blue-400" />}
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 grid grid-cols-1 md:grid-cols-2 gap-1 animate-in slide-in-from-top-4 duration-300">
                <button 
                  onClick={() => handleSelectCategory('Todos')}
                  className={`w-full text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between group transition-all ${
                    selectedCategory === 'Todos' ? 'bg-brand-900 text-white' : 'hover:bg-blue-50 text-slate-500'
                  }`}
                >
                  <span>Todo el Inventario</span>
                  <ChevronRight size={14} className={selectedCategory === 'Todos' ? 'text-brand-400' : 'text-slate-200'} />
                </button>
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => handleSelectCategory(cat)}
                    className={`w-full text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between group transition-all ${
                      selectedCategory === cat ? 'bg-brand-900 text-white' : 'hover:bg-blue-50 text-slate-500'
                    }`}
                  >
                    <span>{cat}</span>
                    <ChevronRight size={14} className={selectedCategory === cat ? 'text-brand-400' : 'text-slate-200'} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredProducts.map(product => {
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= 3;
            const isMobiliario = product.category === 'Mobiliario';
            const isImpresion = product.category === 'Impresión';
            const isM2 = isImpresion && product.name.includes('M2');
            const qty = getQuantity(product.id);
            const isExpanded = expandedPrices[product.id];

            const displayPrice = isMobiliario && product.priceRent === 14000 ? 14800 : product.priceRent;

            return (
              <div key={product.id} className="bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 overflow-hidden flex flex-col group">
                <div className="aspect-[842/950] overflow-hidden relative bg-slate-100">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  
                  <div className={`absolute top-4 right-4 px-3 py-1.5 backdrop-blur rounded-xl text-[9px] font-black uppercase shadow-lg border transition-all duration-300 flex items-center space-x-1.5 ${
                    isOutOfStock 
                      ? 'bg-red-500/90 text-white border-red-400' 
                      : isLowStock 
                        ? 'bg-amber-400/90 text-amber-950 border-amber-300 animate-pulse' 
                        : 'bg-white/90 text-brand-900 border-white/20'
                  }`}>
                    {isLowStock && <AlertCircle size={10} />}
                    <span>{isOutOfStock ? 'Agotado' : `Existencias: ${product.stock}`}</span>
                  </div>

                  {isMobiliario && (
                    <div className="absolute bottom-4 left-4">
                       <span className="bg-brand-900/80 backdrop-blur-sm text-white text-[8px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border border-white/10 shadow-lg">
                         Tarifa Escalonada
                       </span>
                    </div>
                  )}
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-brand-500 font-black uppercase tracking-widest">{product.category}</span>
                    {isMobiliario && (
                      <div className="flex items-center text-[8px] font-black text-brand-900 uppercase bg-[#d2eeff] px-2.5 py-1 rounded-full border border-blue-200">
                         <Info size={10} className="mr-1.5" /> Ajuste IPC
                      </div>
                    )}
                  </div>
                  <h3 className="font-black text-slate-900 text-base mb-4 line-clamp-2 min-h-[48px] leading-tight">{product.name}</h3>
                  
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 mb-6 group-hover:bg-blue-50/50 transition-colors">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase flex items-center mb-1.5">
                            <Clock size={12} className="mr-2" /> {isMobiliario ? 'Por Evento' : isM2 ? 'Por Metro²' : 'Por Jornada'}
                            </p>
                            <p className="text-2xl font-black text-brand-900">
                            ${displayPrice?.toLocaleString()} 
                            <span className="text-[11px] text-slate-400 font-bold uppercase ml-1.5">
                                / {isM2 ? 'm²' : isMobiliario ? 'evento' : 'día'}
                            </span>
                            </p>
                            <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Precios antes de IVA</p>
                        </div>
                    </div>

                    {isMobiliario && (
                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <button 
                          onClick={() => togglePriceTable(product.id)}
                          className="w-full flex items-center justify-between text-[9px] font-black text-brand-900 uppercase tracking-widest hover:text-blue-600 transition-colors outline-none"
                        >
                          <span className="flex items-center"><CalendarDays size={12} className="mr-2" /> Proyección de Costos</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {isExpanded && (
                          <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-300 bg-white p-3 rounded-2xl border border-slate-100 shadow-inner">
                            {getTieredPrices(product.priceRent).map((tier, idx) => (
                              <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{tier.label}</span>
                                <span className="text-[10px] font-black text-brand-900">${tier.value.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between bg-slate-100/50 border border-slate-200/50 rounded-2xl p-1.5 shadow-inner">
                        <button 
                            disabled={isOutOfStock}
                            onClick={() => updateLocalQuantity(product.id, -1, product.stock)}
                            className="w-11 h-11 flex items-center justify-center bg-white rounded-xl shadow-sm text-brand-900 disabled:opacity-30 active:scale-90 transition-all border border-slate-100"
                        >
                            <Minus size={16} />
                        </button>
                        <div className="flex flex-col items-center px-4">
                            <span className="text-lg font-black text-brand-900">{qty}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{isM2 ? 'm²' : 'Uds.'}</span>
                        </div>
                        <button 
                            disabled={isOutOfStock || (product.stock !== 999 && qty >= product.stock)}
                            onClick={() => updateLocalQuantity(product.id, 1, product.stock)}
                            className="w-11 h-11 flex items-center justify-center bg-white rounded-xl shadow-sm text-brand-900 disabled:opacity-30 active:scale-90 transition-all border border-slate-100"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <button 
                        onClick={() => {
                            onAddToCart(product, qty);
                            setLocalQuantities(prev => ({ ...prev, [product.id]: 1 }));
                        }}
                        disabled={isOutOfStock}
                        className="w-full py-5 bg-brand-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-3 hover:bg-black hover:shadow-brand-900/20 disabled:opacity-30 disabled:grayscale"
                    >
                        <Plus size={16} />
                        <span>Añadir a Reserva</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-28 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <PackageX size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-brand-900 uppercase tracking-tighter">Sin coincidencias en inventario</h3>
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-2 text-center px-8">No encontramos artículos que coincidan con los criterios de búsqueda actuales.</p>
        </div>
      )}
    </div>
  );
};
