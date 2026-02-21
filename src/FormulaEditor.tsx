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

  // --- STATI PER AI ASSISTANT ---
  const [prompt, setPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  const askGemini = async (mode: 'accordo' | 'analisi') => {
    setIsAiLoading(true);
    const apiKey = "AIzaSyCiHkpImqKhESbyrUGU0Bn1K5fAmOw_HU0"; // Ricordati di proteggere questa chiave in produzione!
    const availableMaterials = Object.keys(MATERIALS_DB).join(", ");

    const systemInstruction = mode === 'accordo'
      ? `Sei un Master Perfumer. Crea un accordo usando SOLO i materiali in questo elenco: [${availableMaterials}]. Rispondi ESCLUSIVAMENTE con un array JSON: [{"materialName": "nome", "weightG": valore}]. Il totale deve essere esattamente 10.0g.`
      : `Analizza questa formula: ${JSON.stringify(formula.ingredients)}. Suggerisci miglioramenti tecnici.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction} \n\n Richiesta: ${prompt}` }] }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Errore ${response.status}`);
      }

      const data = await response.json();
      let text = data.candidates[0].content.parts[0].text;
      text = text.replace(/```json|```/g, "").trim();

      // --- LOGICA DI INIEZIONE E PULIZIA ---
      if (mode === 'accordo') {
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          const newIngredients = JSON.parse(jsonMatch[0]);
          const ingredientsToAdd = newIngredients.map((item: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            materialName: item.materialName,
            weightG: item.weightG.toString(),
            dilution: "Pure",
            ...(MATERIALS_DB[item.materialName] || {})
          }));

          onUpdate({
            ...formula,
            ingredients: [...formula.ingredients, ...ingredientsToAdd]
          });

          setAiResponse("Accordo aggiunto con successo alla formula! ✨");
          setPrompt("");
        }
      } else {
        setAiResponse(text);
      }
    } catch (error: any) {
      console.error("Errore AI:", error);
      setAiResponse(`Errore AI: ${error.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Questa funzione rimane come fallback nel caso il JSON non venga parsato automaticamente al primo colpo
  const applyAiAccord = () => {
    try {
      const jsonMatch = aiResponse.match(/\[.*\]/s);
      if (!jsonMatch) return;
      const newIngredients = JSON.parse(jsonMatch[0]);

      const ingredientsToAdd = newIngredients.map((item: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        materialName: item.materialName,
        weightG: item.weightG.toString(),
        dilution: "Pure",
        ...(MATERIALS_DB[item.materialName] || {})
      }));

      onUpdate({
        ...formula,
        ingredients: [...formula.ingredients, ...ingredientsToAdd]
      });
      setAiResponse("Accordo applicato con successo!");
      setPrompt("");
    } catch (e) {
      alert("Errore nell'inserimento automatico.");
    }
  };

  // --- LOGICA MATURAZIONE ---
  const handleArchivia = () => {
    const today = new Date();
    const finishDate = new Date();
    
    // Diciamo a TypeScript: "Se non c'è, usa 0"
    const days = formula.maturationDays || 0; 
    
    finishDate.setDate(today.getDate() + days);

    // Aggiorniamo la formula con la data futura e chiamiamo onSave
    const formulaToSave = {
      ...formula,
      maturationFinishDate: finishDate.toISOString(),
      status: 'macerazione'
    };
    
    // Passiamo la formula aggiornata alla funzione genitore
    onSave(formulaToSave);
    
    // Ora usiamo la costante 'days' che è sicuramente un numero
    if (days > 0) {
        alert(`Progetto "${formula.name || 'Senza Nome'}" archiviato! Maturazione prevista il: ${finishDate.toLocaleDateString('it-IT')}`);
    } else {
        alert(`Progetto "${formula.name || 'Senza Nome'}" archiviato! (Nessuna maturazione impostata)`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER EDITOR */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-slate-900/50 p-6 rounded-[32px] border border-slate-800 items-end">
        <div className="md:col-span-2">
          <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block tracking-widest ml-1">Nome Progetto</label>
          <input 
            className="w-full bg-slate-950 border-slate-800 rounded-xl py-3 px-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
            value={formula.name}
            onChange={(e) => onUpdate({ ...formula, name: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block tracking-widest ml-1">Maturazione (GG)</label>
          <input 
            type="number"
            className="w-full bg-slate-950 border-slate-800 rounded-xl py-3 px-4 text-emerald-400 font-bold text-xs outline-none"
            value={formula.maturationDays || 0}
            onChange={(e) => onUpdate({ ...formula, maturationDays: parseInt(e.target.value) || 0 })}
          />
        </div>
        
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

        <div className="flex items-end text-slate-300">
          <button onClick={handleArchivia} className="w-full bg-slate-800 hover:bg-slate-700 h-[46px] rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-slate-700">
            <Save size={16} /> Archivia
          </button>
        </div>
      </div>

      {/* AI ASSISTANT PANEL */}
      <div className="bg-slate-900/80 border border-blue-500/30 rounded-[2.5rem] p-8 mb-8 backdrop-blur-xl shadow-2xl shadow-blue-500/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Gemini Creative Assistant</h3>
          </div>
          <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-800 px-3 py-1 rounded-full tracking-tighter">AI Engine v2.5 Flash</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Area */}
          <div className="space-y-4">
            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Chiedi un accordo (es: 'Crea un accordo miele realistico') o analizza la formula attuale..."
                className="w-full h-32 bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-[11px] text-slate-300 focus:border-blue-500/50 outline-none transition-all resize-none font-medium leading-relaxed"
              />
              <div className="absolute bottom-3 right-3 flex gap-2">
                 <button 
                  onClick={() => askGemini('accordo')}
                  disabled={isAiLoading || !prompt}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-[9px] font-black uppercase px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-600/20"
                 >
                   {isAiLoading ? "Caricamento..." : "Genera Accordo"}
                 </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => askGemini('analisi')}
                className="flex-1 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-slate-400 text-[9px] font-black uppercase py-3 rounded-xl transition-all"
              >
                Analizza Equilibrio
              </button>
            </div>
          </div>

          {/* Output Area */}
          <div className="bg-slate-950/80 border border-slate-800/50 rounded-2xl p-5 flex flex-col relative group min-h-[180px]">
            <div className="flex-1">
              <p className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {aiResponse || "L'assistente è pronto ad analizzare i tuoi materiali per fornirti suggerimenti tecnici o creativi."}
              </p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isAiLoading ? "bg-blue-500 animate-ping" : "bg-emerald-500/50"}`}></div>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                  {isAiLoading ? "Gemini sta pensando..." : "System Status: Ready"}
                </span>
              </div>
              {aiResponse.includes('[') && !isAiLoading && (
                <button 
                  onClick={applyAiAccord}
                  className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20"
                >
                  <Plus size={12}/> Applica Formula 🧪
                </button>
              )}
            </div>
          </div>
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