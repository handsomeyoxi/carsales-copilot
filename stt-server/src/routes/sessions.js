import { Router } from 'express';
import multer from 'multer';
import { db, bucket, FieldValue, USE_MEMORY_DB } from '../firebase.js';
import { transcribe } from '../stt/index.js';
import { detectKeywords } from '../vocab.js';
import { organizeTranscript } from '../organize.js';

/**
 * Firestore 結構
 * sessions/{sessionId}
 *   salesId, customerId, status('recording'|'organizing'|'done'|'error'),
 *   createdAt, durationSec, organized{...}, labels[...]
 * sessions/{sessionId}/segments/{seq 補零}
 *   seq, text, candidates, keywords, startSec, durationSec, audioPath
 */

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // OpenAI 單檔上限 25MB
});

const segId = (seq) => String(seq).padStart(5, '0');

async function loadSession(req, res) {
  const ref = db.collection('sessions').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: '找不到這次錄音' });
    return null;
  }
  if (snap.data().salesId !== req.user.uid) {
    res.status(403).json({ error: '無權存取' });
    return null;
  }
  return { ref, data: snap.data() };
}

// 1. 開始錄音：建立 session
router.post('/', async (req, res) => {
  const { customerId = null } = req.body ?? {};
  const ref = await db.collection('sessions').add({
    salesId: req.user.uid,
    customerId,
    status: 'recording',
    createdAt: FieldValue.serverTimestamp(),
  });
  res.status(201).json({ sessionId: ref.id });
});

// 2. 上傳一段音檔 → 轉寫 → 存檔 → 回傳文字與即時關鍵字
//    form-data: audio(file), seq, startSec, durationSec
router.post('/:id/segments', upload.single('audio'), async (req, res) => {
  const s = await loadSession(req, res);
  if (!s) return;
  if (!req.file) return res.status(400).json({ error: '缺少音檔' });

  const seq = Number(req.body.seq);
  if (!Number.isInteger(seq) || seq < 0) return res.status(400).json({ error: 'seq 錯誤' });

  // 取上一段文字當提示詞，讓兩段之間接得起來（上一段若還沒到就略過）
  const prevSnap = seq > 0 ? await s.ref.collection('segments').doc(segId(seq - 1)).get() : null;
  const previousText = prevSnap?.exists ? prevSnap.data().text : '';

  try {
    const filename = req.file.originalname || `seg-${seq}.m4a`;
    const { text, candidates } = await transcribe(req.file.buffer, filename, { previousText });
    const keywords = detectKeywords(text);

    let audioPath = null;
    if (process.env.SAVE_AUDIO === 'true' && !USE_MEMORY_DB) {
      audioPath = `audio/${req.user.uid}/${req.params.id}/${segId(seq)}-${filename}`;
      await bucket().file(audioPath).save(req.file.buffer, { contentType: req.file.mimetype });
    }

    // 以 seq 當文件 ID：App 重送同一段時會覆蓋，不會重複
    await s.ref.collection('segments').doc(segId(seq)).set({
      seq,
      text,
      candidates,
      keywords,
      startSec: Number(req.body.startSec) || 0,
      durationSec: Number(req.body.durationSec) || 0,
      audioPath,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.json({ seq, text, keywords });
  } catch (err) {
    console.error('轉寫失敗', err);
    res.status(502).json({ error: '語音轉寫失敗，請稍後重試' });
  }
});

// 3. 錄音結束 → 檢查段數 → LLM 整理 → 寫回 session
//    body: { totalSegments, durationSec }
router.post('/:id/finalize', async (req, res) => {
  const s = await loadSession(req, res);
  if (!s) return;
  const { totalSegments, durationSec = 0 } = req.body ?? {};

  const snap = await s.ref.collection('segments').orderBy('seq').get();
  const segments = snap.docs.map((d) => d.data());

  if (Number.isInteger(totalSegments) && segments.length < totalSegments) {
    const have = new Set(segments.map((x) => x.seq));
    const missing = [...Array(totalSegments).keys()].filter((i) => !have.has(i));
    return res.status(409).json({ error: '還有音檔沒上傳完', missing });
  }
  if (segments.length === 0) return res.status(400).json({ error: '沒有任何錄音內容' });

  await s.ref.update({ status: 'organizing', durationSec });
  try {
    const organized = await organizeTranscript(segments);
    await s.ref.update({
      status: 'done',
      rawText: segments.map((x) => x.text).join(''),
      organized,
      labels: organized.labels, // 給後續硬需求 / 情緒價值 Agent 讀取
      organizedAt: FieldValue.serverTimestamp(),
    });
    res.json({ sessionId: req.params.id, ...organized });
  } catch (err) {
    console.error('整理失敗', err);
    await s.ref.update({ status: 'error' });
    res.status(502).json({ error: '文字整理失敗，可稍後重新整理' });
  }
});

// 4. 讀取結果（含分段原文）
router.get('/:id', async (req, res) => {
  const s = await loadSession(req, res);
  if (!s) return;
  const segs = await s.ref.collection('segments').orderBy('seq').get();
  res.json({
    sessionId: req.params.id,
    ...s.data,
    segments: segs.docs.map((d) => {
      const { seq, text, keywords, startSec } = d.data();
      return { seq, text, keywords, startSec };
    }),
  });
});

export default router;
