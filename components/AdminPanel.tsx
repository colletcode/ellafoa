import React, { useState } from 'react';
import { LayoutDashboard, Users, Calendar as CalendarIcon, Scissors, DollarSign, Package, Settings, LogOut, Menu, X, BarChart3 } from 'lucide-react';
import { Dashboard } from './Dashboard'; 
import { Clients } from './Clients';
import { Reports } from './Reports';
import { Services } from './Services';
import { Financials } from './Financials';
import { Inventory } from './Inventory';
import { Settings as SettingsPage } from './Settings';
import { Welcome } from './Welcome'; 
import { Agenda } from './Agenda'; 

export const AdminPanel: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (showWelcome) return <Welcome onStart={() => setShowWelcome(false)} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onQuickSchedule={() => setActiveTab('agendamento')} />;
      case 'clientes': return <Clients />;
      case 'agendamento': return <Agenda />;
      case 'servicos': return <Services />;
      case 'financeiro': return <Financials />;
      case 'estoque': return <Inventory />;
      case 'relatorios': return <Reports />;
      case 'config': return <SettingsPage />;
      default: return <Dashboard onQuickSchedule={() => setActiveTab('agendamento')} />;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'agendamento', label: 'Agenda', icon: CalendarIcon },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'servicos', label: 'Serviços', icon: Scissors },
    { id: 'estoque', label: 'Estoque', icon: Package }, // --- ESTOQUE ESTÁ AQUI ---
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'config', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      <aside className={`fixed md:relative z-40 bg-white w-64 h-full border-r border-gray-100 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-center border-b border-gray-50 gap-3">
           <img src="/logo-ellafoa.png" alt="Logo" className="w-10 h-10 object-contain" />
           <h1 className="text-2xl font-black tracking-tighter text-[#D95D9B]">ELLA<span className="text-gray-800">FOA</span></h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center p-3.5 rounded-xl transition-all duration-200 group ${activeTab === item.id ? 'bg-pink-50 text-[#D95D9B] font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <item.icon className={`w-5 h-5 mr-3 transition-colors ${activeTab === item.id ? 'text-[#D95D9B]' : 'text-gray-400 group-hover:text-gray-600'}`} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-50">
          <button className="w-full flex items-center p-3 rounded-xl text-red-500 hover:bg-red-50 transition font-medium text-sm font-bold">
            <LogOut className="w-5 h-5 mr-3" /> Sair do Sistema
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white p-4 flex md:hidden justify-between items-center border-b border-gray-100 shadow-sm z-30"><h2 className="font-bold text-gray-800">Menu</h2><button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">{isMobileMenuOpen ? <X /> : <Menu />}</button></header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-[#F9FAFB]"><div className="max-w-7xl mx-auto animate-fade-in">{renderContent()}</div></div>
      </main>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>}
    </div>
  );
};