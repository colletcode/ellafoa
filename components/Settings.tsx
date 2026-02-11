import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  Clock, Calendar, Link as LinkIcon, CheckCircle, Save, Globe, Share2, Copy, 
  AlertCircle, CalendarDays, Plus, Trash2, Ban, X, ChevronLeft, ChevronRight, Lock 
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- ESTADOS GLOBAIS ---
  const [settings, setSettings] = useState({
    workingDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    openTime: '09:00',
    closeTime: '19:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    onlineBooking: true,
    linkUrl: 'https://ellafoa.com.br/agendar/fernanda'
  });

  // --- ESTADOS DO CALENDÁRIO DE EXCEÇÃO ---
  const [overrides, setOverrides] = useState<any[]>([]);
  const [viewDate, setViewDate] = useState(new Date()); 
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(''); 
  
  // Estado do Formuário da Popup
  const [dayConfig, setDayConfig] = useState({
    type: 'CLOSED', // 'CLOSED' (Dia todo) ou 'BLOCK_TIME' (Intervalo Bloqueado)
    start: '13:00',
    end: '14:00'
  });

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayMap: { [key: string]: number } = { 'Dom': 0, 'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5, 'Sáb': 6 };
  const revDayMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // 1. CARREGAR DADOS GERAIS
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, "settings", "calendar");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(prev => ({
            ...prev,
            workingDays: (data.workingDays || []).map((d: number) => revDayMap[d]),
            openTime: `${String(data.startHour || 9).padStart(2, '0')}:00`,
            closeTime: `${String(data.endHour || 19).padStart(2, '0')}:00`,
            onlineBooking: data.onlineBooking !== undefined ? data.onlineBooking : true,
            lunchStart: data.lunchStart || '12:00',
            lunchEnd: data.lunchEnd || '13:00'
          }));
        }
      } catch (error) { console.error("Erro ao carregar ajustes:", error); }
    };
    loadSettings();
  }, []);

  // 2. CARREGAR EXCEÇÕES
  useEffect(() => {
    const q = query(collection(db, "calendar_overrides"), orderBy("date"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOverrides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DO CALENDÁRIO VISUAL ---
  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const changeMonth = (offset: number) => { const n = new Date(viewDate); n.setMonth(viewDate.getMonth() + offset); setViewDate(n); };

  // Ao clicar num dia do calendário
  const handleDayClick = (day: number) => {
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
    
    // Verifica se já existe configuração para este dia
    const existing = overrides.find(o => o.date === dateStr);
    if (existing) {
        setDayConfig({
            type: existing.type || 'CLOSED', // Garante compatibilidade
            start: existing.startHour ? `${String(existing.startHour).padStart(2,'0')}:00` : '13:00',
            end: existing.endHour ? `${String(existing.endHour).padStart(2,'0')}:00` : '14:00'
        });
    } else {
        // Padrão: Sugere Fechar o dia
        setDayConfig({ type: 'CLOSED', start: '13:00', end: '14:00' });
    }
    setShowDayModal(true);
  };

  const handleSaveOverride = async () => {
    try {
        // Remove anterior se existir para sobrescrever (evita duplicidade no mesmo dia)
        const existing = overrides.find(o => o.date === selectedDateStr);
        if (existing) {
            await deleteDoc(doc(db, "calendar_overrides", existing.id));
        }

        await addDoc(collection(db, "calendar_overrides"), {
            date: selectedDateStr,
            type: dayConfig.type,
            // Se for bloqueio parcial, salva hora de inicio e fim do bloqueio
            startHour: dayConfig.type === 'BLOCK_TIME' ? parseInt(dayConfig.start.split(':')[0]) : null,
            endHour: dayConfig.type === 'BLOCK_TIME' ? parseInt(dayConfig.end.split(':')[0]) : null,
            createdAt: new Date()
        });
        setShowDayModal(false);
    } catch (e) { alert("Erro ao salvar data."); }
  };

  const handleDeleteOverride = async (id: string) => {
      if(confirm("Liberar este dia para o horário padrão?")) {
          await deleteDoc(doc(db, "calendar_overrides", id));
      }
  };

  // --- RENDERIZADORES AUXILIARES ---
  const daysArray = Array.from({ length: getDaysInMonth(viewDate) }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: getFirstDayOfMonth(viewDate) }, (_, i) => i);

  // --- SAVE GERAL ---
  const handleSaveGlobal = async () => {
    setLoading(true); setSuccess(false);
    try {
      const numericDays = settings.workingDays.map(d => dayMap[d]);
      const startH = parseInt(settings.openTime.split(':')[0]);
      const endH = parseInt(settings.closeTime.split(':')[0]);
      await setDoc(doc(db, "settings", "calendar"), {
        workingDays: numericDays, startHour: startH, endHour: endH,
        onlineBooking: settings.onlineBooking, lunchStart: settings.lunchStart, lunchEnd: settings.lunchEnd
      });
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
    } catch (error) { alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  const handleCopyLink = () => { navigator.clipboard.writeText(settings.linkUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const toggleDay = (day: string) => { setSettings(prev => { const exists = prev.workingDays.includes(day); return { ...prev, workingDays: exists ? prev.workingDays.filter(d => d !== day) : [...prev.workingDays, day] }; }); };

  return (
    <div className="space-y-8 animate-fade-in min-h-screen bg-[#FDFDFD] p-4 md:p-8 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Configuração da Agenda</h2>
           <p className="text-sm text-gray-500">Defina seus horários padrões e bloqueie dias específicos</p>
        </div>
        <button onClick={handleSaveGlobal} disabled={loading} className={`px-6 py-3 rounded-xl font-bold flex items-center shadow-lg transition text-white w-full md:w-auto justify-center ${success ? 'bg-green-500 hover:bg-green-600' : 'bg-[#D95D9B] hover:bg-[#D95D9B]/90'} ${loading ? 'opacity-70 cursor-wait' : ''}`}>
          {success ? <CheckCircle className="w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
          {loading ? 'Salvando...' : success ? 'Salvo!' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* === COLUNA 1: LINK & STATUS === */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-gradient-to-br from-[#D95D9B] to-purple-600 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4 opacity-90"><Globe className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-wider">Link Público</span></div>
                 <h3 className="text-2xl font-bold mb-2">Seu Link</h3>
                 <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 flex items-center justify-between border border-white/30 mb-4"><span className="text-xs font-mono truncate mr-2">{settings.linkUrl}</span><button onClick={handleCopyLink} className="p-2 bg-white text-[#D95D9B] rounded-lg hover:scale-105 transition">{copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button></div>
                 <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl"><span className="text-sm font-bold">Aceitar Agendamentos</span><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={settings.onlineBooking} onChange={() => setSettings({...settings, onlineBooking: !settings.onlineBooking})} /><div className="w-11 h-6 bg-white/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-400"></div></label></div>
              </div>
           </div>
        </div>

        {/* === COLUNA 2: HORÁRIOS PADRÃO === */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
           <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-[#D95D9B]" /> Horários Padrão (Semana)</h3>
           <div className="mb-6"><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Dias de Funcionamento</label><div className="flex flex-wrap gap-2">{daysOfWeek.map(day => (<button key={day} onClick={() => toggleDay(day)} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${settings.workingDays.includes(day) ? 'bg-[#D95D9B] text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{day}</button>))}</div></div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><p className="text-xs font-bold text-gray-400 uppercase mb-2">Expediente</p><div className="flex items-center gap-2"><input type="time" className="bg-white border p-2 rounded-lg text-sm font-bold w-full outline-none focus:border-[#D95D9B]" value={settings.openTime} onChange={e => setSettings({...settings, openTime: e.target.value})} /><span className="text-gray-400">-</span><input type="time" className="bg-white border p-2 rounded-lg text-sm font-bold w-full outline-none focus:border-[#D95D9B]" value={settings.closeTime} onChange={e => setSettings({...settings, closeTime: e.target.value})} /></div></div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><p className="text-xs font-bold text-gray-400 uppercase mb-2">Almoço</p><div className="flex items-center gap-2"><input type="time" className="bg-white border p-2 rounded-lg text-sm font-bold w-full outline-none focus:border-[#D95D9B]" value={settings.lunchStart} onChange={e => setSettings({...settings, lunchStart: e.target.value})} /><span className="text-gray-400">-</span><input type="time" className="bg-white border p-2 rounded-lg text-sm font-bold w-full outline-none focus:border-[#D95D9B]" value={settings.lunchEnd} onChange={e => setSettings({...settings, lunchEnd: e.target.value})} /></div></div>
           </div>
        </div>

        {/* === SEÇÃO: DIAS ESPECÍFICOS & BLOQUEIOS (CALENDÁRIO VISUAL) === */}
        <div className="lg:col-span-3 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8">
           
           {/* Lado Esquerdo: Calendário */}
           <div className="md:w-1/2">
              <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                 <CalendarDays className="w-5 h-5 text-[#D95D9B]" /> Bloquear Dias / Feriados
              </h3>
              <p className="text-xs text-gray-500 mb-6">Clique em uma data para fechar a agenda ou trancar um horário específico.</p>

              <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                 {/* Navegação Mês */}
                 <div className="flex justify-between items-center mb-6">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full shadow-sm transition"><ChevronLeft size={20} className="text-gray-600"/></button>
                    <h4 className="font-bold capitalize text-gray-800 text-lg">{viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h4>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full shadow-sm transition"><ChevronRight size={20} className="text-gray-600"/></button>
                 </div>

                 {/* Grade */}
                 <div className="grid grid-cols-7 text-center mb-2 font-black text-pink-300 text-xs uppercase">{['D','S','T','Q','Q','S','S'].map(d=><span key={d}>{d}</span>)}</div>
                 <div className="grid grid-cols-7 gap-2">
                    {emptySlots.map(i => <div key={`empty-${i}`} />)}
                    {daysArray.map(day => {
                       const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                       const override = overrides.find(o => o.date === dateStr);
                       
                       // Estilos do dia
                       let btnClass = "h-10 w-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all hover:scale-110 active:scale-95 ";
                       if (override) {
                          if (override.type === 'CLOSED') btnClass += "bg-red-500 text-white shadow-lg shadow-red-200 ring-2 ring-red-100";
                          else btnClass += "bg-orange-400 text-white shadow-lg shadow-orange-200 ring-2 ring-orange-100";
                       } else {
                          btnClass += "bg-white text-gray-600 hover:bg-pink-50 hover:text-[#D95D9B] border border-transparent hover:border-pink-200";
                       }

                       return (
                          <button key={day} onClick={() => handleDayClick(day)} className={btnClass} title={override ? (override.type === 'CLOSED' ? 'Dia Fechado' : 'Horário Bloqueado') : 'Disponível'}>
                             {day}
                          </button>
                       )
                    })}
                 </div>
              </div>
           </div>

           {/* Lado Direito: Lista de Bloqueios */}
           <div className="md:w-1/2 flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Datas Modificadas</h3>
              <div className="flex-1 bg-gray-50 rounded-[2rem] p-4 border border-gray-100 overflow-y-auto custom-scrollbar max-h-[400px]">
                 {overrides.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                       <Ban className="w-12 h-12 mb-2"/>
                       <p className="text-sm">Nenhuma alteração registrada.</p>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       {overrides.map(ov => (
                          <div key={ov.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                             <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-md ${ov.type === 'CLOSED' ? 'bg-red-500' : 'bg-orange-400'}`}>
                                   <span className="text-[10px] uppercase opacity-80">{new Date(ov.date + 'T00:00:00').toLocaleString('pt-BR', { month: 'short' })}</span>
                                   <span className="text-lg leading-none">{new Date(ov.date + 'T00:00:00').getDate()}</span>
                                </div>
                                <div>
                                   <p className="font-bold text-gray-800 capitalize">{new Date(ov.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                                   <p className="text-xs text-gray-500 font-bold uppercase mt-0.5">
                                      {ov.type === 'CLOSED' ? (
                                         <span className="text-red-500">Dia Fechado 🚫</span>
                                      ) : (
                                         <span className="text-orange-500">Bloqueio: {String(ov.startHour).padStart(2,'0')}:00 às {String(ov.endHour).padStart(2,'0')}:00 🔒</span>
                                      )}
                                   </p>
                                </div>
                             </div>
                             <button onClick={() => handleDeleteOverride(ov.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={18}/></button>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>

        </div>
      </div>

      {/* === MODAL DE CONFIGURAÇÃO DO DIA (POPUP) === */}
      {showDayModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 backdrop-blur-md p-4 animate-in fade-in">
           <div className="absolute inset-0" onClick={() => setShowDayModal(false)}></div>
           <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 ring-4 ring-black/5">
              <div className="bg-[#D95D9B] p-5 text-white flex justify-between items-center">
                 <div>
                    <p className="text-xs font-bold opacity-80 uppercase">Configurar Data</p>
                    <h3 className="font-bold text-lg capitalize">{new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</h3>
                 </div>
                 <button onClick={() => setShowDayModal(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* Opções de Tipo */}
                 <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-2 block">O que deseja fazer?</label>
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                       <button onClick={() => setDayConfig({...dayConfig, type: 'CLOSED'})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition ${dayConfig.type === 'CLOSED' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>FECHAR DIA</button>
                       <button onClick={() => setDayConfig({...dayConfig, type: 'BLOCK_TIME'})} className={`flex-1 py-3 rounded-lg text-xs font-bold transition ${dayConfig.type === 'BLOCK_TIME' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>TRANCAR HORÁRIO</button>
                    </div>
                 </div>

                 {/* Inputs de Horário (Só se for BLOCK_TIME) */}
                 {dayConfig.type === 'BLOCK_TIME' && (
                    <div className="animate-in slide-in-from-top-2">
                       <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                          <div className="flex-1">
                             <label className="text-[10px] font-bold text-blue-400 uppercase block mb-1">De</label>
                             <input type="time" className="w-full bg-white border border-blue-200 rounded-xl p-2 font-bold text-gray-700 outline-none focus:border-blue-400" value={dayConfig.start} onChange={e => setDayConfig({...dayConfig, start: e.target.value})} />
                          </div>
                          <span className="text-blue-300 font-bold mt-4">-</span>
                          <div className="flex-1">
                             <label className="text-[10px] font-bold text-blue-400 uppercase block mb-1">Até</label>
                             <input type="time" className="w-full bg-white border border-blue-200 rounded-xl p-2 font-bold text-gray-700 outline-none focus:border-blue-400" value={dayConfig.end} onChange={e => setDayConfig({...dayConfig, end: e.target.value})} />
                          </div>
                       </div>
                       <p className="text-[10px] text-gray-400 mt-2 text-center flex items-center justify-center gap-1">
                          <Lock size={10}/> Este intervalo ficará indisponível na agenda.
                       </p>
                    </div>
                 )}

                 {dayConfig.type === 'CLOSED' && (
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center animate-in slide-in-from-top-2">
                       <Ban className="w-8 h-8 text-red-400 mx-auto mb-2"/>
                       <p className="text-xs font-bold text-red-500 uppercase">Dia Bloqueado</p>
                       <p className="text-[10px] text-red-400">Nenhum cliente poderá agendar nesta data.</p>
                    </div>
                 )}

                 <button onClick={handleSaveOverride} className="w-full py-4 bg-[#D95D9B] text-white rounded-2xl font-bold shadow-lg hover:bg-[#c04e86] transition active:scale-95">
                    Confirmar Alteração
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};