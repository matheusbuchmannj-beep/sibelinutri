import { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit2, Sparkles, Image as ImageIcon,
  ChevronRight, Utensils, Info, Save, X
} from 'lucide-react';
import { fetchAlimentos, updateSheetData } from '../../lib/googleWorkspace';
import { Alimento } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { searchFoodSmart } from '../../services/geminiService';

export default function Alimentos() {
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlimento, setEditingAlimento] = useState<Alimento | null>(null);
  const [generating, setGenerating] = useState(false);

  const [formData, setFormData] = useState<Partial<Alimento>>({
    nome: '',
    categoria: 'Carboidratos',
    calorias: 0,
    unidade: '100g',
    carboidratos: 0,
    proteinas: 0,
    gorduras: 0,
    fibra: 0,
    imagem: ''
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAlimentos();
        setAlimentos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    const newAlimento: Alimento = {
      id: editingAlimento?.id || Math.random().toString(36).substr(2, 9),
      nome: formData.nome || '',
      categoria: formData.categoria || 'Outros',
      calorias: formData.calorias || 0,
      unidade: formData.unidade || '100g',
      imagem: formData.imagem,
      carboidratos: formData.carboidratos || 0,
      proteinas: formData.proteinas || 0,
      gorduras: formData.gorduras || 0,
      fibra: formData.fibra || 0
    };

    let updated;
    if (editingAlimento) {
      updated = alimentos.map(a => a.id === editingAlimento.id ? newAlimento : a);
    } else {
      updated = [...alimentos, newAlimento];
    }

    setAlimentos(updated);
    setIsModalOpen(false);
    setEditingAlimento(null);
    setFormData({ categoria: 'Carboidratos', unidade: '100g' });

    try {
      const rows = updated.map(a => [
        a.id, a.nome, a.categoria, a.calorias, a.unidade, a.imagem, 
        a.carboidratos, a.proteinas, a.gorduras, a.fibra
      ]);
      await updateSheetData('Alimentos!A2:J', rows);
    } catch (err) {
      alert('Erro ao salvar no Sheets');
    }
  };

  const handleAIAnalyze = async () => {
    if (!formData.nome) return alert('Digite o nome do alimento primeiro');
    setGenerating(true);
    try {
      const results = await searchFoodSmart(formData.nome);
      if (results.length > 0) {
        const info = results[0];
        setFormData({
          ...formData,
          calorias: info.calorias,
          carboidratos: info.carboidratos,
          proteinas: info.proteinas,
          gorduras: info.gorduras,
          fibra: info.fibra,
          categoria: info.categoria,
          unidade: info.unidade || '100g',
          marca: info.marca
        });
      }
    } catch (err) {
      alert('IA indisponível');
    } finally {
      setGenerating(false);
    }
  };

  const filtered = alimentos.filter(a => 
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    a.categoria.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Carregando Banco de Alimentos...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Banco de Alimentos</h1>
          <p className="text-slate-500 mt-2">Gerencie sua base de dados nutricionais ilimitada.</p>
        </div>
        <button 
          onClick={() => {
            setEditingAlimento(null);
            setFormData({ categoria: 'Carboidratos', unidade: '100g', calorias:0, carboidratos:0, proteinas:0, gorduras:0 });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-[#869471] text-white rounded-2xl font-bold shadow-lg shadow-[#869471]/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-5 h-5" /> Novo Alimento
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Buscar no banco de alimentos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-16 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm outline-none focus:ring-2 focus:ring-[#869471]/20 transition-all font-medium text-slate-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(alimento => (
          <motion.div 
            key={alimento.id}
            layout
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-3xl bg-slate-50 flex-shrink-0 overflow-hidden border border-slate-100">
                {alimento.imagem ? (
                  <img src={alimento.imagem} alt={alimento.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Utensils className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#869471] bg-[#869471]/10 px-2 py-0.5 rounded-full">
                  {alimento.categoria}
                </span>
                <h3 className="font-bold text-slate-800 text-lg mt-1 truncate">{alimento.nome}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{alimento.calorias} kcal / {alimento.unidade}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 py-4 border-t border-slate-50">
               <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Carb</p>
                  <p className="font-bold text-slate-700">{alimento.carboidratos}g</p>
               </div>
               <div className="text-center border-x border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prot</p>
                  <p className="font-bold text-slate-700">{alimento.proteinas}g</p>
               </div>
               <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gord</p>
                  <p className="font-bold text-slate-700">{alimento.gorduras}g</p>
               </div>
            </div>

            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                  setEditingAlimento(alimento);
                  setFormData(alimento);
                  setIsModalOpen(true);
                }}
                className="p-2 bg-white shadow-lg text-slate-400 hover:text-[#869471] rounded-xl transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={async () => {
                   const updated = alimentos.filter(a => a.id !== alimento.id);
                   setAlimentos(updated);
                   const rows = updated.map(a => [a.id, a.nome, a.categoria, a.calorias, a.unidade, a.imagem, a.carboidratos, a.proteinas, a.gorduras, a.fibra]);
                   await updateSheetData('Alimentos!A2:J', rows);
                }}
                className="p-2 bg-white shadow-lg text-slate-400 hover:text-red-400 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full">
                <X className="w-6 h-6 text-slate-300" />
              </button>

              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-800">{editingAlimento ? 'Editar Alimento' : 'Novo Alimento'}</h2>
                <button 
                  onClick={handleAIAnalyze}
                  disabled={generating}
                  className="mt-4 flex items-center gap-2 text-[#869471] font-bold text-sm bg-[#869471]/10 px-4 py-2 rounded-xl hover:bg-[#869471]/20 transition-all disabled:opacity-50"
                >
                  {generating ? <div className="w-4 h-4 border-2 border-[#869471]/30 border-t-[#869471] rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Gerar Nutrientes com IA
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="space-y-4 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome do Alimento</label>
                  <input 
                    type="text" 
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Ex: Maçã Gala"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#869471]/20"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoria</label>
                  <select 
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                  >
                    <option value="Carboidratos">Carboidratos</option>
                    <option value="Proteínas">Proteínas</option>
                    <option value="Gorduras">Gorduras</option>
                    <option value="Frutas">Frutas</option>
                    <option value="Vegetais">Vegetais</option>
                    <option value="Laticínios">Laticínios</option>
                    <option value="Suplementos">Suplementos</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unidade de Medida</label>
                  <input 
                    type="text" 
                    value={formData.unidade}
                    onChange={(e) => setFormData({...formData, unidade: e.target.value})}
                    placeholder="Ex: 100g ou 1 unidade"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Calorias (kcal)</label>
                  <input 
                    type="number" 
                    value={formData.calorias}
                    onChange={(e) => setFormData({...formData, calorias: Number(e.target.value)})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Carboidratos (g)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formData.carboidratos}
                    onChange={(e) => setFormData({...formData, carboidratos: Number(e.target.value)})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Proteínas (g)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formData.proteinas}
                    onChange={(e) => setFormData({...formData, proteinas: Number(e.target.value)})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gorduras (g)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formData.gorduras}
                    onChange={(e) => setFormData({...formData, gorduras: Number(e.target.value)})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full py-5 bg-[#869471] text-white rounded-[2rem] font-black shadow-2xl shadow-[#869471]/20 uppercase tracking-widest transition-all hover:scale-[1.02]"
              >
                Salvar Alimento
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
