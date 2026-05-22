import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Overview from './pages/dashboard/Overview';
import Locais from './pages/dashboard/Locais';
import Agenda from './pages/dashboard/Agenda';
import SettingsPage from './pages/dashboard/Settings';
import Pacientes from './pages/dashboard/Pacientes';
import PatientDiet from './pages/PatientDiet';

import AdminGuard from './components/AdminGuard';

export default function App() {
  useEffect(() => {
    const link = (document.querySelector("link[rel~='icon']") as HTMLLinkElement) || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'shortcut icon';
    link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍉</text></svg>';
    document.getElementsByTagName('head')[0].appendChild(link);
    
    // Also try to update general title if default
    if (document.title.includes('Vite') || document.title === '') {
      document.title = "Nutricionista — Agendamento de Consultas";
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Booking Page */}
        <Route path="/" element={<Home />} />
        
        {/* Public Patient Diet View */}
        <Route path="/dieta" element={<PatientDiet />} />
        
        {/* Protected Admin Section */}
        <Route 
          path="/admin" 
          element={<AdminGuard><DashboardLayout /></AdminGuard>}
        >
          <Route index element={<Overview />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="locais" element={<Locais />} />
          <Route path="pacientes" element={<Pacientes />} />
          <Route path="config" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
