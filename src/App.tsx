import React, { useState, useMemo } from 'react';
import FormulaEditor from './FormulaEditor';
import { Formula, Ingredient } from './types';
import { MATERIALS_DB, FAMILY_COLORS, DILUTION_MAP } from './constants';
import { Beaker, Book, Search, Activity, AlertTriangle, X, Plus, Database, Trash2, ChevronRight, BookOpen } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import './index.css';
import MaterialModal from './MaterialModal';
import FormulaArchive from './FormulaArchive';
import MaterialLibrary from './MaterialLibrary';

type Section = 'editor' | 'library' | 'history' | 'settings';

// Componente Piramide Olfattiva
const OlfactivePyramid = ({ notes }: { notes: string[] }) => {
  const isTop = notes.includes('Testa');
  const isHeart = notes.includes('Cuore');
  const isBase = notes.includes('Base');
  const isFull = isTop && isHeart && isBase;

  return (
    <div className="flex flex-col items-center gap-1 w-full max-w-[120px]">
      <div className={`w-10 h-6 transition-all duration-500 ${isTop || isFull ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-slate-800'}`} 
           style={{clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div>
      <div className={`w-16 h-6 transition-all duration-500 ${isHeart || isFull ? 'bg-orange-500' : 'bg-slate-800'}`}
           style={{clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)'}}></div>
      <div className={`w-24 h-8 rounded-b-lg transition-all duration-500 ${isBase || isFull ? 'bg-red-700' : 'bg-slate-800'}`}></div>
      <p className="text-[7px] font-black uppercase mt-2 text-slate-600 tracking-widest text-center">Volatility Profile</p>
    </div>
  );
};
// AGGIUNGI QUESTO SOPRA LA FUNCTION APP()
const DescriptionEditor = ({ initialValue, onSave, isReadOnly }: { initialValue: string, onSave: (val: string) => void, isReadOnly: boolean }) => {
  const [text, setText] = useState(initialValue);

  // Sincronizza il testo quando cambi materiale
  React.useEffect(() => {
    setText(initialValue);
  }, [initialValue]);

  return (
    <textarea
      readOnly={isReadOnly}
      className={`w-full bg-transparent text-lg text-slate-200 leading-snug italic border-none focus:ring-0 resize-none outline-none ${isReadOnly ? 'cursor-default' : 'cursor-text bg-white/5 rounded-lg p-2'}`}
      value={text}
      onChange={(e) => setText(e.target.value)} // Aggiornamento locale istantaneo
      onBlur={() => onSave(text)} // Salva nel database globale solo quando esci dal campo
      placeholder={!isReadOnly ? "Clicca per aggiungere note..." : "Nessuna nota."}
      rows={3}
    />
  );
};
const EditableField = ({ label, value, onSave, isReadOnly, type = "text", step = "1", colorClass = "text-slate-300" }: { 
  label: string, 
  value: any, 
  onSave: (val: any) => void, 
  isReadOnly: boolean,
  type?: string,
  step?: string,
  colorClass?: string
}) => {
  const [tempValue, setTempValue] = React.useState(value);

  React.useEffect(() => {
    setTempValue(value);
  }, [value]);

  return (
    <div className={`bg-slate-950/50 p-5 rounded-2xl border ${!isReadOnly ? 'border-blue-500/30' : 'border-slate-800'} text-center transition-all`}>
      <p className="text-[7px] text-slate-500 uppercase font-bold mb-1 tracking-widest">{label}</p>
      <input 
        type={type}
        step={step}
        readOnly={isReadOnly}
        className={`bg-transparent text-sm font-mono ${colorClass} w-full text-center outline-none border-none p-0 ${isReadOnly ? 'cursor-default' : 'cursor-text focus:text-white'}`}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={() => {
            const finalVal = type === "number" ? parseFloat(tempValue) || 0 : tempValue;
            onSave(finalVal);
        }}
      />
    </div>
  );
};

 function App() {
  // --- 1. ZONA STATI (Dichiarati una sola volta) ---
  const [activeSection, setActiveSection] = useState<Section>('editor');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectedMaterialInfo, setSelectedMaterialInfo] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [selectorView, setSelectorView] = useState<'materials' | 'accords'>('materials');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showFamilyGrid, setShowFamilyGrid] = useState(false);
  
  // Database reattivo e stato per la modifica
  const [materialsDB, setMaterialsDB] = useState<Record<string, any>>(MATERIALS_DB);
  const [isEditingMaterial, setIsEditingMaterial] = useState(false);
  const [showPersonalNotes, setShowPersonalNotes] = useState(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [dbSearchLoading, setDbSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [tempMaterial, setTempMaterial] = useState<any>(null);
  const [updateTick, setUpdateTick] = useState(0);
  const [tempName, setTempName] = useState<string>('');

  // Stati Formula e Archivio
  const [formula, setFormula] = useState<Formula>({
    id: 'current-draft',
    name: 'NOME FORMULA',
    ingredients: [],
    date: new Date().toLocaleDateString(),
    tag: 'LAB-01'
  });

  const [history, setHistory] = useState<Formula[]>(() => {
    const localData = localStorage.getItem('perfume_lab_history');
    return localData ? JSON.parse(localData) : [];
  });
  // --- FUNZIONI DI AGGIORNAMENTO OTTIMIZZATE (Blindate con useCallback) ---

const handleAddNewMaterial = React.useCallback(() => {
  const tempName = `NUOVA MATERIA ${Object.keys(materialsDB).length + 1}`;
  const newMaterial = {
    CAS: "",
    Notes: "Inserisci qui una descrizione...",
    Volatility: "Testa", 
    BP: 0,
    VP: "",
    Impact: 50,
    MinUsage: 0,
    AverageUsage: 0,
    MaxUsage: 0,
    IFRA: 100,
    CostPerGram: 0,
    Maturazione: 0,
    Families: {},
    PersonalDiary: ""
  };

  setMaterialsDB(prev => ({
    ...prev,
    [tempName]: newMaterial
  }));
  
  setSelectedMaterialInfo(tempName);
  setIsEditingMaterial(true);
}, [materialsDB]); // Si aggiorna solo se cambia il numero di materie

const updateMaterialData = React.useCallback((field: string, value: any) => {
  if (!selectedMaterialInfo) return;
  setMaterialsDB(prev => {
    if (prev[selectedMaterialInfo][field] === value) return prev;
    return {
      ...prev,
      [selectedMaterialInfo]: { ...prev[selectedMaterialInfo], [field]: value }
    };
  });
}, [selectedMaterialInfo]);

const updateFamilyValue = React.useCallback((family: string, percent: number) => {
  if (!selectedMaterialInfo) return;
  setMaterialsDB(prev => {
    const material = prev[selectedMaterialInfo];
    const newFamilies = { ...(material.Families || {}) };
    if (percent <= 0) delete newFamilies[family];
    else newFamilies[family] = percent;
    return {
      ...prev,
      [selectedMaterialInfo]: { ...material, Families: newFamilies }
    };
  });
}, [selectedMaterialInfo]);

const toggleVolatility = React.useCallback((note: string) => {
  if (!selectedMaterialInfo) return;
  setMaterialsDB(prev => {
    const material = prev[selectedMaterialInfo];
    let currentVol = material.Volatility || "";
    let parts = currentVol === "N/A" ? [] : currentVol.split('/').filter((p: string) => p !== "");
    
    if (parts.includes(note)) {
      parts = parts.filter((p: string) => p !== note);
    } else {
      parts.push(note);
    }
    const order = ["Testa", "Cuore", "Fondo"];
    parts.sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b));
    
    return {
      ...prev,
      [selectedMaterialInfo]: { 
        ...material, 
        Volatility: parts.length > 0 ? parts.join('/') : "N/A" 
      }
    };
  });
}, [selectedMaterialInfo]);
// --- FUNZIONE PER ELIMINARE MATERIALI (Ripristinata) ---
const handleDeleteMaterial = React.useCallback((name: string, e: React.MouseEvent) => {
  e.stopPropagation(); // Fondamentale: evita che si apra il modale mentre clicchi il cestino
  if (window.confirm(`Eliminare definitivamente ${name}?`)) {
    setMaterialsDB((prev: any) => {
      const newDb = { ...prev };
      delete newDb[name];
      return newDb;
    });
  }
}, []);

  // --- 3. LOGICA FORMULA, EXCEL E SCALATURA ---
  
  const scaleFormula = () => {
    const totalAmount = formula.ingredients.reduce((sum, ing) => sum + (Number(ing.weightG) || 0), 0);
    if (totalAmount === 0) return window.alert("La formula è vuota!");
    const targetAmountStr = window.prompt(`Peso attuale: ${totalAmount.toFixed(3)}g. Inserisci nuovo peso totale (g):`, totalAmount.toString());
    if (targetAmountStr && !isNaN(parseFloat(targetAmountStr))) {
      const factor = parseFloat(targetAmountStr) / totalAmount;
      setFormula({
        ...formula,
        ingredients: formula.ingredients.map(ing => ({
          ...ing,
          weightG: Number((Number(ing.weightG) * factor).toFixed(3)) 
        }))
      });
    }
  };

  const exportToExcel = () => {
    if (formula.ingredients.length === 0) return window.alert("La formula è vuota!");
    const totalWeight = formula.ingredients.reduce((acc, ing) => acc + (Number(ing.weightG) || 0), 0);
    let csvContent = "sep=;\n" + "Materia Prima;Diluizione;Peso (g);Percentuale (%)\n";
    formula.ingredients.forEach(ing => {
      const percentage = totalWeight > 0 ? ((Number(ing.weightG) / totalWeight) * 100).toFixed(3) : "0";
      csvContent += `${ing.materialName};${ing.dilution};${ing.weightG.toString().replace('.', ',')};${percentage.replace('.', ',')}%\n`;
    });
    csvContent += `\nTOTALE;;${totalWeight.toFixed(3).replace('.', ',')}g;100%`;
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `${formula.name.replace(/\s+/g, '_')}_formula.csv`);
    link.click();
  };

  // --- 4. LOGICA ACCORDI ---
  
  const addAccordToFormula = (selectedAccord: Formula, targetWeight: number, explode: boolean) => {
    const originalTotalWeight = selectedAccord.ingredients.reduce((sum, ing) => sum + (Number(ing.weightG) || 0), 0);
    if (originalTotalWeight === 0) return;
    const factor = targetWeight / originalTotalWeight;
    if (explode) {
      const explodedIngredients = selectedAccord.ingredients.map(ing => ({
        ...ing,
        id: Math.random().toString(36).substr(2, 9),
        materialName: `${ing.materialName} (${selectedAccord.name})`,
        weightG: Number((Number(ing.weightG) * factor).toFixed(3))
      }));
      setFormula(prev => ({ ...prev, ingredients: [...prev.ingredients, ...explodedIngredients] }));
    } else {
      setFormula(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, { id: Math.random().toString(36).substr(2, 9), materialName: `ACCORDO: ${selectedAccord.name}`, weightG: targetWeight, dilution: "100%" }]
      }));
    }
  };

  const handleSelectAccord = (accord: Formula) => {
    const weightStr = window.prompt(`Quanto peso di "${accord.name}" vuoi aggiungere? (g)`, "1.000");
    if (!weightStr || isNaN(parseFloat(weightStr))) return;
    const explode = window.confirm(`Come vuoi aggiungere "${accord.name}"?\n\nOK: Esplodi nelle singole materie prime\nANNULLA: Mantieni come voce unica`);
    addAccordToFormula(accord, parseFloat(weightStr), explode);
    setIsSelecting(false);
  };

  // --- 5. LOGICA ARCHIVIO E CATEGORIE (Ottimizzata) ---

