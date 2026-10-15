/**
 * 呼叫自架的 asr-server（見 /asr-server，跑 MediaTek Breeze-ASR-26）
 * Breeze-ASR-26 針對台語微調，輸出為華語漢字，國語也能辨識。
 */
export async function transcribeBreeze(buffer, filename, prompt) {
  const form = new FormData();
  form.append('file', new Blob([buffer]), filename);
  if (prompt) form.append('prompt', prompt);

  const res = await fetch(`${process.env.BREEZE_ASR_URL}/transcribe`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Breeze ASR 失敗：${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.text ?? '';
}
