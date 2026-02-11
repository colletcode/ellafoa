import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; 
import { Lock, Mail, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // O App.tsx detectará o login automaticamente
    } catch (err) {
      setError('E-mail ou senha incorretos.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl shadow-pink-200 overflow-hidden border-4 border-white">
        
        {/* CABEÇALHO COM LOGO */}
        <div className="bg-[#D95D9B] p-10 flex flex-col items-center justify-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white/10 blur-3xl rounded-full scale-150 translate-y-10"></div>
          
          <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-pink-300 mb-4 relative z-10">
             <img src="/logo-ellafoa.png" alt="ELLA" className="w-full h-full object-contain p-2" onError={(e) => e.currentTarget.style.display = 'none'} />
             <span className="absolute font-black text-pink-400 text-xs z-0 opacity-50">ELLA</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight relative z-10">Área Restrita</h2>
          <p className="text-pink-100 text-sm font-medium relative z-10">Painel Administrativo</p>
        </div>

        {/* FORMULÁRIO */}
        <div className="p-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 animate-pulse">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">E-mail</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#D95D9B] transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-12 p-4 border-2 border-gray-100 rounded-2xl focus:border-[#D95D9B] outline-none transition-all font-bold text-gray-700 bg-gray-50 focus:bg-white"
                  placeholder="adm@ellafoa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#D95D9B] transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-12 p-4 border-2 border-gray-100 rounded-2xl focus:border-[#D95D9B] outline-none transition-all font-bold text-gray-700 bg-gray-50 focus:bg-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-4 bg-[#D95D9B] text-white rounded-2xl font-bold shadow-lg hover:bg-[#c04e86] hover:shadow-pink-300 hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  Entrar <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-gray-50">
            <a href="/agendar" className="text-xs font-bold text-gray-400 hover:text-[#D95D9B] transition cursor-pointer">
              ← Ir para Agendamento Público
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};