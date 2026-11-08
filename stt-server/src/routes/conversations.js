import { Router } from 'express';
import multer from 'multer';
import { db, bucket, FieldValue, USE_MEMORY_DB } from '../firebase.js';
import { transcribe } from '../stt/index.js';
import { detectKeywords } from '../vocab.js';
import { organizeTranscript } from '../organize.js';
import { createConversationService, HttpError } from '../conversations.js';

/**
 * 錄音對話 API（掛在 /api/conversations；舊路徑 /api/stt/sessions 也還能用）
 * 資料結構與商業邏輯在 ../conversations.js
 */
const service = createConversationService({
  db,
  FieldValue,
  bucket,
  saveAudio: process.env.SAVE_AUDIO === 'true' && !USE_MEMORY_DB,
  transcribe,
  detectKeywords,
  organizeTranscript,
});

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // OpenAI 單檔上限 25MB
});

// 錯誤 → HTTP 回應：金鑰失效回 503 並講清楚要換哪把金鑰
function sendError(res, err, fallback) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
  if (err.code === 'API_KEY_INVALID') {
    console.error(err.message);
    return res.status(503).json({ error: err.message, code: 'API_KEY_INVALID' });
  }
  console.error(fallback, err);
  return res.status(502).json({ error: fallback });
}

// 1. 開始錄音  body: { customerId, mockScript? }
router.post('/', async (req, res) => {
  try {
    const { conversationId } = await service.create(req.user.uid, req.body ?? {});
    // sessionId 是舊名稱，給還沒改的前端用
    res.status(201).json({ conversationId, sessionId: conversationId });
  } catch (err) {
    sendError(res, err, '建立對話紀錄失敗');
  }
});

// 2. 上傳一段音檔  form-data: audio(file), seq, startSec, durationSec
router.post('/:id/segments', upload.single('audio'), async (req, res) => {
  try {
    const result = await service.addSegment(req.params.id, req.user.uid, {
      buffer: req.file?.buffer,
      filename: req.file?.originalname,
      mimetype: req.file?.mimetype,
      seq: Number(req.body.seq),
      startSec: req.body.startSec,
      durationSec: req.body.durationSec,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, '語音轉寫失敗，請稍後重試');
  }
});

// 3. 錄音結束 → 整理  body: { totalSegments, durationSec }
router.post('/:id/finalize', async (req, res) => {
  try {
    res.json(await service.finalize(req.params.id, req.user.uid, req.body ?? {}));
  } catch (err) {
    sendError(res, err, '文字整理失敗，可稍後重新整理');
  }
});

// 4. 讀取結果（含分段原文）
router.get('/:id', async (req, res) => {
  try {
    res.json(await service.get(req.params.id, req.user.uid));
  } catch (err) {
    sendError(res, err, '讀取對話紀錄失敗');
  }
});

export default router;
