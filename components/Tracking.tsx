
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Order, WorkflowStageKey, StageData, Signature, User, NoteEntry } from '../types';
import { Check, PenTool, Camera, Upload, X, MessageSquare, Map as MapIcon, Navigation, Ruler, Clock, CreditCard, Info, ArrowRight, CheckCircle2, Zap, History, Loader2, Sparkles, ShieldAlert, UserCheck, AlertTriangle, FileText, ExternalLink, MapPin as MapPinIcon, Send, Calendar, Save, Eye, List, Package } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { SignaturePad } from './SignaturePad';
import { GoogleGenAI } from "@google/genai";
import { EmailNotification } from './EmailNotification';

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

  const [activeStageKey, setActiveStageKey] = useState<WorkflowStageKey>('bodega_check');
  const [tempStageData, setTempStageData] = useState<StageData | null>(null);
  const [activeSigningField, setActiveSigningField] = useState<'signature' | 'receivedBy' | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeEmail, setActiveEmail] = useState<any>(null);

  const canEdit = useMemo(() => {
    if (currentUser.role === 'admin') return false;
    if (order?.status === 'Cotización') return false;
    if (currentUser.role === 'logistics') return ['bodega_check', 'bodega_to_coord', 'coord_to_bodega'].includes(activeStageKey);
    if (currentUser.role === 'coordinator') return ['coord_to_client', 'client_to_coord'].includes(activeStageKey);
    return currentUser.role === 'operations_manager';
  }, [currentUser.role, order?.status, activeStageKey]);

  useEffect(() => {
    if (order && order.workflow) {
      const data = order.workflow[activeStageKey];
      setTempStageData(data ? JSON.parse(JSON.stringify(data)) : null);
    }
  }, [order, activeStageKey]);

  if (!order) return null;

  const isCompleted = order.workflow[activeStageKey]?.status === 'completed';

  const handleCompleteStage = () => {
    if (!tempStageData) return;
    
    // Abrir modal de correo antes de finalizar
    setActiveEmail({
      to: order.userEmail,
      cc: 'logistica@absolutecompany.co',
      subject: `Notificación de Estado: ${ALL_STAGES.find(s => s.key === activeStageKey)?.label}`,
      body: `Hola, le informamos que el pedido #${order.id} ha completado exitosamente la etapa: ${ALL_STAGES.find(s => s.key === activeStageKey)?.description}.\n\nAdjuntamos el detalle técnico de los ítems verificados.`,
      stage: ALL_STAGES.find(s => s.key === activeStageKey)?.label,
      order: order
    });
  };

  const finalizeAndSave = () => {
    const finalData = { ...tempStageData, status: 'completed', timestamp: new Date().toISOString() };
    onUpdateStage(order.id, activeStageKey, finalData);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* ... resto del UI igual ... */}
      
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50">
          {/* ... contenido de la etapa ... */}
          {!isCompleted && canEdit && (
              <button 
                  onClick={handleCompleteStage}
                  className="w-full py-6 bg-brand-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all"
              >
                  Finalizar Etapa y Notificar
              </button>
          )}
      </div>

      <EmailNotification 
        email={activeEmail} 
        onClose={() => setActiveEmail(null)} 
        onSentSuccess={finalizeAndSave}
      />
    </div>
  );
};
