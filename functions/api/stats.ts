// functions/api/stats.ts
// 실시간 접속자 수, 오늘 하루 방문자 수, 총 누적 방문자 수 집계 (Cloudflare D1 전용)

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

  // 개발/봇 세션 집계 배제
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

  // 한국 표준시 (KST, UTC+9) 기준 날짜 키
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 3600000);
  const dateKey =
    dateParam ||
    `${kst.getFullYear()}${String(kst.getMonth() + 1).padStart(2, '0')}${String(kst.getDate()).padStart(2, '0')}`;
  const dailyId = `daily_${dateKey}`;

  const nowTs = Date.now();
  const expiredTs = nowTs - 90 * 1000; // 90초 유효 세션

  // Cloudflare D1 (일일 100,000회 무료 쓰기, 5,000,000회 무료 읽기)
  if (env.DB) {
    try {
      const statements: D1PreparedStatement[] = [];

      // 만료된 활성 세션 청소
      statements.push(env.DB.prepare('DELETE FROM active_sessions WHERE last_seen < ?').bind(expiredTs));

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

      if (statements.length > 0) {
        await env.DB.batch(statements);
      }

      // 동시 쿼리 조회
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
      console.error('[Stats API D1 Error]:', d1Error);
    }
  }

  // D1 장애 시 안전 메모리 폴백 (KV 호출 0회)
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
