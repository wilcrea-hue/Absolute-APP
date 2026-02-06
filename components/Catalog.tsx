
import React, { useState } from 'react';
import { Category, Product } from '../types';
import { Search, Plus, Clock, PackageX, AlertCircle } from 'lucide-react';

interface CatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

const CATEGORIES: Category[] = ['Mobiliario', 'Electrónica', 'Arquitectura Efímera', 'Decoración', 'Servicios'];

export const Catalog: React.FC<CatalogProps> = ({ products, onAddToCart }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Todos'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProducts = (products || []).filter(product => {
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
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

      <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('Todos')}
          className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            selectedCategory === 'Todos' ? 'bg-brand-900 text-white shadow-lg' : 'bg-white text-gray-500 border border-slate-100 hover:bg-slate-50'
          }`}
        >Todos</button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              selectedCategory === cat ? 'bg-brand-900 text-white shadow-lg' : 'bg-white text-gray-500 border border-slate-100 hover:bg-slate-50'
            }`}
          >{cat}</button>
        ))}
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredProducts.map(product => {
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= 3;

            return (
              <div key={product.id} className="bg-white rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-50 overflow-hidden flex flex-col group">
                {/* Contenedor con proporción exacta 842:950 */}
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
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <span className="text-[9px] text-brand-500 font-black uppercase mb-1">{product.category}</span>
                  <h3 className="font-black text-slate-900 text-sm mb-3 line-clamp-1">{product.name}</h3>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                    <p className="text-[8px] font-black text-slate-400 uppercase flex items-center mb-1">
                      <Clock size={10} className="mr-1.5" /> Tarifa de Alquiler
                    </p>
                    <p className="text-xl font-black text-brand-900">
                      ${product.priceRent?.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">/ día</span>
                    </p>
                  </div>

                  <button 
                    onClick={() => onAddToCart(product)}
                    disabled={isOutOfStock}
                    className="w-full py-4 bg-brand-900 text-white rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2 hover:bg-black disabled:opacity-30 disabled:grayscale"
                  >
                    <Plus size={14} />
                    <span>Añadir a la Reserva</span>
                  </button>
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
          <button 
            onClick={() => { setSelectedCategory('Todos'); setSearchTerm(''); }}
            className="mt-6 text-brand-900 font-black text-[9px] uppercase tracking-widest border-b-2 border-brand-900 pb-1 hover:text-brand-500 hover:border-brand-500 transition-all"
          >
            Limpiar Filtros
          </button>
        </div>
      )}
    </div>
  );
};
