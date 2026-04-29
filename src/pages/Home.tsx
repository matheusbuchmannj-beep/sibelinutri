import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, MessageCircle, MapPin, Video, 
  Calendar as CalendarIcon, Clock, CheckCircle, X,
  ArrowRight, Info, LayoutGrid, Heart, Stethoscope, Sparkles,
  ChevronRight, ArrowLeft, Mail, Check, User
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, addDays, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  fetchSettings, fetchLocais, fetchHorarios, saveAgendamento, 
  fetchOccupiedSlots 
} from '../lib/googleWorkspace';
import { Settings, Local, Booking } from '../types';

const PLANS_PRESENCIAL = [
  { 
    id: 'trimestral',
    name: 'Trimestral', 
    tag: 'Presencial · 3 meses',
    price: '3x de R$300,00 sem juros',
    vista: 'ou R$900,00 à vista',
    features: [
      '3 consultas presenciais (1/mês)',
      'Avaliação física em todas as consultas',
      'Plano alimentar personalizado com ajustes mensais',
      'Suporte via WhatsApp',
      'Análise de exames (quando necessário)',
      'Material de apoio (orientações práticas)'
    ]
  },
  { 
    id: 'semestral',
    name: 'Semestral', 
    tag: 'Presencial · 6 meses',
    price: '6x de R$290,00 sem juros',
    vista: 'ou R$1.740,00 à vista',
    popular: true,
    badge: 'Mais popular',
    features: [
      '6 consultas presenciais (1/mês)',
      'Avaliação física mensal',
      'Plano alimentar com ajustes contínuos',
      'Suporte via WhatsApp com acompanhamento mais próximo',
      'Análise de exames (quando necessário)',
      'Materiais de apoio (receitas e orientações práticas)'
    ]
  },
  { 
    id: 'anual',
    name: 'Anual', 
    tag: 'Presencial · 12 meses',
    price: '12x de R$280,00 sem juros',
    vista: 'ou R$3.360,00 à vista',
    features: [
      '12 consultas presenciais (1/mês)',
      'Avaliação física completa e acompanhamento contínuo',
      'Plano alimentar sempre atualizado',
      'Suporte prioritário via WhatsApp',
      'Análise de exames + estratégia nutricional completa',
      'Materiais completos de apoio'
    ]
  }
];

const PLANS_ONLINE = [
  { 
    id: 'trimestral',
    name: 'Trimestral', 
    tag: 'Online · 3 meses',
    price: '3x de R$250,00 sem juros',
    vista: 'ou R$750,00 à vista',
    features: [
      '3 consultas online (1/mês)',
      'Plano alimentar personalizado com ajustes mensais',
      'Suporte via WhatsApp',
      'Análise de exames (quando necessário)',
      'Material de apoio'
    ]
  },
  { 
    id: 'semestral',
    name: 'Semestral', 
    tag: 'Online · 6 meses',
    price: '6x de R$240,00 sem juros',
    vista: 'ou R$1.440,00 à vista',
    popular: true,
    badge: 'Mais popular',
    features: [
      '6 consultas online (1/mês)',
      'Plano alimentar com ajustes contínuos',
      'Suporte via WhatsApp com acompanhamento mais próximo',
      'Análise de exames (quando necessário)',
      'Materiais de apoio'
    ]
  },
  { 
    id: 'anual',
    name: 'Anual', 
    tag: 'Online · 12 meses',
    price: '12x de R$230,00 sem juros',
    vista: 'ou R$2.760,00 à vista',
    features: [
      '12 consultas online (1/mês)',
      'Plano alimentar sempre atualizado',
      'Suporte prioritário via WhatsApp',
      'Análise de exames + estratégia nutricional',
      'Materiais completos de apoio'
    ]
  }
];

