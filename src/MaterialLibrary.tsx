import React from 'react';
import { Trash2 } from 'lucide-react';

interface MaterialLibraryProps {
  materialsDB: any; // Manteniamo any per flessibilità, ma punteremo all'ID
  searchTerm: string;
  onSelectMaterial: (name: string) => void;
  onDeleteMaterial: (id: number, e: React.MouseEvent) => void; // Cambiato da name a id
  familyColors: any;
}

const MaterialLibrary = React.memo(({ 
  materialsDB, 
  searchTerm, 
  onSelectMaterial, 
  onDeleteMaterial,
  familyColors 
}: MaterialLibraryProps) => {
  
  const filtered = React.useMemo(() => {
    if (!materialsDB) return [];
    
    // Se materialsDB è un oggetto (vecchio formato), lo convertiamo in array
    const materialsArray = Array.isArray(materialsDB) 
      ? materialsDB 
      : Object.entries(materialsDB).map(([name, data]: [string, any]) => ({ ...data, name }));

    return materialsArray
      .filter((mat) => 
        mat.name && mat.name.toLowerCase().includes((searchTerm || "").toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [materialsDB, searchTerm]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filtered.map((data: any) => {
        // Gestione flessibile del JSON famiglie (Supabase lo manda come stringa o oggetto)
        let familiesObj = {};
        try {
          familiesObj = typeof data.families === 'string' 
            ? JSON.parse(data.families) 
            : (data.families || data.Families || {});
        } catch (e) {
          familiesObj = {};
        }

        return (
          <div 
            key={data.id || data.name} 
            onClick={() => onSelectMaterial(data.name)} 
            className="relative bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/80 transition-all group overflow-hidden"
          >
            {/* Tasto Cancella: usa data.id */}
            <button 
              onClick={(e) => {
                e.stopPropagation(); // BLOCCA l'apertura della scheda
                onDeleteMaterial(data.id, e);
              }}
              className="absolute top-6 right-6 p-2 text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-20 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-red-500/50"
            >
              <Trash2 size={14} />
            </button>

            <div className="flex justify-between items-start mb-4">
              <h4 className="font-black text-xl text-white uppercase truncate pr-8 group-hover:text-blue-400 transition-colors">
                {data.name}
              </h4>
              <span className="text-[8px] px-3 py-1 rounded-full font-black bg-slate-800 text-slate-400 uppercase tracking-widest border border-slate-700">
                {data.volatility || data.Volatility || 'N/A'}
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 mb-6 italic line-clamp-2 leading-relaxed">
              {data.notes || data.Notes || data.description || 'Nessuna descrizione.'}
            </p>
            
            <div className="flex flex-wrap gap-2">
              {Object.keys(familiesObj).map(f => (
                <span 
                  key={f} 
                  className="text-[7px] px-3 py-1 rounded-full font-black text-white uppercase tracking-tighter" 
                  style={{ backgroundColor: familyColors[f] || '#475569' }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default MaterialLibrary;