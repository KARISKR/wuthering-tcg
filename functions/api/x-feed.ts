// functions/api/x-feed.ts
// 【공식】UCP 카드 게임(@ucp_cardgame) 최신 X 게시글 조회 및 D1 캐시 API

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface Env {
  DB?: D1Database;
  ADMIN_KEY?: string;
}

export interface XFeedPost {
  id: string;
  handle: string;
  authorName: string;
  text: string;
  url: string;
  createdAt: string;
  mediaUrl?: string;
  isPinned?: boolean;
}

const DEFAULT_HANDLE = 'ucp_cardgame';
const CACHE_TTL_MS = 20 * 60 * 1000; // 20분 캐시 (X syndication 레이트리밋 방지)

const FALLBACK_POST: XFeedPost = {
  id: '2124783550511915192',
  handle: DEFAULT_HANDLE,
  authorName: '【공식】UCP 카드 게임',
  text: '『명조: 배틀』 제1탄 굿즈 상품이 곧 출시됩니다!\n\n각 상품은 온라인과 전국 취급 매장에서 판매될 예정입니다.\nhttps://www.daewonshop.com/category/1292949',
  url: `https://x.com/${DEFAULT_HANDLE}/status/2124783550511915192`,
  createdAt: '2026-11-23T08:34:09.000Z',
  mediaUrl: 'https://pbs.twimg.com/media/HXy-H65bgAATGkR.jpg?name=small',
};

/** 단건 트윗 ID로 fxtwitter / syndication tweet-result 조회 (관리자 URL 등록·갱신용) */
export async function fetchTweetById(tweetId: string, handle = DEFAULT_HANDLE): Promise<XFeedPost | null> {
  const cleanId = tweetId.replace(/\D/g, '');
  if (!cleanId) return null;

  try {
    const r = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}/status/${cleanId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const data = (await r.json()) as {
        tweet?: {
          id?: string;
          url?: string;
          text?: string;
          created_at?: string;
          author?: { name?: string; screen_name?: string };
          media?: { photos?: Array<{ url?: string }> };
        };
      };
      const tw = data?.tweet;
      if (tw?.id && tw?.text) {
        return {
          id: String(tw.id),
          handle: tw.author?.screen_name || handle,
          authorName: tw.author?.name || FALLBACK_POST.authorName,
          text: String(tw.text).trim(),
          url: tw.url || `https://x.com/${handle}/status/${tw.id}`,
          createdAt: tw.created_at ? new Date(tw.created_at).toISOString() : new Date().toISOString(),
          ...(tw.media?.photos?.[0]?.url ? { mediaUrl: tw.media.photos[0].url } : {}),
        };
      }
    }
  } catch {
    // fxtwitter 실패 시 tweet-result 폴백
  }

  try {
    const r = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${cleanId}&token=1`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const tw = (await r.json()) as {
        id_str?: string;
        text?: string;
        created_at?: string;
        user?: { name?: string; screen_name?: string };
        entities?: { media?: Array<{ media_url_https?: string }> };
      };
      if (tw?.id_str && tw?.text) {
        const sn = tw.user?.screen_name || handle;
        const mediaUrl = tw.entities?.media?.[0]?.media_url_https;
        return {
          id: String(tw.id_str),
          handle: sn,
          authorName: tw.user?.name || FALLBACK_POST.authorName,
          text: String(tw.text).replace(/\s*https:\/\/t\.co\/\w+\s*$/g, '').trim(),
          url: `https://x.com/${sn}/status/${tw.id_str}`,
          createdAt: tw.created_at ? new Date(tw.created_at).toISOString() : new Date().toISOString(),
          ...(mediaUrl ? { mediaUrl } : {}),
        };
      }
    }
  } catch {
    // 무시
  }
  return null;
}

/** X syndication HTML에서 __NEXT_DATA__ JSON을 파싱해 최신 게시글 1건 추출 */
export function parseLatestTweetFromSyndicationHtml(html: string, handle = DEFAULT_HANDLE): XFeedPost | null {
  const marker = '__NEXT_DATA__';
  const markerIdx = html.indexOf(marker);
  if (markerIdx < 0) return null;
  const start = html.indexOf('>', markerIdx);
  const end = html.indexOf('</script>', start);
  if (start < 0 || end < 0) return null;

  try {
    const parsed = JSON.parse(html.slice(start + 1, end));
    const entries = parsed?.props?.pageProps?.timeline?.entries;
    if (!Array.isArray(entries)) return null;

    const tweets: Array<{
      id_str?: string;
      full_text?: string;
      text?: string;
      created_at?: string;
      retweeted_status?: unknown;
      user?: { name?: string; screen_name?: string };
      entities?: { media?: Array<{ media_url_https?: string }> };
    }> = [];

    for (const ent of entries) {
      const tw = ent?.content?.tweet;
      if (!tw || typeof tw !== 'object' || !tw.id_str) continue;
      tweets.push(tw);
    }
    if (tweets.length === 0) return null;

    // 날짜 내림차순 정렬 (고정 트윗이 맨 위에 오더라도 실제 가장 최신 게시글 우선)
    tweets.sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });

    const latest = tweets[0];
    const rawText = String(latest.full_text || latest.text || '');
    // 트윗 끝의 https://t.co/... 미디어 단축 링크 제거 및 줄바꿈 정리
    const cleanText = rawText.replace(/\s*https:\/\/t\.co\/\w+\s*$/g, '').trim();
    const screenName = latest.user?.screen_name || handle;
    const mediaUrl = latest.entities?.media?.[0]?.media_url_https;

    return {
      id: String(latest.id_str),
      handle: screenName,
      authorName: latest.user?.name || FALLBACK_POST.authorName,
      text: cleanText || FALLBACK_POST.text,
      url: `https://x.com/${screenName}/status/${latest.id_str}`,
      createdAt: latest.created_at ? new Date(latest.created_at).toISOString() : new Date().toISOString(),
      ...(mediaUrl ? { mediaUrl } : {}),
    };
  } catch {
    return null;
  }
}

