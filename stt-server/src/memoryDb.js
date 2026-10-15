/**
 * 本機測試用的「假 Firestore」：資料只存在記憶體，伺服器關掉就消失。
 * 只實作 routes/sessions.js 會用到的功能，讓沒有 Firebase 帳號的人也能把語音 API 跑起來。
 * 只在 .env 設 USE_MEMORY_DB=true 時才會用到，正式環境請用真的 Firestore。
 */

const store = new Map(); // key = 文件路徑，例如 sessions/abc 或 sessions/abc/segments/00001

let counter = 0;
const newId = () => `dev${Date.now().toString(36)}${(counter++).toString(36)}`;

// 模擬 FieldValue.serverTimestamp()：直接存現在時間
export const MemoryFieldValue = {
  serverTimestamp: () => new Date(),
};

function snapshot(path) {
  const data = store.get(path);
  return {
    id: path.split('/').pop(),
    exists: data !== undefined,
    data: () => (data === undefined ? undefined : { ...data }),
  };
}

function docRef(path) {
  return {
    id: path.split('/').pop(),
    path,
    async get() {
      return snapshot(path);
    },
    async set(data, options = {}) {
      const old = options.merge ? store.get(path) || {} : {};
      store.set(path, { ...old, ...data });
    },
    async update(data) {
      if (!store.has(path)) throw new Error(`文件不存在：${path}`);
      store.set(path, { ...store.get(path), ...data });
    },
    collection(name) {
      return collectionRef(`${path}/${name}`);
    },
  };
}

function collectionRef(path) {
  const depth = path.split('/').length + 1;
  const docsInCollection = () =>
    [...store.keys()].filter((k) => k.startsWith(`${path}/`) && k.split('/').length === depth);

  const query = (field) => ({
    async get() {
      const docs = docsInCollection().map(snapshot);
      if (field) docs.sort((a, b) => (a.data()[field] > b.data()[field] ? 1 : -1));
      return { docs, empty: docs.length === 0, size: docs.length };
    },
  });

  return {
    doc(id = newId()) {
      return docRef(`${path}/${id}`);
    },
    async add(data) {
      const ref = docRef(`${path}/${newId()}`);
      await ref.set(data);
      return ref;
    },
    orderBy(field) {
      return query(field);
    },
    async get() {
      return query().get();
    },
  };
}

export const memoryDb = {
  collection: (name) => collectionRef(name),
};
