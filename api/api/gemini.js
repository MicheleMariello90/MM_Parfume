// api/gemini.js
module.exports = async (req, res) => {
  // Gestione minima per il test nel browser
  if (req.method !== 'POST') {
    return res.status(200).json({ status: "Online", message: "Invia una richiesta POST per comunicare con Gemini." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key mancante su Vercel Settings." });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Errore nel bridge", details: err.message });
  }
};