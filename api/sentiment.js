module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing text' });

  const apiKey = process.env.GOOGLE_NL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing GOOGLE_NL_API_KEY' });

  const response = await fetch(
    `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: { type: 'PLAIN_TEXT', content: text },
        encodingType: 'UTF8'
      })
    }
  );
  const data = await response.json();
  return res.status(200).json({
    score: data.documentSentiment?.score || 0,
    magnitude: data.documentSentiment?.magnitude || 0
  });
};