import { CURRENT_GAME_VERSION } from '../data/gameVersion';

export type FeedbackCategory = 'NOTICE' | 'GENERAL' | 'DECK' | 'TIP' | 'FEEDBACK' | 'BUG' | 'RULE' | 'FEATURE';

export interface CommentItem {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  replyToId?: string;
  replyToAuthor?: string;
  password?: string;
}

export interface FeedbackItem {
  id: string;
  category: FeedbackCategory;
  title: string;
  content: string;
  createdAt: string; // ISO string
  updatedAt?: string; // 수정 시각 (병합 시 최신본 우선 반영용)
  appVersion: string; // e.g. "v1.9.4"
  contextView?: string; // "LOBBY" | "BATTLE" | "DECK_BUILDER" | "REPLAY_STAGE"
  contact?: string; // 작성자 닉네임 (기본값 '방랑자')
  deckCode?: string; // 덱 공유 시 덱 코드
  deckName?: string; // 덱 공유 시 덱 이름
  imageUrl?: string; // 첨부 이미지 (800px WebP data URL, 하위 호환)
  images?: string[]; // 다중 첨부 이미지 목록 (업로드 이미지 및 정적 카드 이미지)
  likes?: number; // 추천수 (개추)
  dislikes?: number; // 비추천수 (비추)
  views?: number; // 조회수
  likedByMe?: boolean;
  dislikedByMe?: boolean;
  isNotice?: boolean; // 상단 공지 고정 여부
  comments?: CommentItem[];
  isSecret?: boolean; // 비밀글 여부 (개인 덱 저장용)
  password?: string; // 비밀글 열람 및 수정/삭제용 비밀번호
  hasImage?: boolean; // 요약 목록에서 이미지 포함 여부 표시용
  isSummaryOnly?: boolean; // 목록 조회 시 본문/이미지가 아직 로드되지 않은 요약 상태 여부
}

const STORAGE_KEY = 'wuthering_tcg_feedbacks_v3';
const DRAFT_KEY = 'wuthering_tcg_feedback_draft_v3';
const DELETED_KEY = 'wuthering_deleted_feedback_ids_v1';

const BOARD_POINTER_ID = 'ff808181a09d98f701a173ca355e092f';
const BOARD_POINTER_NAME = 'wuthering-tcg-community-board-v2';

// [WP9 잔여] 서버가 작성 빈도 제한(429)으로 거절하면 화면에 알린다. CommunityBoard·FeedbackModal이 구독.
export const RATE_LIMITED_EVENT = 'wtcg:community-rate-limited';
/** 로컬 댓글 목록이 비동기로 바뀌었을 때(빈도 제한 되돌리기) 화면 갱신용 */
export const COMMENTS_CHANGED_EVENT = 'wtcg:community-comments-changed';
export interface RateLimitedDetail {
  bucket: 'post' | 'comment' | 'replay' | 'write';
  retryAfter: number; // 초
}
async function notifyIfRateLimited(res: Response): Promise<boolean> {
  if (res.status !== 429) return false;
  let detail: RateLimitedDetail = { bucket: 'write', retryAfter: Number(res.headers.get('Retry-After')) || 60 };
  try {
    const body = await res.json();
    if (body?.bucket) detail = { bucket: body.bucket, retryAfter: Number(body.retryAfter) || detail.retryAfter };
  } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<RateLimitedDetail>(RATE_LIMITED_EVENT, { detail }));
  return true;
}
export function rateLimitMessage(d: RateLimitedDetail): string {
  const what = d.bucket === 'post' ? '새 글' : d.bucket === 'comment' ? '댓글' : '작성';
  const min = Math.max(1, Math.ceil(d.retryAfter / 60));
  return `⏳ ${what}을 너무 자주 올렸어요. 약 ${min}분 뒤에 다시 시도해주세요.`;
}

