import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Filter, PieChart, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export const Reports: React.FC = () => {
  // --- DADOS REAIS ---
  const [financials, setFinancials] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getLocalDateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const [startDate, setStartDate] = useState(getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [endDate, setEndDate] = useState(getLocalDateString(new Date()));

  // --- 1. CARREGAR DADOS ---
  useEffect(() => {
    // Carrega Financeiro
    const unsubFin = onSnapshot(query(collection(db, "financials")), (snap) => {
      setFinancials(snap.docs.map(d => ({ ...d.data(), id: d.id, source: 'manual' })));
    });
    // Carrega Agenda
    const unsubApp = onSnapshot(query(collection(db, "agendamentos")), (snap) => {
      setAppointments(snap.docs.map(d => ({ ...d.data(), id: d.id, source: 'agenda', type: 'ENTRADA', value: d.data().valorTotal, status: d.data().status === 'CONFIRMADO' ? 'Pendente' : d.data().status })));
    });
    setLoading(false);
    return () => { unsubFin(); unsubApp(); };
  }, []);

  // --- 2. FILTRAR E CALCULAR ---
  const reportData = useMemo(() => {
    // Junta tudo (Agenda + Manual)
    const all = [...financials, ...appointments];
    
    // Filtra por data
    const filtered = all.filter(item => item.date >= startDate && item.date <= endDate && item.status !== 'CANCELADO');

    // Calcula Totais (Considerando apenas o que foi PAGO/CONCLUÍDO para o Realizado)
    const income = filtered.filter(i => i.type === 'ENTRADA' && (i.status === 'Pago' || i.status === 'CONCLUÍDO')).reduce((acc, cur) => acc + (Number(cur.value) || 0), 0);
    const expense = filtered.filter(i => i.type === 'SAIDA' && i.status === 'Pago').reduce((acc, cur) => acc + (Number(cur.value) || 0), 0);
    
    // Previsão (Inclui Pendentes)
    const incomeForecast = filtered.filter(i => i.type === 'ENTRADA').reduce((acc, cur) => acc + (Number(cur.value) || 0), 0);
    const expenseForecast = filtered.filter(i => i.type === 'SAIDA').reduce((acc, cur) => acc + (Number(cur.value) || 0), 0);

    return {
      income, expense, profit: income - expense,
      incomeForecast, expenseForecast, profitForecast: incomeForecast - expenseForecast,
      count: filtered.length
    };
  }, [financials, appointments, startDate, endDate]);

  return (
    <div className="space-y-8 animate-fade-in pb-20 p-4 md:p-8">
      {/* HEADER E FILTROS */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
           <h2 className="text-2xl font-black text-gray-800 flex items-center"><Filter className="w-6 h-6 mr-3 text-[#D95D9B]"/>Relatório Financeiro</h2>
           <button onClick={() => window.print()} className="bg-gray-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition w-full md:w-auto">Imprimir PDF</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl">
          <div className="col-span-2 md:col-span-1"><label className="text-xs font-bold text-gray-400 uppercase ml-1">De</label><input type="date" className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none focus:border-[#D95D9B]" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>
          <div className="col-span-2 md:col-span-1"><label className="text-xs font-bold text-gray-400 uppercase ml-1">Até</label><input type="date" className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none focus:border-[#D95D9B]" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>
        </div>
      </div>

      {/* CARDS DE RESULTADO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Receita */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition">
           <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={48} className="text-green-500"/></div>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Receita Realizada</p>
           <h3 className="text-3xl font-black text-green-600 mt-2">R$ {reportData.income.toFixed(2)}</h3>
           <p className="text-xs text-green-400 font-bold mt-1">Previsto: R$ {reportData.incomeForecast.toFixed(2)}</p>
        </div>

        {/* Despesas */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition">
           <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingDown size={48} className="text-red-500"/></div>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Despesas Pagas</p>
           <h3 className="text-3xl font-black text-red-500 mt-2">R$ {reportData.expense.toFixed(2)}</h3>
           <p className="text-xs text-red-300 font-bold mt-1">Previsto: R$ {reportData.expenseForecast.toFixed(2)}</p>
        </div>

        {/* Lucro */}
        <div className={`p-6 rounded-[2rem] shadow-lg text-white relative overflow-hidden transition ${reportData.profit >= 0 ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-red-500'}`}>
           <div className="absolute top-0 right-0 p-4 opacity-20"><DollarSign size={48} /></div>
           <p className="text-xs font-bold opacity-60 uppercase tracking-wider">Lucro Líquido</p>
           <h3 className="text-4xl font-black mt-2">R$ {reportData.profit.toFixed(2)}</h3>
           <div className={`mt-2 inline-flex px-2 py-1 rounded text-xs font-bold ${reportData.profit >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-white/20 text-white'}`}>
              Margem: {reportData.income > 0 ? ((reportData.profit / reportData.income) * 100).toFixed(0) : 0}%
           </div>
        </div>
      </div>

      {loading && <p className="text-center text-gray-400">Calculando dados...</p>}
    </div>
  );
};