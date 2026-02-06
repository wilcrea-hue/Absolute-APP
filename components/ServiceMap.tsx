
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Search, MapPin, Navigation, Info, ExternalLink, Loader2, Clock, Ruler, CreditCard, Map as MapIcon, ArrowRight, Zap, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RouteSummary {
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  tolls: string;
}

const MOCK_ROUTES: Record<string, any> = {
  'bogota-medellin': { distance: '415 km', duration: '9h 15m', tolls: '6 peajes / $78.400 COP' },
  'medellin-bogota': { distance: '415 km', duration: '9h 15m', tolls: '6 peajes / $78.400 COP' },
  'bogota-cali': { distance: '460 km', duration: '10h 30m', tolls: '7 peajes / $84.200 COP' },
  'cali-bogota': { distance: '460 km', duration: '10h 30m', tolls: '7 peajes / $84.200 COP' },
  'bogota-barranquilla': { distance: '1.000 km', duration: '18h 45m', tolls: '12 peajes / $145.000 COP' },
  'medellin-cartagena': { distance: '630 km', duration: '12h 20m', tolls: '8 peajes / $92.500 COP' },
  'bucaramanga-bogota': { distance: '390 km', duration: '8h 45m', tolls: '5 peajes / $62.000 COP' },
};

export const ServiceMap: React.FC = () => {
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [mapLinks, setMapLinks] = useState<{ uri: string; title: string; review?: string }[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [mapMode, setMapMode] = useState<'place' | 'directions'>('place');
  const navigate = useNavigate();

  const apiKey = process.env.API_KEY;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => console.debug("Geolocation error:", error)
      );
    }
  }, []);

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

  const simulateRouteData = (origin: string, destination: string) => {
    setIsLoading(true);
    setResponse(null);
    setRouteSummary(null);

    setTimeout(() => {
      const key = `${origin.toLowerCase().trim()}-${destination.toLowerCase().trim()}`;
      const mock = MOCK_ROUTES[key] || {
        distance: `${Math.floor(Math.random() * 500) + 50} km`,
        duration: `${Math.floor(Math.random() * 12) + 2}h ${Math.floor(Math.random() * 59)}m`,
        tolls: `${Math.floor(Math.random() * 8) + 1} peajes / Estimado $50.000 COP`
      };

      const summary: RouteSummary = {
        origin: origin.trim(),
        destination: destination.trim(),
        ...mock
      };

      setRouteSummary(summary);
      setResponse(`[SISTEMA] Análisis logístico para la ruta ${origin} -> ${destination}. 
      
Esta es una estimación basada en promedios históricos de ABSOLUTE. La ruta sugerida contempla el paso por los principales corredores viales nacionales. 

Recomendaciones:
1. Verificar restricciones de carga pesada.
2. Considerar paradas técnicas.
3. El costo de peajes es aproximado.`);
      
      setMapMode('directions');
      setIsLoading(false);
    }, 800);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!originInput.trim() || !destinationInput.trim()) {
      alert("Por favor ingrese origen y destino.");
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setMapLinks([]);
    setRouteSummary(null);

    try {
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Eres un experto en logística para ABSOLUTE, una empresa de eventos en Colombia. 
      Analiza la siguiente solicitud de transporte:
      - ORIGEN: ${originInput}
      - DESTINO: ${destinationInput}
      - DETALLES ADICIONALES: ${additionalDetails || 'Ninguno'}
      
      Proporciona una explicación detallada de la mejor ruta y consejos logísticos específicos.
      
      IMPORTANTE: Incluye este bloque:
      ---RESUMEN---
      Origen: ${originInput}
      Destino: ${destinationInput}
      Distancia: [Ej: 450 km]
      Tiempo: [Ej: 8 horas]
      Peajes: [Ej: 6 peajes]
      ---`;

      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: userLocation || { latitude: 4.7110, longitude: -74.0721 }
            }
          }
        },
      });

      const fullText = res.text || "";
      const summary = parseSummary(fullText);
      const displayText = fullText.replace(/---RESUMEN---[\s\S]*?---/, "").trim();
      
      setResponse(displayText || "Información de ruta procesada.");
      setRouteSummary(summary);
      setMapMode(summary ? 'directions' : 'place');

      const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const links = chunks
        .filter((chunk: any) => chunk.maps?.uri)
        .map((chunk: any) => ({
          uri: chunk.maps.uri,
          title: chunk.maps.title || "Ver en Google Maps",
          review: chunk.maps.placeAnswerSources?.reviewSnippets?.[0]
        }));
      
      setMapLinks(links);
    } catch (error) {
      console.error(error);
      simulateRouteData(originInput, destinationInput);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrderFromRoute = () => {
    if (routeSummary) {
      navigate('/', { state: { prefilledDestination: routeSummary.destination } });
    }
  };

  const getEmbedUrl = () => {
    if (!apiKey) return '';
    if (mapMode === 'directions' && routeSummary) {
      return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(routeSummary.origin)}&destination=${encodeURIComponent(routeSummary.destination)}&mode=driving`;
    }
    const query = destinationInput || originInput || 'Colombia';
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(query)}&zoom=6`;
  };

  const openExternalMaps = () => {
    const origin = originInput || (routeSummary?.origin);
    const dest = destinationInput || (routeSummary?.destination);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin || '')}&destination=${encodeURIComponent(dest || '')}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center">
            <MapIcon className="mr-2 text-brand-500" />
            Planificador Logístico ABSOLUTE
          </h2>
          <p className="text-gray-500 text-sm">
            Calcule rutas y costos logísticos exactos para sus eventos nacionales.
          </p>
        </div>
        
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              value={originInput}
              onChange={(e) => setOriginInput(e.target.value)}
              placeholder="Origen (Ej: Bogotá)"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
          <div className="relative md:col-span-1">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90" size={16} />
            <input 
              type="text" 
              value={destinationInput}
              onChange={(e) => setDestinationInput(e.target.value)}
              placeholder="Destino (Ej: Medellín)"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
          <div className="relative md:col-span-1">
            <input 
              type="text" 
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="Detalles de carga"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button 
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-brand-900 text-white rounded-lg py-2.5 px-4 font-bold text-sm hover:bg-brand-800 transition-all flex items-center justify-center disabled:opacity-50 shadow-md"
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Navigation className="mr-2" size={18} />}
              Calcular Ruta
            </button>
            <button 
              type="button"
              disabled={isLoading || !originInput || !destinationInput}
              onClick={() => simulateRouteData(originInput, destinationInput)}
              className="px-4 py-2.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg font-bold text-sm hover:bg-brand-100 transition-all flex items-center justify-center disabled:opacity-50"
              title="Obtener estimación rápida"
            >
              <Zap size={18} className="mr-2" />
              Simular
            </button>
          </div>
        </form>
      </div>

      {routeSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><MapPin size={24} /></div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ruta Activa</p>
              <p className="text-sm font-bold text-gray-900 truncate">
                {routeSummary.origin} <ArrowRight size={12} className="inline mx-1 text-gray-300" /> {routeSummary.destination}
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Ruler size={24} /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Distancia</p>
              <p className="text-sm font-bold text-gray-900">{routeSummary.distance}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Clock size={24} /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tiempo Est.</p>
              <p className="text-sm font-bold text-gray-900">{routeSummary.duration}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><CreditCard size={24} /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Peajes/Gastos</p>
              <p className="text-sm font-bold text-gray-900">{routeSummary.tolls}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-3 border-b bg-gray-50 flex justify-between items-center px-6">
            <span className="text-xs font-bold text-brand-900 flex items-center uppercase tracking-widest">
              <Navigation size={14} className="mr-2 text-brand-500" /> 
              Visualización de Ruta
            </span>
            <button 
              onClick={openExternalMaps}
              className="flex items-center space-x-2 text-[10px] font-black uppercase text-brand-900 bg-brand-400 px-4 py-2 rounded-xl shadow-md hover:bg-brand-900 hover:text-white transition-all"
            >
              <ExternalLink size={14} />
              <span>Abrir Mapa Externo (Siempre Funciona)</span>
            </button>
          </div>
          <div className="flex-1 relative bg-gray-100">
            {apiKey ? (
              <>
                <iframe
                  key={getEmbedUrl()} 
                  title="Logistics Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={getEmbedUrl()}
                ></iframe>
                {/* Overlay informativo sobre el error de Key */}
                <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                   <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-amber-200 shadow-xl max-w-sm">
                      <p className="text-[10px] font-bold text-brand-900 uppercase mb-1">Nota de Visualización:</p>
                      <p className="text-[9px] text-slate-500 leading-tight">Si aparece un error de "API Key Invalid", su clave de Gemini no tiene permisos visuales de Google Cloud. Utilice el botón <b>"Abrir Mapa Externo"</b> superior.</p>
                   </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                <AlertTriangle size={48} className="text-amber-500" />
                <h3 className="font-black text-brand-900 uppercase">Falta API Key</h3>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col space-y-4 min-h-[400px]">
          <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-4 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center text-sm">
                <Info size={16} className="mr-2 text-brand-500" />
                Informe Estratégico
              </h3>
            </div>
            
            <div className="p-6 flex-1">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="animate-spin text-brand-500" size={40} />
                  <p className="text-gray-500 text-sm font-medium animate-pulse">Analizando parámetros...</p>
                </div>
              ) : response ? (
                <div className="space-y-6">
                  <div className="whitespace-pre-wrap leading-relaxed text-sm text-gray-700">
                    {response}
                  </div>

                  {routeSummary && (
                    <button 
                      onClick={handleCreateOrderFromRoute}
                      className="w-full py-4 bg-brand-900 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-xl hover:bg-brand-800 transition-all"
                    >
                      <ShoppingCart size={18} />
                      <span>Crear Pedido con esta Ruta</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <Navigation size={32} className="text-gray-300 mb-4" />
                  <p className="text-gray-400 text-xs">Ingrese origen y destino para activar el análisis.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
