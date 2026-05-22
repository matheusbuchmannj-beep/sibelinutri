import { useState, useEffect } from 'react';
import { fetchHorarios, updateSheetData, fetchLocais, fetchOccupiedSlots } from '../../lib/googleWorkspace';
import { format, addDays, startOfWeek, isSameDay, parse, getDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Clock, 
  Save, 
  MapPin, 
  Video, 
  Copy, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Sparkles, 
  Check, 
  Eye, 
  Coffee, 
  Info, 
  Trash 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Local } from '../../types';

// Standard common slots to offer as easy tap-to-add recommendations
const RECOMMENDATION_TIMES = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:05', '17:00', '18:00', '19:00', '20:00'
];

export default function Agenda() {
  const [availability, setAvailability] = useState<Record<string, Record<string, string[]>>>({});
  const [locais, setLocais] = useState<Local[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([]);
  const [selectedLocalId, setSelectedLocalId] = useState('online');
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Tracks initial database loaded hash to detect changes
  const [originalHash, setOriginalHash] = useState('');

  // Bulk Generator Fields
  const [bulkStart, setBulkStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bulkEnd, setBulkEnd] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [generatorLocalId, setGeneratorLocalId] = useState('online');
  const [generatorDays, setGeneratorDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  
  // Ultra-flexible shifts
  const [shiftStartHour, setShiftStartHour] = useState('08:00');
  const [shiftEndHour, setShiftEndHour] = useState('18:00');
  const [shiftInterval, setShiftInterval] = useState('60'); // minutes
  const [customIntervalValue, setCustomIntervalValue] = useState('');
  
  // Custom breaks
  const [hasLunchBreak, setHasLunchBreak] = useState(true);
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchEnd, setLunchEnd] = useState('13:30');

  // Single Day Quick Add manual inputs
  const [quickTimeInputs, setQuickTimeInputs] = useState<Record<string, string>>({});

  // Active view tabs
  const [showGeneratorPanel, setShowGeneratorPanel] = useState(false);

  // Non-blocking visual custom notifications & modal states (immune to sandboxed iframe browser limitations)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const askConfirmation = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmModal({
      ...options,
      isOpen: true
    });
  };

  useEffect(() => {
    async function load() {
      try {
        const [h, l, os] = await Promise.all([
          fetchHorarios().catch(() => ({})),
          fetchLocais().catch(() => []),
          fetchOccupiedSlots().catch(() => [])
        ]);

        const hasAppliedPresetBefore = localStorage.getItem('schedule_preset_applied_v6');

        if (!hasAppliedPresetBefore) {
          console.log('Detecting first load: Automatically seeding requested scales for online & sculptee');
          const updatedAvailability: Record<string, Record<string, string[]>> = {};
          
          const sculpteeLocal = l.find(lc => lc.name.toLowerCase().includes('sculpt'));
          const sculpteeId = sculpteeLocal ? sculpteeLocal.id : '4';

          const start = parse('2026-05-01', 'yyyy-MM-dd', new Date());
          const end = parse('2027-05-31', 'yyyy-MM-dd', new Date());
          let current = start;

          const onlineWeekdaySlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
          const onlineSaturdaySlots = ['09:00', '10:00', '11:00', '13:00', '14:00'];
          const sculpteeSlots = ['13:00', '14:30', '16:00', '17:30'];

          while (current <= end) {
            const dateStr = format(current, 'yyyy-MM-dd');
            const dayIdx = getDay(current);

            if (dayIdx >= 1 && dayIdx <= 5) {
              if (!updatedAvailability[dateStr]) {
                updatedAvailability[dateStr] = {};
              }
              updatedAvailability[dateStr]['online'] = [...onlineWeekdaySlots];

              if (dayIdx === 2 || dayIdx === 5) {
                updatedAvailability[dateStr][sculpteeId] = [...sculpteeSlots];
              }
            } else if (dayIdx === 6) {
              if (!updatedAvailability[dateStr]) {
                updatedAvailability[dateStr] = {};
              }
              updatedAvailability[dateStr]['online'] = [...onlineSaturdaySlots];
            }
            current = addDays(current, 1);
          }

          setAvailability(updatedAvailability);
          setLocais(l);
          setOccupiedSlots(os);
          setOriginalHash(JSON.stringify(updatedAvailability));

          // Directly sync to database in the background without user interaction
          const rows: string[][] = [];
          Object.entries(updatedAvailability).forEach(([date, locals]) => {
            Object.entries(locals).forEach(([localId, slots]) => {
              if (slots && slots.length > 0) {
                rows.push([date, localId, slots.join(', ')]);
              }
            });
          });
          await updateSheetData('Horarios!A2:C', rows);
          localStorage.setItem('schedule_preset_applied_v6', 'true');
          showToast('Sua agenda foi configurada automaticamente com os novos horários!');
        } else {
          setAvailability(h);
          setLocais(l);
          setOccupiedSlots(os);
          setOriginalHash(JSON.stringify(h));
        }

        const nonOnline = l.find(lc => lc.id !== 'online');
        if (nonOnline) {
          setGeneratorLocalId('online');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const weekDays = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(weekStart, i));

  // Determine if there are unsaved changes on the screen
  const hasUnsavedChanges = originalHash !== JSON.stringify(availability);

  const isSlotBooked = (date: string, time: string) => {
    return occupiedSlots.some(s => s.date === date && s.time === time && s.status !== 'Cancelado' && s.status !== 'Recusado');
  };

  // Helper function to calculate slots based on generator variables
  const calculateDerivedSlots = (): string[] => {
    const list: string[] = [];
    try {
      const interval = customIntervalValue ? parseInt(customIntervalValue) : parseInt(shiftInterval);
      if (isNaN(interval) || interval <= 0) return [];
      
      const startDateTime = parse(shiftStartHour, 'HH:mm', new Date());
      const endDateTime = parse(shiftEndHour, 'HH:mm', new Date());
      if (isBefore(endDateTime, startDateTime) || startDateTime.getTime() === endDateTime.getTime()) return [];

      let current = startDateTime;
      let safetyCount = 0;

      while (current <= endDateTime && safetyCount < 100) {
        safetyCount++;
        const timeStr = format(current, 'HH:mm');

        let isBlocked = false;
        if (hasLunchBreak && lunchStart && lunchEnd) {
          const lStart = parse(lunchStart, 'HH:mm', new Date());
          const lEnd = parse(lunchEnd, 'HH:mm', new Date());
          if (current >= lStart && current < lEnd) {
            isBlocked = true;
          }
        }

        if (!isBlocked) {
          list.push(timeStr);
        }

        current = new Date(current.getTime() + interval * 60 * 1000);
      }
    } catch {
      return [];
    }
    return list;
  };

  // Synchronizes state to Firestore / backend
  const syncToDatabase = async (availToSave: Record<string, Record<string, string[]>>) => {
    const rows: string[][] = [];
    Object.entries(availToSave).forEach(([date, locals]) => {
      Object.entries(locals).forEach(([localId, slots]) => {
        if (slots && slots.length > 0) {
          rows.push([date, localId, slots.join(', ')]);
        }
      });
    });
    await updateSheetData('Horarios!A2:C', rows);
    setOriginalHash(JSON.stringify(availToSave));
  };

  // Generates recurrent slots dynamically based on rules configuration
  const handleBulkGenerate = async () => {
    const generatedSlots = calculateDerivedSlots();
    if (generatedSlots.length === 0) {
      showToast('A configuração de horários fornecida é inválida. Verifique hora e intervalo.', 'error');
      return;
    }
    if (generatorDays.length === 0) {
      showToast('Selecione pelo menos um dia da semana para aplicar.', 'error');
      return;
    }

    setSaving(true);
    try {
      const start = parse(bulkStart, 'yyyy-MM-dd', new Date());
      const end = parse(bulkEnd, 'yyyy-MM-dd', new Date());
      
      if (isBefore(end, start)) {
        showToast('A data de término não pode ser anterior à data de início.', 'error');
        setSaving(false);
        return;
      }

      // Safe Deep Copy to avoid mutating existing nested references
      const updatedAvailability = JSON.parse(JSON.stringify(availability));
      let current = start;

      while (current <= end) {
        const dayOfWeekIndex = getDay(current); // 0 = Sunday, 1 = Monday ...
        
        if (generatorDays.includes(dayOfWeekIndex)) {
          const dateStr = format(current, 'yyyy-MM-dd');
          if (!updatedAvailability[dateStr]) {
            updatedAvailability[dateStr] = {};
          }
          // SUBSTITUTE instead of merging, sorted just in case
          updatedAvailability[dateStr][generatorLocalId] = [...generatedSlots].sort();
        }

        current = addDays(current, 1);
      }

      setAvailability(updatedAvailability);
      await syncToDatabase(updatedAvailability);
      setShowGeneratorPanel(false);
      showToast(`Grade programada com sucesso para o período! ${generatedSlots.length} horários aplicados.`);
    } catch (e) {
      console.error(e);
      showToast('Erro inesperado ao gerar os horários da escala.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Safe clean up tool that purges the schedules inside a specific period for a specific location
  const handleBulkPurge = async () => {
    askConfirmation({
      title: 'Limpar Período',
      message: `Deseja realmente REMOVER TODOS os horários de atendimento de ${bulkStart} até ${bulkEnd} para o local selecionado? Isso salvará diretamente no banco de dados.`,
      confirmText: 'Limpar Horários',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setSaving(true);
        try {
          const start = parse(bulkStart, 'yyyy-MM-dd', new Date());
          const end = parse(bulkEnd, 'yyyy-MM-dd', new Date());
          
          if (isBefore(end, start)) {
            showToast('Período de término inválido.', 'error');
            setSaving(false);
            return;
          }

          // Safe Deep Copy
          const updatedAvailability = JSON.parse(JSON.stringify(availability));
          let current = start;

          while (current <= end) {
            const dateStr = format(current, 'yyyy-MM-dd');
            if (updatedAvailability[dateStr]) {
              if (updatedAvailability[dateStr][generatorLocalId]) {
                delete updatedAvailability[dateStr][generatorLocalId];
              }
              if (Object.keys(updatedAvailability[dateStr]).length === 0) {
                delete updatedAvailability[dateStr];
              }
            }
            current = addDays(current, 1);
          }

          setAvailability(updatedAvailability);
          await syncToDatabase(updatedAvailability);
          showToast('Todos os horários do período selecionado foram removidos!');
        } catch (e) {
          console.error(e);
          showToast('Erro ao limpar os horários.', 'error');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // Safe cleaner that wipes absolutely everything across all locations and dates in the system
  const handleClearAllSchedule = async () => {
    askConfirmation({
      title: '🚨 Limpar Toda a Agenda',
      message: 'ATENÇÃO MÁXIMA: Deseja realmente APAGAR ABSOLUTAMENTE TODOS os horários cadastrados na sua agenda em todas as localidades e datas do sistema? Esta ação limpará de forma irreversível do banco de dados.',
      confirmText: 'Sim, Apagar Tudo',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setSaving(true);
        try {
          setAvailability({});
          await updateSheetData('Horarios!A2:C', []);
          setOriginalHash(JSON.stringify({}));
          showToast('Toda a sua agenda foi apagada com sucesso do banco de dados!');
        } catch (e) {
          console.error(e);
          showToast('Erro ao apagar toda a sua agenda.', 'error');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const addSlot = (date: string, time: string) => {
    // Validates time format HH:mm
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      showToast('Formato de hora inválido! Por favor, utilize HH:MM (ex: 14:30).', 'error');
      return;
    }

    const updatedAvail = JSON.parse(JSON.stringify(availability));
    if (!updatedAvail[date]) {
      updatedAvail[date] = {};
    }
    const slots = updatedAvail[date][selectedLocalId] || [];
    if (slots.includes(time)) return;
    
    updatedAvail[date][selectedLocalId] = [...slots, time].sort();
    setAvailability(updatedAvail);
  };

  const removeSlot = (date: string, time: string) => {
    const updatedAvail = JSON.parse(JSON.stringify(availability));
    if (updatedAvail[date]) {
      const slots = (updatedAvail[date][selectedLocalId] || []).filter((s: string) => s !== time);
      updatedAvail[date][selectedLocalId] = slots;
      
      if (slots.length === 0) {
        delete updatedAvail[date][selectedLocalId];
      }
      if (Object.keys(updatedAvail[date]).length === 0) {
        delete updatedAvail[date];
      }
    }
    setAvailability(updatedAvail);
  };

  const copyDay = (from: string, to: string) => {
    const fromAvail = availability[from]?.[selectedLocalId] || [];
    if (fromAvail.length === 0) {
      showToast('O dia anterior não possui horários para copiar.', 'error');
      return;
    }
    
    const updatedAvail = JSON.parse(JSON.stringify(availability));
    if (!updatedAvail[to]) {
      updatedAvail[to] = {};
    }
    updatedAvail[to][selectedLocalId] = [...fromAvail];
    setAvailability(updatedAvail);
  };

  const clearDay = (date: string) => {
    askConfirmation({
      title: 'Limpar Dia',
      message: 'Deseja excluir todos os horários planejados para este dia na localidade ativa?',
      confirmText: 'Limpar Dia',
      cancelText: 'Cancelar',
      onConfirm: () => {
        const updatedAvail = JSON.parse(JSON.stringify(availability));
        if (updatedAvail[date]) {
          delete updatedAvail[date][selectedLocalId];
          if (Object.keys(updatedAvail[date]).length === 0) {
            delete updatedAvail[date];
          }
        }
        setAvailability(updatedAvail);
        showToast('Dia limpo na sua visualização! Lembre de salvar.', 'info');
      }
    });
  };

  // Restores standard schedule Seg-Sex 9h-20h, Sab 9h-15h manually
  const handleAutoGenerate = async () => {
    askConfirmation({
      title: 'Gerar Horários Padrão',
      message: 'Deseja carregar a predefinição rápida de horários padrão (Seg-Sex 9h-19h, Sab 9h-13h) na escala visual do mês corrente? Você precisará clicar em Salvar Alterações ao finalizar.',
      confirmText: 'Carregar Grade',
      cancelText: 'Cancelar',
      onConfirm: () => {
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 });
        const updatedAvailability = { ...availability };

        for (let i = 0; i < 45; i++) {
          const current = addDays(start, i);
          const dateStr = format(current, 'yyyy-MM-dd');
          const dayIdx = getDay(current);

          if (dayIdx === 0) continue; // Sunday skips

          let slots: string[] = [];
          if (dayIdx === 6) {
            slots = ['09:00', '10:00', '11:00', '12:00', '13:00'];
          } else {
            slots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
          }

          if (!updatedAvailability[dateStr]) {
            updatedAvailability[dateStr] = {};
          }
          updatedAvailability[dateStr][selectedLocalId] = slots;
        }

        setAvailability(updatedAvailability);
        showToast('Grade padrão rápida carregada! Agora salve no botão correspondente.', 'info');
      }
    });
  };

  // Automated preset wizard applying the EXACT requested schedule configuration of the user
  const handleApplyRequestedPreset = async () => {
    askConfirmation({
      title: 'Configurar Suas Escalas ✨',
      message: 'Você deseja APAGAR TODOS os horários antigos e aplicar a sua nova escala personalizada?\n\n- Online: seg-sex 9h às 19h (com almoço) e sábado 9h às 15h (com almoço).\n- Sculptée Estética: ter e sex começando às 13h (consultas de 1h30, último início às 17h30).\n- Ânima e Up2You: sem escalas.',
      confirmText: 'Confirmar & Aplicar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setSaving(true);
        try {
          const updatedAvailability: Record<string, Record<string, string[]>> = {};

          // Find the Sculptée local ID dynamically to avoid hardcoding errors
          const sculpteeLocal = locais.find(l => l.name.toLowerCase().includes('sculpt'));
          const sculpteeId = sculpteeLocal ? sculpteeLocal.id : '4';

          // Define standard start and end days for generating the routine (for 2026/05 through 1 year ahead)
          const start = parse('2026-05-01', 'yyyy-MM-dd', new Date());
          const end = parse('2027-05-31', 'yyyy-MM-dd', new Date());
          let current = start;

          // Online Weekday slots (09:00 to 19:00, 1h appointment, lunch pause). 
          // Safe slot starts: 09:00, 10:00, 11:00 (Lunch 12:00 - 13:00), 13:00, 14:00, 15:00, 16:00, 17:00, 18:00.
          const onlineWeekdaySlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

          // Online Saturday slots (09:00 to 15:00, 1h lunch break).
          // Safe slot starts: 09:00, 10:00, 11:00 (Lunch 12:00 - 13:00), 13:00, 14:00.
          const onlineSaturdaySlots = ['09:00', '10:00', '11:00', '13:00', '14:00'];

          // Sculptée Tuesday and Friday slots (starts at 13h, 1h30 slot, last slot 17h30).
          // Safe slot starts: 13:00, 14:30, 16:00, 17:30.
          const sculpteeSlots = ['13:00', '14:30', '16:00', '17:30'];

          while (current <= end) {
            const dateStr = format(current, 'yyyy-MM-dd');
            const dayIdx = getDay(current); // 0 = Sunday, 1 = Monday ...

            if (dayIdx >= 1 && dayIdx <= 5) {
              // Monday to Friday
              if (!updatedAvailability[dateStr]) {
                updatedAvailability[dateStr] = {};
              }
              // Online is active
              updatedAvailability[dateStr]['online'] = [...onlineWeekdaySlots];

              // Sculptée is active ONLY on Tuesday (2) and Friday (5)
              if (dayIdx === 2 || dayIdx === 5) {
                updatedAvailability[dateStr][sculpteeId] = [...sculpteeSlots];
              }
            } else if (dayIdx === 6) {
              // Saturday
              if (!updatedAvailability[dateStr]) {
                updatedAvailability[dateStr] = {};
              }
              // Online is active
              updatedAvailability[dateStr]['online'] = [...onlineSaturdaySlots];
            }

            current = addDays(current, 1);
          }

          setAvailability(updatedAvailability);
          await syncToDatabase(updatedAvailability);
          showToast('Sua escala personalizada foi totalmente sincronizada e gravada com sucesso!');
        } catch (e) {
          console.error(e);
          showToast('Erro ao aplicar a escala personalizada.', 'error');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // Sync state to backend (Firestore & Sheets fallback)
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
      
      // Sync local original hash tracker
      setOriginalHash(JSON.stringify(availability));
      showToast('Sua escala de trabalho e disponibilidade foram salvas com sucesso!');
    } catch (e) {
      console.error(e);
      showToast('Erro ao gravar os horários configurados.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const previewSlots = calculateDerivedSlots();

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header and top commands */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#869471]/10 rounded-full font-bold text-xs text-[#869471] tracking-wide uppercase">Gestão da Clínica</span>
            {hasUnsavedChanges && (
              <span className="animate-pulse px-3 py-1 bg-amber-500/10 text-amber-700 rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Alterações pendentes de salvamento
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-2">Agenda do Profissional</h1>
          <p className="text-slate-500 mt-2 font-medium">Crie sua escala de horários em massa ou configure datas específicas de forma intuitiva.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Locations Filters buttons */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center flex-wrap gap-1">
            <button 
              onClick={() => setSelectedLocalId('online')}
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                selectedLocalId === 'online' ? "bg-white text-slate-800 shadow" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Video className="w-4 h-4 text-[#869471]" /> Online
            </button>
            {locais.filter(l => l.id !== 'online').map(l => (
              <button 
                key={l.id}
                onClick={() => setSelectedLocalId(l.id)}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                  selectedLocalId === l.id ? "bg-white text-slate-800 shadow" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <MapPin className="w-4 h-4 text-[#869471]" /> {l.name}
              </button>
            ))}
          </div>

          <button 
            type="button" 
            onClick={handleApplyRequestedPreset}
            disabled={saving}
            className="px-5 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/90 font-black text-xs uppercase tracking-widest rounded-2xl border border-indigo-100 flex items-center gap-2 transition-all shadow-sm"
            title="Aplica a configuração exata solicitada (Online de Seg-Sáb e Ter/Sex na clínica Sculptée)"
          >
            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> Configurar Minha Escala ✨
          </button>

          <button 
            type="button"
            onClick={handleAutoGenerate}
            className="px-4 py-3 bg-amber-50 text-amber-700 font-bold text-xs rounded-xl hover:bg-amber-100 transition-all border border-amber-100"
            title="Preencher rapidamente o calendário com a rotina padrão semanal"
          >
            Escala Padrão Seg-Sex
          </button>

          <button 
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
              hasUnsavedChanges 
                ? "bg-[#869471] text-white shadow-xl shadow-[#869471]/20 scale-102 hover:scale-[1.04]"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            )}
          >
            {saving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Gravando...' : 'Salvar Alterações'}
          </button>

          <button 
            type="button"
            onClick={handleClearAllSchedule}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-700 hover:bg-red-100/85 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-red-100"
            title="Exclui absolutamente todos os horários de todas as salas da agenda de forma definitiva"
          >
            <Trash2 className="w-4 h-4 text-red-500" /> Limpar Tudo
          </button>
        </div>
      </div>

      {/* RETHINKED BULK CONFIGURATOR WIDGET */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <button 
          onClick={() => setShowGeneratorPanel(!showGeneratorPanel)}
          className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#869471]/10 rounded-2xl flex items-center justify-center text-[#869471]">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Gerador em Lote & Ferramenta de Limpeza</h3>
              <p className="text-xs text-slate-400 mt-1">Defina escalas de horários com total personalização, ou remova horários em lote de um período.</p>
            </div>
          </div>
          <span className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-xs text-slate-500">
            {showGeneratorPanel ? 'Fechar Painel' : 'Configurar em Lote'}
          </span>
        </button>

        {showGeneratorPanel && (
          <div className="border-t border-slate-100 bg-slate-50/20 p-8 md:p-10 space-y-8 animate-in fade-in duration-300">
            
            {/* Step 1: Configurar Período e Localidade */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-[2rem] border border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-[#869471] tracking-widest block">PASSO 1</span>
                <h4 className="text-sm font-bold text-slate-800">Período e Localização</h4>
                <p className="text-xs text-slate-400 leading-normal">Escolha a localidade e quais datas vão receber a regra configurada.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Local para aplicar:</label>
                <select 
                  value={generatorLocalId}
                  onChange={(e) => setGeneratorLocalId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-xs"
                >
                  <option value="online">Online (Videochamada)</option>
                  {locais.filter(l => l.id !== 'online').map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1 block">Data Início:</label>
                  <input 
                    type="date" 
                    value={bulkStart}
                    onChange={(e) => setBulkStart(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1 block">Data Fim:</label>
                  <input 
                    type="date" 
                    value={bulkEnd}
                    onChange={(e) => setBulkEnd(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Escolha de Dias da Semana */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white p-6 rounded-[2rem] border border-slate-100">
              <div className="md:col-span-4 space-y-1">
                <span className="text-[10px] font-black uppercase text-[#869471] tracking-widest block">PASSO 2</span>
                <h4 className="text-sm font-bold text-slate-800">Dias da Semana</h4>
                <p className="text-xs text-slate-400 leading-normal">Ative os dias que deseja replicar no período.</p>
                
                {/* Short Preset Actions */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setGeneratorDays([1, 2, 3, 4, 5])}
                    className="text-[10px] font-bold bg-[#869471]/10 px-2 py-1 rounded text-[#869471]"
                  >
                    Seg-Sex
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setGeneratorDays([2, 4])}
                    className="text-[10px] font-bold bg-[#869471]/10 px-2 py-1 rounded text-[#869471]"
                  >
                    Ter e Qui
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setGeneratorDays([1, 3, 5])}
                    className="text-[10px] font-bold bg-[#869471]/10 px-2 py-1 rounded text-[#869471]"
                  >
                    Seg/Qua/Sex
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setGeneratorDays([6])}
                    className="text-[10px] font-bold bg-amber-500/10 px-2 py-1 rounded text-amber-700"
                  >
                    Sábado
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setGeneratorDays([])}
                    className="text-[10px] font-bold bg-rose-500/10 px-2 py-1 rounded text-rose-600"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="md:col-span-8 flex justify-center">
                <div className="grid grid-cols-7 gap-2 w-full">
                  {[
                    { id: 1, name: 'S', full: 'Segunda-feira' },
                    { id: 2, name: 'T', full: 'Terça-feira' },
                    { id: 3, name: 'Q', full: 'Quarta-feira' },
                    { id: 4, name: 'Q', full: 'Quinta-feira' },
                    { id: 5, name: 'S', full: 'Sexta-feira' },
                    { id: 6, name: 'S', full: 'Sábado' },
                    { id: 0, name: 'D', full: 'Domingo' }
                  ].map(day => {
                    const active = generatorDays.includes(day.id);
                    return (
                      <button 
                        key={day.id}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setGeneratorDays(generatorDays.filter(x => x !== day.id));
                          } else {
                            setGeneratorDays([...generatorDays, day.id]);
                          }
                        }}
                        className={cn(
                          "w-11 h-11 rounded-full flex items-center justify-center font-black text-xs border transition-all",
                          active 
                            ? "bg-[#869471] border-[#869471] text-white shadow-md shadow-[#869471]/20 scale-105" 
                            : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
                        )}
                        title={day.full}
                      >
                        {day.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 3: CUSTOMIZAR HORARIOS DOS TURNOS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form de Parametrização */}
              <div className="lg:col-span-7 bg-white p-6 rounded-[2rem] border border-slate-100 space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#869471] tracking-widest block">PASSO 3</span>
                  <h4 className="text-base font-bold text-slate-800">Parâmetros de Geração</h4>
                  <p className="text-xs text-slate-400 leading-normal">Defina com precisão o início e fim da sua jornada de trabalho. Escreva qualquer intervalo e intervalo de descanso almoço.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Início da Escala:</label>
                    <input 
                      type="time" 
                      value={shiftStartHour}
                      onChange={(e) => setShiftStartHour(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Término da Escala:</label>
                    <input 
                      type="time" 
                      value={shiftEndHour}
                      onChange={(e) => setShiftEndHour(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Intervalo / Frequência:</label>
                    <select 
                      value={shiftInterval}
                      onChange={(e) => {
                        setShiftInterval(e.target.value);
                        if (e.target.value !== 'custom') setCustomIntervalValue('');
                      }}
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-700"
                    >
                      <option value="30">A cada 30 minutos</option>
                      <option value="40">A cada 40 minutos</option>
                      <option value="50">A cada 50 minutos</option>
                      <option value="60">A cada 60 minutos (1 hora)</option>
                      <option value="90">A cada 90 minutos (1h30)</option>
                      <option value="120">A cada 120 minutos (2 horas)</option>
                      <option value="custom">Valor Personalizado...</option>
                    </select>
                  </div>

                  {shiftInterval === 'custom' && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Intervalo Personalizado (minutos):</label>
                      <input 
                        type="number"
                        placeholder="Ex: 45 ou 75"
                        value={customIntervalValue}
                        onChange={(e) => setCustomIntervalValue(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-700 font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Lunch Break settings */}
                <div className="pt-2 border-t border-slate-100 space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hasLunchBreak}
                      onChange={(e) => setHasLunchBreak(e.target.checked)}
                      className="w-4 h-4 text-[#869471] border-slate-200 rounded focus:ring-0"
                    />
                    <span className="text-xs font-bold text-slate-600">Pular horários durante o almoço/pausa</span>
                  </label>

                  {hasLunchBreak && (
                    <div className="grid grid-cols-2 gap-3 pl-6 animate-in slide-in-from-left-2 duration-200">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1 block">Início da pausa:</label>
                        <input 
                          type="time" 
                          value={lunchStart}
                          onChange={(e) => setLunchStart(e.target.value)}
                          className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1 block">Fim da pausa:</label>
                        <input 
                          type="time" 
                          value={lunchEnd}
                          onChange={(e) => setLunchEnd(e.target.value)}
                          className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold font-mono outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE MATHEMATICAL SLOTS PREVIEW & CONFIRM ACTIONS */}
              <div className="lg:col-span-5 bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-1">
                    <Coffee className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Visualização Prévia (Live Preview)</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mt-1">Horários Calculados</h4>
                  <p className="text-xs text-slate-400 leading-normal">Estes horários serão programados na sua escala para as datas do período selecionado:</p>
                </div>

                <div className="flex-1 bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 overflow-y-auto max-h-[140px] flex flex-wrap gap-1.5">
                  {previewSlots.length > 0 ? (
                    previewSlots.map(time => (
                      <span 
                        key={time} 
                        className="px-2.5 py-1 bg-white border border-slate-200 text-xs font-extrabold text-slate-700 rounded-lg shadow-sm"
                      >
                        {time}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">Insira horários de início e fim válidos para que possamos calcular as sessões.</span>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button 
                      type="button"
                      onClick={handleBulkGenerate}
                      className="flex-1 py-4 bg-[#869471] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow hover:scale-[1.01] active:scale-95 transition-all text-center"
                    >
                      Gerar Escala no Período
                    </button>

                    <button 
                      type="button"
                      onClick={handleBulkPurge}
                      className="px-4 py-4 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 hover:text-rose-700 transition-all text-center border border-rose-100 shadow-sm"
                      title="Apaga todos os horários correspondentes de forma segura no período fornecido"
                    >
                      Remover Escala do Período
                    </button>
                  </div>
                  
                  <span className="text-[9px] text-[#869471] block leading-normal text-center font-bold">
                    ⚠️ Importante: Isto apenas atualiza provisoriamente em tela. Salve no topo para gravar no banco.
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* WORKWEEK AGENDA CONTAINER */}
      <div className="bg-white rounded-[3rem] p-6 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/40">
        
        {/* Navigation controls around the week */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
              title="Semana Anterior"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="text-center min-w-[200px]">
              <h2 className="text-xl font-black text-slate-800">
                {format(weekStart, "dd 'de' MMMM", { locale: ptBR })}
              </h2>
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Semana do Atendimento</p>
            </div>
            <button 
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
              title="Próxima Semana"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#869471] rounded-full" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ativo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-600 rounded-full" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Agendado por Paciente</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 border border-dashed border-slate-300 rounded-full" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Disponível p/ Abrir</span>
            </div>
          </div>
        </div>

        {/* The 7 Days columns stack */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          {weekDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const daySlots = (availability[dateStr] || {})[selectedLocalId] || [];
            const isToday = isSameDay(day, new Date());
            const quickInputVal = quickTimeInputs[dateStr] || '';

            return (
              <div 
                key={dateStr} 
                className={cn(
                  "flex flex-col rounded-3xl border transition-all p-4 space-y-4",
                  isToday 
                    ? "bg-[#869471]/5 border-[#869471] ring-2 ring-[#869471]/10" 
                    : "bg-slate-50/20 border-slate-100 hover:border-slate-200"
                )}
              >
                {/* Day Header */}
                <div className="text-center pb-2 border-b border-slate-100">
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    isToday ? "text-[#869471]" : "text-slate-400"
                  )}>
                    {format(day, 'EEEE', { locale: ptBR }).split('-')[0]}
                  </p>
                  <p className={cn(
                    "text-xl font-black mt-0.5",
                    isToday ? "text-[#869471]" : "text-slate-700"
                  )}>
                    {format(day, 'dd/MM')}
                  </p>
                </div>

                {/* Slots Stack */}
                <div className="flex-1 space-y-2 min-h-[220px]">
                  {daySlots.length > 0 ? (
                    daySlots.map(time => {
                      const isBooked = isSlotBooked(dateStr, time);
                      return (
                        <div 
                          key={time}
                          className={cn(
                            "group w-full p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between shadow-sm",
                            isBooked 
                              ? "bg-amber-100/50 border-amber-300 text-amber-900" 
                              : "bg-white border-slate-100 text-slate-700 hover:border-red-200"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-extrabold">{time}</span>
                            {isBooked && (
                              <span className="text-[8px] uppercase font-black text-amber-700 tracking-widest">Agendado</span>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (isBooked) {
                                askConfirmation({
                                  title: 'Atenção: Horário com Paciente!',
                                  message: 'Atenção: Este horário possui um paciente ativo agendado! Remover o horário não cancelará a consulta automaticamente na agenda, mas impedirá novas reservas. Deseja prosseguir de qualquer forma?',
                                  confirmText: 'Sim, Remover',
                                  cancelText: 'Cancelar',
                                  onConfirm: () => {
                                    removeSlot(dateStr, time);
                                  }
                                });
                              } else {
                                removeSlot(dateStr, time);
                              }
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all text-[11px] font-black"
                            title="Remover horário"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-slate-300 italic text-[11px] flex flex-col items-center justify-center space-y-1">
                      <span>Sem escalas</span>
                      <span>abertas</span>
                    </div>
                  )}

                  {/* Recommendations offer (fast click to open slots) */}
                  <div className="pt-3 border-t border-slate-100 space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-300 tracking-wider block">Sugestões (Toque p/ Abrir):</span>
                    <div className="flex flex-wrap gap-1 max-h-[70px] overflow-y-auto p-1 bg-white rounded-lg">
                      {RECOMMENDATION_TIMES.map(time => {
                        const isOpened = daySlots.includes(time);
                        if (isOpened) return null;
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => addSlot(dateStr, time)}
                            className="px-1.5 py-0.5 bg-slate-50 hover:bg-[#869471]/10 hover:text-[#869471] rounded text-[9px] font-bold text-slate-400 text-center transition-all border border-transparent hover:border-[#869471]/20"
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Day level action icons / manual extra inputs */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  
                  {/* Enter individual customized encaixe */}
                  <div className="flex items-center gap-1">
                    <input 
                      type="text" 
                      placeholder="HH:mm"
                      value={quickInputVal}
                      onChange={(e) => setQuickTimeInputs({
                        ...quickTimeInputs,
                        [dateStr]: e.target.value
                      })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addSlot(dateStr, quickInputVal);
                          setQuickTimeInputs({ ...quickTimeInputs, [dateStr]: '' });
                        }
                      }}
                      className="w-full text-[10px] font-bold p-1.5 border border-slate-200 outline-none rounded-lg text-slate-700 bg-white"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        addSlot(dateStr, quickInputVal);
                        setQuickTimeInputs({ ...quickTimeInputs, [dateStr]: '' });
                      }}
                      className="p-1 px-1.5 bg-slate-100 hover:bg-[#869471] hover:text-white rounded-lg font-bold text-xs"
                      title="Clique para adicionar encaixe avulso"
                    >
                      +
                    </button>
                  </div>

                  {/* Actions for duplicate copy or clear day */}
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    {idx > 0 && (
                      <button 
                        type="button"
                        onClick={() => copyDay(format(weekDays[idx - 1], 'yyyy-MM-dd'), dateStr)}
                        className="flex items-center gap-1 text-slate-400 hover:text-[#869471] font-bold transition-colors"
                        title="Clona todos os horários cadastrados no dia correspondente anterior"
                      >
                        <Copy className="w-3 h-3" /> Copiar anterior
                      </button>
                    )}
                    
                    <button 
                      type="button"
                      onClick={() => clearDay(dateStr)}
                      className="flex items-center gap-1 text-slate-400 hover:text-red-500 font-bold transition-colors ml-auto"
                      title="Wipa toda a escala configurada deste dia"
                    >
                      <Trash className="w-3 h-3" /> Limpar dia
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Info card box */}
      <div className="bg-slate-50 border border-slate-200/50 rounded-[2rem] p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="p-3 bg-white border border-slate-100 text-[#869471] rounded-2xl">
          <Info className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h4 className="text-slate-800 font-bold text-sm">💡 Dica de Utilização da Grade</h4>
          <p className="text-slate-500 text-xs mt-1 leading-normal">
            Você pode clicar nos horários na grade para excluí-los rapidamente. Use as sugestões listadas em cada coluna de dia para abrir horários comuns em um único toque. Após modificar, certifique-se de clicar no botão <strong className="text-slate-700">"Salvar Alterações"</strong> no cabeçalho superior para que suas atualizações apareçam no site público para seus pacientes.
          </p>
        </div>
      </div>

      {/* Elegante Modal de Confirmação Customizado (Substitui window.confirm bloqueado no iFrame) */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6 transform scale-100 transition-transform">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <Info className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">{confirmModal.title}</h3>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-xs transition-colors border border-transparent"
              >
                {confirmModal.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const cb = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await cb();
                }}
                className="px-5 py-2.5 bg-[#869471] hover:bg-[#869471]/95 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                {confirmModal.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert Customizado */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
          <div className={cn(
            "p-2 rounded-xl text-xs",
            toast.type === 'success' ? "bg-emerald-500/10 text-emerald-400" :
            toast.type === 'error' ? "bg-red-500/10 text-red-400" : "bg-indigo-500/10 text-indigo-400"
          )}>
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold leading-normal">{toast.message}</p>
          </div>
          <button 
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white font-medium text-xs px-1"
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
}
