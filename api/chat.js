const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GROQ_API_KEY.' });
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
  const messages = Array.isArray(body?.messages) ? body.messages : [];

  if (!messages.length) {
    return res.status(400).json({ error: 'messages must contain at least one item.' });
  }

  const payload = {
    model: GROQ_MODEL,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages,
    ],
    temperature: jsonMode ? 0.2 : 0.7,
    max_tokens: jsonMode ? 800 : 1000,
  };

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errorBody = await upstream.text().catch(() => '');
      const status = upstream.status === 429 ? 429 : 502;
      return res.status(status).json({
        error: `Groq API error ${upstream.status}`,
        details: errorBody.slice(0, 400),
      });
    }

    const data = await upstream.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text || typeof text !== 'string') {
      return res.status(502).json({ error: 'Groq returned an empty response.' });
    }

    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: 'Server request failed.', details: String(error?.message || error) });
  }
};
