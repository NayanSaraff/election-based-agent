/* ===================================
   ElectIQ Streaming News Ticker
   Continuously fetches fresh headlines from Gemini
   Replaces old news one by one to keep marquee flowing
   =================================== */

const NEWS_TICKER_STREAMING = {
  headlines: [
    { title: 'Loading fresh headlines from Gemini...', url: '#' },
  ],
  refreshIntervalMs: 8000, // Add new headline every 8 seconds
  maxHeadlines: 12,
  cacheKey: 'electiq_streaming_headlines',
  fallback: [
    { title: 'Assam Assembly election: Polling completed; counting on 4 May 2026', url: 'https://www.eci.gov.in' },
    { title: 'Kerala Assembly election: Final results announced; DMK leads in key seats', url: 'https://www.eci.gov.in' },
    { title: 'West Bengal Assembly: Phase 6 polling concluded; counting phase begins', url: 'https://www.eci.gov.in' },
    { title: 'Tamil Nadu election: Single-phase polling recorded 71% voter turnout', url: 'https://www.eci.gov.in' },
    { title: 'Puducherry election: Voting ends peacefully across 30 assembly constituencies', url: 'https://www.eci.gov.in' },
    { title: 'Election Commission announces bypolls for 15 Lok Sabha vacant seats', url: 'https://www.eci.gov.in' },
    { title: 'VVPAT verification underway in 5% of polling stations nationwide', url: 'https://www.eci.gov.in' },
    { title: 'Election observers report 97% smooth polling across all regions', url: 'https://www.eci.gov.in' },
    { title: 'Presidential election 2026: Nominations process begins on 15 May', url: 'https://www.eci.gov.in' },
    { title: 'Vice Presidential election: Electoral college votes on 22 June 2026', url: 'https://www.eci.gov.in' },
  ],
};

const STREAMING_ELECTION_KEYWORDS = [
  'election',
  'elections',
  'poll',
  'polling',
  'counting',
  'results',
  'result',
  'candidate',
  'candidates',
  'nomination',
  'nominations',
  'campaign',
  'campaigning',
  'manifesto',
  'voter',
  'voting',
  'electoral college',
  'lok sabha',
  'rajya sabha',
  'vidhan sabha',
  'assembly election',
  'presidential election',
  'vice presidential election',
  'eci',
  'evm',
  'vvpat',
];

function isStreamingElectionHeadline(title) {
  const normalized = String(title || '').toLowerCase();
  return STREAMING_ELECTION_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function filterStreamingElectionHeadlines(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      title: String(item?.title || '').trim(),
      url: item?.url || '#',
    }))
    .filter((item) => item.title && isStreamingElectionHeadline(item.title));
}

