// 全 App 共用的狀態：客戶、待辦、錄音同意、標籤驗證、詞庫、CRM、新手引導
// 任何頁面都用 useCustomers() 拿資料和操作函式
import { createContext, useContext, useState } from 'react';
import {
  initialConsents,
  initialCustomers,
  initialTodos,
  initialVocabulary,
  salesperson,
  transcript,
} from '../data/mockData';

const CustomerContext = createContext(null);

// 產生「2026/10/05 14:18」格式的時間
function nowText() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function CustomerProvider({ children }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [todos, setTodos] = useState(initialTodos);
  const [consents, setConsents] = useState(initialConsents);
  // 進行中的錄音：{ customerId, consentTime, startedAt, pausedAt, pausedMs, lines, marks }
  // 存在這裡（而不是錄音頁裡），所以錄音畫面「縮小」離開再回來，時間和逐字稿都還在
  const [activeSession, setActiveSession] = useState(null);
  const [tagReviews, setTagReviews] = useState({}); // { 標籤id: { status: 'confirmed' | 'edited', value } }
  const [vocabulary, setVocabulary] = useState(initialVocabulary);
  const [crm, setCrm] = useState({ system: '原廠 DMS', lastSync: '尚未同步' });
  const [onboarded, setOnboarded] = useState(false);
  const [profile, setProfile] = useState(salesperson); // 目前登入的業務員
  const [termsAgreed, setTermsAgreed] = useState(false); // 註冊頁「同意條款」勾選框
  // 通知設定（之後接 expo-notifications 推播）
  const [notify, setNotify] = useState({
    followUp: true, // 每天早上推播今日回訪
    todoDue: true, // 待辦到期提醒
    analysisDone: true, // AI 分析完成
    lowConfidence: true, // 有低信心標籤待確認
    quietHours: false, // 勿擾時段 21:00–08:00
    time: '09:00', // 每日提醒時間
  });
  function updateNotify(patch) {
    setNotify((prev) => ({ ...prev, ...patch }));
  }

  // ---- 編輯個人資料 ----
  function updateProfile(patch) {
    setProfile((prev) => ({ ...prev, ...patch }));
  }

  // ---- 註冊 ----（之後換成 Firebase Auth 的 createUserWithEmailAndPassword）
  function register({ name, email, phone, branch }) {
    setProfile({ name, email, phone, title: `業務 · ${branch}`, dealsThisMonth: 0 });
    setOnboarded(false); // 新帳號要看新手引導
  }

  // ---- 客戶 ----
  function addCustomer(customer) {
    const newCustomer = {
      id: 'c' + Date.now(),
      stage: '初次接觸',
      closeProbability: 20,
      lastContactDays: 0,
      ...customer,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    return newCustomer;
  }
  function getCustomer(id) {
    return customers.find((c) => c.id === id);
  }

  // ---- 待辦 ----
  function toggleTodo(id) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  // ---- 錄音同意 + 錄音工作階段 ----
  // customerId 可以是 'new'：新客戶，先錄音、錄完 AI 預填資料再建檔
  function hasConsent(customerId) {
    return consents.some((c) => c.customerId === customerId && c.status === 'active');
  }
  function startSession(customerId) {
    const consent = consents.find((c) => c.customerId === customerId && c.status === 'active');
    setActiveSession({
      customerId,
      consentTime: consent ? consent.time : nowText(),
      startedAt: Date.now(),
      pausedAt: null,
      pausedMs: 0,
      lines: transcript, // 模擬的逐字稿；之後換成 Whisper 即時回傳
      marks: 0,
    });
  }
  function giveConsentAndStart(customerId, method) {
    const customer = getCustomer(customerId);
    const record = {
      id: 'cs' + Date.now(),
      customerId,
      customerName: customer ? customer.name : '新客戶',
      time: nowText(),
      method,
      status: 'active',
    };
    setConsents((prev) => [record, ...prev]);
    setActiveSession({
      customerId,
      consentTime: record.time,
      startedAt: Date.now(),
      pausedAt: null,
      pausedMs: 0,
      lines: transcript,
      marks: 0,
    });
  }
  function updateSession(patch) {
    setActiveSession((prev) => (prev ? { ...prev, ...patch } : prev));
  }
  function togglePause() {
    setActiveSession((prev) => {
      if (!prev) return prev;
      if (prev.pausedAt) return { ...prev, pausedMs: prev.pausedMs + (Date.now() - prev.pausedAt), pausedAt: null };
      return { ...prev, pausedAt: Date.now() };
    });
  }
  function endSession() {
    setActiveSession(null);
  }
  function revokeConsent(id) {
    setConsents((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'revoked' } : c)));
  }

  // ---- AI 標籤驗證 ----
  function reviewTag(tagId, status, value) {
    setTagReviews((prev) => ({ ...prev, [tagId]: { status, value } }));
  }

  // ---- 專有名詞詞庫 ----
  function addTerm(term) {
    const t = term.trim();
    if (!t || vocabulary.includes(t)) return false;
    setVocabulary((prev) => [t, ...prev]);
    return true;
  }
  function removeTerm(term) {
    setVocabulary((prev) => prev.filter((v) => v !== term));
  }

  // ---- CRM ----
  function chooseCrm(system) {
    setCrm((prev) => ({ ...prev, system }));
  }
  function syncCrm() {
    setCrm((prev) => ({ ...prev, lastSync: nowText() }));
  }

  return (
    <CustomerContext.Provider
      value={{
        customers,
        addCustomer,
        getCustomer,
        todos,
        toggleTodo,
        consents,
        activeSession,
        hasConsent,
        startSession,
        giveConsentAndStart,
        updateSession,
        togglePause,
        endSession,
        revokeConsent,
        tagReviews,
        reviewTag,
        vocabulary,
        addTerm,
        removeTerm,
        crm,
        chooseCrm,
        syncCrm,
        onboarded,
        setOnboarded,
        profile,
        register,
        termsAgreed,
        setTermsAgreed,
        notify,
        updateNotify,
        updateProfile,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers() {
  return useContext(CustomerContext);
}
