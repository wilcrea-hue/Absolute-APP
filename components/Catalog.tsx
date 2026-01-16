import React, { useState } from 'react';
import { Category, Product } from '../types';
// Add Package to the imports from lucide-react
import { Search, Plus, AlertCircle, Map as MapIcon, Navigation, ArrowRight, Zap, Info, MapPin, Truck, Package } from 'lucide-react';

interface CatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

const CATEGORIES: Category[] = ['Mobiliario', 'Electrónica', 'Arquitectura Efímera', 'Decoración', 'Servicios'];

export const Catalog: React.FC<CatalogProps> = ({ products, onAddToCart }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Todos'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local state for the map logic within the catalog
  const [origin, setOrigin] = useState('Bogotá, Colombia');
  const [dest, setDest] = useState('');
  const [showMap, setShowMap] = useState(false);

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const mapKey = process.env.API_KEY || '';
  const mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${mapKey}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&mode=driving`;

  const handleTraceRoute = () => {
    if (dest.length < 3) {
      alert("Por favor ingrese un destino válido para trazar la ruta.");
      return;
    }
    setShowMap(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Catálogo de Eventos</h2>
          <p className="text-gray-500 text-sm">Seleccione los recursos necesarios para su promoción.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="¿Qué artículo busca hoy?" 
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-900 shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('Todos')}
          className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
            selectedCategory === 'Todos' 
              ? 'bg-brand-900 text-white shadow-xl scale-105' 
              : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          Todos
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center ${
              selectedCategory === cat 
                ? 'bg-brand-900 text-white shadow-xl scale-105' 
                : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            {cat === 'Servicios' && <Truck size={14} className="mr-2" />}
            {cat}
          </button>
        ))}
      </div>

      {/* TRANSPORT SERVICE CENTRAL MAP */}
      {selectedCategory === 'Servicios' && (
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-brand-900/10 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-8 bg-gradient-to-br from-brand-900 to-brand-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-md">
                    <h3 className="text-2xl font-black flex items-center uppercase tracking-tighter mb-2">
                        <MapIcon className="mr-3 text-brand-400" size={28} /> Configuración de Transporte
                    </h3>
                    <p className="text-brand-100 text-sm leading-relaxed">
                        Defina la logística nacional antes de agregar el servicio de flete a su pedido. Nuestro sistema calculará la mejor ruta para sus equipos.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" size={16} />
                        <input 
                            type="text" 
                            placeholder="Ciudad Destino..." 
                            value={dest}
                            onChange={(e) => setDest(e.target.value)}
                            className="bg-brand-900/50 border border-white/30 text-white placeholder:text-white/40 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-400 outline-none w-full sm:w-60"
                        />
                    </div>
                    <button 
                        onClick={handleTraceRoute}
                        className="bg-white text-brand-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center hover:bg-brand-100 transition-all active:scale-95 shadow-xl"
                    >
                        <Zap size={16} className="mr-2" /> Calcular Trayecto
                    </button>
                </div>
            </div>
            
            <div className={`transition-all duration-1000 ease-in-out overflow-hidden ${showMap ? 'h-96 opacity-100' : 'h-0 opacity-0'}`}>
                {showMap && (
                    <div className="relative h-full bg-gray-200">
                        <iframe
                            title="Catalog Route Planner"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            src={mapUrl}
                        ></iframe>
                        <div className="absolute top-6 left-6 flex space-x-2">
                            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-2xl border border-gray-100 flex items-center space-x-3">
                                <div className="p-2 bg-brand-900 text-white rounded-lg"><Navigation size={14} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado de Ruta</p>
                                    <p className="text-xs font-bold text-gray-900">Vía Principal Optimizada</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {!showMap && (
                <div className="p-16 flex flex-col items-center justify-center text-center bg-gray-50/50">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner border-4 border-brand-50 mb-6">
                        <Truck size={36} className="text-brand-200" />
                    </div>
                    <h4 className="text-gray-900 font-bold mb-2">Simulador de Fletes ABSOLUTE</h4>
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">Ingrese la ciudad donde se realizará el evento para activar el sistema de geolocalización.</p>
                </div>
            )}
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredProducts.map(product => {
          const isOutOfStock = product.stock <= 0;
          const isTransport = product.id === 'serv-2';
          
          return (
            <div key={product.id} className={`bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden flex flex-col group ${isOutOfStock ? 'opacity-60' : ''}`}>
              <div className="h-56 overflow-hidden relative">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className={`w-full h-full object-cover transform transition-transform duration-1000 ${isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
                />
                
                {isTransport && (
                    <div className="absolute inset-0 bg-brand-900/20 group-hover:bg-brand-900/10 transition-colors pointer-events-none" />
                )}

                <div className={`absolute top-4 right-4 px-3 py-2 rounded-xl text-[10px] font-black shadow-lg backdrop-blur uppercase tracking-widest border border-white/20 ${
                    isOutOfStock 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white/90 text-brand-900'
                }`}>
                  {isOutOfStock ? 'Agotado' : `Stock: ${product.stock}`}
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <span className="text-[10px] text-brand-600 font-black uppercase tracking-widest mb-2 flex items-center">
                    {/* Fixed Package usage here by adding it to imports above */}
                    {product.category === 'Servicios' ? <Zap size={12} className="mr-1" /> : <Package size={12} className="mr-1" />}
                    {product.category}
                </span>
                <h3 className="font-bold text-xl text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-500 text-xs mb-8 flex-1 leading-relaxed">{product.description}</p>
                
                <button 
                  onClick={() => onAddToCart(product)}
                  disabled={isOutOfStock}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-md ${
                    isOutOfStock 
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                      : isTransport 
                        ? 'bg-brand-900 text-white hover:bg-brand-800' 
                        : 'bg-white text-brand-900 border-2 border-brand-900 hover:bg-brand-900 hover:text-white'
                  }`}
                >
                  {isOutOfStock ? (
                    <span>Sin Existencias</span>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>{isTransport ? 'Solicitar Flete' : 'Agregar al Plan'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};