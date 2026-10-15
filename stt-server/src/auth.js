import { auth } from './firebase.js';

/**
 * 驗證 App 帶來的 Firebase ID Token（Authorization: Bearer <token>）
 * 驗證成功後 req.user = { uid, email }
 *
 * 本機測試：.env 設 SKIP_AUTH=true 就跳過驗證，所有請求都當成同一個測試帳號（DEV_UID）
 * 前端還沒接 Firebase 登入時，可以先用這個模式測語音功能。
 * ⚠️ 只能在自己電腦上用，NODE_ENV=production 時會被強制關閉。
 */
const SKIP_AUTH = process.env.SKIP_AUTH === 'true' && process.env.NODE_ENV !== 'production';
const DEV_UID = process.env.DEV_UID || 'dev-salesperson';

if (process.env.SKIP_AUTH === 'true' && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  NODE_ENV=production，已忽略 SKIP_AUTH，仍會檢查登入');
} else if (SKIP_AUTH) {
  console.warn(`⚠️  SKIP_AUTH=true：已跳過登入驗證，所有請求都視為「${DEV_UID}」，只能在本機測試使用！`);
}

export async function requireAuth(req, res, next) {
  if (SKIP_AUTH) {
    req.user = { uid: DEV_UID, email: 'dev@localhost' };
    return next();
  }

  if (!auth) {
    return res.status(500).json({ error: '伺服器沒有連上 Firebase Auth：本機測試請在 .env 設 SKIP_AUTH=true' });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '缺少登入憑證' });

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: '登入憑證無效或已過期' });
  }
}
