// 開始錄音的共用流程：
// 這位客戶已經授權過 → 直接進全螢幕錄音
// 還沒授權 → 先到「錄音前客戶同意」頁
import { router } from 'expo-router';

export function goRecord(ctx, customerId, { replace = false } = {}) {
  const go = replace ? router.replace : router.push;
  if (customerId !== 'new' && ctx.hasConsent(customerId)) {
    ctx.startSession(customerId);
    go('/record/live');
  } else {
    go({ pathname: '/consent', params: { customerId } });
  }
}
