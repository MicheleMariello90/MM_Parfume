import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import FormulaEditor from './FormulaEditor';
import { Formula, Ingredient } from './types';
import { FAMILY_COLORS, DILUTION_MAP } from './constants';
import { Beaker, Book, Search, Activity, AlertTriangle, X, Plus, Database, Trash2, ChevronRight, BookOpen, Menu } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import './index.css';

import MaterialModal from './MaterialModal';
import FormulaArchive from './FormulaArchive';
import MaterialLibrary from './MaterialLibrary';

type Section = 'editor' | 'library' | 'history' | 'settings';

// --- COMPONENTI DI SUPPORTO ORIGINALI ---
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

const DescriptionEditor = ({ initialValue, onSave, isReadOnly }: { initialValue: string, onSave: (val: string) => void, isReadOnly: boolean }) => {
  const [text, setText] = useState(initialValue);
  useEffect(() => { setText(initialValue); }, [initialValue]);

  return (
    <textarea
      readOnly={isReadOnly}
      className={`w-full bg-transparent text-lg text-slate-200 leading-snug italic border-none focus:ring-0 resize-none outline-none ${isReadOnly ? 'cursor-default' : 'cursor-text bg-white/5 rounded-lg p-2'}`}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onSave(text)}
      placeholder={!isReadOnly ? "Clicca per aggiungere note..." : "Nessuna nota."}
      rows={3}
    />
  );
};

