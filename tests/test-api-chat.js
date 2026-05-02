const assert = require('assert');

async function testMissingApiKey() {
  const mod = require('../api/chat.js');
  let statusCode = null;
  let responseBody = null;
  const mockReq = { method: 'POST', headers: {}, socket: {}, body: { messages: [{ role: 'user', content: 'test' }], systemPrompt: 'test' } };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json(body) { responseBody = body; return this; },
    setHeader() { return this; }
  };
  const originalKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  await mod(mockReq, mockRes);
  assert.strictEqual(statusCode, 500, 'Should return 500 when API key missing');
  assert.ok(responseBody.error, 'Should return error message');
  process.env.GROQ_API_KEY = originalKey;
  console.log('✅ testMissingApiKey passed');
}

async function testInvalidMethod() {
  const mod = require('../api/chat.js');
  let statusCode = null;
  const mockReq = { method: 'GET', headers: {}, socket: {}, body: {} };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json() { return this; },
    setHeader() { return this; }
  };
  await mod(mockReq, mockRes);
  assert.strictEqual(statusCode, 405, 'Should return 405 for non-POST');
  console.log('✅ testInvalidMethod passed');
}

async function testEmptyMessages() {
  const mod = require('../api/chat.js');
  let statusCode = null;
  process.env.GROQ_API_KEY = 'test-key';
  const mockReq = { method: 'POST', headers: {}, socket: {}, body: { messages: [], systemPrompt: 'test' } };
  const mockRes = {
    status(code) { statusCode = code; return this; },
    json() { return this; },
    setHeader() { return this; }
  };
  await mod(mockReq, mockRes);
  assert.strictEqual(statusCode, 400, 'Should return 400 for empty messages');
  console.log('✅ testEmptyMessages passed');
}

(async () => {
  console.log('Running API tests...');
  await testMissingApiKey();
  await testInvalidMethod();
  await testEmptyMessages();
  console.log('\n✅ All API tests passed!');
})().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
