const STATE_CODES = {
  'andhra-pradesh': 'S01', 'arunachal-pradesh': 'S02', 'assam': 'S03',
  'bihar': 'S04', 'chhattisgarh': 'S05', 'goa': 'S06', 'gujarat': 'S07',
  'haryana': 'S08', 'himachal-pradesh': 'S09', 'jharkhand': 'S10',
  'karnataka': 'S11', 'kerala': 'S12', 'madhya-pradesh': 'S13',
  'maharashtra': 'S14', 'manipur': 'S15', 'meghalaya': 'S16',
  'mizoram': 'S17', 'nagaland': 'S18', 'odisha': 'S19', 'punjab': 'S20',
  'rajasthan': 'S21', 'sikkim': 'S22', 'tamil-nadu': 'S23',
  'telangana': 'S24', 'tripura': 'S25', 'uttar-pradesh': 'S26',
  'uttarakhand': 'S27', 'west-bengal': 'S28', 'delhi': 'S29',
};

module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

  const { state } = req.query;
  if (!state) {
    return res.status(200).json({
      status: 'no_active_election',
      message: 'No state specified. Results will appear here on counting day.',
      source: 'eci.gov.in'
    });
  }

  const stateCode = STATE_CODES[state.toLowerCase().trim()];
  if (!stateCode) {
    return res.status(200).json({
      status: 'no_active_election',
      message: `No live counting in progress for "${state}". Results will appear here on counting day.`,
      source: 'eci.gov.in'
    });
  }

  // Try multiple ECI results portal URLs with correct state code
  const urls = [
    `https://results.eci.gov.in/ResultAcGenMay2026/partywiseresult-${stateCode}.htm`,
    `https://results.eci.gov.in/ResultAcGenOct2024/partywiseresult-${stateCode}.htm`,
    `https://results.eci.gov.in/AcResultGenOct2024/partywiseresult-${stateCode}.htm`,
  ];

  for (const url of urls) {
    try {
      const upstream = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000
      });
      if (upstream.ok) {
        const html = await upstream.text();
        return res.status(200).json({ html, source: url, status: 'active' });
      }
    } catch (e) {
      continue;
    }
  }

  // Return graceful "not yet" response instead of 404
  return res.status(200).json({
    status: 'no_active_election',
    message: 'No live counting in progress for this state. Results will appear here on counting day.',
    source: 'eci.gov.in'
  });
};
