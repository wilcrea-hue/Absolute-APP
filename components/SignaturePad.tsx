
import React, { useRef, useState } from 'react';
import { Signature } from '../types';
import { MapPin, Loader2, Zap, Camera, X, CheckCircle2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface SignaturePadProps {
  label: string;
  onSave: (sig: Signature) => void;
  onCancel: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ label, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

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

  // Función para comprimir y redimensionar imágenes (Crucial para evitar errores de cuota)
  const compressImage = (base64Str: string, quality = 0.6, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Usar JPEG para fotos de evidencia para ahorrar espacio masivamente
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64);
        setEvidencePhoto(compressed);
        setIsCompressing(false);
      };
      reader.readAsDataURL(file);
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
              const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
              const prompt = `Dada la latitud ${latitude} y longitud ${longitude} en Colombia, ¿cuál es la dirección o nombre del lugar más probable? Responde solo con el nombre del lugar o barrio.`;

              const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
              });

              const placeName = response.text?.trim() || coordString;
              setLocation(placeName);
            } catch (err) {
              setLocation(`Coordenadas: ${coordString}`);
            } finally {
              setIsDetecting(false);
            }
        },
        () => {
            alert("No se pudo detectar la ubicación. Ingrésela manualmente.");
            setIsDetecting(false);
        }
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !location.trim()) {
      alert('Nombre y ubicación son obligatorios.');
      return;
    }
    if (!canvasRef.current) return;
    
    // Comprimir también la firma (aunque sea PNG) para asegurar que no sea gigante
    const signatureData = canvasRef.current.toDataURL('image/png');
    
    onSave({
      name: name.trim(),
      location: location.trim(),
      dataUrl: signatureData,
      timestamp: new Date().toISOString(),
      evidencePhoto: evidencePhoto || undefined
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100 mb-2">
          <h4 className="font-black text-brand-900 text-xs uppercase flex items-center tracking-widest">
              <MapPin size={16} className="mr-2" /> {label}
          </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Nombre Responsable</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-900 outline-none text-sm font-bold bg-slate-50"
              placeholder="Nombre completo"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Ubicación Actual</label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    value={location} 
                    onChange={e => setLocation(e.target.value)}
                    className="w-full border-2 border-slate-100 rounded-xl pl-4 pr-10 py-3 focus:ring-2 focus:ring-brand-900 outline-none text-sm font-bold bg-slate-50"
                    placeholder="Lugar de firma"
                  />
                  {isDetecting && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Zap size={14} className="text-brand-500 animate-pulse" /></div>}
                </div>
                <button 
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetecting}
                  className="p-3 bg-brand-900 text-white rounded-xl hover:bg-black transition-all shadow-md active:scale-90"
                >
                  {isDetecting ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                </button>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Evidencia Fotográfica</label>
          <div className="relative group aspect-video rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex flex-col items-center justify-center text-slate-300 hover:border-brand-900 hover:text-brand-900 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {isCompressing ? (
              <div className="flex flex-col items-center">
                <Loader2 size={24} className="animate-spin text-brand-900 mb-2" />
                <span className="text-[8px] font-black uppercase">Optimizando Imagen...</span>
              </div>
            ) : evidencePhoto ? (
              <>
                <img src={evidencePhoto} className="w-full h-full object-cover" alt="Evidencia" />
                <button onClick={(e) => { e.stopPropagation(); setEvidencePhoto(null); }} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg"><X size={12} /></button>
              </>
            ) : (
              <>
                <Camera size={32} className="mb-2" />
                <span className="text-[9px] font-black uppercase">Capturar Foto</span>
              </>
            )}
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" capture="environment" className="hidden" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Firma Digital Validada</label>
        <div className="border-2 border-slate-100 bg-white rounded-2xl touch-none overflow-hidden relative shadow-inner">
          <canvas 
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full h-44 cursor-crosshair bg-white"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <button type="button" onClick={clearCanvas} className="text-[10px] font-black text-red-500 hover:text-red-700 transition-colors uppercase tracking-widest">Limpiar lienzo</button>
        <div className="flex gap-4">
          <button type="button" onClick={onCancel} className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-900 transition-colors">Cancelar</button>
          <button type="button" onClick={handleSave} className="px-8 py-4 bg-brand-900 text-white rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 font-black text-[11px] uppercase tracking-[0.2em] flex items-center space-x-2">
            <CheckCircle2 size={16} />
            <span>Confirmar Registro</span>
          </button>
        </div>
      </div>
    </div>
  );
};
