# 對話紀錄與標籤：資料格式說明

給前端（串 API 的人）、F（整合）、品涵（標籤 Agent）、E 組（對話後分析）對照用。

## 1. sessions 和 conversations 合併成一筆

以前同一次對話會存兩份：stt-server 存一份 `sessions`（錄音、逐字稿），functions 再 `add` 一份 `conversations`（AI 分析），兩份只靠 `sessionId` 連起來。
現在只存 **`conversations/{conversationId}` 一筆**，錄音和分析都寫進同一份文件。

```
conversations/{conversationId}
├─ salespersonId      業務員 uid（以前 sessions 叫 salesId，舊資料還讀得到）
├─ customerId         客戶 id（錄音時還不知道可以先 null，分析時再帶）
├─ source             'recording'（App 錄音）| 'text'（直接貼文字給 AI 分析）
├─ status             recording → organizing → transcribed → analyzed；失敗是 error（error 欄位放原因，例如 API_KEY_INVALID）
├─ createdAt, durationSec, transcribedAt, analyzedAt, insightAt
├─ keywords[]         錄音中的即時關鍵字（全部段落合併）{ group, category, value }
├─ rawText            原始辨識文字
├─ transcript         語音整理結果 { utterances[{speaker,text,original,segmentSeq}], summary, uncertain[] }
├─ conversationText   「業務：…\n客戶：…」純文字，AI 分析讀這個
├─ analysis           ← functions analyzeAfterConversation（E 組）
├─ insight            ← functions analyzeInsight（品涵：hard_needs、emotional_values、concerns、emotion）
└─ segments/{00000}   每 20 秒一段：seq, text, candidates, keywords, startSec, durationSec, audioPath
```

## 2. 前端串接順序

| 步驟 | 打哪裡 | 帶什麼 | 拿到什麼 |
|---|---|---|---|
| 開始錄音 | stt-server `POST /api/conversations` | `{ customerId }` | `conversationId` |
| 每 20 秒 | stt-server `POST /api/conversations/:id/segments` | form-data `audio, seq, startSec, durationSec` | 這段文字＋即時關鍵字 |
| 按停止 | stt-server `POST /api/conversations/:id/finalize` | `{ totalSegments, durationSec }` | 整理後對話、`conversationText` |
| AI 分析 | functions `analyzeAfterConversation` | `{ conversationId, customerId, salespersonId }` | 摘要、待辦、成交機率… |
| 標籤 | functions `analyzeInsight` | `{ conversationId, customerId }` | 硬需求、情緒價值標籤 |

- 帶 `conversationId` 時 **不用再傳 `conversationText`**，functions 會自己讀那筆的逐字稿；客戶和業務員沒傳也會用那筆上面的。
- 沒有錄音、直接貼文字分析：照舊傳 `conversationText`、`customerId`，會新增一筆 `source: 'text'`。
- 相容舊寫法：stt-server 的 `/api/stt/sessions` 路徑還在，回應同時有 `conversationId` 和 `sessionId`（同一個值）；functions 收到 `sessionId` 也當成 `conversationId`。前端都改完後可以拿掉。
- 金鑰失效時兩邊都回 **503**、`code: "API_KEY_INVALID"`，`error` 會寫要換哪一把金鑰、去哪裡申請。

## 3. 標籤：只有一套類別

以品涵的硬需求／情緒價值類別為準，清單在 `functions/src/tagCategories.js`（stt-server 有一份一樣的 `src/tagCategories.js`，`npm test` 會檢查兩邊一致）。

| 群組 | 類別 |
|---|---|
| 硬需求 `hardNeeds`（文字欄位 `value`） | 車款、車型、顏色、預算、配備、用途、購車時間、付款方式、舊車換購、決策者、其他 |
| 情緒價值 `emotionalValues`（文字欄位 `label`） | 家庭、時間、心理、**嗜好**（新增） |

- 單一答案（新的會取代舊的）：預算、購車時間、付款方式、舊車換購
- 信心值 `confidence` 一律 **0～100 整數**（以前 stt-server 用 0～1）
- **嗜好**是這次新增的：stt 原本就有抓 hobby、前端假資料也有「嗜好：喜歡喝紅酒」，回訪軍師的開場可以用。品涵的 prompt 已經加上說明。

### 以前 stt-server 的英文類別怎麼對應

| 舊 `type` | 現在 |
|---|---|
| brand、model | 硬需求／車款 |
| feature | 硬需求／配備 |
| budget | 硬需求／預算 |
| color | 硬需求／顏色 |
| usage | 硬需求／用途 |
| time | 硬需求／購車時間 |
| family | 情緒價值／家庭 |
| hobby | 情緒價值／嗜好 |
| other | 硬需求／其他 |

另外即時關鍵字多抓了：車型（SUV、休旅、七人座…）、付款方式（分期、月付、現金…）、舊車換購（舊車、估車、折抵…）、決策者（要問我老婆…）。

### 誰產生標籤

- **錄音中**：stt-server 用規則抓「即時關鍵字」（`keywords`），只是提示，給錄音畫面顯示用。
- **錄音後**：只有 functions 的 `analyzeInsight` 產生正式標籤，併進客戶的 `hardNeeds` / `emotionalValues`。
  stt-server 的語音整理**不再另外產生 labels**，避免同一次對話有兩套標籤互相打架。
- AI 回傳不在清單的類別：硬需求改成「其他」，情緒價值直接丟掉；信心低於 40 丟掉（`functions/src/tags.js` 的 `normalizeInsight`）。
- 業務員手動加／改標籤（`saveCustomerTag`）的 category 也必須在清單裡，否則回 400。

### 前端假資料要對應的地方（之後接 API 時）

`frontend/src/data/mockData.js` 的 `analysis` 和後端格式差在：

| 前端假資料 | 後端（customers 文件） |
|---|---|
| `hard[].label` 是類別、`value` 是內容 | `hardNeeds[].category`、`value` |
| `emotion[].label` 是類別、`value` 是內容 | `emotionalValues[].category`、`label` |
| `confidence` 0～1，低於 0.75 待確認 | `confidence` 0～100，建議低於 75 待確認 |

## 4. 測試：只用模擬對話

不要用真實客戶錄音（免費版 Gemini 的資料可能被 Google 用來改善產品）。模擬對話在 `stt-server/src/mock/conversations.json`，全部虛構，可以自己加。

```bash
# stt-server：完全不需要金鑰、網路
cd stt-server
npm test                         # 單元測試（含整個錄音流程、兩邊類別是否一致）
npm run test:mock -- --offline   # 跑模擬對話，看即時關鍵字與流程
npm run check:keys               # 換金鑰後確認
npm run test:mock                # 用真的 Gemini 整理模擬對話（會用一點免費額度）

# functions
cd functions
npm test                         # 標籤邏輯單元測試
npm run check:key                # 確認 functions/.env 的金鑰
npm run test:mock                # 用真的 Gemini 跑品涵的標籤和 E 組的分析
```

App 端想不錄音就測整個畫面：stt-server 的 `.env` 設 `STT_PROVIDER=mock`（加 `LLM_PROVIDER=mock` 就完全不用金鑰），
App 照常錄音上傳，後端會忽略音檔、依段落順序回傳模擬對話；建立對話時 body 帶 `mockScript: "commuter-ev"` 可以換劇本。
