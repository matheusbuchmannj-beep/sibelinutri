import { useState, useEffect } from 'react';
import { fetchLocais, updateSheetData, appendSheetData } from '../../lib/googleWorkspace';
import { Local } from '../../types';
import { MapPin, Plus, Trash2, ExternalLink, X, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Locais() {
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Local | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', mapsLink: '' });

  const loadData = async () => {
    try {
      const data = await fetchLocais();
      setLocais(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (local?: Local) => {
    if (local) {
      setEditingLocal(local);
      setFormData({ name: local.name, address: local.address, mapsLink: local.mapsLink });
    } else {
      setEditingLocal(null);
      setFormData({ name: '', address: '', mapsLink: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingLocal) {
        // Edit existing
        const updated = locais.map(l => l.id === editingLocal.id ? { ...l, ...formData } : l);
        const rows = updated.map(l => [l.id, l.name, l.address, l.mapsLink]);
        await updateSheetData('Locais!A2:D', rows);
        setLocais(updated);
      } else {
        // Add new
        const id = Date.now().toString();
        const local = { ...formData, id };
        await appendSheetData('Locais!A2', [[id, local.name, local.address, local.mapsLink]]);
        setLocais([...locais, local]);
      }
      setIsModalOpen(false);
    } catch (e) {
      alert('Erro ao salvar local');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este local?')) return;
    
    try {
      const updated = locais.filter(l => l.id !== id);
      const rows = updated.map(l => [l.id, l.name, l.address, l.mapsLink]);
      
      // We no longer need to manually handle the empty row placeholder here 
      // because the service now clears the range before updating.
      await updateSheetData('Locais!A2:D', rows);
      setLocais(updated);
    } catch (e) {
      console.error('Erro ao excluir:', e);
      alert('Erro ao excluir local. Verifique sua conexão ou permissões da planilha.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Locais de Atendimento</h1>
          <p className="text-slate-500 mt-2">Gerencie os endereços presenciais da sua agenda.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-[#869471] text-white rounded-2xl font-bold shadow-lg shadow-[#869471]/20 hover:scale-105 transition-transform"
        >
          <Plus className="w-5 h-5" /> Novo Local
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locais.map(local => (
          <motion.div 
            layout
            key={local.id}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4"
          >
            <div className="w-12 h-12 bg-[#869471]/10 text-[#869471] rounded-2xl flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{local.name}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mt-1">{local.address}</p>
            </div>
            <div className="pt-4 flex items-center justify-between border-t border-slate-50">
              <a 
                href={local.mapsLink} 
                target="_blank" 
                className="text-xs font-bold text-[#869471] hover:underline flex items-center gap-1"
              >
                Ver no Mapa <ExternalLink className="w-3 h-3" />
              </a>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleOpenModal(local)}
                  className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(local.id)}
                  className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">{editingLocal ? 'Editar Local' : 'Cadastrar Local'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nome (Ex: Clínica Centro)</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Nome da clínica ou consultório"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Endereço Completo</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Link Google Maps</label>
                  <input 
                    type="text" 
                    value={formData.mapsLink}
                    onChange={(e) => setFormData({...formData, mapsLink: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="https://goo.gl/maps/..."
                  />
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full py-4 bg-[#869471] text-white rounded-2xl font-bold shadow-lg hover:bg-primary/90 transition-colors"
              >
                {editingLocal ? 'Salvar Alterações' : 'Cadastrar Local'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
