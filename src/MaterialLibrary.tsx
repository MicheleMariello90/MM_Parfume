import React, { useState, useMemo } from 'react';
import { Trash2, ChevronDown, Filter, Plus } from 'lucide-react';
import OlfactivePyramidIcon from './OlfactivePyramidIcon';

interface MaterialLibraryProps {
  materialsDB: any;
  searchTerm: string;
  onSelectMaterial: (name: string) => void;
  onDeleteMaterial: (id: number, e: React.MouseEvent) => void;
  onAddMaterial: () => void; // Funzione per aprire il modale di aggiunta
  familyColors: any;
}

const MaterialLibrary = React.memo(({ 
  materialsDB, 
  searchTerm, 
  onSelectMaterial, 
  onDeleteMaterial,
  onAddMaterial,
  familyColors 
}: MaterialLibraryProps) => {
  
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 1. CALCOLO DEL TOTALE REALE (Gestisce sia Array che Oggetto)
  const totalInDB = useMemo(() => {
    if (!materialsDB) return 0;
    if (Array.isArray(materialsDB)) return materialsDB.length;
    return Object.keys(materialsDB).length;
  }, [materialsDB]);

  // 2. LOGICA DI FILTRAGGIO E RICERCA
  const filtered = useMemo(() => {
    if (!materialsDB) return [];
    
    const materialsArray = Array.isArray(materialsDB) 
      ? materialsDB 
      : Object.entries(materialsDB).map(([name, data]: [string, any]) => ({ ...data, name }));

    return materialsArray
      .filter((mat) => {
        const matchesSearch = mat.name && mat.name.toLowerCase().includes((searchTerm || "").toLowerCase());
        
        let matchesFamily = true;
        if (selectedFamily) {
          let familiesObj = {};
          try {
            familiesObj = typeof mat.families === 'string' 
              ? JSON.parse(mat.families) 
              : (mat.families || mat.Families || {});
          } catch (e) {
            familiesObj = {};
          }
          matchesFamily = Object.keys(familiesObj).includes(selectedFamily);
        }

        return matchesSearch && matchesFamily;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [materialsDB, searchTerm, selectedFamily]);

  return (
    <div className="space-y-6">
      
      {/* HEADER: FILTRO | RISULTATI | AGGIUNGI */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-[2rem] border border-slate-800/50 mb-8">
        
        {/* Sinistra: Menu Filtro */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 bg-slate-950 border border-slate-700 px-5 py-2.5 rounded-2xl hover:border-blue-500/50 transition-all group"
            >
              <Filter size={14} className={selectedFamily ? "text-blue-400" : "text-slate-500"} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                {selectedFamily || "Filtra Famiglia"}
              </span>
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-40 py-2 overflow-hidden">
                  <button
                    onClick={() => { setSelectedFamily(null); setIsDropdownOpen(false); }}
                    className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 border-b border-slate-800"
                  >
                    Tutte le materie
                  </button>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {Object.keys(familyColors).map((f) => (
                      <button
                        key={f}
                        onClick={() => { setSelectedFamily(f); setIsDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors group"
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: familyColors[f] }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-white">{f}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          {selectedFamily && (
            <button onClick={() => setSelectedFamily(null)} className="text-[9px] font-black uppercase text-blue-500 underline underline-offset-4">
              Reset
            </button>
          )}
        </div>

        {/* Centro: Contatore Risultati */}
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 bg-black/40 px-6 py-2 rounded-full border border-slate-800">
           Materie Prime: <span className="text-white">{filtered.length}</span> / <span className="text-blue-500">{totalInDB}</span>
        </div>

        {/* Destra: Tasto Aggiungi */}
        <button 
          onClick={onAddMaterial}
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 group w-full lg:w-auto justify-center"
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[10px] font-black uppercase tracking-widest">Aggiungi Materiale</span>
        </button>
      </div>

      {/* GRIGLIA CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((data: any) => {
          let familiesObj = {};
          try {
            familiesObj = typeof data.families === 'string' 
              ? JSON.parse(data.families) 
              : (data.families || data.Families || {});
          } catch (e) { familiesObj = {}; }

          return (
            <div 
              key={data.id || data.name} 
              onClick={() => onSelectMaterial(data.name)} 
              className="relative bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/80 transition-all group overflow-hidden"
            >
              {/* Tasto Elimina */}
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteMaterial(data.id, e); }}
                className="absolute top-6 right-6 p-2 text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-20 bg-slate-950/50 rounded-lg border border-slate-800"
              >
                <Trash2 size={14} />
              </button>

              {/* Titolo e Piramide */}
              <div className="flex justify-between items-start mb-4">
                <h4 title={data.name} className="font-black text-lg text-white uppercase leading-tight line-clamp-2 pr-2 group-hover:text-blue-400 transition-colors h-[3.5rem] flex items-center">
                  {data.name}
                </h4>
                <div title={data.volatility || 'N/A'}>
                  <OlfactivePyramidIcon volatility={data.volatility || data.Volatility || ''} />
                </div>
              </div>         
              
              {/* Descrizione */}
              <p className="text-[11px] text-slate-500 mb-6 italic line-clamp-2 leading-relaxed h-[2.5rem]">
                {data.notes || data.Notes || data.description || 'Nessuna descrizione.'}
              </p>       
              
              {/* Tag Famiglie con contrasto intelligente */}
              <div className="flex flex-wrap gap-2">
                {Object.keys(familiesObj).map(f => {
                  const lightFamilies = [
                    "AGRUMATO", "CREMOSO", "FRESCO", "SALATO", "GOURMAND", "MIELATO", "VANIGLIATO", "TALCATO", "MUSCHIATO", "LATTONICO", "OZONICO", "FLOREALE BIANCO"
                  ];
                  const isLightColor = lightFamilies.includes(f.toUpperCase().trim());

                  return (
                    <span 
                      key={f} 
                      className={`text-[7px] px-3 py-1 rounded-full font-black uppercase tracking-tighter ${
                        isLightColor ? 'text-black' : 'text-white'
                      }`} 
                      style={{ backgroundColor: familyColors[f] || '#475569' }}
                    >
                      {f}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-30">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Nessuna materia prima trovata</p>
        </div>
      )}
    </div>
  );
});

export default MaterialLibrary;