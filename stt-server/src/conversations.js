/**
 * 對話紀錄（錄音 → 轉文字 → 整理）的商業邏輯，和 Express 分開，方便直接測試
 *
 * 原本 stt-server 存在 sessions、functions 存在 conversations，同一次對話分兩個地方。
 * 現在合併成 conversations/{conversationId} 一筆：
 *   stt-server 建立並寫入逐字稿 → functions 的 analyzeAfterConversation / analyzeInsight
 *   帶同一個 conversationId 把分析結果寫回同一筆。欄位說明見 docs/conversations.md
 *
 * conversations/{conversationId}
 *   salespersonId, customerId, source('recording'|'text'), status, createdAt, durationSec
 *   keywords[]           即時關鍵字（全部段落合併）
 *   rawText              原始辨識文字
 *   transcript{}         整理後：utterances、summary、uncertain
 *   conversationText     「業務：…／客戶：…」純文字，給 AI 分析用
 *   analysis{}, insight{}   ← functions 寫入
 * conversations/{conversationId}/segments/{seq 補零}
 *   seq, text, candidates, keywords, startSec, durationSec, audioPath
 *
 * status：recording → organizing → transcribed →（functions）analyzed；失敗是 error
 */
import { formatConversationText } from './organize.js';
import { mergeKeywords } from './vocab.js';

export const COLLECTION = 'conversations';
export const segId = (seq) => String(seq).padStart(5, '0');

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/**
 * @param deps { db, FieldValue, bucket, saveAudio, transcribe, detectKeywords, organizeTranscript }
 *   全部用參數傳進來：正式環境傳真的，測試傳記憶體資料庫和 mock 引擎
 */
export function createConversationService(deps) {
  const { db, FieldValue, bucket, saveAudio, transcribe, detectKeywords, organizeTranscript } = deps;
  const col = () => db.collection(COLLECTION);

  async function load(id, uid) {
    const ref = col().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, '找不到這筆對話紀錄');
    const data = snap.data();
    // salesId 是合併前 sessions 的舊欄位名稱
    if ((data.salespersonId ?? data.salesId) !== uid) throw new HttpError(403, '無權存取');
    return { ref, data };
  }

  // 1. 開始錄音：建立對話紀錄
  async function create(uid, { customerId = null, mockScript = null } = {}) {
    const data = {
      salespersonId: uid,
      customerId,
      source: 'recording',
      status: 'recording',
      createdAt: FieldValue.serverTimestamp(),
    };
    if (mockScript) data.mockScript = mockScript; // 只有 STT_PROVIDER=mock 會用到
    const ref = await col().add(data);
    return { conversationId: ref.id };
  }

  // 2. 一段音檔 → 轉寫 → 存檔 → 回傳文字與即時關鍵字
  async function addSegment(id, uid, { buffer, filename, mimetype, seq, startSec, durationSec }) {
    const { ref, data } = await load(id, uid);
    if (!buffer) throw new HttpError(400, '缺少音檔');
    if (!Number.isInteger(seq) || seq < 0) throw new HttpError(400, 'seq 錯誤');

    // 取上一段文字當提示詞，讓兩段之間接得起來（上一段若還沒到就略過）
    const prevSnap = seq > 0 ? await ref.collection('segments').doc(segId(seq - 1)).get() : null;
    const previousText = prevSnap?.exists ? prevSnap.data().text : '';

    const name = filename || `seg-${seq}.m4a`;
    const { text, candidates } = await transcribe(buffer, name, {
      previousText,
      seq,
      mockScript: data.mockScript ?? null,
    });
    const keywords = detectKeywords(text);

    let audioPath = null;
    if (saveAudio) {
      audioPath = `audio/${uid}/${id}/${segId(seq)}-${name}`;
      await bucket().file(audioPath).save(buffer, { contentType: mimetype });
    }

    // 以 seq 當文件 ID：App 重送同一段時會覆蓋，不會重複
    await ref.collection('segments').doc(segId(seq)).set({
      seq,
      text,
      candidates,
      keywords,
      startSec: Number(startSec) || 0,
      durationSec: Number(durationSec) || 0,
      audioPath,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { seq, text, keywords };
  }

  // 3. 錄音結束 → 檢查段數 → LLM 整理 → 寫回同一筆對話
  async function finalize(id, uid, { totalSegments, durationSec = 0 } = {}) {
    const { ref } = await load(id, uid);
    const snap = await ref.collection('segments').orderBy('seq').get();
    const segments = snap.docs.map((d) => d.data());

    if (Number.isInteger(totalSegments) && segments.length < totalSegments) {
      const have = new Set(segments.map((x) => x.seq));
      const missing = [...Array(totalSegments).keys()].filter((i) => !have.has(i));
      throw new HttpError(409, '還有音檔沒上傳完', { missing });
    }
    if (segments.length === 0) throw new HttpError(400, '沒有任何錄音內容');

    await ref.update({ status: 'organizing', durationSec });
    let organized;
    try {
      organized = await organizeTranscript(segments);
    } catch (err) {
      await ref.update({ status: 'error', error: err.code ?? 'ORGANIZE_FAILED' });
      throw err;
    }

    const conversationText = formatConversationText(organized.utterances);
    await ref.update({
      status: 'transcribed',
      rawText: segments.map((x) => x.text).join(''),
      keywords: mergeKeywords(segments.map((x) => x.keywords)),
      transcript: organized,
      conversationText,
      transcribedAt: FieldValue.serverTimestamp(),
    });
    // 前端拿到 conversationId 後，呼叫 functions 的 analyzeAfterConversation、analyzeInsight 帶同一個 id
    return { conversationId: id, sessionId: id, conversationText, ...organized };
  }

  // 4. 讀取（含分段原文）
  async function get(id, uid) {
    const { ref, data } = await load(id, uid);
    const segs = await ref.collection('segments').orderBy('seq').get();
    return {
      conversationId: id,
      sessionId: id,
      ...data,
      segments: segs.docs.map((d) => {
        const { seq, text, keywords, startSec } = d.data();
        return { seq, text, keywords, startSec };
      }),
    };
  }

  return { create, addSegment, finalize, get };
}