const archiveFormula = React.useCallback(() => {
  if (formula.ingredients.length === 0) return window.alert("La formula è vuota!");
  
  const name = window.prompt("Nome creazione:", formula.name);
  const category = window.prompt("In quale cartella vuoi salvarla? (es. MARINI, INVERNALI)", "GENERALE");
  
  if (!name || !category) return;

  const newEntry = { 
    ...formula, 
    id: 'formula-' + Date.now(), 
    name: name.toUpperCase(), 
    tag: category.toUpperCase().trim(), 
    date: new Date().toLocaleDateString() 
  };

  setHistory(prev => {
    const updated = [newEntry, ...prev];
    localStorage.setItem('perfume_lab_history', JSON.stringify(updated));
    return updated;
  });

  setFormula({ 
    id: 'current-draft', 
    name: 'NUOVA CREAZIONE', 
    ingredients: [], 
    date: new Date().toLocaleDateString(), 
    tag: 'LAB-01' 
  });

  window.alert("Formula archiviata correttamente!");
}, [formula, history]);

const loadFromHistory = React.useCallback((savedFormula: any) => {
  if (window.confirm(`Caricare "${savedFormula.name}"? Le modifiche non salvate alla formula corrente andranno perse.`)) {
    setFormula(savedFormula);
    setActiveSection('editor');
  }
}, []);