/** 댓글 1건 추가·수정·삭제만 서버에 보낸다 (글 전체를 다시 저장하지 않음) */
async function syncCommentAction(body: Record<string, unknown>): Promise<'ok' | 'limited' | 'error'> {
  try {
    try {
      localStorage.removeItem('wuthering_lobby_notice_cache_v1');
    } catch {}
    const res = await fetch('/api/community?type=board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, updatedAt: Date.now() }),
    });
    if (await notifyIfRateLimited(res)) return 'limited';
    return res.ok ? 'ok' : 'error';
  } catch (err) {
    console.warn('[feedbackManager] 댓글 동기화 실패:', err);
    return 'error';
  }
}

export const CATEGORY_INFO: Record<
  FeedbackCategory,
  { label: string; icon: string; color: string; badgeClass: string; desc: string }
> = {
  NOTICE: {
    label: '공지',
    icon: '📢',
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/25 text-amber-300 border-amber-500/50',
    desc: '운영자 공식 공지사항 및 시스템 업데이트 안내 (관리자 전용)',
  },
  GENERAL: {
    label: '일반',
    icon: '💬',
    color: '#6366f1',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    desc: '게임 소감, 밸런스 이야기, 자유로운 잡담을 나눕니다.',
  },
  DECK: {
    label: '덱공유',
    icon: '🃏',
    color: '#a855f7',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    desc: '강력한 커스텀 덱 코드와 운용 팁을 공유하고 추천합니다.',
  },
  TIP: {
    label: '공략',
    icon: '📖',
    color: '#06b6d4',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    desc: '실전 카드 운용법, 티어 덱 공략 및 연격 콤보 가이드를 공유합니다.',
  },
  FEEDBACK: {
    label: '버그 및 피드백',
    icon: '🐛',
    color: '#ef4444',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    desc: '게임 오류/버그 제보 및 새로운 기능/시스템 개선안을 제안합니다.',
  },
  // 하위 호환
  BUG: {
    label: '버그제보',
    icon: '🐛',
    color: '#ef4444',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    desc: '버그 제보',
  },
  RULE: {
    label: '룰질문',
    icon: '📜',
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: '룰 질문',
  },
  FEATURE: {
    label: '개선제안',
    icon: '💡',
    color: '#10b981',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: '개선 제안',
  },
};

export const ACTIVE_CATEGORIES: FeedbackCategory[] = ['NOTICE', 'GENERAL', 'DECK', 'TIP', 'FEEDBACK'];

// 가짜 시드 글을 완전히 비워 유저 실제 글만 표시되도록 함
const SEED_POSTS: FeedbackItem[] = [];

// 인메모리 캐시: 반복적인 localStorage 대용량 JSON.parse 동기 블로킹 방지
let memoryPostsCache: FeedbackItem[] | null = null;
// 개별 게시글 클릭 시 온디맨드로 다운로드된 본문+이미지 캐시
const postDetailCache = new Map<string, FeedbackItem>();

