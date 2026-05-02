const assert = require('assert');

async function testMissingText() {
  const mod = require('../api/translate.js');
  let statusCode = null;
  let responseBody = null;
  const mockReq = { method: 'POST', body: {} };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json(body) { responseBody = body; return this; },
    setHeader() { return this; }
  };

  await mod(mockReq, mockRes);

  assert.strictEqual(statusCode, 400, 'Should reject empty text');
  assert.ok(responseBody.error.includes('Missing text'));
  console.log('✅ testMissingText passed');
}

async function testMissingKey() {
  const mod = require('../api/translate.js');
  let statusCode = null;
  let responseBody = null;
  const originalKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  delete process.env.GOOGLE_TRANSLATE_API_KEY;
  const mockReq = { method: 'POST', body: { text: 'Election update' } };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json(body) { responseBody = body; return this; },
    setHeader() { return this; }
  };

  await mod(mockReq, mockRes);

  assert.strictEqual(statusCode, 500, 'Should reject missing API key');
  assert.ok(responseBody.error.includes('GOOGLE_TRANSLATE_API_KEY'));
  process.env.GOOGLE_TRANSLATE_API_KEY = originalKey;
  console.log('✅ testMissingKey passed');
}

async function testSuccess() {
  const mod = require('../api/translate.js');
  let statusCode = null;
  let responseBody = null;
  const originalKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  const originalFetch = global.fetch;
  process.env.GOOGLE_TRANSLATE_API_KEY = 'test-translate-key';
  global.fetch = async (url, options) => {
    assert.ok(String(url).includes('translate/v2'), 'Should call Google Translate API');
    assert.ok(String(url).includes('test-translate-key'), 'Should include API key in request URL');
    assert.strictEqual(options.method, 'POST');
    return {
      json: async () => ({ data: { translations: [{ translatedText: 'चुनाव समाचार' }] } })
    };
  };
  const mockReq = { method: 'POST', body: { text: 'Election news', target: 'hi' } };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json(body) { responseBody = body; return this; },
    setHeader() { return this; }
  };

  await mod(mockReq, mockRes);

  assert.strictEqual(statusCode, 200, 'Should succeed with mocked API');
  assert.deepStrictEqual(responseBody, { translated: 'चुनाव समाचार' });
  process.env.GOOGLE_TRANSLATE_API_KEY = originalKey;
  global.fetch = originalFetch;
  console.log('✅ testSuccess passed');
}

(async () => {
  console.log('Running translate API tests...');
  await testMissingText();
  await testMissingKey();
  await testSuccess();
  console.log('\n✅ All translate API tests passed!');
})().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
