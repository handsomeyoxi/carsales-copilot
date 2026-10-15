import * as OpenCC from 'opencc-js';
import { transcribeCloud } from './cloud.js';
import { transcribeBreeze } from './breeze.js';
import { STT_HINT } from '../vocab.js';

// Whisper 常吐出簡體字，統一轉成台灣繁體（含台灣慣用詞）
const toTW = OpenCC.Converter({ from: 'cn', to: 'twp' });

/**
 * 統一的轉寫入口，依 STT_PROVIDER 選擇引擎：
 *   groq   （預設，免費）Groq 上的 whisper-large-v3
 *   openai （付費）gpt-4o-transcribe
 *   breeze （免費，自架）Breeze-ASR-26，台語較佳
 *   hybrid  雲端 + breeze 都跑，交給整理階段的 LLM 合併；雲端用哪家由 HYBRID_CLOUD 決定（預設 groq）
 *
 * 回傳 { text, candidates }，candidates 只有 hybrid 模式才有
 */
export async function transcribe(buffer, filename, { previousText = '' } = {}) {
  // Whisper 的提示詞上限約 224 tokens，所以詞彙表保持精簡，再接上一段最後 40 字
  const prompt = `${STT_HINT}${previousText.slice(-40)}`;
  const provider = process.env.STT_PROVIDER || 'groq';

  if (provider === 'breeze') {
    return { text: toTW(await transcribeBreeze(buffer, filename, prompt)), candidates: null };
  }

  if (provider === 'hybrid') {
    const cloudName = process.env.HYBRID_CLOUD || 'groq';
    const [a, b] = await Promise.allSettled([
      transcribeCloud(cloudName, buffer, filename, prompt),
      transcribeBreeze(buffer, filename, prompt),
    ]);
    const cloud = a.status === 'fulfilled' ? toTW(a.value) : '';
    const breeze = b.status === 'fulfilled' ? toTW(b.value) : '';
    if (!cloud && !breeze) throw new Error('兩個語音引擎都失敗');
    // 即時顯示先用雲端版本（英文車款名較準），兩份都保留給整理階段
    return { text: cloud || breeze, candidates: { cloud, breeze } };
  }

  return { text: toTW(await transcribeCloud(provider, buffer, filename, prompt)), candidates: null };
}
