// functions/api/community.ts
// 모든 접속 플레이어 간 공유 덱(Shared Decks) 및 자유게시판(Community Board) 실시간 글로벌 동기화 API (D1 전용)

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

const POINTER_IDS = {
  decks: 'ff808181a09d98f701a173ca3379092e',
  board: 'ff808181a09d98f701a173ca355e092f',
} as const;

const POINTER_NAMES = {
  decks: 'wuthering-tcg-shared-decks-v2',
  board: 'wuthering-tcg-community-board-v2',
} as const;

function buildSummaryResponse(rawJsonText: string): string {
  try {
    const parsed = JSON.parse(rawJsonText);
    const posts: any[] = Array.isArray(parsed?.posts) ? parsed.posts : [];

    // 최신 공지 1건만 로비 프리뷰용 텍스트(Base64 이미지 제외) 유지
    const notices = posts
      .filter((p) => p && (p.isNotice || p.category === 'NOTICE'))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const latestNoticeId = notices[0]?.id;

    const summaryPosts = posts.map((p: any) => {
      const isLatestNotice = Boolean(latestNoticeId && p?.id === latestNoticeId);
      const safePreviewContent = isLatestNotice && typeof p.content === 'string'
        ? p.content.replace(/!\[.*?\]\(data:image\/[^)]+\)/g, '').slice(0, 600)
        : '';

      return {
        id: p.id,
        category: p.category,
        title: p.title,
        content: safePreviewContent,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        appVersion: p.appVersion,
        contact: p.contact,
        deckCode: p.deckCode,
        deckName: p.deckName,
        isNotice: p.isNotice,
        isSecret: p.isSecret,
        password: p.password,
        likes: p.likes,
        dislikes: p.dislikes,
        views: p.views,
        comments: Array.isArray(p.comments) ? p.comments : [],
        hasImage: Boolean(
          p.imageUrl ||
          (Array.isArray(p.images) && p.images.length > 0) ||
          (typeof p.content === 'string' && (p.content.includes('[사진') || p.content.includes('[카드') || p.content.includes('![') || p.content.includes('<img')))
        ),
        isSummaryOnly: true,
      };
    });

    return JSON.stringify({
      posts: summaryPosts,
      deletedIds: parsed?.deletedIds || [],
    });
  } catch {
    return rawJsonText;
  }
}

function buildLobbyNoticeResponse(rawJsonText: string): string {
  try {
    const parsed = JSON.parse(rawJsonText);
    const posts: any[] = Array.isArray(parsed?.posts) ? parsed.posts : [];
    const threshold = Date.now() - 24 * 3600 * 1000;
    const hasNewBoardPosts = posts.some((p) => p && p.createdAt && new Date(p.createdAt).getTime() > threshold);

    const notices = posts
      .filter((p) => p && (p.isNotice || p.category === 'NOTICE'))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const latest = notices[0] || null;

    const latestNotice = latest
      ? {
          id: latest.id,
          title: latest.title || '',
          contact: latest.contact || '운영진',
          createdAt: latest.createdAt,
          commentCount: Array.isArray(latest.comments) ? latest.comments.length : 0,
          content:
            typeof latest.content === 'string'
              ? latest.content.replace(/!\[.*?\]\(data:image\/[^)]+\)/g, '').slice(0, 600)
              : '',
        }
      : null;

    return JSON.stringify({
      latestNotice,
      hasNewBoardPosts,
    });
  } catch {
    return JSON.stringify({ latestNotice: null, hasNewBoardPosts: false });
  }
}

