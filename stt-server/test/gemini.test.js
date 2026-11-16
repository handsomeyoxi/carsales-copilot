// Gemini 原生 API 呼叫（用假的 fetch，不會真的連線）
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { organizeTranscript } from '../src/organize.js';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function fakeFetch(status, body, seen = {}) {
  globalThis.fetch = async (url, init) => {
    seen.url = url;
    seen.headers = init.headers;
    seen.body = JSON.parse(init.body);
    return { ok: status < 300, status, statusText: '', json: async () => body };
  };
  return seen;
}

test('走原生 generateContent，金鑰放 x-goog-api-key（AQ. 新格式也一樣）', async () => {
  process.env.LLM_PROVIDER = 'gemini';
  process.env.GEMINI_API_KEY = 'AQ.Ab8_fake_key';
  const answer = { utterances: [{ speaker: 'customer', text: '預算 400 萬', original: '', segmentSeq: 0 }], summary: '客戶預算 400 萬', uncertain: [] };
  const seen = fakeFetch(200, { candidates: [{ content: { parts: [{ text: '```json\n' + JSON.stringify(answer) + '\n```' }] } }] });

  const r = await organizeTranscript([{ seq: 0, text: '預算400萬', candidates: null }]);
  assert.match(seen.url, /\/v1beta\/models\/gemini-3\.8-flash:generateContent$/);
  assert.ok(!seen.url.includes('/openai/'));
  assert.equal(seen.headers['x-goog-api-key'], 'AQ.Ab8_fake_key');
  assert.equal(seen.body.generationConfig.responseMimeType, 'application/json');
  assert.equal(r.utterances[0].speaker, 'customer');
  assert.equal(r.summary, '客戶預算 400 萬');
});

test('401 ACCESS_TOKEN_TYPE_UNSUPPORTED 視為金鑰錯誤', async () => {
  process.env.LLM_PROVIDER = 'gemini';
  process.env.GEMINI_API_KEY = 'AQ.Ab8_fake_key';
  fakeFetch(401, { error: { message: 'Request had invalid authentication credentials.', details: [{ reason: 'ACCESS_TOKEN_TYPE_UNSUPPORTED' }] } });
  await assert.rejects(organizeTranscript([{ seq: 0, text: 'x' }]), (e) => e.code === 'API_KEY_INVALID');
});

test('過期的舊金鑰（400 API key expired）也是金鑰錯誤', async () => {
  process.env.LLM_PROVIDER = 'gemini';
  process.env.GEMINI_API_KEY = 'AIzaOld';
  fakeFetch(400, { error: { message: 'API key expired. Please renew the API key.', details: [{ reason: 'API_KEY_INVALID' }] } });
  await assert.rejects(organizeTranscript([{ seq: 0, text: 'x' }]), (e) => e.code === 'API_KEY_INVALID');
});

test('其他錯誤照原樣丟出（不會誤判成金鑰問題）', async () => {
  process.env.LLM_PROVIDER = 'gemini';
  process.env.GEMINI_API_KEY = 'AQ.Ab8_fake_key';
  fakeFetch(503, { error: { message: 'The model is overloaded.' } });
  await assert.rejects(organizeTranscript([{ seq: 0, text: 'x' }]), (e) => e.status === 503 && e.code !== 'API_KEY_INVALID');
});
