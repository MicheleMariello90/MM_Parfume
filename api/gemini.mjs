export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ status: "Ready" });

  try {
    // Usiamo v1beta: è l'unica che accetta sempre gemini-1.5-flash nel piano free
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // Se Google risponde con un errore, lo passiamo al frontend per vederlo
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}