// Generate one fresh headline from Gemini
async function fetchSingleHeadlineFromGemini() {
  const prompt = `Default Gemini prompt: fetch only Indian election news. Generate ONE fresh, realistic India election headline ONLY. It must be strictly about Indian elections, such as polling, results, candidates, nominations, election dates, voter turnout, EVMs, VVPAT, the ECI, or the electoral college. Do not include any non-election topic. Date: 1 May 2026. Max 100 chars. Respond ONLY with headline text, nothing else.`;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt: 'You generate concise Indian election headlines only.',
      messages: [{ role: 'user', content: prompt }],
      jsonMode: false,
    }),
  });
  
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Chat API error ${res.status}`);
  }
  
  const data = await res.json();
  const headline = String(data.text || '').split('\n')[0].trim();
  
  if (!headline || !isStreamingElectionHeadline(headline)) throw new Error('No election headline generated');
  
  return {
    title: headline.substring(0, 150),
    url: 'https://www.eci.gov.in'
  };
}

// Save headlines to localStorage
function saveStreamingHeadlines() {
  try {
    localStorage.setItem(NEWS_TICKER_STREAMING.cacheKey, JSON.stringify({
      headlines: NEWS_TICKER_STREAMING.headlines,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Ignore cache errors
  }
}

// Load headlines from localStorage
function loadStreamingHeadlines() {
  try {
    const cached = JSON.parse(localStorage.getItem(NEWS_TICKER_STREAMING.cacheKey));
    if (cached && cached.headlines && Array.isArray(cached.headlines)) {
      NEWS_TICKER_STREAMING.headlines = filterStreamingElectionHeadlines(cached.headlines);
      return true;
    }
  } catch (e) {
    // Ignore errors
  }
  return false;
}

// Render marquee with current headlines
function renderStreamingTicker() {
  const track = document.getElementById('newsMarqueeTrack');
  if (!track) return;
  
  track.innerHTML = '';
  
  const buildFragment = (items) => {
    const frag = document.createDocumentFragment();
    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'news-marquee-item';
      
      const dot = document.createElement('span');
      dot.className = 'news-dot';
      
      const title = document.createElement('span');
      title.textContent = (item.title || '').trim().substring(0, 200);
      
      row.appendChild(dot);
      row.appendChild(title);
      frag.appendChild(row);
    });
    return frag;
  };
  
  // Duplicate for seamless scroll
  track.appendChild(buildFragment(NEWS_TICKER_STREAMING.headlines));
  track.appendChild(buildFragment(NEWS_TICKER_STREAMING.headlines));
  
  // Enable animation if overflow
  requestAnimationFrame(() => {
    const wrap = track.parentElement;
    if (!wrap) return;
    if (track.scrollWidth > wrap.clientWidth + 8) {
      track.classList.add('moving');
    } else {
      track.classList.remove('moving');
    }
  });
}

// Start streaming news updates
let streamingTimerId = null;

async function startStreamingTicker() {
  console.log('ðŸ“¡ Starting Gemini streaming ticker');
  
  // Try to load cached headlines
  loadStreamingHeadlines();
  renderStreamingTicker();
  
  // Try to fetch initial batch of headlines
  let attempts = 0;
  for (let i = 0; i < 3; i++) {
    try {
      const headline = await fetchSingleHeadlineFromGemini();
      if (isStreamingElectionHeadline(headline.title)) {
        NEWS_TICKER_STREAMING.headlines.push(headline);
        attempts++;
      }
    } catch (err) {
      console.warn('Initial headline fetch failed:', err);
    }
  }
  
  if (attempts === 0) {
    // Fallback to static headlines if Gemini failed completely
    console.warn('Using fallback headlines');
    NEWS_TICKER_STREAMING.headlines = NEWS_TICKER_STREAMING.fallback.slice();
  }
  
  renderStreamingTicker();
  saveStreamingHeadlines();
  
  // Continuously fetch new headlines and replace old ones
  if (streamingTimerId) clearInterval(streamingTimerId);
  
  streamingTimerId = setInterval(async () => {
    try {
      const newHeadline = await fetchSingleHeadlineFromGemini();
      
      // Add new headline to end
      if (isStreamingElectionHeadline(newHeadline.title)) {
        NEWS_TICKER_STREAMING.headlines.push(newHeadline);
        console.log('âœ… Added headline:', newHeadline.title.substring(0, 50));
      }
      
      // Remove oldest if exceeding max
      if (NEWS_TICKER_STREAMING.headlines.length > NEWS_TICKER_STREAMING.maxHeadlines) {
        const removed = NEWS_TICKER_STREAMING.headlines.shift();
        console.log('âŒ Removed old headline:', removed.title.substring(0, 50));
      }
      
      // Re-render marquee
      renderStreamingTicker();
      saveStreamingHeadlines();
      
    } catch (err) {
      console.warn('Headline update failed:', err.message);
    }
  }, NEWS_TICKER_STREAMING.refreshIntervalMs);
}

// Stop streaming
function stopStreamingTicker() {
  if (streamingTimerId) {
    clearInterval(streamingTimerId);
    streamingTimerId = null;
    console.log('ðŸ“¡ Stopped streaming ticker');
  }
}
