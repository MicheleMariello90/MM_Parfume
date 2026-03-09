// api/gemini.js
module.exports = async (req, res) => {
  // 1. Gestione per il test nel browser (GET)
  // Serve per verificare se il "ponte" è attivo senza dover usare l'app
  if (req.method !== 'POST') {
    return res.status(200).json({ 
      status: "Online", 
      message: "Il ponte Gemini è pronto. Invia una richiesta POST dall'app." 
    });
  }

  // 2. Recupero della chiave API dalle variabili di Vercel
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: "Configurazione errata: GEMINI_API_KEY non trovata su Vercel." 
    });
  }

  try {
    // 3. Chiamata diretta a Google Gemini
    // Usiamo il modello 2.0-flash per risposte rapide e precise
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // 4. Restituiamo il risultato al tuo frontend React
    return res.status(200).json(data);
    
  } catch (err) {
    console.error("Errore nel bridge API:", err.message);
    return res.status(500).json({ 
      error: "Errore interno durante la generazione del profumo.",
      details: err.message 
    });
  }
};