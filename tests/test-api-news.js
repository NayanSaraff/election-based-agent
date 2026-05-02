const assert = require('assert');

async function testNewsMissingKey() {
  const mod = require('../api/news.js');
  let statusCode = null;
  const originalKey = process.env.NEWSDATA_API_KEY;
  delete process.env.NEWSDATA_API_KEY;
  const mockReq = { method: 'GET' };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json() { return this; },
    setHeader() { return this; }
  };
  await mod(mockReq, mockRes);
  assert.strictEqual(statusCode, 500);
  process.env.NEWSDATA_API_KEY = originalKey;
  console.log('✅ testNewsMissingKey passed');
}

async function testRssMissingUrl() {
  const mod = require('../api/rss.js');
  let statusCode = null;
  const mockReq = { method: 'GET', query: {} };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json() { return this; },
    setHeader() { return this; },
    send() { return this; }
  };
  await mod(mockReq, mockRes);
  assert.ok(statusCode !== null);
  console.log('✅ testRssMissingUrl passed');
}

(async () => {
  console.log('Running News API tests...');
  await testNewsMissingKey();
  await testRssMissingUrl();
  console.log('\n✅ All News tests passed!');
})().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
