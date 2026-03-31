import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import FormulaEditor from './FormulaEditor';
import { Formula, Ingredient } from './types';
import { FAMILY_COLORS, DILUTION_MAP } from './constants';
import { Book, Search, Activity, AlertTriangle, X, Plus, Menu, Droplets, FlaskConical } from 'lucide-react';
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
      
      // 1. Caricamento Materiali
      const { data: mats, error: matsError } = await supabase
        .from('materials')
        .select('*');

      if (matsError) throw matsError;

      if (mats) {
        console.log("Materiali grezzi ricevuti:", mats.length);
        
        const dbObj = mats.reduce((acc: any, m: any) => {
          acc[m.name] = {
            ...m, // Include l'id originale e tutti i campi
            name: m.name,
            id: m.id, // Esplicitiamo l'ID per il tasto cancella
            Type: m.type || 'Material', //

            // TRADUZIONE CAMPI PER IL MODALE
            Volatility: m.volatility || 'N/A',
            Families: typeof m.families === 'string' ? JSON.parse(m.families || '{}') : (m.families || {}),
            Notes: m.description || m.notes || 'Nessuna descrizione.',
            
            // CAMPI TECNICI:
            BP: m.bp || '',
            VP: m.vp || '',
            ODT: m.impact || '', // Mappiamo la colonna 'impact' del DB sulla proprietà 'ODT' dell'app
            
            // CAMPI REGULATORY:
           // Usiamo parseFloat per essere sicuri che l'Editor riceva un numero e non una stringa
           IFRA: (m.ifra !== null && m.ifra !== undefined) ? parseFloat(m.ifra) : 0,

           // Se hai anche queste colonne su Supabase, mappiamole bene:
          MinUsage: m.min_usage ? parseFloat(m.min_usage) : 0,
          AvgUsage: m.avg_usage ? parseFloat(m.avg_usage) : 0,
          MaxUsage: m.max_usage ? parseFloat(m.max_usage) : 100, // Default 100% se non specificato
            
            // ALTRI DETTAGLI:
            CAS: m.cas || '',
            CostPerGram: m.cost_per_gram || '',
            PersonalDiary: m.personal_diary || ''
          };
          return acc;
        }, {}); // <--- Qui si chiude il reduce correttamente

        setMaterialsDB(dbObj);
        console.log("Materiali mappati con successo:", Object.keys(dbObj).length);
      }

      // 2. Caricamento Formule
      const { data: forms, error: formsError } = await supabase
        .from('formulas')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (formsError) throw formsError;

      if (forms) {
        setHistory(forms);
        console.log("Formule caricate:", forms.length);
      }

    } catch (e) {
      console.error("ERRORE DURANTE IL CARICAMENTO:", e);
    } finally {
      setIsLoading(false);
    }
  }, []); // <--- Qui si chiude la useCallback correttamente
