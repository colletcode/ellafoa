import React, { useState, useMemo } from 'react';
import { useData } from '../store';
import { SaleStatus, CategoryType } from '../types';
import { 
  Plus, CheckCircle, Clock, Trash2, XCircle, 
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, CreditCard,
  FileText, Edit, User, Phone, MapPin, Banknote, QrCode, Wallet
} from 'lucide-react';

// --- COMPONENTE DE CALENDÁRIO (MANTIDO IGUAL) ---
const CustomCalendar: React.FC<{ 
  selectedDate: string; 
  onSelect: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}> = ({ selectedDate, onSelect, minDate, maxDate }) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate || new Date()));
  
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysCount = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  
  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= daysCount; i++) days.push(i);

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    const d = new Date(selectedDate);
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
  };

  const isDisabled = (day: number) => {
    if (!day) return true;
    const current = new Date(year, month, day);
    const dateStr = current.toISOString().split('T')[0];
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  };

  const handleDayClick = (day: number | null) => {
    if (!day || isDisabled(day)) return;
    const date = new Date(year, month, day);
    onSelect(date.toISOString().split('T')[0]);
  };

  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm p-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <h5 className="font-bold text-gray-700">{monthNames[month]} {year}</h5>
        <div className="flex gap-1">
          <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
          <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight className="w-5 h-5 text-gray-500" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
          <div key={d} className="text-[10px] font-bold text-gray-400 py-1">{d}</div>
        ))}
        {days.map((day, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleDayClick(day)}
            disabled={isDisabled(day as number)}
            className={`
              h-10 w-full flex items-center justify-center rounded-xl text-sm font-medium transition-all
              ${!day ? 'invisible' : ''}
              ${isSelected(day as number) ? 'bg-[#D95D9B] text-white shadow-md scale-105' : 'text-gray-600'}
              ${isDisabled(day as number) ? 'opacity-20 cursor-not-allowed' : 'hover:bg-[#FDF2F5] hover:text-[#D95D9B]'}
            `}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL SALES ---
export const Sales: React.FC = () => {
  const { clients, products, sales, addSale, deleteSale, updateSaleStatus, addClient } = useData();
  
  const [showForm, setShowForm] = useState(false);
  const [viewSaleId, setViewSaleId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    itemId: '',
    date: '',
    time: '',
    firstName: '',
    lastName: '',
    cpf: '',
    address: '',
    whatsapp: '',
    notes: '',
    paymentMethod: 'Dinheiro' as 'Dinheiro' | 'Pix' | 'Crédito' | 'Débito'
  });

  const dateConstraints = useMemo(() => {
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    const maxDate = nextMonth.toISOString().split('T')[0];
    return { minDate, maxDate };
  }, []);

  const timeSlots = useMemo(() => {
    if (!formData.itemId) return [];
    const service = products.find(p => p.id === formData.itemId);
    if (!service) return [];
    const slots = [];
    const duration = service.duration || 60;
    let current = new Date();
    current.setHours(8, 0, 0, 0);
    const end = new Date();
    end.setHours(19, 0, 0, 0);
    while (current < end) {
      const timeStr = current.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      slots.push(timeStr);
      current.setMinutes(current.getMinutes() + duration);
    }
    return slots;
  }, [formData.itemId, products]);

  // Função Inteligente para pegar o preço certo baseado no pagamento
  const getCurrentPrice = () => {
    const service = products.find(p => p.id === formData.itemId);
    if (!service) return 0;

    switch (formData.paymentMethod) {
      case 'Pix': return service.pricePix || service.price;
      case 'Crédito': return service.priceCredit || service.price;
      case 'Débito': return service.priceDebit || service.price;
      case 'Dinheiro': default: return service.priceCash || service.price;
    }
  };

  const resetForm = () => {
    setFormData({ 
      itemId: '', date: '', time: '', firstName: '', lastName: '', cpf: '', address: '', whatsapp: '', notes: '',
      paymentMethod: 'Dinheiro'
    });
    setCurrentStep(1);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const service = products.find(p => p.id === formData.itemId);
    if (!service) return;
    
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const newClientId = `cl-${Date.now()}`;
    
    // Salva o cliente
    addClient({
      id: newClientId, name: fullName, phone: formData.whatsapp, email: '', cpf: formData.cpf,
      address: formData.address, hasPlan: false, dateRegistered: new Date().toISOString().split('T')[0]
    });

    // Salva a venda com o PREÇO CORRETO DO MÉTODO DE PAGAMENTO
    addSale({
      id: Date.now().toString(), 
      date: formData.date, 
      time: formData.time, 
      clientId: newClientId,
      itemId: formData.itemId, 
      finalValue: getCurrentPrice(), 
      notes: `${formData.notes} | Pagamento: ${formData.paymentMethod}`, 
      status: SaleStatus.PENDENTE
    });
    
    resetForm();
  };

  const selectedSaleDetails = useMemo(() => {
    if (!viewSaleId) return null;
    const sale = sales.find(s => s.id === viewSaleId);
    if (!sale) return null;
    const client = clients.find(c => c.id === sale.clientId);
    const product = products.find(p => p.id === sale.itemId);
    return { sale, client, product };
  }, [viewSaleId, sales, clients, products]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Agendamentos</h2>
        <button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-[#D95D9B] hover:bg-[#D95D9B]/90 text-white px-6 py-2.5 rounded-full flex items-center transition shadow-lg transform hover:-translate-y-1"
        >
          <Plus className="w-5 h-5 mr-2" /> Novo Agendamento
        </button>
      </div>

      {/* --- MODAL DE NOVO AGENDAMENTO --- */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-[#D95D9B] p-6 text-white shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Reserva de Horário</h3>
                <button onClick={resetForm} className="hover:bg-white/20 p-1 rounded-full"><XCircle /></button>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(step => (
                  <div key={step} className={`h-1.5 flex-1 rounded-full ${currentStep >= step ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            </div>

            <div className="p-8 overflow-y-auto">
              {/* PASSO 1: SERVIÇO */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-slide-in">
                  <h4 className="text-lg font-bold text-gray-700 flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#D95D9B]" /> Qual serviço?</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.filter(p => p.category !== CategoryType.PRODUTO).map(p => (
                      <button key={p.id} onClick={() => { setFormData({...formData, itemId: p.id}); setCurrentStep(2); }} className={`p-4 text-left border-2 rounded-2xl transition ${formData.itemId === p.id ? 'border-[#D95D9B] bg-[#FDF2F5]' : 'border-gray-100 hover:border-gray-200'}`}>
                        {/* AQUI ESTÁ A MUDANÇA: APENAS NOME E DURAÇÃO */}
                        <p className="font-bold text-gray-800 text-lg">{p.name}</p>
                        <p className="text-xs text-gray-400 font-medium">{p.duration} min</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PASSO 2: DATA */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-slide-in">
                  <h4 className="text-lg font-bold text-gray-700 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-[#D95D9B]" /> Quando você quer vir?</h4>
                  <CustomCalendar 
                    selectedDate={formData.date} 
                    onSelect={(date) => { setFormData({...formData, date}); setCurrentStep(3); }} 
                    minDate={dateConstraints.minDate}
                    maxDate={dateConstraints.maxDate}
                  />
                  <div className="flex justify-between pt-4">
                    <button onClick={() => setCurrentStep(1)} className="flex items-center text-gray-500 font-bold"><ChevronLeft /> Voltar</button>
                  </div>
                </div>
              )}

              {/* PASSO 3: HORÁRIO */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-slide-in">
                  <h4 className="text-lg font-bold text-gray-700 flex items-center gap-2"><Clock className="w-5 h-5 text-[#D95D9B]" /> Escolha um horário:</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {timeSlots.map(time => (
                      <button key={time} onClick={() => { setFormData({...formData, time: time}); setCurrentStep(4); }} className={`py-3 rounded-xl border-2 transition font-bold ${formData.time === time ? 'border-[#D95D9B] bg-[#FDF2F5] text-[#D95D9B]' : 'border-gray-50 text-gray-600 hover:border-gray-200'}`}>
                        {time}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setCurrentStep(2)} className="flex items-center text-gray-500 font-bold"><ChevronLeft /> Voltar</button>
                </div>
              )}

              {/* PASSO 4: FINALIZAÇÃO E PAGAMENTO */}
              {currentStep === 4 && (
                <form onSubmit={handleSubmit} className="space-y-6 animate-slide-in">
                  <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100">
                     <h4 className="text-sm font-bold text-[#D95D9B] uppercase mb-3">Dados do Cliente</h4>
                     <div className="grid grid-cols-2 gap-3 mb-3">
                       <input type="text" placeholder="Nome" className="border border-pink-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#D95D9B]" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                       <input type="text" placeholder="Sobrenome" className="border border-pink-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#D95D9B]" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                       <input type="text" placeholder="WhatsApp" className="border border-pink-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#D95D9B]" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} required />
                       <input type="text" placeholder="Endereço (Rua, Bairro)" className="border border-pink-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#D95D9B]" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                     </div>
                  </div>

                  <div>
                     <h4 className="text-sm font-bold text-gray-700 uppercase mb-3">Forma de Pagamento (Define o Preço)</h4>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Dinheiro */}
                        <button type="button" onClick={() => setFormData({...formData, paymentMethod: 'Dinheiro'})} 
                          className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition ${formData.paymentMethod === 'Dinheiro' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 hover:border-gray-300'}`}>
                           <Banknote className="w-6 h-6" />
                           <span className="text-xs font-bold">Dinheiro</span>
                        </button>
                        {/* Pix */}
                        <button type="button" onClick={() => setFormData({...formData, paymentMethod: 'Pix'})} 
                          className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition ${formData.paymentMethod === 'Pix' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-100 hover:border-gray-300'}`}>
                           <QrCode className="w-6 h-6" />
                           <span className="text-xs font-bold">Pix</span>
                        </button>
                        {/* Crédito */}
                        <button type="button" onClick={() => setFormData({...formData, paymentMethod: 'Crédito'})} 
                          className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition ${formData.paymentMethod === 'Crédito' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-300'}`}>
                           <CreditCard className="w-6 h-6" />
                           <span className="text-xs font-bold">Crédito</span>
                        </button>
                        {/* Débito */}
                        <button type="button" onClick={() => setFormData({...formData, paymentMethod: 'Débito'})} 
                          className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition ${formData.paymentMethod === 'Débito' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 hover:border-gray-300'}`}>
                           <Wallet className="w-6 h-6" />
                           <span className="text-xs font-bold">Débito</span>
                        </button>
                     </div>
                  </div>

                  {/* Resumo do Valor */}
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                     <span className="text-gray-500 font-medium">Total a Pagar:</span>
                     <span className="text-2xl font-black text-[#D95D9B]">R$ {getCurrentPrice().toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={() => setCurrentStep(3)} className="flex items-center text-gray-500 font-bold"><ChevronLeft /> Voltar</button>
                    <button type="submit" className="bg-[#D95D9B] text-white px-10 py-4 rounded-full font-bold shadow-lg hover:bg-[#C94080] transform active:scale-95 transition">Confirmar Reserva</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE DETALHES --- */}
      {selectedSaleDetails && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
             <div className="bg-[#FDF2F5] p-6 border-b border-pink-100 flex justify-between items-start">
               <div>
                  <h3 className="text-xl font-bold text-gray-800">Detalhes do Agendamento</h3>
                  <p className="text-sm text-pink-500 font-medium mt-1">
                    {new Date(selectedSaleDetails.sale.date).toLocaleDateString()} às {selectedSaleDetails.sale.time}
                  </p>
               </div>
               <button onClick={() => setViewSaleId(null)} className="bg-white p-2 rounded-full shadow-sm text-gray-400 hover:text-gray-600 transition"><XCircle className="w-6 h-6" /></button>
             </div>

             <div className="p-6 space-y-6">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                   <div className="bg-white p-3 rounded-full shadow-sm text-[#D95D9B]">
                      <User className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Cliente</p>
                      <h4 className="text-lg font-bold text-gray-800">{selectedSaleDetails.client?.name || 'Cliente Removido'}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                         <Phone className="w-3 h-3" />
                         <span>{selectedSaleDetails.client?.phone || 'Sem telefone'}</span>
                      </div>
                   </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase">Serviço</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedSaleDetails.sale.status === SaleStatus.CONCLUIDO ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {selectedSaleDetails.sale.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                     <h4 className="text-lg font-medium text-gray-800">{selectedSaleDetails.product?.name || 'Serviço Removido'}</h4>
                     <p className="text-xl font-bold text-[#D95D9B]">R$ {selectedSaleDetails.sale.finalValue.toFixed(2)}</p>
                  </div>
                </div>

                {selectedSaleDetails.sale.notes && (
                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                    <p className="text-xs font-bold text-yellow-600 mb-1">Observações:</p>
                    <p className="text-sm text-gray-700">{selectedSaleDetails.sale.notes}</p>
                  </div>
                )}
             </div>

             <div className="p-6 pt-0">
               <button onClick={() => setViewSaleId(null)} className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition">
                 Fechar
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Tabela de Agendamentos */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium text-sm border-b">
            <tr>
              <th className="p-6">Data / Hora</th>
              <th className="p-6">Cliente</th>
              <th className="p-6">Serviço</th>
              <th className="p-6">Status</th>
              <th className="p-6 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sales.map(sale => {
              const client = clients.find(c => c.id === sale.clientId);
              const product = products.find(p => p.id === sale.itemId);
              return (
                <tr key={sale.id} className="hover:bg-gray-50 group transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                       <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-[#D95D9B]">
                         <CalendarIcon className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="font-bold text-gray-700">{new Date(sale.date).toLocaleDateString()}</p>
                         <p className="text-xs text-gray-400 font-medium">{sale.time}</p>
                       </div>
                    </div>
                  </td>
                  <td className="p-6 font-medium text-gray-800">{client?.name}</td>
                  <td className="p-6 text-sm text-gray-600">{product?.name}</td>
                  <td className="p-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      sale.status === SaleStatus.CONCLUIDO ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{sale.status}</span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setViewSaleId(sale.id)}
                        className="p-2 bg-pink-50 text-pink-500 rounded-lg hover:bg-pink-100 transition" 
                        title="Ver Detalhes"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={() => alert('Edição em breve!')}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={() => deleteSale(sale.id)} 
                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};