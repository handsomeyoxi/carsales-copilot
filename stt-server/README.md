# CarSales Copilot — 語音轉文字模組（VoiceRec）

對應計畫書的「VoiceRec 隨行語音紀錄助手」與「客情文字化分析」「實體辨識與標籤化處理」。
分成三塊，可以分別放進你們的前端 repo、後端 repo：

```
carsales-stt/
├── mobile/      → 放進前端（Expo / React Native）repo
│   ├── src/api/sttApi.js               呼叫後端的 API
│   ├── src/hooks/useChunkedRecorder.js 分段錄音 + 上傳佇列（核心）
│   ├── src/screens/VoiceRecScreen.js   錄音頁 UI（含整理後結果）
│   └── app.json.snippet.json           要合併進 app.json 的權限設定
├── backend/     → 放進後端（Node.js + Express + Firebase）repo
│   ├── src/index.js                    進入點
│   ├── src/routes/sessions.js          4 支 API
│   ├── src/stt/                        語音引擎（OpenAI / Breeze / 混合）
│   ├── src/organize.js                 LLM 文字整理
│   └── src/vocab.js                    車款詞庫 + 即時關鍵字規則
└── asr-server/  → 選用：自架台語辨識（Python）
```

## 運作流程

```
[App] 按錄音 ──► POST /sessions 建立一次錄音
   │ 每 20 秒切一段 m4a（16kHz 單聲道，約 160KB）
   ├──► POST /sessions/:id/segments ──► 語音轉文字 ──► 繁體轉換 ──► 規則抓關鍵字
   │       ◄── 回傳該段文字 + 關鍵字（畫面上的「即時逐字稿」「即時偵測到」）
   │ 按停止，等所有段上傳完
   └──► POST /sessions/:id/finalize ──► LLM 整理：修錯字、台語轉華語、
           ◄── 區分業務/客戶、標籤、摘要、待確認項目（存回 Firestore）
```

為什麼用「分段上傳」而不是即時串流：Expo 不用寫原生模組就能做、網路斷了音檔還留在手機會自動補傳、
後端用一般 REST API 即可。代價是延遲約 20～25 秒，對「記錄」這個用途已經足夠。

## 國語＋台語＋英文夾雜怎麼處理

這是整個功能最難的地方，目前沒有一個模型三種語言都很強，所以後端設計成可切換引擎。

語音轉文字（`STT_PROVIDER`）：

| 模式 | 引擎 | 費用 | 說明 |
|---|---|---|---|
| `groq`（預設） | Groq 上的 whisper-large-v3 | 免費額度 | 免架設、速度快，國語英文可用，台語常變同音怪字 |
| `openai` | gpt-4o-transcribe | 付費 | 國語英文較準，台語一樣弱 |
| `breeze` | 自架 Breeze-ASR-26（聯發創新基地） | 免費（自己的電腦/Colab） | 台語明顯較佳，需要 GPU 或較慢的 CPU |
| `hybrid` | 雲端 + breeze 都跑 | 看雲端用哪家 | 最準，LLM 合併兩份結果 |

文字整理（`LLM_PROVIDER`）：`gemini`（預設，免費額度）、`groq`（免費額度）、`openai`（付費）。
三家都相容 OpenAI 的 API 寫法，切換只要改 `.env`，程式不用動（見 `src/providers.js`）。

> 免費方案的注意事項：有每日次數上限（測試與 Demo 綽綽有餘）；Gemini 免費版的資料可能被 Google 用來改善產品，
> 所以測試請用「模擬對話」，不要錄真實客戶。正式上線再改成付費方案。

另外還有三層補強：

1. **提示詞**（`vocab.js` 的 `STT_HINT`）：把品牌、車款、配備名稱餵給語音模型，並帶上一段結尾文字讓斷句處接得起來。
2. **OpenCC 繁體轉換**：模型偶爾吐簡體字，一律轉成台灣繁體與用語。
3. **LLM 整理**（`organize.js`）：把「挖馬家」這類台語同音字改寫成華語，原話保留在 `original` 欄位；不確定的放進 `uncertain` 讓業務員確認，避免 AI 自己腦補。

建議先用預設的免費組合（groq + gemini）做出 Demo，再錄幾段台語對話測試；如果台語錯太多，再架 `asr-server` 切成 `breeze` 或 `hybrid`。

## 安裝與執行

### 申請免費金鑰

- Groq：到 https://console.groq.com/keys 用 Google 或 GitHub 帳號登入 → Create API Key
- Gemini：到 https://aistudio.google.com/apikey 用 Google 帳號登入 → 建立 API 金鑰

兩個都不需要綁信用卡。

### 沒有前端時先測試

