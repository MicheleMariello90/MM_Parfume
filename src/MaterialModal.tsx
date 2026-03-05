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

  // --- STATI LOCALI PER VELOCIZZARE LA DIGITAZIONE ---
  const [localName, setLocalName] = useState(materialName); // <--- AGGIUNTO PER IL NOME
  const [localDiary, setLocalDiary] = useState(data.PersonalDiary || '');
  const [localNotes, setLocalNotes] = useState(data.Notes || '');

  // Sincronizza lo stato locale se i dati esterni cambiano (es. cambio materiale)
  useEffect(() => {
    setLocalName(materialName);
    setLocalDiary(data.PersonalDiary || '');
    setLocalNotes(data.Notes || '');
  }, [materialName, data.PersonalDiary, data.Notes]);

  // FUNZIONE PER RINOMINARE SOLO ALLA FINE
  const handleFinalRename = () => {
    const finalName = localName.toUpperCase().trim();
    if (!finalName || finalName === materialName) return;

    setMaterialsDB((prev: any) => {
      if (prev[finalName]) {
        alert("Questo nome esiste già!");
        setLocalName(materialName);
        return prev;
      }
      const updatedDB = { ...prev };
      updatedDB[finalName] = { ...updatedDB[materialName] };
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
      <div className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-md flex items-center justify-center p-6 text-slate-200">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden relative">
          
          {/* HEADER MODALE */}
          <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                {!isEditing ? (
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{materialName}</h2>
                ) : (
                  <input
                    type="text"
                    className="text-3xl font-black text-blue-400 uppercase tracking-tighter bg-white/5 border-b-2 border-blue-500 outline-none px-2 rounded-t-lg w-full max-w-xl transition-all"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value.toUpperCase())}
                    onBlur={handleFinalRename} // <--- RINOMINA SOLO QUANDO ESCI DALL'INPUT
                    onKeyDown={(e) => e.key === 'Enter' && handleFinalRename()}
                  />
                )}
                <button 
                  onClick={() => setShowPersonalNotes(true)}
                  className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-4 py-2 rounded-xl border border-amber-500/20 transition-all group relative"
                >
                  <BookOpen size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{isEditing ? 'Edita Note' : 'Note'}</span>
                  {data.PersonalDiary && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_10px_#f59e0b] animate-pulse"></span>}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
              >
                {isEditing ? 'Salva' : 'Modifica'}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* COLONNA SINISTRA: DATI TECNICI */}
            <div className="space-y-6 flex flex-col">
              <div className="grid grid-cols-2 gap-4">
                <EditableField label="CAS Number" value={data.CAS || ''} isReadOnly={!isEditing} onSave={(val:any) => onUpdate('CAS', val)} />
                <EditableField label="Costo al g (€)" value={data.CostPerGram || 0} type="number" step="0.01" colorClass="text-emerald-400" isReadOnly={!isEditing} onSave={(val:any) => onUpdate('CostPerGram', val)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <EditableField label="BP (°C)" value={data.BP || 0} type="number" colorClass="text-blue-300" isReadOnly={!isEditing} onSave={(val:any) => onUpdate('BP', val)} />
                <EditableField label="VP" value={data.VP || ''} colorClass="text-purple-300" isReadOnly={!isEditing} onSave={(val:any) => onUpdate('VP', val)} />
                <EditableField label="Impact" value={data.Impact || 0} type="number" colorClass="text-orange-400 font-black" isReadOnly={!isEditing} onSave={(val:any) => onUpdate('Impact', val)} />
              </div>

              <div className={`bg-slate-950/50 p-6 rounded-[2rem] border ${isEditing ? 'border-slate-700 shadow-inner' : 'border-slate-800'} transition-all`}>
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-800 pb-2 text-center">Regulatory Limits</h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <EditableField label="Min %" value={data.MinUsage || 0} type="number" colorClass="text-blue-400 text-lg font-black" isReadOnly={!isEditing} onSave={(val:any) => onUpdate('MinUsage', val)} />
                  <EditableField label="Avg %" value={data.AverageUsage || 0} type="number" colorClass="text-emerald-400 text-lg font-black" isReadOnly={!isEditing} onSave={(val:any) => onUpdate('AverageUsage', val)} />
                  <EditableField label="Max %" value={data.MaxUsage || 0} type="number" colorClass="text-orange-400 text-lg font-black" isReadOnly={!isEditing} onSave={(val:any) => onUpdate('MaxUsage', val)} />
                  <EditableField label="IFRA %" value={data.IFRA || 100} type="number" colorClass={`${data.IFRA < 100 ? 'text-red-500' : 'text-slate-400'} text-lg font-black`} isReadOnly={!isEditing} onSave={(val:any) => onUpdate('IFRA', val)} />
                </div>
              </div>
            </div> 

            {/* COLONNA DESTRA: DESCRIZIONE E FAMIGLIE */}
            <div className="flex flex-col h-full space-y-8">
              <div className={`bg-slate-950/30 rounded-[2.5rem] border ${isEditing ? 'border-slate-700' : 'border-slate-800'} p-8 relative flex gap-6 items-start transition-all`}>
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-16 h-16 relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg overflow-visible">
                      <path d="M24 65 L76 65 L90 95 L10 95 Z" onClick={() => isEditing && toggleVolatility("Fondo")} className={`transition-all duration-300 ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${isBase ? 'fill-amber-600' : 'fill-slate-800/40'}`} />
                      <path d="M37 35 L63 35 L76 65 L24 65 Z" onClick={() => isEditing && toggleVolatility("Cuore")} className={`transition-all duration-300 ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${isHeart ? 'fill-emerald-500' : 'fill-slate-800/40'}`} />
                      <path d="M50 5 L63 35 L37 35 Z" onClick={() => isEditing && toggleVolatility("Testa")} className={`transition-all duration-300 ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${isTop ? 'fill-blue-500' : 'fill-slate-800/40'}`} />
                    </svg>
                  </div>
                  <span className="text-[7px] font-black text-blue-400 uppercase mt-2 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{data.Volatility || 'N/A'}</span>
                </div>
                <div className="flex-1 border-l border-slate-800/50 pl-6">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Descrizione olfattiva</h4>
                  <textarea
                    className={`w-full bg-transparent text-slate-200 text-xs font-medium leading-relaxed resize-none outline-none ${isEditing ? 'border-b border-blue-500/30' : ''}`}
                    value={localNotes}
                    readOnly={!isEditing}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    onBlur={() => isEditing && onUpdate('Notes', localNotes)}
                    placeholder="Aggiungi descrizione..."
                    rows={4}
                  />
                </div>
              </div>

              <div className={`bg-slate-950/30 rounded-[2.5rem] border ${isEditing ? 'border-slate-700' : 'border-slate-800'} p-8 transition-all`}>
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Olfactive Families (Weight)</h4>
                  {isEditing && <button onClick={() => setShowFamilyGrid(true)} className="text-[9px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 font-bold transition-all">+ GESTISCI</button>}
                </div>
                <div className="space-y-5">
                  {data.Families && Object.entries(data.Families).map(([fam, val]) => {
                    const famColor = (FAMILY_COLORS as any)[fam] || '#475569';
                    const dots = Math.round((val as number) / 10);
                    return (
                      <div key={fam} className="group">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: famColor }}></div>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">{fam}</span>
                          </div>
                          {isEditing && <button onClick={() => {
                            const newFamilies = { ...data.Families };
                            delete newFamilies[fam];
                            onUpdate('Families', newFamilies);
                          }} className="text-[8px] text-slate-600 hover:text-red-500 font-bold uppercase transition-colors">Rimuovi</button>}
                        </div>
                        <div className="flex gap-1.5">
                          {[...Array(10)].map((_, i) => (
                            <button key={i} onClick={() => isEditing && updateFamilyValue(fam, (i + 1) * 10)} disabled={!isEditing} className={`w-4 h-4 rounded-full border transition-all ${!isEditing ? 'cursor-default' : 'hover:scale-110'} ${i < dots ? 'border-transparent' : 'border-slate-800 bg-slate-900/30'}`} style={{ backgroundColor: i < dots ? famColor : 'transparent' }} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* OVERLAY SELEZIONE FAMIGLIE GRANDE */}
          {showFamilyGrid && isEditing && (
            <div className="absolute inset-0 z-[200] bg-[#020617]/98 backdrop-blur-xl flex flex-col p-12">
              <div className="max-w-6xl mx-auto w-full h-full flex flex-col">
                <div className="flex justify-between items-center mb-12">
                  <h3 className="text-4xl font-black text-white uppercase tracking-tighter text-blue-500">Database Famiglie Olfattive</h3>
                  <button onClick={() => setShowFamilyGrid(false)} className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-full"><X size={32} /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto py-4 custom-scrollbar">
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
                      }} className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${isSelected ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}`}>
                        <div className="w-12 h-12 rounded-full" style={{ backgroundColor: color }}></div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{name}</span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setShowFamilyGrid(false)} className="mt-12 mx-auto bg-blue-600 hover:bg-blue-500 text-white font-black px-12 py-4 rounded-2xl uppercase tracking-widest transition-all">Chiudi e Salva</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OVERLAY DIARIO / NOTE PERSONALI */}
      {showPersonalNotes && (
        <div className="fixed inset-0 z-[300] bg-[#020617]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                  <BookOpen className="text-amber-500" size={20} />
                  {isEditing ? 'Modifica Note' : 'Visualizzazione Note'}
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{localName}</p>
              </div>
              <button onClick={() => setShowPersonalNotes(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 flex-1">
              <textarea
                className={`w-full h-64 bg-slate-950/50 border rounded-2xl p-6 text-slate-200 transition-all resize-none custom-scrollbar font-medium leading-relaxed ${isEditing ? 'border-amber-500/50 focus:border-amber-500 outline-none' : 'border-slate-800 cursor-default'}`}
                placeholder={isEditing ? "Scrivi qui le tue impressioni..." : "Nessuna nota presente."}
                value={localDiary}
                onChange={(e) => setLocalDiary(e.target.value)}
                onBlur={() => isEditing && onUpdate('PersonalDiary', localDiary)}
                readOnly={!isEditing}
              />
            </div>
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button onClick={() => setShowPersonalNotes(false)} className="bg-slate-800 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                {isEditing ? 'Conferma e Torna' : 'Chiudi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MaterialModal;