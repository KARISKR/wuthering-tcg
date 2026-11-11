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
  /** 관리자 키 (Cloudflare Pages 환경 변수). 없으면 공지 작성·남의 글 관리가 모두 막힌다 */
  ADMIN_KEY?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 권한: 글·댓글을 고치거나 지우려면 그 글/댓글의 비밀번호 또는 관리자 키가 필요하다.
// 비밀번호는 응답에 절대 싣지 않는다(hasPassword 로만 알린다). 비밀글 본문은 비밀번호가 맞을 때만 보낸다.
// ─────────────────────────────────────────────────────────────────────────────
interface Auth {
  password: string;
  isAdmin: boolean;
}

function readAuth(env: Env, password: unknown, adminKey: unknown): Auth {
  return {
    password: typeof password === 'string' ? password.trim() : '',
    isAdmin: Boolean(env.ADMIN_KEY) && typeof adminKey === 'string' && adminKey.trim() === env.ADMIN_KEY,
  };
}

/** 비밀번호가 없는 글/댓글은 예전처럼 누구나 고칠 수 있다 (화면 동작과 같음) */
function canModify(stored: { password?: unknown } | null | undefined, auth: Auth): boolean {
  if (auth.isAdmin) return true;
  const pw = typeof stored?.password === 'string' ? stored.password : '';
  return !pw || auth.password === pw;
}

function publicComment(c: any) {
  if (!c || typeof c !== 'object') return c;
  const { password, ...rest } = c;
  return { ...rest, hasPassword: Boolean(password) };
}

function publicPost(p: any, unlocked = false) {
  if (!p || typeof p !== 'object') return p;
  const { password, ...rest } = p;
  const out: any = { ...rest, hasPassword: Boolean(password) };
  if (Array.isArray(out.comments)) out.comments = out.comments.map(publicComment);
  if (p.isSecret && !unlocked) {
    out.content = '';
    out.images = [];
    out.locked = true;
    delete out.imageUrl;
    delete out.deckCode;
  }
  return out;
}

const POINTER_IDS = {
  decks: 'ff808181a09d98f701a173ca3379092e',
  board: 'ff808181a09d98f701a173ca355e092f',
  replays: 'ff808181a09d98f701a173ca399e0930',
} as const;

