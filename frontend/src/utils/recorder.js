// 真的錄音（芷璇新增）：用瀏覽器的 MediaRecorder（網頁版、iPad Safari）
//
// 做法：
// - 每 30 秒 stop() 再 start()，每次 stop 拿到的都是「可以單獨播放」的完整音檔，上傳成一段
//   （不要用 start(timeslice)：那樣切出來的片段，除了第一段都不能單獨播放，後端會辨識失敗）
// - 暫停用 pause()／resume()，30 秒的計時也跟著暫停
// - 按結束：停掉最後一段 → 等所有段都上傳完（失敗的會重試）→ 才交給分析頁呼叫 finalize
//
// 錄音器放在這個檔案（不是錄音頁裡），所以錄音頁按「縮小」離開，錄音也不會停
// 手機 App（Expo Go）沒有 MediaRecorder：canRecord() 會是 false，錄音頁會改用模擬逐字稿
import * as api from '../api';

export const SEGMENT_SEC = 30;
const UPLOAD_RETRY_WAIT_MS = [1000, 3000]; // 上傳失敗：等 1 秒、3 秒再試，總共 3 次

let current = null; // 目前進行中的錄音（同一時間只會有一個）

export function canRecord() {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  );
}

export function getRecorder() {
  return current;
}

// 分析完成（或放棄）之後清掉，下次才能開始新的錄音
export function clearRecorder() {
  if (current) current.cancel();
  current = null;
}

// Chrome 用 webm；iPad Safari 不支援 webm，改用 mp4
function pickFormat() {
  const ok = (type) => (MediaRecorder.isTypeSupported ? MediaRecorder.isTypeSupported(type) : false);
  if (ok('audio/webm')) return { mimeType: 'audio/webm', ext: 'webm' };
  if (ok('audio/mp4')) return { mimeType: 'audio/mp4', ext: 'm4a' };
  return { mimeType: '', ext: 'webm' }; // 讓瀏覽器自己決定
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 開始錄音：會先跳出「允許使用麥克風」
// onSegment(seq, { text, keywords })：每段轉好文字時呼叫
// onUploadError(seq, error)：某段上傳失敗（結束時會再重試）
export async function startRecorder({ customerId, onSegment, onUploadError }) {
  if (current) return current;

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
    throw new Error(
      denied ? '沒有麥克風權限：請在瀏覽器網址列旁邊允許使用麥克風，再重新開始' : `打不開麥克風（${e && e.message}）`
    );
  }

  let conversationId;
  try {
    ({ conversationId } = await api.startRecording(customerId));
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }

  const format = pickFormat();
  const mr = new MediaRecorder(stream, format.mimeType ? { mimeType: format.mimeType } : undefined);
  let chunks = [];
  const segments = []; // { seq, blob, filename, startSec, durationSec, done, result, promise }
  let seq = 0;
  let segStartSec = 0; // 這一段從第幾秒開始
  let segElapsed = 0; // 這一段錄了幾秒（暫停不算）
  let totalSec = 0;
  let paused = false;
  let stopping = false;
  let cutting = false; // 正在切段（已呼叫 stop，等 onstop）
  let resolveStopped = null;
  let stopPromise = null;

  async function upload(s) {
    for (let attempt = 0; ; attempt++) {
      try {
        const result = await api.uploadSegment(conversationId, s);
        s.done = true;
        s.error = null;
        s.result = result;
        if (onSegment) onSegment(s.seq, result || {});
        return;
      } catch (e) {
        if (attempt < UPLOAD_RETRY_WAIT_MS.length) {
          await wait(UPLOAD_RETRY_WAIT_MS[attempt]);
          continue;
        }
        s.error = e;
        if (onUploadError) onUploadError(s.seq, e);
        return; // 不丟錯，結束時再統一重試
      }
    }
  }

  function finishSegment(blob) {
    if (!blob || blob.size === 0) return; // 剛好在切段時按結束，最後一段是空的
    const s = {
      seq,
      blob,
      filename: `seg-${seq}.${format.ext}`,
      startSec: segStartSec,
      durationSec: segElapsed,
      done: false,
    };
    seq += 1;
    segStartSec += segElapsed;
    segElapsed = 0;
    segments.push(s);
    s.promise = upload(s);
  }

  mr.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  mr.onstop = () => {
    cutting = false;
    const blob = new Blob(chunks, { type: mr.mimeType || format.mimeType || 'audio/webm' });
    chunks = [];
    finishSegment(blob);
    if (stopping) {
      if (resolveStopped) resolveStopped();
    } else {
      mr.start(); // 馬上開始錄下一段
      if (paused) mr.pause();
    }
  };

  // 每秒算一次：滿 30 秒就切一段
  const timer = setInterval(() => {
    if (paused || stopping) return;
    segElapsed += 1;
    totalSec += 1;
    if (segElapsed >= SEGMENT_SEC && mr.state !== 'inactive' && !cutting) {
      cutting = true;
      mr.stop();
    }
  }, 1000);

  mr.start();

  function release() {
    clearInterval(timer);
    stream.getTracks().forEach((t) => t.stop()); // 關掉麥克風（瀏覽器的紅點會消失）
  }

  current = {
    conversationId,
    get totalSec() {
      return totalSec;
    },
    get uploadedCount() {
      return segments.filter((s) => s.done).length;
    },
    pause() {
      paused = true;
      if (mr.state === 'recording') mr.pause();
    },
    resume() {
      paused = false;
      if (mr.state === 'paused') mr.resume();
    },
    // 結束錄音：回傳 { conversationId, totalSegments, durationSec }
    // 可以重複呼叫（分析頁按「重試」時），會回傳同一個結果，並重送上傳失敗的段落
    stop() {
      if (!stopPromise) {
        stopping = true;
        clearInterval(timer);
        stopPromise = new Promise((resolve) => {
          resolveStopped = resolve;
          if (mr.state !== 'inactive') mr.stop();
          else if (!cutting) resolve();
        }).then(release);
      }
      return stopPromise.then(async () => {
        await Promise.all(segments.map((s) => s.promise));
        const failed = segments.filter((s) => !s.done);
        for (const s of failed) {
          s.promise = upload(s);
          await s.promise;
        }
        const stillFailed = segments.filter((s) => !s.done);
        if (stillFailed.length > 0) {
          const list = stillFailed.map((s) => s.seq + 1).join('、');
          throw new Error(`第 ${list} 段錄音上傳失敗（${stillFailed[0].error && stillFailed[0].error.message}），請按重試`);
        }
        if (segments.length === 0) throw new Error('錄音時間太短，沒有錄到內容');
        return { conversationId, totalSegments: segments.length, durationSec: totalSec };
      });
    },
    // 放棄這次錄音（例如開始失敗、使用者離開）
    cancel() {
      stopping = true;
      try {
        if (mr.state !== 'inactive') mr.stop();
      } catch {
        // 已經停了
      }
      release();
    },
  };
  return current;
}
