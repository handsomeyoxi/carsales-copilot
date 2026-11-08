import { getProvider, callProvider } from './providers.js';
import { organizeMock } from './mock/index.js';
import { geminiGenerateJson } from './gemini.js';

/**
 * 「整理文字」：錄音結束後，把所有分段逐字稿交給 LLM
 *  1. 修正錯字、補標點、去掉「嗯、那個、就是」等贅字
 *  2. 台語用字轉成通順的華語（保留原意，必要時附原台語說法）
 *  3. 區分「業務」與「客戶」發言
 *  4. 產生簡短摘要、列出需要業務員確認的地方
 *
 * 這一步「不」產生標籤：硬需求／情緒價值標籤統一由 functions 的 analyzeInsight（品涵的 Agent）產生，
 * 避免同一次對話有兩套標籤。錄音中的即時關鍵字見 vocab.js，類別也是同一套。
 *
 * 用 Structured Outputs（json_schema + strict）確保回傳格式固定，前端可直接渲染。
 */

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['utterances', 'summary', 'uncertain'],
  properties: {
    utterances: {
      type: 'array',
      description: '整理後的對話，依時間順序',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['speaker', 'text', 'original', 'segmentSeq'],
        properties: {
          speaker: { type: 'string', enum: ['sales', 'customer', 'unknown'] },
          text: { type: 'string', description: '整理後的繁體中文句子（英文專有名詞保留英文）' },
          original: { type: 'string', description: '若原句含台語或大幅改寫，放原始用字；否則空字串' },
          segmentSeq: { type: 'integer', description: '這句話來自第幾段音檔' },
        },
      },
    },
    summary: { type: 'string', description: '3~5 句重點摘要' },
    uncertain: {
      type: 'array',
      description: '聽不清楚、可能辨識錯誤、需要業務員確認的地方',
      items: { type: 'string' },
    },
  },
};

const SYSTEM_PROMPT = `你是台灣汽車展間的對話整理助理。輸入是語音辨識的分段逐字稿，對話是業務員與客戶，語言為國語、台語、英文夾雜。
請遵守：
- 一律輸出繁體中文、台灣用語；車款、品牌、配備等英文專有名詞保留英文（如 BMW X5、ADAS、CarPlay）。
- 語音辨識常把台語寫成同音怪字（例如「挖馬家」「厚啊」「足水」），請判斷原意改寫成華語（「我也覺得」「好啊」「很漂亮」），並把原始用字放在 original。
- 修正明顯的同音錯字（例如「GLC」被聽成「G L C」或「機哀西」）、補上標點、刪除贅字，但「不可以」新增對話中沒有的資訊。
- 依語氣與內容判斷說話者：介紹車輛、報價、詢問需求的通常是業務（sales）；描述家庭、預算、喜好的通常是客戶（customer）；無法判斷用 unknown。
- 若同一段有 cloud 與 breeze 兩個辨識版本，請綜合兩者取最合理的內容（英文名詞多信 cloud，台語多信 breeze）。
- 不確定的內容寫進 uncertain，不要自己猜。
- 只輸出一個 JSON 物件，不要加說明文字或 \`\`\` 標記，格式如下：
{"utterances":[{"speaker":"sales|customer|unknown","text":"整理後句子","original":"原始台語用字或空字串","segmentSeq":0}],
 "summary":"3~5 句重點摘要",
 "uncertain":["需要業務確認的地方"]}`;

/**
 * LLM_PROVIDER：gemini（預設，免費）/ groq（免費）/ openai（付費）/ mock（測試，不呼叫 AI）
 * 先要求嚴格 JSON Schema；若該服務或模型不支援，自動退回一般模式，再由 parseJson 容錯解析。
 */
export async function organizeTranscript(segments) {
  const providerName = process.env.LLM_PROVIDER || 'gemini';
  if (providerName === 'mock') return normalize(organizeMock(segments));

  const { client, llmModel } = await getProvider(providerName);
  const model = process.env.LLM_MODEL || llmModel;

  const input = segments
    .map((s) => {
      if (s.candidates) {
        return `[第${s.seq}段]\ncloud: ${s.candidates.cloud}\nbreeze: ${s.candidates.breeze}`;
      }
      return `[第${s.seq}段] ${s.text}`;
    })
    .join('\n');

  // Gemini 走原生 API（新的 AQ. 金鑰在 OpenAI 相容端點可能不能用），其他家走 OpenAI 相容寫法
  if (providerName === 'gemini') {
    return normalize(parseJson(await geminiGenerateJson({ model, system: SYSTEM_PROMPT, user: input })));
  }

  const base = {
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: input },
    ],
  };

  let res;
  try {
    res = await callProvider(providerName, () =>
      client.chat.completions.create({
        ...base,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'organized_transcript', strict: true, schema: SCHEMA },
        },
      })
    );
  } catch (err) {
    // 金鑰錯誤（Gemini 也是回 400）不要退回重試；只有「不支援這個參數」的 400 才退回一般模式
    if (err.code === 'API_KEY_INVALID' || err.status !== 400) throw err;
    res = await callProvider(providerName, () => client.chat.completions.create(base));
  }

  const msg = res.choices[0].message;
  if (msg.refusal) throw new Error(`LLM 拒絕整理：${msg.refusal}`);
  return normalize(parseJson(msg.content ?? ''));
}

// 容錯：去掉思考過程 <think>…</think> 和 ```json 標記，取出第一個 { 到最後一個 }
function parseJson(text) {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`LLM 沒有回傳 JSON：${text.slice(0, 200)}`);
  return JSON.parse(cleaned.slice(start, end + 1));
}

// 補齊欄位，確保前端拿到的格式一定正確
function normalize(o) {
  const speakers = ['sales', 'customer', 'unknown'];
  return {
    utterances: (Array.isArray(o.utterances) ? o.utterances : []).map((u) => ({
      speaker: speakers.includes(u.speaker) ? u.speaker : 'unknown',
      text: String(u.text ?? ''),
      original: String(u.original ?? ''),
      segmentSeq: Number.isInteger(u.segmentSeq) ? u.segmentSeq : 0,
    })),
    summary: String(o.summary ?? ''),
    uncertain: Array.isArray(o.uncertain) ? o.uncertain.map(String) : [],
  };
}

/**
 * 整理後的對話 → 給 AI 分析用的純文字（functions 的 analyzeAfterConversation / analyzeInsight 讀這個）
 *   業務：……
 *   客戶：……
 */
export function formatConversationText(utterances) {
  const who = { sales: '業務', customer: '客戶', unknown: '（未知）' };
  return (utterances ?? [])
    .filter((u) => u.text)
    .map((u) => `${who[u.speaker] ?? who.unknown}：${u.text}`)
    .join('\n');
}
