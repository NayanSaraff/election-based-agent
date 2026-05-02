module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url param' });
  const upstream = await fetch(decodeURIComponent(url));
  const text = await upstream.text();
  res.setHeader('Content-Type', 'application/xml');
  return res.status(upstream.status).send(text);
};