function buildSinglePostResponse(rawJsonText: string, postId: string): string {
  try {
    const parsed = JSON.parse(rawJsonText);
    const posts: any[] = Array.isArray(parsed?.posts) ? parsed.posts : [];
    const found = posts.find((p) => p && p.id === postId) || null;
    return JSON.stringify({
      post: found ? { ...found, isSummaryOnly: false } : null,
    });
  } catch {
    return JSON.stringify({ post: null });
  }
}

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
  const pointerId = POINTER_IDS[type];
  const pointerName = POINTER_NAMES[type];

  try {
    // 1. GET: 데이터 조회
    if (request.method === 'GET') {
      const isLobby = url.searchParams.get('lobby') === '1' && type === 'board';
      const isSummary = url.searchParams.get('summary') === '1' && type === 'board';
      const postId = type === 'board' ? url.searchParams.get('postId') : null;

      // (A) Cloudflare D1 최우선 조회
      if (env.DB) {
        try {
          const row = await env.DB.prepare('SELECT data, updated_at FROM community_data WHERE type = ?')
            .bind(type)
            .first<{ data: string; updated_at?: number }>();

          if (row?.data) {
            const updatedAt = row.updated_at || 0;
            const modeTag = postId ? `post-${postId}-` : isLobby ? 'lobby-' : isSummary ? 'sum-' : '';
            const etag = `W/"${type}-${modeTag}${updatedAt}"`;
            headers.set('ETag', etag);

            if (request.headers.get('If-None-Match') === etag) {
              return new Response(null, { status: 304, headers });
            }

            if (isLobby) {
              return new Response(buildLobbyNoticeResponse(row.data), { headers });
            }

            if (postId) {
              return new Response(buildSinglePostResponse(row.data, postId), { headers });
            }

            if (isSummary) {
              return new Response(buildSummaryResponse(row.data), { headers });
            }

            return new Response(row.data, { headers });
          }
        } catch (d1Err) {
          console.warn('[Community D1 GET Error]:', d1Err);
        }
      }

      // (B) 글로벌 클라우드 스토어 (Pointer + Bytebin) 백업 조회 (D1 미설정 시에만 폴백)
      if (!env.DB) {
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
                if (isLobby) {
                  return new Response(buildLobbyNoticeResponse(blobText), { headers });
                }
                if (postId) {
                  return new Response(buildSinglePostResponse(blobText, postId), { headers });
                }
                if (isSummary) {
                  return new Response(buildSummaryResponse(blobText), { headers });
                }
                return new Response(blobText, { headers });
              }
            }
          }
        } catch (cloudErr) {
          console.warn('[Community Cloud GET Error]:', cloudErr);
        }
      }

      return new Response(
        JSON.stringify(
          type === 'decks'
            ? { decks: [] }
            : isLobby
            ? { latestNotice: null, hasNewBoardPosts: false }
            : postId
            ? { post: null }
            : { posts: [] }
        ),
        { headers }
      );
    }

    // 2. POST / PUT: 데이터 저장 (단일 게시글 원자적 upsert/delete 및 요약본 보호 지원)
    if (request.method === 'POST' || request.method === 'PUT') {
      let bodyText = await request.text();
      const nowTs = Date.now();
      let saved = false;

      if (type === 'board' && env.DB) {
        try {
          const existingRow = await env.DB.prepare('SELECT data FROM community_data WHERE type = ?')
            .bind('board')
            .first<{ data: string }>();
          const existingParsed = existingRow?.data ? JSON.parse(existingRow.data) : { posts: [] };
          const existingPosts: any[] = Array.isArray(existingParsed?.posts) ? existingParsed.posts : [];
          const incomingParsed = JSON.parse(bodyText);

          if (incomingParsed?.action === 'upsertPost' && incomingParsed?.post?.id) {
            const inc = incomingParsed.post;
            const { isSummaryOnly, likedByMe, dislikedByMe, ...cleanPost } = inc;
            let found = false;
            const nextPosts = existingPosts.map((ep: any) => {
              if (!ep || ep.id !== cleanPost.id) return ep;
              found = true;
              if (isSummaryOnly) {
                return {
                  ...ep,
                  ...cleanPost,
                  content: ep.content,
                  imageUrl: ep.imageUrl,
                  images: ep.images,
                };
              }
              return cleanPost;
            });
            if (!found) {
              nextPosts.unshift(cleanPost);
            }
            bodyText = JSON.stringify({
              posts: nextPosts,
              updatedAt: nowTs,
            });
          } else if (incomingParsed?.action === 'deletePost' && incomingParsed?.postId) {
            const targetId = incomingParsed.postId;
            const nextPosts = existingPosts.filter((ep: any) => ep && ep.id !== targetId);
            bodyText = JSON.stringify({
              posts: nextPosts,
              updatedAt: nowTs,
            });
          } else if (Array.isArray(incomingParsed?.posts)) {
            const existingMap = new Map<string, any>();
            for (const ep of existingPosts) {
              if (ep && ep.id) existingMap.set(ep.id, ep);
            }
            const mergedPosts = incomingParsed.posts.map((inc: any) => {
              if (!inc || !inc.id) return inc;
              const old = existingMap.get(inc.id);
              if (old && inc.isSummaryOnly) {
                const { isSummaryOnly, ...restInc } = inc;
                return {
                  ...old,
                  ...restInc,
                  content: old.content,
                  imageUrl: old.imageUrl,
                  images: old.images,
                };
              }
              const { isSummaryOnly, ...cleanInc } = inc;
              return cleanInc;
            });
            bodyText = JSON.stringify({
              ...incomingParsed,
              posts: mergedPosts,
              updatedAt: nowTs,
            });
          }
        } catch (mergeErr) {
          console.warn('[Community Board Merge Warning]:', mergeErr);
        }
      }

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
