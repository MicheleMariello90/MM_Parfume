import React, { useMemo, useState } from 'react';
import { Formula, Ingredient } from './types';
import { DILUTION_MAP, IFRA_LIMITS } from './constants';
import { Plus, Trash2, Save, Scale, Download, ArrowUpDown, ChevronDown } from 'lucide-react';

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

  // --- 1. LOGICA DEI PESI (DEFINITIVA) ---
  
  // Peso Totale Lordo (La somma di tutto ciò che versi nel flacone)
  // 1. Calcoliamo prima di tutto il peso lordo totale (quello che c'è nel flacone)
const totalGrossWeight = useMemo(() => {
  return formula.ingredients.reduce((acc, ing) => acc + (Number(ing.weightG) || 0), 0);
}, [formula.ingredients]);

// 2. Calcoliamo la lista degli ingredienti con le percentuali corrette
const ingredientsWithPercentages = useMemo(() => {
  return formula.ingredients.map(ing => {
    const mat = materialsDB[ing.materialName];
    const weight = Number(ing.weightG) || 0;
    
    // Controlliamo se è un solvente
    const isSolvent = mat?.Type === "Solvente";
    
    // Se è solvente, non contribuisce al peso del concentrato (ratio 0)
    const ratio = isSolvent ? 0 : (DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1);
    const pureWeight = weight * ratio;

    // Percentuale sul totale lordo
    const absolutePercentage = totalGrossWeight > 0 ? (pureWeight / totalGrossWeight) * 100 : 0;

    return {
      ...ing,
      pureWeight,
      absolutePercentage,
      isSolvent
    };
  });
}, [formula.ingredients, materialsDB, totalGrossWeight]); // <-- Aggiunto totalGrossWeight qui

// 3. Calcoliamo il peso puro totale (il concentrato vero e proprio)
const totalPureWeight = useMemo(() => {
  return ingredientsWithPercentages.reduce((acc, ing) => acc + ing.pureWeight, 0);
}, [ingredientsWithPercentages]);

  // Costo Totale (Basato sul peso puro)
  const totalCost = useMemo(() => {
    return formula.ingredients.reduce((acc, ing) => {
      const mat = materialsDB[ing.materialName];
      const ratio = DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1;
      return acc + ((Number(ing.weightG) || 0) * ratio * (mat?.CostPerGram || 0));
    }, 0);
  }, [formula.ingredients, materialsDB]);

  // --- 2. LOGICA ALLERGENI E IFRA GLOBALE (SOMMATORIA) ---
// 1. Calcolo delle percentuali totali di ogni molecola nella formula
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

