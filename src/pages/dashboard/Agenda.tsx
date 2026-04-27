import { useState, useEffect } from 'react';
import { fetchHorarios, updateSheetData, fetchLocais } from '../../lib/googleWorkspace';
import { format, addDays, startOfWeek, isSameDay, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Trash2, Clock, Save, MapPin, Video, Copy, RotateCcw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Local } from '../../types';

export default function Agenda() {
  const [availability, setAvailability] = useState<Record<string, Record<string, string[]>>>({});
  const [locais, setLocais] = useState<Local[]>([]);
  const [selectedLocalId, setSelectedLocalId] = useState('online');
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkTime, setBulkTime] = useState({ start: '08:00', end: '18:00', interval: '60' });
  const [showBulkModal, setShowBulkModal] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [h, l] = await Promise.all([fetchHorarios(), fetchLocais()]);
        setAvailability(h);
        setLocais(l);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const weekDays = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(weekStart, i));

  const addSlot = (date: string, time: string) => {
    const dayAvail = availability[date] || {};
    const slots = dayAvail[selectedLocalId] || [];
    if (slots.includes(time)) return;
    
    setAvailability({
      ...availability,
      [date]: { ...dayAvail, [selectedLocalId]: [...slots, time].sort() }
    });
  };

  const handleBulkAdd = (date: string) => {
    const { start, end, interval } = bulkTime;
    let current = parse(start, 'HH:mm', new Date());
    const endTime = parse(end, 'HH:mm', new Date());
    const int = parseInt(interval);
    
    const newSlots: string[] = [];
    while (current <= endTime) {
      newSlots.push(format(current, 'HH:mm'));
      current = new Date(current.getTime() + int * 60000);
    }

    const dayAvail = availability[date] || {};
    setAvailability({
      ...availability,
      [date]: { ...dayAvail, [selectedLocalId]: Array.from(new Set([...(dayAvail[selectedLocalId] || []), ...newSlots])).sort() }
    });
    setShowBulkModal(null);
  };

  const removeSlot = (date: string, time: string) => {
    const dayAvail = availability[date] || {};
    const slots = (dayAvail[selectedLocalId] || []).filter(s => s !== time);
    setAvailability({
      ...availability,
      [date]: { ...dayAvail, [selectedLocalId]: slots }
    });
  };

  const copyDay = (from: string, to: string) => {
    const fromAvail = availability[from]?.[selectedLocalId] || [];
    const toDayAvail = availability[to] || {};
    setAvailability({
      ...availability,
      [to]: { ...toDayAvail, [selectedLocalId]: [...fromAvail] }
    });
  };

  const clearDay = (date: string) => {
    const dayAvail = availability[date] || {};
    setAvailability({
      ...availability,
      [date]: { ...dayAvail, [selectedLocalId]: [] }
    });
  };

  const handleAutoGenerate = async () => {
    if (!confirm('Deseja gerar a agenda automática (Seg-Sex 9h-20h, Sab 9h-15h) até o fim de Maio? Isso não removerá horários já existentes.')) return;
    
    setSaving(true);
    try {
      const { writeBatch, doc } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');
      const { addDays, format, isSunday, isSaturday, isBefore } = await import('date-fns');
      
      const startDate = new Date(2026, 3, 27);
      const endDate = new Date(2026, 4, 31);
      let current = startDate;
      let batch = writeBatch(db);
      let operationCount = 0;

      while (isBefore(current, addDays(endDate, 1))) {
        const dateStr = format(current, 'yyyy-MM-dd');
        let slots: string[] = [];

        if (isSunday(current)) {
          // No slots
        } else if (isSaturday(current)) {
          slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
        } else {
          slots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
        }

        if (slots.length > 0) {
          const hId = `${dateStr}_${selectedLocalId}`;
          const hRef = doc(db, 'horarios', hId);
          
          // Merge with existing slots if any
          const existingDaySlots = availability[dateStr]?.[selectedLocalId] || [];
          const mergedSlots = Array.from(new Set([...existingDaySlots, ...slots])).sort();
          
          batch.set(hRef, {
            date: dateStr,
            localId: selectedLocalId,
            slots: mergedSlots
          });
          operationCount++;
        }

        if (operationCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }

        current = addDays(current, 1);
      }

      await batch.commit();
      alert('Agenda gerada com sucesso!');
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar agenda.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows: string[][] = [];
      Object.entries(availability).forEach(([date, locals]) => {
        Object.entries(locals).forEach(([localId, slots]) => {
          if (slots.length > 0) {
            rows.push([date, localId, slots.join(', ')]);
          }
        });
      });
      await updateSheetData('Horarios!A2:C', rows);
      alert('Horários salvos com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar horários.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#869471] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Agenda de Atendimentos</h1>
          <p className="text-slate-500 mt-2 font-medium">Configure seus horários disponíveis de forma intuitiva.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm flex">
            <button 
              onClick={() => setSelectedLocalId('online')}
              className={cn(
                "px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
                selectedLocalId === 'online' ? "bg-[#869471] text-white shadow-lg shadow-[#869471]/20" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Video className="w-4 h-4" /> Online
            </button>
            {locais.filter(l => !l.name.toLowerCase().includes('up2you')).map(l => (
              <button 
                key={l.id}
                onClick={() => setSelectedLocalId(l.id)}
                className={cn(
                  "px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
                  selectedLocalId === l.id ? "bg-[#869471] text-white shadow-lg shadow-[#869471]/20" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <MapPin className="w-4 h-4" /> {l.name}
              </button>
            ))}
          </div>

          <button 
            onClick={handleAutoGenerate}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-2xl font-bold shadow-xl shadow-amber-500/20 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Gerar Agenda Automática
          </button>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-[#869471] text-white rounded-2xl font-bold shadow-xl shadow-[#869471]/20 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
          >
            {saving ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-slate-100"
            >
              <ChevronLeft className="w-6 h-6 text-slate-400" />
            </button>
            <div className="text-center min-w-[200px]">
              <h2 className="text-2xl font-bold text-slate-800">
                {format(weekStart, "dd 'de' MMMM", { locale: ptBR })}
              </h2>
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest mt-1">Início da Semana</p>
            </div>
            <button 
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-slate-100"
            >
              <ChevronRight className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#869471] rounded-full" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded-full" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vazio</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          {weekDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const slots = (availability[dateStr] || {})[selectedLocalId] || [];
            const isToday = isSameDay(day, new Date());

            return (
              <div key={dateStr} className="space-y-4">
                <div className={cn(
                  "p-6 rounded-[2rem] text-center transition-all border",
                  isToday ? "bg-[#869471] border-[#869471] shadow-lg shadow-[#869471]/20 -translate-y-2" : "bg-slate-50/50 border-slate-100"
                )}>
                  <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isToday ? "text-white/60" : "text-slate-400")}>
                    {format(day, 'EEEE', { locale: ptBR }).split('-')[0]}
                  </p>
                  <p className={cn("text-2xl font-black", isToday ? "text-white" : "text-slate-800")}>
                    {format(day, 'dd')}
                  </p>
                </div>

                <div className="space-y-2">
                  {['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(time => {
                    const isSelected = slots.includes(time);
                    return (
                      <button
                        key={time}
                        onClick={() => isSelected ? removeSlot(dateStr, time) : addSlot(dateStr, time)}
                        className={cn(
                          "w-full py-4 rounded-2xl text-xs font-bold transition-all border",
                          isSelected 
                            ? "bg-[#869471] border-[#869471] text-white shadow-md" 
                            : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 flex items-center justify-center gap-2">
                  <button 
                    onClick={() => setShowBulkModal(dateStr)}
                    title="Adicionar vários"
                    className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-primary shadow-sm hover:text-white transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {idx > 0 && (
                    <button 
                      onClick={() => copyDay(format(weekDays[idx-1], 'yyyy-MM-dd'), dateStr)}
                      title="Copiar do dia anterior"
                      className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-primary shadow-sm hover:text-white transition-all"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => clearDay(dateStr)}
                    title="Limpar dia"
                    className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Adicionar Vários Horários</h3>
              <button onClick={() => setShowBulkModal(null)} className="p-2 hover:bg-slate-50 rounded-full">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Início</label>
                    <input 
                      type="time" 
                      value={bulkTime.start}
                      onChange={(e) => setBulkTime({...bulkTime, start: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary font-bold" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fim</label>
                    <input 
                      type="time" 
                      value={bulkTime.end}
                      onChange={(e) => setBulkTime({...bulkTime, end: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary font-bold" 
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Intervalo (minutos)</label>
                  <select 
                    value={bulkTime.interval}
                    onChange={(e) => setBulkTime({...bulkTime, interval: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary font-bold"
                  >
                     <option value="30">30 minutos</option>
                     <option value="45">45 minutos</option>
                     <option value="60">60 minutos</option>
                     <option value="90">90 minutos</option>
                     <option value="120">120 minutos</option>
                  </select>
               </div>

               <button 
                onClick={() => handleBulkAdd(showBulkModal)}
                className="w-full py-5 bg-[#869471] text-white rounded-[2rem] font-black shadow-xl shadow-[#869471]/20 uppercase tracking-widest text-xs"
               >
                 Gerar Horários do Dia
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100 flex items-start gap-4">
        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-amber-900 font-bold text-lg">Dica de Gestão</h4>
          <p className="text-amber-800/80 leading-relaxed max-w-2xl mt-1">
            Clique nos horários para ativar ou desativar. Use o botão de copiar para replicar rapidamente os horários do dia anterior. 
            Não se esqueça de clicar em <strong>Salvar Alterações</strong> no topo para confirmar.
          </p>
        </div>
      </div>
    </div>
  );
}
