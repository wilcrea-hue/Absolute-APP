
import React, { useState, useEffect, useMemo } from 'react';
import { Order, WorkflowStageKey, StageData, Signature, User, ItemCheck } from '../types';
import { 
  Check, Camera, X, Map as MapIcon, Navigation, Clock, 
  ArrowRight, CheckCircle2, List, Package, 
  UserCheck, AlertTriangle, FileText, MapPin as MapPinIcon,
  ChevronRight, Save, Image as ImageIcon, PenTool, Trash2 as TrashIcon, Maximize2
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { SignaturePad } from './SignaturePad';
import { EmailNotification } from './EmailNotification';

interface TrackingProps {
  orders: Order[];
  onUpdateStage: (orderId: string, stageKey: WorkflowStageKey, data: StageData) => void;
  currentUser: User;
  users: User[];
}

const ALL_STAGES: { key: WorkflowStageKey; label: string; description: string }[] = [
  { key: 'bodega_check', label: '1. Jefe de Bodega', description: 'Verificación inicial de salida' },
  { key: 'bodega_to_coord', label: '2. Bodega -> Coord', description: 'Entrega a Coordinador' },
  { key: 'coord_to_client', label: '3. Coord -> Cliente', description: 'Entrega en sitio' },
  { key: 'client_to_coord', label: '4. Cliente -> Coord', description: 'Recogida del evento' },
  { key: 'coord_to_bodega', label: '5. Coord -> Bodega', description: 'Retorno a bodega' },
];

export const Tracking: React.FC<TrackingProps> = ({ orders, onUpdateStage, currentUser, users }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const order = orders.find(o => o.id === id);

  const [activeStageKey, setActiveStageKey] = useState<WorkflowStageKey>('bodega_check');
  const [tempStageData, setTempStageData] = useState<StageData | null>(null);
  const [activeSigningField, setActiveSigningField] = useState<'signature' | 'receivedBy' | null>(null);
  const [activeEmail, setActiveEmail] = useState<any>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (order) {
      const data = order.workflow[activeStageKey];
      if (data) {
        setTempStageData(JSON.parse(JSON.stringify(data)));
      } else {
        // Inicializar datos de etapa si no existen
        setTempStageData({
          status: 'pending',
          itemChecks: order.items.reduce((acc, item) => ({ 
            ...acc, 
            [item.id]: { verified: false, notes: '' } 
          }), {}),
          photos: [],
          files: []
        });
      }
    }
  }, [order, activeStageKey]);

  if (!order) return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertTriangle size={48} className="text-amber-500 mb-4" />
      <h2 className="text-xl font-black text-brand-900 uppercase">Pedido no encontrado</h2>
      <button onClick={() => navigate('/orders')} className="mt-4 text-brand-500 font-bold uppercase text-xs border-b border-brand-500">Volver al listado</button>
    </div>
  );

  const isCompleted = order.workflow[activeStageKey]?.status === 'completed';
  
  const canEdit = useMemo(() => {
    if (order.status === 'Cotización' || order.status === 'Cancelado') return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'logistics') return ['bodega_check', 'bodega_to_coord', 'coord_to_bodega'].includes(activeStageKey);
    if (currentUser.role === 'coordinator') return ['coord_to_client', 'client_to_coord'].includes(activeStageKey);
    return false;
  }, [currentUser.role, order.status, activeStageKey]);

  const handleUpdateItemCheck = (productId: string, field: keyof ItemCheck, value: any) => {
    if (!tempStageData) return;
    const newChecks = { ...tempStageData.itemChecks };
    newChecks[productId] = { ...newChecks[productId], [field]: value };
    setTempStageData({ ...tempStageData, itemChecks: newChecks });
  };

  const handleSaveSignature = (sig: Signature) => {
    if (!tempStageData || !activeSigningField) return;
    setTempStageData({ ...tempStageData, [activeSigningField]: sig });
    setActiveSigningField(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !tempStageData) return;
    
    const currentPhotos = tempStageData.photos || [];
    if (currentPhotos.length >= 5) {
      alert("Límite de 5 fotos por etapa alcanzado.");
      return;
    }

    const files = Array.from(e.target.files).slice(0, 5 - currentPhotos.length);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        try {
          // Subir al servidor para guardar en carpeta física
          const res = await fetch('./api/upload_photo.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, name: file.name })
          });
          const data = await res.json();
          
          if (data.url) {
            setTempStageData(prev => {
              if (!prev) return null;
              const updatedPhotos = [...(prev.photos || []), data.url];
              return { ...prev, photos: updatedPhotos };
            });
          } else {
            alert("Error al subir foto: " + (data.error || 'Error desconocido'));
          }
        } catch (err) {
          alert("Error de conexión al intentar subir la fotografía.");
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveDraft = () => {
    if (!tempStageData) return;
    onUpdateStage(order.id, activeStageKey, tempStageData);
    alert("Avance guardado correctamente en el servidor.");
  };

  const handleCompleteStage = () => {
    if (!tempStageData) return;
    
    // Validaciones estrictas solicitadas por Jefe de Bodega
    const allChecked = order.items.every(item => tempStageData.itemChecks[item.id]?.verified);
    const hasSignature = tempStageData.signature || tempStageData.receivedBy;

    if (!allChecked) {
      alert("BLOQUEO DE SEGURIDAD: Todos los artículos deben estar marcados con el check de verificación antes de cerrar la etapa.");
      return;
    }

    if (!hasSignature) {
      alert("BLOQUEO DE SEGURIDAD: Es obligatorio capturar al menos una firma digital (Entrega o Recibido) para generar el acta y cerrar el proceso.");
      return;
    }

    setActiveEmail({
      to: order.userEmail,
      cc: 'notificaciones@absolutecompany.co',
      subject: `Avance Logístico: Pedido #${order.id} - ${ALL_STAGES.find(s => s.key === activeStageKey)?.label}`,
      body: `Buen día,\n\nSe ha completado satisfactoriamente la etapa "${ALL_STAGES.find(s => s.key === activeStageKey)?.description}" para su pedido en ${order.destinationLocation}.\n\nPuede ver el acta digital con firmas y fotos adjuntas en el panel de seguimiento de la App.\n\nSaludos,\nEquipo ABSOLUTE.`,
      stage: ALL_STAGES.find(s => s.key === activeStageKey)?.label,
      order: order
    });
  };

  const finalizeAndSave = () => {
    const finalData = { ...tempStageData, status: 'completed', timestamp: new Date().toISOString() } as StageData;
    onUpdateStage(order.id, activeStageKey, finalData);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Cabecera del Pedido */}
      <div className="bg-brand-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                <Package size={28} className="text-brand-400" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-400">ID Reserva: {order.id}</span>
                <h2 className="text-xl font-black uppercase">{order.destinationLocation}</h2>
              </div>
            </div>
            <div className="flex items-center bg-white/5 p-4 rounded-2xl border border-white/5 space-x-6">
               <div className="text-center">
                 <p className="text-[8px] font-black uppercase text-brand-400 tracking-widest">Inicio</p>
                 <p className="text-[11px] font-bold">{order.startDate}</p>
               </div>
               <ArrowRight size={14} className="text-white/20" />
               <div className="text-center">
                 <p className="text-[8px] font-black uppercase text-brand-400 tracking-widest">Fin</p>
                 <p className="text-[11px] font-bold">{order.endDate}</p>
               </div>
            </div>
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-brand-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* Navegación de Etapas */}
      <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
        {ALL_STAGES.map((stage) => {
          const isStageCompleted = order.workflow[stage.key]?.status === 'completed';
          const isActive = activeStageKey === stage.key;
          return (
            <button
              key={stage.key}
              onClick={() => setActiveStageKey(stage.key)}
              className={`flex-shrink-0 px-6 py-4 rounded-2xl border transition-all flex items-center space-x-3 ${
                isActive 
                  ? 'bg-brand-900 text-white border-brand-900 shadow-xl' 
                  : isStageCompleted 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                isActive ? 'bg-white text-brand-900' : isStageCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {isStageCompleted ? <Check size={14} /> : stage.label.split('.')[0]}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{stage.label.split('.')[1]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Panel Izquierdo: Lista de Chequeo */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8 border-b pb-6">
              <h3 className="text-sm font-black text-brand-900 uppercase flex items-center tracking-widest">
                <List size={18} className="mr-2 text-brand-400" /> Lista de Verificación
              </h3>
              <span className="text-[9px] font-black bg-slate-50 text-slate-400 px-4 py-2 rounded-full uppercase">
                {order.items.length} Ítems Totales
              </span>
            </div>

            <div className="space-y-4">
              {order.items.map((item) => {
                const check = tempStageData?.itemChecks[item.id] || { verified: false, notes: '' };
                return (
                  <div key={item.id} className={`p-5 rounded-3xl border transition-all ${check.verified ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100'}`}>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                      <div className="flex items-center space-x-4 flex-1">
                        <img src={item.image} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="" />
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 uppercase">{item.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cantidad Solicitada: {item.quantity}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 w-full md:w-auto">
                        <input 
                          type="text"
                          placeholder="Notas de estado..."
                          disabled={isCompleted || !canEdit}
                          value={check.notes}
                          onChange={(e) => handleUpdateItemCheck(item.id, 'notes', e.target.value)}
                          className="flex-1 bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-900 transition-all"
                        />
                        <button
                          disabled={isCompleted || !canEdit}
                          onClick={() => handleUpdateItemCheck(item.id, 'verified', !check.verified)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            check.verified 
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                              : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <Check size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-brand-900 uppercase flex items-center tracking-widest">
                    <ImageIcon size={18} className="mr-2 text-brand-400" /> Evidencia Fotográfica
                </h3>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {(tempStageData?.photos || []).length} / 5 Fotos
                </span>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(tempStageData?.photos || []).map((photo, i) => (
                  <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <img src={photo} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-brand-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center space-x-2">
                      <button 
                        onClick={() => setPreviewPhoto(photo)}
                        className="p-2 bg-white text-brand-900 rounded-xl hover:scale-110 transition-transform"
                      >
                        <Maximize2 size={14} />
                      </button>
                      {!isCompleted && canEdit && (
                        <button 
                          onClick={() => {
                            const newPhotos = [...tempStageData!.photos];
                            newPhotos.splice(i, 1);
                            setTempStageData({...tempStageData!, photos: newPhotos});
                          }}
                          className="p-2 bg-red-500 text-white rounded-xl hover:scale-110 transition-transform"
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!isCompleted && canEdit && (tempStageData?.photos || []).length < 5 && (
                  <>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-brand-400 hover:text-brand-900 transition-all group"
                    >
                      <Camera size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black uppercase">Añadir Foto</span>
                    </button>
                  </>
                )}
             </div>
          </div>
        </div>

        {/* Panel Derecho: Firmas y Cierre */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
            <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest border-b pb-4">Acta Digital</h3>
            
            {/* Firma 1: Emisor */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                 <UserCheck size={14} className="mr-2 text-brand-400" /> Firma de Entrega
              </p>
              {tempStageData?.signature ? (
                <div className="relative bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <img src={tempStageData.signature.dataUrl} className="h-20 w-auto mx-auto mb-2 mix-blend-multiply" alt="" />
                  <div className="text-center">
                    <p className="text-[11px] font-black text-brand-900 uppercase">{tempStageData.signature.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{tempStageData.signature.location}</p>
                  </div>
                  {!isCompleted && canEdit && (
                    <button onClick={() => setTempStageData({...tempStageData!, signature: undefined})} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <button 
                  disabled={isCompleted || !canEdit}
                  onClick={() => setActiveSigningField('signature')}
                  className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  <PenTool size={20} className="mb-2" />
                  <span className="text-[10px] font-black uppercase">Firmar Entrega</span>
                </button>
              )}
            </div>

            {/* Firma 2: Receptor */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                 <UserCheck size={14} className="mr-2 text-brand-400" /> Firma de Recibido
              </p>
              {tempStageData?.receivedBy ? (
                <div className="relative bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <img src={tempStageData.receivedBy.dataUrl} className="h-20 w-auto mx-auto mb-2 mix-blend-multiply" alt="" />
                  <div className="text-center">
                    <p className="text-[11px] font-black text-brand-900 uppercase">{tempStageData.receivedBy.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{tempStageData.receivedBy.location}</p>
                  </div>
                  {!isCompleted && canEdit && (
                    <button onClick={() => setTempStageData({...tempStageData!, receivedBy: undefined})} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <button 
                  disabled={isCompleted || !canEdit}
                  onClick={() => setActiveSigningField('receivedBy')}
                  className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  <PenTool size={20} className="mb-2" />
                  <span className="text-[10px] font-black uppercase">Firmar Recibido</span>
                </button>
              )}
            </div>

            {/* Acciones Finales */}
            {!isCompleted && canEdit && (
              <div className="pt-6 border-t border-slate-100 space-y-3">
                <button 
                  onClick={handleSaveDraft}
                  className="w-full py-4 bg-white border border-brand-900 text-brand-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-50 transition-all flex items-center justify-center space-x-2"
                >
                  <Save size={16} />
                  <span>Guardar Avance (Borrador)</span>
                </button>
                <button 
                  onClick={handleCompleteStage}
                  className="w-full py-5 bg-brand-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-brand-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3"
                >
                  <CheckCircle2 size={18} />
                  <span>Cerrar Etapa y Notificar</span>
                </button>
              </div>
            )}

            {isCompleted && (
               <div className="bg-emerald-500 text-white p-6 rounded-[2rem] text-center space-y-2 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={32} className="mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Etapa Finalizada</p>
                  <p className="text-[9px] opacity-80 uppercase font-bold">{order.workflow[activeStageKey].timestamp}</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Modales de Firma y Correo */}
      {activeSigningField && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-brand-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-500">
            <SignaturePad 
              label={`Responsable de ${activeSigningField === 'signature' ? 'Entrega' : 'Recepción'}`}
              onSave={handleSaveSignature}
              onCancel={() => setActiveSigningField(null)}
            />
          </div>
        </div>
      )}

      <EmailNotification 
        email={activeEmail} 
        onClose={() => setActiveEmail(null)} 
        onSentSuccess={finalizeAndSave}
      />

      {/* Galería Previsualizable */}
      {previewPhoto && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-brand-900/95 backdrop-blur-xl animate-in fade-in duration-300">
          <button 
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-8 right-8 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
          >
            <X size={24} />
          </button>
          <div className="max-w-4xl w-full h-[80vh] flex items-center justify-center p-4">
            <img 
              src={previewPhoto} 
              className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500" 
              alt="Preview" 
            />
          </div>
        </div>
      )}
    </div>
  );
};