function persistLocalPosts(posts: FeedbackItem[]): void {
  memoryPostsCache = posts;
  try {
    // localStorage에는 대용량 Base64 이미지를 제외한 경량 메타데이터 위주로 저장하여 용량 초과 및 초기 파싱 프리징 방지
    const lightweight = posts.map((p) => {
      if (!p.isSummaryOnly) {
        postDetailCache.set(p.id, p);
      }
      const hasBase64Img =
        (p.imageUrl && p.imageUrl.startsWith('data:image')) ||
        (Array.isArray(p.images) && p.images.some((u) => u.startsWith('data:image')));
      if (!hasBase64Img) return p;
      return {
        ...p,
        imageUrl: undefined,
        images: p.images?.filter((u) => !u.startsWith('data:image')),
        hasImage: true,
        isSummaryOnly: true,
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
  } catch (err) {
    console.warn('[feedbackManager] Failed to persist feedback list:', err);
  }
}

export function getDeletedFeedbackIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeletedId(id: string): void {
  const ids = getDeletedFeedbackIds();
  if (!ids.includes(id)) {
    ids.push(id);
    try {
      localStorage.setItem(DELETED_KEY, JSON.stringify(ids));
    } catch {}
  }
}

export function getFeedbackList(): FeedbackItem[] {
  if (memoryPostsCache) return memoryPostsCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return SEED_POSTS;
    }
    const list: FeedbackItem[] = JSON.parse(raw);
    if (Array.isArray(list)) {
      memoryPostsCache = list;
      return list;
    }
    return SEED_POSTS;
  } catch {
    return SEED_POSTS;
  }
}

/**
 * 로비 및 게시판 목록 진입용 초경량 요약 조회 (본문 및 Base64 첨부 이미지 제외)
 * 게시글을 실제로 클릭하기 전까지 수 MB의 게시글 이미지 다운로드를 방지합니다.
 */
export async function fetchBoardSummaryForLobby(): Promise<FeedbackItem[]> {
  const deletedIds = getDeletedFeedbackIds();
  const localPosts = getFeedbackList();
  const localMap = new Map<string, FeedbackItem>();
  for (const lp of localPosts) {
    if (lp && lp.id) localMap.set(lp.id, lp);
  }

  try {
    const res = await fetch('/api/community?type=board&summary=1', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.posts)) {
        const remoteIdSet = new Set<string>();
        const merged = (data.posts as FeedbackItem[])
          .filter((p) => p && p.id && !deletedIds.includes(p.id))
          .map((summaryItem) => {
            remoteIdSet.add(summaryItem.id);
            const localItem = localMap.get(summaryItem.id);
            const cachedFull = postDetailCache.get(summaryItem.id);
            const localTime = localItem?.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
            const remoteTime = summaryItem.updatedAt ? new Date(summaryItem.updatedAt).getTime() : 0;
            const preferLocalMeta = Boolean(localItem && localTime > remoteTime);

            const base = cachedFull && !cachedFull.isSummaryOnly ? cachedFull : summaryItem;
            return {
              ...base,
              ...summaryItem,
              ...(preferLocalMeta ? localItem : {}),
              content: cachedFull && !cachedFull.isSummaryOnly ? cachedFull.content : summaryItem.content || '',
              imageUrl: cachedFull && !cachedFull.isSummaryOnly ? cachedFull.imageUrl : summaryItem.imageUrl,
              images: cachedFull && !cachedFull.isSummaryOnly ? cachedFull.images : summaryItem.images,
              isSummaryOnly: cachedFull && !cachedFull.isSummaryOnly ? false : Boolean(summaryItem.isSummaryOnly),
              views: Math.max(summaryItem.views || 0, localItem?.views || 0),
              likes: Math.max(summaryItem.likes || 0, localItem?.likes || 0),
              dislikes: Math.max(summaryItem.dislikes || 0, localItem?.dislikes || 0),
              likedByMe: Boolean(localItem?.likedByMe),
              dislikedByMe: Boolean(localItem?.dislikedByMe),
            };
          });

        // 방금 로컬에서 작성되어 아직 서버 요약에 반영되기 전인 최신 로컬 글 보존
        const unsyncedLocal = localPosts.filter(
          (lp) => lp && lp.id && !deletedIds.includes(lp.id) && !remoteIdSet.has(lp.id)
        );
        const finalMerged = [...unsyncedLocal, ...merged];
        memoryPostsCache = finalMerged;
        return finalMerged;
      }
    }
  } catch {}
  return localPosts;
}

/**
 * 게시글 클릭 시 해당 게시글 1건의 본문 + 첨부 이미지를 온디맨드로 다운로드합니다.
 */
