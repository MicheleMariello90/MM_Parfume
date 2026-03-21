export function calculateSidebarData(formulaMaterials, database) {
  if (!formulaMaterials || !database || !Array.isArray(formulaMaterials)) {
    return [];
  }

  const familyScores = {};
  let highestScore = 0;

  formulaMaterials.forEach((item) => {
    const data = database[item.name];
    if (!data || data.Type === "Solvente") return;

    const g = parseFloat(item.grams) || 0;
    const c = parseFloat(item.concentration) || 100;
    const netWeight = (g * c) / 100;

    // --- LOGICA ODT UNIFICATA (DIVISIONE) ---
    // Usiamo la stessa logica della piramide: Peso / ODT
    const odtValue = parseFloat(data.ODT || data.Impact) || 1;
    const safeODT = odtValue <= 0 ? 1 : odtValue;
    
    // CALCOLO POTENZA REALE
    const materialPower = netWeight / safeODT;

    if (data.Families) {
      Object.entries(data.Families).forEach(([familyName, familyPercentage]) => {
        // La contribuzione alla famiglia deve basarsi sulla POTENZA, non sul peso
        const contribution = materialPower * (parseFloat(familyPercentage) / 100);
        
        if (!familyScores[familyName]) familyScores[familyName] = 0;
        familyScores[familyName] += contribution;
      });
    }
  });

  // Calcoliamo il massimo punteggio totale tra le famiglie per scalare le barre
  highestScore = Math.max(...Object.values(familyScores), 1);

  return Object.keys(familyScores).map((name) => {
    const score = familyScores[name];
    return {
      name: name,
      // La larghezza della barra è relativa alla famiglia più potente
      width: (score / highestScore) * 100,
      absoluteScore: Math.round(score)
    };
  }).sort((a, b) => b.width - a.width);
}