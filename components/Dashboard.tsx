import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, where, getDocs, addDoc, updateDoc, doc, orderBy } from 'firebase/firestore';
import { 
  TrendingUp, TrendingDown, Calendar, 
  X, Users, Building2, DollarSign, Star, FileText, ShoppingBag, Plus, Trophy
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';

interface DashboardProps {
  onQuickSchedule: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onQuickSchedule }) => {
  // --- DADOS REAIS ---
  const [financials, setFinancials] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]); // Para o PDV
  const [loading, setLoading] = useState(true);

  // Modais
  const [activeModal, setActiveModal] = useState<'ENTRADA' | 'SAIDA' | 'PDV' | null>(null);
  const [showQuickClient, setShowQuickClient] = useState(false); // Sub-modal para criar cliente rápido

  // Formulários
  const [financialForm, setFinancialForm] = useState({ description: '', value: '', date: new Date().toISOString().split('T')[0], category: 'Outro', account: 'NEGOCIO', paymentMethod: 'Dinheiro', institution: '', notes: '' });
  const [pdvForm, setPdvForm] = useState({ productId: '', clientId: '', quantity: '1', paymentMethod: 'Dinheiro', notes: '' });
  const [clientForm, setClientForm] = useState({ name: '', phone: '' }); // Cliente Rápido

  // --- CARREGAR DADOS ---
  useEffect(() => {
    const unsubFin = onSnapshot(query(collection(db, "financials")), (snap) => setFinancials(snap.docs.map(d => d.data())));
    const unsubApp = onSnapshot(query(collection(db, "agendamentos")), (snap) => setAppointments(snap.docs.map(d => d.data())));
    const unsubCli = onSnapshot(query(collection(db, "clients"), orderBy('name')), (snap) => setClients(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubInv = onSnapshot(query(collection(db, "inventory")), (snap) => setInventory(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    setLoading(false);
    return () => { unsubFin(); unsubApp(); unsubCli(); unsubInv(); };
  }, []);

  // --- AÇÕES ---

  // 1. SALVAR FINANCEIRO MANUAL
  const handleFinancialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "financials"), {
        ...financialForm,
        value: parseFloat(financialForm.value) || 0,
        type: activeModal === 'ENTRADA' ? 'ENTRADA' : 'SAIDA',
        status: 'Pago',
        created_at: new Date()
      });
      alert("Registrado com sucesso!");
      closeModal();
    } catch (e) { alert("Erro ao salvar."); }
  };

  // 2. SALVAR CLIENTE RÁPIDO (No meio do PDV)
  const handleQuickClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, "clients"), {
        name: clientForm.name,
        phone: clientForm.phone,
        dateRegistered: new Date().toISOString(),
        totalSpent: 0,
        visits: 0
      });
      setPdvForm({ ...pdvForm, clientId: docRef.id }); // Já seleciona o novo cliente
      setShowQuickClient(false);
      alert("Cliente cadastrado!");
    } catch (e) { alert("Erro ao cadastrar cliente."); }
  };

  // 3. PROCESSAR VENDA (PDV)
  const handlePDVSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = inventory.find(i => i.id === pdvForm.productId);
    const client = clients.find(c => c.id === pdvForm.clientId);
    const qty = parseInt(pdvForm.quantity);

    if (!product || !client) return alert("Selecione produto e cliente.");
    if (product.currentQty < qty) return alert("Estoque insuficiente!");

    const totalValue = (product.salePrice || 0) * qty;

    try {
      // A. Lança Entrada Financeira
      await addDoc(collection(db, "financials"), {
        date: new Date().toISOString().split('T')[0],
        description: `Venda: ${product.name} (${qty}x)`,
        value: totalValue,
        type: 'ENTRADA',
        category: 'Venda de Produto',
        account: 'NEGOCIO',
        paymentMethod: pdvForm.paymentMethod,
        status: 'Pago',
        notes: `Cliente: ${client.name} | Obs: ${pdvForm.notes}`
      });

      // B. Baixa no Estoque
      await updateDoc(doc(db, "inventory", product.id), {
        currentQty: product.currentQty - qty
      });

      // C. Atualiza Histórico do Cliente
      await updateDoc(doc(db, "clients", client.id), {
        totalSpent: (client.totalSpent || 0) + totalValue
      });

      alert("Venda realizada com sucesso!");
      closeModal();
    } catch (e) { alert("Erro ao processar venda."); }
  };

  const closeModal = () => { setActiveModal(null); setFinancialForm({ ...financialForm, value: '', description: '' }); setPdvForm({ ...pdvForm, productId: '', clientId: '' }); };

  // --- DADOS GRÁFICOS ---
  const stats = useMemo(() => {
    const totalRev = financials.filter(f => f.type === 'ENTRADA').reduce((a, b) => a + (b.value || 0), 0) + 
                     appointments.filter(a => a.status !== 'CANCELADO').reduce((a, b) => a + (b.valorTotal || 0), 0);
    return [
      { label: 'Faturamento Total', value: `R$ ${totalRev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Agendamentos', value: appointments.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Clientes', value: clients.length, icon: Users, color: 'text-pink-600', bg: 'bg-pink-50' },
    ];
  }, [financials, appointments, clients]);

  const weeklyData = useMemo(() => {
    return [
      { name: 'Agendados', value: appointments.filter(s => s.status === 'CONFIRMADO' || s.status === 'Pendente').length, fill: '#FCD34D' },
      { name: 'Concluídos', value: appointments.filter(s => s.status === 'CONCLUÍDO' || s.status === 'Pago' || s.status === 'CONCLUIDO').length, fill: '#6EE7B7' },
      { name: 'Cancelados', value: appointments.filter(s => s.status === 'CANCELADO').length, fill: '#FCA5A5' }
    ];
  }, [appointments]);

  // --- LÓGICA DO TOP 3 SERVIÇOS (MÊS ATUAL) ---
  const topServices = useMemo(() => {
    // 1. Pega data de inicio do mês atual "YYYY-MM"
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); 

    // 2. Filtra agendamentos concluidos neste mês
    const completedThisMonth = appointments.filter(a => 
      (a.status === 'CONCLUIDO' || a.status === 'CONCLUÍDO' || a.status === 'Pago') && 
      a.data && a.data.startsWith(currentMonthPrefix)
    );

    // 3. Conta ocorrências
    const counts: { [key: string]: number } = {};
    completedThisMonth.forEach(a => {
      const serviceName = a.servicoNome || 'Desconhecido';
      counts[serviceName] = (counts[serviceName] || 0) + 1;
    });

    // 4. Ordena e pega top 3
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [appointments]);

  return (
    <div className="min-h-screen bg-white w-full p-4 md:p-8 space-y-6 pb-20">
      
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-800">Visão Geral</h1><p className="text-sm text-gray-500">Resumo do dia</p></div>
        <div className="flex flex-wrap gap-3">
          <button onClick={onQuickSchedule} className="flex items-center gap-2 bg-[#D95D9B] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-pink-600 transition"><Calendar className="w-4 h-4" /> <span>Agendar</span></button>
          
          {/* BOTÃO MÁGICO PDV */}
          <button onClick={() => setActiveModal('PDV')} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-purple-700 transition"><ShoppingBag className="w-4 h-4" /> <span>Venda Rápida</span></button>
          
          <button onClick={() => setActiveModal('ENTRADA')} className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-bold border border-green-200 hover:bg-green-100"><TrendingUp className="w-4 h-4" /> <span>Entrada</span></button>
          <button onClick={() => setActiveModal('SAIDA')} className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm font-bold border border-red-200 hover:bg-red-100"><TrendingDown className="w-4 h-4" /> <span>Saída</span></button>
        </div>
      </div>

      {/* 2. CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{stat.label}</p><h3 className={`text-2xl font-black mt-2 ${stat.color}`}>{stat.value}</h3></div>
            <div className={`p-4 rounded-xl ${stat.bg}`}><stat.icon className={`w-6 h-6 ${stat.color}`} /></div>
          </div>
        ))}
      </div>

      {/* 3. GRÁFICOS E TOP 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO SEMANAL */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[350px]">
           <h3 className="font-bold text-gray-800 mb-4">Status Semanal</h3>
           <ResponsiveContainer width="100%" height="100%"><BarChart data={weeklyData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis hide /><RechartsTooltip cursor={{fill: 'transparent'}} /><Bar dataKey="value" radius={[10, 10, 0, 0]}>{weeklyData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer>
        </div>

        {/* --- TOP 3 SERVIÇOS DO MÊS --- */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl shadow-sm border border-orange-100 h-[350px] overflow-hidden relative">
           {/* Fundo Decorativo */}
           <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10"><Trophy size={120} className="text-orange-400"/></div>
           
           <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 relative z-10">
              <Trophy size={20} className="text-orange-500 fill-orange-500"/> Top 3 do Mês
           </h3>
           
           <div className="space-y-4 relative z-10">
              {topServices.length === 0 ? (
                 <div className="h-40 flex flex-col items-center justify-center text-gray-400 opacity-60">
                    <Star size={32} className="mb-2"/>
                    <p className="text-sm">Sem serviços concluídos este mês.</p>
                 </div>
              ) : (
                 topServices.map((service, index) => {
                    // Estilos do Podium
                    let rankStyle = "bg-white border-orange-100 text-gray-600";
                    let iconColor = "text-orange-300";
                    
                    if (index === 0) { 
                        rankStyle = "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-transparent shadow-lg shadow-orange-200 transform scale-105"; 
                        iconColor = "text-white"; 
                    } else if (index === 1) { 
                        rankStyle = "bg-white border-gray-200 text-gray-700"; 
                        iconColor = "text-gray-400"; 
                    } else { 
                        rankStyle = "bg-white/80 border-orange-50 text-gray-700 opacity-90"; 
                        iconColor = "text-orange-300"; 
                    }

                    return (
                       <div key={service.name} className={`flex items-center justify-between p-3 rounded-xl border shadow-sm transition-all ${rankStyle}`}>
                          <div className="flex items-center gap-3 overflow-hidden">
                             <div className={`font-black text-lg w-6 text-center flex-shrink-0 ${iconColor}`}>#{index + 1}</div>
                             <p className="font-bold text-sm truncate">{service.name}</p>
                          </div>
                          <div className="text-xs font-bold bg-white/30 px-2 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1 shrink-0">
                            {service.count} <CheckCircle size={10}/>
                          </div>
                       </div>
                    );
                 })
              )}
           </div>
        </div>
      </div>

      {/* --- MODAIS (MANTIDOS IGUAIS) --- */}
      {activeModal && (
        <div className="fixed inset-0 z-[9999] flex justify-center items-start pt-20 p-4 bg-white/80 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={closeModal}></div>
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-gray-100">
            
            {/* CABEÇALHO */}
            <div className={`p-5 flex justify-between items-center text-white ${activeModal === 'PDV' ? 'bg-purple-600' : activeModal === 'ENTRADA' ? 'bg-green-500' : 'bg-red-500'}`}>
              <h3 className="font-bold text-lg">{activeModal === 'PDV' ? 'Venda de Produto' : activeModal === 'ENTRADA' ? 'Nova Entrada' : 'Nova Saída'}</h3>
              <button onClick={closeModal}><X size={20} /></button>
            </div>

            {/* CORPO DO FORMULÁRIO */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
                
                {/* --- MODAL DE PDV (VENDA) --- */}
                {activeModal === 'PDV' ? (
                  !showQuickClient ? (
                    <form onSubmit={handlePDVSubmit} className="space-y-4">
                      {/* Seleção de Produto */}
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Produto (Revenda)</label>
                        <select className="w-full border p-3 rounded-xl bg-white font-bold text-gray-700" value={pdvForm.productId} onChange={e => setPdvForm({...pdvForm, productId: e.target.value})} required>
                          <option value="">Selecione...</option>
                          {inventory.filter(i => i.type === 'REVENDA').map(p => (
                            <option key={p.id} value={p.id}>{p.name} - R$ {p.salePrice} (Est: {p.currentQty})</option>
                          ))}
                        </select>
                      </div>

                      {/* Seleção de Cliente */}
                      <div>
                        <div className="flex justify-between mb-1"><label className="text-xs font-bold text-gray-400 uppercase">Cliente</label><button type="button" onClick={() => setShowQuickClient(true)} className="text-xs font-bold text-purple-600 flex items-center hover:underline"><Plus size={12}/> Novo</button></div>
                        <select className="w-full border p-3 rounded-xl bg-white font-medium" value={pdvForm.clientId} onChange={e => setPdvForm({...pdvForm, clientId: e.target.value})} required>
                          <option value="">Selecione...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Qtd</label><input type="number" min="1" className="w-full border p-3 rounded-xl font-bold" value={pdvForm.quantity} onChange={e => setPdvForm({...pdvForm, quantity: e.target.value})} /></div>
                         <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Pagamento</label><select className="w-full border p-3 rounded-xl bg-white" value={pdvForm.paymentMethod} onChange={e => setPdvForm({...pdvForm, paymentMethod: e.target.value})}><option>Dinheiro</option><option>Pix</option><option>Cartão</option></select></div>
                      </div>

                      {/* Total Estimado */}
                      <div className="bg-purple-50 p-4 rounded-xl flex justify-between items-center text-purple-800">
                         <span className="font-bold text-sm">Total:</span>
                         <span className="font-black text-xl">R$ {((inventory.find(i => i.id === pdvForm.productId)?.salePrice || 0) * parseInt(pdvForm.quantity || '0')).toFixed(2)}</span>
                      </div>

                      <button type="submit" className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700">Confirmar Venda</button>
                    </form>
                  ) : (
                    // SUB-MODAL CLIENTE RÁPIDO
                    <div className="space-y-4 animate-slide-in">
                       <h4 className="font-bold text-gray-700">Novo Cliente Rápido</h4>
                       <input className="w-full border p-3 rounded-xl" placeholder="Nome" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} />
                       <input className="w-full border p-3 rounded-xl" placeholder="WhatsApp" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} />
                       <div className="flex gap-2">
                          <button onClick={() => setShowQuickClient(false)} className="flex-1 py-3 border rounded-xl font-bold text-gray-500">Cancelar</button>
                          <button onClick={handleQuickClientSubmit} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold">Salvar</button>
                       </div>
                    </div>
                  )
                ) : (
                  // --- MODAL DE ENTRADA/SAIDA NORMAL ---
                  <form onSubmit={handleFinancialSubmit} className="space-y-4">
                     <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição</label><input type="text" className="w-full border p-3 rounded-xl font-bold text-gray-700" placeholder="Ex: Conta de Luz" value={financialForm.description} onChange={e => setFinancialForm({...financialForm, description: e.target.value})} required /></div>
                     <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor (R$)</label><input type="number" step="0.01" className="w-full border p-3 rounded-xl font-black text-lg text-gray-800" value={financialForm.value} onChange={e => setFinancialForm({...financialForm, value: e.target.value})} required /></div>
                     <button type="submit" className={`w-full py-4 text-white font-bold rounded-xl shadow-lg mt-2 ${activeModal === 'ENTRADA' ? 'bg-green-500' : 'bg-red-500'}`}>Salvar</button>
                  </form>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};