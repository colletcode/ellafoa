import React, { useState } from 'react';

// A Interface
interface WelcomeProps {
  onStart: () => void;
}

// AQUI ESTÁ O SEGREDO: "export const" para casar com "import { Welcome }" do seu App.tsx
export const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-pink-50 overflow-hidden font-sans">
      
      {/* Círculos Decorativos de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-200 rounded-full blur-3xl opacity-30 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-300 rounded-full blur-3xl opacity-30" />

      {/* CONTEÚDO PRINCIPAL */}
      <div className="z-10 flex flex-col items-center space-y-8 p-8 text-center max-w-4xl">
        
        {/* LOGO */}
        <div className="relative mb-2 group cursor-default">
            <div className="w-48 h-48 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-pink-200 relative z-10 transition-transform duration-500 hover:scale-105 overflow-hidden">
               {!imageError ? (
                 <img 
                   src="/logo-ellafoa.png" 
                   alt="Logo ELLAFOA" 
                   className="w-full h-full object-contain p-2"
                   onError={() => setImageError(true)}
                 />
               ) : (
                 <div className="flex flex-col items-center justify-center text-pink-500 p-4">
                    {/* Ícone de Coração (SVG) */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-2 fill-pink-100">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                    <span className="text-xs font-bold text-gray-400">ELLAFOA</span>
                 </div>
               )}
            </div>
        </div>

        {/* Textos */}
        <div className="space-y-4 max-w-lg">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 tracking-tight leading-tight">
              Bem-vindo ao <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">Centro de Beleza</span>
            </h1>
            <p className="text-lg text-gray-600 font-light leading-relaxed">
              Gestão, beleza e organização em um só lugar.
              <br/>Prepare-se para um dia incrível.
            </p>
        </div>

        {/* Botão */}
        <div className="pt-8 mb-12">
            <button 
              onClick={onStart}
              className="group relative px-10 py-5 bg-pink-500 text-white text-lg font-bold rounded-2xl shadow-lg shadow-pink-300 hover:bg-pink-600 hover:shadow-pink-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex items-center gap-3"
            >
              {/* Ícone de Brilho (SVG) */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse text-yellow-200">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
              </svg>
              <span>Iniciar o Dia Maravilhosamente</span>
            </button>
        </div>
      </div>
      
      {/* Footer Fixo */}
      <div className="absolute bottom-6 text-pink-400 text-xs font-medium tracking-widest uppercase z-10">
        ELLAFOA • Centro de Beleza & Estética
      </div>
    </div>
  );
};