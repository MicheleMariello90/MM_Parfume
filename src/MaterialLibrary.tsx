import React from 'react';
import { Trash2 } from 'lucide-react';

interface MaterialLibraryProps {
  materialsDB: any;
  searchTerm: string;
  onSelectMaterial: (name: string) => void;
  onDeleteMaterial: (name: string, e: React.MouseEvent) => void;
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
    return Object.entries(materialsDB)
      .filter(([name]) => name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [materialsDB, searchTerm]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filtered.map(([name, data]: [string, any]) => (
        <div 
          key={name} 
          onClick={() => onSelectMaterial(name)} 
          className="relative bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/80 transition-all group overflow-hidden"
        >
          <button 
            onClick={(e) => onDeleteMaterial(name, e)}
            className="absolute top-6 right-6 p-2 text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-10 bg-slate-950/50 rounded-lg"
          >
            <Trash2 size={14} />
          </button>

          <div className="flex justify-between items-start mb-4">
            <h4 className="font-black text-xl text-white uppercase truncate pr-8 group-hover:text-blue-400 transition-colors">{name}</h4>
            <span className="text-[8px] px-3 py-1 rounded-full font-black bg-slate-800 text-slate-400 uppercase tracking-widest border border-slate-700">
              {data.Volatility || 'N/A'}
            </span>
          </div>
          
          <p className="text-[11px] text-slate-500 mb-6 italic line-clamp-2 leading-relaxed">
            {data.Notes || 'Nessuna descrizione disponibile.'}
          </p>
          
          <div className="flex flex-wrap gap-2">
            {Object.keys(data.Families || {}).map(f => (
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
      ))}
    </div>
  );
});

export default MaterialLibrary;