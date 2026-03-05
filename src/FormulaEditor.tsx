import React, { useMemo, useState } from 'react';
import { Formula, Ingredient } from './types';
import { MATERIALS_DB, DILUTION_MAP } from './constants';
import { Plus, Trash2, Save, Scale, Download, ArrowUpDown } from 'lucide-react';

interface Props {
  formula: Formula;
  onUpdate: (f: Formula) => void;
  onSave: (f: Formula) => void; // Aggiunto 'f: Formula' qui
  onScale: () => void;
  onExport: () => void; 
  ifraAlerts: string[];
  onOpenSelector: () => void;
  onViewMaterial: (name: string) => void;
}

const FormulaEditor: React.FC<Props> = ({
  formula,
  onUpdate,
  onSave,
  onScale,
  onExport,
  ifraAlerts,
  onOpenSelector,
  onViewMaterial
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'percentage', direction: 'asc' | 'desc' }>({
    key: 'percentage',
    direction: 'desc'
  });

  const totalWeight = useMemo(() => {
    return formula.ingredients.reduce((acc, ing) => acc + (Number(ing.weightG) || 0), 0);
  }, [formula.ingredients]);

  const totalMaterialsWeight = useMemo(() => {
    return formula.ingredients.reduce((acc, ing) => {
      const mat = MATERIALS_DB[ing.materialName];
      if (mat?.Type === 'Solvente') return acc;
      const ratio = DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1;
      return acc + (Number(ing.weightG) * ratio);
    }, 0);
  }, [formula.ingredients]);

  const totalCost = useMemo(() => {
    return formula.ingredients.reduce((acc, ing) => {
      const matData = MATERIALS_DB[ing.materialName];
      const unitCost = matData?.CostPerGram || 0;
      const ratio = matData?.Type === 'Solvente' ? 1 : (DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1);
      const pureWeight = (Number(ing.weightG) || 0) * ratio;
      return acc + (pureWeight * unitCost);
    }, 0);
  }, [formula.ingredients]);

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    const newIngs = formula.ingredients.map(ing =>
      ing.id === id ? { ...ing, [field]: value } : ing
    );
    onUpdate({ ...formula, ingredients: newIngs });
  };

  const removeIngredient = (id: string) => {
    onUpdate({ ...formula, ingredients: formula.ingredients.filter(ing => ing.id !== id) });
  };

  const requestSort = (key: 'name' | 'percentage') => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedIngredients = useMemo(() => {
    const list = [...formula.ingredients];
    list.sort((a, b) => {
      let valA: any;
      let valB: any;
      if (sortConfig.key === 'percentage') {
        const matA = MATERIALS_DB[a.materialName];
        const ratioA = matA?.Type === "Solvente" ? 1 : (DILUTION_MAP[a.dilution as keyof typeof DILUTION_MAP] || 1);
        valA = (Number(a.weightG) || 0) * ratioA;
        const matB = MATERIALS_DB[b.materialName];
        const ratioB = matB?.Type === "Solvente" ? 1 : (DILUTION_MAP[b.dilution as keyof typeof DILUTION_MAP] || 1);
        valB = (Number(b.weightG) || 0) * ratioB;
      } else {
        valA = (a.materialName || "").toLowerCase();
        valB = (b.materialName || "").toLowerCase();
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [formula.ingredients, sortConfig]);

 // --- LOGICA MATURAZIONE ---
  const handleArchivia = () => {
    const today = new Date();
    const finishDate = new Date();
    
    // Convertiamo in numero per sicurezza
    const days = Number(formula.maturationDays) || 0; 
    finishDate.setDate(today.getDate() + days);

    const formulaToSave = {
      ...formula,
      maturationFinishDate: finishDate.toISOString(),
      status: 'macerazione' as any
    };
    
    // CHIAMATA UNICA AL SALVATAGGIO
    onSave(formulaToSave);
    
    // MESSAGGIO UNICO DI CONFERMA
    if (days > 0) {
        alert(`Progetto "${formula.name || 'Senza Nome'}" archiviato! Maturazione prevista il: ${finishDate.toLocaleDateString('it-IT')}`);
    } else {
        alert(`Progetto "${formula.name || 'Senza Nome'}" archiviato correttamente.`);
    }
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER EDITOR */}
<div className="grid grid-cols-1 md:grid-cols-7 gap-4 bg-slate-900/50 p-6 rounded-[32px] border border-slate-800 items-end">
  
  {/* Nome Progetto (2 colonne) */}
  <div className="md:col-span-2">
    <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block tracking-widest ml-1">Nome Progetto</label>
    <input 
      className="w-full bg-slate-950 border-slate-800 rounded-xl py-3 px-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
      value={formula.name}
      onChange={(e) => onUpdate({ ...formula, name: e.target.value.toUpperCase() })}
    />
  </div>

  {/* Maturazione */}
  <div>
    <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block tracking-widest ml-1">Maturazione (GG)</label>
    <input 
      type="number"
      className="w-full bg-slate-950 border-slate-800 rounded-xl py-3 px-4 text-emerald-400 font-bold text-xs outline-none"
      value={formula.maturationDays || 0}
      onChange={(e) => onUpdate({ ...formula, maturationDays: parseInt(e.target.value) || 0 })}
    />
  </div>
  
  {/* Pulsanti Azione */}
  <div className="flex items-end">
    <button onClick={onOpenSelector} className="w-full bg-blue-600 hover:bg-blue-500 text-white h-[46px] rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
      <Plus size={16} /> Aggiungi
    </button>
  </div>

  <div className="flex items-end text-blue-400">
    <button onClick={onScale} className="w-full bg-slate-800 hover:bg-slate-700 h-[46px] rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-slate-700">
      <Scale size={16} /> Scala
    </button>
  </div>

  <div className="flex items-end text-emerald-400">
    <button onClick={onExport} className="w-full bg-slate-800 hover:bg-slate-700 h-[46px] rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-slate-700">
      <Download size={16} /> Excel
    </button>
  </div>

  {/* FIX: Usiamo la freccia () => per passare la formula corretta */}
  <div className="flex items-end text-slate-300">
    <button 
      onClick={handleArchivia}
      className="w-full bg-slate-800 hover:bg-slate-700 h-[46px] rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-slate-700"
    >
      <Save size={16} /> Archivia
    </button>
  </div>
</div>
      {/* TABELLA INGREDIENTI */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <th 
                className="py-5 px-8 cursor-pointer hover:text-blue-400 transition-colors group select-none"
                onClick={() => requestSort('name')}
              >
                <div className="flex items-center gap-2">
                  Materia Prima 
                  <ArrowUpDown size={10} className={`${sortConfig.key === 'name' ? 'text-blue-400' : 'opacity-20 group-hover:opacity-100'} transition-transform ${sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                </div>
              </th>
              <th className="py-5 px-4 text-center">Diluizione</th>
              <th className="py-5 px-4 text-center text-slate-600">Peso Lordo (g)</th>
              <th 
                className="py-5 px-4 text-center cursor-pointer hover:text-blue-400 transition-colors group select-none"
                onClick={() => requestSort('percentage')}
              >
                <div className="flex items-center justify-center gap-2">
                  Assoluto (%) 
                  <ArrowUpDown size={10} className={`${sortConfig.key === 'percentage' ? 'text-blue-400' : 'opacity-20 group-hover:opacity-100'} transition-transform ${sortConfig.key === 'percentage' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                </div>
              </th>
              <th className="py-5 px-4 text-center">Costo</th>
              <th className="py-5 px-8 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {sortedIngredients.map((ing) => {
              const mat = MATERIALS_DB[ing.materialName];
              const isSolvent = mat?.Type === "Solvente";
              const ratio = isSolvent ? 1 : (DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1);
              const pureWeight = (Number(ing.weightG) || 0) * ratio;
              const absolutePercentage = totalWeight > 0 ? (pureWeight / totalWeight) * 100 : 0;
              const partialCost = pureWeight * (mat?.CostPerGram || 0);
              const isOverIfra = mat && absolutePercentage > (mat.IFRA || 100);

              return (
                <tr key={ing.id} className="hover:bg-blue-500/[0.02] group transition-colors">
                  <td className="py-4 px-8">
                    <button 
                      type="button"
                      onClick={() => onViewMaterial(ing.materialName)}
                      className="text-white font-bold text-sm uppercase tracking-wide hover:text-blue-400 transition-colors text-left"
                    >
                      {ing.materialName || <span className="text-slate-700 italic">Senza nome</span>}
                    </button>

                    {/* SEZIONE PARAMETRI */}
                    {mat && (
                      <div className="flex gap-4 mt-1.5 items-center opacity-90">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">IFRA</span>
                          <span className={`text-sm font-black ${isOverIfra ? "text-red-500 animate-pulse" : "text-slate-400"}`}>
                            {mat.IFRA || 100}%
                          </span>
                        </div>
                        
                        <div className="flex items-baseline gap-1 border-l border-slate-800 pl-3">
                          <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">RANGE</span>
                          <span className={`text-[10px] font-bold ${(absolutePercentage < (mat.MinUsage || 0) || absolutePercentage > (mat.MaxUsage || 100)) 
                            ? "text-orange-400" 
                            : "text-slate-500"}`}>
                            {mat.MinUsage || '0'}-{mat.MaxUsage || mat.IFRA || '10'}%
                          </span>
                        </div>

                        {isSolvent && (
                          <span className="text-[8px] font-black text-blue-500/60 uppercase tracking-widest ml-1">
                            [Solvente]
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td className="py-4 px-4 text-center">
                    <select 
                      disabled={isSolvent}
                      className={`bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-bold py-1 px-2 outline-none transition-opacity ${isSolvent ? 'opacity-30 cursor-not-allowed' : 'text-slate-400'}`}
                      value={isSolvent ? 'Pure' : ing.dilution}
                      onChange={(e) => updateIngredient(ing.id, 'dilution', e.target.value)}
                    >
                      {Object.keys(DILUTION_MAP).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <input 
                      type="number" step="0.001"
                      className="bg-slate-950/50 border border-slate-900 rounded-xl py-2 px-3 text-slate-500 font-mono text-xs w-24 text-center outline-none focus:border-blue-500/50 focus:text-white transition-all"
                      value={ing.weightG}
                      onChange={(e) => updateIngredient(ing.id, 'weightG', e.target.value)}
                    />
                  </td>

                  <td className="py-4 px-4 text-center">
                    <div className={`text-[12px] font-mono font-black ${isOverIfra ? "text-red-500 animate-pulse" : "text-blue-400"}`}>
                      {absolutePercentage.toFixed(3)}%
                    </div>
                  </td>

                  <td className="py-4 px-4 text-center font-mono text-[11px] text-emerald-500/80">
                    €{partialCost.toFixed(3)}
                  </td>

                  <td className="py-4 px-8 text-right">
                    <button onClick={() => removeIngredient(ing.id)} className="text-slate-700 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* FOOTER TOTALI */}
        <div className="p-8 bg-slate-900/50 flex justify-end items-center border-t border-slate-800/50">
          <div className="flex gap-10 text-right">
            <div>
              <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Peso Totale</p>
              <p className="text-lg font-black text-slate-300 font-mono">{totalWeight.toFixed(3)}g</p>
            </div>
            <div>
              <p className="text-[8px] text-slate-500 uppercase font-black mb-1 text-blue-400">Materie Prime (%)</p>
              <p className="text-lg font-black text-blue-400 font-mono">
                {((totalMaterialsWeight / (totalWeight || 1)) * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Costo Produzione</p>
              <p className="text-lg font-black text-emerald-500 font-mono">€{totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SEZIONE TIMELINE OLFATTIVA BP/VP BASED */}
      <div className="mt-12 space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Evolution Timeline (BP/VP Analysis)</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-700 via-transparent to-transparent"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { 
              title: "Apertura", 
              time: "0 - 30 MIN", 
              color: "from-blue-500 to-cyan-400",
              filter: (ing: any, mat: any) => {
                if (!mat) return false;
                const vp = mat.VP || 0;
                const bp = mat.BP || 0;
                return vp > 0.1 || (bp > 0 && bp < 220); // Fallback su BP se VP non c'è
              }
            },
            { 
              title: "Evoluzione", 
              time: "30 MIN - 4 ORE", 
              color: "from-emerald-500 to-teal-400",
              filter: (ing: any, mat: any) => {
                if (!mat) return false;
                const vp = mat.VP || 0;
                const bp = mat.BP || 0;
                return (vp <= 0.1 && vp >= 0.001) || (bp >= 220 && bp <= 280);
              }
            },
            { 
              title: "Drydown", 
              time: "4 ORE+", 
              color: "from-amber-600 to-orange-500",
              filter: (ing: any, mat: any) => {
                if (!mat) return false;
                const vp = mat.VP || 0;
                const bp = mat.BP || 0;
                return (vp > 0 && vp < 0.005) || bp > 280;
              }
            }
          ].map((phase, idx) => {
            const phaseIngredients = formula.ingredients
              .map(ing => ({ ing, mat: MATERIALS_DB[ing.materialName] as any }))
              .filter(item => item.mat && phase.filter(item.ing, item.mat))
              .sort((a, b) => {
                 const impactA = (a.mat.Impact || 100) * (Number(a.ing.weightG) || 0);
                 const impactB = (b.mat.Impact || 100) * (Number(b.ing.weightG) || 0);
                 return impactB - impactA;
              });

            const maxPhaseImpact = phaseIngredients.length > 0 
              ? ((phaseIngredients[0].mat.Impact || 100) * (Number(phaseIngredients[0].ing.weightG) || 0)) 
              : 1;

            return (
              <div key={idx} className="bg-slate-950/40 border border-slate-800/50 rounded-[2.5rem] p-6 flex flex-col min-h-[400px]">
                <div className="mb-6">
                  <span className="text-[9px] font-black px-3 py-1 rounded-full bg-slate-800 text-slate-400 uppercase tracking-widest">{phase.time}</span>
                  <h4 className="text-xl font-black text-white uppercase mt-2 tracking-tighter">{phase.title}</h4>
                </div>

                <div className="flex-1 space-y-4">
                  {phaseIngredients.slice(0, 8).map(({ ing, mat }, i) => {
                    const currentRealImpact = (mat.Impact || 100) * (Number(ing.weightG) || 0);
                    const intensity = Math.max((currentRealImpact / maxPhaseImpact) * 100, 1);

                    return (
                      <div key={i} className="group">
                        <div className="flex justify-between text-[10px] mb-1 px-1">
                          <span className="font-bold text-slate-300 uppercase truncate pr-4">{ing.materialName}</span>
                          <span className="font-mono text-slate-500 shrink-0">{Math.round(currentRealImpact)} pts</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${phase.color} transition-all duration-1000`}
                            style={{ width: `${intensity}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FormulaEditor;