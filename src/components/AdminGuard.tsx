import React, { useEffect, useState } from 'react';
import { auth, loginWithGoogle } from '../lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Lock, LogIn } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
      alert('Não foi possível abrir a janela de login. Verifique se o seu navegador está bloqueando popups.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const ALLOWED_EMAILS = ['jmatheusbuchmann@gmail.com', 'sibelifarias4@gmail.com'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !ALLOWED_EMAILS.includes(user.email || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 text-center space-y-8">
           <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto">
              <Lock className="w-10 h-10" />
           </div>
           <div>
              <h1 className="text-3xl font-black text-slate-800">Área Restrita</h1>
              <p className="text-slate-500 mt-2 font-medium">Acesso exclusivo para administradores.</p>
           </div>
           
           {user && !ALLOWED_EMAILS.includes(user.email || '') && (
             <p className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold uppercase tracking-widest leading-loose">
               Seu e-mail ({user.email}) não está autorizado.
             </p>
           )}

           <button 
             onClick={handleLogin}
             disabled={isLoggingIn}
             className="w-full py-5 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
           >
             {isLoggingIn ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
             ) : (
               <LogIn className="w-5 h-5" />
             )}
             {isLoggingIn ? 'Conectando...' : 'Entrar com Google'}
           </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