```bash
cd backend
npm install
cp .env.example .env        # Windows 用 copy .env.example .env，再填入 GROQ_API_KEY、GEMINI_API_KEY
npm run test:stt -- test.m4a          # 完整流程：轉文字 → 關鍵字 → LLM 整理
npm run test:stt -- test.m4a --raw    # 只轉文字
```

### 本機測試模式（不用 Firebase、不用登入）

前端還沒接 Firebase 登入時，可以先這樣把 API 跑起來給前端測：

```bash
cd stt-server
npm install
copy .env.example .env      # Mac / Linux 用 cp
```

打開 `.env`，改這幾行：

```
SKIP_AUTH=true
USE_MEMORY_DB=true
SAVE_AUDIO=false
GROQ_API_KEY=你的金鑰
GEMINI_API_KEY=你的金鑰
```

再執行 `npm run dev`，看到兩行 ⚠️ 警告就代表是測試模式。這時前端不用帶登入憑證就能呼叫 API。

- 資料只存在記憶體，伺服器關掉就不見；正式 Demo 前要改回 `false` 並設定 Firebase。
- `NODE_ENV=production` 時 `SKIP_AUTH` 會自動失效，避免不小心上線時沒有驗證。

### 後端 API 伺服器

```bash
cd backend
npm install
cp .env.example .env        # 填入金鑰與 Firebase 設定
# 把 Firebase 服務帳戶金鑰存成 backend/serviceAccountKey.json（記得加進 .gitignore！）
npm run dev
```

API（都需要 `Authorization: Bearer <Firebase ID Token>`）：

| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | `/api/stt/sessions` | 開始錄音，body `{ customerId }`，回傳 `sessionId` |
| POST | `/api/stt/sessions/:id/segments` | form-data：`audio`、`seq`、`startSec`、`durationSec` |
| POST | `/api/stt/sessions/:id/finalize` | body `{ totalSegments, durationSec }`，回傳整理結果 |
| GET  | `/api/stt/sessions/:id` | 讀取這次錄音的全部資料 |

### App

```bash
npx expo install expo-audio expo-file-system
```

1. 把 `app.json.snippet.json` 的設定合併進 `app.json`。
2. 專案根目錄 `.env` 加上 `EXPO_PUBLIC_API_URL=http://你電腦的區網IP:3000`（手機實機不能用 localhost）。
3. 登入完成後呼叫一次：
   ```js
   import { setTokenProvider } from './src/api/sttApi';
   setTokenProvider(() => auth.currentUser.getIdToken());
   ```
4. 在導覽裡放入 `<VoiceRecScreen customerId={id} customerName={name} />`。

**背景錄音必須用 development build 測試**（`npx expo run:android` / `npx expo run:ios` 或 EAS Build），
Expo Go 不支援背景錄音的設定。Android 背景錄音時會出現常駐通知，這是系統規定。

### 選用：自架台語辨識

```bash
cd asr-server
pip install -r requirements.txt     # 另外需要安裝 ffmpeg
uvicorn server:app --host 0.0.0.0 --port 8001
```

後端 `.env` 設 `STT_PROVIDER=breeze`（或 `hybrid`）與 `BREEZE_ASR_URL`。
模型約 3GB，有 NVIDIA GPU 最順；只有 CPU 的話可改用 Hugging Face 上社群轉好的 faster-whisper int8 版本，速度會快很多。
學校的 GPU 主機或 Google Colab + ngrok 都可以拿來 Demo。

## 已知限制與可以再做的事

- **說話者辨識**目前靠 LLM 依內容判斷，兩人語氣相近時可能分錯；之後可接 pyannote 等聲紋分離模型。
- **切段處**偶爾會切到一個字的一半；之後可改成偵測到安靜時才切（VAD）。
- **Android 省電機制**可能讓背景計時器變慢，結果只是那一段比較長，不會掉資料（單段上限 25MB，約 50 分鐘）。
- **整理結果的 `labels`** 已存進 session，負責「硬需求 Agent / 情緒價值 Agent」的組員可以直接讀取，不用再從逐字稿重抓。

## 個資與錄音同意（請務必處理）

錄的是客戶的聲音與家庭、財務資訊，屬於個人資料：

- 錄音前要告知客戶並取得同意（畫面上已有提示，可再加勾選框留下紀錄）。
- `serviceAccountKey.json`、`.env` 絕對不能 commit 上 GitHub。
- Firestore / Storage Security Rules 要限制業務員只能讀自己的 `sessions`。
- 若不需要保留原始音檔，把 `SAVE_AUDIO` 設成 `false`。
- 計畫書 SWOT 的威脅提到隱私法規，口試時被問到可以用以上幾點回答。
