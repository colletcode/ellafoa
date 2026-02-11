import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, where, getDocs } from 'firebase/firestore';
import { 
  Plus, Search, Edit, Trash2, User, Phone, X, 
  FileText, MapPin, Calendar, History, Eye, Clock, 
  CheckCircle, Ban, DollarSign 
} from 'lucide-react';

export const Clients: React.FC = () => {
  // --- ESTADOS ---
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- MODAIS ---
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // --- DADOS ---
  const [selectedClient, setSelectedClient] = useState<any>(null); 
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalSpent: 0, visits: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);

  // Formulário
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', cpf: '', address: '', notes: ''
  });

  // 1. Busca Clientes
  useEffect(() => {
    const q = query(collection(db, "clients"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. BUSCAR HISTÓRICO (Visualização)
  const handleOpenView = async (client: any) => {
    setSelectedClient(client);
    setShowViewModal(true);
    setHistoryLoading(true);
    setClientHistory([]);
    setStats({ totalSpent: 0, visits: 0 });

    try {
      let q;
      const cleanCpf = client.cpf ? client.cpf.replace(/\D/g, '') : '';
      
      if (cleanCpf.length > 5) {
         q = query(collection(db, "agendamentos"), where("cpf", "==", client.cpf));
      } else {
         q = query(collection(db, "agendamentos"), where("whatsapp", "==", client.phone));
      }

      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      history.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const newStats = history.reduce((acc: any, item: any) => {
        if (item.status === 'CONCLUIDO') {
          acc.totalSpent += Number(item.valorTotal || 0);
          acc.visits += 1;
        }
        return acc;
      }, { totalSpent: 0, visits: 0 });

      setClientHistory(history);
      setStats(newStats);

    } catch (error) { console.error(error); } finally { setHistoryLoading(false); }
  };

  // 3. CRUD (Novo/Editar/Excluir)
  const handleOpenEdit = (client: any) => {
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      cpf: client.cpf || '',
      address: client.address || '',
      notes: client.notes || '' 
    });
    setShowFormModal(true);
  };

  const handleOpenNew = () => {
    setSelectedClient(null);
    setFormData({ name: '', phone: '', email: '', cpf: '', address: '', notes: '' });
    setShowFormModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza? Isso apaga o contato permanentemente.")) {
      await deleteDoc(doc(db, "clients", id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = { ...formData, name: formData.name.trim() };

      if (selectedClient && selectedClient.id) {
        await updateDoc(doc(db, "clients", selectedClient.id), dataToSave);
        alert("Dados atualizados!");
      } else {
        await addDoc(collection(db, "clients"), { 
            ...dataToSave, 
            totalSpent: 0, visits: 0, status: 'Ativo', 
            registerDate: new Date().toISOString() 
        });
        alert("Cliente cadastrado!");
      }
      setShowFormModal(false);
    } catch (error) { alert("Erro ao salvar."); }
  };

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm) ||
    client.cpf?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-white w-full p-4 md:p-8 space-y-6 animate-fade-in pb-20">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Meus Clientes</h2>
          <p className="text-sm text-gray-500">Base de contatos ({clients.length})</p>
        </div>
        <button onClick={handleOpenNew} className="bg-[#D95D9B] text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg hover:bg-[#c04e86] transition">
          <Plus className="w-5 h-5 mr-2" /> Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
         <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
         <input type="text" placeholder="Buscar por nome, CPF ou telefone..." className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#D95D9B] outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <p className="text-center p-10 text-gray-400">Carregando...</p> : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase border-b">
              <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4 hidden md:table-cell">Contato</th>
                  <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-[#D95D9B] font-bold">
                        {client.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{client.name}</p>
                        <p className="text-xs text-gray-400">{client.cpf || 'Sem CPF'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-sm text-gray-600">
                     <span className="flex items-center gap-2"><Phone size={14}/> {client.phone}</span>
                  </td>
                  <td className="p-4 text-right">
                     <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenView(client)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition" title="Ver Detalhes">
                           <Eye size={18}/>
                        </button>
                        <button onClick={() => handleOpenEdit(client)} className="p-2 bg-orange-50 text-orange-500 rounded-lg hover:bg-orange-100 transition" title="Editar">
                           <Edit size={18}/>
                        </button>
                        <button onClick={() => handleDelete(client.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition" title="Excluir">
                           <Trash2 size={18}/>
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE VISUALIZAÇÃO (ESTRUTURA IDÊNTICA À AGENDA - FUNDO BRANCO VIDRO) */}
      {/* ========================================================================= */}
      {showViewModal && selectedClient && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
           {/* Card Centralizado (Mesmas classes da Agenda) */}
           <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-gray-100 ring-4 ring-black/5">
              
              {/* Header Rosa */}
              <div className="bg-[#D95D9B] p-6 text-white shrink-0 relative text-center">
                 <button onClick={() => setShowViewModal(false)} className="absolute top-6 right-6 p-1 hover:bg-white/20 rounded-full transition"><X size={24}/></button>
                 
                 <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-white text-[#D95D9B] rounded-full flex items-center justify-center text-3xl font-black shadow-lg mb-2">
                       {selectedClient.name?.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-bold text-xl">{selectedClient.name}</h3>
                    
                    {/* Mini Dashboard */}
                    <div className="flex gap-4 mt-4 bg-white/20 px-6 py-2 rounded-xl backdrop-blur-sm">
                       <div className="text-center">
                          <p className="text-[10px] uppercase font-bold opacity-80">Gasto Total</p>
                          <p className="font-black">R$ {stats.totalSpent.toFixed(2)}</p>
                       </div>
                       <div className="w-px bg-white/30 h-8 self-center"></div>
                       <div className="text-center">
                          <p className="text-[10px] uppercase font-bold opacity-80">Visitas</p>
                          <p className="font-black">{stats.visits}</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Corpo com Rolagem */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                 {/* Dados Cadastrais */}
                 <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mb-2">Contato</p>
                    <div className="flex items-center gap-3">
                       <Phone size={16} className="text-[#D95D9B]"/>
                       <span className="font-bold text-gray-700">{selectedClient.phone}</span>
                    </div>
                    {selectedClient.cpf && (
                       <div className="flex items-center gap-3">
                          <User size={16} className="text-[#D95D9B]"/>
                          <span className="font-bold text-gray-700">{selectedClient.cpf}</span>
                       </div>
                    )}
                    {selectedClient.address && (
                       <div className="flex items-center gap-3">
                          <MapPin size={16} className="text-[#D95D9B]"/>
                          <span className="font-bold text-gray-700 text-sm">{selectedClient.address}</span>
                       </div>
                    )}
                 </div>

                 {/* Observações */}
                 {selectedClient.notes && (
                    <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                       <p className="text-xs font-bold text-yellow-600 uppercase mb-1 flex items-center gap-1">
                          <FileText size={12}/> Observações
                       </p>
                       <p className="text-sm text-gray-700 italic">"{selectedClient.notes}"</p>
                    </div>
                 )}

                 {/* Histórico */}
                 <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mb-3 flex items-center gap-2">
                       <History size={14}/> Histórico de Serviços
                    </p>
                    
                    {historyLoading ? <p className="text-center py-4 text-gray-400 text-sm">Carregando...</p> : (
                       <div className="space-y-3">
                          {clientHistory.length === 0 ? <p className="text-gray-400 text-sm text-center py-6 border-2 border-dashed rounded-xl">Sem histórico ainda.</p> : clientHistory.map(item => (
                             <div key={item.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition">
                                <div>
                                   <p className="font-bold text-gray-800 text-sm">{item.servicoNome}</p>
                                   <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                      <Calendar size={10}/> {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                      <span className="mx-1">|</span>
                                      <Clock size={10}/> {item.hora}
                                   </p>
                                </div>
                                <div className="text-right">
                                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${item.status === 'CONCLUIDO' ? 'bg-green-100 text-green-700' : item.status === 'CANCELADO' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {item.status || 'Agendado'}
                                   </span>
                                   <p className="text-sm font-black text-gray-700 mt-1">R$ {Number(item.valorTotal).toFixed(2)}</p>
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE FORMULÁRIO (NOVO/EDITAR - ESTRUTURA IDÊNTICA À AGENDA) */}
      {/* ========================================================================= */}
      {showFormModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-gray-100 ring-4 ring-black/5">
            <div className="bg-[#D95D9B] p-6 flex justify-between items-center text-white shrink-0">
               <h3 className="font-bold text-xl">{selectedClient ? 'Editar Dados' : 'Novo Cliente'}</h3>
               <button onClick={() => setShowFormModal(false)} className="hover:bg-white/20 p-1 rounded-full"><X className="w-6 h-6"/></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
               <form onSubmit={handleSubmit} className="space-y-4">
                  <div><label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label><input required className="w-full border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-700 outline-none focus:border-[#D95D9B] transition" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                     <div><label className="text-xs font-bold text-gray-400 uppercase ml-1">WhatsApp</label><input required className="w-full border-2 border-gray-100 p-4 rounded-2xl font-medium outline-none focus:border-[#D95D9B]" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                     <div><label className="text-xs font-bold text-gray-400 uppercase ml-1">CPF</label><input className="w-full border-2 border-gray-100 p-4 rounded-2xl font-medium outline-none focus:border-[#D95D9B]" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} /></div>
                  </div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase ml-1">E-mail</label><input className="w-full border-2 border-gray-100 p-4 rounded-2xl font-medium outline-none focus:border-[#D95D9B]" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase ml-1">Endereço</label><input className="w-full border-2 border-gray-100 p-4 rounded-2xl font-medium outline-none focus:border-[#D95D9B]" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
                  <div><label className="text-xs font-bold text-gray-400 uppercase ml-1">Observações</label><textarea className="w-full border-2 border-gray-100 p-4 rounded-2xl h-24 resize-none font-medium outline-none focus:border-[#D95D9B]" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Ex: Alergias, preferências..." /></div>
                  
                  <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                     <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 py-4 font-bold text-gray-400 border-2 border-gray-100 rounded-2xl hover:bg-gray-50">Cancelar</button>
                     <button type="submit" className="flex-1 bg-[#D95D9B] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#c04e86]">Salvar</button>
                  </div>
               </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};