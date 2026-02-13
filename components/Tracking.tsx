
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
  const notesEndRef = useRef<HTMLDivElement>(null);

  const [activeStageKey, setActiveStageKey] = useState<WorkflowStageKey>('bodega_check');
  const [tempStageData, setTempStageData] = useState<StageData | null>(null);
  const [activeSigningField, setActiveSigningField] = useState<'signature' | 'receivedBy' | null>(null);
  const [showItems, setShowItems] = useState(false);
  const [signatureSuccess, setSignatureSuccess] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isCompressing, setIsCompressing] = useState(false);
  const [newNote, setNewNote] = useState('');
  
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
      return activeStageKey === 'bodega_check' || activeStageKey === 'coord_to_bodega';
    }
    
    if (currentUser.role === 'coordinator') {
      return activeStageKey === 'bodega_to_coord' || activeStageKey === 'coord_to_client' || activeStageKey === 'client_to_coord';
    }

    return false;
  }, [currentUser.role, order?.status, activeStageKey]);

  useEffect(() => {
    if (order && order.workflow) {
      const data = order.workflow[activeStageKey];
      // Cargar datos existentes de la etapa
      setTempStageData(data ? JSON.parse(JSON.stringify(data)) : { itemChecks: {}, photos: [], files: [], notesHistory: [] });
      setActiveSigningField(null);
      setSignatureSuccess(null);
      setSaveStatus('idle');
      setNewNote('');
    }
  }, [order, activeStageKey]);

  // Auto-scroll al final de las notas cuando cambian
  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tempStageData?.notesHistory]);

  const isCompleted = order?.workflow[activeStageKey]?.status === 'completed';

  // Compresión optimizada para ahorro masivo de espacio en localStorage
  const compressImage = (base64Str: string, quality = 0.5, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Usar JPEG 0.5 para evidencias ahorra un 80-90% de espacio
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !tempStageData || isCompleted || !canEdit) return;

    setIsCompressing(true);
    try {
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsDataURL(file);
        });
        const compressed = await compressImage(base64);
        setTempStageData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            photos: [...(prev.photos || []), compressed]
          };
        });
      }
    } catch (err) {
      console.error("Error al procesar foto:", err);
    } finally {
      setIsCompressing(false);
    }
  };

  const removePhoto = (index: number) => {
    if (!tempStageData || isCompleted || !canEdit) return;
    const newPhotos = [...tempStageData.photos];
    newPhotos.splice(index, 1);
    setTempStageData({ ...tempStageData, photos: newPhotos });
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !tempStageData || isCompleted || !canEdit) return;
    
    const noteEntry: NoteEntry = {
      text: newNote.trim(),
      timestamp: new Date().toISOString(),
      userEmail: currentUser.email,
      userName: currentUser.name
    };

    setTempStageData({
      ...tempStageData,
      notesHistory: [...(tempStageData.notesHistory || []), noteEntry]
    });
    setNewNote('');
  };

  const handleSavePartial = () => {
    if (!tempStageData || !canEdit || isCompleted) return;
    setSaveStatus('saving');
    try {
      onUpdateStage(order.id, activeStageKey, tempStageData);
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 300);
    } catch (e) {
      alert("Error al guardar: Posiblemente se agotó el espacio de almacenamiento. Intente borrar fotos innecesarias.");
      setSaveStatus('idle');
    }
  };

  const saveSignature = (field: 'signature' | 'receivedBy' | null, sig: Signature) => {
    if (!tempStageData || !canEdit || !field) return;
    setSignatureSuccess(`Firma capturada.`);
    const updatedData = { ...tempStageData, [field]: sig };
    setTempStageData(updatedData);
    
    // Auto-guardado al firmar para evitar pérdida por cierre accidental
    onUpdateStage(order.id, activeStageKey, updatedData);

    setTimeout(() => {
      setActiveSigningField(null);
      setSignatureSuccess(null);
    }, 1000);
  };

  const handleCompleteStage = () => {
    if (!tempStageData || !canEdit) return;
    
    const hasDispatcherSignature = tempStageData.signature || inheritedSignature;
    if (!hasDispatcherSignature) {
        alert("Falta firma de Despacho.");
        return;
    }
    
    if (['bodega_to_coord', 'coord_to_client', 'client_to_coord', 'coord_to_bodega'].includes(activeStageKey) && !tempStageData.receivedBy) {
        alert("Falta firma de Recibido.");
        return;
    }

    const finalData: StageData = {
        ...tempStageData,
        signature: tempStageData.signature || (inheritedSignature ? { ...inheritedSignature } : undefined),
        status: 'completed',
        timestamp: new Date().toISOString()
    };
    onUpdateStage(order.id, activeStageKey, finalData);
  };

  if (!order || !order.workflow) return <div className="p-8 text-center text-gray-500 font-black uppercase">Pedido no encontrado</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
             <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Gestión de Flujo Logístico</span>
                </div>
                <h1 className="text-3xl font-black text-brand-900 uppercase leading-none">{order.destinationLocation}</h1>
                <div className="flex flex-wrap items-center text-slate-400 font-bold text-[11px] mt-4 uppercase gap-y-2">
                  <span className="bg-slate-100 px-3 py-1 rounded-full mr-4 tracking-widest border border-slate-200">Ref: {order.id}</span>
                </div>
             </div>
             <div className="flex flex-col items-end space-y-3 min-w-[150px]">
                <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase border shadow-sm ${order.status === 'Finalizado' ? 'bg-green-50 text-green-700' : 'bg-brand-50 text-brand-900'}`}>{order.status}</span>
             </div>
        </div>
      </div>

      {order.status === 'Cotización' ? (
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-500">
           <div className="p-12 flex flex-col items-center text-center space-y-8">
              <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center text-amber-500 shadow-inner border border-amber-100">
                <FileText size={48} />
              </div>
              <div className="max-w-xl space-y-4">
                <h2 className="text-2xl font-black text-brand-900 uppercase tracking-tighter">Propuesta en Estado de Cotización</h2>
                <p className="text-slate-500 text-sm font-medium">Esta reserva aún no ha sido confirmada. Revise los ítems y las fechas antes de pasar el pedido al departamento de producción y logística.</p>
              </div>
              
              <div className="w-full max-w-2xl bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Resumen de Inversión</h4>
                <div className="flex justify-between items-end border-b border-slate-200 pb-4 mb-4">
                   <div className="text-left">
                      <p className="text-[9px] font-black text-brand-900 uppercase">Total Estimado</p>
                      <p className="text-3xl font-black text-brand-900">${order.totalAmount.toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Items</p>
                      <p className="text-sm font-black text-slate-700">{order.items.length} Referencias</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 text-slate-500">
                    <Calendar size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{new Date(order.startDate).toLocaleDateString()} al {new Date(order.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-500 justify-end">
                    <MapPinIcon size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[150px]">{order.destinationLocation}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                 <button 
                  onClick={() => onConfirmQuote?.(order.id)}
                  className="flex-1 py-5 bg-brand-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand-900/40 hover:bg-black transition-all active:scale-95 flex items-center justify-center space-x-2"
                 >
                   <CheckCircle2 size={18} />
                   <span>Confirmar Pedido</span>
                 </button>
                 <button 
                  onClick={() => navigate('/')}
                  className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all flex items-center justify-center space-x-2"
                 >
                   <span>Editar Items</span>
                 </button>
              </div>
           </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ALL_STAGES.map((stage) => {
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
                    </div>
                    {canEdit && !isCompleted && (
                      <button onClick={handleSavePartial} disabled={saveStatus !== 'idle'} className="flex items-center space-x-2 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-white text-brand-900 border border-slate-100 shadow-md">
                        {saveStatus === 'saving' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        <span>{saveStatus === 'saved' ? 'Guardado' : 'Guardar Progreso'}</span>
                      </button>
                    )}
                </div>

                <div className={`p-10 space-y-12 ${!canEdit ? 'opacity-80' : ''}`}>
                    {!canEdit && !isCompleted && (
                      <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center space-x-3 text-red-600 mb-4">
                        <ShieldAlert size={20} />
                        <p className="text-[10px] font-black uppercase tracking-tight">Acceso de solo lectura para esta etapa.</p>
                      </div>
                    )}

                    <section>
                        <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] mb-6 flex items-center"><FileCheck size={14} className="mr-2 text-brand-500" /> Verificación de Ítems</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {order.items.map(item => {
                                const check = tempStageData?.itemChecks?.[item.id] || { verified: false, notes: '' };
                                return (
                                    <div key={item.id} className={`flex items-center p-4 rounded-2xl border transition-all ${check.verified ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <input type="checkbox" disabled={isCompleted || !canEdit} checked={check.verified} onChange={(e) => handleItemCheck(item.id, e.target.checked)} className="w-6 h-6 rounded-lg text-brand-900 focus:ring-0" />
                                        <div className="ml-4 flex-1">
                                          <p className="text-[10px] font-black text-slate-900 uppercase leading-tight">{item.name}</p>
                                          <p className="text-[8px] font-bold text-slate-400 mt-1">Uds: {item.quantity}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                           <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center"><ImageIcon size={14} className="mr-2 text-brand-500" /> Registro Fotográfico</h4>
                           {canEdit && !isCompleted && (
                             <button onClick={() => fileInputRef.current?.click()} disabled={isCompressing} className="text-[9px] font-black uppercase text-brand-900 flex items-center bg-white px-4 py-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all shadow-sm">
                               {isCompressing ? <Loader2 size={14} className="animate-spin mr-2" /> : <Camera size={14} className="mr-2" />}
                               Añadir Foto
                             </button>
                           )}
                           <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" capture="environment" className="hidden" multiple />
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
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
                                <span className="text-[9px] font-black uppercase tracking-widest">Sin registro visual aún</span>
                             </div>
                           )}
                        </div>
                    </section>

                    {/* SECCIÓN DE NOTAS / BITÁCORA */}
                    <section className="space-y-6">
                        <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center"><StickyNote size={14} className="mr-2 text-brand-500" /> Bitácora de Observaciones</h4>
                        
                        <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] overflow-hidden flex flex-col">
                            <div className="max-h-[300px] overflow-y-auto p-6 space-y-4 no-scrollbar bg-white/50">
                                {tempStageData?.notesHistory && tempStageData.notesHistory.length > 0 ? (
                                    tempStageData.notesHistory.map((note, idx) => (
                                        <div key={idx} className={`flex flex-col space-y-1 ${note.userEmail === currentUser.email ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center space-x-2 px-2">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{note.userName}</span>
                                                <span className="text-[7px] font-bold text-slate-300">{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] font-bold shadow-sm ${note.userEmail === currentUser.email ? 'bg-brand-900 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'}`}>
                                                {note.text}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-10 text-center flex flex-col items-center justify-center space-y-2 text-slate-300">
                                        <MessageSquare size={24} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">No hay notas registradas en esta etapa</span>
                                    </div>
                                )}
                                <div ref={notesEndRef} />
                            </div>

                            {!isCompleted && canEdit && (
                                <div className="p-4 bg-white border-t border-slate-100 flex items-center space-x-3">
                                    <textarea 
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Escribe una observación relevante..."
                                        className="flex-1 bg-slate-50 border-0 rounded-2xl px-5 py-3 text-xs font-bold focus:ring-2 focus:ring-brand-900 transition-all outline-none resize-none no-scrollbar h-[48px]"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddNote();
                                          }
                                        }}
                                    />
                                    <button 
                                        onClick={handleAddNote}
                                        disabled={!newNote.trim()}
                                        className="p-3 bg-brand-900 text-white rounded-xl shadow-lg hover:scale-110 active:scale-90 transition-all disabled:opacity-20"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center"><PenTool size={14} className="mr-2 text-brand-500" /> Firma Despacho</h4>
                            {(tempStageData?.signature || inheritedSignature) ? (
                                <div className={`p-6 rounded-[2rem] border w-full text-center relative group transition-all ${inheritedSignature && !tempStageData?.signature ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                                    {inheritedSignature && !tempStageData?.signature && (
                                      <div className="absolute top-4 left-4 flex items-center space-x-1.5 bg-brand-900 text-white px-3 py-1 rounded-full shadow-lg z-20"><ShieldCheck size={10} /><span className="text-[7px] font-black uppercase leading-none">Copia de Bodega</span></div>
                                    )}
                                    <img src={(tempStageData?.signature || inheritedSignature).dataUrl} className="h-24 mix-blend-multiply mx-auto object-contain" alt="" />
                                    <p className="text-[11px] font-black text-slate-900 uppercase mt-3">{(tempStageData?.signature || inheritedSignature).name}</p>
                                    
                                    {(tempStageData?.signature || inheritedSignature).evidencePhoto && (
                                      <div className="mt-4 pt-4 border-t border-slate-200/50">
                                         <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Evidencia:</p>
                                         <img src={(tempStageData?.signature || inheritedSignature).evidencePhoto} className="w-full h-32 object-cover rounded-xl shadow-sm" alt="Evidencia" />
                                      </div>
                                    )}
                                    {!isCompleted && canEdit && tempStageData?.signature && (
                                      <button onClick={() => setTempStageData({...tempStageData, signature: undefined})} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                    )}
                                </div>
                            ) : (
                                !isCompleted && canEdit && (
                                    <button onClick={() => setActiveSigningField('signature')} className="w-full h-40 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 hover:text-brand-900 hover:border-brand-900 transition-all bg-slate-50/30 group">
                                        <PenTool size={24} className="mb-2" />
                                        <span className="text-[9px] font-black uppercase">Firma Responsable</span>
                                    </button>
                                )
                            )}
                        </div>

                        {['bodega_to_coord', 'coord_to_client', 'client_to_coord', 'coord_to_bodega'].includes(activeStageKey) && (
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em] flex items-center"><PenTool size={14} className="mr-2 text-emerald-500" /> Firma Recibido</h4>
                            {tempStageData?.receivedBy ? (
                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 w-full text-center relative group">
                                    <img src={tempStageData.receivedBy.dataUrl} className="h-24 mix-blend-multiply mx-auto object-contain" alt="" />
                                    <p className="text-[11px] font-black text-slate-900 uppercase mt-3">{tempStageData.receivedBy.name}</p>
                                    {tempStageData.receivedBy.evidencePhoto && (
                                      <div className="mt-4 pt-4 border-t border-slate-200/50">
                                         <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Evidencia:</p>
                                         <img src={tempStageData.receivedBy.evidencePhoto} className="w-full h-32 object-cover rounded-xl shadow-sm" alt="Evidencia" />
                                      </div>
                                    )}
                                    {!isCompleted && canEdit && (
                                      <button onClick={() => setTempStageData({...tempStageData, receivedBy: undefined})} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                    )}
                                </div>
                            ) : (
                                !isCompleted && canEdit && (
                                    <button onClick={() => setActiveSigningField('receivedBy')} className="w-full h-40 border-2 border-dashed border-emerald-100 rounded-[2rem] flex flex-col items-center justify-center text-emerald-200 hover:text-emerald-600 hover:border-emerald-600 transition-all bg-emerald-50/10 shadow-inner group">
                                        <PenTool size={24} className="mb-2" />
                                        <span className="text-[9px] font-black uppercase text-emerald-600">Firma Conformidad</span>
                                    </button>
                                )
                            )}
                          </div>
                        )}
                    </section>
                    
                    {!isCompleted && canEdit && (
                        <button onClick={handleCompleteStage} className="w-full py-6 bg-brand-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center space-x-3 group active:scale-[0.98]">
                            <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                            <span>Finalizar Etapa y Cerrar Turno</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-widest mb-6 flex items-center"><Info size={14} className="mr-2" /> Resumen Logístico</h4>
                  <div className="space-y-4">
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Destino Final</p><p className="text-[11px] font-black text-brand-900 uppercase truncate">{order.destinationLocation}</p></div>
                     <div className="grid grid-cols-2 gap-3"><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Inicio</p><p className="text-[11px] font-black text-brand-900">{new Date(order.startDate).toLocaleDateString()}</p></div><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Retorno</p><p className="text-[11px] font-black text-brand-900">{new Date(order.endDate).toLocaleDateString()}</p></div></div>
                  </div>
               </div>
            </div>
          </div>
        </>
      )}

      {activeSigningField && canEdit && (
          <div className="fixed inset-0 z-[400] bg-brand-900/95 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full animate-in zoom-in duration-300 overflow-hidden">
                  <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.3em]">Captura de Registro Validado</h3>
                      <button onClick={() => setActiveSigningField(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
                  </div>
                  <div className="p-10 overflow-y-auto max-h-[80vh]">
                      <SignaturePad label={activeSigningField === 'signature' ? 'Registro de Despachador' : 'Registro de Receptor'} onSave={(sig) => saveSignature(activeSigningField, sig)} onCancel={() => setActiveSigningField(null)} />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