const deleteFromHistory = React.useCallback((id: string, e: React.MouseEvent) => {
  e.stopPropagation();
  if (window.confirm("Eliminare definitivamente questa formula dall'archivio?")) {
    setHistory(prev => {
      const updated = prev.filter(f => f.id !== id);
      localStorage.setItem('perfume_lab_history', JSON.stringify(updated));
      return updated;
    });
  }
}, []);
// --- LOGICA IA GEMINI ---
  // --- FUNZIONE IA GEMINI (VERSIONE FETCH) ---
  const handleAIQuery = async (queryText: string): Promise<boolean> => {
    if (!queryText || !queryText.trim()) return false;
    
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Manca la API Key nel file .env");
      return false;
    }

    setIsAiLoading(true);

    try {
      const db = (MATERIALS_DB as any);
      const availableMaterials = Object.keys(db).join(", ");
      
      const prompt = `Sei un Master Perfumer. Crea un accordo di profumeria basato su: "${queryText}".
      Usa SOLO questi materiali: [${availableMaterials}].
      Rispondi esclusivamente con un array JSON puro, senza markdown e senza testo prima o dopo.
      Esempio: [{"materialName": "ISO E SUPER", "weightG": 5.0, "dilution": "100%"}]`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Errore API");

      const aiText = data.candidates[0].content.parts[0].text;
      const jsonMatch = aiText.match(/\[.*\]/s);

      if (jsonMatch) {
        const rawIngredients = JSON.parse(jsonMatch[0]);
        const newIngredients = rawIngredients.map((item: any) => {
          const info = db[item.materialName] || {};
          return {
            id: Math.random().toString(36).substring(2, 9),
            materialName: item.materialName,
            weightG: String(item.weightG),
            dilution: item.dilution || "100%",
            notes: info.notes || "N/A",
            olfactiveFamily: info.olfactiveFamily || "Unknown",
            intensity: info.intensity || 5,
            ...info
          };
        });

        setFormula((prev: any) => ({
          ...prev,
          id: Date.now().toString(),
          name: queryText.toUpperCase(),
          ingredients: newIngredients
        }));

        console.log("✅ Formula creata con successo!");
        return true; // Segnala che ha finito con successo
      }
      return false;
    } catch (err: any) {
      console.error("Errore:", err);
      alert("Errore IA: " + err.message);
      return false;
    } finally {
      setIsAiLoading(false);
    }
  };
  // --- LOGICA DI CALCOLO ---
  const { analysis, alerts } = useMemo(() => {
    const familyTotals: Record<string, number> = {};
    let currentTotalWeight = 0; 
    const ifraAlerts: string[] = [];

    formula.ingredients.forEach(ing => {
      currentTotalWeight += Number(ing.weightG) || 0;
    });

    formula.ingredients.forEach(ing => {
      const mat = MATERIALS_DB[ing.materialName];
      if (mat) {
        const weight = Number(ing.weightG) || 0;
        const isSolvent = mat.Type === "Solvente";
        const ratio = isSolvent ? 1 : (DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1);
        const pureWeight = weight * ratio;

        if (currentTotalWeight > 0 && !isSolvent) {
          const concentration = (pureWeight / currentTotalWeight) * 100;
          if (mat.IFRA !== null && concentration > mat.IFRA) {
            ifraAlerts.push(ing.materialName);
          }
        }

        if (!isSolvent && mat.Families) {
          const impact = (mat as any).Impact || 100;
          const effectivePower = pureWeight * impact;
          Object.entries(mat.Families).forEach(([family, percentage]) => {
            familyTotals[family] = (familyTotals[family] || 0) + (effectivePower * (percentage as number) / 100);
          });
        }
      }
    });

    const scores = Object.values(familyTotals);
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const finalAnalysis = Object.entries(familyTotals)
      .map(([name, value]) => ({
        name,
        percentage: highestScore > 0 ? (value / highestScore) * 100 : 0
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return { analysis: finalAnalysis, alerts: ifraAlerts };
  }, [formula.ingredients]);

  const addMaterialToFormula = (materialName: string) => {
    const newId = Math.random().toString(36).substring(2, 9) + Date.now();
    const newIngredient: Ingredient = {
      id: newId,
      materialName,
      weightG: 0, 
      dilution: "100%" 
    };
    
    setFormula({ ...formula, ingredients: [...formula.ingredients, newIngredient] });
    setIsSelecting(false);
    setSelectorSearch('');

    setTimeout(() => {
      const inputs = document.querySelectorAll('input[type="number"]');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
        lastInput.select();
      }
    }, 50);
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans relative">
      
      {/* OVERLAY SELEZIONE MATERIE E ACCORDI */}
      {isSelecting && (
        <div className="fixed inset-0 z-50 bg-[#020617]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-4xl max-h-full rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            
            <header className="p-8 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white uppercase">Aggiungi alla Formula</h2>
              <button onClick={() => setIsSelecting(false)} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-400"><X size={24} /></button>
            </header>

            <div className="p-6 border-b border-slate-800">
              {/* TASTI TAB PER CAMBIARE VISTA */}
              <div className="flex gap-4 mb-5">
                <button 
                  onClick={() => setSelectorView('materials')}
                  className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${selectorView === 'materials' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  Materie Prime
                </button>
                <button 
                  onClick={() => setSelectorView('accords')}
                  className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${selectorView === 'accords' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  I Miei Accordi
                </button>
              </div>

              {/* BARRA DI RICERCA */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  autoFocus 
                  value={selectorSearch} 
                  onChange={(e) => setSelectorSearch(e.target.value)} 
                  placeholder={selectorView === 'materials' ? "Cerca materia..." : "Cerca accordo salvato..."} 
                  className="w-full bg-slate-900 border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white outline-none" 
                />
              </div>
            </div>

            {/* GRIGLIA RISULTATI DINAMICA */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              
              {selectorView === 'materials' ? (
                // MOSTRO LE MATERIE PRIME
                Object.entries(MATERIALS_DB)
                  .filter(([name]) => name.toLowerCase().includes(selectorSearch.toLowerCase()))
                  .map(([name, data]) => (
                    <button key={name} onClick={() => addMaterialToFormula(name)} className="p-4 bg-slate-800/40 hover:bg-blue-600/10 border border-slate-800 rounded-2xl group text-left">
                      <span className="text-white font-bold uppercase text-xs group-hover:text-blue-400">{name}</span>
                    </button>
                  ))
              ) : (
                // MOSTRO GLI ACCORDI DALL'ARCHIVIO
                history
                  .filter((accord) => accord.name.toLowerCase().includes(selectorSearch.toLowerCase()))
                  .map((accord) => (
                    <button
                      key={accord.id}
                      onClick={() => handleSelectAccord(accord)}
                      className="p-4 bg-slate-800/40 hover:bg-amber-500/10 border border-slate-800 rounded-2xl group text-left flex justify-between items-center"
                    >
                      <div>
                        <span className="text-white font-bold uppercase text-xs group-hover:text-amber-400">{accord.name}</span>
                        <p className="text-slate-500 text-[10px] mt-1">{accord.ingredients.length} componenti</p>
                      </div>
                      <Plus size={16} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))
              )}

            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR LATERALE */}
      <aside className="w-72 border-r border-slate-800 bg-slate-900/50 flex flex-col py-10 shrink-0 overflow-hidden">
        
        {/* LOGO AZIENDALE */}
        <div className="flex flex-col items-center w-full px-6 mb-8">
          <img 
            src="/logo.png" 
            className="w-28 h-28 object-contain mb-4 cursor-pointer hover:scale-105 transition-transform" 
            onClick={() => setActiveSection('editor')}
            alt="Logo"
          />
          <div className="w-16 h-0.5 bg-blue-500/30 rounded-full"></div>
        </div>

        {/* NAVIGAZIONE PRINCIPALE */}
        <nav className="w-full px-4 space-y-1 mb-8">
          {[
            { id: 'editor', icon: <Beaker size={16}/>, label: 'Editor' },
            { id: 'library', icon: <Book size={16}/>, label: 'Library' },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveSection(item.id as Section)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                activeSection === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-800'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
          {/* ARCHIVIO (Sotto il database per separare sourcing da storico) */}
          <button 
            onClick={() => setActiveSection('history')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
              activeSection === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <Search size={16}/> Archivio
          </button>
        </nav>

        {/* ANALISI OLFATTIVA (PROFILES) */}
        <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2 mx-6">
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-blue-500" />
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Profiles</h3>
            </div>
            {alerts.length > 0 && <AlertTriangle size={12} className="text-red-500 animate-pulse" />}
          </div>
          
          <div className="space-y-1.5 pl-2 pr-0">
            {analysis.map((fam) => (
              <div key={fam.name} className="flex items-center group h-4">
                <span className="w-16 text-right pr-2 text-[9px] font-bold text-slate-500 group-hover:text-slate-200 transition-colors truncate uppercase tracking-tighter">
                  {fam.name}
                </span>
                <div className="flex-1 h-full flex items-center relative">
                  <div className="h-[6px] rounded-r-sm transition-all duration-700 ease-out relative" 
                       style={{ width: `${fam.percentage}%`, backgroundColor: FAMILY_COLORS[fam.name as keyof typeof FAMILY_COLORS] || "#808080" }}>
                    <div className="absolute inset-y-0 right-0 w-[2px] bg-white/30 rounded-r-sm"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
     {/* MAIN CONTENT */}
<main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
  
  {/* AI COMMAND STATION (Sostituisce il vecchio Header) */}
<div className="max-w-7xl mx-auto mb-10">
  <div className="relative group">
    {/* Effetto bagliore soffuso dietro la barra */}
    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-[2rem] blur-xl opacity-50 group-focus-within:opacity-100 transition duration-1000"></div>
    
    <div className="relative flex items-center bg-slate-900/90 border border-slate-800 rounded-[2rem] backdrop-blur-2xl shadow-2xl">
      <div className="pl-6 text-blue-500">
        <Activity size={20} className="animate-pulse" />
      </div>
      
      <input 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === 'Enter') {
            // Aspettiamo che l'IA finisca
            const success = await handleAIQuery(searchTerm);
            if (success) {
              setSearchTerm(''); // SVUOTA LA BARRA
              setActiveSection('editor'); // CAMBIA SEZIONE
            }
          }
        }}
        className="bg-transparent text-white py-5 px-5 text-sm w-full outline-none font-medium placeholder:text-slate-600" 
        placeholder="Chiedi a Gemini: 'Crea un accordo marino' o 'Trova materiali ad alto impatto'..." 
      />
      
      <div className="pr-4">
        <button 
          type="button"
          onClick={async () => {
            const success = await handleAIQuery(searchTerm);
            if (success) {
              setSearchTerm(''); // SVUOTA LA BARRA
              setActiveSection('editor'); // CAMBIA SEZIONE
            }
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
        >
          Analizza con IA
        </button>
      </div>
    </div>
    {isAiLoading && (
  <div className="text-blue-500 text-sm animate-pulse mt-2">
    ✦ Gemini-2.5-flash sta elaborando la tua richiesta...
  </div>
)}
    
    {/* Status Badge */}
    <div className="absolute -bottom-6 left-6 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Gemini Engine Online</span>
    </div>
  </div>
</div>

<div className="max-w-7xl mx-auto">
    
    {/* 1. SEZIONE EDITOR */}
    {activeSection === 'editor' && (
      <FormulaEditor 
        formula={formula} 
        onUpdate={setFormula} 
        ifraAlerts={alerts} 
        onSave={archiveFormula} 
        onScale={scaleFormula}
        onExport={exportToExcel} 
        onOpenSelector={() => setIsSelecting(true)}
        onViewMaterial={(name: string) => setSelectedMaterialInfo(name)} 
      />
    )}
{activeSection === 'library' && (
  <div className="space-y-8 animate-in fade-in duration-500 pb-20">
    
    {/* HEADER RIMANE QUI (per gestire il tasto Aggiungi nell'app principale) */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 px-2">
      <div />
      <button 
        onClick={handleAddNewMaterial}
        className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 group active:scale-95"
      >
        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em]">Aggiungi Materiale</span>
      </button>
    </div>

    {/* LA LIBRERIA ORA È UN COMPONENTE ESTERNO "MEMOIZZATO" */}
    <MaterialLibrary 
      materialsDB={materialsDB}
      searchTerm={searchTerm}
      onSelectMaterial={(name) => {
        setSelectedMaterialInfo(name);
        setIsEditingMaterial(false);
      }}
      onDeleteMaterial={handleDeleteMaterial}
      familyColors={FAMILY_COLORS}
    />
  </div>
)}

    {/* 3. SEZIONE ARCHIVIO RAGGRUPPATO */}
    {activeSection === 'history' && (
  <FormulaArchive 
    history={history}
    searchTerm={searchTerm}
    deleteFromHistory={deleteFromHistory}
    loadFromHistory={loadFromHistory}
  />
)}

  </div> {/* CHIUSURA DEL MAIN CONTENT AREA (max-w-7xl) */}
</main> {/* CHIUSURA DEL MAIN TAG */}
{/* <---BLOCCO DEL MATERIALMODAL ---> */}
{selectedMaterialInfo && materialsDB[selectedMaterialInfo] && (
  <MaterialModal 
  materialName={selectedMaterialInfo}
  data={materialsDB[selectedMaterialInfo]}
  onClose={() => { setSelectedMaterialInfo(null); setIsEditingMaterial(false); }}
  onUpdate={updateMaterialData} // <-- Passa la funzione blindata
  isEditing={isEditingMaterial}
  setIsEditing={setIsEditingMaterial}
  setMaterialsDB={setMaterialsDB}
  setSelectedMaterialInfo={setSelectedMaterialInfo}
  updateFamilyValue={updateFamilyValue} // <-- Passa la funzione blindata
  toggleVolatility={toggleVolatility}   // <-- Passa la funzione blindata
  EditableField={EditableField}
  DescriptionEditor={DescriptionEditor}
/>
)}
  </div> // Chiude il div principale (max-w-7xl)
);
}

export default App;