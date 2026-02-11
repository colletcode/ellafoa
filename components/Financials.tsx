import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../store';
import { db } from '../firebase';
import { collection, addDoc, query, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { 
  ArrowDownRight, ArrowUpRight, X, Pencil, Trash2, 
  CheckCircle, Clock, Wallet, Building2, Calendar, Users, DollarSign, FileText, Tag
} from 'lucide-react';
import { AccountType, TransactionType } from '../types';

export const Financials: React.FC = () => {
  // --- ESTADOS DE DADOS ---
  const [financials, setFinancials] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  
  const [filterAccount, setFilterAccount] = useState<AccountType>(AccountType.NEGOCIO);
  const [activeModal, setActiveModal] = useState<'PAY' | 'RECEIVE' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // --- FORMULÁRIO TURBINADO ---
  const [form, setForm] = useState({
    description: '',
    category: 'Outros', // NOVO: Categoria Específica
    contact: '',        // NOVO: Cliente ou Fornecedor
    notes: '',
    value: '',
    account: AccountType.NEGOCIO,
    paymentMethod: 'Dinheiro',
    institution: '', 
    date: new Date().toISOString().split('T')[0]
  });

  // --- LISTAS DE CATEGORIAS ---
  const incomeCategories = ['Venda de Produto', 'Serviço Extra', 'Aporte', 'Outros'];
  const expenseCategories = ['Despesa Fixa', 'Despesa Variável', 'Fornecedor', 'Pró-Labore', 'Impostos', 'Marketing', 'Outros'];

  // --- 1. BUSCAR DADOS (FIREBASE) ---
  useEffect(() => {
    const qFin = query(collection(db, "financials"));
    const unsubFin = onSnapshot(qFin, (snap) => setFinancials(snap.docs.map(d => ({ id: d.id, source: 'manual', ...d.data() }))));
    
    const qAppt = query(collection(db, "agendamentos"));
    const unsubAppt = onSnapshot(qAppt, (snap) => {
      setAppointments(snap.docs.map(d => ({ 
        id: d.id, 
        source: 'agendamento',
        type: 'ENTRADA',
        category: 'Serviço Agendado', // Categoria automática para agenda
        description: `${d.data().servicoNome}`,
        contact: `${d.data().nome} ${d.data().sobrenome}`, // Puxa o nome do cliente
        value: d.data().valorTotal,
        date: d.data().data,
        status: d.data().status === 'CONFIRMADO' ? 'Pendente' : d.data().status,
        account: AccountType.NEGOCIO,
        paymentMethod: d.data().pagamento,
        ...d.data() 
      })).filter(i => i.status !== 'CANCELADO'));
    });

    return () => { unsubFin(); unsubAppt(); };
  }, []);

  // --- TRAVA DE ROLAGEM ---
  useEffect(() => {
    if (activeModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [activeModal]);

  // --- PROCESSAMENTO ---
  const allRecords = useMemo(() => {
    return [...appointments, ...financials].filter(f => f.account === filterAccount).sort((a, b) => {
       if (a.date === b.date) return 0;
       return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [appointments, financials, filterAccount]);

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, any[]> = {};
    allRecords.forEach(rec => {
      try {
        const monthKey = new Date(rec.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (!groups[monthKey]) groups[monthKey] = [];
        groups[monthKey].push(rec);
      } catch (e) {}
    });
    return groups;
  }, [allRecords]);

  // Totais do Dashboard
  const summary = useMemo(() => {
    const data = allRecords;
    const incomeReal = data.filter(f => f.type === 'ENTRADA' && (f.status === 'Pago' || f.status === 'CONCLUÍDO')).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const expenseReal = data.filter(f => f.type === 'SAIDA' && f.status === 'Pago').reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const toReceive = data.filter(f => f.type === 'ENTRADA' && f.status === 'Pendente').reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const toPay = data.filter(f => f.type === 'SAIDA' && f.status === 'Pendente').reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

    return { 
      balanceReal: incomeReal - expenseReal,
      toReceive, toPay,
      forecastBalance: (incomeReal - expenseReal) + toReceive - toPay
    };
  }, [allRecords]);

  // --- AÇÕES ---
  const handleEdit = (record: any) => {
    if (record.source === 'agendamento') return alert("Edite agendamentos direto na Agenda.");
    
    setForm({
      description: record.description || '',
      category: record.category || 'Outros',
      contact: record.contact || '',
      notes: record.notes || '',
      value: (record.value || 0).toString(),
      account: record.account || AccountType.NEGOCIO,
      paymentMethod: record.paymentMethod || 'Dinheiro',
      institution: record.institution || '', 
      date: record.date
    });
    setCurrentId(record.id);
    setIsEditing(true);
    setActiveModal(record.type === 'ENTRADA' ? 'RECEIVE' : 'PAY');
  };

  const handleConclude = async (record: any) => {
    if (confirm(`Confirmar baixa de R$ ${Number(record.value).toFixed(2)}?`)) {
      const col = record.source === 'agendamento' ? 'agendamentos' : 'financials';
      const status = record.source === 'agendamento' ? 'CONCLUÍDO' : 'Pago';
      await updateDoc(doc(db, col, record.id), { status });
    }
  };

  const handleDelete = async (record: any) => {
    if (confirm("Excluir este lançamento permanentemente?")) {
      const col = record.source === 'agendamento' ? 'agendamentos' : 'financials';
      await deleteDoc(doc(db, col, record.id));
      setConfirmDeleteId(null);
    }
  };

  const closeModal = () => {
    setActiveModal(null); setIsEditing(false); setCurrentId(null);
    setForm({ description: '', category: 'Outros', contact: '', notes: '', value: '', account: AccountType.NEGOCIO, paymentMethod: 'Dinheiro', institution: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(form.value.toString().replace(',', '.')) || 0;
    
    // Define categoria padrão se estiver vazia
    let finalCategory = form.category;
    if (!finalCategory) {
       finalCategory = activeModal === 'RECEIVE' ? 'Outros' : 'Despesa Variável';
    }

    const payload = {
      ...form,
      value: val,
      category: finalCategory, // Salva a categoria escolhida
      type: activeModal === 'RECEIVE' ? 'ENTRADA' : 'SAIDA',
      status: 'Pendente', // Lançamento manual nasce pendente (opcional: mudar para Pago direto)
      created_at: new Date()
    };

    try {
      if (isEditing && currentId) {
        await updateDoc(doc(db, "financials", currentId), payload);
      } else {
        await addDoc(collection(db, "financials"), payload);
      }
      closeModal();
    } catch (e) { alert("Erro ao salvar."); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 p-4 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <div>
            <h2 className="text-2xl font-bold text-gray-800">Financeiro</h2>
            <div className="flex gap-2 mt-2 bg-white p-1 rounded-full border border-gray-100 shadow-sm w-fit">
               <button onClick={() => setFilterAccount(AccountType.NEGOCIO)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${filterAccount === AccountType.NEGOCIO ? 'bg-[#D95D9B] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Negócio</button>
               <button onClick={() => setFilterAccount(AccountType.PESSOAL)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${filterAccount === AccountType.PESSOAL ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Pessoal</button>
            </div>
         </div>
         <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => { closeModal(); setActiveModal('PAY'); }} className="flex-1 md:flex-none bg-red-50 hover:bg-red-100 text-red-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center transition shadow-sm border border-red-100">
               <ArrowDownRight className="w-5 h-5 mr-2" /> Pagar
            </button>
            <button onClick={() => { closeModal(); setActiveModal('RECEIVE'); }} className="flex-1 md:flex-none bg-green-50 hover:bg-green-100 text-green-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center transition shadow-sm border border-green-100">
               <ArrowUpRight className="w-5 h-5 mr-2" /> Receber
            </button>
         </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
           <p className="text-xs text-gray-400 font-bold uppercase mb-1">Saldo em Caixa</p>
           <h3 className={`text-3xl font-black ${summary.balanceReal >= 0 ? 'text-gray-800' : 'text-red-500'}`}>R$ {summary.balanceReal.toFixed(2)}</h3>
           <div className="absolute right-[-10px] top-[-10px] p-4 bg-gray-50 rounded-full opacity-50"><Wallet className="w-12 h-12 text-gray-300" /></div>
        </div>
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm">
           <div className="flex justify-between items-start"><div><p className="text-xs text-red-400 font-bold uppercase mb-1">A Pagar</p><h3 className="text-2xl font-bold text-red-600">R$ {summary.toPay.toFixed(2)}</h3></div><Clock className="w-6 h-6 text-red-300" /></div>
        </div>
        <div className="bg-green-50 p-5 rounded-2xl border border-green-100 shadow-sm">
           <div className="flex justify-between items-start"><div><p className="text-xs text-green-600 font-bold uppercase mb-1">A Receber</p><h3 className="text-2xl font-bold text-green-700">R$ {summary.toReceive.toFixed(2)}</h3></div><Clock className="w-6 h-6 text-green-300" /></div>
        </div>
        <div className="bg-gray-800 p-5 rounded-2xl shadow-lg text-white">
           <div className="flex justify-between items-start"><div><p className="text-xs text-gray-400 font-bold uppercase mb-1">Previsão</p><h3 className={`text-2xl font-bold ${summary.forecastBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>R$ {summary.forecastBalance.toFixed(2)}</h3></div><Building2 className="w-6 h-6 text-gray-500" /></div>
        </div>
      </div>

      {/* LISTA DE TRANSAÇÕES */}
      <div className="space-y-8">
        {Object.entries(groupedByMonth).map(([month, records]) => (
          <div key={month} className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest pl-2 border-l-4 border-pink-200"><Calendar className="w-4 h-4" /> {month}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.map(record => (
                <div key={record.id} className={`group relative p-5 rounded-2xl border-l-[6px] shadow-sm bg-white hover:shadow-md transition-all ${record.type === 'ENTRADA' ? 'border-l-green-400' : 'border-l-red-400'} ${record.status === 'Pendente' ? 'opacity-90 border-dashed border-gray-300' : ''}`}>
                  
                  {/* Linha 1: Badges */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-wrap gap-2">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${record.source === 'agendamento' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{record.source === 'agendamento' ? 'Agenda' : 'Manual'}</span>
                       {/* ETIQUETA DA CATEGORIA */}
                       <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1"><Tag size={10}/> {record.category}</span>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${record.status === 'Pago' || record.status === 'CONCLUÍDO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {record.status === 'CONCLUÍDO' ? 'Pago' : record.status}
                    </span>
                  </div>

                  {/* Linha 2: Descrição e Cliente */}
                  <div className="mb-4">
                     <h4 className="font-bold text-gray-800 text-lg leading-tight mb-1">{record.description}</h4>
                     {record.contact && <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><Users size={12}/> {record.contact}</p>}
                     {record.notes && <p className="text-xs text-gray-400 italic mt-1 truncate">{record.notes}</p>}
                  </div>

                  {/* Linha 3: Valor e Ações */}
                  <div className="flex items-end justify-between mt-2 pt-3 border-t border-gray-50">
                     <div className={`text-xl font-black ${record.type === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                        {record.type === 'SAIDA' ? '-' : '+'} R$ {Number(record.value).toFixed(2)}
                     </div>
                     
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(record.status === 'Pendente') && (
                           <button onClick={() => handleConclude(record)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition" title="Dar Baixa"><CheckCircle className="w-4 h-4" /></button>
                        )}
                        {/* Só edita/exclui se for MANUAL (Agenda protege dados) */}
                        {record.source === 'manual' && (
                           <>
                             <button onClick={() => handleEdit(record)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"><Pencil className="w-4 h-4" /></button>
                             {confirmDeleteId === record.id ? (
                                <button onClick={() => handleDelete(record)} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-bold">OK</button>
                             ) : (
                                <button onClick={() => setConfirmDeleteId(record.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"><Trash2 className="w-4 h-4" /></button>
                             )}
                           </>
                        )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE LANÇAMENTO MANUAL MELHORADO */}
      {activeModal && (
        <div className="fixed inset-0 z-[99999] flex justify-center items-start pt-10 p-4 bg-white/80 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={closeModal}></div>
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 ring-2 ring-black/5">
            
            <div className={`p-5 flex justify-between items-center text-white shrink-0 ${activeModal === 'RECEIVE' ? 'bg-green-600' : 'bg-red-600'}`}>
              <div>
                 <h3 className="font-bold text-lg">{isEditing ? 'Editar' : activeModal === 'RECEIVE' ? 'Nova Receita' : 'Nova Despesa'}</h3>
                 <p className="text-white/80 text-xs">Lançamento Financeiro Detalhado</p>
              </div>
              <button onClick={closeModal} className="hover:bg-white/20 p-2 rounded-full transition"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Tipo de Conta */}
                <div className="flex bg-gray-50 p-1 rounded-xl">
                    <button type="button" onClick={() => setForm({...form, account: AccountType.NEGOCIO})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${form.account === AccountType.NEGOCIO ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>Negócio</button>
                    <button type="button" onClick={() => setForm({...form, account: AccountType.PESSOAL})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${form.account === AccountType.PESSOAL ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>Pessoal</button>
                </div>

                {/* Descrição e Valor */}
                <div className="grid grid-cols-2 gap-3">
                   <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição</label>
                      <input type="text" className="w-full border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-700 outline-none focus:border-gray-400" placeholder="Ex: Aluguel..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
                   </div>
                   <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor (R$)</label>
                      <input type="number" step="0.01" className="w-full border border-gray-200 rounded-xl p-3 text-xl font-black text-gray-800 outline-none focus:border-gray-400" placeholder="0,00" value={form.value} onChange={e => setForm({...form, value: e.target.value})} required />
                   </div>
                </div>

                {/* Categoria e Contato (NOVOS) */}
                <div className="grid grid-cols-2 gap-3">
                   <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Categoria</label>
                      <select className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-white outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                         {(activeModal === 'RECEIVE' ? incomeCategories : expenseCategories).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{activeModal === 'RECEIVE' ? 'Cliente' : 'Fornecedor'}</label>
                      <input type="text" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none" placeholder="Nome..." value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} />
                   </div>
                </div>

                {/* Data e Pagamento */}
                <div className="flex gap-3">
                   <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data</label>
                      <input type="date" className="w-full border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none text-gray-600" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                   </div>
                   <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Meio Pagto</label>
                      <select className="w-full border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none bg-white" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                         <option value="Dinheiro">Dinheiro</option><option value="Pix">Pix</option><option value="Cartão">Cartão</option><option value="Boleto">Boleto</option>
                      </select>
                   </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Observações</label>
                  <textarea className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none resize-none h-16 bg-gray-50" placeholder="..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>

                <button type="submit" className={`w-full py-4 text-white font-bold rounded-xl text-sm shadow-lg hover:opacity-90 transition-transform active:scale-95 ${activeModal === 'RECEIVE' ? 'bg-green-600' : 'bg-red-600'}`}>
                  Confirmar Lançamento
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};