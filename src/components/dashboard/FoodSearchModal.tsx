import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, Plus, Info, Utensils } from 'lucide-react';
import { Alimento } from '../../types';
import { searchFoodSmart } from '../../services/geminiService';
import { fetchAlimentos } from '../../lib/googleWorkspace';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface FoodSearchModalProps {
  onSelect: (food: Alimento) => void;
  onClose: () => void;
}

export default function FoodSearchModal({ onSelect, onClose }: FoodSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Alimento[]>([]);
  const [localAlimentos, setLocalAlimentos] = useState<Alimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingAI, setSearchingAI] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchAlimentos();
      setLocalAlimentos(data);
    }
    load();
  }, []);

  // Simple local search
  const localFiltered = query.length > 1 
    ? localAlimentos.filter(a => a.nome.toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleAISearch = async () => {
    if (!query) return;
    setSearchingAI(true);
    try {
      const aiResults = await searchFoodSmart(query);
      setResults(aiResults);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingAI(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-3xl rounded-[3rem] p-8 shadow-2xl relative flex flex-col max-h-[90vh]"
      >
        <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full z-10">
          <X className="w-6 h-6 text-slate-300" />
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-800">Buscar Alimento</h2>
          <p className="text-slate-400 font-medium">Encontre alimentos em sua base ou use a IA para buscar no mercado e marcas.</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            autoFocus
            placeholder="Ex: Iogurte Grego, Whey Protein Max, Arroz cozido..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
            className="w-full pl-16 pr-32 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-[#869471]/10 transition-all font-bold text-slate-700"
          />
          <button 
            onClick={handleAISearch}
            disabled={searchingAI || !query}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-[#869471] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#869471]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {searchingAI ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
            IA Search
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-[300px] scrollbar-hide">
          {localFiltered.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4 flex items-center gap-2">
                <Utensils className="w-3 h-3" /> Sua Base de Alimentos
              </h4>
              <div className="space-y-2">
                {localFiltered.map(a => (
                  <button 
                    key={a.id}
                    onClick={() => onSelect(a)}
                    className="w-full p-4 bg-white border border-slate-100 rounded-[1.5rem] hover:border-[#869471] hover:shadow-lg transition-all flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img src={a.imagem || `https://source.unsplash.com/100x100/?food,${encodeURIComponent(a.nome)}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left flex-1">
                      <h5 className="font-bold text-slate-800 group-hover:text-[#869471]">{a.nome}</h5>
                      <div className="flex gap-3 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{a.categoria}</span>
                        <span className="text-[10px] font-bold text-[#869471]">{a.calorias} kcal</span>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-slate-200 group-hover:text-[#869471]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="pt-4 border-t border-slate-50">
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 px-4 flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> Encontrados pela IA (Marcas & Mercado)
              </h4>
              <div className="space-y-2">
                {results.map(a => (
                  <button 
                    key={a.id}
                    onClick={() => onSelect(a)}
                    className="w-full p-4 bg-white border border-blue-50 rounded-[1.5rem] hover:border-blue-400 hover:shadow-lg transition-all flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 bg-blue-50/50 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img src={a.imagem} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-slate-800">{a.nome}</h5>
                        {a.marca && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-full">{a.marca}</span>}
                      </div>
                      <div className="flex gap-3 mt-1 text-[10px] font-bold text-slate-400">
                         <span>P: {a.proteinas}g</span>
                         <span>C: {a.carboidratos}g</span>
                         <span>G: {a.gorduras}g</span>
                         <span className="text-blue-500">{a.calorias} kcal</span>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-slate-200 group-hover:text-blue-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {!query && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
              <Utensils className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold opacity-40">Comece a digitar para buscar...</p>
            </div>
          )}

          {query && localFiltered.length === 0 && !searchingAI && results.length === 0 && (
             <div className="p-8 text-center bg-slate-50 rounded-[2rem]">
                <p className="text-sm font-bold text-slate-400">Não encontramos este item na sua base local. </p>
                <button 
                  onClick={handleAISearch}
                  className="mt-4 text-[#869471] font-black text-xs uppercase tracking-widest flex items-center gap-2 mx-auto"
                >
                  <Sparkles className="w-4 h-4" /> Buscar no Mercado com IA
                </button>
             </div>
          )}
        </div>

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3 mt-4 shrink-0">
          <Info className="w-5 h-5 text-amber-500" />
          <p className="text-[10px] text-amber-700 leading-relaxed font-bold">
            Dica: Digite o nome da marca para resultados mais precisos (ex: "Whey Integralmedica").
          </p>
        </div>
      </motion.div>
    </div>
  );
}