// 2. Creazione della "Blacklist" (Molecole che hanno superato il limite)
const violatedAllergens = useMemo(() => {
  return Object.entries(allergenTotals)
    .filter(([name, total]) => {
      const limit = IFRA_LIMITS[name as keyof typeof IFRA_LIMITS];
      return limit && total > limit; // Qui 2.592% > 1.9% -> CUMARINA entra in lista
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

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/50 rounded-3xl border border-slate-800/50 overflow-hidden backdrop-blur-xl">
        {/* HEADER CONTROLLI */}
        <div className="p-6 md:p-8 border-b border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
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
            <button onClick={onOpenSelector} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-blue-600/20 uppercase tracking-widest">
              <Plus size={16} strokeWidth={3} /> Aggiungi
            </button>
            <button onClick={() => onSave(formula)} className="p-2.5 bg-slate-900 text-slate-400 hover:text-white rounded-2xl border border-slate-800 transition-all hover:bg-slate-800">
              <Save size={20} />
            </button>
            <button onClick={onScale} className="p-2.5 bg-slate-900 text-slate-400 hover:text-white rounded-2xl border border-slate-800 transition-all hover:bg-slate-800">
              <Scale size={20} />
            </button>
            <button onClick={onExport} className="p-2.5 bg-slate-900 text-slate-400 hover:text-white rounded-2xl border border-slate-800 transition-all hover:bg-slate-800">
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
                <th className="py-4 px-4 text-center">
                   Assoluta (%)
                </th>
                <th className="hidden md:table-cell py-4 px-4 text-center">Costo</th>
                <th className="py-4 px-4 md:px-8 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {sortedIngredients.map((ing) => {
  const mat = materialsDB[ing.materialName];
  const isSolvent = mat?.Type === 'Solvente';
  const ratio = DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1;
  const absolutePercentage = totalGrossWeight > 0 ? ((Number(ing.weightG) * ratio) / totalGrossWeight) * 100 : 0;
  const weightG = Number(ing.weightG) || 0;
  const pureWeight = weightG * ratio;
// 2. CONTROLLO "MOLECOLE KILLER" (La parte che mancava alla Tonka)
// Qui diciamo: "Caro materiale, non mi importa se tu come Fava Tonka sei sotto il tuo 4.6%. 
// Se dentro di te hai una molecola che è nella Blacklist globale, devi diventare rosso!"
const containsViolatedAllergen = mat?.composition && Object.keys(mat.composition).some(molName => {
  const cleanName = molName.toUpperCase().trim();
  // Se 'CUMARINA' è nella lista dei violati (perché somma Tonka + Aroma > 1.9)
  return violatedAllergens.includes(cleanName);
});

// 3. CONTROLLO LIMITE DIRETTO (Il vecchio controllo che la faceva restare bianca)
const directLimit = mat?.ifra ?? mat?.IFRA;
const isOverDirectLimit = directLimit && absolutePercentage > directLimit;

// STATO FINALE: Rosso se superi il tuo limite O se contieni una molecola "fuorilegge"
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
    /* Nessun background, nessun bordo, solo un indicatore invisibile o nulla */
    <span className="text-[10px] font-medium text-slate-800">
      —
    </span>
  ) : (
    <select 
      className="bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-bold py-1 px-2 text-slate-400 outline-none focus:border-blue-500 transition-colors"
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
          className="bg-slate-950/50 border border-slate-900 rounded-xl py-2 px-3 text-white font-mono text-xs w-24 text-center outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          value={ing.weightG}
          onChange={(e) => {
            // 1. IL SANITIZZATORE: Cambia istantaneamente la virgola in punto
            const sanitizedValue = e.target.value.replace(',', '.');
            
            // 2. IL FILTRO: Lascia passare solo numeri e un singolo punto (niente lettere o caratteri strani)
            if (/^\d*\.?\d*$/.test(sanitizedValue)) {
              updateIngredient(ing.id, 'weightG', sanitizedValue);
            }
          }}
          // 3. IL FOCUS AUTOMATICO: Se il peso è vuoto o a zero (appena aggiunto), ci entra dentro da solo
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
})}
            </tbody>
          </table>
        </div>

        {/* FOOTER TOTALI CORRETTO */}
        <div className="p-8 bg-slate-900/50 flex justify-end items-center border-t border-slate-800/50">
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
    
    // 1. BP e IMPACT (usiamo la moltiplicazione per valorizzare il 900 del Calone)
    const bp = Number(mat.BP) || (mat.Notes?.includes('Testa') ? 180 : mat.Notes?.includes('Cuore') ? 260 : 350);
    const impact = parseFloat(mat.impact || mat.Impact || 10);
    
    // 2. POTENZA LINEARE (Rimuoviamo il Log10 per non schiacciare le differenze)
    // Ora Calone (0.2 * 900 = 180) vs Bergamotto (0.2 * 10 = 2)
    const totalPower = pureWeight * impact;

    const vp = parseFloat(mat.VP) || 0.01; 
    let pTesta = 0; let pCuore = 0; let pFondo = 0;

    // 3. DISTRIBUZIONE DINAMICA BP
    if (bp < 200) {
      // Testa pura (es. Bergamotto) - sparisce quasi del tutto dopo la testa
      pTesta = totalPower; pCuore = totalPower * 0.05; pFondo = 0;
    } else if (bp >= 200 && bp <= 260) {
      // Cuore (es. Calone) - presente ovunque ma picco nel cuore
      pTesta = totalPower * 0.4; pCuore = totalPower; pFondo = totalPower * 0.6;
    } else {
      // Fondo (es. Muschi) - cresce man mano
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
                <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
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
    <div className="mt-12 p-8 bg-slate-950/50 rounded-[2.5rem] border border-slate-800/50 shadow-2xl">
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