const POINTER_NAMES = {
  decks: 'wuthering-tcg-shared-decks-v2',
  board: 'wuthering-tcg-community-board-v2',
  replays: 'wuthering-tcg-public-replays-v1',
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
        hasPassword: Boolean(p.hasPassword || p.password),
        likes: p.likes,
        dislikes: p.dislikes,
        views: p.views,
        comments: Array.isArray(p.comments) ? p.comments.map(publicComment) : [],
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

// ─────────────────────────────────────────────────────────────────────────────
// [WP9] 행 단위 저장소
// 이전: community_data 테이블에 type(board/decks/replays)마다 JSON 한 행. 글 하나를 써도 전체를 읽고 → 고치고 → 통째로 다시 씀.
//       → 동시에 두 명이 쓰면 한쪽 글이 사라지고, 글이 늘수록 매 요청이 무거워지며, D1 행 크기 한도(2MB)에 걸릴 위험.
// 지금: community_items(kind, id) 한 건 = 한 행. 응답 JSON 형식은 이전과 완전히 같아서 클라이언트는 수정하지 않았다.
// - 테이블은 첫 요청 때 자동 생성(CREATE TABLE IF NOT EXISTS), 기존 JSON은 첫 요청 때 자동으로 행 단위로 옮김.
// - 기존 community_data 행은 지우지 않고 백업으로 남겨둔다.
// ─────────────────────────────────────────────────────────────────────────────
type Kind = 'post' | 'deck' | 'replay' | 'replay_detail' | 'meta';

let schemaReady = false;
const migrated = new Set<string>();

async function ensureSchema(db: D1Database) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS community_items (
        kind TEXT NOT NULL,
        id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (kind, id)
      )`
    ),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_community_items_kind_created ON community_items(kind, created_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_community_items_kind_updated ON community_items(kind, updated_at)'),
    // [WP9 잔여] 댓글 1건 = 1행. 삭제는 행을 지우지 않고 deleted=1(묘비)로 남겨, 예전 클라이언트가 보낸 댓글 목록에 의해 되살아나지 않게 한다.
    db.prepare(
      `CREATE TABLE IF NOT EXISTS community_comments (
        post_id TEXT NOT NULL,
        id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL,
        PRIMARY KEY (post_id, id)
      )`
    ),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_community_comments_post_created ON community_comments(post_id, created_at)'),
    // [WP9 잔여] 작성 빈도 제한: (구분:익명화된 IP) 키마다 고정 시간창 카운터
    db.prepare(
      `CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL
      )`
    ),
  ]);
  schemaReady = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// [WP9 잔여] 댓글 행 저장소
// 이전: 댓글이 게시글 JSON 안의 comments 배열에 있어서, 두 사람이 같은 글에 동시에 댓글을 달면
//       각자 "내 댓글이 추가된 글 전체"를 저장해 한쪽 댓글이 사라졌다.
// 지금: community_comments(post_id, id) 한 건 = 한 행. 응답의 post.comments 형식은 이전과 같다.
// - addComment / updateComment / deleteComment 요청으로만 댓글을 바꾼다.
// - 예전 클라이언트가 upsertPost로 comments 배열을 보내면, 없는 댓글만 추가한다(수정·삭제는 반영 안 함, 지운 댓글은 묘비로 막힘).
// - 게시글 JSON 안에 남아 있던 기존 댓글은 첫 요청 때 1회 행으로 옮긴다(meta 행으로 완료 표시).
// ─────────────────────────────────────────────────────────────────────────────
const COMMENT_MIGRATION_MARK = 'comments_v1';
let commentsMigrated = false;

function commentInsertStmt(db: D1Database, postId: string, comment: any, nowTs: number) {
  const created = toTs(comment?.createdAt, nowTs);
  return db
    .prepare(
      `INSERT INTO community_comments (post_id, id, created_at, updated_at, deleted, data) VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(post_id, id) DO NOTHING`
    )
    .bind(postId, String(comment.id), created, nowTs, JSON.stringify(comment));
}

function sanitizeComment(raw: any, nowTs: number): any | null {
  if (!raw || typeof raw !== 'object') return null;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text) return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 80) : `c-${nowTs}-${Math.random().toString(36).slice(2, 8)}`;
  const out: any = {
    id,
    author: (typeof raw.author === 'string' && raw.author.trim() ? raw.author.trim() : '방랑자').slice(0, 30),
    text: text.slice(0, 1000),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(nowTs).toISOString(),
  };
  if (typeof raw.replyToId === 'string') out.replyToId = raw.replyToId.slice(0, 80);
  if (typeof raw.replyToAuthor === 'string') out.replyToAuthor = raw.replyToAuthor.slice(0, 30);
  if (typeof raw.password === 'string' && raw.password) out.password = raw.password.slice(0, 64);
  return out;
}

/** 게시글 JSON 안의 기존 댓글 → community_comments 로 1회 이전 */
async function migrateComments(db: D1Database) {
  if (commentsMigrated) return;
  const mark = await db
    .prepare('SELECT 1 AS x FROM community_items WHERE kind = ? AND id = ?')
    .bind('meta', COMMENT_MIGRATION_MARK)
    .first();
  if (!mark) {
    const nowTs = Date.now();
    const posts = await listItems(db, 'post', 100000);
    const stmts: D1PreparedStatement[] = [];
    for (const p of posts) {
      if (!p?.id || !Array.isArray(p.comments)) continue;
      for (const c of p.comments) {
        if (c && c.id) stmts.push(commentInsertStmt(db, String(p.id), c, nowTs));
      }
    }
    for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
    await upsertStmt(db, 'meta', COMMENT_MIGRATION_MARK, nowTs, nowTs, { done: true }).run();
  }
  commentsMigrated = true;
}

/** 게시글들에 댓글 행을 붙인다 (게시글 JSON에 남은 옛 comments 배열은 무시) */
async function attachComments(db: D1Database, posts: any[], onlyPostId?: string): Promise<any[]> {
  const res = onlyPostId
    ? await db
        .prepare('SELECT post_id, data FROM community_comments WHERE post_id = ? AND deleted = 0 ORDER BY created_at ASC')
        .bind(onlyPostId)
        .all<{ post_id: string; data: string }>()
    : await db
        .prepare('SELECT post_id, data FROM community_comments WHERE deleted = 0 ORDER BY created_at ASC')
        .all<{ post_id: string; data: string }>();
  const byPost = new Map<string, any[]>();
  for (const r of res.results || []) {
    try {
      const c = JSON.parse(r.data);
      const list = byPost.get(r.post_id) || [];
      list.push(c);
      byPost.set(r.post_id, list);
    } catch {
      /* 손상된 행은 건너뜀 */
    }
  }
  return posts.map((p) => (p && p.id ? { ...p, comments: byPost.get(String(p.id)) || [] } : p));
}

// ─────────────────────────────────────────────────────────────────────────────
// [WP9 잔여] 작성 빈도 제한 (IP당, 고정 10분 창)
// IP는 그대로 저장하지 않고 SHA-256 앞 16자리로 바꿔 키로만 쓴다.
// 조회수·추천처럼 글을 다시 저장하는 요청은 'write' 전체 상한만 적용한다.
// ─────────────────────────────────────────────────────────────────────────────
/** 리플레이 v2 최대 크기 (넘으면 v2만 버리고 로그 기반 v1로 저장) */
export const MAX_REPLAY_V2_BYTES = 256 * 1024;

export const RATE_LIMITS = {
  post: { limit: 5, windowMs: 10 * 60_000 }, // 새 글
  comment: { limit: 20, windowMs: 10 * 60_000 }, // 새 댓글
  replay: { limit: 10, windowMs: 10 * 60_000 }, // 공개 리플레이 업로드
  write: { limit: 300, windowMs: 10 * 60_000 }, // 모든 저장 요청 합계
} as const;
type RateBucket = keyof typeof RATE_LIMITS;

async function clientKey(request: Request): Promise<string> {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    'anon';
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`wtcg:${ip}`));
    return Array.from(new Uint8Array(buf).slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return ip.slice(0, 64);
  }
}

/** 한도를 넘으면 다시 시도할 수 있을 때까지 남은 초를, 아니면 0을 돌려준다 */
async function hitRateLimit(db: D1Database, bucket: RateBucket, who: string, nowTs: number): Promise<number> {
  const { limit, windowMs } = RATE_LIMITS[bucket];
  const windowStart = Math.floor(nowTs / windowMs) * windowMs;
  const key = `${bucket}:${who}`;
  await db
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END,
         window_start = excluded.window_start`
    )
    .bind(key, windowStart)
    .run();
  const row = await db.prepare('SELECT count FROM rate_limits WHERE key = ?').bind(key).first<{ count: number }>();
  // 오래된 카운터 정리 (요청 50회에 1회)
  if (Math.random() < 0.02) {
    await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(nowTs - 2 * windowMs).run();
  }
  if ((row?.count ?? 0) > limit) return Math.max(1, Math.ceil((windowStart + windowMs - nowTs) / 1000));
  return 0;
}

