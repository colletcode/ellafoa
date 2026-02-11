import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { 
  Plus, Search, AlertTriangle, ArrowUpCircle, Trash2, X, Hash, AlignLeft 
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Estado do Formulário
  const [form, setForm] = useState({
    type: 'INSUMO',      // Finalidade
    name: '',            // Nome
    sku: '',             // Código
    cost: '',            // Custo Unitário
    salePrice: '',       // Revenda Unitário
    qtyInput: '',        // Quantidade (Inserção)
    minAlert: '5',       // Alerta Mínimo
    description: ''      // Descrição (Novo)
  });

  // Saldo atual no banco (para saber quanto somar na edição)
  const [currentBalance, setCurrentBalance] = useState(0);

  // 1. Busca dados em tempo real
  useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Trava a rolagem da página quando o modal abre
  useEffect(() => {
    if (showModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [showModal]);

  // Prepara formulário para Edição
  const handleEdit = (item: any) => {
    setForm({
      type: item.type || 'INSUMO',
      name: item.name,
      sku: item.sku || '',
      cost: item.cost?.toString() || '',
      salePrice: item.salePrice?.toString() || '',
      qtyInput: '0', // Reseta o input para a pessoa digitar só o que vai entrar
      minAlert: item.minAlert?.toString() || '5',
      description: item.description || ''
    });
    setCurrentBalance(item.currentQty || 0); // Guarda o saldo atual
    setCurrentId(item.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const resetForm = () => {
    setForm({ 
      type: 'INSUMO', name: '', sku: '', cost: '', salePrice: '', 
      qtyInput: '', minAlert: '5', description: '' 
    });
    setCurrentBalance(0);
    setIsEditing(false); 
    setCurrentId(null); 
    setShowModal(false);
  };

  // Salva no Firebase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Lógica Inteligente: Soma o que foi digitado ao saldo que já existe
    const inputQty = parseInt(form.qtyInput) || 0;
    const finalQty = isEditing ? (currentBalance + inputQty) : inputQty;

    const itemData = {
      type: form.type,
      name: form.name,
      sku: form.sku,
      cost: parseFloat(form.cost.replace(',', '.')) || 0,
      salePrice: parseFloat(form.salePrice.replace(',', '.')) || 0,
      currentQty: finalQty, // Salva o novo total
      minAlert: parseInt(form.minAlert) || 5,
      description: form.description,
      updatedAt: new Date()
    };

    try {
      if (isEditing && currentId) {
        await updateDoc(doc(db, "inventory", currentId), itemData);
      } else {
        await addDoc(collection(db, "inventory"), itemData);
      }
      resetForm();
    } catch (e) { alert("Erro ao salvar estoque."); }
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20 p-4 md:p-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Controle de Estoque</h2>
          <p className="text-sm text-gray-500">Gestão de insumos e produtos ({inventory.length} itens)</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-[#D95D9B] text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg hover:bg-[#c04e86] transition">
          <Plus className="w-5 h-5 mr-2" /> Novo Item
        </button>
      </div>

      {/* Filtros e Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Buscar por nome ou código..." className="w-full pl-12 p-3 rounded-xl border border-gray-200 focus:border-[#D95D9B] outline-none shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-center justify-between text-orange-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-bold">Baixo Estoque</span>
          </div>
          <span className="text-xl font-bold">{inventory.filter(i => i.currentQty <= (i.minAlert || 5)).length}</span>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <p className="text-center p-10 text-gray-400">Carregando...</p> : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase border-b">
              <tr>
                <th className="p-4">Item / Código</th>
                <th className="p-4 text-center">Tipo</th>
                <th className="p-4 text-center">Qtd Atual</th>
                <th className="p-4 text-right">Preço Venda</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInventory.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition group">
                  <td className="p-4">
                    <p className="font-bold text-gray-800">{item.name}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 font-mono uppercase"><Hash size={8}/>{item.sku || 'S/ COD'}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.type === 'REVENDA' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>
                      {item.type === 'REVENDA' ? 'REVENDA' : 'INSUMO'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-black text-lg ${item.currentQty <= (item.minAlert || 5) ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
                      {item.currentQty}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-green-600">
                    {Number(item.salePrice || 0) > 0 ? `R$ ${Number(item.salePrice).toFixed(2)}` : '-'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg flex items-center gap-1 text-xs font-bold transition">
                        <ArrowUpCircle className="w-4 h-4" /> <span className="hidden md:inline">ENTRADA</span>
                      </button>
                      {confirmDeleteId === item.id ? (
                        <button onClick={() => { try { deleteDoc(doc(db, "inventory", item.id)); setConfirmDeleteId(null); } catch(e){alert("Erro");} }} className="px-3 bg-red-600 text-white rounded-lg text-xs font-bold">OK</button>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE CADASTRO / ENTRADA */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex justify-center items-start pt-10 p-4 bg-white/80 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={resetForm}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-gray-100">
            
            <div className="bg-[#D95D9B] p-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold text-lg">{isEditing ? 'Entrada de Mercadoria' : 'Novo Item'}</h3>
                {isEditing && <p className="text-[10px] opacity-80 uppercase font-bold">Saldo atual: {currentBalance} unidades</p>}
              </div>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 max-h-[80vh]">
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. FINALIDADE */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Finalidade</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    <button type="button" onClick={() => setForm({...form, type: 'INSUMO'})} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition ${form.type === 'INSUMO' ? 'bg-white shadow text-[#D95D9B]' : 'text-gray-400'}`}>USO INTERNO</button>
                    <button type="button" onClick={() => setForm({...form, type: 'REVENDA'})} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition ${form.type === 'REVENDA' ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}>REVENDA / PDV</button>
                  </div>
                </div>

                {/* 2. NOME E CÓDIGO */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome do Produto</label>
                    <input className="w-full border p-3 rounded-xl outline-none font-bold text-gray-700" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Código (SKU)</label>
                    <input className="w-full border p-3 rounded-xl outline-none font-mono text-xs font-bold uppercase" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="EX: 001" />
                  </div>
                </div>

                {/* 3. CUSTO E REVENDA (UNITÁRIOS) */}
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor de Custo (Un)</label>
                     <input type="number" step="0.01" className="w-full border p-3 rounded-xl font-bold" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} placeholder="0.00" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-green-600 uppercase mb-1">Valor de Revenda (Un)</label>
                     <input type="number" step="0.01" className="w-full border-2 border-green-100 p-3 rounded-xl font-bold text-green-700 outline-none focus:border-green-300" value={form.salePrice} onChange={e => setForm({...form, salePrice: e.target.value})} placeholder="0.00" />
                   </div>
                </div>

                {/* 4. QUANTIDADE E ALERTA */}
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100">
                     <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">
                       {isEditing ? 'Inserir Qtd (+)' : 'Qtd Inicial'}
                     </label>
                     <input type="number" className="w-full bg-transparent p-1 font-black text-xl text-blue-700 outline-none" value={form.qtyInput} onChange={e => setForm({...form, qtyInput: e.target.value})} required placeholder="0" />
                     {isEditing && <p className="text-[9px] text-blue-400 font-bold">SOMA AO ATUAL</p>}
                   </div>
                   <div className="bg-red-50/50 p-2 rounded-xl border border-red-100">
                     <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Alerta Mínimo</label>
                     <input type="number" className="w-full bg-transparent p-1 font-black text-xl text-red-700 outline-none" value={form.minAlert} onChange={e => setForm({...form, minAlert: e.target.value})} />
                   </div>
                </div>

                {/* 5. DESCRIÇÃO */}
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição</label>
                   <div className="relative">
                      <div className="absolute left-3 top-3 text-gray-400"><AlignLeft size={16}/></div>
                      <textarea className="w-full border p-3 pl-10 rounded-xl outline-none text-sm text-gray-600 h-20 resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Detalhes, fornecedor, observações..." />
                   </div>
                </div>

                <button type="submit" className="w-full py-4 bg-[#D95D9B] text-white rounded-xl font-bold shadow-lg mt-2 uppercase tracking-wider hover:bg-[#c04e86] transition transform active:scale-95">
                  {isEditing ? 'Confirmar Entrada' : 'Cadastrar Item'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};