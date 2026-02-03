
import React, { useState } from 'react';
import { Category, Product } from '../types';
import { Search, Plus, MapPin, Navigation, ArrowRight, Zap, Info, Truck, Package, Tag, Clock } from 'lucide-react';

interface CatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

const CATEGORIES: Category[] = ['Mobiliario', 'Electrónica', 'Arquitectura Efímera', 'Decoración', 'Servicios'];

export const Catalog: React.FC<CatalogProps> = ({ products, onAddToCart }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Todos'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-brand-900 uppercase">Catálogo Global</h2>
          <p className="text-gray-500 text-sm font-medium">Equipos y servicios para activaciones de alto impacto.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar artículo..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-2 focus:ring-brand-900 shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('Todos')}
          className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            selectedCategory === 'Todos' ? 'bg-brand-900 text-white shadow-xl' : 'bg-white text-gray-500 border border-slate-100'
          }`}
        >Todos</button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              selectedCategory === cat ? 'bg-brand-900 text-white shadow-xl' : 'bg-white text-gray-500 border border-slate-100'
            }`}
          >{cat}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredProducts.map(product => {
          const isOutOfStock = product.stock <= 0;
          return (
            <div key={product.id} className="bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-50 overflow-hidden flex flex-col group">
              <div className="h-60 overflow-hidden relative">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur rounded-xl text-[9px] font-black uppercase shadow-lg">Stock: {product.stock}</div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <span className="text-[10px] text-brand-500 font-black uppercase mb-1">{product.category}</span>
                <h3 className="font-black text-slate-900 text-lg mb-4">{product.name}</h3>
                
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase flex items-center"><Clock size={10} className="mr-1" /> Alquiler</p>
                    <p className="text-xs font-black text-brand-900">
                      ${product.priceRent?.toLocaleString()} <span className="text-[8px] opacity-60">/ día</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase flex items-center"><Tag size={10} className="mr-1" /> Venta</p>
                    <p className="text-xs font-black text-brand-900">${product.priceSell?.toLocaleString()}</p>
                  </div>
                </div>

                <button 
                  onClick={() => onAddToCart(product)}
                  disabled={isOutOfStock}
                  className="w-full py-4 bg-brand-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2 hover:bg-black"
                >
                  <Plus size={14} />
                  <span>Añadir al Pedido</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
