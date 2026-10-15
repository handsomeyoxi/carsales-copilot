/**
 * Firebase 連線
 *
 * 正式模式：用服務帳戶連真的 Firestore / Storage / Auth（GOOGLE_APPLICATION_CREDENTIALS）
 * 本機測試模式（.env 設 USE_MEMORY_DB=true）：
 *   不需要 Firebase 帳號，資料存在記憶體，伺服器重開就清空；錄音檔不存（SAVE_AUDIO 視為 false）
 */
import { memoryDb, MemoryFieldValue } from './memoryDb.js';

export const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true';

let db;
let FieldValue;
let bucket;
let auth;

if (USE_MEMORY_DB) {
  db = memoryDb;
  FieldValue = MemoryFieldValue;
  bucket = () => {
    throw new Error('本機測試模式（USE_MEMORY_DB=true）不能存錄音檔，請把 SAVE_AUDIO 設成 false');
  };
  auth = null;
  console.warn('⚠️  USE_MEMORY_DB=true：使用記憶體假資料庫，資料不會存到 Firestore，伺服器重開就清空');
} else {
  // 只有正式模式才載入 firebase-admin，本機測試不需要服務帳戶
  const { default: admin } = await import('firebase-admin');
  if (!admin.apps.length) {
    // GOOGLE_APPLICATION_CREDENTIALS 環境變數指向服務帳戶 JSON 時，applicationDefault() 會自動讀取
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
  db = admin.firestore();
  FieldValue = admin.firestore.FieldValue;
  bucket = () => admin.storage().bucket();
  auth = admin.auth();
}

export { db, FieldValue, bucket, auth };
