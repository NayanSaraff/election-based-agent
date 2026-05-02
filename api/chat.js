const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const ipRequestCounts = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 1000;

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}

function sanitizeInput(str, maxLength = 2000) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[^\x20-\x7E\u0900-\u097F\n\r\t]/g, '')
    .slice(0, maxLength)
    .trim();
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) {
    return String(forwarded[0] || 'unknown');
  }
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return String(req.socket?.remoteAddress || 'unknown');
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW;
  }
  entry.count += 1;
  ipRequestCounts.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

module.exports = async (req, res) => {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
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

  const systemPrompt = sanitizeInput(body?.systemPrompt || '', 4000);
  const jsonMode = Boolean(body?.jsonMode);
  const messages = Array.isArray(body?.messages)
    ? body.messages
        .map((message) => ({
          role: String(message?.role || 'user').trim() || 'user',
          content: sanitizeInput(message?.content || '', 4000),
        }))
        .filter((message) => message.content)
    : [];

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
        Authorization: `Bearer ${apiKey}`,
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
