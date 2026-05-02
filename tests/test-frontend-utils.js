const assert = require('assert');

const ELECTION_KEYWORDS = [
  'election', 'poll', 'voting', 'evm', 'eci', 'constituency',
  'candidate', 'lok sabha', 'rajya sabha', 'vidhan sabha',
  'bypoll', 'counting', 'results', 'manifesto', 'alliance',
  'bjp', 'congress', 'aap', 'tmc', 'nda', 'voter', 'turnout'
];

function filterElectionHeadlines(items) {
  return items.filter(item => {
    const text = (item.title || '').toLowerCase();
    return ELECTION_KEYWORDS.some(kw => text.includes(kw));
  });
}

function deduplicateHeadlines(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = (item.title || '').slice(0, 60).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const testItems = [
  { title: 'BJP wins Lok Sabha seat in bypoll' },
  { title: 'Cricket World Cup match today' },
  { title: 'ECI announces new voter registration drive' },
  { title: 'Stock market hits record high' },
];

const filtered = filterElectionHeadlines(testItems);
assert.strictEqual(filtered.length, 2, 'Should filter to 2 election headlines');
assert.ok(filtered[0].title.includes('Lok Sabha'));
console.log('✅ filterElectionHeadlines passed');

const dupeItems = [
  { title: 'ECI announces voter drive in Karnataka' },
  { title: 'ECI announces voter drive in Karnataka' },
  { title: 'BJP releases election manifesto' },
];
const deduped = deduplicateHeadlines(dupeItems);
assert.strictEqual(deduped.length, 2, 'Should remove duplicate');
console.log('✅ deduplicateHeadlines passed');

console.log('\n✅ All frontend utility tests passed!');
