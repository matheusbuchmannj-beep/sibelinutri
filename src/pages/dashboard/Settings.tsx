import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, Image as ImageIcon, MessageCircle, MapPin, 
  Calendar, Clock, Trash2, Plus, Sparkles, User,
  ChevronRight, ArrowLeft, Camera, Lock, Upload
} from 'lucide-react';
import { 
  fetchSettings, fetchLocais, fetchHorarios, 
  updateSheetData 
} from '../../lib/googleWorkspace';
import { Settings, Local } from '../../types';
import { cn } from '../../lib/utils';
import { suggestBackgroundStyles } from '../../services/geminiService';

import { subscribeToDocument, subscribeToCollection, saveDocument } from '../../lib/firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'perfil' | 'background' | 'clinicas' | 'horarios' | 'contato'>('perfil');

  // AI Background state
  const [refImages, setRefImages] = useState<string[]>([]);
  const [aiOptions, setAiOptions] = useState<{ name: string; colors: string[]; description: string }[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    const unsubSettings = subscribeToDocument<Settings>('config', 'settings', (data) => {
      if (data) setSettings(data);
      setLoading(false);
    });

    const unsubLocais = subscribeToCollection<Local>('locais', (data) => {
      setLocais(data);
    });

    return () => {
      unsubSettings();
      unsubLocais();
    };
  }, []);

  const handleSaveSettings = async (newSettings?: Settings) => {
    const toSave = newSettings || settings;
    if (!toSave) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'settings'), toSave, { merge: true });
      alert('Configurações salvas!');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLocais = async (newLocais: Local[]) => {
    setSaving(true);
    try {
      // For cross-device sync, we should update individual docs or use batch
      const batch = writeBatch(db);
      
      // Since this is a simple list management, we can simplify:
      // In a real app, we'd only update the changed one.
      // Here, let's just make sure the new/deleted list is reflected.
      
      // 1. Get current IDs to find what was deleted
      const currentIds = locais.map(l => l.id);
      const newIds = newLocais.map(l => l.id);
      const deletedIds = currentIds.filter(id => !newIds.includes(id));

      for (const id of deletedIds) {
        batch.delete(doc(db, 'locais', id));
      }

      for (const l of newLocais) {
        batch.set(doc(db, 'locais', l.id), l);
      }

      await batch.commit();
      alert('Clínicas atualizadas!');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar clínicas');
    } finally {
      setSaving(false);
    }
  };

  const handleAiBackground = async () => {
    if (refImages.filter(img => img).length < 1) return alert('Carregue pelo menos 1 imagem de referência');
    setIsGeneratingAi(true);
    setAiOptions([]);
    try {
       const options = await suggestBackgroundStyles(refImages.filter(img => img));
       setAiOptions(options);
    } catch (e) {
       console.error('AI Error:', e);
       alert(e instanceof Error ? e.message : 'Erro ao gerar opções com IA');
    } finally {
       setIsGeneratingAi(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (loading || !settings) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 font-jost">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-dark">Configurações</h1>
          <p className="text-slate-500 mt-2">Gerencie sua identidade visual e agenda.</p>
        </div>
        <div className="flex bg-white p-1 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
           {[
             { id: 'perfil', label: 'Perfil', icon: User },
             { id: 'background', label: 'Visual', icon: Sparkles },
             { id: 'clinicas', label: 'Clínicas', icon: MapPin },
             { id: 'horarios', label: 'Agenda', icon: Calendar },
             { id: 'contato', label: 'Contato', icon: MessageCircle },
           ].map(t => (
             <button 
               key={t.id}
               onClick={() => setActiveTab(t.id as any)}
               className={cn(
                 "flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                 activeTab === t.id ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
               )}
             >
               <t.icon className="w-4 h-4" /> {t.label}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {activeTab === 'perfil' && settings && (
          <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-12">
             <div className="flex flex-col items-center gap-8">
                <div className="relative group">
                   <div className="w-48 h-48 rounded-full overflow-hidden border-8 border-slate-50 shadow-inner group-hover:opacity-80 transition-all cursor-pointer bg-slate-100 flex items-center justify-center">
                      {settings.personUrl ? (
                         <img src={settings.personUrl} className="w-full h-full object-cover" />
                      ) : (
                         <Camera className="w-12 h-12 text-slate-300" />
                      )}
                   </div>
                   <label className="absolute bottom-2 right-2 p-4 bg-primary text-white rounded-full shadow-xl cursor-pointer hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6" />
                      <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setSettings({...settings, personUrl: url}))} />
                   </label>
                </div>
                <div className="w-full max-w-md space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Link da Foto de Perfil (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="https://exemplo.com/foto.jpg"
                        value={settings.personUrl?.startsWith('data:') ? '' : settings.personUrl}
                        onChange={(e) => setSettings({...settings, personUrl: e.target.value})}
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary text-xs"
                      />
                      <p className="text-[10px] text-slate-400 px-1">Use um link direto para a imagem para que funcione em todos os dispositivos.</p>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Nome do Profissional</label>
                      <input 
                        type="text" 
                        value={settings.brandName}
                        onChange={(e) => setSettings({...settings, brandName: e.target.value})}
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Número do CRN</label>
                      <input 
                        type="text" 
                        value={settings.crn}
                        onChange={(e) => setSettings({...settings, crn: e.target.value})}
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Título do Banner (Hero)</label>
                      <input 
                        type="text" 
                        value={settings.heroTitle}
                        onChange={(e) => setSettings({...settings, heroTitle: e.target.value})}
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Subtítulo do Banner</label>
                      <textarea 
                        value={settings.heroSubtitle}
                        onChange={(e) => setSettings({...settings, heroSubtitle: e.target.value})}
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary min-h-[100px]"
                      />
                   </div>
                   <button 
                     onClick={() => handleSaveSettings()}
                     disabled={saving}
                     className="w-full py-5 bg-primary text-white rounded-3xl font-bold uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-accent transition-all active:scale-95"
                   >
                     {saving ? (
                       <>Salvando Alterações... <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /></>
                     ) : (
                       'Atualizar Perfil e Foto'
                     )}
                   </button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'background' && (
          <div className="space-y-12">
             <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-12">
                   <div>
                      <h2 className="text-2xl font-black text-dark">Fundo Inteligente (AI)</h2>
                      <p className="text-slate-400">Carregue até 3 imagens de referência para gerar cores.</p>
                   </div>
                   <Sparkles className="w-8 h-8 text-secondary" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                   {[0, 1, 2].map(i => (
                     <div key={i} className="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group hover:border-primary transition-all">
                        {refImages[i] ? (
                           <img src={refImages[i]} className="w-full h-full object-cover" />
                        ) : (
                           <div className="flex flex-col items-center gap-2">
                             <Plus className="text-slate-300" />
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Referência</span>
                           </div>
                        )}
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={(e) => handleImageUpload(e, (url) => {
                             const newRef = [...refImages];
                             newRef[i] = url;
                             setRefImages(newRef);
                          })} 
                        />
                     </div>
                   ))}
                </div>

                <div className="space-y-6">
                   <button 
                     onClick={handleAiBackground}
                     disabled={isGeneratingAi || refImages.filter(img => img).length === 0}
                     className="w-full py-6 bg-accent text-white rounded-3xl font-bold flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-accent/20"
                   >
                      {isGeneratingAi ? 'Pensando...' : 'Gerar Paleta com IA'}
                   </button>

                   <div className="relative group pt-6">
                      <div className="flex items-center justify-between mb-4">
                         <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Ou use uma Imagem Própria</h3>
                      </div>
                      <div className="space-y-4">
                         <div className="flex items-center gap-6">
                            <div 
                              onClick={() => document.getElementById('bg-pc-upload')?.click()}
                              className="flex-1 py-10 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-primary cursor-pointer transition-all bg-slate-50/50"
                            >
                               <Upload className="w-6 h-6 text-slate-300" />
                               <span className="text-xs font-bold text-slate-400">Escolher do Computador</span>
                            </div>
                            {settings.bgUrl && (
                               <div className="w-32 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                                  <img src={settings.bgUrl} className="w-full h-full object-cover" />
                               </div>
                            )}
                            <input 
                              id="bg-pc-upload"
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, (url) => setSettings({...settings, bgUrl: url}))}
                            />
                         </div>

                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Link Direto da Imagem de Fundo</label>
                            <input 
                              type="text" 
                              placeholder="https://exemplo.com/fundo.jpg"
                              value={settings.bgUrl?.startsWith('data:') ? '' : settings.bgUrl}
                              onChange={(e) => setSettings({...settings, bgUrl: e.target.value})}
                              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary text-xs"
                            />
                            <p className="text-[10px] text-slate-400 px-1">Recomendado para melhor estabilidade entre dispositivos.</p>
                         </div>
                      </div>
                   </div>

                   <button 
                     onClick={() => handleSaveSettings()}
                     disabled={saving}
                     className="w-full py-6 bg-primary text-white rounded-3xl font-bold uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 mt-8"
                   >
                     {saving ? 'Salvando...' : 'Salvar Alterações de Fundo'}
                   </button>
                </div>
             </div>

              {aiOptions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   {aiOptions.map((opt, i) => (
                      <div key={i} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
                         <div className="flex gap-2 mb-6">
                            {opt.colors.map(c => (
                               <div key={c} className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: c }} />
                            ))}
                         </div>
                         <h3 className="text-xl font-bold mb-2">{opt.name}</h3>
                         <p className="text-xs text-slate-400 leading-relaxed mb-8 flex-1">{opt.description}</p>
                         <button 
                           onClick={async () => {
                              const updated = { 
                                ...settings, 
                                primaryColor: opt.colors[0],
                                // We could also pick a secondary or update CSS variables here
                              };
                              setSettings(updated);
                              await handleSaveSettings(updated);
                              alert('Estilo ' + opt.name + ' aplicado com sucesso!');
                           }}
                           className="w-full py-4 bg-slate-50 text-dark rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                         >
                           Aplicar Estilo
                         </button>
                      </div>
                   ))}
                </div>
              )}

              <div className="space-y-6 mt-12 pt-12 border-t border-slate-50">
                <h3 className="text-xl font-bold">Estilos Profissionais Pré-definidos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                   {[
                      { name: 'Minimalista', url: 'https://images.unsplash.com/photo-1490818387583-1baba5e6382b?q=80&w=2000' },
                      { name: 'Orgânico', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2000' },
                      { name: 'Fresco', url: 'https://images.unsplash.com/photo-1505253149613-112d21d9f6a9?q=80&w=2000' },
                      { name: 'Zen', url: 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?q=80&w=2000' }
                   ].map(st => (
                      <button 
                        key={st.url}
                        onClick={async () => {
                           const updated = { ...settings, bgUrl: st.url };
                           setSettings(updated);
                           // Persist immediately for better UX
                           await handleSaveSettings(updated);
                        }}
                        className={cn(
                           "group relative aspect-video rounded-2xl overflow-hidden border-2 transition-all",
                           settings.bgUrl === st.url ? "border-primary shadow-lg" : "border-transparent hover:border-slate-200"
                        )}
                      >
                         <img src={st.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                         <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                         <span className="absolute bottom-2 left-2 text-[8px] font-black uppercase text-white tracking-widest">{st.name}</span>
                      </button>
                   ))}
                </div>
              </div>
           </div>
        )}

        {activeTab === 'clinicas' && (
          <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-12">
             <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-dark">Clinicas Cadastradas</h2>
                <button 
                  onClick={() => {
                    const name = prompt('Nome da clínica:');
                    const addr = prompt('Endereço:');
                    if (name && addr) {
                      handleSaveLocais([...locais, { id: Date.now().toString(), name, address: addr, mapsLink: '' }]);
                    }
                  }}
                  className="p-4 bg-primary text-white rounded-2xl"
                >
                  <Plus className="w-5 h-5" />
                </button>
             </div>

             <div className="space-y-4">
                {locais.map(l => (
                   <div key={l.id} className="p-6 bg-slate-50 rounded-3xl flex items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                         <MapPin className="text-primary w-6 h-6" />
                         <div>
                            <p className="font-bold">{l.name}</p>
                            <p className="text-xs text-slate-400">{l.address}</p>
                         </div>
                      </div>
                      <button 
                         onClick={() => handleSaveLocais(locais.filter(x => x.id !== l.id))}
                         className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                      >
                         <Trash2 className="w-5 h-5" />
                      </button>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'contato' && (
           <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-12">
              <h2 className="text-2xl font-black text-dark">Dados de Contato</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">WhatsApp Principal</label>
                    <input 
                      type="text" 
                      value={settings.whatsappNumber}
                      onChange={(e) => setSettings({...settings, whatsappNumber: e.target.value})}
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Chave PIX</label>
                    <input 
                      type="text" 
                      value={settings.pixKey}
                      onChange={(e) => setSettings({...settings, pixKey: e.target.value})}
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                    />
                 </div>
              </div>
              <button 
                onClick={() => handleSaveSettings()}
                disabled={saving}
                className="w-full py-5 bg-primary text-white rounded-3xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? (
                  <>Salvando... <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /></>
                ) : (
                  'Salvar Dados'
                )}
              </button>
           </div>
        )}

        {activeTab === 'horarios' && (
           <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-12">
              <div className="text-center space-y-6">
                 <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto">
                    <Calendar className="w-10 h-10" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-dark">Gestão da Agenda</h2>
                    <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                      Para uma melhor experiência, a configuração de horários agora possui uma página dedicada e mais intuitiva.
                    </p>
                 </div>
                 <button 
                  onClick={() => navigate('/admin/agenda')}
                  className="px-10 py-5 bg-primary text-white rounded-3xl font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                 >
                    Ir para Agenda Diária
                 </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
