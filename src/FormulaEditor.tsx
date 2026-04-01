import React, { useMemo, useState } from 'react';
import { Formula, Ingredient } from './types';
import { DILUTION_MAP, IFRA_LIMITS } from './constants';
import { Plus, Trash2, Save, Scale, Download, ArrowUpDown, ChevronDown, } from 'lucide-react';

interface Props {
  formula: Formula;
  materialsDB: Record<string, any>;
  onUpdate: (f: Formula) => void;
  onSave: (f: Formula) => void; 
  onScale: () => void;
  onExport: () => void; 
  ifraAlerts: string[];
  onOpenSelector: () => void;
  onViewMaterial: (name: string) => void;
}

const FormulaEditor: React.FC<Props> = ({
  formula,
  materialsDB,
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
  
  // STATO PER LA VISTA (Lista Unica vs Piramide)
  const [viewMode, setViewMode] = useState<'list' | 'pyramid'>('list');

  // --- 1. LOGICA DEI PESI (DEFINITIVA) ---
  const totalGrossWeight = useMemo(() => {
    return formula.ingredients.reduce((acc, ing) => acc + (Number(ing.weightG) || 0), 0);
  }, [formula.ingredients]);

  const ingredientsWithPercentages = useMemo(() => {
    return formula.ingredients.map(ing => {
      const mat = materialsDB[ing.materialName];
      const weight = Number(ing.weightG) || 0;
      const isSolvent = mat?.Type === "Solvente";
      const ratio = isSolvent ? 0 : (DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1);
      const pureWeight = weight * ratio;
      const absolutePercentage = totalGrossWeight > 0 ? (pureWeight / totalGrossWeight) * 100 : 0;

      return { ...ing, pureWeight, absolutePercentage, isSolvent };
    });
  }, [formula.ingredients, materialsDB, totalGrossWeight]);

  const totalPureWeight = useMemo(() => {
    return ingredientsWithPercentages.reduce((acc, ing) => acc + ing.pureWeight, 0);
  }, [ingredientsWithPercentages]);

  const totalCost = useMemo(() => {
    return formula.ingredients.reduce((acc, ing) => {
      const mat = materialsDB[ing.materialName];
      const ratio = DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1;
      return acc + ((Number(ing.weightG) || 0) * ratio * (mat?.CostPerGram || 0));
    }, 0);
  }, [formula.ingredients, materialsDB]);

  // --- LOGICA CALCOLO PERCENTUALI PER FASE (AGGIUNTA) ---
  const getPhaseTotal = (phaseIngredients: Ingredient[]) => {
    const sum = phaseIngredients.reduce((acc, ing) => {
      const mat = materialsDB[ing.materialName];
      if (mat?.Type === 'Solvente') return acc;
      const ratio = DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1;
      const pureWeight = (Number(ing.weightG) || 0) * ratio;
      return acc + (totalGrossWeight > 0 ? (pureWeight / totalGrossWeight) * 100 : 0);
    }, 0);
    return sum.toFixed(2);
  };

  const getSolventTotal = (phaseIngredients: Ingredient[]) => {
    const sum = phaseIngredients.reduce((acc, ing) => {
      return acc + (totalGrossWeight > 0 ? (Number(ing.weightG) / totalGrossWeight) * 100 : 0);
    }, 0);
    return sum.toFixed(2);
  };

  // --- 2. LOGICA ALLERGENI E IFRA GLOBALE ---
  const allergenTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    formula.ingredients.forEach(ing => {
      const mat = materialsDB[ing.materialName];
      if (!mat || mat.Type === 'Solvente' || !mat.composition) return;

      const ratio = DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1;
      const pureWeightG = (Number(ing.weightG) || 0) * ratio;

      Object.entries(mat.composition).forEach(([molecule, conc]) => {
        const molName = molecule.toUpperCase().trim();
        const moleculeGrams = (pureWeightG * (Number(conc) || 0)) / 100;
        totals[molName] = (totals[molName] || 0) + moleculeGrams;
      });
    });

    const percentages: Record<string, number> = {};
    Object.entries(totals).forEach(([mol, grams]) => {
      percentages[mol] = totalGrossWeight > 0 ? (grams / totalGrossWeight) * 100 : 0;
    });
    return percentages;
  }, [formula.ingredients, materialsDB, totalGrossWeight]);

  const violatedAllergens = useMemo(() => {
    return Object.entries(allergenTotals)
      .filter(([name, total]) => {
        const limit = IFRA_LIMITS[name as keyof typeof IFRA_LIMITS];
        return limit && total > limit; 
      })
      .map(([name]) => name);
  }, [allergenTotals]);

  // --- 3. ORDINAMENTO E GESTIONE INGREDIENTI ---
  const updateIngredient = (id: string, field: keyof Ingredient, value: string | number) => {
    const newIngredients = formula.ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    );
    onUpdate({ ...formula, ingredients: newIngredients });
  };

  const removeIngredient = (id: string) => {
    onUpdate({ ...formula, ingredients: formula.ingredients.filter(ing => ing.id !== id) });
  };

  const sortedIngredients = useMemo(() => {
    const sorted = [...formula.ingredients];
    sorted.sort((a, b) => {
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.materialName.localeCompare(b.materialName)
          : b.materialName.localeCompare(a.materialName);
      } else {
        const ratioA = DILUTION_MAP[a.dilution as keyof typeof DILUTION_MAP] || 1;
        const ratioB = DILUTION_MAP[b.dilution as keyof typeof DILUTION_MAP] || 1;
        const percA = totalGrossWeight > 0 ? ((Number(a.weightG) * ratioA) / totalGrossWeight) * 100 : 0;
        const percB = totalGrossWeight > 0 ? ((Number(b.weightG) * ratioB) / totalGrossWeight) * 100 : 0;
        return sortConfig.direction === 'asc' ? percA - percB : percB - percA;
      }
    });
    return sorted;
  }, [formula.ingredients, sortConfig, totalGrossWeight]);

  // --- 4. RAGGRUPPAMENTO PIRAMIDE ---
  const groupedFormula = useMemo(() => {
    const top: Ingredient[] = [];
    const heart: Ingredient[] = [];
    const base: Ingredient[] = [];
    const solvents: Ingredient[] = [];

    sortedIngredients.forEach(ing => {
      const mat = materialsDB[ing.materialName] || {};
      const isSolvent = mat.Type === 'Solvente';
      
      // Calcolo BP con fallback alle note testuali se BP numerico manca
      const bp = Number(mat.BP) || (mat.Notes?.includes('Testa') ? 180 : mat.Notes?.includes('Cuore') ? 230 : 300);

      if (isSolvent) {
        solvents.push(ing);
      } else if (bp < 200) {
        top.push(ing);
      } else if (bp >= 200 && bp <= 260) {
        heart.push(ing);
      } else {
        base.push(ing);
      }
    });

    return { top, heart, base, solvents };
  }, [sortedIngredients, materialsDB]);

  // --- 5. FUNZIONE DI RENDER DELLA SINGOLA RIGA ---
  const renderRow = (ing: Ingredient) => {
    const mat = materialsDB[ing.materialName];
    const isSolvent = mat?.Type === 'Solvente';
    const ratio = DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1;
    const absolutePercentage = totalGrossWeight > 0 ? ((Number(ing.weightG) * ratio) / totalGrossWeight) * 100 : 0;
    const weightG = Number(ing.weightG) || 0;
    const pureWeight = weightG * ratio;

    const containsViolatedAllergen = mat?.composition && Object.keys(mat.composition).some(molName => {
      const cleanName = molName.toUpperCase().trim();
      return violatedAllergens.includes(cleanName);
    });

    const directLimit = mat?.ifra ?? mat?.IFRA;
    const isOverDirectLimit = directLimit && absolutePercentage > directLimit;
    const isOverIfra = containsViolatedAllergen || isOverDirectLimit;

    return (
      <tr key={ing.id} className="hover:bg-blue-500/[0.02] group transition-colors border-b border-slate-900/50">
        <td className="py-4 px-4 md:px-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => onViewMaterial(ing.materialName)}
                className={`font-bold text-[13px] md:text-sm uppercase tracking-wide transition-colors text-left truncate ${isOverIfra ? 'text-red-500' : 'text-white hover:text-blue-400'}`}
              >
                {ing.materialName || "Senza nome"}
              </button>
              {isOverIfra && (
                <span className="text-[8px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-black border border-red-500/20">
                  {isOverDirectLimit ? 'LIMIT EXCEEDED' : 'ALLERGEN ALERT'}
                </span>
              )}
            </div>
            
            {mat && !isSolvent && (
              <details className="mt-1 group">
                <summary className="list-none cursor-pointer flex items-center gap-1 text-[10px] font-black text-slate-500">
                  IFRA {mat.ifra ?? mat.IFRA ?? 100}% <ChevronDown size={10} />
                </summary>
                <div className="pl-2 mt-1 border-l border-slate-800 space-y-1">
                  {mat.composition && Object.entries(mat.composition).map(([name, value]) => {
                    const isMoleculeViolated = violatedAllergens.includes(name.toUpperCase().trim());
                    return (
                      <div key={name} className="flex justify-between text-[9px] uppercase pr-4">
                        <span className={isMoleculeViolated ? "text-red-400 font-bold" : "text-slate-400"}>
                          {name}
                        </span>
                        <span className={isMoleculeViolated ? "text-red-500" : "text-slate-500"}>
                          {String(value)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        </td>

        <td className="hidden md:table-cell py-4 px-4 text-center">
          {isSolvent ? (
            <span className="text-[10px] font-medium text-slate-800">—</span>
          ) : (
            <select 
              className="bg-black border border-slate-800 rounded-lg text-[10px] font-bold py-1 px-2 text-slate-400 outline-none focus:border-blue-500 transition-colors"
              value={ing.dilution}
              onChange={(e) => updateIngredient(ing.id, 'dilution', e.target.value)}
            >
              {Object.keys(DILUTION_MAP).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </td>

        <td className="hidden md:table-cell py-4 px-4 text-center">
          <input 
            type="text" 
            inputMode="decimal"
            className="bg-black/50 border border-slate-900 rounded-xl py-2 px-3 text-white font-mono text-xs w-24 text-center outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            value={ing.weightG}
            onChange={(e) => {
              const sanitizedValue = e.target.value.replace(',', '.');
              if (/^\d*\.?\d*$/.test(sanitizedValue)) {
                updateIngredient(ing.id, 'weightG', sanitizedValue);
              }
            }}
            autoFocus={ing.weightG === '' || ing.weightG === 0 || ing.weightG === '0'}
          />
        </td>

        <td className="py-4 px-4 text-center">
          <div className={`text-[13px] font-mono font-black ${isOverIfra ? "text-red-500" : "text-blue-400"}`}>
            {isSolvent ? '---' : `${absolutePercentage.toFixed(2)}%`}
          </div>
        </td>

        <td className="hidden md:table-cell py-4 px-4 text-center font-mono text-[11px] text-emerald-500/80">
          €{(pureWeight * (mat?.CostPerGram || 0)).toFixed(3)}
        </td>

        <td className="py-4 px-4 md:px-8 text-right">
          <button onClick={() => removeIngredient(ing.id)} className="text-slate-700 hover:text-red-500 p-2">
            <Trash2 size={18} />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/50 rounded-3xl border border-slate-800/50 overflow-hidden backdrop-blur-xl">
        {/* HEADER CONTROLLI */}
        <div className="p-6 md:p-8 border-b border-slate-800/50 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex-1">
            <input 
              className="bg-transparent text-2xl md:text-3xl font-black text-white outline-none placeholder:text-slate-800 w-full"
              value={formula.name}
              onChange={(e) => onUpdate({ ...formula, name: e.target.value })}
              placeholder="Nome della creazione..."
            />
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mt-1">
              {formula.ingredients.length} componenti in formula
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* SWITCHER VISTA ICONICO (GRAMMI / PIRAMIDE) */}
            <div className="flex bg-black/80 p-1 rounded-xl border border-slate-800 mr-2 shadow-inner">
              <button 
                onClick={() => setViewMode('list')} 
                className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-1.5 ${
                  viewMode === 'list' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Visualizzazione Lista (Grammi)"
              >
                <Scale size={14} strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-tighter">g</span>
              </button>
              
              <button 
                onClick={() => setViewMode('pyramid')} 
                className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center ${
                  viewMode === 'pyramid' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Visualizzazione Fasi (Piramide)"
              >
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <div 
                    className={`absolute inset-0 ${viewMode === 'pyramid' ? 'bg-white' : 'bg-slate-500 hover:bg-slate-300'}`} 
                    style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%, 50% 0%, 50% 25%, 75% 90%, 25% 90%, 50% 25%)' }} 
                  />
                </div>
              </button>
            </div>

            {/* PULSANTI AZIONE */}
            <button onClick={onOpenSelector} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-blue-600/20 uppercase tracking-widest">
              <Plus size={16} strokeWidth={3} /> Aggiungi
            </button>
            <button onClick={() => onSave(formula)} className="p-2.5 bg-black text-slate-400 hover:text-white rounded-2xl border border-slate-800 transition-all hover:bg-slate-800">
              <Save size={20} />
            </button>
            <button onClick={onScale} className="p-2.5 bg-black text-slate-400 hover:text-white rounded-2xl border border-slate-800 transition-all hover:bg-slate-800">
              <Scale size={20} />
            </button>
            <button onClick={onExport} className="p-2.5 bg-black text-slate-400 hover:text-white rounded-2xl border border-slate-800 transition-all hover:bg-slate-800">
              <Download size={20} />
            </button>
          </div>
        </div>

        {/* TABELLA FORMULA */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th className="py-4 px-4 md:px-8 text-left">
                  <button onClick={() => setSortConfig({ key: 'name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                    Materiale <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="hidden md:table-cell py-4 px-4 text-center">Diluizione</th>
                <th className="hidden md:table-cell py-4 px-4 text-center">Peso (g)</th>
                <th className="py-4 px-4 text-center">Assoluta (%)</th>
                <th className="hidden md:table-cell py-4 px-4 text-center">Costo</th>
                <th className="py-4 px-4 md:px-8 text-right">Azioni</th>
              </tr>
            </thead>
            
            {/* CORPO DELLA TABELLA DINAMICO CON TITOLI SEZIONI UNIFORMI */}
          <tbody>
  {viewMode === 'list' ? (
    sortedIngredients.map(renderRow)
  ) : (
    <>
      {/* TOP NOTES */}
      {groupedFormula.top.length > 0 && (
        <>
          <tr className="bg-black border-y border-slate-800/50">
            <td colSpan={6} className="py-3 px-4 md:px-8 border-l-4 border-yellow-400">
              <div className="flex items-center gap-3">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  {/* Sfondo Grigio (Base e Centro) */}
                  <div className="absolute inset-0 bg-slate-800" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                  {/* Punta Gialla */}
                  <div className="absolute inset-0 bg-yellow-400" style={{ clipPath: 'polygon(50% 0%, 33% 33%, 67% 33%)' }} />
                </div>
                <span className="text-[11px] font-black text-yellow-500 uppercase tracking-[0.2em]">
                  Top Notes {getPhaseTotal(groupedFormula.top)}%
                </span>
              </div>
            </td>
          </tr>
          {groupedFormula.top.map(renderRow)}
        </>
      )}

      {/* HEART NOTES */}
      {groupedFormula.heart.length > 0 && (
        <>
          <tr className="bg-black border-y border-slate-800/50">
            <td colSpan={6} className="py-3 px-4 md:px-8 border-l-4 border-rose-500">
              <div className="flex items-center gap-3">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  {/* Sfondo Grigio (Punta e Base) */}
                  <div className="absolute inset-0 bg-slate-800" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                  {/* Centro Rosa */}
                  <div className="absolute inset-0 bg-rose-500" style={{ clipPath: 'polygon(33% 33%, 67% 33%, 83% 66%, 17% 66%)' }} />
                </div>
                <span className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em]">
                  Heart Notes {getPhaseTotal(groupedFormula.heart)}%
                </span>
              </div>
            </td>
          </tr>
          {groupedFormula.heart.map(renderRow)}
        </>
      )}

      {/* BASE NOTES */}
      {groupedFormula.base.length > 0 && (
        <>
          <tr className="bg-black border-y border-slate-800/50">
            <td colSpan={6} className="py-3 px-4 md:px-8 border-l-4 border-indigo-600">
              <div className="flex items-center gap-3">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  {/* Sfondo Grigio (Punta e Centro) */}
                  <div className="absolute inset-0 bg-slate-800" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                  {/* Base Indaco */}
                  <div className="absolute inset-0 bg-indigo-600" style={{ clipPath: 'polygon(17% 66%, 83% 66%, 100% 100%, 0% 100%)' }} />
                </div>
                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                  Base Notes {getPhaseTotal(groupedFormula.base)}%
                </span>
              </div>
            </td>
          </tr>
          {groupedFormula.base.map(renderRow)}
        </>
      )}

      {/* SOLVENTS */}
      {groupedFormula.solvents.length > 0 && (
        <>
          <tr className="bg-black border-y border-slate-800/50">
            <td colSpan={6} className="py-3 px-4 md:px-8 border-l-4 border-slate-600">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-slate-500">
                    <path d="M10 2v7.5M14 2v7.5M8.5 2h7M7 21h10a2 2 0 0 0 2-2v-1.5c0-1.2-.8-2.3-2-2.7L14 13.5V9.5h-4v4l-3 1.3c-1.2.4-2 1.5-2 2.7V19a2 2 0 0 0 2 2z" />
                  </svg>
                </div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  Solventi & Diluenti {getSolventTotal(groupedFormula.solvents)}%
                </span>
              </div>
            </td>
          </tr>
          {groupedFormula.solvents.map(renderRow)}
        </>
      )}
    </>
  )}
</tbody>
          </table>
        </div>

        {/* FOOTER TOTALI CORRETTO */}
        <div className="p-8 bg-black/50 flex justify-end items-center border-t border-slate-800/50">
          <div className="flex gap-10 text-right">
            <div>
              <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Peso Totale Lordo</p>
              <p className="text-lg font-black text-slate-300 font-mono">{totalGrossWeight.toFixed(3)}g</p>
            </div>
            <div>
              <p className="text-[8px] text-slate-500 uppercase font-black mb-1 text-blue-400">Materie Prime (%)</p>
              <p className="text-lg font-black text-blue-400 font-mono">
                {totalGrossWeight > 0 ? ((totalPureWeight / totalGrossWeight) * 100).toFixed(2) : '0.00'}%
              </p>
            </div>
            <div>
              <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Costo Produzione</p>
              <p className="text-lg font-black text-emerald-500 font-mono">€{totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Visualizzazione Piramide Impatto */}
      <MaterialImpactPyramid formula={formula} materialsDB={materialsDB} />
    </div>
  );
};

// --- SOTTO-COMPONENTE PIRAMIDE AGGIORNATO (ODT-BASED) ---
const MaterialImpactPyramid = ({ formula, materialsDB }: { formula: Formula, materialsDB: Record<string, any> }) => {
  const analysis = useMemo(() => {
  return formula.ingredients.map(ing => {
    const mat = materialsDB[ing.materialName] || {};
    const ratio = DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1;
    const pureWeight = (Number(ing.weightG) || 0) * ratio;
    
    // 1. BP e IMPACT
    const bp = Number(mat.BP) || (mat.Notes?.includes('Testa') ? 180 : mat.Notes?.includes('Cuore') ? 260 : 350);
    const impact = parseFloat(mat.impact || mat.Impact || 10);
    
    // 2. POTENZA LINEARE
    const totalPower = pureWeight * impact;

    const vp = parseFloat(mat.VP) || 0.01; 
    let pTesta = 0; let pCuore = 0; let pFondo = 0;

    // 3. DISTRIBUZIONE DINAMICA BP
    if (bp < 200) {
      pTesta = totalPower; pCuore = totalPower * 0.05; pFondo = 0;
    } else if (bp >= 200 && bp <= 260) {
      pTesta = totalPower * 0.4; pCuore = totalPower; pFondo = totalPower * 0.6;
    } else {
      pTesta = totalPower * 0.1; pCuore = totalPower * 0.4; pFondo = totalPower;
    }

    // 4. BOOST VAPOR PRESSURE (Spinta fisica immediata)
    if (vp > 0.5) {
      const vpBoost = Math.min(vp * 0.2, 0.5) * totalPower;
      pTesta += vpBoost;
    }

    return {
      name: ing.materialName,
      powerTesta: pTesta,
      powerCuore: pCuore,
      powerFondo: pFondo,
      isSolvent: mat.Type === 'Solvente'
    };
  }).filter(ing => !ing.isSolvent);
}, [formula.ingredients, materialsDB]);

  // --- RENDERING DELLA PIRAMIDE DINAMICA ---
  const renderColumn = (
    title: string, 
    data: any[], 
    powerKey: 'powerTesta' | 'powerCuore' | 'powerFondo', 
    color: string
  ) => {
    const filteredData = data.filter(ing => ing[powerKey] > 0.01);
    const maxPower = Math.max(...filteredData.map(d => d[powerKey]), 1);
    
    return (
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <div className={`w-1.5 h-4 rounded-full ${color}`} />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</h4>
        </div>
        <div className="space-y-3">
          {filteredData
            .sort((a, b) => b[powerKey] - a[powerKey])
            .map((item, i) => (
              <div key={i} className="group">
                <div className="flex justify-between text-[9px] mb-1 uppercase font-bold tracking-tight">
                  <span className="text-slate-300 truncate w-28">{item.name}</span>
                  <span className="text-slate-500 font-mono">
                    {Math.round(item[powerKey]) > 0 ? Math.round(item[powerKey]) : '<1'}
                  </span>
                </div>
                <div className="h-1 w-full bg-black rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${color} transition-all duration-1000 shadow-[0_0_8px_rgba(0,0,0,0.4)]`}
                    style={{ width: `${(item[powerKey] / maxPower) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          {filteredData.length === 0 && (
            <div className="py-4 text-center text-[9px] uppercase text-slate-700 italic">No data</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-12 p-8 bg-black/50 rounded-[2.5rem] border border-slate-800/50 shadow-2xl">
      <div className="text-center mb-10">
        <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-2">
          Scientific Evolution Analysis
        </h3>
        <p className="text-[9px] text-slate-600 uppercase">
          Dynamic BP, ODT & Vapor Pressure Mapping
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-10">
        {/* TITOLI AGGIORNATI CON LE NUOVE SOGLIE */}
        {renderColumn("Top (< 200°C)", analysis, "powerTesta", "bg-yellow-400")}
        {renderColumn("Heart (200-260°C)", analysis, "powerCuore", "bg-rose-500")}
        {renderColumn("Base (> 260°C)", analysis, "powerFondo", "bg-indigo-600")}
      </div>
    </div>
  );
};

export default FormulaEditor;