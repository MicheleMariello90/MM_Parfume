/**
 * LOGICA SIDEBAR "MAX-FILL"
 * Le barre crescono e saturano lo spazio della sidebar.
 */
export function calculateSidebarData(formulaMaterials, database) {
  if (!formulaMaterials || !database || !Array.isArray(formulaMaterials)) {
    return [];
  }

  const familyScores = {};
  let highestScore = 0;

  // 1. Somma pura degli impatti
  formulaMaterials.forEach((item) => {
    const data = database[item.name];
    if (!data || data.Type === "Solvente") return;

    const g = parseFloat(item.grams) || 0;
    const c = parseFloat(item.concentration) || 100;
    const netWeight = (g * c) / 100;
    const materialImpactScore = netWeight * (parseFloat(data.Impact) || 0);

    if (data.Families) {
      Object.entries(data.Families).forEach(([familyName, familyPercentage]) => {
        const contribution = materialImpactScore * (familyPercentage / 100);
        
        if (!familyScores[familyName]) familyScores[familyName] = 0;
        familyScores[familyName] += contribution;

        if (familyScores[familyName] > highestScore) {
          highestScore = familyScores[familyName];
        }
      });
    }
  });

  /**
   * 2. CALCOLO DELLA LARGHEZZA
   * Se vuoi che la barra più grande sia SEMPRE attaccata al margine destro,
   * il divisore deve essere esattamente 'highestScore'.
   */
  return Object.keys(familyScores).map((name) => {
    const score = familyScores[name];
    return {
      name: name,
      // Se highestScore è il divisore, la famiglia dominante sarà sempre 100% (al bordo)
      width: highestScore > 0 ? (score / highestScore) * 100 : 0,
      absoluteScore: Math.round(score)
    };
  }).sort((a, b) => b.width - a.width);
}