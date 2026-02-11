import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, Users, DollarSign, 
  Settings, LogOut, Menu, X, ShoppingBag, Loader2, Box 
} from 'lucide-react';

// --- AUTH FIREBASE (SEGURANÇA) ---
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// --- SEUS COMPONENTES ---
import { Login } from './components/Login';
import { PublicBooking } from './components/PublicBooking';
import { Dashboard } from './components/Dashboard';
import { Agenda } from './components/Agenda';
import { Clients } from './components/Clients';
import { Financials } from './components/Financials';
import { Services } from './components/Services';
import { Inventory } from './components/Inventory';
import { Settings as SettingsPage } from './components/Settings';
import { Welcome } from './components/Welcome'; 

// ============================================================================
// 1. COMPONENTE DO PAINEL ADMINISTRATIVO (LAYOUT COM MENU)
// ============================================================================
const AdminLayout = () => {
  const [appStarted, setAppStarted] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openAgendaModal, setOpenAgendaModal] = useState(false);

  if (!appStarted) {
    return <Welcome onStart={() => setAppStarted(true)} />;
  }

  const handleQuickSchedule = () => {
    setActiveTab('agenda');
    setOpenAgendaModal(true);
    setTimeout(() => setOpenAgendaModal(false), 1000);
  };

  const handleLogout = async () => {
    if(confirm("Tem certeza que deseja sair do sistema?")) {
      await signOut(auth);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'services', label: 'Catálogo', icon: ShoppingBag },
    { id: 'inventory', label: 'Estoque', icon: Box },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onQuickSchedule={handleQuickSchedule} />;
      case 'agenda': return <Agenda autoOpen={openAgendaModal} />;
      case 'clients': return <Clients />;
      case 'financial': return <Financials />;
      case 'services': return <Services />;
      case 'inventory': return <Inventory />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard onQuickSchedule={handleQuickSchedule} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900 animate-in fade-in">
      
      {/* MENU LATERAL (SIDEBAR) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* LOGO E NOME (ALTERADO) */}
        <div className="flex items-center justify-center gap-3 h-24 border-b border-gray-100 px-4">
          {/* Certifique-se de que a imagem 'logo-ellafoa.png' está na pasta public */}
          <img src="/logo-ellafoa.png" alt="Logo" className="w-10 h-10 rounded-full object-contain bg-white shadow-sm border border-gray-100" />
          <h1 className="text-xl font-black tracking-tighter text-[#D95D9B]">ELLA<span className="text-gray-800">FOA</span></h1>
        </div>

        {/* Links de Navegação */}
        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
              className={`flex items-center w-full px-4 py-3.5 text-sm font-bold rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-[#D95D9B] text-white shadow-md shadow-pink-200 translate-x-1' 
                  : 'text-gray-500 hover:bg-pink-50 hover:text-[#D95D9B]'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-white' : 'text-gray-400'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Botão de Sair no Rodapé */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 bg-white">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-sm font-bold text-red-500 rounded-xl hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5 mr-3" /> Sair
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header Mobile */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm z-40">
          <div className="flex items-center gap-2">
             <img src="/logo-ellafoa.png" alt="Logo" className="w-8 h-8 rounded-full" />
             <h1 className="text-xl font-black text-[#D95D9B]">ELLAFOA</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 rounded-lg hover:bg-gray-100">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-0 md:p-2">
          {renderContent()}
        </main>
      </div>

      {isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black/30 lg:hidden backdrop-blur-sm transition-opacity"></div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#D95D9B] animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/agendar" element={<PublicBooking />} />
        <Route path="/*" element={ user ? <AdminLayout /> : <Login /> } />
      </Routes>
    </Router>
  );
}