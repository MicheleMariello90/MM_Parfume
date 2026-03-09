export default async function handler(req, res) {
  // 1. Gestione CORS (permette all'app di parlare con il server)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Gestione richiesta pre-flight (necessaria per i browser)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. Risposta per test browser (GET)
  if (req.method !== 'POST') {
    return res.status(200).json({ 
      status: "Online", 
      message: "Il ponte Gemini è pronto in src/api. L'app può inviare richieste POST." 
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key mancante su Vercel" });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}