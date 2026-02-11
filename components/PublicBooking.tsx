import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { 
   ChevronRight, ChevronLeft, Check, AlertCircle, X, 
   Banknote, QrCode, CreditCard, Wallet, Search, 
   User, Phone, MapPin, FileText, Clock, Calendar, Ban 
} from 'lucide-react';

export const PublicBooking: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const servicesList = (products || [])
    .filter(p => p.category !== 'PRODUTO' && p.active !== false)
    .filter((service, index, self) => 
      index === self.findIndex((t) => (
        t.name === service.name
      ))
    );

  const [started, setStarted] = useState(false); 
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);
  
  const [formData, setFormData] = useState({ 
     servicoId: '', data: '', hora: '', nome: '', sobrenome: '', 
     whatsapp: '', cpf: '', endereco: '', obs: '', pagamento: 'Dinheiro' 
  });
  
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [viewDate, setViewDate] = useState(new Date()); 
  const [dayOverride, setDayOverride] = useState<any>(null); // Bloqueios de folga/horário

  const [config] = useState({ 
    workingDays: [1, 2, 3, 4, 5, 6], 
    startHour: 9, endHour: 19, lunchStart: 12, lunchEnd: 13 
  });

  // --- FUNÇÃO DE LIMPEZA (RESET) ---
  const resetBooking = () => {
    setFormData({ 
      servicoId: '', data: '', hora: '', nome: '', sobrenome: '', 
      whatsapp: '', cpf: '', endereco: '', obs: '', pagamento: 'Dinheiro' 
    });
    setStep(1);
    setStarted(false); // Volta para a tela da Logo
    setOccupiedSlots([]);
    setDayOverride(null);
  };

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Monitora a data selecionada para buscar ocupação e bloqueios
  useEffect(() => {
    if (!formData.data) return;
    
    const loadData = async () => {
      // 1. Busca agendamentos ocupados
      const qApp = query(collection(db, "agendamentos"), where("data", "==", formData.data), where("status", "!=", "CANCELADO"));
      const snapApp = await getDocs(qApp);
      setOccupiedSlots(snapApp.docs.map(d => d.data().hora));

      // 2. Busca bloqueios de horários/folgas (Ajustes)
      const qOverride = query(collection(db, "calendar_overrides"), where("date", "==", formData.data));
      const snapOv = await getDocs(qOverride);
      if (!snapOv.empty) {
         setDayOverride(snapOv.docs[0].data());
      } else {
         setDayOverride(null);
      }
    };
    loadData();
  }, [formData.data]);

  const validateAndAdvance = () => {
    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) { alert("⚠️ O CPF é obrigatório! Por favor, digite os 11 números para continuar."); return; }
    if (!formData.nome || !formData.whatsapp) { alert("Preencha Nome e WhatsApp para continuar."); return; }
    setStep(4);
  };

  const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, ''); 
    if(v.length > 11) v = v.slice(0,11);
    const raw = v;
    v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setFormData(prev => ({ ...prev, cpf: v }));

    if (raw.length === 11) {
      setSearchingClient(true);
      try {
        const snap = await getDocs(query(collection(db, "clients")));
        const found = snap.docs.find(d => { const dCpf = d.data().cpf; return dCpf && dCpf.replace(/\D/g, '') === raw; });
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
    if(!s) return 0;
    const base = Number(s.price || s.priceCash || 0);
    switch (formData.pagamento) { case 'Pix': return Number(s.pricePix || base); case 'Crédito': return Number(s.priceCredit || base); case 'Débito': return Number(s.priceDebit || base); default: return base; }
  };

  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const changeMonth = (o: number) => { const n = new Date(viewDate); n.setMonth(n.getMonth() + o); setViewDate(n); };
  
  const isDayBlocked = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const today = new Date(); today.setHours(0,0,0,0);
    if (d < today) return true;
    return !config.workingDays.includes(d.getDay());
  };

  // --- GERAÇÃO DE HORÁRIOS COM LÓGICA DE BLOQUEIO DO AJUSTE ---
  const generateTimeSlots = () => {
    const slots = [];
    if (!formData.data) return [];

    // Se o dia estiver FECHADO (Feriado/Folga), bloqueia tudo
    if (dayOverride && dayOverride.type === 'CLOSED') return [];

    for (let h = config.startHour; h < config.endHour; h++) {
      if (h >= config.lunchStart && h < config.lunchEnd) continue;

      // Lógica de "Trancar Horário" (BLOCK_TIME) vinda dos Ajustes
      if (dayOverride && dayOverride.type === 'BLOCK_TIME') {
         if (h >= dayOverride.startHour && h < dayOverride.endHour) continue; 
      }

      const ts = `${String(h).padStart(2, '0')}:00`;
      if (!occupiedSlots.includes(ts)) slots.push(ts);
    }
    return slots;
  };

  const submit = async () => {
    setIsSaving(true);
    try {
      const s = servicesList.find(x => x.id === formData.servicoId);
      const valorFinal = getDynamicPrice();
      await addDoc(collection(db, "agendamentos"), { ...formData, servicoNome: s?.name, valorTotal: valorFinal, status: 'CONFIRMADO', criadoEm: new Date(), origem: 'Link Público' });
      
      // Atualiza ou cria cliente
      if (formData.cpf) {
         const cpfLimpo = formData.cpf.replace(/\D/g, '');
         const snap = await getDocs(query(collection(db, "clients")));
         const existing = snap.docs.find(d => { const dCpf = d.data().cpf; return dCpf && dCpf.replace(/\D/g, '') === cpfLimpo; });
         const cData = { name: `${formData.nome} ${formData.sobrenome}`.trim(), phone: formData.whatsapp, address: formData.endereco, lastVisit: formData.data, cpf: formData.cpf, notes: formData.obs };
         if (existing) { const d = existing.data(); await updateDoc(doc(db, "clients", existing.id), { ...cData, visits: (d.visits||0)+1, totalSpent: (d.totalSpent||0)+valorFinal }); } else { await addDoc(collection(db, "clients"), { ...cData, visits: 1, totalSpent: valorFinal, registerDate: new Date().toISOString().split('T')[0], status: 'Ativo' }); }
      }
      
      alert("Agendamento Confirmado! Entraremos em contato."); 
      resetBooking(); // Limpa tudo após o sucesso
    } catch (e) { alert("Erro ao agendar."); } finally { setIsSaving(false); }
  };

  // --- TELA DE BEM-VINDO ---
  if (!started) return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-pink-200 w-full max-w-sm flex flex-col items-center justify-center text-center animate-in fade-in zoom-in border-4 border-white">
        <div className="w-36 h-36 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-pink-100 mb-6 z-10 relative overflow-hidden">
           <img src="/logo-ellafoa.png" className="w-full h-full object-contain p-2 hover:scale-110 transition duration-700" alt="Logo" />
        </div>
        <h1 className="text-3xl font-black text-gray-800 mb-2 z-10">Bem-vindo(a)!</h1>
        <p className="text-gray-500 mb-8 font-medium z-10 text-sm">Faça seu agendamento em poucos cliques.</p>
        <button onClick={() => setStarted(true)} className="w-full py-4 bg-[#D95D9B] text-white text-lg font-bold rounded-2xl shadow-lg shadow-pink-300 hover:bg-pink-600 transition-all z-10 hover:-translate-y-1">AGENDAR HORÁRIO</button>
      </div>
    </div>
  );

  const daysArray = Array.from({ length: getDaysInMonth(viewDate) }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: getFirstDayOfMonth(viewDate) }, (_, i) => i);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-8">
        
        <div className="bg-[#D95D9B] p-6 text-white relative">
           <h3 className="font-bold text-xl text-center">Agendamento Online</h3>
           <div className="flex gap-2 mt-6 px-2">{[1, 2, 3, 4].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${step >= i ? 'bg-white' : 'bg-white/30'}`} />)}</div>
           {/* O BOTÃO X AGORA CHAMA O RESET COMPLETO */}
           <button onClick={resetBooking} className="absolute top-6 right-6 p-1 bg-white/10 rounded-full hover:bg-white/20 transition"><X size={20} /></button>
        </div>

        <div className="p-6 h-[500px] overflow-y-auto custom-scrollbar flex flex-col">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Qual serviço deseja?</p>
              {loading && <p className="text-center text-gray-400 py-10">Carregando serviços...</p>}
              {!loading && servicesList.length === 0 && <div className="bg-yellow-50 p-8 rounded-2xl border border-dashed border-yellow-200 text-center text-yellow-700 text-sm font-bold flex flex-col items-center justify-center h-full"><AlertCircle className="w-10 h-10 mb-4 opacity-50" />Nenhum serviço disponível.</div>}
              {servicesList.map(s => (
                <button key={s.id} onClick={() => { setFormData({...formData, servicoId: s.id}); setStep(2); }} className="w-full flex justify-between items-center p-5 border-2 rounded-2xl hover:border-pink-200 hover:bg-pink-50 transition text-left group bg-white shadow-sm hover:shadow-md">
                  <div><p className="font-bold text-gray-800 text-lg group-hover:text-[#D95D9B] transition-colors">{s.name}</p><p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Clock size={12}/> {s.duration || '60'} min</p></div><ChevronRight size={20} className="text-gray-300 group-hover:text-[#D95D9B] transition-colors"/>
                </button>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
               <div className="flex justify-between items-center mb-2 px-2 bg-gray-50 p-2 rounded-xl"><button onClick={()=>changeMonth(-1)} className="p-2 hover:bg-white rounded-full shadow-sm transition"><ChevronLeft size={20} className="text-gray-600"/></button><h4 className="font-bold capitalize text-gray-800 flex items-center gap-2"><Calendar size={18} className="text-[#D95D9B]"/> {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h4><button onClick={()=>changeMonth(1)} className="p-2 hover:bg-white rounded-full shadow-sm transition"><ChevronRight size={20} className="text-gray-600"/></button></div>
               <div className="grid grid-cols-7 text-center mb-2 font-black text-pink-300 text-xs uppercase">{['D','S','T','Q','Q','S','S'].map(d=><span key={d}>{d}</span>)}</div>
               <div className="grid grid-cols-7 gap-2">{emptySlots.map(i => <div key={`empty-${i}`} />)}{daysArray.map(day => { const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const isSelected = formData.data === dateStr; const blocked = isDayBlocked(day); return (<button key={day} disabled={blocked} onClick={() => setFormData({...formData, data: dateStr, hora: ''})} className={`h-10 w-10 flex items-center justify-center rounded-full font-bold text-sm transition-all duration-300 ${isSelected ? 'bg-[#D95D9B] text-white scale-110 shadow-lg shadow-pink-200' : blocked ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-pink-50 text-gray-700 hover:scale-105'}`}>{day}</button>) })}</div>
               
               {formData.data && (
                 <div className="space-y-2 animate-in fade-in">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Horários</p>
                    {dayOverride && dayOverride.type === 'CLOSED' ? (
                       <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                          <Ban className="w-6 h-6 text-red-400 mx-auto mb-2"/>
                          <p className="text-xs font-bold text-red-500 uppercase">Dia Fechado</p>
                       </div>
                    ) : (
                       <div className="grid grid-cols-4 gap-2">
                          {generateTimeSlots().length > 0 ? generateTimeSlots().map(t => (<button key={t} onClick={()=>setFormData({...formData, hora: t})} className={`p-2 rounded-xl text-sm font-bold border transition-all ${formData.hora===t?'bg-[#D95D9B] text-white border-[#D95D9B] shadow-md':'bg-white border-gray-200 text-gray-600 hover:border-[#D95D9B]'}`}>{t}</button>)) : <div className="col-span-4 text-center p-3 bg-gray-50 rounded-xl text-gray-400 text-sm">Sem vagas.</div>}
                       </div>
                    )}
                 </div>
               )}
               
               <div className="flex gap-3 mt-auto pt-4"><button onClick={()=>setStep(1)} className="flex-1 py-3 border rounded-2xl font-bold text-gray-500 hover:bg-gray-50">Voltar</button><button onClick={()=>setStep(3)} disabled={!formData.hora} className="flex-[2] bg-[#D95D9B] text-white py-3 rounded-2xl font-bold shadow-lg disabled:opacity-50 transition hover:bg-[#C94080]">Próximo</button></div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
               <div className="bg-yellow-50 p-3 rounded-xl flex items-center gap-2 text-xs text-yellow-700 border border-yellow-100 mb-2"><Search size={14} /><span>Dica: Digite o CPF para preencher!</span></div>
               <div className="relative group"><div className="absolute left-4 top-4 text-gray-400 group-focus-within:text-[#D95D9B] transition-colors"><User size={20}/></div><input placeholder="CPF (apenas números) *" className={`w-full p-4 pl-12 bg-white rounded-2xl outline-none border-2 font-bold text-gray-700 transition-all ${searchingClient ? 'border-yellow-400 animate-pulse' : 'border-gray-100 focus:border-[#D95D9B]'}`} value={formData.cpf} onChange={handleCpfChange} maxLength={14}/></div>
               <div className="grid grid-cols-2 gap-3"><input placeholder="Nome *" className="p-4 bg-white rounded-2xl border-2 border-gray-100 focus:border-[#D95D9B] outline-none font-bold text-gray-700 transition-all" value={formData.nome} onChange={e=>setFormData({...formData,nome:e.target.value})} /><input placeholder="Sobrenome" className="p-4 bg-white rounded-2xl border-2 border-gray-100 focus:border-[#D95D9B] outline-none font-bold text-gray-700 transition-all" value={formData.sobrenome} onChange={e=>setFormData({...formData,sobrenome:e.target.value})} /></div>
               <div className="relative group"><div className="absolute left-4 top-4 text-gray-400 group-focus-within:text-[#D95D9B] transition-colors"><Phone size={20}/></div><input placeholder="WhatsApp *" className="w-full p-4 pl-12 bg-white rounded-2xl border-2 border-gray-100 focus:border-[#D95D9B] outline-none font-bold text-gray-700 transition-all" value={formData.whatsapp} onChange={handlePhoneChange} maxLength={15} /></div>
               <div className="relative group"><div className="absolute left-4 top-4 text-gray-400 group-focus-within:text-[#D95D9B] transition-colors"><MapPin size={20}/></div><input placeholder="Endereço (Opcional)" className="w-full p-4 pl-12 bg-white rounded-2xl border-2 border-gray-100 focus:border-[#D95D9B] outline-none font-bold text-gray-700 transition-all" value={formData.endereco} onChange={e=>setFormData({...formData,endereco:e.target.value})} /></div>
               <div className="relative group"><div className="absolute left-4 top-4 text-gray-400 group-focus-within:text-[#D95D9B] transition-colors"><FileText size={20}/></div><textarea placeholder="Obs..." className="w-full p-4 pl-12 bg-white rounded-2xl outline-none border-2 border-gray-100 focus:border-[#D95D9B] font-medium text-gray-600 transition-all h-24 resize-none" value={formData.obs} onChange={e=>setFormData({...formData,obs:e.target.value})} /></div>
               <button onClick={validateAndAdvance} className="w-full bg-[#D95D9B] text-white py-4 rounded-2xl font-bold shadow-lg mt-4 hover:bg-[#C94080] transition transform active:scale-95">Ir para Pagamento</button>
            </div>
          )}
          {step === 4 && (
             <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-8 h-full flex flex-col justify-center">
               <div className="space-y-3"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-left">Como prefere pagar?</p><div className="grid grid-cols-2 gap-3">{['Dinheiro','Pix','Crédito','Débito'].map(m => (<button key={m} onClick={()=>setFormData({...formData, pagamento: m})} className={`p-4 border-2 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${formData.pagamento===m?'border-[#D95D9B] bg-pink-50 text-[#D95D9B] shadow-sm scale-105':'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}>{m === 'Dinheiro' && <Banknote size={16}/>}{m === 'Pix' && <QrCode size={16}/>}{m === 'Crédito' && <CreditCard size={16}/>}{m === 'Débito' && <Wallet size={16}/>}{m}</button>))}</div></div>
               <div className="bg-gradient-to-br from-[#D95D9B] to-pink-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-pink-200 transform hover:scale-105 transition duration-500"><p className="text-xs font-bold opacity-80 uppercase mb-1">Valor Total</p><p className="text-5xl font-black tracking-tight">R$ {getDynamicPrice().toFixed(2)}</p><p className="text-xs mt-2 border-t border-white/20 pt-2 inline-block opacity-90">Pagamento no local</p></div>
               <div className="flex gap-3 mt-auto"><button onClick={() => setStep(3)} className="flex-1 py-4 font-bold border rounded-2xl text-gray-500 hover:bg-gray-50">Voltar</button><button disabled={isSaving} onClick={submit} className="flex-[2] bg-green-500 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed">{isSaving ? 'Salvando...' : 'Confirmar'}</button></div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};