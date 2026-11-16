// 用記憶體資料庫 + 模擬對話跑完整個錄音流程：建立 → 上傳分段 → 整理（不需要 Firebase、金鑰、真人錄音）
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { memoryDb, MemoryFieldValue } from '../src/memoryDb.js';
import { createConversationService } from '../src/conversations.js';
import { transcribe } from '../src/stt/index.js';
import { detectKeywords } from '../src/vocab.js';
import { organizeTranscript } from '../src/organize.js';
import { MOCK_CONVERSATIONS } from '../src/mock/index.js';
import { ApiKeyError } from '../src/providers.js';

process.env.STT_PROVIDER = 'mock';
process.env.LLM_PROVIDER = 'mock';

const deps = {
  db: memoryDb,
  FieldValue: MemoryFieldValue,
  bucket: () => {
    throw new Error('測試不存音檔');
  },
  saveAudio: false,
  transcribe,
  detectKeywords,
  organizeTranscript,
};
const service = createConversationService(deps);
const UID = 'sales-1';
const audio = Buffer.from('假的音檔');

async function record(conv, customerId = 'c1') {
  const { conversationId } = await service.create(UID, { customerId, mockScript: conv.id });
  const live = [];
  for (let seq = 0; seq < conv.segments.length; seq++) {
    live.push(await service.addSegment(conversationId, UID, { buffer: audio, seq, startSec: seq * 20, durationSec: 20 }));
  }
  const result = await service.finalize(conversationId, UID, { totalSegments: conv.segments.length, durationSec: 60 });
  return { conversationId, live, result };
}

for (const conv of MOCK_CONVERSATIONS) {
  test(`模擬對話「${conv.title}」整個流程`, async () => {
    const { conversationId, live, result } = await record(conv);

    // 即時關鍵字：預期的類別都有抓到
    const categories = new Set(live.flatMap((s) => s.keywords.map((k) => k.category)));
    for (const c of conv.expect.keywords) assert.ok(categories.has(c), `應該抓到「${c}」，實際：${[...categories]}`);

    // 整理結果與給 AI 分析的文字
    assert.equal(result.conversationId, conversationId);
    assert.ok(result.utterances.length >= conv.segments.length);
    assert.match(result.conversationText, /^(業務|客戶)：/);
    assert.ok(result.conversationText.includes('客戶：'));

    // 存在同一筆 conversations 文件
    const saved = await service.get(conversationId, UID);
    assert.equal(saved.status, 'transcribed');
    assert.equal(saved.salespersonId, UID);
    assert.equal(saved.customerId, 'c1');
    assert.equal(saved.source, 'recording');
    assert.equal(saved.segments.length, conv.segments.length);
    assert.ok(saved.keywords.length > 0);
    assert.equal(saved.conversationText, result.conversationText);
  });
}

test('台語原話保留在 original', async () => {
  const { result } = await record(MOCK_CONVERSATIONS.find((c) => c.id === 'family-suv'));
  assert.ok(result.utterances.some((u) => u.original.includes('挖馬家')));
});

test('別的業務員讀不到', async () => {
  const { conversationId } = await record(MOCK_CONVERSATIONS[0]);
  await assert.rejects(service.get(conversationId, 'someone-else'), (e) => e.status === 403);
});

test('還有段落沒上傳時回 409 並列出缺哪段', async () => {
  const { conversationId } = await service.create(UID, { mockScript: 'commuter-ev' });
  await service.addSegment(conversationId, UID, { buffer: audio, seq: 0 });
  await service.addSegment(conversationId, UID, { buffer: audio, seq: 2 });
  await assert.rejects(service.finalize(conversationId, UID, { totalSegments: 3 }), (e) => {
    assert.equal(e.status, 409);
    assert.deepEqual(e.extra.missing, [1]);
    return true;
  });
});

test('舊資料的 salesId 欄位仍可讀', async () => {
  const ref = await memoryDb.collection('conversations').add({ salesId: UID, status: 'recording' });
  const data = await service.get(ref.id, UID);
  assert.equal(data.status, 'recording');
});

test('整理時金鑰失效：狀態記成 error，錯誤碼往上傳', async () => {
  const broken = createConversationService({
    ...deps,
    organizeTranscript: async () => {
      throw new ApiKeyError('gemini', new Error('API key expired'));
    },
  });
  const { conversationId } = await broken.create(UID, { mockScript: 'family-suv' });
  await broken.addSegment(conversationId, UID, { buffer: audio, seq: 0 });
  await assert.rejects(broken.finalize(conversationId, UID, {}), (e) => e.code === 'API_KEY_INVALID');
  const saved = await broken.get(conversationId, UID);
  assert.equal(saved.status, 'error');
  assert.equal(saved.error, 'API_KEY_INVALID');
});
