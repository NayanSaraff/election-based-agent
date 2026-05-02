module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  return res.status(200).json({
    newsdataio: {
      apiKey: process.env.NEWSDATA_API_KEY || '',
      baseUrl: 'https://newsdata.io/api/1/news',
    },
    newsapi: {
      apiKey: process.env.NEWSAPI_KEY || '',
      baseUrl: 'https://newsapi.org/v2/everything',
    },
  });
};