import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Gestione CORS e Metodo (per evitare crash da chiamate a vuoto)
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'Il ponte Gemini è attivo. Invia una richiesta POST per comunicare.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("ERRORE: GEMINI_API_KEY non configurata su Vercel");
    return res.status(500).json({ error: 'Configurazione server incompleta (API Key).' });
  }

  try {
    // 2. Chiamata a Google Gemini
    const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await googleResponse.json();

    // 3. Risposta al Frontend
    return res.status(200).json(data);
    
  } catch (error: any) {
    console.error("Errore nel Bridge:", error.message);
    return res.status(500).json({ 
      error: 'Errore interno nel bridge API',
      details: error.message 
    });
  }
}