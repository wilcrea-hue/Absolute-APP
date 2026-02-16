
import React, { useRef, useState } from 'react';
import { Signature } from '../types';
import { MapPin, Loader2, Zap } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface SignaturePadProps {
  label: string;
  onSave: (sig: Signature) => void;
  onCancel: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ label, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = ('touches' in e) ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const clientX = ('touches' in e) ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);
  
  const clearCanvas = () => {
    if(canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if(ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
        alert("La geolocalización no es compatible con este navegador.");
        return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            const coordString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            
            try {
              // Initialize AI to perform reverse geocoding
              const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
              const prompt = `Dada la latitud ${latitude} y longitud ${longitude} en Colombia, ¿cuál es la dirección o nombre del lugar más probable? 
              Responde de forma MUY concisa solo con el nombre del lugar, barrio o dirección aproximada (ej: 'Barrio El Chicó, Bogotá' o 'Zona Industrial, Medellín'). No incluyas preámbulos.`;

              const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                  tools: [{ googleMaps: {} }]
                }
              });

              const placeName = response.text?.trim() || coordString;
              setLocation(placeName);
            } catch (err) {
              console.error("Error reverse geocoding with AI:", err);
              setLocation(`Coordenadas: ${coordString}`);
            } finally {
              setIsDetecting(false);
            }
        },
        (error) => {
            console.error(error);
            alert("No se pudo detectar la ubicación. Por favor ingrésela manualmente.");
            setIsDetecting(false);
        }
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Por favor, ingrese el nombre del responsable.');
      return;
    }
    
    if (!location.trim()) {
      alert('La ubicación es obligatoria. Por favor, ingrese el lugar donde se realiza la firma (o use el botón detectar).');
      return;
    }

    if (!canvasRef.current) return;
    
    onSave({
      name: name.trim(),
      location: location.trim(),
      dataUrl: canvasRef.current.toDataURL(),
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-brand-50 p-3 rounded-lg border border-brand-100 mb-2">
          <h4 className="font-bold text-brand-900 text-sm flex items-center">
              <MapPin size={16} className="mr-2" /> {label}
          </h4>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre Responsable <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm"
            placeholder="Nombre completo"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ubicación de Firma <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={location} 
                  onChange={e => setLocation(e.target.value)}
                  className="w-full border rounded-lg pl-3 pr-10 py-2.5 focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm"
                  placeholder="Ej: Bodega Central / Evento Corferias"
                />
                {isDetecting && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Zap size={14} className="text-brand-500 animate-pulse" />
                  </div>
                )}
              </div>
              <button 
                type="button"
                onClick={detectLocation}
                disabled={isDetecting}
                title="Detectar ubicación inteligente"
                className={`p-2.5 rounded-lg transition-all flex items-center justify-center min-w-[45px] ${
                  isDetecting 
                    ? 'bg-brand-100 text-brand-400 cursor-wait' 
                    : 'bg-brand-900 text-white hover:bg-brand-800 shadow-md active:scale-95'
                }`}
              >
                {isDetecting ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
              </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Firma Digital <span className="text-red-500">*</span></label>
        <div className="border-2 border-dashed border-gray-300 bg-white rounded-xl touch-none overflow-hidden relative">
          <canvas 
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full h-44 cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="absolute bottom-2 right-2 text-[10px] text-gray-300 pointer-events-none uppercase font-bold">Área de Firma</div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <button 
            type="button"
            onClick={clearCanvas} 
            className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-tight"
        >
            Limpiar lienzo
        </button>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={onCancel} 
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleSave} 
            className="px-6 py-2.5 bg-brand-900 text-white rounded-lg shadow-md hover:bg-brand-800 transition-all active:scale-95 font-bold text-sm"
          >
            Confirmar Registro
          </button>
        </div>
      </div>
    </div>
  );
};
