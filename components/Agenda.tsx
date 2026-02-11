import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, onSnapshot, doc, deleteDoc, orderBy, getDocs, updateDoc, where } from 'firebase/firestore';
import { 
  X, ArrowLeft, ArrowRight, Check, 
  Calendar as CalendarIcon, 
  Plus, ChevronLeft, ChevronRight, User, Phone, MapPin, FileText, 
  Eye, Trash2, Search, AlertCircle, Clock, 
  Banknote, QrCode, CreditCard, Wallet, CalendarDays,
  MoreVertical, CheckCircle, XCircle, Undo2
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  price?: number;
  priceCash?: number;
  pricePix?: number;
  priceCredit?: number;
  priceDebit?: number;
  duration?: number;
  active?: boolean;
}

interface AgendaProps {
  autoOpen?: boolean;
}

export const Agenda: React.FC<AgendaProps> = ({ autoOpen }) => {
  const [products, setProducts] = useState<Product[]>([]); 
  const [appointments, setAppointments] = useState<any[]>([]);
  
  const servicesList = (products || [])
    .filter(p => p.category !== 'PRODUTO' && p.active !== false)
    .filter((service, index, self) => index === self.findIndex((t) => t.name === service.name));

  const [config] = useState({ 
    workingDays: [1, 2, 3, 4, 5, 6], 
    startHour: 9, endHour: 19, lunchStart: 12, lunchEnd: 13, totalSlotsPerDay: 9 
  });

  const [showModal, setShowModal] = useState(false);
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);
  const [viewMode, setViewMode] = useState(false); 
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [viewDate, setViewDate] = useState(new Date()); 
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [calendarViewDate, setCalendarViewDate] = useState(new Date()); 
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // --- NOVO: Estado para armazenar o bloqueio do dia selecionado ---
  const [dayOverride, setDayOverride] = useState<any>(null);

  const [formData, setFormData] = useState({
    servicoId: '', data: '', hora: '', nome: '', sobrenome: '',
    whatsapp: '', cpf: '', endereco: '', obs: '', pagamento: 'Dinheiro'
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "products"), orderBy("name")), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "agendamentos")), (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // --- NOVO: Busca bloqueios sempre que a data do formulário mudar ---
  useEffect(() => {
    if (!formData.data) return;
    
    const checkOverride = async () => {
       const q = query(collection(db, "calendar_overrides"), where("date", "==", formData.data));
       const snap = await getDocs(q);
       if (!snap.empty) {
          setDayOverride(snap.docs[0].data());
       } else {
          setDayOverride(null);
       }
    };
    checkOverride();
  }, [formData.data]);

  useEffect(() => { if (autoOpen) handleOpenModal(); }, [autoOpen]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const handleUpdateStatus = async (id: string, newStatus: 'CONFIRMADO' | 'CONCLUIDO' | 'CANCELADO') => {
    try { await updateDoc(doc(db, "agendamentos", id), { status: newStatus }); setOpenMenuId(null); } catch (error) { alert("Erro ao atualizar status."); }
  };

  const validateAndAdvance = () => {
    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) { alert("⚠️ Atenção: O CPF é obrigatório e deve ter 11 dígitos!"); return; }
    if (!formData.nome || !formData.whatsapp) { alert("Preencha Nome e WhatsApp para continuar."); return; }
    setStep(4); 
  };

  const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, ''); 
    if (v.length > 11) v = v.slice(0, 11);
    const rawCpf = v;
    v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setFormData(prev => ({ ...prev, cpf: v }));

    if (rawCpf.length === 11) {
      setSearchingClient(true);
      try {
        const snap = await getDocs(query(collection(db, "clients")));
        const found = snap.docs.find(d => { const dCpf = d.data().cpf; return dCpf && dCpf.replace(/\D/g, '') === rawCpf; });
        if (found) {
          const client = found.data();
          const nameParts = (client.name || '').split(' ');
          setFormData(prev => ({ ...prev, nome: nameParts[0] || '', sobrenome: nameParts.slice(1).join(' ') || '', whatsapp: client.phone || prev.whatsapp, endereco: client.address || '', obs: client.notes || prev.obs }));
        }
      } catch (err) {} finally { setSearchingClient(false); }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    v = v.length > 11 ? v.slice(0, 11) : v;
    if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'); else v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    setFormData({ ...formData, whatsapp: v });
  };

  const getDynamicPrice = () => {
    const s = servicesList.find(x => x.id === formData.servicoId);
    if (!s) return 0;
    const base = Number(s.price || s.priceCash || 0);
    switch (formData.pagamento) { case 'Pix': return Number(s.pricePix || base); case 'Crédito': return Number(s.priceCredit || base); case 'Débito': return Number(s.priceDebit || base); default: return base; }
  };

  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const changeCalendarMonth = (offset: number) => { const n = new Date(viewDate); n.setMonth(viewDate.getMonth() + offset); setViewDate(n); };
  const changeOverviewMonth = (offset: number) => { const n = new Date(calendarViewDate); n.setMonth(calendarViewDate.getMonth() + offset); setCalendarViewDate(n); };
  const selectDay = (day: number) => { const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; setFormData({ ...formData, data: dateStr, hora: '' }); };
  const isDayBlocked = (day: number) => { const check = new Date(viewDate.getFullYear(), viewDate.getMonth(), day); const today = new Date(); today.setHours(0,0,0,0); return check < today || !config.workingDays.includes(check.getDay()); };
  const isDayBlockedOverview = (date: Date) => { const today = new Date(); today.setHours(0,0,0,0); return date < today || !config.workingDays.includes(date.getDay()); };

  // --- GERAÇÃO DE HORÁRIOS INTELIGENTE ---
  const generateTimeSlots = () => {
    const slots = []; 
    if (!formData.data) return [];

    // Se o dia estiver fechado completo (Feriado/Folga), retorna vazio
    if (dayOverride && dayOverride.type === 'CLOSED') {
       return []; 
    }
    
    for (let h = config.startHour; h < config.endHour; h++) { 
        if (h >= config.lunchStart && h < config.lunchEnd) continue; 

        // Se tiver bloqueio parcial (BLOCK_TIME), verifica se a hora atual está dentro
        if (dayOverride && dayOverride.type === 'BLOCK_TIME') {
           if (h >= dayOverride.startHour && h < dayOverride.endHour) {
              continue; // Pula este horário pois está bloqueado
           }
        }

        const ts = `${String(h).padStart(2, '0')}:00`; 
        if (!appointments.some(a => a.data === formData.data && a.hora === ts && a.status !== 'CANCELADO')) slots.push(ts); 
    } 
    return slots;
  };

  const getDayStatusColor = (day: number) => {
      const dateStr = `${calendarViewDate.getFullYear()}-${String(calendarViewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const checkDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
      if (isDayBlockedOverview(checkDate)) return 'bg-gray-50 text-gray-300 cursor-not-allowed';
      const count = appointments.filter(a => a.data === dateStr && a.status !== 'CANCELADO').length;
      if (count >= config.totalSlotsPerDay) return 'bg-red-100 text-red-600 border-2 border-red-200 font-bold';
      if (count > 0) return 'bg-blue-100 text-blue-600 border-2 border-blue-200 font-bold';
      return 'bg-green-100 text-green-600 border-2 border-green-200 font-bold';
  };

  const jumpToDate = (day: number) => {
      const checkDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
      if (isDayBlockedOverview(checkDate)) return;
      setCurrentDate(checkDate); setShowMonthCalendar(false);
  };

  const handleOpenModal = () => { setViewMode(false); setSelectedAppt(null); setStep(1); setFormData({ servicoId: '', data: '', hora: '', nome: '', sobrenome: '', whatsapp: '', cpf: '', endereco: '', obs: '', pagamento: 'Dinheiro' }); setShowModal(true); };
  const handleCloseModal = () => { setShowModal(false); setStep(1); setViewMode(false); setSelectedAppt(null); };
  const handleViewAppointment = (app: any) => { setSelectedAppt(app); setViewMode(true); setShowModal(true); };
  const handleDeleteAppointment = async (id: string) => { if(confirm("ATENÇÃO: Isso apaga o registro permanentemente. Para apenas liberar o horário, use a opção 'Cancelar'. Continuar?")) await deleteDoc(doc(db, "agendamentos", id)); };
  const changeCurrentDate = (days: number) => { const n = new Date(currentDate); n.setDate(currentDate.getDate() + days); setCurrentDate(n); };
  const formatDateLocal = (date: Date) => { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const service = servicesList.find(s => s.id === formData.servicoId);
      const valorFinal = getDynamicPrice();
      await addDoc(collection(db, "agendamentos"), { ...formData, servicoNome: service?.name || "Serviço", valorTotal: valorFinal, status: 'CONFIRMADO', criadoEm: new Date(), origem: 'Painel Admin' });
      if (formData.cpf) {
         const cpfLimpo = formData.cpf.replace(/\D/g, '');
         const snap = await getDocs(query(collection(db, "clients")));
         const existing = snap.docs.find(d => { const dCpf = d.data().cpf; return dCpf && dCpf.replace(/\D/g, '') === cpfLimpo; });
         const clientData = { name: `${formData.nome} ${formData.sobrenome}`.trim(), phone: formData.whatsapp, address: formData.endereco, lastVisit: formData.data, cpf: formData.cpf, notes: formData.obs };
         if (existing) {
            const d = existing.data(); await updateDoc(doc(db, "clients", existing.id), { ...clientData, visits: (d.visits || 0) + 1, totalSpent: (d.totalSpent || 0) + valorFinal });
         } else { await addDoc(collection(db, "clients"), { ...clientData, visits: 1, totalSpent: valorFinal, registerDate: new Date().toISOString().split('T')[0], status: 'Ativo' }); }
      }
      alert("🎉 Agendamento realizado!"); handleCloseModal(); 
    } catch (error) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const currentStr = formatDateLocal(currentDate);
  const currentAppointments = appointments.filter(app => app.data === currentStr);
  const daysArray = Array.from({ length: getDaysInMonth(viewDate) }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: getFirstDayOfMonth(viewDate) }, (_, i) => i);
  const daysArrayOverview = Array.from({ length: getDaysInMonth(calendarViewDate) }, (_, i) => i + 1);
  const emptySlotsOverview = Array.from({ length: getFirstDayOfMonth(calendarViewDate) }, (_, i) => i);

  return (
    <div className="min-h-screen bg-white w-full p-4 md:p-8 space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-gray-800">Agenda</h2><p className="text-sm text-gray-500">Gerencie seus horários</p></div>
        <button onClick={handleOpenModal} className="bg-[#D95D9B] text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg hover:bg-[#C94080] transition"><Plus className="w-5 h-5 mr-2"/> Novo Agendamento</button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
         <button onClick={() => changeCurrentDate(-1)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"><ArrowLeft size={20}/></button>
         <button onClick={() => setShowMonthCalendar(true)} className="font-bold text-[#D95D9B] flex gap-2 items-center capitalize hover:bg-pink-50 px-6 py-2 rounded-2xl transition border border-transparent hover:border-pink-100 group">
            <CalendarIcon size={18} className="group-hover:scale-110 transition"/><span>{currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
         </button>
         <button onClick={() => changeCurrentDate(1)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"><ArrowRight size={20}/></button>
      </div>

      <div className="space-y-3">
        {currentAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-60 bg-gray-50 rounded-3xl border border-dashed border-gray-200"><CalendarIcon size={48} className="text-gray-300 mb-4"/><p className="text-gray-400 font-medium">Nenhum agendamento hoje.</p></div>
        ) : (
          currentAppointments.map(app => {
            const isCancelled = app.status === 'CANCELADO';
            const isCompleted = app.status === 'CONCLUIDO';
            let cardClasses = "flex items-center p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition relative group ";
            if (isCancelled) cardClasses += "border-gray-200 bg-gray-50 opacity-60 grayscale";
            else if (isCompleted) cardClasses += "border-green-200 bg-green-50";
            else cardClasses += "border-l-4 border-l-[#D95D9B] border-gray-100";

            return (
              <div key={app.id} className={cardClasses}>
                <div className={`w-20 text-lg font-black ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{app.hora}</div>
                <div className="flex-1">
                  <p className={`font-bold ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                    {app.nome} {app.sobrenome} 
                    {isCancelled && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">Cancelado</span>}
                    {isCompleted && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase flex items-center gap-1 inline-flex"><Check size={10}/> Concluído</span>}
                  </p>
                  <div className="flex gap-2 text-xs text-gray-500 mt-1">
                     <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{app.servicoNome}</span>
                     <span className="font-bold text-green-600 flex items-center gap-1"><Check size={10}/> {app.pagamento} (R$ {app.valorTotal?.toFixed(2)})</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mr-4">
                  {!isCancelled && (
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === app.id ? null : app.id); }} className={`p-2 rounded-lg hover:bg-gray-100 transition ${isCompleted ? 'text-green-600' : 'text-gray-400'}`}><MoreVertical size={18}/></button>
                      {openMenuId === app.id && (
                        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 w-40 flex flex-col gap-1 animate-in fade-in zoom-in-95 origin-top-right">
                          <button onClick={() => handleUpdateStatus(app.id, 'CONCLUIDO')} className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-green-600 hover:bg-green-50 rounded-lg text-left w-full"><CheckCircle size={16}/> Concluir</button>
                          {isCompleted && (<button onClick={() => handleUpdateStatus(app.id, 'CONFIRMADO')} className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg text-left w-full"><Undo2 size={16}/> Reabrir</button>)}
                          <button onClick={() => handleUpdateStatus(app.id, 'CANCELADO')} className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg text-left w-full"><XCircle size={16}/> Cancelar</button>
                        </div>
                      )}
                    </div>
                  )}
                  {isCancelled && (<button onClick={() => handleUpdateStatus(app.id, 'CONFIRMADO')} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg" title="Restaurar Agendamento"><Undo2 size={18}/></button>)}
                  <button onClick={() => handleViewAppointment(app)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100"><Eye size={18}/></button>
                  <button onClick={() => handleDeleteAppointment(app.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={18}/></button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showMonthCalendar && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-white ring-4 ring-pink-50">
              <div className="bg-[#D95D9B] p-5 text-white flex justify-between items-center">
                 <h3 className="font-bold text-lg flex items-center gap-2"><CalendarDays size={20}/> Visão do Mês</h3>
                 <button onClick={() => setShowMonthCalendar(false)} className="hover:bg-white/20 p-2 rounded-full transition"><X size={20}/></button>
              </div>
              <div className="p-6">
                 <div className="flex justify-between items-center mb-6"><button onClick={() => changeOverviewMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full text-[#D95D9B]"><ChevronLeft size={24}/></button><span className="font-black text-gray-800 capitalize text-lg">{calendarViewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span><button onClick={() => changeOverviewMonth(1)} className="p-2 hover:bg-gray-100 rounded-full text-[#D95D9B]"><ChevronRight size={24}/></button></div>
                 <div className="flex justify-between gap-2 mb-6 text-[10px] font-bold uppercase tracking-wider bg-gray-50 p-3 rounded-xl"><span className="flex items-center gap-1.5 text-green-700"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></div> Livre</span><span className="flex items-center gap-1.5 text-blue-700"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></div> Ocupado</span><span className="flex items-center gap-1.5 text-red-700"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"></div> Lotado</span></div>
                 <div className="grid grid-cols-7 text-center mb-3 font-black text-pink-300 text-xs uppercase">{['D','S','T','Q','Q','S','S'].map(d => <span key={d}>{d}</span>)}</div>
                 <div className="grid grid-cols-7 gap-2">{emptySlotsOverview.map(i => <div key={`ov-empty-${i}`} />)}{daysArrayOverview.map(day => { const statusClass = getDayStatusColor(day); return (<button key={`ov-day-${day}`} onClick={() => jumpToDate(day)} className={`h-10 w-10 flex items-center justify-center rounded-xl text-xs transition-all hover:scale-110 active:scale-95 ${statusClass}`}>{day}</button>) })}</div>
              </div>
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-gray-100 ring-4 ring-black/5">
            {viewMode && selectedAppt ? (
              <>
                <div className="bg-[#D95D9B] p-6 text-white relative flex-shrink-0"><h3 className="font-bold text-xl text-center">Detalhes</h3><button onClick={handleCloseModal} className="absolute right-6 top-6 p-1 hover:bg-white/20 rounded-full"><X size={24}/></button></div>
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                  <div className="flex items-center gap-4 bg-pink-50 p-4 rounded-2xl border border-pink-100"><div className="bg-white p-3 rounded-full text-[#D95D9B] shadow-sm"><CalendarIcon size={24}/></div><div><p className="text-xs text-gray-500 font-bold uppercase">Data & Hora</p><p className="text-lg font-black text-gray-800 capitalize">{new Date(selectedAppt.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p><p className="text-[#D95D9B] font-bold text-xl flex items-center gap-2"><Clock size={18}/> {selectedAppt.hora}</p></div></div>
                  <div className="space-y-3"><p className="text-xs text-gray-400 font-bold uppercase tracking-widest border-b pb-1">Cliente</p><p className="font-bold text-gray-800 text-lg">{selectedAppt.nome} {selectedAppt.sobrenome}</p><p className="text-sm text-gray-500">{selectedAppt.whatsapp}</p></div>
                  <div className="space-y-3"><p className="text-xs text-gray-400 font-bold uppercase tracking-widest border-b pb-1">Financeiro</p><div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center"><p className="text-sm text-gray-500 font-medium">{selectedAppt.servicoNome}</p><span className="text-2xl font-black text-green-600">R$ {selectedAppt.valorTotal?.toFixed(2)}</span></div></div>
                  <button onClick={handleCloseModal} className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200">Fechar</button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-[#D95D9B] p-6 text-white relative flex-shrink-0"><h3 className="font-bold text-xl text-center">Novo Agendamento</h3><button onClick={handleCloseModal} className="absolute right-6 top-6 p-1 hover:bg-white/20 rounded-full"><X size={24}/></button><div className="flex gap-2 mt-6 px-2">{[1, 2, 3, 4].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${step >= i ? 'bg-white' : 'bg-white/30'}`} />)}</div></div>
                <div className="p-6 overflow-y-auto custom-scrollbar h-full">
                  {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Selecione o Serviço:</p>
                      {servicesList.length === 0 && <div className="text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200"><AlertCircle className="mx-auto text-gray-300 mb-2"/><p className="text-gray-500">Nenhum serviço.</p></div>}
                      {servicesList.map(s => (
                        <button key={s.id} onClick={() => { setFormData({...formData, servicoId: s.id}); setStep(2); }} className={`w-full flex justify-between items-center p-5 border-2 rounded-2xl transition-all shadow-sm text-left group ${formData.servicoId === s.id ? 'border-[#D95D9B] bg-pink-50' : 'border-gray-50 hover:border-pink-200'}`}><div><p className="font-bold text-gray-800 text-lg group-hover:text-[#D95D9B]">{s.name}</p><div className="flex items-center gap-2 mt-1"><span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex items-center gap-1"><Clock size={10}/> {s.duration || '60'} min</span><span className="text-xs font-bold text-green-600">R$ {Number(s.price || s.priceCash).toFixed(2)}</span></div></div>{formData.servicoId === s.id ? <div className="bg-[#D95D9B] text-white p-1 rounded-full"><Check size={14} /></div> : <ChevronRight className="text-gray-300 group-hover:text-[#D95D9B]"/>}</button>
                      ))}
                    </div>
                  )}
                  {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-4 px-2"><button onClick={() => changeCalendarMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button><h4 className="font-bold text-gray-800 capitalize text-lg">{viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h4><button onClick={() => changeCalendarMonth(1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button></div>
                        <div className="grid grid-cols-7 text-center mb-4">{['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-xs font-black text-pink-400 uppercase">{d}</span>)}</div>
                        <div className="grid grid-cols-7 gap-2">{emptySlots.map(i => <div key={`empty-${i}`} />)}{daysArray.map(day => { const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const blocked = isDayBlocked(day); const isSelected = formData.data === dateStr; return (<button key={day} disabled={blocked} onClick={() => selectDay(day)} className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-bold transition-all ${isSelected ? 'bg-[#D95D9B] text-white scale-110 shadow-lg' : blocked ? 'text-gray-200 cursor-not-allowed' : 'text-gray-700 hover:bg-pink-50'}`}>{day}</button>); })}</div>
                      </div>
                      
                      {formData.data && (
                        <div className="space-y-2 animate-in fade-in">
                           <p className="text-xs font-bold text-gray-400 uppercase ml-1">Horários</p>
                           {/* MENSAGEM SE DIA ESTIVER FECHADO */}
                           {dayOverride && dayOverride.type === 'CLOSED' ? (
                              <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                                 <Ban className="w-6 h-6 text-red-400 mx-auto mb-2"/>
                                 <p className="text-xs font-bold text-red-500 uppercase">Dia Fechado</p>
                                 <p className="text-[10px] text-gray-500">Não há horários disponíveis para esta data.</p>
                              </div>
                           ) : (
                              <div className="grid grid-cols-4 gap-2">
                                {generateTimeSlots().length > 0 ? generateTimeSlots().map(time => (<button key={time} onClick={() => setFormData({...formData, hora: time})} className={`p-2 rounded-xl text-sm font-bold border transition-all ${formData.hora === time ? 'bg-[#D95D9B] text-white border-[#D95D9B]' : 'bg-white border-gray-200 text-gray-600 hover:border-[#D95D9B]'}`}>{time}</button>)) : <div className="col-span-4 p-4 bg-gray-50 rounded-xl text-center text-gray-400 text-sm">Lotado ou sem horários.</div>}
                              </div>
                           )}
                        </div>
                      )}

                      <div className="flex gap-3 pt-4 border-t border-gray-100"><button onClick={() => setStep(1)} className="flex-1 py-3 font-bold text-gray-400 bg-white rounded-2xl border">Voltar</button><button onClick={() => setStep(3)} disabled={!formData.data || !formData.hora} className="flex-[2] bg-[#D95D9B] text-white py-3 rounded-2xl font-bold shadow-lg disabled:opacity-50">Próximo</button></div>
                    </div>
                  )}
                  {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                      <div className="bg-yellow-50 p-3 rounded-xl flex items-center gap-2 text-xs text-yellow-700 border border-yellow-100 mb-2"><Search size={14} /><span>Digite o <strong>CPF</strong> para preencher!</span></div>
                      <div className="relative group"><div className="absolute left-4 top-4 text-gray-400"><User size={20}/></div><input placeholder="CPF (apenas números) *" className={`w-full p-4 pl-12 bg-white rounded-2xl outline-none border-2 font-bold text-gray-700 transition-all ${searchingClient ? 'border-yellow-400 animate-pulse' : 'border-gray-100 focus:border-[#D95D9B]'}`} value={formData.cpf} onChange={handleCpfChange} maxLength={14}/></div>
                      <div className="grid grid-cols-2 gap-3"><input placeholder="Nome *" className="p-4 bg-white rounded-2xl outline-none border-2 border-gray-100 focus:border-[#D95D9B] font-bold" value={formData.nome} onChange={e=>setFormData({...formData,nome:e.target.value})} /><input placeholder="Sobrenome" className="p-4 bg-white rounded-2xl outline-none border-2 border-gray-100 focus:border-[#D95D9B] font-bold" value={formData.sobrenome} onChange={e=>setFormData({...formData,sobrenome:e.target.value})} /></div>
                      <div className="relative group"><div className="absolute left-4 top-4 text-gray-400"><Phone size={20}/></div><input placeholder="WhatsApp *" className="w-full p-4 pl-12 bg-white rounded-2xl outline-none border-2 border-gray-100 focus:border-[#D95D9B] font-bold" value={formData.whatsapp} onChange={handlePhoneChange} maxLength={15} /></div>
                      <div className="relative group"><div className="absolute left-4 top-4 text-gray-400"><MapPin size={20}/></div><input placeholder="Endereço" className="w-full p-4 pl-12 bg-white rounded-2xl outline-none border-2 border-gray-100 focus:border-[#D95D9B] font-bold" value={formData.endereco} onChange={e=>setFormData({...formData,endereco:e.target.value})} /></div>
                      <div className="relative group"><div className="absolute left-4 top-4 text-gray-400"><FileText size={20}/></div><textarea placeholder="Obs..." className="w-full p-4 pl-12 bg-white rounded-2xl outline-none border-2 border-gray-100 focus:border-[#D95D9B] font-medium h-24 resize-none" value={formData.obs} onChange={e=>setFormData({...formData,obs:e.target.value})} /></div>
                      <button onClick={validateAndAdvance} className="w-full bg-[#D95D9B] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#C94080]">Ir para Pagamento</button>
                    </div>
                  )}
                  {step === 4 && (
                    <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-8 h-full flex flex-col justify-center">
                      <div className="space-y-3"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-left ml-1">Forma de Pagamento</p><div className="grid grid-cols-2 gap-3">{['Dinheiro', 'Pix', 'Crédito', 'Débito'].map(m => (<button key={m} onClick={() => setFormData({...formData, pagamento: m})} className={`p-4 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${formData.pagamento === m ? 'border-[#D95D9B] bg-pink-50 text-[#D95D9B] shadow-sm scale-105' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}>{m === 'Dinheiro' && <Banknote size={18}/>}{m === 'Pix' && <QrCode size={18}/>}{m === 'Crédito' && <CreditCard size={18}/>}{m === 'Débito' && <Wallet size={18}/>}{m}</button>))}</div></div>
                      <div className="bg-[#D95D9B] p-8 rounded-[2.5rem] text-white shadow-xl shadow-pink-200 transform transition-all hover:scale-105"><p className="text-xs font-bold opacity-80 uppercase mb-2">Total a Pagar</p><p className="text-5xl font-black tracking-tighter">R$ {getDynamicPrice().toFixed(2)}</p><p className="text-xs mt-2 opacity-90 border-t border-white/20 pt-2 inline-block">Pagamento em {formData.pagamento}</p></div>
                      <div className="flex gap-3 mt-auto"><button onClick={() => setStep(3)} className="flex-1 py-4 font-bold text-gray-400 bg-white rounded-2xl border hover:bg-gray-50">Voltar</button><button disabled={isSaving} onClick={handleSubmit} className="flex-[2] bg-green-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-green-600 transition disabled:bg-gray-300">{isSaving ? 'Salvando...' : 'Confirmar'}</button></div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};