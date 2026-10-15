import { toFile } from 'openai';
import { getProvider } from '../providers.js';

/**
 * 用雲端 Whisper 類模型轉寫一段音檔（groq 免費 / openai 付費）
 * @param {string} providerName 'groq' | 'openai'
 * @param {Buffer} buffer       音檔內容（m4a / wav / mp3 / webm 皆可）
 * @param {string} filename     原始檔名（依副檔名判斷格式）
 * @param {string} prompt       提示詞：領域詞彙 + 上一段的結尾文字
 */
export async function transcribeCloud(providerName, buffer, filename, prompt) {
  const { client, sttModel } = getProvider(providerName);
  if (!sttModel) throw new Error(`${providerName} 不提供語音轉文字`);

  const res = await client.audio.transcriptions.create({
    file: await toFile(buffer, filename),
    model: process.env.STT_MODEL || sttModel,
    // 指定 zh 可避免整段被判成英文；英文單字仍會照原樣保留
    language: 'zh',
    prompt,
    response_format: 'json',
    temperature: 0,
  });
  return res.text ?? '';
}
