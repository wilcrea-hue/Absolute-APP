
import React, { useState } from 'react';
import { Category, Product } from './types';
import { Search, Plus, Clock, PackageX, AlertCircle, Info, Minus, ChevronDown, ChevronUp, CalendarDays, Filter } from 'lucide-react';

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
  
  const filteredProducts = (products || []).filter(product => {
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getQuantity = (id: string) => localQuantities[id] || 1;

  const updateLocalQuantity = (id: string, delta: number, stock: number) => {
    const current = getQuantity(id);
    const next = Math.max(1, Math.min(stock, current + delta));
    setLocalQuantities(prev => ({ ...prev, [id]: next }));
  };

  const togglePriceTable = (id: string) => {
    setExpandedPrices(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Función para obtener los precios de los tramos según el precio base
  const getTieredPrices = (basePrice: number) => {
    const p1 = basePrice === 14000 ? 14800 : basePrice;
    if (basePrice === 14000) {
      return [
        { label: '1 - 3 días', value: 14800 },
        { label: '3 - 5 días', value: 17800 },
        { label: '5 - 15 días', value: 21400 },
        { label: '15+ días', value: 25700 }
      ];
    }
    return [
      { label: '1 - 3 días', value: p1 },
      { label: '3 - 5 días', value: Math.round(p1 * 1.20) },
      { label: '5 - 15 días', value: Math.round(p1 * 1.44) },
      { label: '15+ días', value: Math.round(p1 * 1.73) }
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-brand-900 uppercase">Catálogo de Alquiler</h2>
          <p className="text-gray-500 text-[12px] font-medium">Equipos y servicios exclusivos para eventos de alto impacto.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar artículo..." 
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-900 shadow-sm text-[13px] font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white/40 p-2 rounded-[1.5rem] border border-slate-200/50 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-2 flex items-center space-x-2 border-r border-slate-200 mr-1 hidden sm:flex">
            <Filter size={12} className="text-slate-400" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Filtrar:</span>
          </div>
          <button
            onClick={() => setSelectedCategory('Todos')}
            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              selectedCategory === 'Todos' 
                ? 'bg-brand-900 text-white shadow-lg' 
                : 'bg-white text-gray-500 border border-slate-100 hover:bg-slate-50'
            }`}
          >Todos</button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                selectedCategory === cat 
                  ? 'bg-brand-900 text-white shadow-lg' 
                  : 'bg-white text-gray-500 border border-slate-100 hover:bg-slate-50'
              }`}
            >{cat}</button>
          ))}
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
              <div key={product.id} className="bg-white rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-50 overflow-hidden flex flex-col group">
                <div className="aspect-[842/950] overflow-hidden relative bg-slate-100">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  
                  <div className={`absolute top-3 right-3 px-2 py-1 backdrop-blur rounded-lg text-[8px] font-black uppercase shadow-lg border transition-all duration-300 flex items-center space-x-1 ${
                    isOutOfStock 
                      ? 'bg-red-500/90 text-white border-red-400' 
                      : isLowStock 
                        ? 'bg-amber-400/90 text-amber-950 border-amber-300 animate-pulse' 
                        : 'bg-white/90 text-brand-900 border-white/20'
                  }`}>
                    {isLowStock && <AlertCircle size={8} />}
                    <span>{isOutOfStock ? 'Agotado' : `Stock: ${product.stock}`}</span>
                  </div>

                  {isMobiliario && (
                    <div className="absolute bottom-3 left-3 flex space-x-2">
                       <span className="bg-brand-900/80 backdrop-blur-sm text-white text-[7px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-white/10">
                         Plan Escalonado
                       </span>
                    </div>
                  )}
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[9px] text-brand-500 font-black uppercase">{product.category}</span>
                    {isMobiliario && (
                      <div className="flex items-center text-[7px] font-black text-brand-900 uppercase bg-brand-400 px-2 py-0.5 rounded-full">
                         <Info size={8} className="mr-1" /> IPC 2024
                      </div>
                    )}
                  </div>
                  <h3 className="font-black text-slate-900 text-sm mb-3 line-clamp-2 min-h-[40px]">{product.name}</h3>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 transition-all duration-300">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase flex items-center mb-1">
                            <Clock size={10} className="mr-1.5" /> {isMobiliario ? 'Tarifa por evento' : isM2 ? 'Tarifa por m²' : 'Tarifa por día'}
                            </p>
                            <p className="text-xl font-black text-brand-900">
                            ${displayPrice?.toLocaleString()} 
                            <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">
                                / {isM2 ? 'm²' : isMobiliario ? 'evento' : 'día'}
                            </span>
                            </p>
                        </div>
                        <div className="text-right">
                             <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Subtotal {qty > 1 && `(${qty})`}</p>
                             <p className="text-[10px] font-black text-brand-900">
                                ${(displayPrice * qty).toLocaleString()}
                             </p>
                        </div>
                    </div>

                    {isMobiliario && (
                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <button 
                          onClick={() => togglePriceTable(product.id)}
                          className="w-full flex items-center justify-between text-[8px] font-black text-brand-900 uppercase tracking-widest hover:text-brand-500 transition-colors"
                        >
                          <span className="flex items-center"><CalendarDays size={10} className="mr-1.5" /> Ver tabla de tarifas</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-1 animate-in slide-in-from-top-2 duration-300">
                            {getTieredPrices(product.priceRent).map((tier, idx) => (
                              <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">{tier.label}</span>
                                <span className="text-[9px] font-black text-brand-900">${tier.value.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-1.5">
                        <button 
                            disabled={isOutOfStock}
                            onClick={() => updateLocalQuantity(product.id, -1, product.stock)}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-brand-900 disabled:opacity-30 active:scale-90 transition-all"
                        >
                            <Minus size={14} />
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-brand-900">{qty}</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{isM2 ? 'm²' : 'Cant.'}</span>
                        </div>
                        <button 
                            disabled={isOutOfStock || (product.stock !== 999 && qty >= product.stock)}
                            onClick={() => updateLocalQuantity(product.id, 1, product.stock)}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-brand-900 disabled:opacity-30 active:scale-90 transition-all"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <button 
                        onClick={() => {
                            onAddToCart(product, qty);
                            setLocalQuantities(prev => ({ ...prev, [product.id]: 1 }));
                        }}
                        disabled={isOutOfStock}
                        className="w-full py-4 bg-brand-900 text-white rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2 hover:bg-black disabled:opacity-30 disabled:grayscale"
                    >
                        <Plus size={14} />
                        <span>Añadir {qty > 1 ? `(${qty})` : ''} a la Reserva</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <PackageX size={24} className="text-slate-300" />
          </div>
          <h3 className="text-md font-black text-brand-900 uppercase">Sin coincidencias</h3>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 text-center px-4">No encontramos artículos para esta categoría o búsqueda.</p>
        </div>
      )}
    </div>
  );
};
