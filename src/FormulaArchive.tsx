import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Table as TableIcon,
  LayoutGrid,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';

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
  loadFromHistory,
}) => {
  // Stato per gestire l'apertura/chiusura delle singole cartelle (chiuse di default)
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  // Modalità di visualizzazione: 'both' (Tabella + Cartelle), 'folders' o 'table'
  const [viewMode, setViewMode] = useState<'both' | 'folders' | 'table'>('both');
  // Filtri locali dedicati alla tabella di ricerca
  const [tableQuery, setTableQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const groupedFormulas = useMemo(() => {
    if (!history) return {};
    return history.reduce((acc: Record<string, any[]>, f: any) => {
      const categoryName = (f.tag || 'GENERALE').trim().toUpperCase();
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(f);
      return acc;
    }, {} as Record<string, any[]>);
  }, [history]);

  const categories = useMemo(
    () => Object.keys(groupedFormulas).sort((a, b) => a.localeCompare(b)),
    [groupedFormulas]
  );

  // Righe filtrate per la tabella di ricerca (combina eventuale searchTerm esterno e filtri tabella)
  const tableFilteredFormulas = useMemo(() => {
    if (!history) return [];
    const activeQuery = (tableQuery || searchTerm || '').trim().toLowerCase();

    return history
      .filter((f: any) => {
        const categoryName = (f.tag || 'GENERALE').trim().toUpperCase();
        const matchesCategory =
          selectedCategory === 'ALL' || categoryName === selectedCategory;

        const matchesQuery =
          !activeQuery ||
          f.name?.toLowerCase().includes(activeQuery) ||
          categoryName.toLowerCase().includes(activeQuery) ||
          (f.date && f.date.toLowerCase().includes(activeQuery));

        return matchesCategory && matchesQuery;
      })
      .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
  }, [history, tableQuery, searchTerm, selectedCategory]);

  const toggleFolder = (category: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const setAllFolders = (isOpen: boolean) => {
    const next: Record<string, boolean> = {};
    categories.forEach((cat) => {
      next[cat] = isOpen;
    });
    setOpenFolders(next);
  };

  if (!history || history.length === 0) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-30">
        <Search size={48} className="mx-auto mb-4 text-slate-700" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Nessuna formula nell'archivio
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* BARRA CONTROLLI: SWITCH VISTA E AZIONI CARTELLE */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 px-6 py-4 rounded-[2rem]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'both'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Tutto ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('folders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'folders'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutGrid size={13} />
            Solo Cartelle
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TableIcon size={13} />
            Solo Tabella
          </button>
        </div>

        {viewMode !== 'table' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAllFolders(true)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 bg-slate-800/80 hover:bg-slate-700 transition-all"
            >
              Espandi tutte
            </button>
            <button
              type="button"
              onClick={() => setAllFolders(false)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 bg-slate-800/80 hover:bg-slate-700 transition-all"
            >
              Comprimi tutte
            </button>
          </div>
        )}
      </div>

      {/* SEZIONE 1: CARTELLE A TENDINA (ACCORDION) */}
      {viewMode !== 'table' && (
        <div className="space-y-4">
          {categories.map((category) => {
            const formulaList = groupedFormulas[category] as any[];
            const filtered = formulaList.filter((f: any) =>
              f.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (filtered.length === 0 && searchTerm !== '') return null;

            // Se c'è una ricerca attiva apre automaticamente la cartella, altrimenti segue lo stato cliccato
            const isOpen =
              searchTerm.trim() !== '' ? true : Boolean(openFolders[category]);

            return (
              <div
                key={category}
                className="bg-slate-900/40 border border-slate-800/90 rounded-[2rem] overflow-hidden transition-all"
              >
                {/* Intestazione cliccabile del menu a tendina */}
                <button
                  type="button"
                  onClick={() => toggleFolder(category)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between px-7 py-5 hover:bg-slate-800/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-blue-500">
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </span>
                    <span className="text-blue-400">
                      {isOpen ? <FolderOpen size={18} /> : <Folder size={18} />}
                    </span>
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">
                      {category}
                    </h3>
                  </div>

                  <span className="px-3.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-black text-blue-400 uppercase tracking-wider">
                    {filtered.length}{' '}
                    {filtered.length === 1 ? 'Formula' : 'Formule'}
                  </span>
                </button>

                {/* Contenuto espandibile della cartella */}
                {isOpen && (
                  <div className="p-6 pt-2 border-t border-slate-800/60">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                      {filtered.map((h: any) => (
                        <div
                          key={h.id}
                          className="bg-slate-900/80 border border-slate-800 p-7 rounded-[2.2rem] hover:border-blue-500/40 transition-all group relative overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={(e) => deleteFromHistory(h.id, e)}
                            title="Elimina formula"
                            className="absolute top-6 right-6 text-slate-600 hover:text-red-500 transition-colors p-2 z-10"
                          >
                            <X size={16} />
                          </button>

                          <div className="mb-8 pr-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-tight group-hover:text-blue-400 transition-colors">
                              {h.name}
                            </h3>
                            <p className="text-slate-500 font-mono text-[9px] mt-2 uppercase tracking-widest">
                              {h.date}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-5 border-t border-slate-800/50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                              {h.ingredients?.length || 0} Materie
                            </span>
                            <button
                              type="button"
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SEZIONE 2: TABELLA DI RICERCA */}
      {viewMode !== 'folders' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.35em]">
                Tabella Ricerca Formule
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Filtra rapidamente tra tutte le {history.length} formule salvate
              </p>
            </div>

            {/* Controlli di ricerca e filtro categoria */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                  placeholder="Cerca per nome, tag o data..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
                {tableQuery && (
                  <button
                    type="button"
                    onClick={() => setTableQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 uppercase tracking-wider focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="ALL">Tutte le cartelle</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabella vera e propria */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="py-4 px-5">Nome Formula</th>
                  <th className="py-4 px-5">Cartella / Tag</th>
                  <th className="py-4 px-5">Materie</th>
                  <th className="py-4 px-5">Data</th>
                  <th className="py-4 px-5 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {tableFilteredFormulas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-slate-500 font-bold uppercase tracking-widest text-[11px]"
                    >
                      Nessuna formula corrisponde ai criteri di ricerca
                    </td>
                  </tr>
                ) : (
                  tableFilteredFormulas.map((h: any) => {
                    const cat = (h.tag || 'GENERALE').trim().toUpperCase();
                    return (
                      <tr
                        key={h.id}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="py-4 px-5 font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                          {h.name}
                        </td>
                        <td className="py-4 px-5">
                          <span className="inline-block px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-wider">
                            {cat}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-slate-400 font-bold">
                          {h.ingredients?.length || 0}
                        </td>
                        <td className="py-4 px-5 text-slate-500 font-mono text-[10px]">
                          {h.date || '—'}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => loadFromHistory(h)}
                              className="inline-flex items-center gap-1.5 bg-white text-black text-[9px] font-black uppercase px-4 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                            >
                              Carica
                              <ArrowUpRight size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => deleteFromHistory(h.id, e)}
                              title="Elimina formula"
                              className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormulaArchive;