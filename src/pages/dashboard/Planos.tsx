import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Tags, Clock, DollarSign } from 'lucide-react';
import { fetchPlanos, updateSheetData } from '../../lib/googleWorkspace';
import { Plano } from '../../types';

export default function Planos() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPlanos();
        setPlanos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = planos.map(p => [p.id || Math.random().toString(36).substr(2, 9), p.titulo, p.descricao, p.preco, p.duracao]);
      await updateSheetData('Planos!A2:E', rows);
      alert('Planos salvos com sucesso!');
    } catch (err) {
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const addPlano = () => {
    setPlanos([...planos, { id: '', titulo: '', descricao: '', preco: '', duracao: '' }]);
  };

  const updatePlano = (idx: number, field: keyof Plano, value: string) => {
    const updated = [...planos];
    updated[idx] = { ...updated[idx], [field]: value };
    setPlanos(updated);
  };

  const removePlano = (idx: number) => {
    setPlanos(planos.filter((_, i) => i !== idx));
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Planos e Valores</h1>
          <p className="text-slate-500">Configure os valores e serviços oferecidos no site.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#869471] text-white rounded-2xl font-bold shadow-lg shadow-[#869471]/20 disabled:opacity-50"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
          Salvar Tudo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {planos.map((plano, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 relative group">
            <button 
              onClick={() => removePlano(idx)}
              className="absolute top-6 right-6 p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                  <Tags className="w-3 h-3 text-[#869471]" /> Título do Plano
                </label>
                <input 
                  type="text" 
                  value={plano.titulo}
                  onChange={(e) => updatePlano(idx, 'titulo', e.target.value)}
                  placeholder="Ex: Consulta Presencial"
                  className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#869471]/20 font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                   <DollarSign className="w-3 h-3 text-[#869471]" /> Preço Exibido
                </label>
                <input 
                  type="text" 
                  value={plano.preco}
                  onChange={(e) => updatePlano(idx, 'preco', e.target.value)}
                  placeholder="Ex: R$ 250,00"
                  className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#869471]/20 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descrição</label>
              <textarea 
                value={plano.descricao}
                onChange={(e) => updatePlano(idx, 'descricao', e.target.value)}
                placeholder="Detalhes do que está incluso..."
                className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#869471]/20 min-h-[100px]"
              />
            </div>

            <div className="space-y-2 w-full md:w-1/2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                <Clock className="w-3 h-3 text-[#869471]" /> Duração/Período
              </label>
              <input 
                type="text" 
                value={plano.duracao}
                onChange={(e) => updatePlano(idx, 'duracao', e.target.value)}
                placeholder="Ex: 60 minutos"
                className="w-full px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#869471]/20"
              />
            </div>
          </div>
        ))}

        <button 
          onClick={addPlano}
          className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-bold hover:border-[#869471]/30 hover:text-[#869471] transition-all flex items-center justify-center gap-3 bg-white/50"
        >
          <Plus className="w-6 h-6" /> Adicionar Novo Plano
        </button>
      </div>
    </div>
  );
}
