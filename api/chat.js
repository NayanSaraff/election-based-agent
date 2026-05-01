const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && typeof message.content === 'string')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(message.content).slice(0, 8000) }],
    }))
    .filter((message) => message.parts[0].text.trim().length > 0)
    .slice(-20);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }
  }

  const systemPrompt = String(body?.systemPrompt || '').trim();
  const jsonMode = Boolean(body?.jsonMode);
  const contents = normalizeMessages(body?.messages);

  if (!contents.length) {
    return res.status(400).json({ error: 'messages must contain at least one item.' });
  }

const endpoint = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents,
    generationConfig: {
      temperature: jsonMode ? 0.2 : 0.7,
      maxOutputTokens: jsonMode ? 800 : 1000,
      responseMimeType: jsonMode ? 'application/json' : 'text/plain',
    },
  };

  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errorBody = await upstream.text().catch(() => '');
      const status = upstream.status === 429 ? 429 : 502;
      return res.status(status).json({
        error: `Gemini API error ${upstream.status}`,
        details: errorBody.slice(0, 400),
      });
    }

    const data = await upstream.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      return res.status(502).json({ error: 'Gemini returned an empty response.' });
    }

    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: 'Server request failed.', details: String(error?.message || error) });
  }
};
