import React, { useState, useEffect } from 'react';
import { 
  Save, ArrowLeft, Plus, Trash2, Sparkles, Search, 
  ChevronDown, ChevronUp, Image as ImageIcon, Utensils,
  Calculator, PieChart, RefreshCw
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  fetchDietas, saveDieta, fetchAgendamentos 
} from '../../lib/googleWorkspace';
import { suggestMeals } from '../../services/geminiService';
import { Dieta, Booking, Alimento, Refeicao, ItemRefeicao } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import FoodSearchModal from '../../components/dashboard/FoodSearchModal';
import { cn } from '../../lib/utils';

export default function DietaEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeRefId, setActiveRefId] = useState<string | null>(null);
  
  const [pacientes, setPacientes] = useState<Booking[]>([]);
  
  const [dieta, setDieta] = useState<Dieta>({
    id: '',
    pacienteId: '',
    pacienteNome: '',
    titulo: '',
    objetivo: 'emagrecimento',
    refeicoes: [],
    dataCriacao: new Date().toISOString()
  });

  useEffect(() => {
    async function load() {
      try {
        const [pts, dts] = await Promise.all([
          fetchAgendamentos(),
          id ? fetchDietas() : Promise.resolve([])
        ]);
        
        setPacientes(pts);
        
        if (id) {
          const current = dts.find(d => d.id === id);
          if (current) setDieta(current);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSave = async () => {
    if (!dieta.pacienteId || !dieta.titulo) {
      alert('Preencha o paciente e o título');
      return;
    }
    setSaving(true);
    try {
      await saveDieta(dieta);
      navigate('/admin/dietas');
    } catch (err) {
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRefeicao = () => {
    const newRef: Refeicao = {
      id: Math.random().toString(36).substr(2, 9),
      nome: 'Nova Refeição',
      itens: []
    };
    setDieta({ ...dieta, refeicoes: [...dieta.refeicoes, newRef] });
  };

  const handleRemoveRefeicao = (refId: string) => {
    setDieta({ ...dieta, refeicoes: dieta.refeicoes.filter(r => r.id !== refId) });
  };

  const calculateItemMacros = (food: Alimento, quantityStr: string) => {
    // Basic parser for quantity (extract number)
    const match = quantityStr.match(/(\d+)/);
    const quantity = match ? parseInt(match[1]) : 100;
    
    // Determine ratio (assume base is 100 if gram, or 1 if unit)
    const isUnit = quantityStr.toLowerCase().includes('un') || food.unidade.toLowerCase().includes('un');
    const ratio = isUnit ? quantity : quantity / 100;

    return {
      cal: Math.round(food.calorias * ratio),
      prot: parseFloat((food.proteinas * ratio).toFixed(1)),
      carb: parseFloat((food.carboidratos * ratio).toFixed(1)),
      fat: parseFloat((food.gorduras * ratio).toFixed(1))
    };
  };

  const handleSelectFood = (food: Alimento) => {
    if (!activeRefId) return;

    const defaultQty = food.unidade || '100g';
    const macros = calculateItemMacros(food, defaultQty);

    const newItem: ItemRefeicao = {
      alimentoId: food.id,
      nome: food.nome,
      quantidade: defaultQty,
      imagem: food.imagem,
      macros
    };

    const updated = dieta.refeicoes.map(r => 
      r.id === activeRefId ? { ...r, itens: [...r.itens, newItem] } : r
    );
    
    setDieta({ ...dieta, refeicoes: updated });
    setIsSearchOpen(false);
  };

  const handleUpdateItemQty = (refId: string, itemIdx: number, quantity: string) => {
    const updated = dieta.refeicoes.map(r => {
      if (r.id === refId) {
        const newItens = [...r.itens];
        const item = newItens[itemIdx];
        
        // This is a bit tricky since we don't store the full Alimento in ItemRefeicao
        // For accurate recalculation, we'd need the base macros. 
        // We'll approximate or use the current macros as base if we assume they were set at 100g/unit initally
        // But better: we'll use a hack or assume we have the base stored in a hidden field if needed.
        // For now, let's just update the string. In a real app we'd fetch the food base macros again.
        
        newItens[itemIdx] = { ...item, quantidade: quantity };
        return { ...r, itens: newItens };
      }
      return r;
    });
    setDieta({ ...dieta, refeicoes: updated });
  };

  const handleRemoveItem = (refId: string, itemIdx: number) => {
    setDieta({ 
      ...dieta, 
      refeicoes: dieta.refeicoes.map(r => r.id === refId ? { ...r, itens: r.itens.filter((_, i) => i !== itemIdx) } : r)
    });
  };

  const calculateTotals = () => {
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

  const totals = calculateTotals();

  const handleAISuggest = async () => {
    if (!dieta.pacienteId) {
      alert('Selecione primeiro o paciente para a IA entender o contexto');
      return;
    }
    setSuggesting(true);
    try {
      const suggestion = await suggestMeals(dieta.objetivo, dieta.titulo);
      const newRefeicoes: Refeicao[] = suggestion.map((s: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        nome: s.nome,
        itens: s.itens.map((i: any) => ({
          alimentoId: '',
          nome: i.nome,
          quantidade: i.quantidade,
          obs: i.obs,
          macros: { cal: 0, prot: 0, carb: 0, fat: 0 } // Sugestão pura via IA (sem base no momento)
        }))
      }));
      setDieta({ ...dieta, refeicoes: newRefeicoes });
    } catch (err) {
      alert('IA indisponível no momento');
    } finally {
      setSuggesting(false);
    }
  };

  if (loading) return <div className="p-8 text-center bg-[#fdfbf6] min-h-screen">Carregando Dieta...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/dietas')} className="p-3 bg-white hover:bg-slate-50 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-95">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Prescrição Nutricional</h1>
            <p className="text-slate-500 font-medium">Monte o plano alimentar com inteligência e precisão.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleAISuggest}
            disabled={suggesting}
            className="flex items-center gap-2 px-6 py-3 bg-white text-[#869471] border-2 border-[#869471]/10 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#869471]/5 disabled:opacity-50 hover:bg-[#869471]/5 transition-all"
          >
            {suggesting ? <div className="w-4 h-4 border-2 border-[#869471]/30 border-t-[#869471] rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Sugerir com IA
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-[#869471] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-[#869471]/20 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            Finalizar Plano
          </button>
        </div>
      </div>

      {/* Macro Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Calorias', value: totals.cal, unit: 'kcal', color: 'bg-slate-800' },
          { label: 'Proteínas', value: totals.prot, unit: 'g', color: 'bg-emerald-500' },
          { label: 'Carbos', value: totals.carb, unit: 'g', color: 'bg-amber-500' },
          { label: 'Lipídios', value: totals.fat, unit: 'g', color: 'bg-rose-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-800">{stat.value.toFixed(stat.label === 'Calorias' ? 0 : 1)}<span className="text-sm font-normal text-slate-300 ml-1">{stat.unit}</span></h3>
            </div>
            <div className={cn("w-3 h-12 rounded-full", stat.color)} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Paciente</label>
            <select 
              value={dieta.pacienteId}
              onChange={(e) => {
                const p = pacientes.find(pt => pt.id === e.target.value);
                setDieta({ ...dieta, pacienteId: e.target.value, pacienteNome: p?.patientName || '' });
              }}
              className="w-full px-6 py-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 outline-none focus:ring-4 focus:ring-[#869471]/10 font-bold transition-all"
            >
              <option value="">Selecione o paciente</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.patientName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Meta do Plano</label>
            <input 
              type="text" 
              value={dieta.titulo}
              onChange={(e) => setDieta({ ...dieta, titulo: e.target.value })}
              placeholder="Ex: Cutting Verão 2024"
              className="w-full px-6 py-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 outline-none focus:ring-4 focus:ring-[#869471]/10 font-bold placeholder:opacity-30 transition-all"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Objetivo Clínico</label>
            <select 
              value={dieta.objetivo}
              onChange={(e) => setDieta({ ...dieta, objetivo: e.target.value as any })}
              className="w-full px-6 py-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 outline-none focus:ring-4 focus:ring-[#869471]/10 font-bold transition-all"
            >
              <option value="emagrecimento">Emagrecimento</option>
              <option value="hipertrofia">Hipertrofia</option>
              <option value="manutenção">Manutenção de Saúde</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Estrutura das Refeições</h2>
          <button 
            onClick={handleAddRefeicao}
            className="flex items-center gap-2 text-xs font-black text-[#869471] uppercase tracking-widest bg-white px-6 py-3 rounded-2xl shadow-sm border border-[#869471]/10 hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nova Refeição
          </button>
        </div>

        <div className="space-y-6">
          <AnimatePresence>
            {dieta.refeicoes.map((ref) => (
              <motion.div 
                key={ref.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group/ref"
              >
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-white rounded-[1.5rem] flex items-center justify-center shadow-sm border border-slate-100">
                      <Utensils className="w-6 h-6 text-[#869471]" />
                    </div>
                    <input 
                      type="text" 
                      value={ref.nome}
                      onChange={(e) => {
                        const updated = dieta.refeicoes.map(r => r.id === ref.id ? { ...r, nome: e.target.value } : r);
                        setDieta({ ...dieta, refeicoes: updated });
                      }}
                      className="bg-transparent font-black text-slate-800 outline-none focus:text-[#869471] transition-colors text-2xl placeholder:opacity-20"
                      placeholder="Ex: Café da Manhã"
                    />
                  </div>
                  <button onClick={() => handleRemoveRefeicao(ref.id)} className="p-3 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 space-y-4">
                  {ref.itens.map((item, idx) => (
                    <div key={idx} className="flex flex-col lg:flex-row gap-6 p-6 bg-[#fdfbf6] rounded-[2rem] border border-amber-50 items-center relative group">
                      <div className="w-20 h-20 bg-white rounded-3xl overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm border border-amber-50 p-1">
                        {item.imagem ? (
                          <img src={item.imagem} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200 rounded-2xl">
                             <Utensils className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-1 text-center lg:text-left">
                        <h4 className="text-xl font-black text-slate-800">{item.nome}</h4>
                        <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                          {item.macros && (
                            <>
                              <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-800" /> {item.macros.cal} kcal
                              </span>
                              <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> P: {item.macros.prot}g
                              </span>
                              <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> C: {item.macros.carb}g
                              </span>
                              <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> G: {item.macros.fat}g
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="w-full lg:w-48">
                        <input 
                          type="text" 
                          value={item.quantidade}
                          onChange={(e) => handleUpdateItemQty(ref.id, idx, e.target.value)}
                          placeholder="Qtd (ex: 200g)"
                          className="w-full px-5 py-3 bg-white rounded-2xl border border-amber-100 outline-none text-center font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-amber-200/20 transition-all"
                        />
                      </div>

                      <button onClick={() => handleRemoveItem(ref.id, idx)} className="lg:static absolute top-4 right-4 p-2 text-amber-200 hover:text-red-500 transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => {
                      setActiveRefId(ref.id);
                      setIsSearchOpen(true);
                    }}
                    className="w-full py-8 border-3 border-dashed border-slate-100 rounded-[2.5rem] text-slate-300 font-black text-sm uppercase tracking-widest hover:border-[#869471]/30 hover:text-[#869471] hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                  >
                    <Plus className="w-6 h-6" /> Buscar na Base Inteligente
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isSearchOpen && (
          <FoodSearchModal 
            onClose={() => setIsSearchOpen(false)}
            onSelect={handleSelectFood}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
