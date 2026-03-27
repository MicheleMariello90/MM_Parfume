export function calculateSidebarData(formulaMaterials, database) {
  if (!formulaMaterials || !database || !Array.isArray(formulaMaterials)) {
    return [];
  }

  const familyScores = {};

  formulaMaterials.forEach((item) => {
    const data = database[item.name];
    if (!data || data.Type === "Solvente") return;

    // Calcolo del peso netto
    const g = parseFloat(item.grams) || 0;
    const c = parseFloat(item.concentration) || 100;
    const netWeight = (g * c) / 100;

    // --- CORREZIONE CRITICA ---
    // 1. Cerchiamo 'impact' (minuscolo come nel tuo Modal) o 'Impact'
    // 2. IMPORTANTE: Se è Bergamotto e l'impact è 10, e Calone è 150, 
    //    dobbiamo MOLTIPLICARE.
    const impactValue = parseFloat(data.impact || data.Impact) || 10;
    
    // Usiamo una radice quadrata sul peso per dare stabilità, 
    // ma l'Impact deve essere il moltiplicatore principale.
    const materialPower = netWeight * impactValue;

    if (data.Families) {
      Object.entries(data.Families).forEach(([familyName, familyPercentage]) => {
        const contribution = materialPower * (parseFloat(familyPercentage) / 100);
        
        if (!familyScores[familyName]) familyScores[familyName] = 0;
        familyScores[familyName] += contribution;
      });
    }
  });

  // Trova il vincitore per scalare le barre
  const scoresArray = Object.values(familyScores);
  const highestScore = scoresArray.length > 0 ? Math.max(...scoresArray) : 1;

  return Object.keys(familyScores)
    .map((name) => {
      const score = familyScores[name];
      return {
        name: name,
        // Qui viene generata la lunghezza della barra che vedi nello screenshot
        width: (score / highestScore) * 100,
        absoluteScore: Math.round(score)
      };
    })
    .sort((a, b) => b.width - a.width);
}