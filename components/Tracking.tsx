
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Order, WorkflowStageKey, StageData, Signature, User, NoteEntry, CartItem } from '../types';
import { Check, PenTool, Camera, Upload, X, MessageSquare, Map as MapIcon, Navigation, Ruler, Clock, CreditCard, Info, ArrowRight, CheckCircle2, Zap, History, Loader2, Sparkles, ShieldAlert, UserCheck, AlertTriangle, FileText, ExternalLink, MapPin as MapPinIcon, Send, Calendar, Save, Eye, List, Package, Printer, FileCheck, Edit3 } from 'lucide-react';
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

  const [activeStageKey, setActiveStageKey] = useState<WorkflowStageKey>('bodega_check');
  const [tempStageData, setTempStageData] = useState<StageData | null>(null);
  const [activeSigningField, setActiveSigningField] = useState<'signature' | 'receivedBy' | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [showFormalDoc, setShowFormalDoc] = useState(false);
  const [signatureSuccess, setSignatureSuccess] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const visibleStages = useMemo(() => {
    return currentUser.role === 'user' ? ALL_STAGES.slice(0, 4) : ALL_STAGES;
  }, [currentUser.role]);

  const canEdit = useMemo(() => {
    if (currentUser.role === 'admin') return false;
    if (order?.status === 'Cotización') return false;

    if (currentUser.role === 'logistics') {
      return activeStageKey === 'bodega_check' || activeStageKey === 'bodega_to_coord' || activeStageKey === 'coord_to_bodega';
    }
    
    if (currentUser.role === 'coordinator') {
      return activeStageKey === 'coord_to_client' || activeStageKey === 'client_to_coord';
    }

    if (currentUser.role === 'operations_manager') return true;

    return false;
  }, [currentUser.role, order?.status, activeStageKey]);

  const assignedCoord = useMemo(() => {
    return users.find(u => u.email === order?.assignedCoordinatorEmail);
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
  const isPending = order.status === 'Pendiente';

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
      const prompt = `Actúa como un supervisor logístico senior de ABSOLUTE COMPANY. Transforma la siguiente nota técnica informal en un reporte profesional y elegante. Nota original: "${tempStageData.generalNotes}"`
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
    if (['bodega_to_coord', 'coord_to_client', 'client_to_coord', 'coord_to_bodega'].includes(activeStageKey) && !tempStageData.receivedBy) {
        alert("Falta la firma de 'Recibido de Conforme'.");
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

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    return Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const eventDays = order ? calculateDays(order.startDate, order.endDate) : 1;
  const showReceivedBy = ['bodega_to_coord', 'coord_to_client', 'client_to_coord', 'coord_to_bodega'].includes(activeStageKey);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {isQuote && (
        <div className="animate-in fade-in duration-700">
           {showFormalDoc ? (
             <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in duration-500">
                <div className="p-8 border-b flex items-center justify-between bg-slate-50">
                  <h3 className="text-xs font-black text-brand-900 uppercase">Previsualización de Documento</h3>
                  <button onClick={() => setShowFormalDoc(false)} className="p-2 bg-white rounded-full border border-slate-200"><X size={20} className="text-slate-400" /></button>
                </div>
                <div className="p-10 md:p-16 space-y-12">
                   <div className="flex justify-between items-center border-b border-slate-100 pb-8">
                      <img src={LOGO_URL} className="h-10 opacity-90" alt="ABSOLUTE" />
                      <div className="text-right">
                         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Cotización Oficial</h3>
                         <p className="text-xl font-black text-brand-900 uppercase tracking-tighter">COT-{order.id.split('-')[1]}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-widest border-b border-slate-200 pb-2">Información del Evento</h4>
                         <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                               <MapPinIcon size={14} className="text-[#4fb7f7]" />
                               <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Destino / Lugar</p>
                                  <p className="text-[12px] font-black text-brand-900 uppercase">{order.destinationLocation}</p>
                               </div>
                            </div>
                            <div className="flex items-center space-x-3">
                               <Calendar size={14} className="text-[#4fb7f7]" />
                               <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Duración del Evento</p>
                                  <p className="text-[12px] font-black text-brand-900 uppercase">{new Date(order.startDate).toLocaleDateString()} al {new Date(order.endDate).toLocaleDateString()} ({eventDays} días)</p>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-widest border-b border-slate-200 pb-2">Cliente / Solicitante</h4>
                         <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                               <UserCheck size={14} className="text-[#4fb7f7]" />
                               <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Representante</p>
                                  <p className="text-[12px] font-black text-brand-900 uppercase">{currentUser.name}</p>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-widest border-b border-slate-200 pb-2">Desglose Técnico (Valores fuera de IVA)</h4>
                      <div className="overflow-hidden border border-slate-100 rounded-2xl">
                         <table className="w-full text-left">
                            <thead className="bg-slate-50">
                               <tr>
                                  <th className="p-4 text-[8px] font-black text-slate-400 uppercase">Descripción Ítem</th>
                                  <th className="p-4 text-[8px] font-black text-slate-400 uppercase text-center">Cant.</th>
                                  <th className="p-4 text-[8px] font-black text-slate-400 uppercase text-right">Subtotal</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                               {order.items.map((item, idx) => (
                                  <tr key={idx}>
                                     <td className="p-4">
                                        <p className="text-[11px] font-black text-brand-900 uppercase">{item.name}</p>
                                     </td>
                                     <td className="p-4 text-center text-sm font-black text-brand-900">x{item.quantity}</td>
                                     <td className="p-4 text-right text-sm font-black text-brand-900">${(item.priceRent * item.quantity * eventDays).toLocaleString()}</td>
                                  </tr>
                               ))}
                            </tbody>
                            <tfoot className="bg-slate-50/50">
                               <tr>
                                  <td colSpan={2} className="p-6 text-right font-black text-[9px] text-slate-400 uppercase">Inversión Total Estimada (Antes de IVA)</td>
                                  <td className="p-6 text-right text-2xl font-black text-[#4fb7f7]">${order.totalAmount.toLocaleString()}</td>
                               </tr>
                            </tfoot>
                         </table>
                      </div>
                   </div>
                   <button onClick={() => window.print()} className="w-full py-4 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2"><Printer size={16} /> <span>Imprimir Cotización</span></button>
                </div>
             </div>
           ) : (
             <div className="bg-[#0c0c2a] text-white rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
                
                <div className="p-10 border-b border-white/5 flex items-center justify-between bg-black/40">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 bg-brand-400/10 rounded-2xl flex items-center justify-center text-brand-400 border border-brand-400/20 shadow-lg">
                      <FileText size={32} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-400/60 block mb-1">Editor Administrativo de Despacho</span>
                      <h3 className="text-2xl font-black uppercase tracking-widest text-white leading-none">Cotización Registrada</h3>
                    </div>
                  </div>
                  <button onClick={() => navigate('/orders')} className="p-3 text-white/30 hover:text-white transition-colors bg-white/5 rounded-full border border-white/10 group">
                    <X size={24} className="group-hover:rotate-90 transition-transform" />
                  </button>
                </div>

                <div className="p-10 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10 hover:bg-white/[0.08] transition-all">
                      <p className="text-[10px] text-white/40 font-black uppercase mb-2 tracking-[0.2em]">Enviar A:</p>
                      <p className="text-sm font-bold text-white/90 truncate">{order.userEmail}</p>
                    </div>
                    <div className="bg-[#4fb7f7]/10 rounded-3xl p-6 border border-[#4fb7f7]/20 hover:bg-[#4fb7f7]/15 transition-all">
                      <p className="text-[10px] text-[#4fb7f7] font-black uppercase mb-2 tracking-[0.2em]">Copia de Respaldo:</p>
                      <p className="text-sm font-bold text-[#4fb7f7]">admin@absolutecompany.co</p>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-3xl p-6 border border-white/10 hover:bg-white/[0.08] transition-all">
                    <p className="text-[10px] text-white/40 font-black uppercase mb-2 tracking-[0.2em]">Asunto:</p>
                    <p className="text-sm font-black text-white">ABSOLUTE: Nueva Cotización: {order.id}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">Cuerpo del Mensaje (Editable)</p>
                      <button className="text-[10px] font-black uppercase flex items-center space-x-2 bg-[#4fb7f7]/10 text-[#4fb7f7] px-4 py-2 rounded-xl border border-[#4fb7f7]/20 hover:bg-[#4fb7f7] hover:text-white transition-all group">
                        <Edit3 size={14} /> 
                        <span>Editar</span>
                      </button>
                    </div>
                    <div className="bg-black/40 rounded-[2.5rem] border border-white/10 p-10 min-h-[220px] shadow-inner">
                      <p className="text-[14px] font-medium text-white/80 leading-relaxed">
                        Estimado usuario, se ha registrado una actividad importante en su cuenta relacionada con la generación de un documento de cotización para el evento en <span className="text-[#4fb7f7] font-black uppercase">{order.destinationLocation}</span>.
                      </p>
                      <p className="text-[14px] font-medium text-white/80 leading-relaxed mt-4">
                        Por favor revise su panel en la aplicación para conocer todos los detalles de inversión, ítems y políticas comerciales.
                      </p>
                    </div>
                    <p className="text-[10px] text-amber-400 font-bold uppercase italic tracking-widest">* La tabla de ítems, las políticas y los valores fuera de IVA se generarán automáticamente en el envío final.</p>
                  </div>
                </div>

                <div className="p-10 bg-black/40 border-t border-white/5 flex flex-col md:flex-row gap-6">
                  <button 
                    onClick={() => setShowFormalDoc(true)}
                    className="flex-1 bg-white/5 text-white/70 py-6 rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center space-x-3 hover:bg-white/10 transition-all border border-white/5 active:scale-95 shadow-lg shadow-black/20"
                  >
                    <ExternalLink size={20} />
                    <span>Previsualizar</span>
                  </button>
                  {onConfirmQuote && currentUser.role === 'user' && (
                    <button 
                      onClick={() => onConfirmQuote(order.id)}
                      className="flex-[1.8] bg-[#4fb7f7] text-white py-6 rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center space-x-4 shadow-2xl shadow-[#4fb7f7]/20 hover:bg-white hover:text-[#4fb7f7] transition-all group active:scale-95"
                    >
                      <Send size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      <span>Autorizar Despacho</span>
                    </button>
                  )}
                </div>
             </div>
           )}
        </div>
      )}

      {!isQuote && (
        <>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                 <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Seguimiento Logístico</span>
                      {currentUser.role === 'admin' && (
                        <span className="bg-purple-100 text-purple-800 text-[8px] font-black px-2 py-0.5 rounded-lg border border-purple-200 uppercase tracking-widest flex items-center">
                          <Eye size={10} className="mr-1" /> Modo Auditoría
                        </span>
                      )}
                    </div>
                    <h1 className="text-3xl font-black text-brand-900 uppercase leading-none">{order.destinationLocation}</h1>
                    <div className="flex flex-wrap items-center text-slate-400 font-bold text-[11px] mt-4 uppercase gap-y-2">
                      <span className="bg-slate-100 px-3 py-1 rounded-full mr-4 tracking-widest border border-slate-200">Ref: {order.id}</span>
                      {assignedCoord && (
                        <div className="flex items-center bg-brand-50 text-brand-900 px-4 py-1 rounded-full border border-brand-100">
                          <UserCheck size={12} className="mr-2" /> Responsable Campo: {assignedCoord.name}
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
                      <button 
                        onClick={() => setShowItems(!showItems)} 
                        className={`text-[9px] font-black uppercase tracking-widest transition-all px-4 py-2 rounded-xl flex items-center space-x-2 border shadow-sm ${showItems ? 'bg-brand-900 text-white border-brand-900' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
                      >
                        <List size={14} />
                        <span>{showItems ? 'Cerrar Detalle' : 'Ver Detalle Ítems'}</span>
                      </button>
                      <button onClick={() => setShowMap(!showMap)} className="text-[9px] font-black text-brand-500 uppercase tracking-widest hover:text-brand-900 transition-colors bg-brand-50 px-4 py-2 rounded-xl">
                        {showMap ? 'Ocultar Mapa' : 'Ver Mapa Interactivo'}
                      </button>
                    </div>
                 </div>
            </div>
          </div>

          {(showItems || isPending) && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-brand-900 text-white rounded-xl flex items-center justify-center">
                     <Package size={20} />
                  </div>
                  <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest">Resumen del Pedido</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <img src={item.image} className="w-14 h-14 rounded-xl object-cover shadow-sm" alt="" />
                       <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-brand-900 uppercase truncate">{item.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.category}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[14px] font-black text-brand-900">x{item.quantity}</p>
                          <p className="text-[8px] font-black text-brand-400 uppercase">Cantidad</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

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
            <div className={`lg:col-span-8 bg-white rounded-[3rem] shadow-xl border border-slate-50 overflow-hidden flex flex-col relative ${!canEdit ? 'bg-slate-50/30' : ''}`}>
                {!canEdit && (
                  <div className="absolute top-0 right-0 p-8 z-20">
                     <div className={`px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest flex items-center shadow-sm ${currentUser.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                       <ShieldAlert size={14} className="mr-2" /> {currentUser.role === 'admin' ? 'Modo Auditoría: Solo Lectura' : 'Acceso Restringido'}
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
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em]">Notas y Bitácora de la Etapa</h4>
                        </div>

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
                                </div>
                                <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">"{note.text}"</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {!isCompleted && canEdit && (
                          <div className="space-y-3">
                            <textarea 
                                value={tempStageData?.generalNotes || ''}
                                onChange={(e) => handleGeneralNotesChange(e.target.value)}
                                placeholder="Notas de la etapa..."
                                className="w-full min-h-[140px] bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-sm font-bold text-slate-700 outline-none transition-all resize-none focus:border-brand-900"
                            />
                            <div className="flex justify-end">
                               <button 
                                onClick={handleAddNoteToHistory}
                                disabled={!tempStageData?.generalNotes?.trim()}
                                className="bg-brand-50 text-brand-900 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-brand-100 hover:bg-brand-900 hover:text-white transition-all disabled:opacity-30 flex items-center space-x-2"
                               >
                                 <Send size={12} />
                                 <span>Adjuntar Nota</span>
                               </button>
                            </div>
                          </div>
                        )}
                    </section>

                    <section className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-4 text-center md:text-left">
                            <h4 className="text-[10px] font-black text-brand-900 uppercase tracking-[0.2em]">Firma Responsable</h4>
                            {tempStageData?.signature ? (
                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 inline-block w-full text-center">
                                    <img src={tempStageData.signature.dataUrl} className="h-20 mix-blend-multiply mx-auto" alt="" />
                                    <p className="text-[10px] font-black text-slate-900 uppercase mt-3">{tempStageData.signature.name}</p>
                                </div>
                            ) : (
                                !isCompleted && canEdit && (
                                    <button onClick={() => setActiveSigningField('signature')} className="w-full h-40 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 hover:text-brand-900 hover:border-brand-900 transition-all">
                                        <PenTool size={24} className="mb-2" />
                                        <span className="text-[9px] font-black uppercase">Firmar</span>
                                    </button>
                                )
                            )}
                        </div>
                    </section>
                    
                    {!isCompleted && canEdit && (
                        <button 
                            onClick={handleCompleteStage}
                            className="w-full py-6 bg-brand-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all"
                        >
                            <span>Finalizar Etapa</span>
                        </button>
                    )}
                </div>
            </div>
          </div>
        </>
      )}

      {activeSigningField && canEdit && (
          <div className="fixed inset-0 z-[110] bg-brand-900/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full animate-in zoom-in duration-300 overflow-hidden">
                  <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="text-xs font-black text-brand-900 uppercase">Firma Digital</h3>
                      <button onClick={() => { setActiveSigningField(null); setSignatureSuccess(null); }} className="p-2">
                        <X size={20} className="text-slate-400" />
                      </button>
                  </div>
                  <div className="p-10">
                      <SignaturePad 
                          label={activeSigningField === 'signature' ? 'Responsable' : 'Recibido'} 
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
