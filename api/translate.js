module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { text, target = 'hi' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing text' });

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing GOOGLE_TRANSLATE_API_KEY' });

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, target, format: 'text' })
    }
  );
  const data = await response.json();
  const translated = data.data?.translations?.[0]?.translatedText || '';
  return res.status(200).json({ translated });
};