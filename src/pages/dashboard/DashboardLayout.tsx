import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  MapPin, 
  Settings as SettingsIcon, 
  Menu, 
  X,
  Apple,
  CreditCard,
  Utensils,
  LogOut
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import AIChat from '../../components/dashboard/AIChat';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

export default function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('admin_session');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { to: '/admin', label: 'Início', icon: LayoutDashboard, end: true },
    { to: '/admin/agenda', label: 'Agenda Diária', icon: Calendar },
    { to: '/admin/locais', label: 'Locais', icon: MapPin },
    { to: '/admin/alimentos', label: 'Banco de Alimentos', icon: Utensils },
    { to: '/admin/dietas', label: 'Planos Alimentares', icon: Apple },
    { to: '/admin/planos', label: 'Preços de Consulta', icon: CreditCard },
    { to: '/admin/config', label: 'Landing Page', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className={cn(
        "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col fixed inset-y-0 z-50 lg:relative",
        isSidebarOpen ? "w-64" : "w-20",
        !isSidebarOpen && "hidden lg:flex"
      )}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <span className="font-black text-[#869471] text-xl tracking-tight">Admin.</span>}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm",
                isActive 
                  ? "bg-[#869471] text-white shadow-xl shadow-[#869471]/20" 
                  : "text-slate-500 hover:bg-[#869471]/5 hover:text-[#869471]"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <button 
             onClick={handleLogout}
             className={cn(
               "flex items-center gap-3 p-4 w-full rounded-2xl transition-all font-bold text-sm text-red-500 hover:bg-red-50",
               !isSidebarOpen && "justify-center"
             )}
           >
             <LogOut className="w-5 h-5 flex-shrink-0" />
             {isSidebarOpen && <span>Sair</span>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10 lg:hidden">
           <span className="font-black text-[#869471] text-xl tracking-tight">Admin.</span>
           <button onClick={() => setSidebarOpen(true)} className="p-2 border border-slate-100 rounded-lg">
             <Menu className="w-5 h-5" />
           </button>
        </header>
        <div className="max-w-6xl mx-auto p-6 lg:p-10 pb-32">
          <Outlet />
        </div>

        {/* AI Assistant */}
        <AIChat />
      </main>
    </div>
  );
}
