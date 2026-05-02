module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing NEWSAPI_KEY' });
  const url = `https://newsapi.org/v2/everything?q=India+election+OR+Assembly+OR+election+commission&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
  const upstream = await fetch(url);
  const data = await upstream.json();
  return res.status(upstream.status).json(data);
};