const EditableField = ({ label, value, onSave, isReadOnly, type = "text", step = "1", colorClass = "text-slate-300" }: { 
  label: string, value: any, onSave: (val: any) => void, isReadOnly: boolean, type?: string, step?: string, colorClass?: string
}) => {
  const [tempValue, setTempValue] = useState(value);
  useEffect(() => { setTempValue(value); }, [value]);

  return (
    <div className={`bg-slate-950/50 p-5 rounded-2xl border ${!isReadOnly ? 'border-blue-500/30' : 'border-slate-800'} text-center transition-all`}>
      <p className="text-[7px] text-slate-500 uppercase font-bold mb-1 tracking-widest">{label}</p>
      <input 
        type={type} step={step} readOnly={isReadOnly}
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
  // --- 1. ZONA STATI ---
  const [activeSection, setActiveSection] = useState<Section>('editor');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectedMaterialInfo, setSelectedMaterialInfo] = useState<string | null>(null);
  const [selectorView, setSelectorView] = useState<'materials' | 'accords'>('materials');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(true); // Stato di caricamento Cloud
  
  // Database Cloud (sostituisce MATERIALS_DB locale)
  const [materialsDB, setMaterialsDB] = useState<Record<string, any>>({});
  const [isEditingMaterial, setIsEditingMaterial] = useState(false);

  const [formula, setFormula] = useState<Formula>({
  id: 'current-draft',
  name: 'NOME FORMULA',
  ingredients: [],
  date: new Date().toLocaleDateString(),
  tag: 'GENERALE',
  description: '',      // Inizializza vuoto
  maturation_days: 30   // Valore di default
});

  const [history, setHistory] = useState<Formula[]>([]);

  // --- 2. FETCH DATI DAL CLOUD (SUPABASE) ---
  const fetchCloudData = useCallback(async () => {
  setIsLoading(true);
  try {
    console.log("Inizio fetch materiali...");
    const { data: mats, error: matsError } = await supabase
      .from('materials')
      .select('*');

    if (matsError) throw matsError;

    if (mats) {
      console.log("Materiali grezzi ricevuti:", mats.length);
      
      const dbObj = mats.reduce((acc: any, m: any) => {
        // TRADUZIONE FONDAMENTALE: 
        // Trasformiamo i campi minuscoli di Supabase in quelli attesi dai tuoi componenti
        acc[m.name] = {
          ...m,
          name: m.name,
          // Se nel DB è 'volatility', l'app vuole 'Volatility' (maiuscolo)
          Volatility: m.volatility || 'N/A',
          // Se nel DB è 'families', l'app vuole 'Families'
          Families: m.families || {},
          // Se nel DB è 'description', l'app vuole 'Notes'
          Notes: m.description || m.notes || 'Nessuna descrizione.'
        };
        return acc;
      }, {});
      
      setMaterialsDB(dbObj);
      console.log("Materiali mappati con successo:", Object.keys(dbObj).length);
    }

    // Caricamento Formule
    const { data: forms } = await supabase
      .from('formulas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (forms) {
      setHistory(forms);
      console.log("Formule caricate:", forms.length);
    }

  } catch (e) {
    console.error("ERRORE DURANTE IL CARICAMENTO:", e);
  } finally {
    setIsLoading(false);
  }
}, []);
// --- NUOVA FUNZIONE SALVATAGGIO FORMULE ---
  const saveToHistory = async (formulaToSave: Formula) => {
  console.log("Inizio procedura di salvataggio...");
  
  try {
    // 1. RICHIESTA TAG (Cartella)
    const userTag = window.prompt("In quale CARTELLA (Tag) vuoi salvare? (es: FLOREALI, TEST, PROGETTI)", formulaToSave.tag || "GENERALE");
    if (userTag === null) {
      console.log("Salvataggio annullato dall'utente (Tag)");
      return; 
    }

    // 2. RICHIESTA MATURAZIONE
    const daysInput = window.prompt("Giorni di maturazione?", (formulaToSave.maturation_days || 30).toString());
    if (daysInput === null) {
      console.log("Salvataggio annullato dall'utente (Maturazione)");
      return;
    }
    const days = parseInt(daysInput) || 30;

    // Preparazione dati per Supabase
    const newEntry = {
      name: (formulaToSave.name || "Nuova Formula").toUpperCase(),
      ingredients: formulaToSave.ingredients || [], 
      description: formulaToSave.description || "",
      tag: userTag.toUpperCase().trim(),
      maturation_days: days,
      date: new Date().toLocaleDateString('it-IT'),
      created_at: new Date().toISOString()
    };

    console.log("Dati pronti per l'invio:", newEntry);

    const { error } = await supabase.from('formulas').insert([newEntry]);

    if (error) {
      console.error("Errore database:", error);
      throw error;
    }

    console.log("Salvataggio su Supabase riuscito!");
    await fetchCloudData(); 

    // 3. LOGICA CALENDARIO (con timeout per evitare blocchi pop-up del browser)
    setTimeout(() => {
      const confermaCal = window.confirm("Formula salvata! Vuoi aggiungere il promemoria al calendario?");
      if (confermaCal) {
        console.log("Apertura calendario in corso...");
        addToCalendar(newEntry.name, days);
      }
    }, 500);

    // Reset Editor
    setFormula({
      id: 'current-draft',
      name: 'NUOVA CREAZIONE',
      ingredients: [],
      date: new Date().toLocaleDateString('it-IT'),
      tag: 'GENERALE',
      description: '',
      maturation_days: 30
    });

  } catch (error: any) {
    console.error("Errore globale salvataggio:", error);
    alert("Si è verificato un errore: " + error.message);
  }
};
const addToCalendar = (name: string, days: number) => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  
  // Formato ISO corretto per Google: YYYYMMDD
  const isoDate = targetDate.toISOString().split('T')[0].replace(/-/g, "");
  
  const title = encodeURIComponent(`🧪 TEST: ${name}`);
  const details = encodeURIComponent(`La maturazione di ${name} è finita.`);
  
  // Link completo
  const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${isoDate}/${isoDate}&details=${details}&sf=true&output=xml`;
  
  console.log("URL Calendario generato:", url);
  window.open(url, '_blank');
};

const deleteFromHistory = async (id: string, e: React.MouseEvent) => {
  e.stopPropagation();
  if (window.confirm("Vuoi eliminare definitivamente questa formula dall'archivio?")) {
    const { error } = await supabase
      .from('formulas')
      .delete()
      .eq('id', id);

    if (!error) {
      await fetchCloudData();
    } else {
      alert("Errore durante l'eliminazione: " + error.message);
    }
  }
};

  useEffect(() => { fetchCloudData(); }, [fetchCloudData]);

  // --- 3. FUNZIONI DI AGGIORNAMENTO MATERIALI (CLOUD) ---
  const handleAddNewMaterial = useCallback(async () => {
  const tempName = window.prompt("Nome della nuova materia prima:");
  if (!tempName) return;
  const finalName = tempName.toUpperCase().trim();

  // Usa i nomi delle colonne esattamente come sono nel tuo SQL
  const newMaterial = { 
    name: finalName, 
    volatility: "Testa", 
    ifra: "100",        // Su DB è text
    min_usage: "0",     // Su DB è text
    max_usage: "100",   // Su DB è text
    avg_usage: "0",     // Su DB è text
    families: {} 
  };
  
  const { error } = await supabase.from('materials').insert([newMaterial]);
  
  if (!error) {
    await fetchCloudData();
    setSelectedMaterialInfo(finalName);
    setIsEditingMaterial(true);
  } else {
    console.error("Errore Supabase:", error);
    window.alert("Errore nella creazione: " + error.message);
  }
}, [fetchCloudData]);

  const updateMaterialData = useCallback(async (field: string, value: any) => {
  if (!selectedMaterialInfo || !field) return;

  // 1. Mappa il nome del campo React al nome della colonna Supabase
  const fieldMap: Record<string, string> = {
    'IFRA': 'ifra',
    'MinUsage': 'min_usage',
    'MaxUsage': 'max_usage',
    'AverageUsage': 'avg_usage',
    'Notes': 'notes',
    'Volatility': 'volatility',
    'Families': 'families',
    'PersonalDiary': 'personal_diary',
    'Impact': 'impact',
    'CAS': 'cas',
    'CostPerGram': 'cost_per_gram'
  };

  const dbColumn = fieldMap[field] || field.toLowerCase();
  
  // 2. Prepara il valore per il DB (converti in stringa se necessario per le tue colonne 'text')
  let dbValue = value;
  if (['ifra', 'min_usage', 'max_usage', 'avg_usage', 'cost_per_gram'].includes(dbColumn)) {
    dbValue = value?.toString();
  }

  // 3. Aggiornamento locale (per velocità UI)
  setMaterialsDB(prev => ({
    ...prev,
    [selectedMaterialInfo]: { ...prev[selectedMaterialInfo], [field]: value }
  }));

  // 4. Aggiornamento Cloud
  const { error } = await supabase
    .from('materials')
    .update({ [dbColumn]: dbValue })
    .eq('name', selectedMaterialInfo);

  if (error) console.error("Errore salvataggio:", error);
}, [selectedMaterialInfo]);

  const updateFamilyValue = useCallback((family: string, percent: number) => {
    if (!selectedMaterialInfo) return;
    const material = materialsDB[selectedMaterialInfo];
    const newFamilies = { ...(material.Families || {}) };
    if (percent <= 0) delete newFamilies[family];
    else newFamilies[family] = percent;
    
    updateMaterialData('Families', newFamilies);
  }, [selectedMaterialInfo, materialsDB, updateMaterialData]);

  const toggleVolatility = useCallback((note: string) => {
    if (!selectedMaterialInfo) return;
    const material = materialsDB[selectedMaterialInfo];
    let currentVol = material.Volatility || "";
    let parts = currentVol === "N/A" ? [] : currentVol.split('/').filter((p: string) => p !== "");
    
    if (parts.includes(note)) {
      parts = parts.filter((p: string) => p !== note);
    } else {
      parts.push(note);
    }
    const order = ["Testa", "Cuore", "Fondo"];
    parts.sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b));
    
    updateMaterialData('Volatility', parts.length > 0 ? parts.join('/') : "N/A");
  }, [selectedMaterialInfo, materialsDB, updateMaterialData]);

  const handleDeleteMaterial = useCallback(async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Eliminare definitivamente ${name}?`)) {
      await supabase.from('materials').delete().eq('name', name);
      fetchCloudData();
    }
  }, [fetchCloudData]);

  // --- 4. LOGICA FORMULA, EXCEL E SCALATURA (INVARIATA) ---
  
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

  // --- 5. LOGICA ACCORDI ---
  
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

  // --- 6. LOGICA ARCHIVIO (CLOUD) ---

  const archiveFormula = React.useCallback(async () => {
  if (formula.ingredients.length === 0) return window.alert("La formula è vuota!");
  
  // 1. Chiede il Nome (conferma quello attuale o lo cambia)
  const name = window.prompt("Nome della creazione:", formula.name);
  if (!name) return; 

  // 2. Chiede il Tag (La tua cartella)
  const category = window.prompt("In quale cartella/tag vuoi salvarla?", formula.tag || "GENERALE");
  if (!category) return;

  // 3. Chiede i Giorni di Maturazione
  const daysInput = window.prompt("Giorni di maturazione previsti?", (formula.maturation_days || 30).toString());
  const days = parseInt(daysInput || "30");

  const newEntry = {
    name: name.toUpperCase(),
    ingredients: formula.ingredients,
    tag: category.toUpperCase().trim(),
    description: formula.description || "",
    maturation_days: days,
    date: new Date().toLocaleDateString('it-IT'),
    created_at: new Date().toISOString() // Data precisa per il calcolo calendario
  };

  const { error } = await supabase.from('formulas').insert([newEntry]);

  if (!error) {
    window.alert("Formula archiviata con successo!");
    fetchCloudData();
    
    // ATTIVAZIONE CALENDARIO: Chiede conferma dopo il salvataggio
    if (window.confirm(`Vuoi aggiungere il promemoria per il ${new Date(Date.now() + days * 86400000).toLocaleDateString()} sul tuo calendario?`)) {
      addToCalendar(newEntry.name, days);
    }
    
    // Reset dell'editor per una nuova creazione
    setFormula({ 
      id: 'current-draft', 
      name: 'NUOVA CREAZIONE', 
      ingredients: [], 
      date: new Date().toLocaleDateString(), 
      tag: 'GENERALE',
      maturation_days: 30
    });
  } else {
    window.alert("Errore nel salvataggio su Supabase.");
  }
}, [formula, fetchCloudData]);

  const loadFromHistory = React.useCallback((savedFormula: any) => {
    if (window.confirm(`Caricare "${savedFormula.name}"? Le modifiche non salvate alla formula corrente andranno perse.`)) {
      setFormula(savedFormula);
      setActiveSection('editor');
    }
  }, []);
  // --- 7. LOGICA IA GEMINI (USANDO IL DB REATTIVO) ---
  const handleAIQuery = async (queryText: string): Promise<boolean> => {
    if (!queryText || !queryText.trim()) return false;
    
    /* // VECCHIA LOGICA DISATTIVATA PER SICUREZZA
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey){
      alert("Manca la API Key nel file .env");
      return false;
    }
    */

    setIsAiLoading(true);

    try {
      const availableMaterials = Object.keys(materialsDB).join(", ");
      
      const prompt = `Sei un Master Perfumer. Crea un accordo di profumeria basato su: "${queryText}".
      Usa SOLO questi materiali: [${availableMaterials}].
      Rispondi esclusivamente con un array JSON puro, senza markdown e senza testo prima o dopo.
      Esempio: [{"materialName": "ISO E SUPER", "weightG": 5.0, "dilution": "100%"}]`;

      const response = await fetch('/api/gemini', { 
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
});

// AGGIUNGI QUESTO LOG PER IL DEBUG
if (!response.ok) {
  const errorBody = await response.text(); 
  console.error("Il server ha risposto con:", errorBody);
  throw new Error(`Errore Server: ${response.status}`);
}

const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Errore API");

      const aiText = data.candidates[0].content.parts[0].text;
      const jsonMatch = aiText.match(/\[.*\]/s);

      if (jsonMatch) {
        const rawIngredients = JSON.parse(jsonMatch[0]);
        const newIngredients = rawIngredients.map((item: any) => {
          const info = materialsDB[item.materialName] || {};
          return {
            id: Math.random().toString(36).substring(2, 9),
            materialName: item.materialName,
            weightG: String(item.weightG),
            dilution: item.dilution || "100%",
            notes: info.Notes || "N/A",
            ...info
          };
        });

        setFormula((prev: any) => ({
          ...prev, id: Date.now().toString(), name: queryText.toUpperCase(), ingredients: newIngredients
        }));

        console.log("✅ Formula creata con successo!");
        return true;
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

  // --- 8. LOGICA DI CALCOLO (PIRAMIDE E AVVISI IFRA) ---
  const { analysis, alerts } = useMemo(() => {
    const familyTotals: Record<string, number> = {};
    let currentTotalWeight = 0; 
    const ifraAlerts: string[] = [];

    formula.ingredients.forEach(ing => {
      currentTotalWeight += Number(ing.weightG) || 0;
    });

    formula.ingredients.forEach(ing => {
      const mat = materialsDB[ing.materialName];
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
      .map(([name, value]) => ({ name, percentage: highestScore > 0 ? (value / highestScore) * 100 : 0 }))
      .sort((a, b) => b.percentage - a.percentage);

    return { analysis: finalAnalysis, alerts: ifraAlerts };
  }, [formula.ingredients, materialsDB]);

  const addMaterialToFormula = (materialName: string) => {
    const newIngredient: Ingredient = {
      id: Math.random().toString(36).substring(2, 9) + Date.now(),
      materialName, weightG: 0, dilution: "100%" 
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

  // Se i dati del database non sono ancora stati scaricati mostriamo il caricamento
  if (isLoading) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white font-black tracking-widest animate-pulse">
        Meriti ciò che sogni...
      </div>
    </div>
  );
}

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans relative">
      
      {/* 1. PULSANTE HAMBURGER (Solo Mobile) */}
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-[60] bg-blue-600 p-3 rounded-2xl shadow-lg border border-blue-400/30 text-white"
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* OVERLAY SELEZIONE MATERIE E ACCORDI */}
      {isSelecting && (
        <div className="fixed inset-0 z-[70] bg-[#020617]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-4xl max-h-full rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            
            <header className="p-8 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white uppercase">Aggiungi alla Formula</h2>
              <button onClick={() => setIsSelecting(false)} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-400"><X size={24} /></button>
            </header>

            <div className="p-6 border-b border-slate-800">
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

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectorView === 'materials' ? (
                Object.entries(materialsDB)
                  .filter(([name]) => name.toLowerCase().includes(selectorSearch.toLowerCase()))
                  .map(([name]) => (
                    <button key={name} onClick={() => addMaterialToFormula(name)} className="p-4 bg-slate-800/40 hover:bg-blue-600/10 border border-slate-800 rounded-2xl group text-left">
                      <span className="text-white font-bold uppercase text-xs group-hover:text-blue-400">{name}</span>
                    </button>
                  ))
              ) : (
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

      {/* 2. SIDEBAR LATERALE (Ora con classi responsive per il drawer) */}
      <aside className={`
        fixed md:relative z-50 h-full w-72 border-r border-slate-800 bg-slate-900 flex flex-col py-10 shrink-0 overflow-hidden transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* LOGO AZIENDALE */}
        <div className="flex flex-col items-center w-full px-6 mb-8">
          <img 
            src="/logo.png" 
            className="w-28 h-28 object-contain mb-4 cursor-pointer hover:scale-105 transition-transform" 
            onClick={() => { setActiveSection('editor'); setIsMenuOpen(false); }}
            alt="Logo Aura Lab"
          />
          <div className="w-16 h-0.5 bg-blue-500/30 rounded-full"></div>
        </div>

        <nav className="w-full px-4 space-y-1 mb-8">
          {[
            { id: 'editor', icon: <Beaker size={16}/>, label: 'Editor' },
            { id: 'library', icon: <Book size={16}/>, label: 'Library' },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setActiveSection(item.id as Section); setIsMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                activeSection === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-800'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
          <button 
            onClick={() => { setActiveSection('history'); setIsMenuOpen(false); }}
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

      {/* 3. OVERLAY DI SFONDO MOBILE (Chiude il menu toccando fuori) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* MAIN CONTENT */}
      {/* 4. Aggiunto padding-top per evitare sovrapposizioni con l'hamburger menu su mobile */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pt-20 md:pt-8">
        
        {/* AI COMMAND STATION */}
        <div className="max-w-7xl mx-auto mb-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-[2rem] blur-xl opacity-50 group-focus-within:opacity-100 transition duration-1000"></div>
            
            <div className="relative flex items-center bg-slate-900/90 border border-slate-800 rounded-[2rem] backdrop-blur-2xl shadow-2xl">
              <div className="pl-6 text-blue-500 hidden sm:block">
                <Activity size={20} className="animate-pulse" />
              </div>
              
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const success = await handleAIQuery(searchTerm);
                    if (success) {
                      setSearchTerm(''); 
                      setActiveSection('editor'); 
                    }
                  }
                }}
                className="bg-transparent text-white py-4 px-4 sm:py-5 sm:px-5 text-xs sm:text-sm w-full outline-none font-medium placeholder:text-slate-600" 
                placeholder="Chiedi a Gemini..." 
              />
              
              <div className="pr-2 sm:pr-4">
                <button 
                  type="button"
                  onClick={async () => {
                    const success = await handleAIQuery(searchTerm);
                    if (success) {
                      setSearchTerm(''); 
                      setActiveSection('editor'); 
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20 whitespace-nowrap"
                >
                  Analizza
                </button>
              </div>
            </div>
            {isAiLoading && (
              <div className="text-blue-500 text-xs sm:text-sm animate-pulse mt-2 ml-4">
                ✦ Elaborazione...
              </div>
            )}
            
            <div className="absolute -bottom-6 left-6 flex items-center gap-2 hidden sm:flex">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Database Cloud Sincronizzato</span>
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
              onSave={saveToHistory} 
              onScale={scaleFormula}
              onExport={exportToExcel} 
              onOpenSelector={() => setIsSelecting(true)}
              onViewMaterial={(name: string) => setSelectedMaterialInfo(name)} 
            />
          )}

          {/* 2. SEZIONE LIBRARY */}
          {activeSection === 'library' && (
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 px-2">
                <div />
                <button 
                  onClick={handleAddNewMaterial}
                  className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 group active:scale-95 w-full md:w-auto justify-center"
                >
                  <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Aggiungi Materiale</span>
                </button>
              </div>

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
        </div>
      </main> 

      {/* <---BLOCCO DEL MATERIALMODAL ---> */}
      {selectedMaterialInfo && materialsDB[selectedMaterialInfo] && (
        <MaterialModal 
          materialName={selectedMaterialInfo}
          data={materialsDB[selectedMaterialInfo]}
          onClose={() => { setSelectedMaterialInfo(null); setIsEditingMaterial(false); }}
          onUpdate={updateMaterialData} 
          isEditing={isEditingMaterial}
          setIsEditing={setIsEditingMaterial}
          setMaterialsDB={setMaterialsDB}
          setSelectedMaterialInfo={setSelectedMaterialInfo}
          updateFamilyValue={updateFamilyValue} 
          toggleVolatility={toggleVolatility}   
          EditableField={EditableField}
          DescriptionEditor={DescriptionEditor}
        />
      )}
    </div>
  );
  } 

export default App;