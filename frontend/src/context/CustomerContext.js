// 全 App 共用的狀態：客戶、待辦、錄音同意、標籤驗證、詞庫、CRM、新手引導、AI 助理對話
// 任何頁面都用 useCustomers() 拿資料和操作函式
import { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../api';
import {
  initialConsents,
  initialCustomers,
  initialTodos,
  initialVocabulary,
  followUps as mockFollowUps,
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
  const [followUps, setFollowUps] = useState(mockFollowUps);

  // ---- 從後端載入資料 ----
  // dataSource：'mock' 假資料（還沒載入、載入失敗或 USE_MOCK）/ 'api' 後端資料
  // 載入失敗時保留假資料，畫面不會空掉，錯誤放在 loadError 給畫面顯示
  const [dataSource, setDataSource] = useState('mock');
  const [loading, setLoading] = useState(!api.USE_MOCK);
  const [loadError, setLoadError] = useState(null);

  async function reload() {
    if (api.USE_MOCK) return;
    setLoading(true);
    try {
      const data = await api.fetchDashboard();
      setCustomers(data.customers);
      setTodos(data.todos);
      setFollowUps(data.followUps);
      setDataSource('api');
      setLoadError(null);
    } catch (error) {
      console.warn('載入後端資料失敗，先用假資料：', error.message);
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

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
  // 註冊只建立帳號；姓名、品牌、展間等業務員資料在下一頁 setup-profile 填
  function register({ email }) {
    setProfile({ name: '', email, phone: '', brand: '', dealsThisMonth: 0 });
    setOnboarded(false); // 新帳號要看新手引導
  }

  // ---- AI 助理對話 ----
  const [chat, setChat] = useState([]);
  function addChatMessage(msg) {
    setChat((prev) => [...prev, { id: 'm' + Date.now() + Math.random(), ...msg }]);
  }

  // ---- 客戶 ----
    // 新增客戶：id 由前端產生並一起送給後端，所以畫面可以馬上跳到客戶頁，不用等後端回傳 id
  function addCustomer(customer) {
    const newCustomer = {
      id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6),
      stage: '初次接觸',
      status: 'new',
      closeProbability: 20,
      lastContactDays: 0,
      needs: { lookingAt: [], features: [] },
      ...customer,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    if (dataSource === 'api') {
      api
        .saveCustomer(newCustomer)
        .then((saved) => setCustomers((prev) => prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c))))
        .catch((error) => {
          console.warn('新增客戶失敗：', error.message);
          setCustomers((prev) => prev.filter((c) => c.id !== newCustomer.id));
        });
    }
    return newCustomer;
  }
  function getCustomer(id) {
    return customers.find((c) => c.id === id);
  }
  // 修改客戶：畫面先改，再存到後端；存失敗就改回原本的資料
  // status 走 updateCustomerStatus（標記成手動，AI 不會蓋掉），其他欄位走 saveCustomer
  function updateCustomer(id, patch) {
    const before = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    if (dataSource !== 'api' || !before) return;

    const { status, ...fields } = patch;
    const jobs = [];
    if (status !== undefined) jobs.push(api.updateCustomerStatus(id, status));
    if (Object.keys(fields).length > 0) {
      jobs.push(
        // 後端會把 needs 重新整理過（例如算出 budgetMax），用回傳的資料更新畫面
        api.saveCustomer({ id, ...fields }).then((saved) =>
          setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...saved, status: c.status } : c)))
        )
      );
    }
    Promise.all(jobs).catch((error) => {
      console.warn('客戶資料儲存失敗：', error.message);
      setCustomers((prev) => prev.map((c) => (c.id === id ? before : c)));
    });
  }

  // ---- 待辦 ----
  // 畫面先改（感覺比較快），再存到後端；存失敗就改回來
  function toggleTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const done = !todo.done;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    if (dataSource !== 'api') return;
    api.saveTodo({ id, done }).catch((error) => {
      console.warn('待辦儲存失敗：', error.message);
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !done } : t)));
    });
  }
  // 自己新增待辦：{ task, date: 'YYYY-MM-DD', time, customerId, priority }
  // 先用暫時的 id 顯示，後端存好後換成真正的 id
  function addTodo(todo) {
    const newTodo = { id: 'td' + Date.now(), priority: 'medium', time: '', customerId: null, done: false, ...todo };
    setTodos((prev) => [...prev, newTodo]);
    if (dataSource === 'api') {
      api
        .saveTodo({ ...newTodo, id: undefined })
        .then((saved) => setTodos((prev) => prev.map((t) => (t.id === newTodo.id ? saved : t))))
        .catch((error) => {
          console.warn('新增待辦失敗：', error.message);
          setTodos((prev) => prev.filter((t) => t.id !== newTodo.id));
        });
    }
    return newTodo;
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
  // AI 摘要頁的「✓ 正確」「✎ 修正」：畫面先顯示已確認，再存到後端（source: manual，之後 AI 不會蓋掉）
  // tag 來自 api.toAnalysis；存好後用後端回傳的標籤更新這位客戶；失敗就把畫面改回來
  function reviewCustomerTag(customerId, tag, status, value) {
    reviewTag(tag.id, status, value);
    if (dataSource !== 'api') return;
    api
      .saveCustomerTag(customerId, tag, value)
      .then(({ customerId: _id, ...saved }) =>
        setCustomers((prev) => prev.map((c) => (c.id === customerId ? api.toCustomer({ ...c, ...saved }) : c)))
      )
      .catch((error) => {
        console.warn('標籤儲存失敗：', error.message);
        setTagReviews((prev) => {
          const { [tag.id]: _removed, ...rest } = prev;
          return rest;
        });
      });
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
        updateCustomer,
        todos,
        toggleTodo,
        addTodo,
        followUps,
        dataSource,
        loading,
        loadError,
        reload,
        chat,
        addChatMessage,
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
        reviewCustomerTag,
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