function rateLimitedResponse(headers: Headers, retryAfter: number, bucket: RateBucket) {
  const h = new Headers(headers);
  h.set('Retry-After', String(retryAfter));
  return new Response(JSON.stringify({ ok: false, error: 'rate_limited', bucket, retryAfter }), { status: 429, headers: h });
}

function toTs(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
  }
  return fallback;
}

function upsertStmt(db: D1Database, kind: Kind, id: string, createdAt: number, updatedAt: number, data: unknown) {
  const json = JSON.stringify(data);
  return db
    .prepare(
      `INSERT INTO community_items (kind, id, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(kind, id) DO UPDATE SET updated_at = excluded.updated_at, data = excluded.data`
    )
    .bind(kind, id, createdAt, updatedAt, json);
}

/** 기존 community_data(JSON 한 행) → community_items(행 단위)로 1회 이전 */
async function migrateLegacy(db: D1Database, kind: 'post' | 'deck' | 'replay') {
  if (migrated.has(kind)) return;
  const exists = await db.prepare('SELECT 1 AS x FROM community_items WHERE kind = ? LIMIT 1').bind(kind).first();
  if (exists) {
    migrated.add(kind);
    return;
  }
  const legacyType = kind === 'post' ? 'board' : kind === 'deck' ? 'decks' : 'replays';
  const row = await db.prepare('SELECT data FROM community_data WHERE type = ?').bind(legacyType).first<{ data: string }>();
  if (row?.data) {
    try {
      const parsed = JSON.parse(row.data);
      const list: any[] = kind === 'post' ? parsed?.posts : kind === 'deck' ? parsed?.decks : parsed?.replays;
      const now = Date.now();
      const items = (Array.isArray(list) ? list : []).filter((x) => x && x.id);
      // 기존 배열 순서(최신이 앞)를 created_at 내림차순으로 보존
      const stmts = items.map((x, i) =>
        upsertStmt(db, kind, String(x.id), toTs(x.createdAt ?? x.timestamp, now - i), now, x)
      );
      for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
    } catch (e) {
      console.warn('[Community migrate]', kind, e);
    }
  }
  migrated.add(kind);
}

