import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Apple, Utensils, Download, Flame, ChevronRight, User, 
  Target, Clock, Info, Share2, PieChart, RefreshCw
} from 'lucide-react';
import { fetchDietas, fetchSettings } from '../lib/googleWorkspace';
import { Dieta, Settings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function PatientDiet() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [dieta, setDieta] = useState<Dieta | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [all, s] = await Promise.all([
          fetchDietas().catch(() => []), 
          fetchSettings().catch(() => null)
        ]);
        if (id) {
          const d = all.find(item => item.id === id);
          setDieta(d || null);
        }
        setSettings(s);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const calculateTotals = () => {
    if (!dieta) return { cal: 0, prot: 0, carb: 0, fat: 0 };
    let cal = 0, prot = 0, carb = 0, fat = 0;
    dieta.refeicoes.forEach(ref => {
      ref.itens.forEach(item => {
        if (item.macros) {
          cal += item.macros.cal;
          prot += item.macros.prot;
          carb += item.macros.carb;
          fat += item.macros.fat;
        }
      });
    });
    return { cal, prot, carb, fat };
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfbf6]">
      <div className="w-10 h-10 border-4 border-[#869471]/20 border-t-[#869471] rounded-full animate-spin" />
    </div>
  );

  if (!dieta) return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center text-slate-500 bg-[#fdfbf6]">
      <div className="max-w-xs space-y-6">
        <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-center mx-auto">
          <Utensils className="w-10 h-10 text-slate-200" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Plano Não Encontrado</h2>
        <p className="text-sm font-medium leading-relaxed">Verifique se o link está correto ou peça um novo para sua nutricionista.</p>
      </div>
    </div>
  );

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-[#fdfbf6] selection:bg-[#869471]/10 selection:text-[#869471] pb-20">
      {/* Header Fixo */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[#869471] rounded-xl overflow-hidden flex items-center justify-center text-white font-black shadow-lg shadow-[#869471]/20">
               {settings?.personUrl ? <img src={settings.personUrl} className="w-full h-full object-cover" /> : 'P'}
             </div>
             <div>
               <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter leading-tight">{settings?.brandName || 'Plano Alimentar'}</h4>
               <p className="text-[10px] font-bold text-[#869471] uppercase tracking-widest">{dieta.pacienteNome}</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="p-2.5 bg-[#869471] text-white rounded-xl shadow-lg shadow-[#869471]/20 hover:scale-105 transition-all">
               <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-12">
        {/* Banner de Apresentação */}
        <section className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Apple className="w-48 h-48 -rotate-12" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2 text-[#869471] font-black text-[10px] uppercase tracking-[0.2em]">
               <Target className="w-4 h-4" /> FOCO EM {dieta.objetivo.toUpperCase()}
            </div>
            <h1 className="text-4xl font-black text-slate-800 leading-tight tracking-tight">
               {dieta.titulo}
            </h1>
            <div className="flex flex-wrap gap-8 pt-6 border-t border-slate-50">
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Início do Ciclo</p>
                 <p className="font-bold text-slate-700">{format(new Date(dieta.dataCriacao), 'dd/MM/yyyy')}</p>
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aporte Diário</p>
                 <p className="font-bold text-[#869471]">{totals.cal.toFixed(0)} kcal/dia</p>
               </div>
            </div>
          </div>
        </section>

        {/* Lista de Refeições Animada */}
        <div className="space-y-16">
          {dieta.refeicoes.map((ref, idx) => (
            <motion.section 
              key={ref.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex items-end justify-between px-4">
                <div className="flex items-center gap-6">
                   <span className="text-6xl font-black text-[#869471]/10">0{idx + 1}</span>
                   <div>
                     <h2 className="text-2xl font-black text-slate-800 mb-1">{ref.nome}</h2>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Clock className="w-3 h-3" /> PLANEJE SEU HORÁRIO
                     </p>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {ref.itens.map((item, iIdx) => (
                  <div key={iIdx} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-50 flex gap-6 hover:shadow-xl transition-all group">
                    <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                      {item.imagem ? (
                        <img src={item.imagem} alt={item.nome} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <Utensils className="w-6 h-6 text-slate-200" />
                      )}
                    </div>
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                         <h3 className="text-xl font-black text-slate-800 leading-tight mb-1 truncate">{item.nome}</h3>
                         <div className="flex items-center gap-4">
                           <span className="text-[#869471] font-black text-xs uppercase tracking-tighter">{item.quantidade}</span>
                           {item.macros && (
                              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{item.macros.cal} kcal</span>
                           )}
                         </div>
                         <button 
                           onClick={async () => {
                              const prompt = `Sugira 3 substitutos saudáveis (equivalentes) para: ${item.nome}. Mantenha calorias próximas.`;
                              alert(`Buscando substitutos para ${item.nome}...\n(Em uma versão futura, isso abriria um modal dedicado)`);
                           }}
                           className="mt-3 text-[9px] font-black text-[#869471] uppercase tracking-[0.2em] flex items-center gap-1 hover:opacity-60 transition-opacity"
                         >
                            <RefreshCw className="w-3 h-3" /> Ver Substitutos (AI)
                         </button>
                         {item.obs && (
                           <span className="mt-2 text-[10px] font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-full inline-block self-start">
                              {item.obs}
                           </span>
                         )}
                      </div>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {/* Dashboard de Resumo */}
        <section className="bg-slate-900 rounded-[3.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-900/30">
          <div className="absolute inset-0 bg-[#869471]/10 -skew-y-12 translate-y-20 transform scale-150" />
          <div className="relative z-10 text-center md:text-left">
            <h2 className="text-xl font-black mb-10 flex items-center justify-center md:justify-start gap-3 uppercase tracking-[0.2em] text-[#869471]">
              <PieChart className="w-5 h-5" /> Análise de Macros
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
               <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Energia</p>
                 <p className="text-2xl font-black">{totals.cal.toFixed(0)} <span className="text-[10px] font-normal opacity-50">kcal</span></p>
               </div>
               <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Proteínas</p>
                 <p className="text-2xl font-black">{totals.prot.toFixed(1)} <span className="text-[10px] font-normal opacity-50">g</span></p>
               </div>
               <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Carbos</p>
                 <p className="text-2xl font-black">{totals.carb.toFixed(1)} <span className="text-[10px] font-normal opacity-50">g</span></p>
               </div>
               <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Gorduras</p>
                 <p className="text-2xl font-black">{totals.fat.toFixed(1)} <span className="text-[10px] font-normal opacity-50">g</span></p>
               </div>
            </div>
            <div className="mt-12 p-8 bg-white/5 rounded-[2rem] border border-white/10 text-center">
               <p className="text-sm font-medium text-slate-300 leading-relaxed italic opacity-80">
                 "Não pare até se orgulhar de você. Siga o plano com dedicação total."
               </p>
            </div>
          </div>
        </section>

        {/* Botão de WhatsApp Flutuante ou Fixo */}
        <div className="pt-10">
          <a 
            href={`https://wa.me/${(settings?.whatsappNumber || '5547984778043').replace(/\D/g, '')}?text=Olá, estou seguindo o plano ${dieta.titulo}!`}
            target="_blank"
            rel="noreferrer"
            className="block w-full py-6 bg-[#869471] text-white rounded-[2rem] font-black shadow-2xl shadow-[#869471]/30 text-center uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all"
          >
            Falar com Nutricionista
          </a>
        </div>
      </div>
    </div>
  );
}
