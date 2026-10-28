// Client-side Visitor Statistics & Presence Tracker
// 실제 사용자만 정밀 집계하고 개발/포팅 및 봇 트래픽을 자동 배제하는 유틸 및 React 훅

import { useState, useEffect, useRef } from 'react';

export interface VisitorStatsData {
  online: number;
  today: number;
  total: number;
  isExcluded: boolean;
  isLoading: boolean;
}

/**
 * 개발/포팅 환경 및 봇 세션 여부 판별
 * (실제 사람의 자연스러운 방문만 카운트하고, AI/개발자의 포팅 및 테스트 접속은 원천 배제)
 */
export function isDevOrPortingSession(): boolean {
  if (typeof window === 'undefined') return true;

  try {
    // 1. 호스트네임 검사 (로컬 개발 환경)
    const host = window.location.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return true;
    }

    // 2. 개발 포트 검사 (Vite 5173, Next 3000 등)
    const port = window.location.port;
    if (port === '5173' || port === '3000' || port === '8080' || port === '4173') {
      return true;
    }

    // 3. 로컬 스토리지 개발자 제외 플래그
    if (
      localStorage.getItem('wuthering_exclude_stats') === 'true' ||
      localStorage.getItem('wuthering_dev_mode') === 'true'
    ) {
      return true;
    }

    // 4. URL 파라미터 제외 지정 (?dev=true, ?exclude=true, ?test=true)
    const search = window.location.search;
    if (search.includes('dev=') || search.includes('exclude=') || search.includes('test=')) {
      return true;
    }

    // 5. 봇 및 자동화 헤드리스 브라우저 검사
    if (navigator.webdriver) return true;
    if (/bot|googlebot|crawler|spider|robot|crawling|headless|lighthouse/i.test(navigator.userAgent)) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * 한국 표준시 (KST, UTC+9) 기준 당일 날짜 문자열 (YYYYMMDD)
 */
export function getKstDateString(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 3600000);
  const year = kst.getFullYear();
  const month = String(kst.getMonth() + 1).padStart(2, '0');
  const day = String(kst.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 브라우저 세션별 고유 클라이언트 ID (새로고침 시 중복 접속자 증가 방지)
 */
export function getSessionClientId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = sessionStorage.getItem('wuthering_session_client_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 12);
      sessionStorage.setItem('wuthering_session_client_id', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

/**
 * 실시간 접속자 판별용 90초 시간 슬롯
 */
export function getCurrentSlot(): number {
  return Math.floor(Date.now() / 90000);
}

const COUNTAPI_BASE = 'https://countapi.mileshilliard.com/api/v1';
const TOTAL_KEY = 'wuthering_tcg_v1_total_visitors';

/**
 * 통계 API 호출 도우미 (/api/stats -> 실패 시 CountAPI 직결 폴백)
 */
async function fetchStatsApi(
  action: 'visit' | 'ping' | 'get',
  options: { incDaily?: boolean; incTotal?: boolean; slot: number; isExcluded: boolean; date: string }
): Promise<{ online: number; today: number; total: number; isDevExcluded: boolean } | null> {
  const clientId = getSessionClientId();
  const params = new URLSearchParams({
    action,
    slot: String(options.slot),
    date: options.date,
    clientId,
    isExcluded: options.isExcluded ? '1' : '0',
    incDaily: options.incDaily ? '1' : '0',
    incTotal: options.incTotal ? '1' : '0',
  });

  // 1. Cloudflare Pages Function (/api/stats) 우선 시도
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`/api/stats?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      return data;
    }
  } catch {
    // /api/stats 실패 시 (예: 로컬 vite dev 환경 등) 다음 폴백으로 진행
  }

  // 2. CountAPI 직결 폴백 (외부 서버 통신)
  try {
    const dailyKey = `wuthering_tcg_v1_daily_${options.date}`;
    const curSlotKey = `wuthering_tcg_v1_slot_${options.slot}`;
    const prevSlotKey = `wuthering_tcg_v1_slot_${options.slot - 1}`;

    if (!options.isExcluded) {
      if (action === 'visit') {
        const hits: Promise<any>[] = [];
        if (options.incTotal) hits.push(fetch(`${COUNTAPI_BASE}/hit/${TOTAL_KEY}`).catch(() => {}));
        if (options.incDaily) hits.push(fetch(`${COUNTAPI_BASE}/hit/${dailyKey}`).catch(() => {}));
        await Promise.allSettled(hits);
      } else if (action === 'ping') {
        await fetch(`${COUNTAPI_BASE}/hit/${curSlotKey}`).catch(() => {});
      }
    }

    const [totRes, dayRes, curRes, prevRes] = await Promise.allSettled([
      fetch(`${COUNTAPI_BASE}/get/${TOTAL_KEY}`).then((r) => r.json()),
      fetch(`${COUNTAPI_BASE}/get/${dailyKey}`).then((r) => r.json()),
      fetch(`${COUNTAPI_BASE}/get/${curSlotKey}`).then((r) => r.json()),
      fetch(`${COUNTAPI_BASE}/get/${prevSlotKey}`).then((r) => r.json()),
    ]);

    const tot = totRes.status === 'fulfilled' && totRes.value?.value ? parseInt(totRes.value.value, 10) : 1;
    const day = dayRes.status === 'fulfilled' && dayRes.value?.value ? parseInt(dayRes.value.value, 10) : 1;
    const cur = curRes.status === 'fulfilled' && curRes.value?.value ? parseInt(curRes.value.value, 10) : 0;
    const prev = prevRes.status === 'fulfilled' && prevRes.value?.value ? parseInt(prevRes.value.value, 10) : 0;

    const safeDay = Math.max(1, day);
    const safeTot = Math.max(1, tot, safeDay);

    return {
      online: Math.max(1, Math.max(cur, prev)),
      today: safeDay,
      total: safeTot,
      isDevExcluded: options.isExcluded,
    };
  } catch {
    return null;
  }
}

/**
 * 실시간 방문자 및 접속자 상태 React 훅
 */
export function useVisitorStats(): VisitorStatsData {
  const [stats, setStats] = useState<VisitorStatsData>(() => {
    // 로컬 스토리지에 캐시된 이전 수치가 있으면 깜빡임 없이 즉시 표시
    let cachedTotal = 1;
    let cachedToday = 1;
    try {
      cachedTotal = parseInt(localStorage.getItem('wuthering_cached_total') || '1', 10);
      cachedToday = parseInt(localStorage.getItem('wuthering_cached_today') || '1', 10);
      cachedTotal = Math.max(cachedTotal, cachedToday);
    } catch {}

    const isExcluded = isDevOrPortingSession();
    return {
      online: 1,
      today: cachedToday,
      total: cachedTotal,
      isExcluded,
      isLoading: true,
    };
  });

  const hasInitiatedVisitRef = useRef(false);

  useEffect(() => {
    const isExcluded = isDevOrPortingSession();
    const todayStr = getKstDateString();

    // 개발 환경일 경우 localStorage에 명시적 배제 플래그 영속화
    if (isExcluded) {
      try {
        localStorage.setItem('wuthering_exclude_stats', 'true');
      } catch {}
    }

    // 당일 방문 여부 확인 (1일 1회만 카운트 증가, 신규 일일 방문 시 총 누적 방문도 함께 증가)
    let isNewToday = false;

    try {
      const lastVisitDate = localStorage.getItem('wuthering_last_visit_date');

      if (lastVisitDate !== todayStr) {
        isNewToday = true;
        if (!isExcluded) {
          localStorage.setItem('wuthering_last_visit_date', todayStr);
        }
      }
    } catch {
      // 로컬 스토리지 제한 시 통과
    }

    const currentSlot = getCurrentSlot();

    const runVisitSync = async () => {
      const action = !hasInitiatedVisitRef.current && isNewToday ? 'visit' : 'ping';
      hasInitiatedVisitRef.current = true;

      const data = await fetchStatsApi(action, {
        incDaily: isNewToday && !isExcluded,
        incTotal: isNewToday && !isExcluded,
        slot: currentSlot,
        isExcluded,
        date: todayStr,
      });

      if (data) {
        const safeToday = Math.max(1, data.today);
        const safeTotal = Math.max(1, data.total, safeToday);

        setStats({
          online: data.online,
          today: safeToday,
          total: safeTotal,
          isExcluded,
          isLoading: false,
        });

        try {
          localStorage.setItem('wuthering_cached_total', String(safeTotal));
          localStorage.setItem('wuthering_cached_today', String(safeToday));
        } catch {}
      } else {
        setStats((prev) => ({ ...prev, isLoading: false }));
      }
    };

    // 1. 초기 방문 동기화
    runVisitSync();

    // 2. 60초 간격 실시간 생존 핑(Heartbeat) 및 통계 최신화
    const heartbeatInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return; // 탭 비활성 시 대기
      const activeSlot = getCurrentSlot();
      fetchStatsApi('ping', {
        incDaily: false,
        incTotal: false,
        slot: activeSlot,
        isExcluded,
        date: todayStr,
      }).then((data) => {
        if (data) {
          const safeToday = Math.max(1, data.today);
          const safeTotal = Math.max(1, data.total, safeToday);
          setStats((prev) => ({
            ...prev,
            online: data.online,
            today: safeToday,
            total: safeTotal,
            isLoading: false,
          }));
        }
      });
    }, 60000);

    // 3. 브라우저 탭 활성화 복귀 시 즉시 동기화
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const activeSlot = getCurrentSlot();
        fetchStatsApi('get', {
          incDaily: false,
          incTotal: false,
          slot: activeSlot,
          isExcluded,
          date: todayStr,
        }).then((data) => {
          if (data) {
            const safeToday = Math.max(1, data.today);
            const safeTotal = Math.max(1, data.total, safeToday);
            setStats((prev) => ({
              ...prev,
              online: data.online,
              today: safeToday,
              total: safeTotal,
            }));
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return stats;
}
