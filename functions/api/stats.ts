// Cloudflare Pages Function - /api/stats
// 실시간 접속자 수, 오늘 하루 방문자 수, 총 누적 방문자 수 집계 및 조회 API

interface Env {
  VISITOR_STATS?: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS 및 캐시 제어 헤더
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const action = url.searchParams.get('action') || 'get';
  const incDaily = url.searchParams.get('incDaily') === '1';
  const incTotal = url.searchParams.get('incTotal') === '1';
  const slotParam = url.searchParams.get('slot');
  const dateParam = url.searchParams.get('date');

  // 개발/포팅 및 봇 요청 감지 (실제 사용자만 집계)
  const isExcludedParam = url.searchParams.get('isExcluded') === '1' || url.searchParams.get('isDev') === '1';
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const userAgent = request.headers.get('user-agent') || '';

  const isLocalOrigin =
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    referer.includes('localhost') ||
    referer.includes('127.0.0.1');

  const isBot = /bot|googlebot|crawler|spider|robot|crawling|headless|lighthouse/i.test(userAgent);

  const shouldExclude = isExcludedParam || isLocalOrigin || isBot;

  // 한국 표준시 (KST, UTC+9) 기준 당일 날짜 키 계산
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 3600000);
  const dateKey =
    dateParam ||
    `${kst.getFullYear()}${String(kst.getMonth() + 1).padStart(2, '0')}${String(kst.getDate()).padStart(2, '0')}`;

  // 실시간 접속 판별을 위한 90초 단위 시간 슬롯
  const currentSlot = slotParam ? parseInt(slotParam, 10) : Math.floor(Date.now() / 90000);

  // 1. Cloudflare KV가 바인딩된 경우 (초고속 네이티브 KV 사용)
  if (env.VISITOR_STATS) {
    try {
      if (!shouldExclude) {
        if (action === 'visit') {
          if (incTotal) {
            const currentTot = parseInt((await env.VISITOR_STATS.get('total')) || '0', 10);
            await env.VISITOR_STATS.put('total', String(currentTot + 1));
          }
          if (incDaily) {
            const currentDay = parseInt((await env.VISITOR_STATS.get(`daily_${dateKey}`)) || '0', 10);
            await env.VISITOR_STATS.put(`daily_${dateKey}`, String(currentDay + 1), { expirationTtl: 86400 * 7 });
          }
        } else if (action === 'ping') {
          const currentSlotCount = parseInt((await env.VISITOR_STATS.get(`slot_${currentSlot}`)) || '0', 10);
          await env.VISITOR_STATS.put(`slot_${currentSlot}`, String(currentSlotCount + 1), { expirationTtl: 600 });
        }
      }

      const [totalStr, dailyStr, curSlotStr, prevSlotStr] = await Promise.all([
        env.VISITOR_STATS.get('total'),
        env.VISITOR_STATS.get(`daily_${dateKey}`),
        env.VISITOR_STATS.get(`slot_${currentSlot}`),
        env.VISITOR_STATS.get(`slot_${currentSlot - 1}`),
      ]);

      const total = parseInt(totalStr || '0', 10);
      const today = parseInt(dailyStr || '0', 10);
      const curSlotCount = parseInt(curSlotStr || '0', 10);
      const prevSlotCount = parseInt(prevSlotStr || '0', 10);
      const online = Math.max(1, Math.max(curSlotCount, prevSlotCount));

      return new Response(
        JSON.stringify({
          online,
          today: Math.max(1, today),
          total: Math.max(1, total),
          isDevExcluded: shouldExclude,
          updatedAt: Date.now(),
        }),
        { headers }
      );
    } catch (kvErr) {
      console.warn('[KV Error, falling back to CountAPI]:', kvErr);
    }
  }

  // 2. CountAPI 기반 클라우드 카운터 폴백
  const totalKey = 'wuthering_tcg_v1_total_visitors';
  const dailyKey = `wuthering_tcg_v1_daily_${dateKey}`;
  const slotKey = `wuthering_tcg_v1_slot_${currentSlot}`;
  const prevSlotKey = `wuthering_tcg_v1_slot_${currentSlot - 1}`;

  const API_BASE = 'https://countapi.mileshilliard.com/api/v1';

  try {
    // 집계 실행 (포팅/개발/봇 제외 시에는 실행 안 함)
    if (!shouldExclude) {
      if (action === 'visit') {
        const hitPromises: Promise<any>[] = [];
        if (incTotal) hitPromises.push(fetch(`${API_BASE}/hit/${totalKey}`));
        if (incDaily) hitPromises.push(fetch(`${API_BASE}/hit/${dailyKey}`));
        await Promise.allSettled(hitPromises);
      } else if (action === 'ping') {
        await fetch(`${API_BASE}/hit/${slotKey}`).catch(() => {});
      }
    }

    // 통계 조회
    const [totRes, dailyRes, curSlotRes, prevSlotRes] = await Promise.allSettled([
      fetch(`${API_BASE}/get/${totalKey}`).then((r) => r.json()),
      fetch(`${API_BASE}/get/${dailyKey}`).then((r) => r.json()),
      fetch(`${API_BASE}/get/${slotKey}`).then((r) => r.json()),
      fetch(`${API_BASE}/get/${prevSlotKey}`).then((r) => r.json()),
    ]);

    const totVal = totRes.status === 'fulfilled' && totRes.value?.value ? parseInt(totRes.value.value, 10) : 1;
    const dailyVal = dailyRes.status === 'fulfilled' && dailyRes.value?.value ? parseInt(dailyRes.value.value, 10) : 1;
    const curSlotVal = curSlotRes.status === 'fulfilled' && curSlotRes.value?.value ? parseInt(curSlotRes.value.value, 10) : 0;
    const prevSlotVal = prevSlotRes.status === 'fulfilled' && prevSlotRes.value?.value ? parseInt(prevSlotRes.value.value, 10) : 0;

    const online = Math.max(1, Math.max(curSlotVal, prevSlotVal));

    return new Response(
      JSON.stringify({
        online,
        today: Math.max(1, dailyVal),
        total: Math.max(1, totVal),
        isDevExcluded: shouldExclude,
        updatedAt: Date.now(),
      }),
      { headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        online: 1,
        today: 1,
        total: 1,
        isDevExcluded: shouldExclude,
        error: String(err),
      }),
      { headers }
    );
  }
};
