import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAuth } from './auth.js';
import conversationsRouter from './routes/conversations.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) =>
  res.json({ ok: true, stt: process.env.STT_PROVIDER || 'groq', llm: process.env.LLM_PROVIDER || 'gemini' })
);

// 所有語音相關 API 都需要登入
app.use('/api/conversations', requireAuth, conversationsRouter);
// 舊路徑（合併前叫 sessions），前端改完就可以拿掉
app.use('/api/stt/sessions', requireAuth, conversationsRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`STT 後端已啟動：http://localhost:${port}`));