export async function fetchFeedbackPostDetail(postId: string): Promise<FeedbackItem | null> {
  if (!postId) return null;
  const cached = postDetailCache.get(postId);
  if (cached && !cached.isSummaryOnly) {
    return cached;
  }

  try {
    const res = await fetch(`/api/community?type=board&postId=${encodeURIComponent(postId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.post && data.post.id) {
        const list = getFeedbackList();
        const existing = list.find((p) => p.id === postId);
        const fullPost: FeedbackItem = {
          ...existing,
          ...data.post,
          views: Math.max(data.post.views || 0, existing?.views || 0),
          likes: Math.max(data.post.likes || 0, existing?.likes || 0),
          dislikes: Math.max(data.post.dislikes || 0, existing?.dislikes || 0),
          likedByMe: Boolean(existing?.likedByMe),
          dislikedByMe: Boolean(existing?.dislikedByMe),
          isSummaryOnly: false,
        };
        postDetailCache.set(postId, fullPost);
        if (memoryPostsCache) {
          memoryPostsCache = memoryPostsCache.map((p) => (p.id === postId ? fullPost : p));
        }
        return fullPost;
      }
    }
  } catch {}

  // 폴백: 전체 목록 조회에서 해당 게시글 추출
  const all = await fetchGlobalFeedbackList();
  const found = all.find((p) => p.id === postId) || null;
  if (found) {
    const full = { ...found, isSummaryOnly: false };
    postDetailCache.set(postId, full);
    return full;
  }
  return null;
}

export async function fetchGlobalFeedbackList(): Promise<FeedbackItem[]> {
  let remotePosts: FeedbackItem[] | null = null;
  const deletedIds = getDeletedFeedbackIds();

  // 1순위: Cloudflare Pages Function (/api/community?type=board)
  try {
    const res = await fetch('/api/community?type=board', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.posts)) {
        remotePosts = data.posts;
      }
    }
  } catch {}

  // 2순위 폴백: 직접 클라우드 스토어 조회
  if (!remotePosts) {
    try {
      const ptrRes = await fetch(`https://api.restful-api.dev/objects/${BOARD_POINTER_ID}`);
      if (ptrRes.ok) {
        const ptrJson = await ptrRes.json();
        const blobKey = ptrJson?.data?.key;
        if (blobKey) {
          const blobRes = await fetch(`https://bytebin.lucko.me/${blobKey}`);
          if (blobRes.ok) {
            const blobData = await blobRes.json();
            if (Array.isArray(blobData?.posts)) {
              remotePosts = blobData.posts;
            }
          }
        }
      }
    } catch {}
  }

  const localPosts = getFeedbackList();
  const allPosts = remotePosts ? [...remotePosts, ...localPosts] : localPosts;
  const remoteIds = new Set((remotePosts || []).map((p) => p?.id).filter(Boolean) as string[]);

  // 원격 게시글과 로컬 게시글을 ID 기준으로 병합 (삭제된 글 제외)
  const mergedMap = new Map<string, FeedbackItem>();
  for (const p of allPosts) {
    if (!p || !p.id) continue;
    if (deletedIds.includes(p.id)) continue; // 삭제된 글 부활 방지

    const existing = mergedMap.get(p.id);
    if (!existing) {
      mergedMap.set(p.id, p);
    } else {
      // 댓글 병합: 서버에 있는 글이면 서버 댓글을 기준으로 하고(다른 사람이 지운 댓글이 되살아나지 않게),
      // 아직 서버에 반영되지 않았을 수 있는 내 최근 댓글(2분 이내)만 덧붙인다.
      const commentMap = new Map<string, CommentItem>();
      if (remoteIds.has(p.id)) {
        const pendingSince = Date.now() - 120_000;
        for (const c of existing.comments || []) if (c && c.id) commentMap.set(c.id, c);
        for (const c of p.comments || []) {
          if (c && c.id && !commentMap.has(c.id) && new Date(c.createdAt).getTime() > pendingSince) commentMap.set(c.id, c);
        }
      } else {
        for (const c of [...(existing.comments || []), ...(p.comments || [])]) {
          if (c && c.id) commentMap.set(c.id, c);
        }
      }
      // updatedAt 비교: 더 최신에 수정된 버전(또는 로컬 최신본 p)을 우선 채택하여 삭제된 이미지가 부활하는 현상 방지
      const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const incomingTime = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
      const newer = incomingTime >= existingTime ? p : existing;
      const older = incomingTime >= existingTime ? existing : p;

      mergedMap.set(p.id, {
        ...older,
        ...newer,
        imageUrl: newer.images && newer.images.length === 0 ? undefined : newer.imageUrl,
        images: newer.images,
        likes: Math.max(existing.likes || 0, p.likes || 0),
        dislikes: Math.max(existing.dislikes || 0, p.dislikes || 0),
        views: Math.max(existing.views || 0, p.views || 0),
        likedByMe: Boolean(existing.likedByMe || p.likedByMe),
        dislikedByMe: Boolean(existing.dislikedByMe || p.dislikedByMe),
        comments: Array.from(commentMap.values()),
      });
    }
  }

  const merged = Array.from(mergedMap.values());
  persistLocalPosts(merged);
  return merged;
}

