/**
 * 模擬模式：不用真人錄音、不用金鑰，也能把整個流程跑完
 *
 *   STT_PROVIDER=mock：不聽音檔，第 seq 段直接回傳模擬對話第 seq 段的「辨識文字」（含故意的錯字與台語）
 *                      要用哪一段對話：建立對話時 body 帶 mockScript（例如 "commuter-ev"），沒帶就用 MOCK_SCRIPT 或第一段
 *   LLM_PROVIDER=mock：不呼叫 AI，直接用模擬對話裡寫好的「整理後」句子
 *
 * 想測真的 AI 整理效果：STT 用 mock、LLM 用 gemini，這樣只花文字的額度，也不會有真實客戶的聲音。
 */
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('./conversations.json', import.meta.url), 'utf8'));

export const MOCK_CONVERSATIONS = data.conversations;

export function getMockConversation(id) {
  const wanted = id || process.env.MOCK_SCRIPT;
  if (!wanted) return MOCK_CONVERSATIONS[0];
  const found = MOCK_CONVERSATIONS.find((c) => c.id === wanted);
  if (!found) {
    throw new Error(`找不到模擬對話「${wanted}」，可用：${MOCK_CONVERSATIONS.map((c) => c.id).join('、')}`);
  }
  return found;
}

/** 一段的「語音辨識結果」：把這段每一句的 raw 接起來（真的辨識結果也不會分說話者） */
export function segmentRawText(segment) {
  return segment.lines.map((l) => l.raw).join('');
}

/** STT_PROVIDER=mock：超過最後一段就回空字串（模擬安靜） */
export function transcribeMock(seq, scriptId) {
  const conv = getMockConversation(scriptId);
  const segment = conv.segments[seq];
  return segment ? segmentRawText(segment) : '';
}

/**
 * LLM_PROVIDER=mock：用辨識文字對回模擬對話，回傳寫好的整理結果
 * 對不到（例如 STT 用真的引擎）就一段當一句、說話者 unknown
 */
export function organizeMock(segments) {
  const utterances = [];
  for (const s of segments) {
    const match = findSegment(s.text);
    if (match) {
      for (const l of match.lines) {
        utterances.push({ speaker: l.speaker, text: l.clean, original: l.original ?? '', segmentSeq: s.seq });
      }
    } else if (s.text) {
      utterances.push({ speaker: 'unknown', text: s.text, original: '', segmentSeq: s.seq });
    }
  }
  const customerLines = utterances.filter((u) => u.speaker === 'customer').length;
  return {
    utterances,
    summary: `（模擬整理，未呼叫 AI）共 ${utterances.length} 句，其中客戶 ${customerLines} 句。`,
    uncertain: [],
  };
}

function findSegment(text) {
  for (const conv of MOCK_CONVERSATIONS) {
    const seg = conv.segments.find((x) => segmentRawText(x) === text);
    if (seg) return seg;
  }
  return null;
}
