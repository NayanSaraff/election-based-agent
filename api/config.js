module.exports = async (req, res) => {
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
};module.exports = async (req, res) => {
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