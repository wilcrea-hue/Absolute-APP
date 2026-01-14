
import React, { useState } from 'react';
import { Shield, Scale, Lock, X, ChevronRight } from 'lucide-react';

export const Footer: React.FC = () => {
  const [showLegal, setShowLegal] = useState(false);

  return (
    <footer className="mt-auto pt-12 pb-8 px-6 border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setShowLegal(true)}
              className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-brand-900 transition-colors flex items-center"
            >
              <Scale size={12} className="mr-2" /> Aviso Legal
            </button>
            <button 
              onClick={() => setShowLegal(true)}
              className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-brand-900 transition-colors flex items-center"
            >
              <Lock size={12} className="mr-2" /> Privacidad
            </button>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              &copy; {new Date().getFullYear()} ABSOLUTE COMPANY &bull; LOGÍSTICA DE ALTO IMPACTO
            </p>
          </div>
        </div>
      </div>

      {/* Modal Aviso Legal */}
      {showLegal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-900/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-brand-900 text-white rounded-xl">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-brand-900 uppercase tracking-widest">Marco Legal y Privacidad</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Última actualización: Mayo 2024</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLegal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <section className="space-y-4">
                <h4 className="text-brand-900 font-black text-xs uppercase tracking-widest flex items-center">
                  <ChevronRight size={14} className="mr-1 text-brand-500" /> Términos y Condiciones de Uso
                </h4>
                <div className="text-xs text-gray-600 leading-relaxed space-y-3">
                  <p>
                    1. <strong>Uso de la Plataforma:</strong> El acceso a esta herramienta es exclusivo para personal autorizado de ABSOLUTE y sus clientes vinculados. Queda prohibida la reproducción total o parcial del código o estructura de datos.
                  </p>
                  <p>
                    2. <strong>Responsabilidad de Inventario:</strong> Los usuarios son responsables de la veracidad de los reportes de estado de los artículos. Cualquier daño o pérdida detectada fuera de los protocolos de verificación será responsabilidad del custodio asignado en dicha etapa.
                  </p>
                  <p>
                    3. <strong>Logística Nacional:</strong> Las rutas y tiempos de tránsito son estimaciones. ABSOLUTE no se hace responsable por retrasos derivados de fuerza mayor, cierres viales o condiciones climáticas extremas.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-brand-900 font-black text-xs uppercase tracking-widest flex items-center">
                  <ChevronRight size={14} className="mr-1 text-brand-500" /> Política de Tratamiento de Datos
                </h4>
                <div className="text-xs text-gray-600 leading-relaxed space-y-3">
                  <p>
                    De acuerdo con la <strong>Ley 1581 de 2012 (Colombia)</strong>, informamos que los datos capturados (firmas, fotografías de evidencia, geolocalización y correos electrónicos) tienen como finalidad exclusiva la gestión logística de eventos y el control de inventarios.
                  </p>
                  <p>
                    <strong>Finalidades específicas:</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1 italic">
                    <li>Validación de entrega y recepción de activos de la compañía.</li>
                    <li>Notificación automática de estados de pedido vía correo electrónico.</li>
                    <li>Auditoría interna de procesos operativos.</li>
                  </ul>
                  <p>
                    Los titulares de los datos pueden ejercer sus derechos de conocimiento, actualización y rectificación a través del canal de soporte oficial de ABSOLUTE.
                  </p>
                </div>
              </section>

              <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                <p className="text-[10px] text-brand-800 font-medium leading-relaxed italic">
                  * Al utilizar esta aplicación y firmar los formularios digitales, usted acepta expresamente estos términos y autoriza el tratamiento de sus datos personales para los fines logísticos aquí descritos.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setShowLegal(false)}
                className="bg-brand-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-800 transition-all shadow-lg active:scale-95"
              >
                Entendido y Acepto
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
