const assert = require('assert');

async function testResultsMissingState() {
  const mod = require('../api/results.js');
  let statusCode = null;
  let responseBody = null;
  const mockReq = { method: 'GET', query: {} };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json(body) { responseBody = body; return this; },
    setHeader() { return this; }
  };

  await mod(mockReq, mockRes);

  assert.strictEqual(statusCode, 200);
  assert.strictEqual(responseBody.status, 'no_active_election');
  console.log('✅ testResultsMissingState passed');
}

async function testResultsSuccess() {
  const mod = require('../api/results.js');
  let statusCode = null;
  let responseBody = null;
  const originalFetch = global.fetch;
  const html = '<html><body><h1>Official result page</h1></body></html>';
  global.fetch = async () => ({
    ok: true,
    text: async () => html
  });
  const mockReq = { method: 'GET', query: { state: 'kerala' } };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json(body) { responseBody = body; return this; },
    setHeader() { return this; }
  };

  await mod(mockReq, mockRes);

  assert.strictEqual(statusCode, 200);
  assert.strictEqual(responseBody.status, 'active');
  assert.ok(responseBody.html.includes('Official result page'));
  global.fetch = originalFetch;
  console.log('✅ testResultsSuccess passed');
}

(async () => {
  console.log('Running integration tests...');
  await testResultsMissingState();
  await testResultsSuccess();
  console.log('\n✅ All integration tests passed!');
})().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
