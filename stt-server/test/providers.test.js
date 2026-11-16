import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isKeyError, callProvider, getProvider } from '../src/providers.js';

test('認得各家的金鑰錯誤', () => {
  assert.ok(isKeyError({ status: 401, message: 'Invalid API Key' })); // Groq
  assert.ok(isKeyError({ status: 400, message: '400 API key expired. Please renew the API key.' })); // Gemini 過期
  assert.ok(isKeyError({ status: 400, error: { message: 'API key not valid. Please pass a valid API key.' } }));
  assert.ok(!isKeyError({ status: 400, message: 'response_format not supported' }));
  assert.ok(!isKeyError({ status: 503, message: 'overloaded' }));
});

test('金鑰錯誤會換成 API_KEY_INVALID，訊息有申請網址', async () => {
  await assert.rejects(
    callProvider('gemini', async () => {
      throw Object.assign(new Error('API key expired'), { status: 400 });
    }),
    (err) => err.code === 'API_KEY_INVALID' && err.message.includes('aistudio.google.com')
  );
});

test('沒設定金鑰時講清楚要設哪個變數', async () => {
  const saved = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  await assert.rejects(getProvider('groq'), /GROQ_API_KEY/);
  if (saved !== undefined) process.env.GROQ_API_KEY = saved;
});

test('mock 不需要金鑰', async () => {
  const p = await getProvider('mock');
  assert.equal(p.name, 'mock');
});