const INDIVIDUAL_CONSULTATION = {
  presencial: {
    tag: 'Presencial · no consultório',
    title: 'Consulta Avulsa',
    price: 'R$280,00 — por consulta',
    features: [
      'Consulta individual (60 minutos)',
      'Anamnese alimentar e avaliação física',
      'Aferições corporais (peso, medidas e bioimpedância)',
      'Plano alimentar personalizado (entregue em até 48h)',
      'Orientações práticas para rotina alimentar',
      'Suporte via WhatsApp por 5 dias após a consulta'
    ]
  },
  online: {
    tag: 'Online · via videochamada',
    title: 'Consulta Avulsa',
    price: 'R$230,00 — por consulta',
    features: [
      'Consulta individual (60 minutos)',
      'Anamnese alimentar completa e análise do histórico de saúde',
      'Plano alimentar personalizado enviado em até 48h',
      'Orientações práticas para rotina alimentar',
      'Suporte via WhatsApp por 5 dias após a consulta'
    ]
  }
};

export default function Home() {
  const [view, setView] = useState<'start' | 'booking' | 'landing'>('landing');
  const [mode, setMode] = useState<'presencial' | 'online' | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [locais, setLocais] = useState<Local[]>([]);
  const [availability, setAvailability] = useState<Record<string, Record<string, string[]>>>({});
  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Flow State
  const [step, setStep] = useState(1);
  const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', whatsapp: '' });
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'link'>('pix');

  const [isBooking, setIsBooking] = useState(false);
  const [lastBookingUrl, setLastBookingUrl] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [s, l, h, os] = await Promise.all([
          fetchSettings().catch(e => { console.error(e); return null; }),
          fetchLocais().catch(e => { console.error(e); return []; }),
          fetchHorarios().catch(e => { console.error(e); return {}; }),
          fetchOccupiedSlots().catch(e => { console.error(e); return []; })
        ]);
        
        // We need at least settings to show something meaninful, 
        // but fetchSettings already has a fallback to DEFAULT_SETTINGS inside.
        if (s) setSettings(s);
        setLocais(l || []);
        setAvailability(h || {});
        setOccupiedSlots(os || []);
      } catch (e) {
        console.error('Failed to load site data', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const isSlotBooked = (date: string, time: string) => {
    return occupiedSlots.some(s => s.date === date && s.time === time && s.status !== 'Cancelado');
  };

  const getSlotsForDate = (date: string, localId: string) => {
    const dayAvail = availability[date] || {};
    const slots = dayAvail[localId] || [];
    
    // Filter booked slots
    let filteredSlots = slots.filter(s => !isSlotBooked(date, s));
    
    // Filter past slots for today
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (date === todayStr) {
      const now = new Date();
      filteredSlots = filteredSlots.filter(time => {
        // time format is "HH:mm"
        const [hours, minutes] = time.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(hours, minutes, 0, 0);
        return slotTime > now;
      });
    }

    return filteredSlots;
  };

  const handleStartBooking = (plan?: any) => {
    setSelectedPlan(plan || null);
    setView('booking');
    setStep(mode === 'presencial' ? 1 : 2);
  };

  const isUp2You = selectedLocal?.name.toLowerCase().includes('up2you');

  const handleBooking = async () => {
    if (isBooking) return;

    if (!isUp2You && (!selectedDate || !selectedTime)) {
      alert('Por favor, selecione uma data e horário primeiro.');
      setStep(2);
      return;
    }

    if (!formData.name.trim() || !formData.whatsapp.trim()) {
      alert('Por favor, preencha seu Nome e WhatsApp antes de confirmar.');
      return;
    }

    setIsBooking(true);
    
    try {
      const bookingDate = isUp2You ? format(new Date(), 'yyyy-MM-dd') : selectedDate!;
      const bookingTime = isUp2You ? 'PRESENCIAL' : selectedTime!;
      const bookingId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      const booking: Booking = {
        id: bookingId,
        patientName: formData.name,
        whatsapp: formData.whatsapp,
        date: bookingDate,
        time: bookingTime,
        type: isUp2You ? 'presencial' : 'online',
        localId: isUp2You ? 'presencial' : 'online',
        status: isUp2You ? 'Lead WhatsApp' : 'Pendente',
        createdAt: new Date().toISOString(),
        planoId: selectedPlan?.name || 'Consulta Avulsa'
      };

      // WhatsApp Message Preparation
      let message = '';
      if (isUp2You) {
        message = `Olá! Tenho interesse no atendimento presencial na Up2You:\n\n👤 *Paciente:* ${formData.name}\n💼 *Plano:* ${selectedPlan?.name || 'Consulta Avulsa'}\n💳 *Pagamento:* ${paymentMethod === 'pix' ? 'PIX' : 'Link de Pagamento'}\n\nGostaria de conferir os horários disponíveis.`;
      } else {
        message = `Olá! Requisitei um agendamento no site:\n\n👤 *Paciente:* ${formData.name}\n📅 *Data:* ${format(new Date(selectedDate + 'T12:00:00'), 'dd/MM/yyyy')}\n⏰ *Hora:* ${selectedTime}\n💼 *Plano:* ${selectedPlan?.name || 'Consulta Avulsa'}\n📍 *Local:* ${mode === 'online' ? 'Online' : (selectedLocal?.name || 'Presencial')}\n💳 *Pagamento:* ${paymentMethod === 'pix' ? 'PIX' : 'Link de Pagamento'}\n\nAguardo a confirmação e os dados para pagamento.`;
      }
      
      const sanitizedPhone = settings.whatsappNumber.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
      setLastBookingUrl(whatsappUrl);

      // Attempt to open WhatsApp IMMEDIATELY (sync) to avoid popup blockers
      const win = window.open(whatsappUrl, '_blank');
      
      // Show success screen immediately
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setStep(5);
      
      // Save to Database in background
      saveAgendamento(booking).catch(err => console.error('Silent save error:', err));
      
    } catch (e) {
      console.error('Erro no agendamento:', e);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setStep(5);
    } finally {
      setIsBooking(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F5EF]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentConsultation = mode ? INDIVIDUAL_CONSULTATION[mode] : null;
  const currentPlans = mode ? (mode === 'presencial' ? PLANS_PRESENCIAL : PLANS_ONLINE) : [];

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-dark font-jost selection:bg-primary/10">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-salmon/5 rounded-full blur-[120px] animate-pulse" />
        <img 
          src={settings.bgUrl || 'https://images.unsplash.com/photo-1490818387583-1baba5e6382b?q=80&w=2000'}
          className="absolute inset-0 w-full h-full object-cover opacity-[0.08] mix-blend-multiply transition-opacity duration-1000"
          alt=""
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {view === 'landing' ? (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto space-y-12 text-center"
            >
              {/* Profile Header */}
              <section className="space-y-6 pt-4">
                <div className="relative inline-block">
                  <div className="w-40 h-40 rounded-full overflow-hidden border-8 border-white shadow-2xl mx-auto">
                    <img src={settings.personUrl} alt={settings.brandName} className="w-full h-full object-cover" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h1 className="font-display text-5xl tracking-normal text-primary">
                    {settings.brandName.split(' ')[0]} <span className="text-brand-salmon">{settings.brandName.split(' ').slice(1).join(' ')}</span>
                  </h1>
                  <p className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase leading-none">Nutricionista • {settings.crn}</p>
                  <p className="text-[9px] font-medium tracking-tight text-slate-400">
                    Atendimento presencial em Joinville | Atendimento on-line em todo Brasil
                  </p>
                </div>
              </section>

              {/* Menu Options */}
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setView('start')}
                  className="w-full bg-[#869471] p-8 rounded-[2rem] shadow-xl shadow-[#869471]/20 hover:scale-[1.02] active:scale-[0.98] transition-all group relative flex items-center justify-center border-b-4 border-black/10 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="font-sans text-[10px] sm:text-base uppercase tracking-[0.25em] flex flex-wrap justify-center items-center gap-x-5 gap-y-2 relative z-10">
                    <span className="font-medium text-white/50">Conheça os planos</span>
                    <span className="hidden sm:inline w-px h-4 bg-white/20" />
                    <span className="font-black text-white">Agende sua consulta</span>
                  </span>
                </button>

                <a 
                  href="https://www.google.com/maps/search/?api=1&query=R.+Jaragu%C3%A1,+604+-+Am%C3%A9rica,+Joinville+-+SC,+89204-650"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex items-center justify-center gap-4 group"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary transition-colors">
                    <MapPin className="w-5 h-5 text-primary group-hover:text-white" />
                  </div>
                  <div className="text-left">
                    <span className="block font-display text-xl text-primary leading-none">Localização</span>
                    <span className="text-[11px] font-display text-slate-400 mt-1 block">
                      Consultório sob agendamento
                    </span>
                  </div>
                </a>

                <a 
                  href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md hover:border-[#25D366] transition-all flex items-center justify-center gap-3"
                >
                  <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-green-100">
                    <MessageCircle className="w-5 h-5 text-white fill-white" />
                  </div>
                  <span className="font-display text-xl text-primary">WhatsApp</span>
                </a>

                <a 
                  href="https://www.instagram.com/sibelinutri/"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md hover:border-[#E4405F] transition-all flex items-center justify-center gap-3"
                >
                  <div className="w-10 h-10 bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] rounded-full flex items-center justify-center shadow-lg shadow-pink-100">
                    <div className="text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                    </div>
                  </div>
                  <span className="font-display text-xl text-primary">Instagram</span>
                </a>

                <a 
                  href="https://share.google/0h0TkoY2fMdGKQmFZ"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md hover:border-[#4285F4] transition-all flex items-center justify-center gap-3"
                >
                  <div className="w-10 h-10 bg-[#4285F4] rounded-full flex items-center justify-center shadow-lg shadow-blue-100">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-display text-xl text-primary">Avaliar no Google</span>
                </a>
              </div>
            </motion.div>
          ) : view === 'start' ? (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              {/* Profile Header */}
              <section className="text-center space-y-6 pt-4 relative">
                <div className="relative inline-block">
                  <div className="w-40 h-40 rounded-full overflow-hidden border-8 border-white shadow-2xl mx-auto">
                    <img src={settings.personUrl} alt={settings.brandName} className="w-full h-full object-cover" />
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-6">
                  <button 
                    onClick={() => setView('landing')}
                    className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:scale-110 transition-transform md:absolute md:left-0 md:top-4"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="space-y-2">
                    <h1 className="font-display text-5xl tracking-normal text-primary">
                      {settings.brandName.split(' ')[0]} <span className="text-brand-salmon">{settings.brandName.split(' ').slice(1).join(' ')}</span>
                    </h1>
                    <p className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase leading-none">Nutricionista • {settings.crn}</p>
                    <p className="text-[9px] font-medium tracking-tight text-slate-400">
                      Atendimento presencial em Joinville | Atendimento on-line em todo Brasil
                    </p>
                  </div>
                </div>

                {/* Mode Toggle - Only show after initial selection */}
                {mode && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase text-center">Alterar Modalidade</p>
                    <div className="max-w-[280px] mx-auto p-1 bg-white/50 backdrop-blur-md rounded-full border border-white shadow-inner flex">
                      <button 
                        onClick={() => setMode('online')}
                        className={cn(
                          "flex-1 py-3 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                          mode === 'online' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Online
                      </button>
                      <button 
                        onClick={() => setMode('presencial')}
                        className={cn(
                          "flex-1 py-3 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                          mode === 'presencial' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Presencial
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Consultation Section */}
              <section className="space-y-6">
                {!mode ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-12">
                    <button
                      onClick={() => setMode('online')}
                      className="group p-10 rounded-[3rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all flex flex-col items-center gap-6 text-center"
                    >
                      <div className="w-20 h-20 rounded-3xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-all duration-500 transform group-hover:rotate-6">
                        <Video className="w-10 h-10" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xl font-display text-primary uppercase tracking-wide">Consulta Online</h4>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">Google Meet • No conforto de casa</p>
                      </div>
                      <div className="px-6 py-2 bg-slate-50 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                        Selecionar
                      </div>
                    </button>

                    <button
                      onClick={() => setMode('presencial')}
                      className="group p-10 rounded-[3rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all flex flex-col items-center gap-6 text-center"
                    >
                      <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-500 transform group-hover:-rotate-6">
                        <MapPin className="w-10 h-10" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xl font-display text-primary uppercase tracking-wide">Consulta Presencial</h4>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">No Consultório • Atendimento Físico</p>
                      </div>
                      <div className="px-6 py-2 bg-slate-50 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                        Selecionar
                      </div>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-2">
                      <h2 className="font-display text-3xl text-primary font-medium tracking-tight">Consulta Avulsa</h2>
                      <div className="h-px bg-slate-200 flex-1 ml-6 bg-gradient-to-r from-slate-200 to-transparent" />
                    </div>
                    
                    <div 
                      className="w-full text-left bg-white border border-slate-100 rounded-[3rem] p-8 md:p-12 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-12"
                    >
                      <div className="space-y-8 flex-1">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/5 rounded-2xl text-primary">
                              <Stethoscope className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                              {currentConsultation?.tag}
                            </span>
                          </div>
                          <h3 className="text-4xl font-display text-primary leading-tight font-medium">{currentConsultation?.title}</h3>
                        </div>

                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                          {currentConsultation?.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-3">
                               <div className="w-1.5 h-1.5 rounded-full bg-brand-salmon mt-1.5 shrink-0" />
                               <span className="text-sm text-slate-500 font-light leading-snug">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0 pt-8 md:pt-0 border-t md:border-t-0 border-slate-50 w-full md:w-auto">
                        <div className="text-right">
                          <span className="text-4xl font-black text-brand-salmon block leading-none">
                            {currentConsultation?.price.split(' — ')[0]}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2 block">
                            {currentConsultation?.price.split(' — ')[1]}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleStartBooking()}
                          className="mt-6 w-full md:w-auto flex items-center justify-center gap-3 py-5 px-10 bg-primary text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-accent transition-colors shadow-xl shadow-primary/10"
                        >
                          Agendar consulta ↗
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* Plans Section */}
              {mode && (
                <section className="space-y-8">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="font-display text-3xl text-primary font-medium tracking-tight">Planos de Acompanhamento</h2>
                    <div className="h-px bg-slate-200 flex-1 ml-6 bg-gradient-to-r from-slate-200 to-transparent" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {currentPlans.map((plan) => (
                      <div 
                        key={plan.id}
                        className={cn(
                          "flex flex-col text-left bg-white p-10 rounded-[3rem] border transition-all relative",
                          plan.popular ? "border-brand-salmon shadow-2xl scale-[1.02] z-10" : "border-slate-100 shadow-sm"
                        )}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-brand-salmon text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                            {plan.badge}
                          </div>
                        )}
                        
                        <div className="flex-1 space-y-8">
                          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          
                          <div>
                            <h3 className="text-3xl font-display text-primary font-medium leading-none">{plan.name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3 opacity-60">{plan.tag}</p>
                          </div>

                          <ul className="space-y-4">
                            {plan.features.map((f, i) => (
                              <li key={i} className="flex items-start gap-4">
                                <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                                <span className="text-xs text-slate-500 font-light leading-tight">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-10 border-t border-slate-50 mt-10 space-y-6">
                          <div>
                            <p className="text-3xl font-black text-brand-salmon leading-none">
                              {plan.price.split(' sem juros')[0]}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mt-2">
                              {plan.price.split(' sem juros')[1] || 'sem juros'} • {plan.vista}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleStartBooking(plan)}
                            className={cn(
                               "w-full py-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm",
                               plan.popular ? "bg-primary text-white shadow-primary/20" : "bg-slate-50 text-slate-400 hover:bg-primary hover:text-white"
                            )}
                          >
                            Quero este plano ↗
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="booking"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto space-y-12"
            >
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => {
                    if (step > 1) setStep(step - 1);
                    else setView('start');
                  }}
                  className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:scale-110 transition-transform"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="text-3xl font-display text-primary">
                    {selectedPlan ? selectedPlan.name : 'Consulta Avulsa'}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Modalidade: {mode}</p>
                </div>
              </div>

              <div className="flex gap-4">
                 {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={cn(
                      "h-1.5 flex-1 rounded-full transition-all",
                      step >= s ? "bg-primary shadow-sm" : "bg-white border border-slate-100"
                    )} />
                 ))}
              </div>

              {/* Stepper Content */}
              <div className="min-h-[60vh]">
                <AnimatePresence mode="wait">
                  {step === 1 && mode === 'presencial' && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <h2 className="font-display text-3xl text-primary">Onde deseja o atendimento?</h2>
                      <div className="grid grid-cols-1 gap-4">
                        {locais.map(l => (
                          <button 
                            key={l.id}
                            onClick={() => { 
                              setSelectedLocal(l); 
                              if (l.name.toLowerCase().includes('up2you')) {
                                setStep(4); // Skip to form
                              } else {
                                setStep(2); 
                              }
                            }}
                            className="w-full p-8 bg-white border border-slate-100 rounded-[3rem] text-left hover:border-primary transition-all flex items-center justify-between group shadow-sm"
                          >
                            <div className="flex items-center gap-6">
                               <div className="p-4 bg-primary/5 text-primary rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors">
                                  <MapPin className="w-6 h-6" />
                               </div>
                               <div>
                                <span className="block font-display text-2xl">{l.name}</span>
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{l.address}</span>
                              </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-slate-200" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="flex flex-col gap-6">
                        <a 
                          href={`https://wa.me/${settings?.whatsappNumber}?text=${encodeURIComponent("Olá! Não encontrei um horário que funcione para mim no site, gostaria de verificar outras opções.")}`}
                          target="_blank"
                          className="w-full py-4 px-6 bg-[#25D366]/10 border border-[#25D366]/20 text-[#128C7E] rounded-3xl flex items-center justify-center gap-3 hover:bg-[#25D366]/20 transition-all group"
                        >
                          <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                            <MessageCircle className="w-5 h-5 text-white fill-white" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Não encontrou seu horário? Chame aqui</span>
                        </a>
                        <h2 className="font-display text-3xl px-2">Datas disponíveis</h2>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                         {(() => {
                          const days = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => {
                            const d = format(addDays(new Date(), i), 'yyyy-MM-dd');
                            const localId = mode === 'online' ? 'online' : selectedLocal?.id || '';
                            const slots = getSlotsForDate(d, localId);
                            return { date: d, index: i, slots, isAva: slots.length > 0 };
                          });

                          const hasAnyAva = days.some(d => d.isAva);

                          if (!hasAnyAva) {
                             return (
                              <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                                <div className="w-16 h-16 bg-primary/5 text-primary rounded-full flex items-center justify-center mx-auto">
                                  <CalendarIcon className="w-8 h-8 opacity-40" />
                                </div>
                                <div>
                                  <p className="font-display text-2xl text-primary">Agenda lotada</p>
                                  <p className="text-xs text-slate-400 mt-2 px-8 leading-relaxed">Não encontramos horários disponíveis para os próximos 15 dias.</p>
                                </div>
                                <a 
                                  href={`https://wa.me/${settings?.whatsappNumber}`}
                                  className="inline-flex items-center gap-3 py-4 px-10 bg-[#25D366] text-white rounded-full font-bold text-xs uppercase tracking-widest shadow-xl shadow-green-100"
                                >
                                  Lista de espera no WhatsApp
                                </a>
                              </div>
                             );
                          }

                          return days.map(d => (
                            <button 
                              key={d.date}
                              disabled={!d.isAva}
                              onClick={() => { setSelectedDate(d.date); setStep(3); }}
                              className={cn(
                                "w-full p-6 rounded-[2rem] border text-left flex items-center justify-between transition-all",
                                d.isAva ? "bg-white border-slate-100 hover:border-primary shadow-sm" : "bg-white/30 border-dashed border-slate-200 opacity-40 cursor-not-allowed"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-xl", d.isAva ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-300")}>
                                   <CalendarIcon className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="block font-bold text-lg">
                                    {format(addDays(new Date(), d.index), "dd 'de' MMMM", { locale: ptBR })}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    {d.index === 0 ? 'Hoje' : d.index === 1 ? 'Amanhã' : format(addDays(new Date(), d.index), 'iiii', { locale: ptBR })}
                                  </span>
                                </div>
                              </div>
                              {d.isAva && <span className="text-[10px] font-black text-white bg-primary py-1.5 px-4 rounded-full uppercase tracking-tighter">{d.slots.length} horários</span>}
                            </button>
                          ));
                        })()}
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && selectedDate && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="flex flex-col gap-6">
                        <a 
                          href={`https://wa.me/${settings?.whatsappNumber}?text=${encodeURIComponent("Olá! Não encontrei um horário que funcione para mim no site no dia " + format(new Date(selectedDate + 'T12:00:00'), 'dd/MM') + ", gostaria de verificar outras opções.")}`}
                          target="_blank"
                          className="w-full py-4 px-6 bg-[#25D366]/10 border border-[#25D366]/20 text-[#128C7E] rounded-3xl flex items-center justify-center gap-3 hover:bg-[#25D366]/20 transition-all group"
                        >
                          <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                            <MessageCircle className="w-5 h-5 text-white fill-white" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Não encontrou seu horário? Chame aqui</span>
                        </a>
                        <h2 className="font-display text-3xl px-2">Horários para {format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {getSlotsForDate(selectedDate, mode === 'online' ? 'online' : selectedLocal?.id || '').map(time => (
                          <button 
                            key={time}
                            onClick={() => { setSelectedTime(time); setStep(4); }}
                            className="py-6 bg-white border border-slate-100 rounded-[2rem] font-bold text-xl hover:border-primary hover:text-primary transition-all shadow-sm flex items-center justify-center gap-3"
                          >
                            <Clock className="w-5 h-5 opacity-30" /> {time}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div 
                      key="step4"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-10"
                    >
                        <div className="text-center space-y-4">
                           <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto", isUp2You ? "bg-[#25D366]/10 text-[#128C7E]" : "bg-primary/10 text-primary")}>
                              {isUp2You ? <MessageCircle className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
                           </div>
                           <div>
                              <h2 className="font-display text-4xl">{isUp2You ? 'Consulte os horários disponíveis no WhatsApp' : 'Finalizar e Agendar'}</h2>
                              <p className="text-slate-500 mt-2 text-sm">
                                {isUp2You 
                                  ? 'Preencha seus dados para consultar os horários disponíveis diretamente com a nutricionista.' 
                                  : 'Preencha seus dados para finalizarmos sua solicitação.'}
                              </p>
                           </div>
                        </div>

                        <div className={cn("bg-white border-2 rounded-[3rem] p-8 shadow-2xl space-y-8 relative overflow-hidden", isUp2You ? "border-[#25D366]" : "border-primary")}>
                           <div className="space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Seu Nome</label>
                                  <input 
                                    type="text" 
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary" 
                                    placeholder="Nome completo..." 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">WhatsApp</label>
                                  <input 
                                    type="tel" 
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary" 
                                    placeholder="(47) 99999-9999" 
                                    value={formData.whatsapp}
                                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                                  />
                                </div>
                              </div>

                              <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Forma de Pagamento Preferida</label>
                                <div className="grid grid-cols-2 gap-4">
                                   <button 
                                     onClick={() => setPaymentMethod('pix')}
                                     className={cn(
                                       "p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                       paymentMethod === 'pix' ? (isUp2You ? "border-[#25D366] bg-[#25D366]/5" : "border-primary bg-primary/5") : "border-slate-100 bg-slate-50 opacity-60"
                                     )}
                                   >
                                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", paymentMethod === 'pix' ? (isUp2You ? "border-[#25D366]" : "border-primary") : "border-slate-300")}>
                                         {paymentMethod === 'pix' && <div className={cn("w-2.5 h-2.5 rounded-full", isUp2You ? "bg-[#25D366]" : "bg-primary")} />}
                                      </div>
                                      <span className="text-xs font-bold uppercase tracking-widest">PIX</span>
                                   </button>
                                   <button 
                                     onClick={() => setPaymentMethod('link')}
                                     className={cn(
                                       "p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                       paymentMethod === 'link' ? (isUp2You ? "border-[#25D366] bg-[#25D366]/5" : "border-primary bg-primary/5") : "border-slate-100 bg-slate-50 opacity-60"
                                     )}
                                   >
                                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", paymentMethod === 'link' ? (isUp2You ? "border-[#25D366]" : "border-primary") : "border-slate-300")}>
                                         {paymentMethod === 'link' && <div className={cn("w-2.5 h-2.5 rounded-full", isUp2You ? "bg-[#25D366]" : "bg-primary")} />}
                                      </div>
                                      <span className="text-xs font-bold uppercase tracking-widest text-center">Link de Pagamento</span>
                                   </button>
                                </div>
                              </div>

                              <div className={cn("p-6 bg-slate-50 rounded-3xl border", isUp2You ? "border-[#25D366]/20" : "border-primary/10")}>
                                 <p className="text-[10px] text-slate-500 leading-relaxed font-bold text-center uppercase tracking-wider">
                                   {isUp2You 
                                    ? 'A consulta será reservada mediante pagamento antecipado. Os dados para pagamento serão enviados no WhatsApp após a confirmação do horário escolhido.' 
                                    : 'A consulta será reservada mediante pagamento antecipado. Os dados para pagamento serão enviados no WhatsApp informado junto com a confirmação de agendamento.'}
                                 </p>
                              </div>

                              <button 
                                onClick={handleBooking}
                                disabled={!formData.name || !formData.whatsapp || isBooking}
                                className={cn(
                                  "w-full py-6 rounded-2xl font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 transition-transform active:scale-95",
                                  isUp2You ? "bg-[#25D366] text-white shadow-green-100" : "bg-primary text-white shadow-primary/20"
                                )}
                              >
                                {isBooking ? 'Iniciando...' : (isUp2You ? 'Ir para WhatsApp' : 'Finalizar Agendamento')} <ArrowRight className="w-5 h-5" />
                              </button>
                           </div>
                        </div>
                    </motion.div>
                  )}

                  {step === 5 && (
                    <motion.div 
                      key="step5"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-20 space-y-6"
                    >
                        <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                           <CheckCircle className="w-12 h-12" />
                        </div>
                        <div className="space-y-4">
                          <h2 className="font-display text-5xl text-primary">Tudo pronto!</h2>
                          <div className="bg-white/50 border border-white p-6 rounded-3xl mx-auto max-w-sm">
                            <p className="text-slate-600 text-sm leading-relaxed">
                              Sua solicitação foi registrada no sistema. Caso a janela do WhatsApp não tenha aberto automaticamente, clique no botão abaixo:
                            </p>
                          </div>
                          
                          {lastBookingUrl && (
                            <div className="pt-6">
                              <a 
                                href={lastBookingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-4 py-6 px-12 bg-[#25D366] text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.15em] shadow-2xl shadow-green-200 hover:scale-105 active:scale-95 transition-all group relative overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-white/10 group-hover:opacity-100 opacity-0 transition-opacity" />
                                <MessageCircle className="w-6 h-6 fill-white" /> Enviar Mensagem
                              </a>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => setView('start')}
                          className="px-10 py-4 bg-slate-100 text-slate-500 rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all"
                        >
                          Voltar ao Início
                        </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
