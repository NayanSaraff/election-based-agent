  module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
	
    const RSS_FEEDS = [
      'https://www.thehindu.com/elections/feeder/default.rss',
      'https://indianexpress.com/section/india/feed/',
      'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3',
      'https://timesofindia.indiatimes.com/rssfeeds/1221656.cms',
      'https://feeds.feedburner.com/ndtvnews-india-news',
    ];
	
    const ELECTION_KEYWORDS = [
      'election', 'poll', 'voting', 'evm', 'eci', 'constituency', 'candidate',
      'lok sabha', 'rajya sabha', 'vidhan sabha', 'bypoll', 'counting', 'results',
      'manifesto', 'alliance', 'bjp', 'congress', 'aap', 'tmc', 'voter', 'booth'
    ];
	
    const normalizeTitle = (title) => {
      return (title || '').toLowerCase().substring(0, 60);
    };
	
    const isElectionRelated = (title) => {
      const normalized = (title || '').toLowerCase();
      return ELECTION_KEYWORDS.some(keyword => normalized.includes(keyword));
    };
	
    const parseRssFeedRegex = (xmlText) => {
      const items = [];
      const titleRegex = /<title[^>]*>([^<]+)<\/title>/gi;
      const linkRegex = /<link[^>]*>([^<]+)<\/link>/gi;
	    
      const titleMatches = [...xmlText.matchAll(titleRegex)];
      const linkMatches = [...xmlText.matchAll(linkRegex)];
	    
      for (let i = 1; i < Math.min(titleMatches.length, 25); i++) {
        const title = (titleMatches[i] && titleMatches[i][1]) || '';
        const url = (linkMatches[i] && linkMatches[i][1]) || '';
	      
        if (title && url && isElectionRelated(title)) {
          items.push({ title: title.trim(), url: url.trim() });
        }
      }
      return items;
    };
	
    try {
      const results = await Promise.allSettled(
        RSS_FEEDS.map(feed => 
          fetch(feed, { headers: { 'User-Agent': 'Mozilla/5.0', timeout: 5000 } })
            .then(r => r.text())
            .then(text => parseRssFeedRegex(text))
            .catch(() => [])
        )
      );
	
      const allItems = [];
      const seenTitles = new Set();
	
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          result.value.forEach(item => {
            const normalized = normalizeTitle(item.title);
            if (!seenTitles.has(normalized)) {
              seenTitles.add(normalized);
              allItems.push({
                title: item.title,
                url: item.url,
                source: RSS_FEEDS[index].split('/')[2]
              });
            }
          });
        }
      });
	
      const items = allItems.slice(0, 15);
      return res.status(200).json({ items });
    } catch (e) {
      return res.status(200).json({ items: [] });
    }
  };
