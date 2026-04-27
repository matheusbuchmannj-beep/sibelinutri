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
import Dietas from './pages/dashboard/Dietas';
import DietaEditor from './pages/dashboard/DietaEditor';
import Planos from './pages/dashboard/Planos';
import Alimentos from './pages/dashboard/Alimentos';
import PatientDiet from './pages/PatientDiet';

import AdminGuard from './components/AdminGuard';

export default function App() {
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
          <Route path="dietas" element={<Dietas />} />
          <Route path="dietas/novo" element={<DietaEditor />} />
          <Route path="dietas/editar/:id" element={<DietaEditor />} />
          <Route path="alimentos" element={<Alimentos />} />
          <Route path="planos" element={<Planos />} />
          <Route path="config" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