// --- NUOVA FUNZIONE SALVATAGGIO FORMULE ---
  const saveToHistory = async (formulaToSave: Formula) => {
  try {
    // 1. RICHIESTA TAG
    const userTag = window.prompt("In quale CARTELLA vuoi salvare?", formulaToSave.tag || "GENERALE");
    if (userTag === null) return; 

    // 2. RICHIESTA MATURAZIONE (Forzata)
    const daysInput = window.prompt("Giorni di maturazione?", "30");
    if (daysInput === null) return;
    
    // TRUCCO: Se l'utente non scrive nulla, usiamo 30 come paracadute
    const finalDays = parseInt(daysInput) || 30;

    const newEntry = {
      name: (formulaToSave.name || "Nuova Formula").toUpperCase(),
      // Pulisci i dati per Supabase forzando le stringhe
      ingredients: formulaToSave.ingredients.map(ing => ({
        id: String(ing.id),
        materialName: String(ing.materialName),
        weightG: String(ing.weightG), 
        dilution: String(ing.dilution)
      })),
      description: formulaToSave.description || "",
      tag: userTag.toUpperCase().trim(),
      maturation_days: finalDays, // Qui passiamo il numero pulito
      date: new Date().toLocaleDateString('it-IT'),
      created_at: new Date().toISOString()
    };

    console.log("Tentativo invio a Supabase...", newEntry);

    const { error } = await supabase.from('formulas').insert([newEntry]);

    if (error) throw error;

    alert("✅ Formula salvata con successo!");
    await fetchCloudData(); 

    // 3. LOGICA CALENDARIO (con timeout per evitare blocchi pop-up del browser)
    setTimeout(() => {
      const confermaCal = window.confirm("Formula salvata! Vuoi aggiungere il promemoria al calendario?");
      if (confermaCal) {
        console.log("Apertura calendario in corso...");
        // CORRETTO QUI: usiamo finalDays
        addToCalendar(newEntry.name, finalDays);
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

  // Inseriamo i valori come NUMERI (senza virgolette) perché il DB ora è numerico
  const newMaterial = { 
    name: finalName, 
    volatility: "Testa", 
    ifra: 100,
    min_usage: 0,
    max_usage: 100,
    avg_usage: 0,
    bp: 0,
    vp: 0,
    impact: 0,
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

  const fieldMap: Record<string, string> = {
    'IFRA': 'ifra',
    'MinUsage': 'min_usage',
    'MaxUsage': 'max_usage',
    'AvgUsage': 'avg_usage',
    'Notes': 'notes',
    'Volatility': 'volatility',
    'Families': 'families',
    'PersonalDiary': 'personal_diary',
    'ODT': 'impact',
    'Impact': 'impact',
    'CAS': 'cas',
    'CostPerGram': 'cost_per_gram',
    'BP': 'bp',
    'VP': 'vp',
    'Description': 'notes',
  };

  const dbColumn = fieldMap[field] || field.toLowerCase();
  
  // LOGICA DI PULIZIA: Se il campo deve essere numerico, gestiamo la virgola
  let dbValue = value;
  const numericFields = ['ifra', 'min_usage', 'max_usage', 'avg_usage', 'impact', 'bp', 'vp', 'cost_per_gram'];

  if (numericFields.includes(dbColumn)) {
    // Trasforma "0,5" in 0.5 (numero)
    const stringValue = String(value).replace(',', '.');
    dbValue = parseFloat(stringValue);
    
    if (isNaN(dbValue)) dbValue = 0; 
  }

  // Aggiornamento locale immediato
  setMaterialsDB(prev => ({
    ...prev,
    [selectedMaterialInfo]: { ...prev[selectedMaterialInfo], [field]: dbValue }
  }));

  // Aggiornamento Cloud
  const { error } = await supabase
    .from('materials')
    .update({ [dbColumn]: dbValue })
    .eq('name', selectedMaterialInfo);

  if (error) {
    console.error("Errore salvataggio Cloud:", error);
  }
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

const handleDeleteMaterial = useCallback(async (id: any, e: React.MouseEvent) => {
  e.stopPropagation();

  const numericId = Number(id);
  if (isNaN(numericId)) {
    alert("Errore: ID materiale non valido.");
    return;
  }

  if (window.confirm(`Eliminare definitivamente questo materiale?`)) {
    try {
      // 1. ELIMINA DAL CLOUD
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', numericId);

      if (error) throw error;

      // 2. FORZA IL REFRESH TOTALE DAL CLOUD
      // Invece di calcolare noi cosa eliminare nello stato locale, 
      // chiediamo a Supabase la lista aggiornata. È più lento di un millisecondo, 
      // ma è INFALLIBILE e non genera errori di codice.
      await fetchCloudData();
      
      console.log("Materiale eliminato e lista sincronizzata.");

    } catch (err: any) {
      console.error("Errore eliminazione:", err);
      alert("Errore durante l'eliminazione: " + err.message);
    }
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
    
    // Peso totale del liquido (tutto ciò che versi)
    const totalLordo = formula.ingredients.reduce((acc, ing) => acc + (Number(ing.weightG) || 0), 0);
    
    let csvContent = "sep=;\n" + "Materia Prima;Diluizione;Peso Lordo (g);Percentuale Assoluta (%)\n";
    
    formula.ingredients.forEach(ing => {
      const ratio = DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1;
      const pureWeight = (Number(ing.weightG) || 0) * ratio;
      
      // Calcolo percentuale (Puro su Lordo Totale)
      const percentage = totalLordo > 0 ? ((pureWeight / totalLordo) * 100).toFixed(3) : "0";
      
      csvContent += `${ing.materialName};${ing.dilution};${ing.weightG.toString().replace('.', ',')};${percentage.replace('.', ',')}%\n`;
    });

    // Calcolo concentrazione totale del mix
    const totalPuro = formula.ingredients.reduce((acc, ing) => {
        const r = DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1;
        return acc + (Number(ing.weightG) || 0) * r;
    }, 0);
    const totalConcPercentage = totalLordo > 0 ? ((totalPuro / totalLordo) * 100).toFixed(2) : "0.00";

    csvContent += `\nTOTALE;;${totalLordo.toFixed(3).replace('.', ',')}g;${totalConcPercentage.replace('.', ',')}% (Concentrato)`;
    
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

      const response = await fetch('/api/gemini', { // NIENTE .js finale
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contents: [{
      parts: [{ text: prompt }]
    }]
  })
});

const data = await response.json();

// 1. Log fondamentale per il debug: guarda la console di Chrome (F12)
console.log("Risposta completa dal server:", data);

if (!response.ok) {
  throw new Error(data.error?.message || "Errore del server");
}

// 2. Estrazione sicura con il punto di domanda (?.)
const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

if (!aiText) {
  // Se arriviamo qui, Gemini ha risposto ma non c'è testo (es. bloccato dai filtri)
  console.error("Struttura dati non valida:", data);
  throw new Error("L'IA non ha restituito una risposta valida. Controlla la console.");
}
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

  // --- 8. LOGICA DI CALCOLO AGGIORNATA (ODT-BASED) ---
const { analysis, alerts } = useMemo(() => {
  const familyTotals: Record<string, number> = {};
  let currentTotalWeight = 0; 
  const ifraAlerts: string[] = [];

  // Calcolo peso totale per IFRA
  formula.ingredients.forEach(ing => {
    currentTotalWeight += Number(String(ing.weightG).replace(',', '.')) || 0;
  });

  formula.ingredients.forEach(ing => {
    const mat = materialsDB[ing.materialName];
    if (mat) {
      const weight = Number(String(ing.weightG).replace(',', '.')) || 0;
      const isSolvent = mat.Type === "Solvente";
      const ratio = DILUTION_MAP[ing.dilution as keyof typeof DILUTION_MAP] || 1;
      const pureWeight = weight * ratio;

      // Controllo IFRA (rimane basato sul peso, corretto così)
      if (currentTotalWeight > 0 && !isSolvent) {
        const concentration = (pureWeight / currentTotalWeight) * 100;
        if (mat.IFRA !== null && concentration > mat.IFRA) {
          ifraAlerts.push(ing.materialName);
        }
      }

      // --- LOGICA IMPACT + BP (VOLATILITÀ) ---
      if (!isSolvent && mat.Families) {
        // 1. Recupero Impact (Forza) - Default 10
        const impactVal = parseFloat(mat.impact || mat.Impact || mat.ODT || 10);
        
        // 2. Recupero BP (Persistenza) - Se manca usiamo 250 come standard
        // Nota: usiamo Number() per sicurezza se il dato arriva come stringa
        const rawBP = mat.BP || mat.bp || 250;
        const bpVal = Number(String(rawBP).replace(',', '.'));

        // 3. CALCOLO POTENZA BILANCIATA
        // Se il BP è < 200 (Note di Testa come il Bergamotto), il fattore sarà < 1
        // Se il BP è > 250 (Note di Fondo), il fattore sarà > 1
        const bpFactor = bpVal / 250; 
        const effectivePower = pureWeight * impactVal * bpFactor;

        Object.entries(mat.Families).forEach(([family, percentage]) => {
          const familyPercent = Number(percentage) || 0;
          const currentScore = familyTotals[family] || 0;
          familyTotals[family] = currentScore + (effectivePower * (familyPercent / 100));
        });
      }
    }
  });

  const scores = Object.values(familyTotals);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 1;
  
  const finalAnalysis = Object.entries(familyTotals)
    .map(([name, value]) => ({ 
      name, 
      percentage: (value / highestScore) * 100 
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return { analysis: finalAnalysis, alerts: ifraAlerts };
}, [formula.ingredients, materialsDB]);

  const addMaterialToFormula = (materialName: string) => {
  const newIngredient: Ingredient = {
    // Generiamo un ID unico
    id: Math.random().toString(36).substring(2, 9) + Date.now(),
    materialName, 
    // MODIFICA QUI: Stringa vuota invece di 0 per un inserimento rapido
    weightG: "", 
    dilution: "100%" 
  };
  
  setFormula(prev => ({ 
    ...prev, 
    ingredients: [...prev.ingredients, newIngredient] 
  }));
  setSearchTerm(""); // Pulisce la barra IA
  setSelectorSearch(""); // Pulisce la barra "Cerca materiale..."
  setIsSelecting(false);
};

  // --- SCHERMATA DI CARICAMENTO CON LOGO ---

if (isLoading) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-12 p-10">
      
      {/* 1. IL TUO LOGO (con animazione pulse opzionale) */}
      <img 
        src="/logo.png" 
        alt="Logo My Perfume Lab" 
        className="w-32 h-32 object-contain animate-pulse-slow" // Regola la grandezza qui
      />

      {/* 2. LO SPINNER TECNICO (Cerchio che gira) */}
      <div className="relative w-16 h-16">
        {/* Cerchio di sfondo opaco */}
        <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
        {/* Cerchio che gira blu */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
      </div>

      {/* 3. LA FRASE BREVE */}
      <div className="text-center space-y-2">
        <p className="text-white text-sm font-medium tracking-wide">
        ...
        </p>
        <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">
          Caricamento database
        </p>
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

      {/* 2. SIDEBAR LATERALE - ULTRA-SELECTIVE MINIMALIST */}
<aside className={`
  fixed md:relative z-50 h-full w-64 border-r border-slate-800/40 flex flex-col py-10 shrink-0 overflow-hidden transition-all duration-500
  ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
  bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#000000_100%)]
`}>
  
  {/* LOGO AZIENDALE */}
  <div className="flex flex-col items-center w-full px-6 mb-12">
    <img 
      src="/logo.png" 
      className="w-32 h-32 object-contain cursor-pointer hover:scale-105 transition-transform" 
      onClick={() => { setActiveSection('editor'); setIsMenuOpen(false); }}
      alt="Logo Aura Lab"
    />
  </div>

  <div className="flex-1 w-full flex flex-col justify-between overflow-hidden">
    
    {/* NAVIGAZIONE */}
    <nav className="w-full px-4 space-y-1">
      <button 
        onClick={() => { setActiveSection('editor'); setIsMenuOpen(false); }}
        className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all ${
          activeSection === 'editor' ? 'bg-blue-900/20 text-white border border-blue-500/10' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <FlaskConical size={16} className={activeSection === 'editor' ? 'text-blue-400' : 'text-slate-500'} />
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Laboratorio</span>
      </button>

      <button 
        onClick={() => { setActiveSection('library'); setIsMenuOpen(false); }}
        className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all ${
          activeSection === 'library' ? 'bg-blue-900/20 text-white border border-blue-500/10' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Droplets size={16} className={activeSection === 'library' ? 'text-blue-400' : 'text-slate-500'} />
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Materie Prime</span>
      </button>

      <button 
        onClick={() => { setActiveSection('history'); setIsMenuOpen(false); }}
        className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all ${
          activeSection === 'history' ? 'bg-blue-900/20 text-white border border-blue-500/10' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Search size={16} className={activeSection === 'history' ? 'text-blue-400' : 'text-slate-500'} />
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Archivio Formule</span>
      </button>
    </nav>

    {/* PROFILES - SOLO > 20% CON TESTO DINAMICO */}
    <div className="mb-10 px-6">
      <div className="flex flex-col gap-1.5">
        {analysis
          .filter(fam => fam.percentage >= 20) // Filtro aumentato al 20%
          .map((fam) => {
            // Logica Colore Testo: Nero per Vanigliato e famiglie chiare
            const lightFamilies = ["AGRUMATO", "CREMOSO", "FRESCO", "SALATO", "VANIGLIATO", "TALCATO", "MUSCHIATO", "LATTONICO", "MIELATO", "OZONICO", "FLOREALE BIANCO", "GOURMAND"];
            const isLightColor = lightFamilies.includes(fam.name.toUpperCase());
            
            return (
              <div key={fam.name} className="relative w-full h-[18px]">
                <div 
                  className="h-full transition-all duration-1000 ease-out flex items-center px-2.5 rounded-[2px]" 
                  style={{ 
                    width: `${fam.percentage}%`, 
                    backgroundColor: FAMILY_COLORS[fam.name as keyof typeof FAMILY_COLORS] || "#444" 
                  }}
                >
                  <span className={`text-[9px] font-semibold lowercase tracking-tight truncate ${
                    isLightColor ? 'text-black' : 'text-white'
                  }`}>
                    {fam.name}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
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
          materialsDB={materialsDB}
          onUpdate={setFormula}
          onSave={saveToHistory}
          onScale={scaleFormula}
          onExport={exportToExcel}
          ifraAlerts={[]} // Non serve più passargli gli alert, se li calcola da solo
          onOpenSelector={() => setIsSelecting(true)}
          onViewMaterial={(name) => {
          setSelectedMaterialInfo(name);
          setIsEditingMaterial(false);
         }}
         />
          )}

          {/* 2. SEZIONE LIBRARY */}
          {activeSection === 'library' && (
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
              <MaterialLibrary 
                materialsDB={materialsDB}
                searchTerm={searchTerm}
                onSelectMaterial={(name) => {
                  setSelectedMaterialInfo(name);
                  setIsEditingMaterial(false);
                }}
                onDeleteMaterial={handleDeleteMaterial}
                onAddMaterial={handleAddNewMaterial}
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
