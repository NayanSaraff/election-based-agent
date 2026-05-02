module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

  const { state } = req.query;
  if (!state) return res.status(400).json({ error: 'Missing state param' });

  // Try ECI results portal
  const urls = [
    `https://results.eci.gov.in/AcResultGenOct2024/partywiseresult-${state}.htm`,
    `https://results.eci.gov.in/ResultAcGenOct2024/partywiseresult-${state}.htm`,
  ];

  for (const url of urls) {
    try {
      const upstream = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (upstream.ok) {
        const html = await upstream.text();
        return res.status(200).json({ html, source: url });
      }
    } catch (e) {
      continue;
    }
  }

  return res.status(404).json({ error: 'Results not available yet' });
};
