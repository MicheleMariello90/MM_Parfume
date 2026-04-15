import React, { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import { FAMILY_COLORS } from './constants';

interface MaterialModalProps {
  materialName: string;
  data: any;
  onClose: () => void;
  onUpdate: (field: string, value: any) => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  setMaterialsDB: any;
  setSelectedMaterialInfo: any;
  updateFamilyValue: (fam: string, val: number) => void;
  toggleVolatility: (vol: string) => void;
  EditableField: any; 
  DescriptionEditor: any;
}

const MaterialModal = ({ 
  materialName, data, onClose, onUpdate, isEditing, setIsEditing, 
  setMaterialsDB, setSelectedMaterialInfo, updateFamilyValue, toggleVolatility,
  EditableField, DescriptionEditor 
}: MaterialModalProps) => {
  
  const [showFamilyGrid, setShowFamilyGrid] = useState(false);
  const [showPersonalNotes, setShowPersonalNotes] = useState(false);

  const [localName, setLocalName] = useState(materialName);
  const [localDiary, setLocalDiary] = useState(data.PersonalDiary || '');
  const [localNotes, setLocalNotes] = useState(data.Notes || '');

  useEffect(() => {
    setLocalName(materialName);
    setLocalDiary(data.PersonalDiary || '');
    setLocalNotes(data.Notes || '');
  }, [materialName, data.PersonalDiary, data.Notes]);

  const handleFinalRename = () => {
    const finalName = localName.toUpperCase().trim();
    if (!finalName || finalName === materialName) return;
    
    onUpdate('name', finalName);

    setMaterialsDB((prev: any) => {
      if (prev[finalName]) {
        alert("Questo nome esiste già!");
        setLocalName(materialName);
        return prev;
      }
      const updatedDB = { ...prev };
      updatedDB[finalName] = { ...updatedDB[materialName], name: finalName }; 
      delete updatedDB[materialName]; 
      return updatedDB;
    });
    
    setSelectedMaterialInfo(finalName);
  };

  const currentVolatility = data.Volatility || "";
  const isTop = currentVolatility.includes("Testa");
  const isHeart = currentVolatility.includes("Cuore");
  const isBase = currentVolatility.includes("Fondo");

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 text-slate-200">
        
        <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[92vh]">
          
          <div className="p-4 sm:p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex-1 min-w-0"> 
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                {!isEditing ? (
                  <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter truncate">{materialName}</h2>
                ) : (
                  <input
                    type="text"
                    className="text-xl sm:text-3xl font-black text-blue-400 uppercase tracking-tighter bg-white/5 border-b-2 border-blue-500 outline-none px-2 rounded-t-lg w-full max-w-xl transition-all"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value.toUpperCase())}
                    onBlur={handleFinalRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleFinalRename()}
                  />
                )}
                <button 
                  onClick={() => setShowPersonalNotes(true)}
                  className="flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-amber-500/20 transition-all w-fit"
                >
                  <BookOpen size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Note</span>
                  {data.PersonalDiary && <span className="w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_8px_#f59e0b]"></span>}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 sm:px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}
              >
                {isEditing ? 'OK' : 'MOD'}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              
              {/* COLONNA SINISTRA */}
              <div className="space-y-6">
                
                {/* 1. GRIGLIA DATI TECNICI & LINK FORNITORE */}
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
  <EditableField 
    label="CAS" 
    value={data.cas || ''} 
    type="text" 
    colorClass="text-yellow-300 font-mono text-[10px] tracking-tighter" 
    isReadOnly={!isEditing} 
    onSave={(val: any) => onUpdate('cas', val)} 
  />
  <EditableField 
    label="BP (°C)" 
    value={data.BP || 0} 
    type="number" 
    colorClass="text-blue-300 text-[11px] font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
    isReadOnly={!isEditing} 
    onSave={(val: any) => onUpdate('BP', val)} 
  />
  <EditableField 
    label="VP" 
    value={data.VP || ''} 
    colorClass="text-purple-300 text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
    isReadOnly={!isEditing} 
    onSave={(val: any) => onUpdate('VP', val)} 
  />
  
  <EditableField 
    label="COSTO (€/g)" 
    value={data.cost_per_gram || 0} 
    type="number" 
    colorClass="text-emerald-400 font-black text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
    isReadOnly={!isEditing} 
    onSave={(val: any) => onUpdate('cost_per_gram', parseFloat(val))} 
  />

                  <div className={`sm:col-span-2 p-3 rounded-xl border transition-all flex flex-col justify-center overflow-hidden ${isEditing ? 'border-blue-500/30 bg-blue-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Link Fornitore</label>
                    {isEditing ? (
                      <input 
                        type="text"
                        placeholder="Es. https://perfumiarz.com/..."
                        className="bg-transparent text-blue-400 text-[11px] outline-none border-b border-slate-700 focus:border-blue-500 pb-1 w-full"
                        value={data.supplier_url || ''}
                        onChange={(e) => onUpdate('supplier_url', e.target.value)}
                      />
                    ) : (
                      data.supplier_url ? (
                        <a 
                          href={data.supplier_url.startsWith('http') ? data.supplier_url : `https://${data.supplier_url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors group w-fit"
                        >
                          <span className="text-sm font-bold truncate max-w-[180px]">
                            {(() => {
                              try {
                                return new URL(data.supplier_url.startsWith('http') ? data.supplier_url : `https://${data.supplier_url}`).hostname.replace('www.', '');
                              } catch {
                                return "Apri Link";
                              }
                            })()}
                          </span>
                          <svg className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-600 italic">Nessun link inserito</span>
                      )
                    )}
                  </div>
                </div>

                {/* BARRA IMPACT ACCATTIVANTE - NO SPINNER & FONT PULITO */}
  <div className={`p-4 rounded-[1.5rem] border transition-all ${isEditing ? 'border-sky-500/20 bg-sky-500/5' : 'border-slate-800 bg-slate-950/40'}`}>
    <div className="flex justify-between items-end mb-3">
      <div>
        <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1">Potenza Olfattiva</label>
        <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors duration-300 ${
          (data.impact || 0) <= 3 ? 'text-white-400' : 
          (data.impact || 0) <= 6 ? 'text-white-400' : 
          (data.impact || 0) <= 9 ? 'text-white-500' :
          (data.impact || 0) <= 50? 'text-white-500' : 'text-red-500 animate-pulse'
        }`}>
          {(data.impact || 0) <= 3 ? 'Debole' : 
           (data.impact || 0) <= 6 ? 'Normale' : 
           (data.impact || 0) <= 9 ? 'Forte' : 
           (data.impact || 0) <= 50 ? 'Forte' : 'Enorme'}
        </span>
      </div>
      
      <div className="flex items-baseline gap-1">
        {isEditing ? (
          <input 
            type="number"
            min="0"
            max="20"
            /* Rimuove lo 0 iniziale quando vuoi digitare */
            value={data.impact === 0 ? '' : data.impact}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : Number(e.target.value);
              onUpdate('impact', val);
            }}
            /* Classi per eliminare lo spinner: [appearance:textfield] e i selettori webkit */
            className="bg-transparent text-white font-sans text-2xl w-12 outline-none text-right border-b border-slate-700 focus:border-sky-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="-"
          />
        ) : (
          <span className="text-white font-sans text-2xl">{(data.impact || 0)}</span>
        )}
        <span className="text-slate-600 text-[9px] font-black uppercase tracking-widest ml-1"></span>
      </div>
    </div>

    {/* Barra con Gradiente Sfumato */}
    <div className="relative h-2 w-full bg-slate-800/40 rounded-full overflow-hidden">
      <div 
        className="absolute inset-0 h-full rounded-full transition-all duration-300 ease-out"
        style={{ 
          width: `${Math.min(100, (data.impact || 0) * 10)}%`,
          background: 'linear-gradient(90deg, #38bdf8 0%, #facc15 35%, #f97316 70%, #ef4444 100%)',
          boxShadow: (data.impact || 0) > 0 ? `0 0 15px ${(data.impact || 0) <= 3 ? '#38bdf840' : (data.impact || 0) <= 6 ? '#facc1540' : (data.impact || 0) <= 9 ? '#f9731640' : '#ef444450'}` : 'none'
        }}
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent opacity-50"></div>
      </div>
    </div>
  </div>

                {/* 3. REGULATORY LIMITS */}
<div className={`bg-slate-950/50 p-4 rounded-[1.5rem] border ${isEditing ? 'border-slate-700' : 'border-slate-800'}`}>
  <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 border-b border-slate-800/50 pb-2 text-center">
    Regulatory Limits
  </h4>
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
    <EditableField 
      label="Min %" 
      value={data.MinUsage || 0} 
      type="number" 
      colorClass="text-blue-400 text-[11px] font-bold tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
      isReadOnly={!isEditing} 
      onSave={(val: any) => onUpdate('MinUsage', val)} 
    />
    <EditableField 
      label="Avg %" 
      value={data.AvgUsage || 0} 
      type="number" 
      colorClass="text-emerald-400 text-[11px] font-bold tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
      isReadOnly={!isEditing} 
      onSave={(val: any) => onUpdate('AvgUsage', val)} 
    />
    <EditableField 
      label="Max %" 
      value={data.MaxUsage || 0} 
      type="number" 
      colorClass="text-orange-400 text-[11px] font-bold tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
      isReadOnly={!isEditing} 
      onSave={(val: any) => onUpdate('MaxUsage', val)} 
    />
    <EditableField 
      label="IFRA %" 
      value={data.IFRA || 100} 
      type="number" 
      colorClass="text-slate-400 text-[11px] font-bold tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
      isReadOnly={!isEditing} 
      onSave={(val: any) => onUpdate('IFRA', val)} 
    />
  </div>
</div>
                {/* 4. NATURA DELLA MATERIA E ALLERGENI */}
                <div className={`mt-6 p-4 sm:p-6 rounded-[1.5rem] border transition-all ${isEditing ? 'border-blue-500/30 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-slate-800 bg-slate-950/50'}`}>
                  
                  <div className="mb-6">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">
                      Natura della Materia
                    </label>
                    {!isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${data.type === 'Naturale' ? 'bg-emerald-500' : data.type === 'Solvente' ? 'bg-slate-500' : 'bg-blue-500'}`}></span>
                        <span className="text-sm font-bold text-white uppercase tracking-wider">
                          {data.type || 'Aroma Chemical'}
                        </span>
                      </div>
                    ) : (
                      <select 
                        value={data.type || 'Aroma Chemical'}
                        onChange={(e) => onUpdate('type', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500 transition-all cursor-pointer hover:border-slate-600"
                      >
                        <option value="Aroma Chemical">Aroma Chemical</option>
                        <option value="Naturale">Naturale</option>
                        <option value="Solvente">Solvente</option>
                      </select>
                    )}
                  </div>

                  {data.type !== 'Solvente' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                          Composizione / Allergeni
                        </label>
                        {isEditing && (
                          <button 
                            onClick={() => {
                              const currentComp = data.composition || {};
                              onUpdate('composition', { ...currentComp, "": 0 });
                            }}
                            className="text-[9px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 font-black hover:bg-blue-500/40 transition-all uppercase tracking-tighter"
                          >
                            + Aggiungi Molecola
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(data.composition || {}).map(([name, value], idx) => (
  <div key={idx} className="flex gap-4 items-center justify-between animate-in fade-in slide-in-from-left-2 duration-200 p-1">
    {/* NOME MOLECOLA: flex-1 lo fa allungare al massimo */}
    <input 
      disabled={!isEditing}
      placeholder="Es. Linalool"
      value={name}
      onChange={(e) => {
        const newComp = { ...data.composition };
        const oldValue = newComp[name];
        delete newComp[name];
        newComp[e.target.value.toUpperCase()] = oldValue;
        onUpdate('composition', newComp);
      }}
      className="flex-1 bg-slate-900/50 border border-slate-800 rounded-lg p-2 text-[11px] text-blue-400 font-bold outline-none focus:border-blue-500/50 disabled:bg-transparent disabled:border-transparent tracking-wide"
    />

    <div className="flex items-center gap-2">
      <div className="relative">
        <input 
          disabled={!isEditing}
          type="number"
          placeholder="0"
          value={value as number}
          onChange={(e) => {
            const newComp = { ...data.composition };
            newComp[name] = Number(e.target.value);
            onUpdate('composition', newComp);
          }}
          className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-[11px] text-blue-400 font-mono text-center outline-none focus:border-blue-500/50 disabled:bg-transparent disabled:border-transparent"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-bold">%</span>
      </div>

      {isEditing && (
        <button 
          onClick={() => {
            const newComp = { ...data.composition };
            delete newComp[name];
            onUpdate('composition', newComp);
          }}
          className="p-2 text-slate-600 hover:text-red-500 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  </div>
))}                 
                        {(!data.composition || Object.keys(data.composition).length === 0) && (
                          <div className="py-4 text-center border-2 border-dashed border-slate-800/50 rounded-2xl">
                            <p className="text-[10px] text-slate-600 italic uppercase font-medium tracking-widest">
                              Nessun allergene dichiarato
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* COLONNA DESTRA: DESCRIZIONE E FAMIGLIE */}
              <div className="space-y-6">
                <div className={`bg-slate-950/30 rounded-[1.5rem] sm:rounded-[2.5rem] border ${isEditing ? 'border-slate-700' : 'border-slate-800'} p-4 sm:p-8 flex flex-col sm:flex-row gap-6 items-start`}>
                  <div className="shrink-0 flex flex-row sm:flex-col items-center gap-4 sm:gap-0 mx-auto sm:mx-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20">
                      {/* --- PIRAMIDE SVG --- */}
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg overflow-visible">
                        <path 
                          d="M24 65 L76 65 L90 95 L10 95 Z" 
                          onClick={() => {
                            if (isEditing) {
                              toggleVolatility("Fondo");
                              const newVol = isBase ? currentVolatility.replace("Fondo", "").trim() : (currentVolatility + " Fondo").trim();
                              onUpdate('Volatility', newVol);
                            }
                          }} 
                          className={`transition-all duration-300 ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${isBase ? 'fill-amber-600' : 'fill-slate-800/40'}`} 
                        />
                        <path 
                          d="M37 35 L63 35 L76 65 L24 65 Z" 
                          onClick={() => {
                            if (isEditing) {
                              toggleVolatility("Cuore");
                              const newVol = isHeart ? currentVolatility.replace("Cuore", "").trim() : (currentVolatility + " Cuore").trim();
                              onUpdate('Volatility', newVol);
                            }
                          }} 
                          className={`transition-all duration-300 ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${isHeart ? 'fill-emerald-500' : 'fill-slate-800/40'}`} 
                        />
                        <path 
                          d="M50 5 L63 35 L37 35 Z" 
                          onClick={() => {
                            if (isEditing) {
                              toggleVolatility("Testa");
                              const newVol = isTop ? currentVolatility.replace("Testa", "").trim() : (currentVolatility + " Testa").trim();
                              onUpdate('Volatility', newVol);
                            }
                          }} 
                          className={`transition-all duration-300 ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${isTop ? 'fill-blue-500' : 'fill-slate-800/40'}`} 
                        />
                      </svg>
                    </div>
                    <span className="text-[8px] font-black text-blue-400 uppercase bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 sm:mt-2">{data.Volatility || 'N/A'}</span>
                  </div>
                  <div className="flex-1 w-full border-t sm:border-t-0 sm:border-l border-slate-800/50 pt-4 sm:pt-0 sm:pl-6">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Descrizione olfattiva</h4>
                    <textarea
                      className="w-full bg-transparent text-slate-200 text-sm font-medium leading-relaxed resize-none outline-none"
                      value={localNotes}
                      readOnly={!isEditing}
                      onChange={(e) => setLocalNotes(e.target.value)}
                      onBlur={() => isEditing && onUpdate('Notes', localNotes)}
                      rows={4}
                    />
                  </div>
                </div>

                <div className={`bg-slate-950/30 rounded-[1.5rem] sm:rounded-[2.5rem] border ${isEditing ? 'border-slate-700' : 'border-slate-800'} p-4 sm:p-8`}>
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Olfactive Families</h4>
                    {isEditing && <button onClick={() => setShowFamilyGrid(true)} className="text-[9px] bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 font-bold tracking-widest uppercase">Aggiungi</button>}
                  </div>
                  <div className="space-y-6">
                    {data.Families && Object.entries(data.Families).map(([fam, val]) => {
                      const famColor = (FAMILY_COLORS as any)[fam] || '#475569';
                      const dots = Math.round((val as number) / 10);
                      return (
                        <div key={fam} className="group">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">{fam}</span>
                            {isEditing && <button onClick={() => {
                              const newFamilies = { ...data.Families };
                              delete newFamilies[fam];
                              onUpdate('Families', newFamilies);
                            }} className="text-[8px] text-red-500/60 font-black uppercase">Rimuovi</button>}
                          </div>
                          <div className="flex justify-between sm:justify-start gap-1">
                            {[...Array(10)].map((_, i) => (
                              <button key={i} onClick={() => isEditing && updateFamilyValue(fam, (i + 1) * 10)} disabled={!isEditing} className={`w-6 h-6 sm:w-4 sm:h-4 rounded-full border transition-all ${i < dots ? 'border-transparent' : 'border-slate-800 bg-slate-900/30'}`} style={{ backgroundColor: i < dots ? famColor : 'transparent' }} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OVERLAY DIARIO */}
      {showPersonalNotes && (
        <div className="fixed inset-0 z-[300] bg-[#020617]/95 backdrop-blur-xl flex items-center justify-center p-2">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 sticky top-0">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                <BookOpen className="text-amber-500" size={20} />
                Note Personali
              </h3>
              <button onClick={() => setShowPersonalNotes(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 sm:p-8 flex-1 overflow-y-auto">
              <textarea
                className={`w-full min-h-[300px] sm:h-64 bg-slate-950/50 border rounded-2xl p-6 text-slate-200 transition-all resize-none outline-none ${isEditing ? 'border-amber-500/50' : 'border-slate-800'}`}
                placeholder="Scrivi qui..."
                value={localDiary}
                onChange={(e) => setLocalDiary(e.target.value)}
                onBlur={() => onUpdate('PersonalDiary', localDiary)}
              />
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button onClick={() => setShowPersonalNotes(false)} className="bg-blue-600 text-white w-full sm:w-auto px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* OVERLAY SELEZIONE FAMIGLIE */}
      {showFamilyGrid && isEditing && (
        <div className="fixed inset-0 z-[400] bg-[#020617]/98 backdrop-blur-2xl p-4 flex flex-col">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-blue-500 uppercase tracking-tighter">FAMIGLIE</h3>
              <button onClick={() => setShowFamilyGrid(false)} className="bg-white/5 p-3 rounded-full text-white"><X size={24} /></button>
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 overflow-y-auto flex-1 pb-20">
              {Object.entries(FAMILY_COLORS).map(([name, color]) => {
                const isSelected = data.Families && data.Families[name];
                return (
                  <button key={name} onClick={() => {
                    if (!isSelected) updateFamilyValue(name, 10);
                    else {
                      const newFamilies = { ...data.Families };
                      delete newFamilies[name];
                      onUpdate('Families', newFamilies);
                    }
                  }} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${isSelected ? 'border-blue-500 bg-blue-500/20' : 'border-slate-800 bg-slate-900/40'}`}>
                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: color }}></div>
                    <span className="text-[9px] font-black text-white uppercase">{name}</span>
                  </button>
                );
              })}
           </div>
           <button onClick={() => setShowFamilyGrid(false)} className="fixed bottom-6 left-6 right-6 bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-2xl">Salva e Chiudi</button>
        </div>
      )}
    </>
  );
};
export default MaterialModal;