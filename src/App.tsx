import React, { useState, useMemo } from 'react';
import FormulaEditor from './FormulaEditor';
import { Formula, Ingredient } from './types';
import { MATERIALS_DB, FAMILY_COLORS, DILUTION_MAP } from './constants';
import { Beaker, Book, Search, Activity, AlertTriangle, X, Plus } from 'lucide-react';
import './index.css';

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

function App() {
  const [activeSection, setActiveSection] = useState<Section>('editor');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectedMaterialInfo, setSelectedMaterialInfo] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  // NUOVO STATO: Gestisce quale scheda stiamo guardando nel selettore
  const [selectorView, setSelectorView] = useState<'materials' | 'accords'>('materials');

// Funzione per aprire/chiudere
const toggleCategory = (cat: string) => {
  setOpenCategories(prev => ({
    ...prev,
    [cat]: !prev[cat]
  }));
};

  const [formula, setFormula] = useState<Formula>({
    id: 'current-draft',
    name: 'MIA PRIMA CREAZIONE',
    ingredients: [],
    date: new Date().toLocaleDateString(),
    tag: 'LAB-01'
  });

  // --- STATO E LOGICA ARCHIVIO ---
  const [history, setHistory] = useState<Formula[]>(() => {
    const localData = localStorage.getItem('perfume_lab_history');
    return localData ? JSON.parse(localData) : [];
  });
 // --- LOGICA DI SCALATURA (VERSIONE DEFINITIVA) ---
  const scaleFormula = () => {
    const totalAmount = formula.ingredients.reduce((sum, ing) => sum + (Number(ing.weightG) || 0), 0);
    
    if (totalAmount === 0) {
      window.alert("La formula è vuota! Aggiungi peso agli ingredienti per poter scalare.");
      return;
    }

    const targetAmountStr = window.prompt(
      `Peso attuale: ${totalAmount.toFixed(3)}g. Inserisci il nuovo peso totale desiderato (g):`, 
      totalAmount.toString()
    );
    
    if (targetAmountStr && !isNaN(parseFloat(targetAmountStr))) {
      const targetAmount = parseFloat(targetAmountStr);
      const factor = targetAmount / totalAmount;

      const scaledIngredients = formula.ingredients.map(ing => ({
        ...ing,
        // Convertiamo il risultato di toFixed in Numero per soddisfare il tipo 'number'
        weightG: Number((Number(ing.weightG) * factor).toFixed(3)) 
      }));

      setFormula({
        ...formula,
        ingredients: scaledIngredients
      });
    }
  };
  //LOGICA ESPORTAZIONE EXCEL
  const exportToExcel = () => {
  if (formula.ingredients.length === 0) {
    window.alert("La formula è vuota!");
    return;
  }

  const totalWeight = formula.ingredients.reduce((acc, ing) => acc + (Number(ing.weightG) || 0), 0);

  // Riga speciale per forzare Excel a usare il punto e virgola come separatore
  let csvContent = "sep=;\n"; 
  csvContent += "Materia Prima;Diluizione;Peso (g);Percentuale (%)\n";

  formula.ingredients.forEach(ing => {
    const percentage = totalWeight > 0 ? ((Number(ing.weightG) / totalWeight) * 100).toFixed(3) : "0";
    // Usiamo il punto e virgola tra i campi e sostituiamo il punto decimale con la virgola per Excel italiano
    const peso = ing.weightG.toString().replace('.', ',');
    const perc = percentage.replace('.', ',');
    
    csvContent += `${ing.materialName};${ing.dilution};${peso};${perc}%\n`;
  });

  csvContent += `\nTOTALE;;${totalWeight.toFixed(3).replace('.', ',')}g;100%`;

  // Encoding UTF-8 con BOM per supportare accenti e simboli speciali
  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${formula.name.replace(/\s+/g, '_')}_formula.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
// --- LOGICA INSERIMENTO ACCORDI DALL'ARCHIVIO ---
  const addAccordToFormula = (selectedAccord: Formula, targetWeight: number, explode: boolean) => {
    // 1. Calcoliamo il peso totale dell'accordo originale per scalare correttamente
    const originalTotalWeight = selectedAccord.ingredients.reduce(
      (sum, ing) => sum + (Number(ing.weightG) || 0), 0
    );
    
    if (originalTotalWeight === 0) return;
    const factor = targetWeight / originalTotalWeight;

    if (explode) {
      // 2a. Caso ESPLOSO: Trasforma l'accordo in singole materie prime
      const explodedIngredients = selectedAccord.ingredients.map(ing => ({
        ...ing,
        id: Math.random().toString(36).substr(2, 9), // Nuovo ID unico
        // Aggiunge il riferimento dell'accordo tra parentesi come richiesto
        materialName: `${ing.materialName} (${selectedAccord.name})`,
        weightG: Number((Number(ing.weightG) * factor).toFixed(3))
      }));

      setFormula(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, ...explodedIngredients]
      }));
    } else {
      // 2b. Caso UNICO: Aggiunge l'accordo come se fosse una materia prima singola
      const newIngredient = {
        id: Math.random().toString(36).substr(2, 9),
        materialName: `ACCORDO: ${selectedAccord.name}`,
        weightG: targetWeight,
        dilution: "100%" as const,
      };

      setFormula(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, newIngredient]
      }));
    }
  };

  // Funzione "ponte" che useremo nel selettore
  const handleSelectAccord = (accord: Formula) => {
    const weightStr = window.prompt(`Quanto peso di "${accord.name}" vuoi aggiungere? (g)`, "1.000");
    if (!weightStr || isNaN(parseFloat(weightStr))) return;
    
    const weight = parseFloat(weightStr);
    const explode = window.confirm(
      `Come vuoi aggiungere "${accord.name}"?\n\n` +
      `OK: Esplodi nelle singole materie prime\n` +
      `ANNULLA: Mantieni come voce unica`
    );

    addAccordToFormula(accord, weight, explode);
    setIsSelecting(false); // Chiude il selettore dopo l'aggiunta
  };

  // --- LOGICA ARCHIVIAZIONE E RESET ---
  const archiveFormula = () => {
    // 1. Controllo sicurezza
    if (formula.ingredients.length === 0) {
      window.alert("La formula è vuota! Aggiungi almeno un ingrediente prima di archiviare.");
      return;
    }
    
    // 2. Chiedo il Nome (Prompt 1)
    const name = window.prompt("Inserisci il nome della creazione da archiviare:", formula.name);
    if (!name) return;

    // 3. Chiedo la Categoria/Cartella (Prompt 2)
    // Ho messo "GENERALE" come valore predefinito
    const category = window.prompt("In quale cartella vuoi salvarla? (es: MARINI, FLOREALI, LEGNOSI)", "GENERALE");
    if (!category) return;

    const newEntry: Formula = {
      ...formula,
      id: 'formula-' + Date.now(),
      name: name.toUpperCase(),
      tag: category.toUpperCase().trim(), // La categoria viene salvata qui
      date: new Date().toLocaleDateString()
    };

    // 4. Salva nell'archivio (History)
    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('perfume_lab_history', JSON.stringify(updatedHistory));

    // 5. SVUOTA L'EDITOR (Reset totale)
    setFormula({
      id: 'current-draft',
      name: 'NUOVA CREAZIONE',
      ingredients: [],
      date: new Date().toLocaleDateString(),
      tag: 'LAB-01'
    });

    window.alert(`Formula archiviata con successo nella cartella "${category.toUpperCase()}"`);
  };

  const loadFromHistory = (savedFormula: Formula) => {
    if (window.confirm(`Caricare "${savedFormula.name}"? Le modifiche attuali non salvate andranno perse.`)) {
      setFormula(savedFormula);
      setActiveSection('editor'); // Ti riporta all'editor dopo il caricamento
    }
  };

  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Eliminare definitivamente questa formula dall'archivio?")) {
      const updated = history.filter(f => f.id !== id);
      setHistory(updated);
      localStorage.setItem('perfume_lab_history', JSON.stringify(updated));
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
            { id: 'history', icon: <Search size={16}/>, label: 'Archivio' },
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
        {/* Header con Titolo dinamico e Cerca */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em]">Laboratory System</h2>
            <p className="text-white text-xl font-black tracking-tight mt-1 uppercase">
              {activeSection === 'editor' && 'Workstation'}
              {activeSection === 'library' && 'Material Library'}
              {activeSection === 'history' && 'Formula Archive'}
            </p>
          </div>

          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900/50 border-slate-800 text-slate-300 rounded-2xl py-2.5 pl-10 pr-4 text-[11px] w-full focus:ring-2 focus:ring-blue-500/20 border outline-none transition-all font-bold tracking-wide" 
              placeholder="Cerca..." 
            />
          </div>
        </header>

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
    onViewMaterial={(name) => setSelectedMaterialInfo(name)} 
  />
)}

          {/* 2. SEZIONE LIBRARY (MATERIE PRIME) */}
          {activeSection === 'library' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
              {Object.entries(MATERIALS_DB)
                .filter(([name]) => name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(([name, data]) => (
                  <div 
                    key={name} 
                    onClick={() => setSelectedMaterialInfo(name)} 
                    className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/40 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-black text-white uppercase truncate pr-2 group-hover:text-blue-400">{name}</h4>
                      <span className="text-[7px] px-2 py-0.5 rounded-md font-black bg-slate-800 text-slate-400 uppercase">{data.Type}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-4 italic line-clamp-2">{data.Notes}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(data.Families || {}).map(f => (
                        <span key={f} className="text-[6px] px-2 py-0.5 rounded-full font-bold text-white uppercase" style={{ backgroundColor: FAMILY_COLORS[f as keyof typeof FAMILY_COLORS] || '#808080' }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* 3. SEZIONE ARCHIVIO RAGGRUPPATO PER CARTELLE */}
          {activeSection === 'history' && (
            <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
              {history.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-30">
                  <Search size={48} className="mx-auto mb-4 text-slate-700" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Nessuna formula nell'archivio</p>
                </div>
              ) : (
                // LOGICA DI RAGGRUPPAMENTO: Unisce i tag simili pulendo gli spazi
                Object.entries(
                  history.reduce((acc, f) => {
                    const categoryName = (f.tag || 'GENERALE').trim().toUpperCase();
                    if (!acc[categoryName]) acc[categoryName] = [];
                    acc[categoryName].push(f);
                    return acc;
                  }, {} as Record<string, Formula[]>)
                )
                .sort(([a], [b]) => a.localeCompare(b)) // Ordina cartelle A-Z
                .map(([category, formulas]) => {
                  // Filtriamo le formule all'interno della cartella in base alla ricerca
                  const filteredFormulas = formulas.filter(f => 
                    f.name.toLowerCase().includes(searchTerm.toLowerCase())
                  );

                  // Se la ricerca non trova nulla in questa cartella, non la mostriamo
                  if (filteredFormulas.length === 0 && searchTerm !== "") return null;

                  return (
                    <div key={category} className="space-y-6">
                      {/* Header della Cartella */}
                      <div className="flex items-center gap-4 px-2">
                        <div className="h-px w-8 bg-blue-500/40"></div>
                        <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] flex items-center gap-3">
                          <span className="text-sm">📂</span> {category}
                          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[8px] border border-slate-700">
                            {formulas.length}
                          </span>
                        </h3>
                        <div className="h-px flex-1 bg-slate-800/50"></div>
                      </div>

                      {/* Griglia Formule dentro la cartella */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredFormulas.map((h) => (
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
                                {h.ingredients.length} Materie
                              </span>
                              <button 
                                onClick={() => loadFromHistory(h)}
                                className="bg-white text-black text-[9px] font-black uppercase px-6 py-3 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-xl active:scale-95"
                              >
                                Carica
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL DETTAGLI MATERIA PRIMA */}
{selectedMaterialInfo && MATERIALS_DB[selectedMaterialInfo] && (() => {
  const data = MATERIALS_DB[selectedMaterialInfo] as any;
  
  // Logica per colorare le sezioni del triangolo
  const isTop = data.Volatility?.includes("Testa");
  const isHeart = data.Volatility?.includes("Cuore");
  const isBase = data.Volatility?.includes("Fondo");

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-md flex items-center justify-center p-6 text-slate-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-8 border-b border-slate-800 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{selectedMaterialInfo}</h2>
            <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Technical Data Sheet</p>
          </div>
          <button onClick={() => setSelectedMaterialInfo(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[500px]">
          
          {/* COLONNA SINISTRA: DATI TECNICI */}
          <div className="space-y-6 flex flex-col">
            {/* PRIME INFO: CAS E COSTO */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 text-center">
                <p className="text-[7px] text-slate-500 uppercase font-bold mb-1 tracking-widest">CAS Number</p>
                <p className="text-sm font-mono text-slate-300">{data.CAS || 'N/A'}</p>
              </div>
              <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 text-center">
                <p className="text-[7px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Costo al g</p>
                <p className="text-sm font-mono text-emerald-400">€{data.CostPerGram?.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            {/* NUOVI PARAMETRI TECNICI: BP, VP, IMPACT */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-center">
                <p className="text-[7px] text-slate-400 uppercase font-bold mb-1 tracking-widest">BP</p>
                <p className="text-xs font-mono text-blue-300">{data.BP ? `${data.BP}°C` : 'N/A'}</p>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-center">
                <p className="text-[7px] text-slate-400 uppercase font-bold mb-1 tracking-widest">VP</p>
                <p className="text-xs font-mono text-purple-300">{data.VP || 'N/A'}</p>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-center">
                <p className="text-[7px] text-slate-400 uppercase font-bold mb-1 tracking-widest">Impact</p>
                <p className="text-xs font-mono text-orange-400 font-black">{data.Impact || 'N/A'}</p>
              </div>
            </div>

            {/* BOX PARAMETRI USAGE */}
            <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-slate-800">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-800 pb-2 text-center">Regulatory Limits</h4>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Min</p>
                  <p className="text-xl font-black text-blue-400">{data.MinUsage || '0'}%</p>
                </div>
                <div className="border-x border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Avg</p>
                  <p className="text-xl font-black text-emerald-400">{data.AverageUsage || '0'}%</p>
                </div>
                <div className="border-r border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Max</p>
                  <p className="text-xl font-black text-orange-400">{data.MaxUsage || '0'}%</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">IFRA</p>
                  <p className={`text-xl font-black ${data.IFRA < 100 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                    {data.IFRA}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* COLONNA DESTRA: DESCRIZIONE OLFATTIVA E PIRAMIDE */}
          <div className="flex flex-col h-full">
            <div className="flex-1 bg-slate-950/30 rounded-[2.5rem] border border-slate-800 p-10 relative flex gap-8 items-start">
              
              {/* MINI PIRAMIDE TRIANGOLARE */}
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-16 h-16 relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                    {/* Background triangolo */}
                    <path d="M50 5 L95 95 L5 95 Z" fill="none" stroke="#1e293b" strokeWidth="2" />
                    {/* Sezione Testa */}
                    <path d="M50 5 L63 35 L37 35 Z" 
                      className={`transition-all duration-700 ${isTop ? 'fill-blue-500 stroke-blue-400' : 'fill-slate-800/20 stroke-slate-800'}`} 
                    />
                    {/* Sezione Cuore */}
                    <path d="M37 35 L63 35 L76 65 L24 65 Z" 
                      className={`transition-all duration-700 ${isHeart ? 'fill-emerald-500 stroke-emerald-400' : 'fill-slate-800/20 stroke-slate-800'}`} 
                    />
                    {/* Sezione Fondo */}
                    <path d="M24 65 L76 65 L90 95 L10 95 Z" 
                      className={`transition-all duration-700 ${isBase ? 'fill-amber-600 stroke-amber-500' : 'fill-slate-800/20 stroke-slate-800'}`} 
                    />
                  </svg>
                </div>
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-tighter mt-2">{data.Volatility || 'N/A'}</span>
              </div>

              {/* TESTO DESCRIZIONE */}
              <div className="flex-1 border-l border-slate-800/50 pl-8">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Olfactive Description</h4>
                <p className="text-xl text-slate-200 leading-relaxed italic">
                  {data.Notes || 'No description available.'}
                </p>

                {/* TAG FAMIGLIE (opzionale, se presenti nel DB) */}
                {data.Families && (
                  <div className="flex gap-2 mt-6 flex-wrap">
                    {Object.entries(data.Families).map(([fam, val]) => (
                      <span key={fam} className="px-2 py-1 bg-slate-800/30 rounded-md text-[8px] font-bold text-slate-500 uppercase border border-slate-800/50">
                        {fam} {val as number}%
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
})()}
    </div>
  );
}

export default App;