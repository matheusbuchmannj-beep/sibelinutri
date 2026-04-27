import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { GoogleGenAI, Type } from "@google/genai";
import { fetchSettings, fetchLocais, fetchHorarios, updateSheetData, fetchAgendamentos } from '../../lib/googleWorkspace';
import { Booking, Settings as NutriSettings, Local } from '../../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function AIChat() {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Olá! Sou sua assistente IA. Posso te ajudar a entender sua agenda ou como configurar seus horários e locais.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [context, setContext] = useState<{
    settings: NutriSettings | null,
    locais: Local[],
    bookings: Booking[],
    availability: Record<string, Record<string, string[]>>
  }>({
    settings: null,
    locais: [],
    bookings: [],
    availability: {}
  });

  const loadContext = async () => {
    try {
      const [settings, locais, list, availability] = await Promise.all([
        fetchSettings(),
        fetchLocais(),
        fetchAgendamentos(),
        fetchHorarios()
      ]);
      
      setContext({ settings, locais, bookings: list, availability });
    } catch (e) {
      console.error('Error loading AI context:', e);
    }
  };

  useEffect(() => {
    if (chatOpen) loadContext();
  }, [chatOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const chatContents = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const modelParams = {
        model: "gemini-3-flash-preview",
        contents: [...chatContents, { role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: `Você é um assistente especializado para o Painel de Administração de um Profissional de Saúde.
          Você tem acesso aos seguintes dados de contexto:
          - Configurações atuais: ${JSON.stringify(context.settings)}
          - Locais de atendimento: ${JSON.stringify(context.locais)}
          - Agendamentos recentes: ${JSON.stringify(context.bookings.slice(-10))}
          - Disponibilidade atual de horários (Agenda): ${JSON.stringify(context.availability)}
          
          Você PODE criar e excluir horários (slots) na agenda do profissional usando as ferramentas fornecidas.
          Sempre confirme com o usuário após realizar uma alteração.
          
          Formatos:
          - Datas: YYYY-MM-DD
          - Horários: HH:mm
          - LocalId: 'online' ou o ID retornado na lista de locais.
          
          Responda de forma curta, prestativa e cordial. Use emojis moderadamente.`,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "add_slot",
                  description: "Adiciona um novo horário disponível na agenda.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
                      localId: { type: Type.STRING, description: "ID do local (ex: 'online' ou ID numérico)" },
                      time: { type: Type.STRING, description: "Horário no formato HH:mm" }
                    },
                    required: ["date", "localId", "time"]
                  }
                },
                {
                  name: "remove_slot",
                  description: "Remove um horário disponível da agenda.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
                      localId: { type: Type.STRING, description: "ID do local" },
                      time: { type: Type.STRING, description: "Horário no formato HH:mm" }
                    },
                    required: ["date", "localId", "time"]
                  }
                }
              ]
            }
          ]
        }
      };

      let response = await ai.models.generateContent(modelParams as any);
      let functionCalls = response.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
        let currentAvail = { ...context.availability };
        const toolResults = [];
        const previousContent = response.candidates?.[0]?.content;
        
        for (const call of functionCalls) {
          if (call.name === 'add_slot') {
            const { date, localId, time } = call.args as any;
            if (!currentAvail[date]) currentAvail[date] = {};
            if (!currentAvail[date][localId]) currentAvail[date][localId] = [];
            if (!currentAvail[date][localId].includes(time)) {
              currentAvail[date][localId] = [...currentAvail[date][localId], time].sort();
            }
            toolResults.push({ name: call.name, content: { success: true, message: `Horário ${time} adicionado em ${date}` } });
          }
          
          if (call.name === 'remove_slot') {
            const { date, localId, time } = call.args as any;
            if (currentAvail[date] && currentAvail[date][localId]) {
              currentAvail[date][localId] = currentAvail[date][localId].filter((s: string) => s !== time);
            }
            toolResults.push({ name: call.name, content: { success: true, message: `Horário ${time} removido de ${date}` } });
          }
        }

        // Save to sheets
        const rows: string[][] = [];
        Object.entries(currentAvail).forEach(([d, locs]) => {
          Object.entries(locs).forEach(([lid, slots]) => {
            if (slots.length > 0) rows.push([d, lid, slots.join(', ')]);
          });
        });
        await updateSheetData('Horarios!A2:C', rows);
        setContext(prev => ({ ...prev, availability: currentAvail }));

        // Send tool results back to model
        response = await ai.models.generateContent({
          ...modelParams,
          contents: [
            ...modelParams.contents,
            previousContent,
            ...toolResults.map(tr => ({
              role: 'tool',
              parts: [{
                functionResponse: {
                  name: tr.name,
                  response: tr.content
                }
              }]
            }))
          ]
        } as any);
      }

      const responseText = response.text;
      setMessages(prev => [...prev, { role: 'model', text: responseText || 'Operação realizada com sucesso.' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Erro ao conectar com a IA.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-10 right-10 z-[100]">
        <AnimatePresence>
          {chatOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 right-0 w-[400px] h-[550px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
            >
              <div className="bg-[#869471] p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Assistente Nutri</h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Inteligência Artificial</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                {messages.map((m, i) => (
                  <div key={i} className={cn(
                    "flex flex-col max-w-[85%]",
                    m.role === 'user' ? "ml-auto items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "p-4 rounded-3xl text-sm leading-relaxed",
                      m.role === 'user' 
                        ? "bg-[#869471] text-white rounded-tr-none shadow-md shadow-[#869471]/10" 
                        : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                    )}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2 text-slate-400 p-2">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-slate-100">
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <input 
                    type="text" 
                    placeholder="Pergunte sobre horários, pacientes ou configurações..."
                    className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-medium"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isTyping}
                    className="p-3 bg-[#869471] text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setChatOpen(!chatOpen)}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative group",
            chatOpen ? "bg-white text-slate-800 rotate-90" : "bg-[#869471] text-white hover:scale-110"
          )}
        >
          {chatOpen ? <X className="w-8 h-8" /> : (
            <>
              <Sparkles className="w-8 h-8" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            </>
          )}
          {!chatOpen && (
            <div className="absolute right-20 bg-white px-4 py-2 rounded-xl text-xs font-bold text-slate-600 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Dúvidas na configuração? Fale com a IA
            </div>
          )}
        </button>
      </div>
  );
}
