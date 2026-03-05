import React from 'react';
import { Search, X } from 'lucide-react';

interface FormulaArchiveProps {
  history: any[];
  searchTerm: string;
  deleteFromHistory: (id: string, e: React.MouseEvent) => void;
  loadFromHistory: (formula: any) => void;
}

const FormulaArchive: React.FC<FormulaArchiveProps> = ({ 
  history, 
  searchTerm, 
  deleteFromHistory, 
  loadFromHistory 
}) => {
  const groupedFormulas = React.useMemo(() => {
    if (!history) return {};
    // Specifichiamo che l'accumulatore contiene array di 'any'
    return history.reduce((acc: Record<string, any[]>, f: any) => {
      const categoryName = (f.tag || 'GENERALE').trim().toUpperCase();
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(f);
      return acc;
    }, {} as Record<string, any[]>);
  }, [history]);

  if (!history || history.length === 0) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-30">
        <Search size={48} className="mx-auto mb-4 text-slate-700" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Nessuna formula nell'archivio</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {Object.entries(groupedFormulas)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, formulas]) => {
          // Specifichiamo che 'formulas' è un array di oggetti
          const formulaList = formulas as any[];
          const filtered = formulaList.filter((f: any) => 
            f.name.toLowerCase().includes(searchTerm.toLowerCase())
          );

          if (filtered.length === 0 && searchTerm !== "") return null;

          return (
            <div key={category} className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <div className="h-px w-8 bg-blue-500/40"></div>
                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] flex items-center gap-3">
                  📂 {category}
                </h3>
                <div className="h-px flex-1 bg-slate-800/50"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((h: any) => (
                  <div key={h.id} className="bg-slate-900/60 border border-slate-800 p-8 rounded-[2.5rem] hover:border-blue-500/40 transition-all group relative overflow-hidden">
                    <button 
                      onClick={(e) => deleteFromHistory(h.id, e)}
                      className="absolute top-6 right-6 text-slate-600 hover:text-red-500 transition-colors p-2 z-10"
                    >
                      <X size={16} />
                    </button>
                    
                    <div className="mb-8">
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight group-hover:text-blue-400 transition-colors">
                        {h.name}
                      </h3>
                      <p className="text-slate-500 font-mono text-[9px] mt-2 uppercase tracking-widest">{h.date}</p>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        {h.ingredients?.length || 0} Materie
                      </span>
                      <button 
                        onClick={() => loadFromHistory(h)}
                        className="bg-white text-black text-[9px] font-black uppercase px-6 py-3 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-xl"
                      >
                        Carica
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default FormulaArchive;