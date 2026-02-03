
import React, { useState, useEffect, useMemo } from 'react';
import { Order, WorkflowStageKey, StageData, Signature, User } from '../types';
import { Check, PenTool, Camera, Upload, X, MessageSquare, Map as MapIcon, Navigation, Ruler, Clock, CreditCard, Info, ArrowRight, CheckCircle2, Zap, History, Loader2, Sparkles, ShieldAlert, UserCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { SignaturePad } from './SignaturePad';
import { GoogleGenAI } from "@google/genai";

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
  const order = orders.find(o => o.id === id);
  
  // Filtrar etapas según el rol del usuario (Cliente solo ve hasta la etapa 4, Admin ve todas)
  const visibleStages = useMemo(() => {
    return currentUser.role === 'user' ? ALL_STAGES.slice(0, 4) : ALL_STAGES;
  }, [currentUser.role]);

  // Definir quién puede editar: Solo roles operativos. Admin y User son lectura.
  const canEdit = useMemo(() => {
    const operationalRoles = ['logistics', 'coordinator', 'operations_manager'];
    return operationalRoles.includes(currentUser.role);
  }, [currentUser.role]);

  const assignedCoord = useMemo(() => {
    return users.find(u => u.email === order?.assignedCoordinatorEmail);
  }, [users, order]);

  const [activeStageKey, setActiveStageKey] = useState<WorkflowStageKey>('bodega_check');
  const [tempStageData, setTempStageData] = useState<StageData | null>(null);
  const [activeSigningField, setActiveSigningField] = useState<'signature' | 'receivedBy' | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [signatureSuccess, setSignatureSuccess] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  useEffect(() => {
    if (order && order.workflow) {
      const data = order.workflow[activeStageKey];
      setTempStageData(data ? JSON.parse(JSON.stringify(data)) : null);
      setActiveSigningField(null);
      setSignatureSuccess(null);
    }
  }, [order, activeStageKey]);

  if (!order || !order.workflow) {
    return <div className="p-8 text-center text-gray-500 font-black uppercase">Pedido no encontrado</div>;
  }

  const isCompleted = order.workflow[activeStageKey]?.status === 'completed';

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

  const professionalizeNote = async () => {
    if (!tempStageData?.generalNotes || !canEdit || isAiProcessing) return;
    
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Actúa como un supervisor logístico senior de ABSOLUTE COMPANY. 
      Transforma la siguiente nota técnica informal en un reporte profesional, ejecutivo y conciso para el historial del evento. 
      Nota original: "${tempStageData.generalNotes}"
      Responde solo con el texto profesionalizado.`;

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

  const saveSignature = (field: 'signature' | 'receivedBy', sig: Signature) => {
    if (!tempStageData || !canEdit) return;
    setSignatureSuccess(`Firma de ${sig.name} guardada correctamente.`);
    const updatedData = { ...tempStageData, [field]: sig };
    setTempStageData(updatedData);
    setTimeout(() => {
      setActiveSigningField(null);
      setSignatureSuccess(null);
    }, 1500);
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

  const showReceivedBy = ['coord_to_client', 'client_to_coord', 'coord_to_bodega'].includes(activeStageKey);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-start">
             <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] block">Módulo de Seguimiento Logístico</span>
                  {currentUser.role === 'admin' && (
                    <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center">
                      <ShieldAlert size={10} className="mr-1" /> Auditoría - Solo Lectura
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-black text-brand-900 uppercase leading-none">{order.destinationLocation}</h1>
                <div className="flex flex-wrap items-center text-slate-400 font-bold text-[11px] mt-4 uppercase gap-y-2">
                  <span className="bg-slate-100 px-3 py-1 rounded-full mr-4 tracking-widest border border-slate-200">Ref: {order.id}</span>
                  <div className="flex items-center mr-6">
                    <Navigation size={12} className="mr-2" /> Ruta: Bogotá → {order.destinationLocation}
                  </div>
                  {assignedCoord && (
                    <div className="flex items-center bg-brand-50 text-brand-900 px-4 py-1 rounded-full border border-brand-100">
                      <UserCheck size={12} className="mr-2" /> Responsable en Campo: {assignedCoord.name}
                    </div>
                  )}
                </div>
             </div>
             <div className="text-right">
                <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase border shadow-sm inline-block
                  ${order.status === 'Finalizado' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-brand-50 text-brand-900 border-brand-100'}
                `}>{order.status}</span>
                <button onClick={() => setShowMap(!showMap)} className="block w-full mt-4 text-[9px] font-black text-brand-500 uppercase tracking-widest hover:text-brand-900 transition-colors">
                  {showMap ? 'Cerrar Mapa' : 'Consultar Ruta'}
                </button>
             </div>
        </div>
      </div>

      {showMap && (
        <div className="h-80 bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl animate-in zoom-in duration-500">
           <iframe
                title="Logistics Route"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps/embed/v1/directions?key=${process.env.API_KEY}&origin=Bogota&destination=${encodeURIComponent(order.destinationLocation)}&mode=driving`}
           ></iframe>
        </div>
      )}

      {/* Selector de Etapas - Filtrado por Rol */}
      <div className={`grid gap-3 ${currentUser.role === 'user' ? 'grid-cols-4' : 'grid-cols-2 md:grid-cols-5'}`}>
        {visibleStages.map((stage, idx) => {
            const stageData = order.workflow[stage.key];
            const isDone = stageData?.status === 'completed';
            const isActive = activeStageKey === stage.key;
            const prevStageKey = idx > 0 ? ALL_STAGES[idx-1].key : null;
            const isPrevDone = prevStageKey ? order.workflow[prevStageKey]?.status === 'completed' : true;
            const isDisabled = !isPrevDone && !isDone;

            return (
                <button
                    key={stage.key}
                    onClick={() => !isDisabled && setActiveStageKey(stage.key)}
                    disabled={isDisabled}
                    className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center space-y-2
                        ${isActive ? 'bg-brand-900 text-white border-brand-900 shadow-xl scale-[1.05] z-10' : 
                          isDone ? 'bg-white text-green-600 border-green-100' : 
                          isDisabled ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed opacity-50' : 
                          'bg-white text-slate-500 border-slate-100 hover:border-brand-900 hover:text-brand-900'}
                    `}
                >
                    <span className="text-[10px] font-black uppercase tracking-tighter leading-tight">{stage.label.split('.')[1]}</span>
                    {isDone ? <CheckCircle2 size={18} /> : <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-brand-400 animate-pulse' : 'bg-current'}`} />}
                </button>
            );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-[3rem] shadow-xl border border-slate-50 overflow-hidden flex flex-col relative">
            {/* Overlay de solo lectura para admin */}
            {!canEdit && currentUser.role === 'admin' && (
              <div className="absolute top-0 right-0 p-8 z-20">
                 <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl border border-amber-100 text-[9px] font-black uppercase tracking-widest flex items-center shadow-sm">
                   <ShieldAlert size={14} className="mr-2" /> Solo lectura para Admin
                 </div>
              </div>
            )}

            <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest">{ALL_STAGES.find(s => s.key === activeStageKey)?.label}</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">{ALL_STAGES.find(s => s.key === activeStageKey)?.description}</p>
                </div>
                {isCompleted && <span className="px-4 py-1.5 bg-green-500 text-white text-[9px] font-black rounded-full uppercase">Completado</span>}
            </div>

            <div className="p-10 space-y-12">
                <section>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center">
                        <Check size={14} className="mr-2" /> Checklist de Salida/Entrada
                      </h4>
                    </div>
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
                                        className="w-6 h-6 rounded-lg text-brand-900 border-slate-300 focus:ring-brand-900 disabled:opacity-50"
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
                                        placeholder={canEdit ? "Nota técnica..." : "-"}
                                        className="ml-4 bg-white/50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-brand-900 min-w-[200px] disabled:opacity-50"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center">
                        <MessageSquare size={14} className="mr-2" /> Observaciones de la Etapa
                      </h4>
                      {canEdit && !isCompleted && (
                        <button 
                          onClick={professionalizeNote}
                          disabled={!tempStageData?.generalNotes || isAiProcessing}
                          className="flex items-center space-x-2 text-[9px] font-black text-brand-500 uppercase hover:text-brand-900 transition-all disabled:opacity-30"
                        >
                          {isAiProcessing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          <span>Absolute AI: Profesionalizar Reporte</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <textarea 
                          disabled={isCompleted || !canEdit}
                          value={tempStageData?.generalNotes || ''}
                          onChange={(e) => handleGeneralNotesChange(e.target.value)}
                          placeholder={canEdit ? "Escribe aquí los detalles logísticos, novedades o incidentes..." : "Sin observaciones registradas."}
                          className="w-full min-h-[140px] bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-brand-900/5 focus:border-brand-900 outline-none transition-all resize-none disabled:bg-white"
                      />
                      {isAiProcessing && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-[2rem] flex items-center justify-center">
                           <div className="bg-brand-900 text-white px-6 py-3 rounded-2xl flex items-center space-x-3 shadow-2xl">
                              <Loader2 size={18} className="animate-spin" />
                              <span className="text-[10px] font-black uppercase tracking-widest">IA Procesando Reporte...</span>
                           </div>
                        </div>
                      )}
                    </div>
                </section>

                <section className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center">
                          <PenTool size={14} className="mr-2" /> Responsable {activeStageKey.includes('bodega') ? 'Bodega' : 'Coordinador'}
                        </h4>
                        {tempStageData?.signature ? (
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                <img src={tempStageData.signature.dataUrl} className="h-20 mix-blend-multiply opacity-80 mb-4 mx-auto" alt="" />
                                <div className="text-center">
                                  <p className="text-[10px] font-black text-slate-900 uppercase">{tempStageData.signature.name}</p>
                                  <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{tempStageData.signature.location}</p>
                                </div>
                            </div>
                        ) : (
                            !isCompleted && canEdit && (
                                <button onClick={() => setActiveSigningField('signature')} className="w-full h-40 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 hover:text-brand-900 hover:border-brand-900 hover:bg-slate-50 transition-all">
                                    <PenTool size={24} className="mb-2" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Capturar Firma Autorizada</span>
                                </button>
                            )
                        )}
                        {!isCompleted && !canEdit && !tempStageData?.signature && (
                          <div className="w-full h-40 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 opacity-50">
                              <PenTool size={24} className="mb-2" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Firma pendiente</span>
                          </div>
                        )}
                    </div>

                    {showReceivedBy && (
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center">
                              <PenTool size={14} className="mr-2" /> Recibido Conforme
                            </h4>
                            {tempStageData?.receivedBy ? (
                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                    <img src={tempStageData.receivedBy.dataUrl} className="h-20 mix-blend-multiply opacity-80 mb-4 mx-auto" alt="" />
                                    <div className="text-center">
                                      <p className="text-[10px] font-black text-slate-900 uppercase">{tempStageData.receivedBy.name}</p>
                                      <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{tempStageData.receivedBy.location}</p>
                                    </div>
                                </div>
                            ) : (
                                !isCompleted && canEdit && (
                                    <button onClick={() => setActiveSigningField('receivedBy')} className="w-full h-40 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 hover:text-brand-900 hover:border-brand-900 hover:bg-slate-50 transition-all">
                                        <PenTool size={24} className="mb-2" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Capturar Firma Receptor</span>
                                    </button>
                                )
                            )}
                            {!isCompleted && !canEdit && !tempStageData?.receivedBy && (
                              <div className="w-full h-40 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 opacity-50">
                                  <PenTool size={24} className="mb-2" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Firma pendiente</span>
                              </div>
                            )}
                        </div>
                    )}
                </section>
                
                {!isCompleted && canEdit && (
                    <div className="pt-10 border-t border-slate-50">
                        <button 
                            onClick={handleCompleteStage}
                            className="w-full py-6 bg-brand-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-brand-900/40 hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center space-x-3"
                        >
                            <Check size={18} />
                            <span>Validar y Finalizar Etapa</span>
                        </button>
                    </div>
                )}
            </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 bg-brand-900 text-white flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center">
                    <History size={16} className="mr-2 text-brand-400" /> Historial de Novedades
                  </h3>
                  <Zap size={14} className="text-brand-400 animate-pulse" />
                </div>
                <div className="p-6 space-y-6">
                  {visibleStages.map(s => {
                    const data = order.workflow[s.key];
                    if (!data.generalNotes && data.status !== 'completed') return null;
                    return (
                      <div key={s.key} className="relative pl-6 pb-2 border-l-2 border-slate-100 last:border-0">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-brand-900 flex items-center justify-center">
                          <div className={`w-1.5 h-1.5 rounded-full ${data.status === 'completed' ? 'bg-green-500' : 'bg-slate-200'}`} />
                        </div>
                        <p className="text-[9px] font-black text-brand-900 uppercase tracking-tighter">{s.label.split('.')[1]}</p>
                        <div className="mt-2 p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">
                            {data.generalNotes || "Sin observaciones registradas."}
                          </p>
                          {data.timestamp && (
                            <p className="text-[8px] font-black text-slate-300 uppercase mt-3 flex items-center">
                              <Clock size={10} className="mr-1" /> {new Date(data.timestamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }).reverse().filter(x => x !== null).length === 0 && (
                    <div className="text-center py-10 opacity-30">
                       <MessageSquare size={24} className="mx-auto mb-2" />
                       <p className="text-[9px] font-black uppercase">Sin historial previo</p>
                    </div>
                  )}
                </div>
            </div>

            <div className="bg-brand-50 rounded-[2.5rem] p-8 border border-brand-100 border-b-4 border-b-brand-200">
               <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] mb-4 flex items-center">
                  <Info size={16} className="mr-2" /> Status Operativo
               </h4>
               <ul className="space-y-3">
                  <li className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-white">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Artículos Cargados</span>
                    <span className="text-xs font-black text-brand-900">{order.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                  </li>
                  <li className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-white">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Fotos Evidencia</span>
                    <span className="text-xs font-black text-brand-900">{tempStageData?.photos?.length || 0}</span>
                  </li>
               </ul>
            </div>
        </div>
      </div>

      {activeSigningField && canEdit && (
          <div className="fixed inset-0 z-[110] bg-brand-900/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in duration-300">
                  <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest">Validación de Firma</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Garantía de cumplimiento ABSOLUTE</p>
                      </div>
                      <button onClick={() => { setActiveSigningField(null); setSignatureSuccess(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                      </button>
                  </div>
                  <div className="p-10 relative">
                      {signatureSuccess && (
                          <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95">
                              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mb-6 shadow-xl shadow-green-200">
                                <Check size={32} />
                              </div>
                              <h4 className="text-lg font-black text-brand-900 uppercase mb-2">¡Firma Registrada!</h4>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">El sistema se está actualizando...</p>
                          </div>
                      )}
                      <SignaturePad 
                          label={activeSigningField === 'signature' ? 'Entrega Autorizada' : 'Recibido de Conformidad'} 
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
