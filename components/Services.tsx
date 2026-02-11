import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, writeBatch, getDocs } from 'firebase/firestore';
import { 
  Plus, Tag, X, Pencil, Trash2, Clock, 
  Banknote, CreditCard, QrCode, Wallet, FileText, DollarSign, Box, UploadCloud, AlertCircle 
} from 'lucide-react';

export const Services: React.FC = () => {
  // --- ESTADOS ---
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // --- FILTRO ANTI-DUPLICIDADE ---
  // Mostra apenas o primeiro item encontrado com aquele nome
  const uniqueProducts = products.filter((product, index, self) => 
    index === self.findIndex((t) => (
      t.name === product.name
    ))
  );

  // ESTADO DO FORMULÁRIO COMPLETO
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'SERVICO',
    cost: '',
    duration: '60',
    priceCash: '',   // Dinheiro
    pricePix: '',    // Pix
    priceCredit: '', // Crédito
    priceDebit: ''   // Débito
  });

  // --- LISTA DE BACKUP (Para preencher o banco vazio) ---
  const defaultServices = [
    { name: "Alongamento de Fibra", description: "Aplicação completa de fibra de vidro", category: "UNHA", cost: 40.00, duration: 120, price: 150.00, priceCash: 150.00, pricePix: 150.00, priceCredit: 165.00, priceDebit: 150.00, active: true },
    { name: "Manutenção de Fibra", description: "Manutenção mensal", category: "UNHA", cost: 25.00, duration: 90, price: 100.00, priceCash: 100.00, pricePix: 100.00, priceCredit: 110.00, priceDebit: 100.00, active: true },
    { name: "Manicure Simples", description: "Cutilagem e Esmaltação", category: "UNHA", cost: 5.00, duration: 40, price: 35.00, priceCash: 35.00, pricePix: 35.00, priceCredit: 38.00, priceDebit: 35.00, active: true },
    { name: "Pedicure Simples", description: "Cutilagem e Esmaltação", category: "UNHA", cost: 5.00, duration: 40, price: 35.00, priceCash: 35.00, pricePix: 35.00, priceCredit: 38.00, priceDebit: 35.00, active: true },
    { name: "Banho de Gel", description: "Blindagem natural", category: "UNHA", cost: 15.00, duration: 60, price: 90.00, priceCash: 90.00, pricePix: 90.00, priceCredit: 98.00, priceDebit: 90.00, active: true },
    { name: "Spa dos Pés", description: "Hidratação profunda", category: "OUTROS", cost: 10.00, duration: 40, price: 50.00, priceCash: 50.00, pricePix: 50.00, priceCredit: 55.00, priceDebit: 50.00, active: true }
  ];

  // 1. AUTO-VERIFICAÇÃO DO BANCO (RODA AO ABRIR)
  useEffect(() => {
    const autoFixDatabase = async () => {
      try {
        const q = query(collection(db, "products"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          console.log("Banco vazio. Restaurando serviços automaticamente...");
          const batch = writeBatch(db);
          defaultServices.forEach(s => {
            const docRef = doc(collection(db, "products"));
            batch.set(docRef, s);
          });
          await batch.commit();
        }
      } catch (error) {
        console.error("Erro ao verificar banco:", error);
      }
    };
    autoFixDatabase();
  }, []);

  // 2. LER DADOS DO FIREBASE
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- TRAVA DE ROLAGEM ---
  useEffect(() => {
    if (showModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [showModal]);

  const handleEdit = (product: any) => {
    setForm({
      name: product.name,
      description: product.description || '',
      type: product.category === 'PRODUTO' ? 'PRODUTO' : 'SERVICO',
      cost: product.cost ? product.cost.toString() : '0',
      duration: product.duration ? product.duration.toString() : '60',
      priceCash: (product.priceCash || product.price || 0).toString(), 
      pricePix: (product.pricePix || product.price || 0).toString(),
      priceCredit: (product.priceCredit || product.price || 0).toString(),
      priceDebit: (product.priceDebit || product.price || 0).toString(),
    });
    setCurrentId(product.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const batch = writeBatch(db);
      defaultServices.forEach(s => {
        const docRef = doc(collection(db, "products"));
        batch.set(docRef, s);
      });
      await batch.commit();
      alert("Serviços restaurados com sucesso!");
    } catch (e) { alert("Erro ao restaurar."); }
    setIsRestoring(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
      setConfirmDeleteId(null);
    } catch (error) {
      alert("Erro ao excluir.");
    }
  };

  const resetForm = () => {
    setForm({ 
      name: '', description: '', type: 'SERVICO', cost: '', duration: '60',
      priceCash: '', pricePix: '', priceCredit: '', priceDebit: ''
    });
    setIsEditing(false);
    setCurrentId(null);
    setShowModal(false);
  };

  const parseValue = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.toString().replace(',', '.')) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const costVal = parseValue(form.cost);
    const durationVal = parseInt(form.duration) || 30;
    const pCash = parseValue(form.priceCash);
    
    const pPix = form.pricePix ? parseValue(form.pricePix) : pCash;
    const pCredit = form.priceCredit ? parseValue(form.priceCredit) : pCash;
    const pDebit = form.priceDebit ? parseValue(form.priceDebit) : pCash;

    // Categoria em texto simples para evitar erros
    const category = form.type === 'PRODUTO' ? 'PRODUTO' : 'UNHA';

    const productData = {
      name: form.name,
      description: form.description,
      category: category,
      cost: costVal,
      duration: durationVal,
      price: pCash, 
      priceCash: pCash,
      pricePix: pPix,       
      priceCredit: pCredit, 
      priceDebit: pDebit,
      active: true
    };

    try {
      if (isEditing && currentId) {
        await updateDoc(doc(db, "products", currentId), productData);
      } else {
        await addDoc(collection(db, "products"), productData);
      }
      resetForm();
    } catch (error) {
      alert("Erro ao salvar. Tente novamente.");
    }
  };

  const currentPrice = parseValue(form.priceCash);
  const currentCost = parseValue(form.cost);
  const estimatedProfit = currentPrice - currentCost;
  const profitMargin = currentPrice > 0 ? (estimatedProfit / currentPrice) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-20 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Catálogo</h2>
           <p className="text-sm text-gray-500">Gerencie seus serviços e produtos ({uniqueProducts.length})</p>
        </div>
        <button 
          type="button"
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-[#D95D9B] hover:bg-[#D95D9B]/90 text-white px-6 py-3 rounded-xl font-bold flex items-center transition shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5 mr-2" /> Novo Cadastro
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20">
             <AlertCircle className="w-8 h-8 text-gray-300 mb-2 animate-bounce"/>
             <p className="text-gray-400">Carregando catálogo...</p>
           </div>
        ) : uniqueProducts.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 opacity-80 space-y-4">
             <div className="bg-pink-50 p-4 rounded-full"><Tag size={48} className="text-[#D95D9B]" /></div>
             <p className="text-gray-500 font-medium">Nenhum serviço encontrado.</p>
             <button 
               onClick={handleRestore} 
               disabled={isRestoring}
               className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 transition"
             >
               {isRestoring ? 'Restaurando...' : <><UploadCloud size={20} /> Restaurar Padrões Agora</>}
             </button>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-wider border-b">
                <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4 hidden md:table-cell">Tipo</th>
                  <th className="p-4 hidden md:table-cell">Custo</th>
                  <th className="p-4">Venda (Dinheiro)</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {uniqueProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 transition group">
                    <td className="p-4">
                      <p className="font-bold text-gray-800">{product.name}</p>
                      {product.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{product.description}</p>}
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${product.category === 'PRODUTO' ? 'bg-green-100 text-green-700' : 'bg-pink-100 text-pink-700'}`}>
                        {product.category === 'PRODUTO' ? 'Produto' : 'Serviço'}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-sm text-gray-500 font-medium">
                      R$ {product.cost ? Number(product.cost).toFixed(2) : '0.00'}
                    </td>
                    <td className="p-4">
                      <span className="font-black text-gray-700">R$ {Number(product.priceCash || product.price || 0).toFixed(2)}</span>
                      {(product.priceCredit !== product.priceCash || product.pricePix !== product.priceCash) && (
                        <span className="ml-2 text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded border border-blue-100 font-bold hidden sm:inline-block">+ variação</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                        
                        {confirmDeleteId === product.id ? (
                          <div className="flex items-center gap-1 animate-fade-in">
                            <button onClick={() => handleDelete(product.id)} className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-700 transition">Confirmar</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(product.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[99999] flex justify-center items-start pt-10 p-4 bg-white/80 backdrop-blur-sm animate-fade-in">
          
          <div className="absolute inset-0" onClick={resetForm}></div>

          <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 ring-2 ring-black/5">
            
            <div className="bg-[#D95D9B] p-6 text-white flex justify-between items-center shrink-0">
              <div>
                 <h3 className="font-bold text-xl">{isEditing ? 'Editar Item' : 'Novo Cadastro'}</h3>
                 <p className="text-pink-100 text-sm opacity-90">Preencha os dados abaixo</p>
              </div>
              <button type="button" onClick={resetForm} className="hover:bg-white/20 p-2 rounded-full transition"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Seção 1: Dados Básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                    <input type="text" className="w-full border border-gray-200 rounded-xl p-3 focus:border-[#D95D9B] outline-none transition font-bold text-gray-700" placeholder="Ex: Manicure..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  
                  <div className="md:col-span-2">
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo de Item</label>
                     <div className="flex gap-4">
                        <label className={`flex-1 border rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition ${form.type === 'SERVICO' ? 'border-[#D95D9B] bg-pink-50 text-[#D95D9B] font-bold shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                           <input type="radio" name="type" className="hidden" checked={form.type === 'SERVICO'} onChange={() => setForm({...form, type: 'SERVICO'})} />
                           <Tag className="w-4 h-4" /> Serviço
                        </label>
                        <label className={`flex-1 border rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition ${form.type === 'PRODUTO' ? 'border-green-500 bg-green-50 text-green-700 font-bold shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                           <input type="radio" name="type" className="hidden" checked={form.type === 'PRODUTO'} onChange={() => setForm({...form, type: 'PRODUTO'})} />
                           <Box className="w-4 h-4" /> Produto
                        </label>
                     </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duração (min)</label>
                    <div className="relative">
                       <Clock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                       <input type="number" className="w-full border border-gray-200 rounded-xl p-3 pl-10 focus:border-[#D95D9B] outline-none font-bold text-gray-700" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required min="1" />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição Curta</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        <input type="text" className="w-full border border-gray-200 rounded-xl p-3 pl-10 focus:border-[#D95D9B] outline-none font-medium text-gray-600" placeholder="Detalhes..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Seção 2: Custos e Lucro */}
                <div>
                   <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                     <DollarSign className="w-5 h-5 text-[#D95D9B]" /> Custos & Precificação
                   </h4>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                         <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Preço de Custo</label>
                         <input type="number" step="0.01" className="w-full bg-white border border-gray-200 rounded-lg p-2 text-gray-700 font-bold focus:border-red-400 outline-none" placeholder="0,00" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} />
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col justify-center">
                         <div className="flex justify-between text-sm mb-1">
                            <span className="text-green-700 font-bold">Lucro Estimado:</span>
                            <span className="font-bold text-green-700">R$ {estimatedProfit.toFixed(2)}</span>
                         </div>
                         <div className="w-full bg-green-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${Math.min(profitMargin, 100)}%` }}></div>
                         </div>
                         <p className="text-[10px] text-green-600 mt-1 text-right font-bold">{profitMargin.toFixed(0)}% de margem</p>
                      </div>
                   </div>

                   {/* Grid de Preços Diferenciados */}
                   <p className="text-xs font-bold text-gray-400 uppercase mb-2">Tabela de Preços por Pagamento</p>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <Banknote className="h-4 w-4 text-green-500" />
                         </div>
                         <input type="number" step="0.01" className="block w-full pl-10 p-3 border-2 border-green-100 rounded-xl focus:border-green-500 outline-none transition font-bold text-gray-700" placeholder="Dinheiro (Base)" value={form.priceCash} onChange={e => setForm({...form, priceCash: e.target.value})} required />
                         <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-green-600 font-bold">Dinheiro</span>
                      </div>

                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <QrCode className="h-4 w-4 text-teal-500" />
                         </div>
                         <input type="number" step="0.01" className="block w-full pl-10 p-3 border-2 border-teal-100 rounded-xl focus:border-teal-500 outline-none transition font-bold text-gray-700" placeholder="Igual Dinheiro" value={form.pricePix} onChange={e => setForm({...form, pricePix: e.target.value})} />
                         <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-teal-600 font-bold">Pix</span>
                      </div>

                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <CreditCard className="h-4 w-4 text-blue-500" />
                         </div>
                         <input type="number" step="0.01" className="block w-full pl-10 p-3 border-2 border-blue-100 rounded-xl focus:border-blue-500 outline-none transition font-bold text-gray-700" placeholder="Igual Dinheiro" value={form.priceCredit} onChange={e => setForm({...form, priceCredit: e.target.value})} />
                         <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-blue-600 font-bold">Crédito</span>
                      </div>

                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <Wallet className="h-4 w-4 text-orange-500" />
                         </div>
                         <input type="number" step="0.01" className="block w-full pl-10 p-3 border-2 border-orange-100 rounded-xl focus:border-orange-500 outline-none transition font-bold text-gray-700" placeholder="Igual Dinheiro" value={form.priceDebit} onChange={e => setForm({...form, priceDebit: e.target.value})} />
                         <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-orange-600 font-bold">Débito</span>
                      </div>
                   </div>
                </div>

                <button type="submit" className="w-full py-4 bg-[#D95D9B] text-white rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg hover:bg-[#C94080] hover:scale-[1.01] transition-all transform mt-4">
                  {isEditing ? 'Salvar Alterações' : 'SALVAR CADASTRO'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};