async function ensureXFeedTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS x_feed_cache (
        handle TEXT PRIMARY KEY,
        post_json TEXT NOT NULL,
        fetched_at TEXT NOT NULL
      )`
    )
    .run();
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Cache-Control': 'public, max-age=120',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(request.url);
  const rawHandle = (url.searchParams.get('handle') || DEFAULT_HANDLE).replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '');
  const handle = rawHandle || DEFAULT_HANDLE;

  // 관리자 수동 갱신/고정 (POST)
  if (request.method === 'POST') {
    const adminKey = request.headers.get('X-Admin-Key')?.trim() || '';
    if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
      return new Response(JSON.stringify({ ok: false, error: '권한이 없습니다.' }), { status: 403, headers });
    }
    try {
      const body = (await request.json()) as Partial<XFeedPost>;
      const urlMatch = typeof body.url === 'string' ? body.url.match(/\/status\/(\d+)/) : null;
      const targetId = (typeof body.id === 'string' && body.id.trim()) || urlMatch?.[1] || '';
      const fetched = targetId ? await fetchTweetById(targetId, handle) : null;
      const post: XFeedPost = fetched
        ? { ...fetched, isPinned: body.isPinned ?? true }
        : {
            id: targetId,
            handle,
            authorName: typeof body.authorName === 'string' && body.authorName.trim() ? body.authorName.trim() : FALLBACK_POST.authorName,
            text: typeof body.text === 'string' && body.text.trim() ? body.text.trim().slice(0, 400) : FALLBACK_POST.text,
            url: typeof body.url === 'string' && /^https:\/\/(x|twitter)\.com\//.test(body.url.trim())
              ? body.url.trim()
              : `https://x.com/${handle}`,
            createdAt: typeof body.createdAt === 'string' && body.createdAt ? body.createdAt : new Date().toISOString(),
            isPinned: Boolean(body.isPinned),
          };
      if (env.DB) {
        await ensureXFeedTable(env.DB);
        await env.DB.prepare(
          `INSERT INTO x_feed_cache (handle, post_json, fetched_at)
           VALUES (?1, ?2, ?3)
           ON CONFLICT(handle) DO UPDATE SET post_json = excluded.post_json, fetched_at = excluded.fetched_at`
        )
          .bind(handle, JSON.stringify(post), new Date().toISOString())
          .run();
      }
      return new Response(JSON.stringify({ ok: true, source: 'admin', post }), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ ok: false, error: '잘못된 요청 형식입니다.' }), { status: 400, headers });
    }
  }

  // 1) D1 캐시 확인
  let cachedPost: XFeedPost | null = null;
  let cacheAgeMs = Infinity;

  if (env.DB) {
    try {
      await ensureXFeedTable(env.DB);
      const row = await env.DB.prepare('SELECT post_json, fetched_at FROM x_feed_cache WHERE handle = ?1')
        .bind(handle)
        .first<{ post_json: string; fetched_at: string }>();
      if (row?.post_json) {
        cachedPost = JSON.parse(row.post_json) as XFeedPost;
        cacheAgeMs = Date.now() - Date.parse(row.fetched_at || '');
        if (cachedPost.isPinned || (Number.isFinite(cacheAgeMs) && cacheAgeMs < CACHE_TTL_MS)) {
          return new Response(JSON.stringify({ ok: true, source: 'cache', post: cachedPost }), { status: 200, headers });
        }
      }
    } catch {
      // D1 조회 실패 시 실시간 조회로 폴백
    }
  }

  // 2) X syndication 엔드포인트에서 최신 게시글 조회 시도
  try {
    const resp = await fetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(handle)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(4500),
    });
    if (resp.ok) {
      const html = await resp.text();
      const livePost = parseLatestTweetFromSyndicationHtml(html, handle);
      const minId = cachedPost?.id || FALLBACK_POST.id;
      const isNewerOrEqual =
        livePost &&
        (!minId || !/^\d+$/.test(livePost.id) || !/^\d+$/.test(minId) || BigInt(livePost.id) >= BigInt(minId));
      if (livePost && isNewerOrEqual) {
        if (env.DB) {
          try {
            await ensureXFeedTable(env.DB);
            await env.DB.prepare(
              `INSERT INTO x_feed_cache (handle, post_json, fetched_at)
               VALUES (?1, ?2, ?3)
               ON CONFLICT(handle) DO UPDATE SET post_json = excluded.post_json, fetched_at = excluded.fetched_at`
            )
              .bind(handle, JSON.stringify(livePost), new Date().toISOString())
              .run();
          } catch {
            // 캐시 저장 실패 무시
          }
        }
        return new Response(JSON.stringify({ ok: true, source: 'live', post: livePost }), { status: 200, headers });
      }
    }
  } catch {
    // 네트워크/타임아웃 시 캐시 또는 기본 폴백 사용
  }

  // 3) 레이트리밋/오류 시 이전 D1 캐시 또는 기본 안내 카드 반환
  if (cachedPost) {
    return new Response(JSON.stringify({ ok: true, source: 'stale-cache', post: cachedPost }), { status: 200, headers });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      source: 'fallback',
      post: handle === DEFAULT_HANDLE ? FALLBACK_POST : { ...FALLBACK_POST, id: '', handle, url: `https://x.com/${handle}` },
    }),
    { status: 200, headers }
  );
};
