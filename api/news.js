module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing NEWSDATA_API_KEY' });
  }
  
  const url = `https://newsdata.io/api/1/news?q=India+election&country=in&language=en&sort=latest&apikey=${apiKey}`;
  
  try {
    const upstream = await fetch(url);
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (error) {
    return res.status(502).json({ error: 'NewsData.io request failed', details: String(error?.message || error) });
  }
};
