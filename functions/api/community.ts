// Cloudflare Pages Function - /api/community
// 모든 접속 플레이어 간 공유 덱(Shared Decks) 및 자유게시판(Community Board) 실시간 글로벌 동기화 API

interface Env {
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
      // (A) Cloudflare KV 우선 조회
      if (env.VISITOR_STATS) {
        try {
          const kvRaw = await env.VISITOR_STATS.get(kvKey);
          if (kvRaw) {
            return new Response(kvRaw, { headers });
          }
        } catch (e) {
          console.warn('[Community KV GET Error]:', e);
        }
      }

      // (B) 글로벌 클라우드 스토어 (Pointer + Bytebin) 조회
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

      return new Response(JSON.stringify(type === 'decks' ? { decks: [] } : { posts: [] }), { headers });
    }

    // 2. POST / PUT: 글로벌 공유 데이터 저장 및 동기화
    if (request.method === 'POST' || request.method === 'PUT') {
      const bodyText = await request.text();

      // (A) Cloudflare KV 저장 (최우선)
      if (env.VISITOR_STATS) {
        try {
          await env.VISITOR_STATS.put(kvKey, bodyText);
          return new Response(JSON.stringify({ ok: true, source: 'kv', updatedAt: Date.now() }), { headers });
        } catch (e) {
          console.warn('[Community KV PUT Error]:', e);
        }
      }

      // (B) 글로벌 클라우드 스토어 (Bytebin + Pointer) 저장
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
              data: { key, updatedAt: Date.now() },
            }),
          });
        }
      }

      return new Response(JSON.stringify({ ok: true, updatedAt: Date.now() }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
  }
};
