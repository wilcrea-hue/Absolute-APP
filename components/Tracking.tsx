
// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Order, WorkflowStageKey, StageData, Signature, User, NoteEntry, CartItem } from '../types';
import { Check, PenTool, Camera, Upload, X, MessageSquare, Map as MapIcon, Navigation, Ruler, Clock, CreditCard, Info, ArrowRight, CheckCircle2, Zap, History, Loader2, Sparkles, ShieldAlert, UserCheck, AlertTriangle, FileText, ExternalLink, MapPin as MapPinIcon, Send, Calendar, Save, Eye, List, Package, Printer, FileCheck, Edit3, StickyNote, Phone, User as UserIcon, ShieldCheck, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const order = orders.find(o => o.id === id);
  const apiKey = process.env.API_KEY;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeStageKey, setActiveStageKey] = useState<WorkflowStageKey>('bodega_check');
  const [tempStageData, setTempStageData] = useState<StageData | null>(null);
  const [activeSigningField, setActiveSigningField] = useState<'signature' | 'receivedBy' | null>(null);
  const [showItems, setShowItems] = useState(false);
  const [showFormalDoc, setShowFormalDoc] = useState(false);
  const [signatureSuccess, setSignatureSuccess] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const visibleStages = useMemo(() => {
    return currentUser.role === 'user' ? ALL_STAGES.slice(0, 4) : ALL_STAGES;
  }, [currentUser.role]);

  // HERENCIA DE FIRMA: Si estamos en etapa 2, la firma responsable es la de la etapa 1
  const inheritedSignature = useMemo(() => {
    if (activeStageKey === 'bodega_to_coord' && order?.workflow?.bodega_check?.signature) {
      return order.workflow.bodega_check.signature;
    }
    return null;
  }, [activeStageKey, order?.workflow]);

  const canEdit = useMemo(() => {
    if (currentUser.role === 'admin' || currentUser.role === 'operations_manager') return true;
    if (order?.status === 'Cotización') return false;

    if (currentUser.role === 'logistics') {
      // Logística solo edita su verificación y retornos. NO PASO 2.
      return activeStageKey === 'bodega_check' || activeStageKey === 'coord_to_bodega';
    }
    
    if (currentUser.role === 'coordinator') {
      // Coordinadores editan desde el paso 2 (recibir de bodega) hasta el paso 4
      return activeStageKey === 'bodega_to_coord' || activeStageKey === 'coord_to_client' || activeStageKey === 'client_to_coord';
    }

    return false;
  }, [currentUser.role, order?.status, activeStageKey]);

  const assignedCoord = useMemo(() => {
    return users.find(u => u.email === order?.assignedCoordinatorEmail);
  }, [users, order]);

  const clientUser = useMemo(() => {
    return users.find(u => u.email === order?.userEmail);
  }, [users, order]);

  useEffect(() => {
    if (order && order.workflow) {
      const data = order.workflow[activeStageKey];
      setTempStageData(data ? JSON.parse(JSON.stringify(data)) : null);
      setActiveSigningField(null);
      setSignatureSuccess(null);
      setSaveStatus('idle');
    }
  }, [order, activeStageKey]);

  const isCompleted = order?.workflow[activeStageKey]?.status === 'completed';

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

  const handleGeneralNotesChange = (notes: string) => {
    if (!tempStageData || !canEdit || isCompleted) return;
    setTempStageData({ ...tempStageData, generalNotes: notes });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !tempStageData || isCompleted || !canEdit) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setTempStageData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            photos: [...(prev.photos || []), base64]
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    if (!tempStageData || isCompleted || !canEdit) return;
    const newPhotos = [...tempStageData.photos];
    newPhotos.splice(index, 1);
    setTempStageData({ ...tempStageData, photos: newPhotos });
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
    const updatedData: StageData = { ...tempStageData, notesHistory: updatedHistory, generalNotes: '' };
    setTempStageData(updatedData);
    onUpdateStage(order.id, activeStageKey, updatedData);
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
    const hasDispatcherSignature = tempStageData.signature || inheritedSignature;
    if (!hasDispatcherSignature) {
        alert("Falta la firma de 'Entregado por / Autorizado'.");
        return;
    }
    if (['bodega_to_coord', 'coord_to_client', 'client_to_coord', 'coord_to_bodega'].includes(activeStageKey) && !tempStageData.receivedBy) {
        alert("Falta la firma de 'Recibido de Conforme'.");
        return;
    }
    const finalData: StageData = {
        ...tempStageData,
        signature: tempStageData.signature || inheritedSignature || undefined,
        status: 'completed',
        timestamp: new Date().toISOString()
    };
    onUpdateStage(order.id, activeStageKey, finalData);
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    return Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const eventDays = order ? calculateDays(order.startDate, order.endDate) : 1;

  if (!order || !order.workflow) return <div className="p-8 text-center text-gray-500 font-black uppercase">Pedido no encontrado</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {order.status === 'Cotización' && (
        <div className="bg-amber-50 border border-amber-200 p-8 rounded-[2rem] text-center space-y-4">
           <AlertTriangle size={32} className="mx-auto text-amber-500" />
           <h3 className="text-sm font-black text-amber-900 uppercase">Documento en Estado de Cotización</h3>
           <p className="text-xs font-bold text-amber-700">El seguimiento logístico se habilitará una vez la reserva sea confirmada.</p>
        </div>
      )}

      {order.status !== 'Cotización' && (
        <>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                 <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Seguimiento Logístico</span>
                      {currentUser.role === 'admin' && <span className="bg-purple-100 text-purple-800 text-[8px] font-black px-2 py-0.5 rounded-lg border border-purple-200 uppercase tracking-widest flex items-center"><Eye size={10} className="mr-1" /> Auditoría</span>}
                    </div>
                    <h1 className="text-3xl font-black text-brand-900 uppercase leading-none">{order.destinationLocation}</h1>
                    <div className="flex flex-wrap items-center text-slate-400 font-bold text-[11px] mt-4 uppercase gap-y-2">
                      <span className="bg-slate-100 px-3 py-1 rounded-full mr-4 tracking-widest border border-slate-200">Ref: {order.id}</span>
                      {assignedCoord && <div className="flex items-center bg-brand-50 text-brand-900 px-4 py-1 rounded-full border border-brand-100"><UserCheck size={12} className="mr-2" /> {assignedCoord.name}</div>}
                    </div>
                 </div>
                 <div className="flex flex-col items-end space-y-3 min-w-[150px]">
                    <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase border shadow-sm ${order.status === 'Finalizado' ? 'bg-green-50 text-green-700' : 'bg-brand-50 text-brand-900'}`}>{order.status}</span>
                    <button onClick={() => setShowItems(!showItems)} className={`text-[9px] font-black uppercase tracking-widest transition-all px-4 py-2 rounded-xl flex items-center space-x-2 border shadow-sm ${showItems ? 'bg-brand-900 text-white border-brand-900' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}><List size={14} /> <span>{showItems ? 'Ocultar Detalle' : 'Ver Detalle Ítems'}</span></button>
                 </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {visibleStages.map((stage) => {
                const stageData = order.workflow[stage.key];
                const isDone = stageData?.status === 'completed';
                const isActive = activeStageKey === stage.key;
                return (
                    <button key={stage.key} onClick={() => setActiveStageKey(stage.key)} className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center space-y-2 ${isActive ? 'bg-brand-900 text-white border-brand-900 shadow-xl scale-105 z-10' : isDone ? 'bg-white text-green-600 border-green-100 opacity-60' : 'bg-white text-slate-500 border-slate-100 hover:border-brand-900'}`}>
                        <span className="text-[9px] font-black uppercase tracking-tighter leading-tight text-center">{stage.label.split('.')[1]}</span>
                        {isDone ? <CheckCircle2 size={16} /> : <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-brand-400 animate-pulse' : 'bg-current opacity-20'}`} />}
                    </button>
                );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className={`lg:col-span-8 bg-white rounded-[3rem] shadow-xl border border-slate-50 overflow-hidden flex flex-col relative ${!canEdit ? 'bg-slate-50/30' : ''}`}>
                <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest">{ALL_STAGES.find(s => s.key === activeStageKey)?.label}</h3>
                      <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">{ALL_STAGES.find(s => s.key === activeStageKey)?.description}</p>
                    </div>
                    {canEdit && !isCompleted && (
                      <button onClick={handleSavePartial} disabled={saveStatus !== 'idle'} className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-white text-brand-900 hover:bg-slate-50 border border-slate-100'}`}>
                        {saveStatus === 'saving' ? <Loader2 size={12} className="animate-spin" /> : saveStatus === 'saved' ? <CheckCircle2 size={12} /> : <Save size={12} />}
                        <span>{saveStatus === 'saved' ? 'Notas Guardadas' : 'Guardar Progreso'}</span>
                      </button>
                    )}
                </div>

                <div className={`p-10 space-y-12 ${!canEdit ? 'opacity-80' : ''}`}>
                    {!canEdit && !isCompleted && (
                      <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center space-x-3 text-red-600 mb-4 animate-in fade-in">
                        <ShieldAlert size={20} />
                        <p className="text-[10px] font-black uppercase tracking-tight">Acceso Restringido: Su rol no permite realizar modificaciones en esta etapa.</p>
                      </div>
                    )}

                    <section>
                        <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] mb-6 flex items-center"><FileCheck size={14} className="mr-2 text-brand-500" /> Checklist de Verificación</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {order.items.map(item => {
                                const check = tempStageData?.itemChecks[item.id] || { verified: false, notes: '' };
                                return (
                                    <div key={item.id} className={`flex items-center p-4 rounded-2xl border transition-all ${check.verified ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <input type="checkbox" disabled={isCompleted || !canEdit} checked={check.verified} onChange={(e) => handleItemCheck(item.id, e.target.checked)} className="w-6 h-6 rounded-lg text-brand-900 focus:ring-0" />
                                        <div className="ml-4 flex-1">
                                          <p className="text-[10px] font-black text-slate-900 uppercase leading-tight">{item.name}</p>
                                          <p className="text-[8px] font-bold text-slate-400 mt-1">Cantidad: {item.quantity}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* NUEVA SECCIÓN DE EVIDENCIA FOTOGRÁFICA */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                           <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center"><ImageIcon size={14} className="mr-2 text-brand-500" /> Evidencia de Estado (Fotos)</h4>
                           {canEdit && !isCompleted && (
                             <button onClick={() => fileInputRef.current?.click()} className="text-[9px] font-black uppercase text-brand-900 flex items-center bg-white px-4 py-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all shadow-sm">
                               <Camera size={14} className="mr-2" /> Capturar Foto
                             </button>
                           )}
                           <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" capture="environment" className="hidden" multiple />
                        </div>
                        
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                           {tempStageData?.photos?.map((photo, idx) => (
                             <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                               <img src={photo} className="w-full h-full object-cover" alt="Evidencia" />
                               {canEdit && !isCompleted && (
                                 <button onClick={() => removePhoto(idx)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"><Trash2 size={10} /></button>
                               )}
                             </div>
                           ))}
                           {(!tempStageData?.photos || tempStageData.photos.length === 0) && (
                             <div className="col-span-full py-10 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                                <ImageIcon size={24} className="mb-2" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Sin evidencias visuales registradas</span>
                             </div>
                           )}
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center"><StickyNote size={14} className="mr-2 text-brand-500" /> Notas de la Etapa</h4>
                        </div>
                        <div className="space-y-3">
                          <textarea value={tempStageData?.generalNotes || ''} readOnly={isCompleted || !canEdit} onChange={(e) => handleGeneralNotesChange(e.target.value)} placeholder="Observaciones técnicas, daños previos o notas de entrega..." className={`w-full min-h-[120px] border-2 rounded-[2rem] p-6 text-sm font-medium leading-relaxed outline-none transition-all resize-none shadow-inner ${isCompleted || !canEdit ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-brand-900 focus:bg-white'}`} />
                          {canEdit && !isCompleted && (
                            <div className="flex justify-end">
                               <button onClick={handleAddNoteToHistory} disabled={!tempStageData?.generalNotes?.trim()} className="bg-white text-slate-400 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border border-slate-100 hover:bg-brand-900 hover:text-white transition-all disabled:opacity-30 flex items-center space-x-2"><History size={12} /> <span>Archivar en Bitácora</span></button>
                            </div>
                          )}
                        </div>
                    </section>

                    <section className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center"><PenTool size={14} className="mr-2 text-brand-500" /> Firma Responsable / Despacho</h4>
                            {(tempStageData?.signature || inheritedSignature) ? (
                                <div className={`p-6 rounded-[2rem] border inline-block w-full text-center relative group transition-all ${inheritedSignature && !tempStageData?.signature ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                                    {inheritedSignature && !tempStageData?.signature && (
                                      <div className="absolute top-4 left-4 flex items-center space-x-1.5 bg-blue-600 text-white px-3 py-1 rounded-full shadow-lg z-20"><ShieldCheck size={10} /><span className="text-[7px] font-black uppercase leading-none">Validado en Bodega</span></div>
                                    )}
                                    <img src={(tempStageData?.signature || inheritedSignature).dataUrl} className="h-20 mix-blend-multiply mx-auto" alt="" />
                                    <p className="text-[10px] font-black text-slate-900 uppercase mt-3">{(tempStageData?.signature || inheritedSignature).name}</p>
                                    <p className="text-[8px] font-bold text-slate-400">{(tempStageData?.signature || inheritedSignature).location}</p>
                                    {!isCompleted && canEdit && tempStageData?.signature && (
                                      <button onClick={() => setTempStageData({...tempStageData, signature: undefined})} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                    )}
                                </div>
                            ) : (
                                !isCompleted && canEdit && (
                                    <button onClick={() => setActiveSigningField('signature')} className="w-full h-40 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 hover:text-brand-900 hover:border-brand-900 transition-all bg-slate-50/30 group">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-900 group-hover:text-white transition-all"><PenTool size={20} /></div>
                                        <span className="text-[9px] font-black uppercase">Registrar Firma de Despacho</span>
                                    </button>
                                )
                            )}
                        </div>

                        {['bodega_to_coord', 'coord_to_client', 'client_to_coord', 'coord_to_bodega'].includes(activeStageKey) && (
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center"><PenTool size={14} className="mr-2 text-emerald-500" /> Firma de Recibido / Conforme</h4>
                            {tempStageData?.receivedBy ? (
                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 inline-block w-full text-center relative group">
                                    <img src={tempStageData.receivedBy.dataUrl} className="h-20 mix-blend-multiply mx-auto" alt="" />
                                    <p className="text-[10px] font-black text-slate-900 uppercase mt-3">{tempStageData.receivedBy.name}</p>
                                    <p className="text-[8px] font-bold text-slate-400">{tempStageData.receivedBy.location}</p>
                                    {!isCompleted && canEdit && (
                                      <button onClick={() => setTempStageData({...tempStageData, receivedBy: undefined})} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                    )}
                                </div>
                            ) : (
                                !isCompleted && canEdit && (
                                    <button onClick={() => setActiveSigningField('receivedBy')} className="w-full h-40 border-2 border-dashed border-emerald-100 rounded-[2rem] flex flex-col items-center justify-center text-emerald-200 hover:text-emerald-600 hover:border-emerald-600 transition-all bg-emerald-50/10 shadow-inner group">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm"><PenTool size={20} /></div>
                                        <span className="text-[9px] font-black uppercase text-emerald-600">Firmar Recibido de Conforme</span>
                                        <p className="text-[7px] font-bold text-emerald-400 mt-1 uppercase tracking-tighter">({activeStageKey === 'bodega_to_coord' ? 'Coordinador Encargado' : 'Cliente Final'})</p>
                                    </button>
                                )
                            )}
                          </div>
                        )}
                    </section>
                    
                    {!isCompleted && canEdit && (
                        <button onClick={handleCompleteStage} className="w-full py-6 bg-brand-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center space-x-3 group active:scale-[0.98]">
                            <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                            <span>Cerrar y Finalizar Etapa Actual</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-widest mb-6 flex items-center"><Info size={14} className="mr-2" /> Resumen Logístico</h4>
                  <div className="space-y-4 mb-8">
                     {assignedCoord && <div className="p-4 bg-[#4fb7f7]/5 rounded-2xl border border-[#4fb7f7]/20"><p className="text-[8px] font-black text-[#4fb7f7] uppercase tracking-widest mb-2 flex items-center"><UserCheck size={10} className="mr-1.5" /> Coordinador Responsable</p><p className="text-[11px] font-black text-brand-900 uppercase leading-tight">{assignedCoord.name}</p><p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center"><Phone size={10} className="mr-1.5 opacity-50" /> {assignedCoord.phone}</p></div>}
                     {clientUser && <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center"><UserIcon size={10} className="mr-1.5" /> Cliente / Evento</p><p className="text-[11px] font-black text-brand-900 uppercase leading-tight">{clientUser.name}</p><p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center"><Phone size={10} className="mr-1.5 opacity-50" /> {clientUser.phone}</p></div>}
                  </div>
                  <div className="space-y-4">
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Punto de Origen</p><p className="text-[11px] font-black text-brand-900 uppercase truncate">{order.originLocation || 'Bodega Central Absolute'}</p></div>
                     <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100"><p className="text-[8px] font-black text-brand-500 uppercase mb-1">Destino del Evento</p><p className="text-[11px] font-black text-brand-900 uppercase truncate">{order.destinationLocation}</p></div>
                     <div className="grid grid-cols-2 gap-3"><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Fecha Inicio</p><p className="text-[11px] font-black text-brand-900">{new Date(order.startDate).toLocaleDateString()}</p></div><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Fecha Retorno</p><p className="text-[11px] font-black text-brand-900">{new Date(order.endDate).toLocaleDateString()}</p></div></div>
                  </div>
               </div>
            </div>
          </div>
        </>
      )}

      {activeSigningField && canEdit && (
          <div className="fixed inset-0 z-[400] bg-brand-900/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full animate-in zoom-in duration-300 overflow-hidden">
                  <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="text-xs font-black text-brand-900 uppercase">Firma Digital Validada</h3>
                      <button onClick={() => setActiveSigningField(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
                  </div>
                  <div className="p-10">
                      <SignaturePad label={activeSigningField === 'signature' ? 'Responsable Despacho / Autorizado' : 'Receptor Responsable / Recibido'} onSave={(sig) => saveSignature(activeSigningField, sig)} onCancel={() => setActiveSigningField(null)} />
                  </div>
              </div>
          </div>
      )}

      {signatureSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[500] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom-10 duration-500">
           <CheckCircle2 size={20} />
           <span className="text-[10px] font-black uppercase tracking-widest">{signatureSuccess}</span>
        </div>
      )}
    </div>
  );
};
