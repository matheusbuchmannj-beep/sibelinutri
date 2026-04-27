import { useState, useEffect, useRef } from 'react';
import { fetchAgendamentos, updateAgendamento, deleteAgendamento, fetchSettings } from '../../lib/googleWorkspace';
import { Booking, Settings as NutriSettings } from '../../types';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MessageCircle,
  ExternalLink,
  Send,
  Sparkles,
  Bot,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatWhatsAppMessage } from '../../lib/utils';

export default function Overview() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadBookings = async () => {
    try {
      const list = await fetchAgendamentos();
      setBookings([...list].reverse()); 
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleUpdateBooking = async () => {
    if (!selectedBooking) return;
    setUpdating(true);
    try {
      await updateAgendamento(selectedBooking);
      alert('Agendamento atualizado!');
      setIsEditing(false);
      loadBookings();
    } catch (e) {
      console.error('Update error:', e);
      alert('Erro ao atualizar agendamento.');
    } finally {
      setUpdating(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);

  const confirmDelete = async () => {
    if (!bookingToDelete) return;
    setIsDeleting(true);
    try {
      console.log('Attempting to delete booking:', bookingToDelete.id);
      const result = await deleteAgendamento(bookingToDelete.id || '', bookingToDelete.date, bookingToDelete.time);
      if (result.ok) {
        alert('Agendamento excluído com sucesso!');
        if (selectedBooking?.id === bookingToDelete.id) {
          setIsEditing(false);
        }
        setBookingToDelete(null);
        await loadBookings();
      } else {
        alert('Não foi possível excluir o agendamento. Verifique suas permissões.');
      }
    } catch (e) {
      console.error('Delete error:', e);
      alert('Erro técnico ao excluir agendamento. Verifique o console.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteBooking = (booking: Booking) => {
    setBookingToDelete(booking);
  };

  const stats = [
    { label: 'Pendentes', value: bookings.filter(b => b.status === 'Pendente').length, icon: AlertCircle, color: 'text-amber-500 bg-amber-50' },
    { label: 'Confirmados', value: bookings.filter(b => b.status === 'Confirmado').length, icon: CheckCircle, color: 'text-green-500 bg-green-50' },
    { label: 'Total Mês', value: bookings.length, icon: Calendar, color: 'text-blue-500 bg-blue-50' },
  ];

  if (loading) return (
    <div className="py-20 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#869471] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Bem-vindo(a)</h1>
          <p className="text-slate-500 mt-2">Aqui está o resumo dos atendimentos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6"
          >
            <div className={cn("p-4 rounded-2xl", stat.color)}>
              <stat.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-800">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Agendamentos Recentes</h2>
          <button onClick={() => loadBookings()} className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">Atualizar ↻</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Paciente</th>
                <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Data/Hora</th>
                <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Plano</th>
                <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bookings.slice(0, 20).map(booking => (
                <tr key={booking.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <span className="block font-bold text-slate-700">{booking.patientName}</span>
                    <span className="text-xs text-slate-400">{booking.whatsapp}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="block font-bold text-slate-700">{booking.date}</span>
                    <span className="text-xs text-slate-400">{booking.time} ({booking.type})</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                      {booking.planoId || 'Consulta Avulsa'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      booking.status === 'Confirmado' ? "bg-green-50 text-green-600" : 
                      booking.status === 'Cancelado' ? "bg-red-50 text-red-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => { setSelectedBooking(booking); setIsEditing(true); }}
                        className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-primary hover:text-white transition-colors"
                        title="Editar"
                       >
                          <Users className="w-5 h-5" />
                       </button>
                       <button 
                        onClick={() => window.open(formatWhatsAppMessage(booking.whatsapp, `Olá ${booking.patientName}, gostaria de confirmar sua consulta para o dia ${booking.date} às ${booking.time}.`), '_blank')}
                        className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                        title="Abrir WhatsApp"
                       >
                          <MessageCircle className="w-5 h-5" />
                       </button>
                       <button 
                        onClick={() => handleDeleteBooking(booking)}
                        className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                        title="Excluir"
                       >
                          <Trash2 className="w-5 h-5" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.length === 0 && (
            <div className="py-20 text-center">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Nenhum agendamento encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {bookingToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBookingToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-2xl p-10 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">Cuidado!</h3>
                <p className="text-slate-500 mt-2">Deseja realmente excluir o agendamento de <span className="font-bold text-slate-800">{bookingToDelete.patientName}</span>?</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setBookingToDelete(null)}
                  className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-red-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-10 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-dark">Editar Agendamento</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Nome do Paciente</label>
                    <input 
                      type="text"
                      value={selectedBooking.patientName}
                      onChange={(e) => setSelectedBooking({...selectedBooking, patientName: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">WhatsApp</label>
                       <input 
                        type="text"
                        value={selectedBooking.whatsapp}
                        onChange={(e) => setSelectedBooking({...selectedBooking, whatsapp: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Status</label>
                        <select 
                          value={selectedBooking.status}
                          onChange={(e) => setSelectedBooking({...selectedBooking, status: e.target.value as any})}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                        >
                           <option value="Pendente">Pendente</option>
                           <option value="Confirmado">Confirmado</option>
                           <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Data</label>
                       <input 
                        type="date"
                        value={selectedBooking.date}
                        onChange={(e) => setSelectedBooking({...selectedBooking, date: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                       />
                    </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Horário</label>
                        <input 
                          type="time"
                          value={selectedBooking.time}
                          onChange={(e) => setSelectedBooking({...selectedBooking, time: e.target.value})}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                        />
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => handleDeleteBooking(selectedBooking)}
                      className="flex-shrink-0 p-5 bg-red-50 text-red-600 rounded-3xl hover:bg-red-500 hover:text-white transition-all transform hover:scale-105"
                      title="Excluir Agendamento"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleUpdateBooking}
                      disabled={updating}
                      className="flex-1 py-5 bg-primary text-white rounded-3xl font-bold uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                    >
                      {updating ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
