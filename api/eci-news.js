module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

  try {
    const upstream = await fetch('https://eci.gov.in/press-release/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await upstream.text();

    // Extract press release titles and links using regex
    const matches = [...html.matchAll(/<a[^>]+href="([^"]*press-release[^"]*)"[^>]*>([^<]+)<\/a>/gi)];
    const items = matches
      .slice(0, 10)
      .map(m => ({
        title: m[2].trim(),
        url: m[1].startsWith('http') ? m[1] : `https://eci.gov.in${m[1]}`
      }))
      .filter(item => item.title.length > 10);

    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch ECI news' });
  }
};
