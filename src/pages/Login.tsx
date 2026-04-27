import { useState } from 'react';
import { getAccessToken } from '../lib/googleWorkspace';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      localStorage.setItem('google_access_token', token);
      
      // Mock Bypass for dev
      if (token === 'mock_token') {
        setTimeout(() => navigate('/admin'), 1000);
        return;
      }
      
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao autenticar com o Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 sm:p-12 bg-[#fdfbf6]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#869471] text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#869471]/20">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Acesse sua agenda e gestão pelo Google Workspace</p>
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/50 text-center border border-slate-100">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <p className="text-slate-600 mb-8 text-sm leading-relaxed">
            Para gerenciar sua agenda, entre com sua conta Google autorizada. <br/>
            <strong>Tudo será sincronizado com Sheets e Calendar automaticamente.</strong>
          </p>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-5 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold shadow-sm hover:border-[#869471] hover:bg-slate-50 transition-all flex items-center justify-center gap-4 group active:scale-95"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-[#869471]/30 border-t-[#869471] rounded-full animate-spin" />
            ) : (
              <>
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google" 
                  className="w-6 h-6 group-hover:scale-110 transition-transform" 
                />
                Entrar com Google
              </>
            )}
          </button>

          <div className="mt-10 pt-8 border-t border-slate-50">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
               Este aplicativo utiliza exclusivamente serviços Google para processamento de dados.
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
