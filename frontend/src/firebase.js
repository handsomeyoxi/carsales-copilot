// Firebase 初始化（芷璇新增）：目前只用到登入（Authentication）
//
// 本機測試：預設連 Auth emulator（firebase emulators:start --only functions,firestore,auth）
// 正式環境：在 frontend/.env 填 Firebase Console 的網頁應用程式設定，並設定 EXPO_PUBLIC_USE_AUTH_EMULATOR=false
//   EXPO_PUBLIC_FIREBASE_API_KEY=...
//   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=carsales-copilot.firebaseapp.com
//   EXPO_PUBLIC_FIREBASE_PROJECT_ID=carsales-copilot
//   EXPO_PUBLIC_FIREBASE_APP_ID=...
//   EXPO_PUBLIC_USE_AUTH_EMULATOR=false
// 用手機測試時，EXPO_PUBLIC_AUTH_EMULATOR_URL 的 127.0.0.1 要換成電腦的區網 IP

import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  // emulator 不檢查 apiKey，所以本機測試可以先用假的
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'carsales-copilot.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'carsales-copilot',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 網頁版用 getAuth（瀏覽器會自己記住登入狀態）
// 手機版要用 AsyncStorage 記住登入，不然每次打開 App 都要重新登入
function createAuth() {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app); // 已經初始化過（例如存檔後畫面重新整理）
  }
}
export const auth = createAuth();

export const USE_AUTH_EMULATOR = process.env.EXPO_PUBLIC_USE_AUTH_EMULATOR !== 'false';
if (USE_AUTH_EMULATOR && !auth.emulatorConfig) {
  connectAuthEmulator(auth, process.env.EXPO_PUBLIC_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099', {
    disableWarnings: true,
  });
}

// Firebase 的錯誤代碼 → 給業務員看的中文
export function authErrorMessage(error) {
  const code = (error && error.code) || '';
  const map = {
    'auth/invalid-email': 'Email 格式不正確',
    'auth/missing-password': '請輸入密碼',
    'auth/invalid-credential': '帳號或密碼錯誤',
    'auth/wrong-password': '帳號或密碼錯誤',
    'auth/user-not-found': '找不到這個帳號，請先註冊',
    'auth/email-already-in-use': '這個 Email 已經註冊過了，請直接登入',
    'auth/weak-password': '密碼太簡單，請至少輸入 8 個字元',
    'auth/too-many-requests': '嘗試太多次了，請稍後再試',
    'auth/network-request-failed': '連不上登入伺服器，請確認網路或 emulator 有沒有開',
  };
  return map[code] || `登入發生錯誤（${code || (error && error.message) || '未知錯誤'}）`;
}