export async function syncSinglePostToCloud(post: FeedbackItem): Promise<void> {
  try {
    try {
      localStorage.removeItem('wuthering_lobby_notice_cache_v1');
    } catch {}
    // 댓글은 addComment/updateComment/deleteComment로 따로 보내므로 글 저장에는 싣지 않는다
    const { comments: _comments, ...postWithoutComments } = post;
    const res = await fetch('/api/community?type=board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsertPost',
        post: postWithoutComments,
        updatedAt: Date.now(),
      }),
    });
    await notifyIfRateLimited(res);
  } catch (err) {
    console.warn('[feedbackManager] 단일 게시글 동기화 실패:', err);
  }
}

export async function syncDeletePostToCloud(postId: string): Promise<void> {
  try {
    try {
      localStorage.removeItem('wuthering_lobby_notice_cache_v1');
    } catch {}
    await fetch('/api/community?type=board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deletePost',
        postId,
        updatedAt: Date.now(),
      }),
    });
  } catch (err) {
    console.warn('[feedbackManager] 게시글 삭제 동기화 실패:', err);
  }
}

export async function syncFeedbackListToCloud(postsToSync?: FeedbackItem[]): Promise<void> {
  try {
    const mergedPosts = postsToSync || getFeedbackList();
    const payload = JSON.stringify({
      posts: mergedPosts.map(({ likedByMe, dislikedByMe, ...rest }) => rest),
      updatedAt: Date.now(),
    });

    await fetch('/api/community?type=board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
  } catch (err) {
    console.warn('[feedbackManager] 클라우드 동기화 실패:', err);
  }
}

export function saveFeedback(
  data: Omit<FeedbackItem, 'id' | 'createdAt' | 'appVersion'> & { appVersion?: string }
): FeedbackItem {
  const list = getFeedbackList();
  const nowIso = new Date().toISOString();
  const newItem: FeedbackItem = {
    id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: nowIso,
    updatedAt: nowIso,
    appVersion: data.appVersion || CURRENT_GAME_VERSION,
    likes: 0,
    dislikes: 0,
    views: 1,
    likedByMe: false,
    dislikedByMe: false,
    comments: [],
    hasImage: Boolean(data.imageUrl || (data.images && data.images.length > 0)),
    isSummaryOnly: false,
    ...data,
  };
  postDetailCache.set(newItem.id, newItem);
  const updated = [newItem, ...list];
  persistLocalPosts(updated);

  // 전체 목록 재다운로드 없이 단일 게시글만 즉시 비동기 업로드
  syncSinglePostToCloud(newItem);

  return newItem;
}

export function incrementViewCount(id: string): void {
  const list = getFeedbackList();
  const updated = list.map((item) => {
    if (item.id === id) {
      const next = { ...item, views: (item.views || 0) + 1 };
      const cached = postDetailCache.get(id);
      if (cached) postDetailCache.set(id, { ...cached, views: next.views });
      return next;
    }
    return item;
  });
  persistLocalPosts(updated);
}

export function toggleLikeFeedback(id: string): { likes: number; likedByMe: boolean } {
  const list = getFeedbackList();
  let result = { likes: 0, likedByMe: false };
  let targetPost: FeedbackItem | null = null;
  const updated = list.map((item) => {
    if (item.id === id) {
      const liked = !item.likedByMe;
      const likes = Math.max(0, (item.likes || 0) + (liked ? 1 : -1));
      result = { likes, likedByMe: liked };
      const next = { ...item, likes, likedByMe: liked };
      targetPost = next;
      const cached = postDetailCache.get(id);
      if (cached) postDetailCache.set(id, { ...cached, likes, likedByMe: liked });
      return next;
    }
    return item;
  });
  persistLocalPosts(updated);
  if (targetPost) syncSinglePostToCloud(targetPost);
  return result;
}

export function toggleDislikeFeedback(id: string): { dislikes: number; dislikedByMe: boolean } {
  const list = getFeedbackList();
  let result = { dislikes: 0, dislikedByMe: false };
  let targetPost: FeedbackItem | null = null;
  const updated = list.map((item) => {
    if (item.id === id) {
      const disliked = !item.dislikedByMe;
      const dislikes = Math.max(0, (item.dislikes || 0) + (disliked ? 1 : -1));
      result = { dislikes, dislikedByMe: disliked };
      const next = { ...item, dislikes, dislikedByMe: disliked };
      targetPost = next;
      const cached = postDetailCache.get(id);
      if (cached) postDetailCache.set(id, { ...cached, dislikes, dislikedByMe: disliked });
      return next;
    }
    return item;
  });
  persistLocalPosts(updated);
  if (targetPost) syncSinglePostToCloud(targetPost);
  return result;
}

export function addCommentToFeedback(
  id: string,
  author: string,
  text: string,
  replyToId?: string,
  replyToAuthor?: string,
  password?: string
): CommentItem | null {
  if (!text.trim()) return null;
  const list = getFeedbackList();
  const newComment: CommentItem = {
    id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    author: author.trim() || '방랑자',
    text: text.trim(),
    createdAt: new Date().toISOString(),
    ...(replyToId ? { replyToId, replyToAuthor } : {}),
    ...(password ? { password: password.trim() } : {}),
  };

  let targetPost: FeedbackItem | null = null;
  const updated = list.map((item) => {
    if (item.id === id) {
      const nextComments = [...(item.comments || []), newComment];
      const next = {
        ...item,
        comments: nextComments,
      };
      targetPost = next;
      const cached = postDetailCache.get(id);
      if (cached) postDetailCache.set(id, { ...cached, comments: nextComments });
      return next;
    }
    return item;
  });

  persistLocalPosts(updated);
  if (targetPost) {
    void syncCommentAction({ action: 'addComment', postId: id, comment: newComment }).then((r) => {
      if (r !== 'limited') return;
      // 빈도 제한으로 거절된 댓글은 로컬에서도 되돌린다 (저장된 것처럼 보이지 않게)
      persistLocalPosts(
        getFeedbackList().map((item) =>
          item.id === id ? { ...item, comments: (item.comments || []).filter((c) => c.id !== newComment.id) } : item
        )
      );
      const cached = postDetailCache.get(id);
      if (cached) postDetailCache.set(id, { ...cached, comments: (cached.comments || []).filter((c) => c.id !== newComment.id) });
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(COMMENTS_CHANGED_EVENT, { detail: { postId: id } }));
    });
  }
  return newComment;
}

