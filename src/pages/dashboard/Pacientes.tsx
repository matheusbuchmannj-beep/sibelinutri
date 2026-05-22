import { useState, useEffect, FormEvent } from 'react';
import { fetchAgendamentos, updateAgendamento, deleteAgendamento } from '../../lib/googleWorkspace';
import { Booking } from '../../types';
import { 
  Users, 
  Search, 
  MessageSquare, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  FileText, 
  Save, 
  Phone, 
  ChevronRight, 
  UserPlus,
  Trash2,
  MapPin,
  ExternalLink,
  Plus
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface PatientAggregation {
  name: string;
  whatsapp: string;
  bookings: Booking[];
  notes: string;
  saving?: boolean;
}

export default function Pacientes() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [patients, setPatients] = useState<PatientAggregation[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientAggregation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientAggregation | null>(null);
  const [patientNotes, setPatientNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Custom manual patients to add if needed
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const fetchedBookings = await fetchAgendamentos();
      setBookings(fetchedBookings);
      
      // Group bookings by a composite key of Name + WhatsApp to isolate unique patients
      const grouped: Record<string, Booking[]> = {};
      fetchedBookings.forEach(b => {
        // Use lowercase name + sanitize phone to make grouping robust
        const key = `${b.patientName.toLowerCase().trim()}_${b.whatsapp.replace(/\D/g, '')}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(b);
      });

      // Generate patients list
      const aggregatedList: PatientAggregation[] = [];
      
      for (const key of Object.keys(grouped)) {
        const pBookings = grouped[key];
        // Sort bookings by date and time (most recent first)
        pBookings.sort((a, b) => {
          const ad = `${a.date}T${a.time}`;
          const bd = `${b.date}T${b.time}`;
          return bd.localeCompare(ad);
        });

        const primaryName = pBookings[0].patientName;
        const phone = pBookings[0].whatsapp;

        // Try reading notes from 'pacientes' collection
        let notesText = '';
        try {
          const docId = phone.replace(/\D/g, '') || 'default';
          const patientDoc = await getDoc(doc(db, 'pacientes', docId));
          if (patientDoc.exists()) {
            notesText = patientDoc.data().notes || '';
          }
        } catch (err) {
          console.warn('Error reading patient notes:', err);
        }

        aggregatedList.push({
          name: primaryName,
          whatsapp: phone,
          bookings: pBookings,
          notes: notesText
        });
      }

      // Sort patients by name alphabetically
      aggregatedList.sort((a, b) => a.name.localeCompare(b.name));

      setPatients(aggregatedList);
      setFilteredPatients(aggregatedList);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter patients on search
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.whatsapp.includes(term)
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  const selectPatient = (patient: PatientAggregation) => {
    setSelectedPatient(patient);
    setPatientNotes(patient.notes);
  };

  const handleSaveNotes = async () => {
    if (!selectedPatient) return;
    setSavingNotes(true);
    try {
      const docId = selectedPatient.whatsapp.replace(/\D/g, '');
      const patientRef = doc(db, 'pacientes', docId);
      
      await setDoc(patientRef, {
        name: selectedPatient.name,
        whatsapp: selectedPatient.whatsapp,
        notes: patientNotes,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update local state
      const updatedList = patients.map(p => {
        if (p.whatsapp === selectedPatient.whatsapp) {
          return { ...p, notes: patientNotes };
        }
        return p;
      });
      setPatients(updatedList);
      
      // Update selected patient state
      setSelectedPatient({
        ...selectedPatient,
        notes: patientNotes
      });

      alert('Anotações clínicas salvas com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar anotações.');
    } finally {
      setSavingNotes(false);
    }
  };

  const cleanPhoneNumber = (phone: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.length > 0 && !clean.startsWith('55') && clean.length <= 11) {
      clean = '55' + clean;
    }
    return clean;
  };

  const getWhatsAppLink = (patient: PatientAggregation, customMsg?: string) => {
    const phone = cleanPhoneNumber(patient.whatsapp);
    const text = customMsg || `Olá ${patient.name}! Como vai? Gostaria de conversar sobre nossa consulta.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'Pendente':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Cancelado':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  // Add custom manual patient
  const handleAddPatient = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPatientName || !newPatientPhone) return;

    try {
      setLoading(true);
      const cleanPhone = newPatientPhone.replace(/\D/g, '');
      // Create a mockup booking so the patient appears in the database system
      const newBooking: Booking = {
        patientName: newPatientName,
        whatsapp: newPatientPhone,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '12:00',
        type: 'online',
        status: 'Lead WhatsApp',
        createdAt: new Date().toISOString()
      };

      // Add dummy record to firebase direct to bootstrap appearance
      const docId = cleanPhone;
      await setDoc(doc(db, 'pacientes', docId), {
        name: newPatientName,
        whatsapp: newPatientPhone,
        notes: 'Paciente cadastrado manualmente.',
        createdAt: new Date().toISOString()
      });

      // Save a simulated booking to link them to the system 
      const { saveAgendamento } = await import('../../lib/googleWorkspace');
      await saveAgendamento(newBooking);

      setNewPatientName('');
      setNewPatientPhone('');
      setShowAddModal(false);
      loadData();
      alert('Paciente cadastrado e vinculado com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao cadastrar paciente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Seus Pacientes</h2>
          <p className="text-sm text-slate-500 mt-1">
            Histórico completo de consultas, fichas de acompanhamento, anotações clínicas e contato direto WhatsApp.
          </p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-4 bg-[#869471] text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#869471]/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Cadastrar Novo Paciente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Search & Patients list grouped */}
        <div className="col-span-1 lg:col-span-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden p-6 md:p-8 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou número..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:bg-white focus:border-[#869471] outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-12 text-slate-400 font-medium">Buscando lista de pacientes...</div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12 text-slate-400">Nenhum paciente cadastrado encontrado.</div>
            ) : (
              filteredPatients.map(p => {
                const isSelected = selectedPatient?.whatsapp === p.whatsapp;
                const totalConsultas = p.bookings.length;
                const lastBooking = p.bookings[0]; // sorted most recent first
                
                return (
                  <button
                    key={p.whatsapp}
                    onClick={() => selectPatient(p)}
                    className={`w-full p-5 rounded-[1.8rem] text-left border transition-all duration-300 flex items-center justify-between group ${
                      isSelected 
                        ? 'bg-[#869471]/5 border-[#869471] shadow-md shadow-[#869471]/5' 
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-slate-800 text-base truncate pr-2 group-hover:text-[#869471] transition-colors">{p.name}</h4>
                      <p className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-300" /> {p.whatsapp}
                      </p>
                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {totalConsultas} {totalConsultas === 1 ? 'consulta' : 'consultas'}
                        </span>
                        {lastBooking && (
                          <span className={`text-[9px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-md ${getStatusColor(lastBooking.status)}`}>
                            Última: {lastBooking.status}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${
                      isSelected ? 'text-[#869471] translate-x-1' : 'text-slate-300 group-hover:translate-x-1'
                    }`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Notes and Detailed Appointment Timeline */}
        <div className="col-span-1 lg:col-span-6 space-y-6">
          {selectedPatient ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedPatient.name}</h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{selectedPatient.whatsapp}</p>
                </div>
                
                <a 
                  href={getWhatsAppLink(selectedPatient)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-green-500/10 flex items-center justify-center gap-2 transition-all self-start sm:self-center"
                >
                  <MessageSquare className="w-4 h-4 fill-white" /> Conversar no WhatsApp
                </a>
              </div>

              {/* Patient Note/Observations Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#869471]" />
                    <h4 className="font-bold text-slate-700 text-sm">Ficha Clínica e Observações</h4>
                  </div>
                  <button 
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="text-xs font-bold text-[#869471] hover:text-[#6a7559] flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" /> Salvar Ficha
                  </button>
                </div>
                
                <textarea 
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="Escreva notas sobre o paciente, histórico de patologias, metas, preferências alimentares, evolução do peso, restrições..."
                  rows={6}
                  className="w-full bg-slate-50/50 border border-slate-100 text-slate-750 p-4 rounded-2xl outline-none focus:bg-white focus:border-[#869471] text-sm leading-relaxed transition-all resize-none"
                />
              </div>

              {/* Timeline of Consultation History */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#869471]" />
                  <h4 className="font-bold text-slate-700 text-sm">Histórico de Sessões ({selectedPatient.bookings.length})</h4>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {selectedPatient.bookings.map((booking, index) => (
                    <div 
                      key={booking.id || index}
                      className="p-4 rounded-2xl border border-slate-50 bg-slate-50/20 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-700 text-xs tracking-tight">
                            {format(new Date(booking.date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-slate-300" /> {booking.time}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {booking.type === 'online' ? 'Atendimento Online' : 'Atendimento Presencial'} 
                          {booking.planoId && ` • ${booking.planoId}`}
                        </p>
                      </div>

                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden p-12 text-center text-slate-400 space-y-4 flex flex-col items-center justify-center min-h-[450px]">
              <div className="w-16 h-16 bg-slate-100/80 rounded-[1.5rem] flex items-center justify-center text-slate-300">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-slate-700 text-lg">Nenhum Paciente Selecionado</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">
                  Escolha um paciente na barra lateral para ver o histórico e salvar observações sobre a consulta.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden max-w-md w-full p-8 md:p-10 space-y-6 relative animate-in zoom-in-95 duration-250">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-50"
            >
              <XCircle className="w-6 h-6" />
            </button>
            
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-800">Cadastrar Paciente</h3>
              <p className="text-xs text-slate-400">Insira as informações básicas para iniciar o histórico clínico.</p>
            </div>

            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome Completo:</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nome do paciente"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">WhatsApp (com DDD):</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: 47999999999"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 border border-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-[#869471] text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#869471]/20 transition-all hover:scale-[1.02]"
                >
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
