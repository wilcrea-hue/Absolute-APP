
import React, { useState, useEffect, useMemo } from 'react';
import { Order, WorkflowStageKey, StageData, Signature, User, NoteEntry } from '../types';
import { Check, PenTool, Camera, Upload, X, MessageSquare, Map as MapIcon, Navigation, Ruler, Clock, CreditCard, Info, ArrowRight, CheckCircle2, Zap, History, Loader2, Sparkles, ShieldAlert, UserCheck, AlertTriangle, FileText, ExternalLink, MapPin as MapPinIcon, Send, Calendar, Save } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { SignaturePad } from './SignaturePad';
import { GoogleGenAI } from "@google/genai";
import { LOGO_URL } from '../constants';

interface TrackingProps {
  orders: Order[];
  onUpdateStage: (orderId: string, stageKey: WorkflowStageKey, data: StageData) => void;
  onConfirmQuote?: (id: string) => void;
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

export const Tracking: React.FC<TrackingProps> = ({ orders, onUpdateStage, onConfirmQuote, currentUser, users }) => {
  const { id } = useParams<{ id: string }>();
  const order = orders.find(o => o.id === id);
  const apiKey = process.env.API_KEY;
  
  const visibleStages = useMemo(() => {
    return currentUser.role === 'user' ? ALL_STAGES.slice(0, 4) : ALL_STAGES;
  }, [currentUser.role]);

  const canEdit = useMemo(() => {
    const operationalRoles = ['admin', 'logistics', 'coordinator', 'operations_manager'];
    return operationalRoles.includes(currentUser.role) && order?.status !== 'Cotización';
  }, [currentUser.role, order?.status]);

  const assignedCoord = useMemo(() => {
    return users.find(u => u.email === order?.assignedCoordinatorEmail);
  }, [users, order]);

  const [activeStageKey, setActiveStageKey] = useState<WorkflowStageKey>('bodega_check');
  const [tempStageData, setTempStageData] = useState<StageData | null>(null);
  const [activeSigningField, setActiveSigningField] = useState<'signature' | 'receivedBy' | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [signatureSuccess, setSignatureSuccess] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (order && order.workflow) {
      const data = order.workflow[activeStageKey];
      setTempStageData(data ? JSON.parse(JSON.stringify(data)) : null);
      setActiveSigningField(null);
      setSignatureSuccess(null);
      setSaveStatus('idle');
    }
  }, [order, activeStageKey]);

  const staticMapUrl = useMemo(() => {
    if (!order || !apiKey) return null;
    const origin = encodeURIComponent(order.originLocation || 'Bogotá, Colombia');
    const dest = encodeURIComponent(order.destinationLocation);
    return `https://maps.googleapis.com/maps/api/staticmap?size=400x150&scale=2&maptype=roadmap&markers=color:blue|label:A|${origin}&markers=color:red|label:B|${dest}&path=color:0x0000ff|weight:2|${origin}|${dest}&key=${apiKey}`;
  }, [order, apiKey]);

  if (!order || !order.workflow) {
    return <div className="p-8 text-center text-gray-500 font-black uppercase">Pedido no encontrado</div>;
  }

  const isCompleted = order.workflow[activeStageKey]?.status === 'completed';
  const isQuote = order.status === 'Cotización';

  const handleItemCheck = (productId: string, checked: boolean) => {
    if (!tempStageData || !canEdit || isCompleted) return;
    setTempStageData({
      ...tempStageData,
      itemChecks: {
        ...tempStageData.itemChecks,
        [productId]: { ...(tempStageData.itemChecks[productId] || { notes: '' }), verified: checked }
      }
    });
  };

  const handleItemNote = (productId: string, note: string) => {
    if (!tempStageData || !canEdit || isCompleted) return;
    setTempStageData({
      ...tempStageData,
      itemChecks: {
        ...tempStageData.itemChecks,
        [productId]: { ...(tempStageData.itemChecks[productId] || { verified: false }), notes: note }
      }
    });
  };

  const handleGeneralNotesChange = (notes: string) => {
    if (!tempStageData || !canEdit || isCompleted) return;
    setTempStageData({ ...tempStageData, generalNotes: notes });
  };

  const handleSavePartial = () => {
    if (!tempStageData || !canEdit || isCompleted) return;
    setSaveStatus('saving');
    onUpdateStage(order.id, activeStageKey, tempStageData);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleAddNoteToHistory = () => {
    if (!tempStageData?.generalNotes?.trim() || isCompleted || !canEdit) return;

    const newNote: NoteEntry = {
      text: tempStageData.generalNotes.trim(),
      timestamp: new Date().toISOString(),
      userEmail: currentUser.email,
      userName: currentUser.name
    };

    const updatedHistory = [...(tempStageData.notesHistory || []), newNote];
    const updatedData: StageData = { 
      ...tempStageData, 
      notesHistory: updatedHistory,
      generalNotes: '' 
    };

    setTempStageData(updatedData);
    onUpdateStage(order.id, activeStageKey, updatedData);
  };

  const professionalizeNote = async () => {
    if (!tempStageData?.generalNotes || !canEdit || isAiProcessing || !apiKey) return;
    
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Actúa como un supervisor logístico senior de ABSOLUTE COMPANY. 
      Transforma la siguiente nota técnica informal en un reporte profesional y elegante. 
      Nota original: "${tempStageData.generalNotes}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      if (response.text) {
        setTempStageData({ ...tempStageData, generalNotes: response.text.trim() });
      }
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const saveSignature = (field: 'signature' | 'receivedBy' | null, sig: Signature) => {
    if (!tempStageData || !canEdit || !field) return;
    setSignatureSuccess(`Firma de ${sig.name} guardada correctamente.`);
    const updatedData = { ...tempStageData, [field]: sig };
    setTempStageData(updatedData);
    
    setTimeout(() => {
      setActiveSigningField(null);
      setSignatureSuccess(null);
    }, 1800);
  };

  const handleCompleteStage = () => {
    if (!tempStageData || !canEdit) return;
    if (!tempStageData.signature) {
        alert("Falta la firma de 'Entregado por / Autorizado'.");
        return;
    }
    const finalData: StageData = {
        ...tempStageData,
        status: 'completed',
        timestamp: new Date().toISOString()
    };
    onUpdateStage(order.id, activeStageKey, finalData);
  };

  const openExternalRoute = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=Bogota&destination=${encodeURIComponent(order.destinationLocation)}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const showReceivedBy = ['coord_to_client', 'client_to_coord', 'coord_to_bodega'].includes(activeStageKey);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {isQuote && (
        <div className="bg-brand-900 text-white p-8 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-top-4 duration-500 relative overflow-hidden group">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-black uppercase leading-tight">Confirmación Requerida</h2>
              <p className="text-brand-100/70 text-[11px] font-bold mt-2 uppercase tracking-wide">Formalice esta reserva para asegurar stock.</p>
            </div>
            {onConfirmQuote && (
              <button 
                onClick={() => onConfirmQuote(order.id)}
                className="bg-brand-400 text-brand-900 px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-white transition-all active:scale-95 flex items-center space-x-3"
              >
                <CheckCircle2 size={20} />
                <span>Confirmar Pedido Ahora</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
             <div className="flex-1">
                <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] block mb-2">Seguimiento Logístico</span>
                <h1 className="text-3xl font-black text-brand-900 uppercase leading-none">{order.destinationLocation}</h1>
                <div className="flex flex-wrap items-center text-slate-400 font-bold text-[11px] mt-4 uppercase gap-y-2">
                  <span className="bg-slate-100 px-3 py-1 rounded-full mr-4 tracking-widest border border-slate-200">Ref: {order.id}</span>
                  {assignedCoord && (
                    <div className="flex items-center bg-brand-50 text-brand-900 px-4 py-1 rounded-full border border-brand-100">
                      <UserCheck size={12} className="mr-2" /> Campo: {assignedCoord.name}
                    </div>
                  )}
                </div>
             </div>

             <div className="w-full lg:w-72 h-24 lg:h-32 bg-slate-100 rounded-3xl border border-slate-200 overflow-hidden shadow-inner flex items-center justify-center group relative cursor-default">
               {staticMapUrl ? (
                 <img 
                   src={staticMapUrl} 
                   alt="Ruta de entrega" 
                   className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700"
                 />
               ) : (
                 <div className="text-slate-300 flex flex-col items-center space-y-1">
                   <MapPinIcon size={24} />
                   <span className="text-[8px] font-black uppercase">Mapa estático no disp.</span>
                 </div>
               )}
               <div className="absolute top-2 left-2 bg-brand-900/80 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-white/10">
                 <p className="text-[7px] font-black text-white uppercase tracking-widest">Previsualización</p>
               </div>
             </div>

             <div className="flex flex-col items-end space-y-3 min-w-[150px]">
                <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase border shadow-sm ${order.status === 'Finalizado' ? 'bg-green-50 text-green-700' : 'bg-brand-50 text-brand-900'}`}>{order.status}</span>
                <div className="flex space-x-2">
                  <button onClick={() => setShowMap(!showMap)} className="text-[9px] font-black text-brand-500 uppercase tracking-widest hover:text-brand-900 transition-colors bg-brand-50 px-4 py-2 rounded-xl">
                    {showMap ? 'Ocultar Mapa' : 'Ver Mapa Interactivo'}
                  </button>
                  <button onClick={openExternalRoute} className="text-[9px] font-black text-white uppercase tracking-widest bg-brand-900 px-4 py-2 rounded-xl flex items-center shadow-lg">
                    <ExternalLink size={12} className="mr-2" /> Fallback
                  </button>
                </div>
             </div>
        </div>
      </div>

      {showMap && (
        <div className="relative h-80 bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl animate-in zoom-in duration-500">
           {apiKey ? (
             <>
               <iframe
                    title="Logistics Route"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=Bogota&destination=${encodeURIComponent(order.destinationLocation)}&mode=driving`}
               ></iframe>
               <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-xl border border-amber-200 text-[8px] font-black uppercase max-w-[200px] shadow-lg pointer-events-none">
                 Si ve error de API KEY, use el botón <b>FALLBACK EXTERNO</b> superior.
               </div>
             </>
           ) : (
              <div className="h-full flex flex-col items-center justify-center bg-slate-50">
                <AlertTriangle size={32} className="text-amber-500" />
                <p className="text-[10px] font-black uppercase text-brand-900">Mapa interactivo no disponible</p>
              </div>
           )}
        </div>
      )}

      <div className={`grid gap-3 ${currentUser.role === 'user' ? 'grid-cols-4' : 'grid-cols-2 md:grid-cols-5'}`}>
        {visibleStages.map((stage, idx) => {
            const stageData = order.workflow[stage.key];
            const isDone = stageData?.status === 'completed';
            const isActive = activeStageKey === stage.key;
            return (
                <button
                    key={stage.key}
                    onClick={() => setActiveStageKey(stage.key)}
                    className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center space-y-2
                        ${isActive ? 'bg-brand-900 text-white border-brand-900 shadow-xl' : 
                          isDone ? 'bg-white text-green-600 border-green-100' : 
                          'bg-white text-slate-500 border-slate-100 hover:border-brand-900'}
                    `}
                >
                    <span className="text-[10px] font-black uppercase tracking-tighter leading-tight">{stage.label.split('.')[1]}</span>
                    {isDone ? <CheckCircle2 size={18} /> : <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-brand-400 animate-pulse' : 'bg-current'}`} />}
                </button>
            );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-8 bg-white rounded-[3rem] shadow-xl border border-slate-50 overflow-hidden flex flex-col relative ${!canEdit ? 'opacity-90' : ''}`}>
            {!canEdit && (
              <div className="absolute top-0 right-0 p-8 z-20">
                 <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl border border-amber-100 text-[9px] font-black uppercase tracking-widest flex items-center shadow-sm">
                   <ShieldAlert size={14} className="mr-2" /> {isQuote ? 'Cotización' : 'Solo lectura'}
                 </div>
              </div>
            )}

            <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest">{ALL_STAGES.find(s => s.key === activeStageKey)?.label}</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">{ALL_STAGES.find(s => s.key === activeStageKey)?.description}</p>
                </div>
                {canEdit && !isCompleted && (
                  <button 
                    onClick={handleSavePartial}
                    disabled={saveStatus !== 'idle'}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md ${
                      saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-white text-brand-900 hover:bg-slate-50 border border-slate-100'
                    }`}
                  >
                    {saveStatus === 'saving' ? <Loader2 size={12} className="animate-spin" /> : saveStatus === 'saved' ? <CheckCircle2 size={12} /> : <Save size={12} />}
                    <span>{saveStatus === 'saved' ? 'Guardado' : 'Guardar Progreso'}</span>
                  </button>
                )}
            </div>

            <div className={`p-10 space-y-12 ${!canEdit ? 'pointer-events-none' : ''}`}>
                <section>
                    <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] mb-6">Checklist de Salida/Entrada</h4>
                    <div className="space-y-3">
                        {order.items.map(item => {
                            const check = tempStageData?.itemChecks[item.id] || { verified: false, notes: '' };
                            return (
                                <div key={item.id} className={`flex items-center p-4 rounded-2xl border transition-all ${check.verified ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <input 
                                        type="checkbox"
                                        disabled={isCompleted || !canEdit}
                                        checked={check.verified}
                                        onChange={(e) => handleItemCheck(item.id, e.target.checked)}
                                        className={`w-6 h-6 rounded-lg text-brand-900 focus:ring-0 ${!canEdit ? 'opacity-50 grayscale' : ''}`}
                                    />
                                    <div className="ml-4 flex-1">
                                      <p className="text-[11px] font-black text-slate-900 uppercase">{item.name}</p>
                                      <p className="text-[9px] font-bold text-slate-400">Cantidad: {item.quantity}</p>
                                    </div>
                                    <input 
                                        type="text" 
                                        disabled={isCompleted || !canEdit}
                                        value={check.notes}
                                        onChange={(e) => handleItemNote(item.id, e.target.value)}
                                        placeholder="Nota..."
                                        className={`ml-4 bg-white/50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold outline-none ${!canEdit ? 'placeholder:text-slate-300' : ''}`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em]">Notas y Bitácora de la Etapa</h4>
                      <div className="flex space-x-3">
                        {canEdit && !isCompleted && apiKey && (
                          <button 
                            onClick={professionalizeNote}
                            disabled={!tempStageData?.generalNotes || isAiProcessing}
                            className="text-[9px] font-black text-brand-500 uppercase flex items-center space-x-2"
                          >
                            {isAiProcessing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            <span>Absolute AI: Corregir</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Historial de Notas Interno de la Etapa */}
                    {tempStageData?.notesHistory && tempStageData.notesHistory.length > 0 && (
                      <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar p-1">
                        {tempStageData.notesHistory.map((note, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-100 p-5 rounded-[2rem] relative group animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="flex justify-between items-start mb-2">
                               <div className="flex items-center space-x-2">
                                  <div className="w-5 h-5 bg-brand-900 text-white rounded-lg flex items-center justify-center text-[8px] font-black uppercase">
                                    {note.userName.charAt(0)}
                                  </div>
                                  <span className="text-[9px] font-black text-brand-900 uppercase">{note.userName}</span>
                               </div>
                               <span className="text-[8px] font-black text-slate-400 uppercase flex items-center">
                                 <Clock size={8} className="mr-1" /> {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">"{note.text}"</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isCompleted && canEdit && (
                      <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Comentarios adicionales / Notas de campo</label>
                        <textarea 
                            value={tempStageData?.generalNotes || ''}
                            onChange={(e) => handleGeneralNotesChange(e.target.value)}
                            placeholder="Ingrese aquí notas sobre el estado de los equipos, incidencias en sitio o detalles del despacho..."
                            className="w-full min-h-[140px] bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-sm font-bold text-slate-700 outline-none transition-all resize-none focus:border-brand-900"
                        />
                        <div className="flex justify-end">
                           <button 
                            onClick={handleAddNoteToHistory}
                            disabled={!tempStageData?.generalNotes?.trim()}
                            className="bg-brand-50 text-brand-900 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-brand-100 hover:bg-brand-900 hover:text-white transition-all disabled:opacity-30 flex items-center space-x-2"
                           >
                             <Send size={12} />
                             <span>Adjuntar Nota a la Bitácora</span>
                           </button>
                        </div>
                      </div>
                    )}
                    {isCompleted && tempStageData?.generalNotes && (
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                            <p className="text-[11px] font-medium text-slate-600 italic">"{tempStageData.generalNotes}"</p>
                        </div>
                    )}
                </section>

                <section className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4 text-center md:text-left">
                        <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em]">Responsable Logística</h4>
                        {tempStageData?.signature ? (
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 inline-block w-full">
                                <img src={tempStageData.signature.dataUrl} className="h-20 mix-blend-multiply mx-auto" alt="" />
                                <p className="text-[10px] font-black text-slate-900 uppercase mt-3">{tempStageData.signature.name}</p>
                            </div>
                        ) : (
                            !isCompleted && canEdit && (
                                <button onClick={() => setActiveSigningField('signature')} className="w-full h-40 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 hover:text-brand-900 hover:border-brand-900 transition-all">
                                    <PenTool size={24} className="mb-2" />
                                    <span className="text-[9px] font-black uppercase">Firmar Autorización</span>
                                </button>
                            )
                        )}
                        {!tempStageData?.signature && !canEdit && (
                          <div className="w-full h-40 border-2 border-dashed border-slate-100 rounded-[2rem] flex items-center justify-center text-slate-200">
                             <span className="text-[9px] font-black uppercase">Sin firma registrada</span>
                          </div>
                        )}
                    </div>

                    {showReceivedBy && (
                        <div className="space-y-4 text-center md:text-left">
                            <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em]">Recibido de Conforme</h4>
                            {tempStageData?.receivedBy ? (
                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 inline-block w-full">
                                    <img src={tempStageData.receivedBy.dataUrl} className="h-20 mix-blend-multiply mx-auto" alt="" />
                                    <p className="text-[10px] font-black text-slate-900 uppercase mt-3">{tempStageData.receivedBy.name}</p>
                                </div>
                            ) : (
                                !isCompleted && canEdit && (
                                    <button onClick={() => setActiveSigningField('receivedBy')} className="w-full h-40 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 hover:text-brand-900 hover:border-brand-900 transition-all">
                                        <PenTool size={24} className="mb-2" />
                                        <span className="text-[9px] font-black uppercase">Capturar Recibido</span>
                                    </button>
                                )
                            )}
                            {!tempStageData?.receivedBy && !canEdit && (
                              <div className="w-full h-40 border-2 border-dashed border-slate-100 rounded-[2rem] flex items-center justify-center text-slate-200">
                                 <span className="text-[9px] font-black uppercase">Sin firma registrada</span>
                              </div>
                            )}
                        </div>
                    )}
                </section>
                
                {!isCompleted && canEdit && (
                    <button 
                        onClick={handleCompleteStage}
                        className="w-full py-6 bg-brand-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all"
                    >
                        <span>Finalizar Etapa y Notificar</span>
                    </button>
                )}
            </div>
        </div>

        <div className="lg:col-span-4">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden sticky top-6">
                <div className="p-6 bg-brand-900 text-white">
                  <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center">
                    <History size={16} className="mr-2 text-brand-400" /> Resumen de Etapas
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  {visibleStages.map(s => {
                    const data = order.workflow[s.key];
                    const hasNotes = (data.notesHistory && data.notesHistory.length > 0);
                    if (!hasNotes && data.status !== 'completed') return null;
                    
                    return (
                      <div key={s.key} className="relative pl-6 pb-4 border-l-2 border-slate-100 last:border-0">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${data.status === 'completed' ? 'bg-green-500 border-green-200' : 'bg-white border-brand-900'}`} />
                        <p className="text-[9px] font-black text-brand-900 uppercase leading-none">{s.label.split('.')[1]}</p>
                        
                        <div className="space-y-2 mt-3">
                          {data.notesHistory && data.notesHistory.map((n, i) => (
                            <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                               <p className="text-[9px] font-bold text-slate-600 leading-snug">"{n.text}"</p>
                               <span className="text-[7px] font-black text-slate-400 uppercase block mt-1">{new Date(n.timestamp).toLocaleDateString()}</span>
                            </div>
                          ))}
                          {(!data.notesHistory || data.notesHistory.length === 0) && data.status === 'completed' && (
                            <p className="text-[9px] font-bold text-slate-400 italic">Completado sin observaciones.</p>
                          )}
                        </div>
                      </div>
                    );
                  }).reverse().filter(x => x !== null).length === 0 && (
                    <p className="text-center py-10 text-[9px] font-black uppercase text-slate-300">Sin actividad registrada</p>
                  )}
                </div>
            </div>
        </div>
      </div>

      {activeSigningField && canEdit && (
          <div className="fixed inset-0 z-[110] bg-brand-900/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full animate-in zoom-in duration-300 overflow-hidden">
                  <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="text-xs font-black text-brand-900 uppercase">Validación de Firma</h3>
                      <button onClick={() => { setActiveSigningField(null); setSignatureSuccess(null); }} className="p-2">
                        <X size={20} className="text-slate-400" />
                      </button>
                  </div>
                  <div className="p-10">
                      {signatureSuccess && (
                          <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-[10px] font-black uppercase text-center border border-emerald-100">
                             {signatureSuccess}
                          </div>
                      )}
                      <SignaturePad 
                          label={activeSigningField === 'signature' ? 'Entrega Autorizada' : 'Recibido de Conforme'} 
                          onSave={(sig) => saveSignature(activeSigningField, sig)}
                          onCancel={() => setActiveSigningField(null)}
                      />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