export function updateFeedback(id: string, updates: Partial<Omit<FeedbackItem, 'id' | 'createdAt'>>): void {
  const list = getFeedbackList();
  let targetPost: FeedbackItem | null = null;
  const updated = list.map((item) => {
    if (item.id !== id) return item;
    const nextImages = updates.images !== undefined ? updates.images : (item.images || []);
    const nextImageUrl = nextImages.length > 0 ? nextImages[0] : undefined;
    const nextItem: FeedbackItem = {
      ...item,
      ...updates,
      images: nextImages,
      imageUrl: nextImageUrl,
      hasImage: nextImages.length > 0,
      isSummaryOnly: false,
      updatedAt: new Date().toISOString(),
    };
    postDetailCache.set(id, nextItem);
    targetPost = nextItem;
    return nextItem;
  });
  persistLocalPosts(updated);
  if (targetPost) syncSinglePostToCloud(targetPost);
}

export function deleteFeedback(id: string): void {
  recordDeletedId(id);
  postDetailCache.delete(id);
  const list = getFeedbackList();
  const filtered = list.filter((item) => item.id !== id);
  persistLocalPosts(filtered);
  syncDeletePostToCloud(id);
}

export function clearAllFeedback(): void {
  memoryPostsCache = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[feedbackManager] Failed to clear feedback:', err);
  }
}

