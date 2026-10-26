// Cloudflare Pages Function - /api/stats
// 실시간 접속자 수, 오늘 하루 방문자 수, 총 누적 방문자 수 집계 및 조회 API (D1 & KV 하이브리드 지원)

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface Env {
  DB?: D1Database;
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
  const clientId = url.searchParams.get('clientId') || '';
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
  const dailyId = `daily_${dateKey}`;

  const nowTs = Date.now();
  const expiredTs = nowTs - 90 * 1000; // 90초 유효 세션

  // 1순위: Cloudflare D1 (고성능 관계형 SQL)
  if (env.DB) {
    try {
      const statements: D1PreparedStatement[] = [];

      // 만료된 활성 세션 청소
      statements.push(env.DB.prepare('DELETE FROM active_sessions WHERE last_seen < ?').bind(expiredTs));

      // 방문자 카운트 및 세션 갱신
      if (!shouldExclude) {
        if (action === 'visit') {
          if (incTotal) {
            statements.push(
              env.DB.prepare(
                'INSERT INTO stats_counters (id, val, updated_at) VALUES (\'total\', 1, ?) ON CONFLICT(id) DO UPDATE SET val = val + 1, updated_at = ?'
              ).bind(nowTs, nowTs)
            );
          }
          if (incDaily) {
            statements.push(
              env.DB.prepare(
                'INSERT INTO stats_counters (id, val, updated_at) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET val = val + 1, updated_at = ?'
              ).bind(dailyId, nowTs, nowTs)
            );
          }
        }
        if (clientId) {
          statements.push(
            env.DB.prepare(
              'INSERT INTO active_sessions (client_id, last_seen) VALUES (?, ?) ON CONFLICT(client_id) DO UPDATE SET last_seen = ?'
            ).bind(clientId, nowTs, nowTs)
          );
        }
      }

      // 배치 트랜잭션 실행
      if (statements.length > 0) {
        await env.DB.batch(statements);
      }

      // 통계 조회 (동시 쿼리)
      const [onlineRes, countersRes] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as count FROM active_sessions WHERE last_seen >= ?').bind(expiredTs).first<{ count: number }>(),
        env.DB.prepare('SELECT id, val FROM stats_counters WHERE id IN (\'total\', ?)').bind(dailyId).all<{ id: string; val: number }>(),
      ]);

      const online = Math.max(1, onlineRes?.count || 1);
      let total = 0;
      let today = 0;

      if (countersRes?.results) {
        for (const row of countersRes.results) {
          if (row.id === 'total') total = row.val;
          if (row.id === dailyId) today = row.val;
        }
      }

      return new Response(
        JSON.stringify({
          online,
          today: Math.max(1, today),
          total: Math.max(1, total),
          isDevExcluded: shouldExclude,
          source: 'd1',
          updatedAt: nowTs,
        }),
        { headers }
      );
    } catch (d1Error) {
      console.warn('[Stats API D1 Error - Falling back to KV]:', d1Error);
    }
  }

  // 2순위 폴백: Cloudflare KV (기존 운영 데이터 보존)
  if (env.VISITOR_STATS) {
    try {
      if (!shouldExclude) {
        if (action === 'visit') {
          if (incTotal) {
            const currentTot = parseInt((await env.VISITOR_STATS.get('total')) || '0', 10);
            await env.VISITOR_STATS.put('total', String(currentTot + 1));
          }
          if (incDaily) {
            const currentDay = parseInt((await env.VISITOR_STATS.get(dailyId)) || '0', 10);
            await env.VISITOR_STATS.put(dailyId, String(currentDay + 1), { expirationTtl: 86400 * 7 });
          }
        }
        if (clientId) {
          await env.VISITOR_STATS.put(`active_client_${clientId}`, '1', { expirationTtl: 120 });
        }
      }

      const activeUsers = await env.VISITOR_STATS.list({ prefix: 'active_client_' });
      const online = Math.max(1, activeUsers.keys.length);

      const [totalStr, dailyStr] = await Promise.all([
        env.VISITOR_STATS.get('total'),
        env.VISITOR_STATS.get(dailyId),
      ]);

      const total = parseInt(totalStr || '0', 10);
      const today = parseInt(dailyStr || '0', 10);

      return new Response(
        JSON.stringify({
          online,
          today: Math.max(1, today),
          total: Math.max(1, total),
          isDevExcluded: shouldExclude,
          source: 'kv',
          updatedAt: nowTs,
        }),
        { headers }
      );
    } catch (kvError) {
      console.warn('[Stats API KV Error]:', kvError);
    }
  }

  // 3순위 폴백: 기본 로컬 응답
  return new Response(
    JSON.stringify({
      online: 1,
      today: 1,
      total: 1,
      isDevExcluded: shouldExclude,
      source: 'memory',
      updatedAt: nowTs,
    }),
    { headers }
  );
};
