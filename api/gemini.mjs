export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ status: "Online" });

  try {
    // Puntiamo alla versione v1 stabile e al modello 2.0 Flash
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    
    // Rimandiamo indietro tutto quello che dice Google
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}