export function formatForClipboard(item: FeedbackItem): string {
  const cat = CATEGORY_INFO[item.category] || CATEGORY_INFO.GENERAL;
  const dateStr = new Date(item.createdAt).toLocaleString('ko-KR');

  return [
    `[명조 TCG 커뮤니티 게시판]`,
    `■ 분류: ${cat.icon} ${cat.label}`,
    `■ 버전: ${item.appVersion}${item.contextView ? ` (상황: ${item.contextView})` : ''}`,
    `■ 일시: ${dateStr}`,
    item.contact ? `■ 작성자: ${item.contact}` : null,
    `■ 제목: ${item.title}`,
    item.deckCode ? `■ 덱 코드: ${item.deckCode}` : null,
    `----------------------------------------`,
    item.content,
    `----------------------------------------`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function exportFeedbackAsJson(items: FeedbackItem[]): void {
  const json = JSON.stringify(items, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wuthering_tcg_board_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function compressImageFile(file: File, maxDimension = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {}
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface FeedbackDraft {
  category: FeedbackCategory;
  title: string;
  content: string;
  contact?: string;
  deckCode?: string;
  deckName?: string;
}

export function getDraft(): FeedbackDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: FeedbackDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.warn('[feedbackManager] Failed to save draft:', err);
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (err) {
    console.warn('[feedbackManager] Failed to clear draft:', err);
  }
}

export const ADMIN_MASTER_PASSWORDS = ['wuwatcg2026'];

export function isUserAdmin(): boolean {
  try {
    return localStorage.getItem('wuthering_is_admin_verified') === 'true';
  } catch {
    return false;
  }
}

export function setAdminVerified(verified: boolean): void {
  try {
    if (verified) {
      localStorage.setItem('wuthering_is_admin_verified', 'true');
    } else {
      localStorage.removeItem('wuthering_is_admin_verified');
    }
  } catch {}
}

export function getLatestNotice(posts?: FeedbackItem[]): FeedbackItem | null {
  const list = posts || getFeedbackList();
  const notices = list.filter((p) => p.isNotice || p.category === 'NOTICE');
  if (notices.length === 0) return null;
  return [...notices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

export function hasNewPosts(posts?: FeedbackItem[], hours = 24): boolean {
  const list = posts || getFeedbackList();
  const threshold = Date.now() - hours * 3600 * 1000;
  return list.some((p) => new Date(p.createdAt).getTime() > threshold);
}

export function isPostNew(post: FeedbackItem, hours = 24): boolean {
  const threshold = Date.now() - hours * 3600 * 1000;
  return new Date(post.createdAt).getTime() > threshold;
}

export function updateCommentInFeedback(
  postId: string,
  commentId: string,
  newText: string
): boolean {
  if (!newText.trim()) return false;
  const list = getFeedbackList();
  let targetPost: FeedbackItem | null = null;
  const updated = list.map((item) => {
    if (item.id === postId) {
      targetPost = {
        ...item,
        updatedAt: new Date().toISOString(),
        comments: (item.comments || []).map((c) =>
          c.id === commentId ? { ...c, text: newText.trim() } : c
        ),
      };
      return targetPost;
    }
    return item;
  });
  persistLocalPosts(updated);
  if (targetPost) {
    void syncCommentAction({ action: 'updateComment', postId, commentId, text: newText.trim() });
  }
  return true;
}

export function deleteCommentFromFeedback(postId: string, commentId: string): boolean {
  const list = getFeedbackList();
  let targetPost: FeedbackItem | null = null;
  const updated = list.map((item) => {
    if (item.id === postId) {
      targetPost = {
        ...item,
        updatedAt: new Date().toISOString(),
        comments: (item.comments || []).filter((c) => c.id !== commentId),
      };
      return targetPost;
    }
    return item;
  });
  persistLocalPosts(updated);
  if (targetPost) {
    void syncCommentAction({ action: 'deleteComment', postId, commentId });
  }
  return true;
}
