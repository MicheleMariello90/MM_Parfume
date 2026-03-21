import React from 'react';

const OlfactivePyramidIcon = ({ volatility }: { volatility: string }) => {
  const v = (volatility || "").toLowerCase();
  
  // Colori vibranti per il tema dark
  const activeColor = v.includes('testa') ? 'fill-sky-400' : 
                     v.includes('cuore') ? 'fill-emerald-400' : 
                     (v.includes('fondo') || v.includes('base')) ? 'fill-amber-500' : 
                     'fill-slate-600';

  return (
    <svg viewBox="0 0 100 100" className="w-5 h-5 flex-shrink-0 drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]">
      {/* Sfondo piramide */}
      <path d="M50 5 L95 90 L5 90 Z" className="fill-slate-800/50" stroke="#334155" strokeWidth="2" />
      
      {/* Segmento TESTA */}
      <path d="M50 5 L65 33 L35 33 Z" className={v.includes('testa') ? 'fill-sky-400' : 'fill-slate-700/30'} />
      
      {/* Segmento CUORE */}
      <path d="M35 33 L65 33 L78 60 L22 60 Z" className={v.includes('cuore') ? 'fill-emerald-400' : 'fill-slate-700/30'} />
      
      {/* Segmento FONDO */}
      <path d="M22 60 L78 60 L95 90 L5 90 Z" className={(v.includes('fondo') || v.includes('base')) ? 'fill-amber-500' : 'fill-slate-700/30'} />
    </svg>
  );
};

export default OlfactivePyramidIcon;