async function listItems(db: D1Database, kind: Kind, limit = 1000): Promise<any[]> {
  const res = await db
    .prepare('SELECT data FROM community_items WHERE kind = ? ORDER BY created_at DESC LIMIT ?')
    .bind(kind, limit)
    .all<{ data: string }>();
  return (res.results || []).map((r) => {
    try {
      return JSON.parse(r.data);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

async function getItem(db: D1Database, kind: Kind, id: string): Promise<any | null> {
  const row = await db.prepare('SELECT data FROM community_items WHERE kind = ? AND id = ?').bind(kind, id).first<{ data: string }>();
  if (!row?.data) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

/** ETag용 버전: 마지막 수정 시각 + 개수 (삭제도 반영) */
async function kindVersion(db: D1Database, kind: Kind): Promise<string> {
  const row = await db
    .prepare('SELECT MAX(updated_at) AS u, COUNT(*) AS n FROM community_items WHERE kind = ?')
    .bind(kind)
    .first<{ u: number | null; n: number }>();
  if (kind !== 'post') return `${row?.u ?? 0}-${row?.n ?? 0}`;
  // 게시판은 댓글 변경(추가·수정·삭제)도 버전에 반영
  const c = await db
    .prepare('SELECT MAX(updated_at) AS u, COUNT(*) AS n FROM community_comments')
    .first<{ u: number | null; n: number }>();
  return `${row?.u ?? 0}-${row?.n ?? 0}-c${c?.u ?? 0}-${c?.n ?? 0}`;
}

/** 요약 게시글(isSummaryOnly)로 저장 요청이 오면 본문·이미지는 기존 값을 유지 */
function mergePost(existing: any | null, incoming: any) {
  // 댓글은 community_comments 에 따로 저장하므로 게시글 JSON에는 넣지 않는다
  // hasPassword·locked 는 응답 전용 표시라 저장하지 않는다
  const { isSummaryOnly, likedByMe, dislikedByMe, hasPassword: _hp, locked: _lk, comments: _comments, ...clean } = incoming || {};
  if (existing && isSummaryOnly) {
    const { comments: _old, ...base } = existing;
    return { ...base, ...clean, content: existing.content, imageUrl: existing.imageUrl, images: existing.images };
  }
  return clean;
}

/** 예전 클라이언트가 게시글과 함께 보낸 댓글 배열: 없는 댓글만 추가 (묘비·기존 행은 그대로) */
function legacyCommentStmts(db: D1Database, postId: string, comments: unknown, nowTs: number): D1PreparedStatement[] {
  if (!Array.isArray(comments)) return [];
  const out: D1PreparedStatement[] = [];
  for (const raw of comments) {
    const c = sanitizeComment(raw, nowTs);
    if (c && raw?.id) out.push(commentInsertStmt(db, postId, { ...c, id: String(raw.id) }, nowTs));
  }
  return out;
}

/**
 * 게시글 1건 저장 (upsertPost와 예전 목록 저장이 같이 쓴다).
 * - 새 글: 누구나 (새 글 빈도 제한 적용)
 * - 기존 글: 비밀번호·관리자 키가 맞으면 전체 수정, 아니면 추천·비추천·조회수만 +1까지 반영
 * - 공지(isNotice / NOTICE 말머리)는 관리자만 켤 수 있다
 * 빈도 제한에 걸리면 남은 초를, 아니면 0을 돌려준다.
 */
async function savePost(db: D1Database, incoming: any, auth: Auth, who: string, nowTs: number): Promise<number> {
  const id = String(incoming.id);
  const existing = await getItem(db, 'post', id);
  let post: any;
  if (!existing) {
    const wait = await hitRateLimit(db, 'post', who, nowTs);
    if (wait) return wait;
    post = mergePost(null, incoming);
  } else if (canModify(existing, auth)) {
    post = mergePost(incoming.isSummaryOnly ? existing : null, incoming);
    // 화면은 더 이상 비밀번호를 받지 않으므로, 새 값이 없으면 기존 비밀번호를 유지한다
    if (!post.password && existing.password) post.password = existing.password;
  } else {
    // shortcut: 권한 없는 요청은 추천·조회수를 1씩만 올린다(내리지 못함). 정확히 하려면 추천/취소 전용 요청으로 바꾼다
    const bump = (cur: unknown, next: unknown) => {
      const c = Number(cur) || 0;
      return (Number(next) || 0) > c ? c + 1 : c;
    };
    const { comments: _old, ...base } = existing;
    post = {
      ...base,
      likes: bump(existing.likes, incoming.likes),
      dislikes: bump(existing.dislikes, incoming.dislikes),
      views: bump(existing.views, incoming.views),
    };
  }
  if (!auth.isAdmin) {
    post.isNotice = Boolean(existing?.isNotice);
    if (post.category === 'NOTICE' && !post.isNotice) post.category = existing?.category === 'NOTICE' ? 'NOTICE' : 'GENERAL';
  }
  await db.batch([
    upsertStmt(db, 'post', id, toTs(post.createdAt, nowTs), nowTs, post),
    ...legacyCommentStmts(db, id, incoming.comments, nowTs),
  ]);
  return 0;
}

function forbidden(headers: Headers) {
  return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers });
}

const KIND_OF = { board: 'post', decks: 'deck', replays: 'replay' } as const;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Expose-Headers': 'Retry-After, ETag',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Board-Password, X-Admin-Key',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const rawType = url.searchParams.get('type');
  const type = (rawType === 'board' ? 'board' : rawType === 'replays' ? 'replays' : 'decks') as 'decks' | 'board' | 'replays';
  const pointerId = POINTER_IDS[type];
  const kind = KIND_OF[type];

  try {
    // 1. GET: 데이터 조회
    if (request.method === 'GET') {
      const isLobby = url.searchParams.get('lobby') === '1' && type === 'board';
      const isSummary = (url.searchParams.get('summary') === '1' && type === 'board') || (url.searchParams.get('summary') === '1' && type === 'replays');
      const postId = type === 'board' ? url.searchParams.get('postId') : null;
      const replayId = type === 'replays' ? url.searchParams.get('id') : null;

      // (A) Cloudflare D1 (행 단위 저장소)
      if (env.DB) {
        try {
          await ensureSchema(env.DB);
          await migrateLegacy(env.DB, kind);
          if (kind === 'post') await migrateComments(env.DB);

          // 리플레이 단건 상세 조회 (이전 저장분은 community_data의 replay_detail:<id> 행에서 폴백)
          if (type === 'replays' && replayId) {
            const detail = await getItem(env.DB, 'replay_detail', replayId);
            if (detail) return new Response(JSON.stringify(detail), { headers });
            const legacy = await env.DB.prepare('SELECT data FROM community_data WHERE type = ?')
              .bind(`replay_detail:${replayId}`)
              .first<{ data: string }>();
            if (legacy?.data) return new Response(legacy.data, { headers });
            return new Response(JSON.stringify({ error: 'Replay not found' }), { headers });
          }

          // 게시글 단건: 해당 행 1개만 읽음
          if (postId) {
            const post = await getItem(env.DB, 'post', postId);
            const [withComments] = post ? await attachComments(env.DB, [post], postId) : [null];
            // 비밀글 본문은 비밀번호(또는 관리자 키) 헤더가 맞을 때만
            const auth = readAuth(env, request.headers.get('X-Board-Password'), request.headers.get('X-Admin-Key'));
            const unlocked = Boolean(post) && (auth.isAdmin || (Boolean(post.password) && auth.password === post.password));
            return new Response(
              JSON.stringify({ post: withComments ? { ...publicPost(withComments, unlocked), isSummaryOnly: false } : null }),
              { headers }
            );
          }

          const version = await kindVersion(env.DB, kind);
          const modeTag = isLobby ? 'lobby-' : isSummary ? 'sum-' : '';
          const etag = `W/"${type}-${modeTag}${version}"`;
          headers.set('ETag', etag);
          if (request.headers.get('If-None-Match') === etag) {
            return new Response(null, { status: 304, headers });
          }

          const items = await listItems(env.DB, kind);
          if (type === 'board') {
            const raw = JSON.stringify({ posts: (await attachComments(env.DB, items)).map((p) => publicPost(p)) });
            if (isLobby) return new Response(buildLobbyNoticeResponse(raw), { headers });
            if (isSummary) return new Response(buildSummaryResponse(raw), { headers });
            return new Response(raw, { headers });
          }
          if (type === 'replays') return new Response(JSON.stringify({ replays: items.slice(0, 40) }), { headers });
          return new Response(JSON.stringify({ decks: items }), { headers });
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
                if (isSummary && type === 'board') {
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
            : type === 'replays'
            ? (replayId ? { error: 'Replay not found' } : { replays: [] })
            : isLobby
            ? { latestNotice: null, hasNewBoardPosts: false }
            : postId
            ? { post: null }
            : { posts: [] }
        ),
        { headers }
      );
    }

    // 2. POST / PUT: 데이터 저장 (행 단위 upsert/delete)
    if (request.method === 'POST' || request.method === 'PUT') {
      const bodyText = await request.text();
      const nowTs = Date.now();
      if (!env.DB) {
        return new Response(JSON.stringify({ ok: false, updatedAt: nowTs }), { headers });
      }
      await ensureSchema(env.DB);
      await migrateLegacy(env.DB, kind);
      if (kind === 'post') await migrateComments(env.DB);
      const incoming = JSON.parse(bodyText);

      // [WP9 잔여] 작성 빈도 제한
      const who = await clientKey(request);
      const writeWait = await hitRateLimit(env.DB, 'write', who, nowTs);
      if (writeWait) return rateLimitedResponse(headers, writeWait, 'write');

      // (A) 공개 멀티배틀 리플레이 저장: 상세 1행 + 요약 1행, 요약은 최근 40개만 유지
      if (type === 'replays') {
        const replayId = incoming?.id;
        if (!replayId || !Array.isArray(incoming?.logs)) {
          return new Response(JSON.stringify({ ok: false, error: 'invalid replay' }), { status: 400, headers });
        }
        const replayWait = await hitRateLimit(env.DB, 'replay', who, nowTs);
        if (replayWait) return rateLimitedResponse(headers, replayWait, 'replay');
        const base = {
          id: incoming.id,
          timestamp: incoming.timestamp || nowTs,
          gameMode: 'MULTIPLAYER',
          totalTurns: incoming.totalTurns || 1,
          winner: incoming.winner,
          p0Leader: incoming.p0Leader,
          p1Leader: incoming.p1Leader,
          p0Hp: incoming.p0Hp,
          p1Hp: incoming.p1Hp,
          p0Name: incoming.p0Name,
          p1Name: incoming.p1Name,
          totalLogCount: incoming.logs.length,
        };
        const created = toTs(base.timestamp, nowTs);
        // [WP8 버그 수정] v2(정밀 재생 데이터) 자체 크기로 판단. 이전에는 요청 전체(로그 약 0.4MB 포함) 크기로 판단해서
        // 거의 항상 512KB를 넘어 v2가 버려졌다. 정상 v2는 수 KB(액션 목록 + 짧은 지문)이다.
        const v2Text = incoming.v2 ? JSON.stringify(incoming.v2) : '';
        const hasV2 = Boolean(v2Text) && v2Text.length <= MAX_REPLAY_V2_BYTES;
        const detailPayload = {
          ...base,
          logs: incoming.logs,
          ...(hasV2 ? { v2: incoming.v2 } : {}),
        };
        await env.DB.batch([
          upsertStmt(env.DB, 'replay_detail', String(replayId), created, nowTs, detailPayload),
          upsertStmt(env.DB, 'replay', String(replayId), created, nowTs, base),
          env.DB.prepare(
            `DELETE FROM community_items WHERE kind = 'replay' AND id NOT IN
               (SELECT id FROM community_items WHERE kind = 'replay' ORDER BY created_at DESC LIMIT 40)`
          ),
        ]);
        return new Response(JSON.stringify({ ok: true, id: replayId }), { headers });
      }

      // (B) 게시판
      if (type === 'board') {
        const auth = readAuth(env, incoming?.auth?.password, incoming?.auth?.adminKey);
        const commentRow = async (pid: string, cid: string) => {
          const row = await env.DB!
            .prepare('SELECT data FROM community_comments WHERE post_id = ? AND id = ? AND deleted = 0')
            .bind(pid, cid)
            .first<{ data: string }>();
          if (!row) return null;
          try {
            return JSON.parse(row.data);
          } catch {
            return {};
          }
        };

        if (incoming?.action === 'verify') {
          // 화면이 비밀번호·관리자 키를 미리 확인할 때 쓴다 (값 자체는 돌려주지 않음)
          let ok = auth.isAdmin;
          if (!ok && incoming.postId && incoming.commentId) {
            const c = await commentRow(String(incoming.postId), String(incoming.commentId));
            ok = Boolean(c) && canModify(c, auth);
          } else if (!ok && incoming.postId) {
            const p = await getItem(env.DB, 'post', String(incoming.postId));
            ok = Boolean(p) && canModify(p, auth);
          }
          return new Response(JSON.stringify({ ok, isAdmin: auth.isAdmin }), { headers });
        } else if (incoming?.action === 'upsertPost' && incoming?.post?.id) {
          const wait = await savePost(env.DB, incoming.post, auth, who, nowTs);
          if (wait) return rateLimitedResponse(headers, wait, 'post');
        } else if (incoming?.action === 'deletePost' && incoming?.postId) {
          const pid = String(incoming.postId);
          if (!canModify(await getItem(env.DB, 'post', pid), auth)) return forbidden(headers);
          await env.DB.batch([
            env.DB.prepare('DELETE FROM community_items WHERE kind = ? AND id = ?').bind('post', pid),
            env.DB.prepare('DELETE FROM community_comments WHERE post_id = ?').bind(pid),
          ]);
        } else if (incoming?.action === 'addComment' && incoming?.postId) {
          const pid = String(incoming.postId);
          if (!(await getItem(env.DB, 'post', pid))) {
            return new Response(JSON.stringify({ ok: false, error: 'post not found' }), { status: 404, headers });
          }
          const comment = sanitizeComment(incoming.comment, nowTs);
          if (!comment) {
            return new Response(JSON.stringify({ ok: false, error: 'invalid comment' }), { status: 400, headers });
          }
          const commentWait = await hitRateLimit(env.DB, 'comment', who, nowTs);
          if (commentWait) return rateLimitedResponse(headers, commentWait, 'comment');
          await commentInsertStmt(env.DB, pid, comment, nowTs).run();
          return new Response(JSON.stringify({ ok: true, comment, updatedAt: nowTs }), { headers });
        } else if (incoming?.action === 'updateComment' && incoming?.postId && incoming?.commentId) {
          const pid = String(incoming.postId);
          const cid = String(incoming.commentId);
          const text = typeof incoming.text === 'string' ? incoming.text.trim().slice(0, 1000) : '';
          if (!text) return new Response(JSON.stringify({ ok: false, error: 'invalid comment' }), { status: 400, headers });
          const current = await commentRow(pid, cid);
          if (!current) return new Response(JSON.stringify({ ok: false, error: 'comment not found' }), { status: 404, headers });
          if (!canModify(current, auth)) return forbidden(headers);
          const next = { ...current, text };
          await env.DB
            .prepare('UPDATE community_comments SET data = ?, updated_at = ? WHERE post_id = ? AND id = ? AND deleted = 0')
            .bind(JSON.stringify(next), nowTs, pid, cid)
            .run();
          return new Response(JSON.stringify({ ok: true, comment: publicComment(next), updatedAt: nowTs }), { headers });
        } else if (incoming?.action === 'deleteComment' && incoming?.postId && incoming?.commentId) {
          const current = await commentRow(String(incoming.postId), String(incoming.commentId));
          if (current && !canModify(current, auth)) return forbidden(headers);
          // 행을 지우지 않고 묘비로 남긴다 (옛 클라이언트의 댓글 배열로 되살아나지 않게)
          await env.DB
            .prepare(
              `INSERT INTO community_comments (post_id, id, created_at, updated_at, deleted, data) VALUES (?, ?, ?, ?, 1, '{}')
               ON CONFLICT(post_id, id) DO UPDATE SET deleted = 1, data = '{}', updated_at = excluded.updated_at`
            )
            .bind(String(incoming.postId), String(incoming.commentId), nowTs, nowTs)
            .run();
        } else if (Array.isArray(incoming?.posts)) {
          // 이전 방식(목록 전체 저장): 글마다 upsertPost와 같은 권한 규칙으로 저장. 목록에 없다고 지우지 않음.
          for (const p of incoming.posts.filter((x: any) => x && x.id)) {
            const wait = await savePost(env.DB, p, auth, who, nowTs);
            if (wait) return rateLimitedResponse(headers, wait, 'post');
          }
        }
        return new Response(JSON.stringify({ ok: true, updatedAt: nowTs }), { headers });
      }

      // (C) 공유 덱: 클라이언트가 (최신 목록 + 변경)을 통째로 보냄
      //     들어온 덱은 upsert, 목록에 없는 덱은 삭제로 간주. 단 최근 2분 안에 올라온 덱은
      //     다른 사람이 방금 올린 것일 수 있으므로 지우지 않는다(동시 업로드 유실 방지).
      const decks: any[] = Array.isArray(incoming?.decks) ? incoming.decks.filter((d: any) => d && d.id) : [];
      const stmts = decks.map((d: any) => upsertStmt(env.DB!, 'deck', String(d.id), toTs(d.createdAt, nowTs), nowTs, d));
      for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
      // 빈 목록(예: 클라이언트의 조회 실패)으로 전체가 지워지는 사고 방지
      if (decks.length > 0) {
        const keep = new Set(decks.map((d: any) => String(d.id)));
        const cutoff = nowTs - 120_000;
        const rows = await env.DB
          .prepare(`SELECT id FROM community_items WHERE kind = 'deck' AND created_at < ? AND updated_at < ?`)
          .bind(cutoff, cutoff)
          .all<{ id: string }>();
        const toDelete = (rows.results || []).map((r) => r.id).filter((id) => !keep.has(id));
        // D1은 쿼리당 바인딩 변수 100개 제한 → 90개씩 나눠 삭제
        for (let i = 0; i < toDelete.length; i += 90) {
          const chunk = toDelete.slice(i, i + 90);
          await env.DB
            .prepare(`DELETE FROM community_items WHERE kind = 'deck' AND id IN (${chunk.map(() => '?').join(',')})`)
            .bind(...chunk)
            .run();
        }
      }
      return new Response(JSON.stringify({ ok: true, updatedAt: nowTs }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
};
