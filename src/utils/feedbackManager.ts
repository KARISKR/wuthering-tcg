import { CURRENT_GAME_VERSION } from '../data/patchNotes';

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
}

const STORAGE_KEY = 'wuthering_tcg_feedbacks_v3';
const DRAFT_KEY = 'wuthering_tcg_feedback_draft_v3';
const DELETED_KEY = 'wuthering_deleted_feedback_ids_v1';

const BOARD_POINTER_ID = 'ff808181a09d98f701a173ca355e092f';
const BOARD_POINTER_NAME = 'wuthering-tcg-community-board-v2';

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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return SEED_POSTS;
    }
    const list: FeedbackItem[] = JSON.parse(raw);
    return Array.isArray(list) ? list : SEED_POSTS;
  } catch {
    return SEED_POSTS;
  }
}

export async function fetchGlobalFeedbackList(): Promise<FeedbackItem[]> {
  let remotePosts: FeedbackItem[] | null = null;
  const deletedIds = getDeletedFeedbackIds();

  // 1순위: Cloudflare Pages Function (/api/community?type=board)
  try {
    const res = await fetch(`/api/community?type=board&t=${Date.now()}`, {
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

  // 원격 게시글과 로컬 게시글을 ID 기준으로 병합 (삭제된 글 제외)
  const mergedMap = new Map<string, FeedbackItem>();
  for (const p of allPosts) {
    if (!p || !p.id) continue;
    if (deletedIds.includes(p.id)) continue; // 삭제된 글 부활 방지

    const existing = mergedMap.get(p.id);
    if (!existing) {
      mergedMap.set(p.id, p);
    } else {
      // 댓글 병합 (중복 제거)
      const commentMap = new Map<string, CommentItem>();
      for (const c of [...(existing.comments || []), ...(p.comments || [])]) {
        if (c && c.id) commentMap.set(c.id, c);
      }
      mergedMap.set(p.id, {
        ...existing,
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}
  return merged;
}

export async function syncFeedbackListToCloud(postsToSync?: FeedbackItem[]): Promise<void> {
  try {
    const mergedPosts = postsToSync || (await fetchGlobalFeedbackList());
    const payload = JSON.stringify({
      posts: mergedPosts.map(({ likedByMe, dislikedByMe, ...rest }) => rest),
      updatedAt: Date.now(),
    });

    let savedViaApi = false;
    try {
      const res = await fetch('/api/community?type=board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (res.ok) savedViaApi = true;
    } catch {}

    if (!savedViaApi) {
      const blobRes = await fetch('https://bytebin.lucko.me/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (blobRes.ok) {
        const { key } = await blobRes.json();
        if (key) {
          await fetch(`https://api.restful-api.dev/objects/${BOARD_POINTER_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: BOARD_POINTER_NAME,
              data: { key, updatedAt: Date.now() },
            }),
          });
        }
      }
    }
  } catch (err) {
    console.warn('[feedbackManager] 클라우드 동기화 실패:', err);
  }
}

export function saveFeedback(
  data: Omit<FeedbackItem, 'id' | 'createdAt' | 'appVersion'> & { appVersion?: string }
): FeedbackItem {
  const list = getFeedbackList();
  const newItem: FeedbackItem = {
    id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    appVersion: data.appVersion || CURRENT_GAME_VERSION,
    likes: 0,
    dislikes: 0,
    views: 1,
    likedByMe: false,
    dislikedByMe: false,
    comments: [],
    ...data,
  };
  const updated = [newItem, ...list];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[feedbackManager] Failed to persist feedback list:', err);
  }

  // 글로벌 클라우드 병합 및 동기화
  fetchGlobalFeedbackList().then((latest) => {
    const exists = latest.some((item) => item.id === newItem.id);
    const finalPosts = exists ? latest : [newItem, ...latest];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPosts));
    } catch {}
    syncFeedbackListToCloud(finalPosts);
  });

  return newItem;
}

export function incrementViewCount(id: string): void {
  const list = getFeedbackList();
  const updated = list.map((item) => {
    if (item.id === id) {
      return { ...item, views: (item.views || 0) + 1 };
    }
    return item;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[feedbackManager] Failed to increment views:', err);
  }
}

export function toggleLikeFeedback(id: string): { likes: number; likedByMe: boolean } {
  const list = getFeedbackList();
  let result = { likes: 0, likedByMe: false };
  const updated = list.map((item) => {
    if (item.id === id) {
      const liked = !item.likedByMe;
      const likes = Math.max(0, (item.likes || 0) + (liked ? 1 : -1));
      result = { likes, likedByMe: liked };
      return { ...item, likes, likedByMe: liked };
    }
    return item;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[feedbackManager] Failed to toggle like:', err);
  }
  syncFeedbackListToCloud(updated);
  return result;
}

export function toggleDislikeFeedback(id: string): { dislikes: number; dislikedByMe: boolean } {
  const list = getFeedbackList();
  let result = { dislikes: 0, dislikedByMe: false };
  const updated = list.map((item) => {
    if (item.id === id) {
      const disliked = !item.dislikedByMe;
      const dislikes = Math.max(0, (item.dislikes || 0) + (disliked ? 1 : -1));
      result = { dislikes, dislikedByMe: disliked };
      return { ...item, dislikes, dislikedByMe: disliked };
    }
    return item;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[feedbackManager] Failed to toggle dislike:', err);
  }
  syncFeedbackListToCloud(updated);
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

  const updated = list.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        comments: [...(item.comments || []), newComment],
      };
    }
    return item;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[feedbackManager] Failed to add comment:', err);
  }
  syncFeedbackListToCloud(updated);
  return newComment;
}

export function updateFeedback(id: string, updates: Partial<Omit<FeedbackItem, 'id' | 'createdAt'>>): void {
  const list = getFeedbackList();
  const updated = list.map((item) => (item.id === id ? { ...item, ...updates } : item));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[feedbackManager] Failed to update feedback:', err);
  }
  syncFeedbackListToCloud(updated);
}

export function deleteFeedback(id: string): void {
  recordDeletedId(id);
  const list = getFeedbackList();
  const filtered = list.filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('[feedbackManager] Failed to delete feedback:', err);
  }
  syncFeedbackListToCloud(filtered);
}

export function clearAllFeedback(): void {
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
  const updated = list.map((item) => {
    if (item.id === postId) {
      return {
        ...item,
        comments: (item.comments || []).map((c) =>
          c.id === commentId ? { ...c, text: newText.trim() } : c
        ),
      };
    }
    return item;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[feedbackManager] Failed to update comment:', err);
  }
  syncFeedbackListToCloud(updated);
  return true;
}

export function deleteCommentFromFeedback(postId: string, commentId: string): boolean {
  const list = getFeedbackList();
  const updated = list.map((item) => {
    if (item.id === postId) {
      return {
        ...item,
        comments: (item.comments || []).filter((c) => c.id !== commentId),
      };
    }
    return item;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[feedbackManager] Failed to delete comment:', err);
  }
  syncFeedbackListToCloud(updated);
  return true;
}
