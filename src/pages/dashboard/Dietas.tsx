import React, { useState, useEffect } from 'react';
import { Apple, Plus, Search, FileText, ChevronRight, LayoutGrid, Calendar } from 'lucide-react';
import { fetchDietas, fetchAgendamentos } from '../../lib/googleWorkspace';
import { Dieta, Booking } from '../../types';
import { useNavigate } from 'react-router-dom';

export default function Dietas() {
  const [dietas, setDietas] = useState<Dieta[]>([]);
  const [patients, setPatients] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [d, p] = await Promise.all([fetchDietas(), fetchAgendamentos()]);
        setDietas(d);
        setPatients(p);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredDietas = dietas.filter(d => 
    d.pacienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Planos Alimentares</h1>
          <p className="text-slate-500">Gerencie as dietas personalizadas de seus pacientes.</p>
        </div>
        <button 
          onClick={() => navigate('/admin/dietas/novo')}
          className="flex items-center gap-2 px-6 py-3 bg-[#869471] text-white rounded-2xl font-bold shadow-lg shadow-[#869471]/20 hover:scale-105 transition-transform"
        >
          <Plus className="w-5 h-5" /> Nova Dieta
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Buscar por paciente ou título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#869471]/20 outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 bg-white rounded-[2rem] animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDietas.map(dieta => (
            <div 
              key={dieta.id}
              onClick={() => navigate(`/admin/dietas/editar/${dieta.id}`)}
              className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-amber-100 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <Apple className="w-12 h-12 text-amber-50/50 -rotate-12" />
              </div>
              
              <div className="mb-4">
                <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                  {dieta.objetivo}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-[#869471] transition-colors">
                {dieta.pacienteNome}
              </h3>
              <p className="text-slate-500 text-sm mb-4">{dieta.titulo}</p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(dieta.dataCriacao).toLocaleDateString()}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}

          {filteredDietas.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Nenhuma dieta encontrada</h3>
              <p className="text-slate-400 text-sm">Comece criando um novo plano para um paciente.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
