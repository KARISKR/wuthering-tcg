// Cloudflare Pages Function - /api/community
// 모든 접속 플레이어 간 공유 덱(Shared Decks) 및 자유게시판(Community Board) 실시간 글로벌 동기화 API (D1 & KV 하이브리드 지원)

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

const POINTER_IDS = {
  decks: 'ff808181a09d98f701a173ca3379092e',
  board: 'ff808181a09d98f701a173ca355e092f',
} as const;

const POINTER_NAMES = {
  decks: 'wuthering-tcg-shared-decks-v2',
  board: 'wuthering-tcg-community-board-v2',
} as const;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const type = (url.searchParams.get('type') === 'board' ? 'board' : 'decks') as 'decks' | 'board';
  const kvKey = `wuthering_global_${type}_v2`;
  const pointerId = POINTER_IDS[type];
  const pointerName = POINTER_NAMES[type];

  try {
    // 1. GET: 글로벌 공유 데이터 조회
    if (request.method === 'GET') {
      // (A) Cloudflare D1 최우선 조회
      if (env.DB) {
        try {
          const row = await env.DB.prepare('SELECT data FROM community_data WHERE type = ?').bind(type).first<{ data: string }>();
          if (row?.data) {
            return new Response(row.data, { headers });
          }
        } catch (d1Err) {
          console.warn('[Community D1 GET Error]:', d1Err);
        }
      }

      // (B) Cloudflare KV 조회
      if (env.VISITOR_STATS) {
        try {
          const kvRaw = await env.VISITOR_STATS.get(kvKey);
          if (kvRaw) {
            return new Response(kvRaw, { headers });
          }
        } catch (kvErr) {
          console.warn('[Community KV GET Error]:', kvErr);
        }
      }

      // (C) 글로벌 클라우드 스토어 (Pointer + Bytebin) 조회
      try {
        const ptrRes = await fetch(`https://api.restful-api.dev/objects/${pointerId}`, {
          headers: { Accept: 'application/json' },
        });
        if (ptrRes.ok) {
          const ptrJson: any = await ptrRes.json();
          const blobKey = ptrJson?.data?.key;
          if (blobKey) {
            const blobRes = await fetch(`https://bytebin.lucko.me/${blobKey}`, {
              headers: { Accept: 'application/json' },
            });
            if (blobRes.ok) {
              const blobText = await blobRes.text();
              return new Response(blobText, { headers });
            }
          }
        }
      } catch (cloudErr) {
        console.warn('[Community Cloud GET Error]:', cloudErr);
      }

      return new Response(JSON.stringify(type === 'decks' ? { decks: [] } : { posts: [] }), { headers });
    }

    // 2. POST / PUT: 글로벌 공유 데이터 저장 및 동기화
    if (request.method === 'POST' || request.method === 'PUT') {
      const bodyText = await request.text();
      const nowTs = Date.now();
      let saved = false;

      // (A) Cloudflare D1 저장
      if (env.DB) {
        try {
          await env.DB.prepare(
            'INSERT INTO community_data (type, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(type) DO UPDATE SET data = ?, updated_at = ?'
          ).bind(type, bodyText, nowTs, bodyText, nowTs).run();
          saved = true;
        } catch (d1Err) {
          console.warn('[Community D1 PUT Error]:', d1Err);
        }
      }

      // (B) Cloudflare KV 동기화
      if (env.VISITOR_STATS) {
        try {
          await env.VISITOR_STATS.put(kvKey, bodyText);
          saved = true;
        } catch (kvErr) {
          console.warn('[Community KV PUT Error]:', kvErr);
        }
      }

      // (C) 글로벌 클라우드 스토어 (Bytebin + Pointer) 백업 저장
      try {
        const blobRes = await fetch('https://bytebin.lucko.me/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyText,
        });

        if (blobRes.ok) {
          const { key } = (await blobRes.json()) as { key: string };
          if (key) {
            await fetch(`https://api.restful-api.dev/objects/${pointerId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: pointerName,
                data: { key, updatedAt: nowTs },
              }),
            });
            saved = true;
          }
        }
      } catch (cloudPutErr) {
        console.warn('[Community Cloud PUT Error]:', cloudPutErr);
      }

      return new Response(JSON.stringify({ ok: saved, updatedAt: nowTs }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
};
