import { CURRENT_GAME_VERSION } from '../data/patchNotes';

export type FeedbackCategory = 'BUG' | 'DECK' | 'RULE' | 'FEATURE' | 'GENERAL';

export interface CommentItem {
  id: string;
  author: string;
  text: string;
  createdAt: string;
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
  likes?: number; // 추천수 (개추)
  dislikes?: number; // 비추천수 (비추)
  views?: number; // 조회수
  likedByMe?: boolean;
  dislikedByMe?: boolean;
  isNotice?: boolean; // 상단 공지 고정 여부
  comments?: CommentItem[];
  isSecret?: boolean; // 비밀글 여부 (개인 덱 저장용)
  password?: string; // 비밀글 열람 및 삭제용 비밀번호
}

const STORAGE_KEY = 'wuthering_tcg_feedbacks_v3';
const DRAFT_KEY = 'wuthering_tcg_feedback_draft_v3';

const BOARD_POINTER_ID = 'ff808181a09d98f701a173ca355e092f';
const BOARD_POINTER_NAME = 'wuthering-tcg-community-board-v2';

export const CATEGORY_INFO: Record<
  FeedbackCategory,
  { label: string; icon: string; color: string; badgeClass: string; desc: string }
> = {
  BUG: {
    label: '버그제보',
    icon: '🐛',
    color: '#ef4444',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    desc: '게임 멈춤, 연출 꼬임, 화면 이상 등 버그와 오류를 제보합니다.',
  },
  DECK: {
    label: '덱공유',
    icon: '🃏',
    color: '#a855f7',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    desc: '강력한 커스텀 덱 코드와 운용 팁을 공유하고 추천합니다.',
  },
  RULE: {
    label: '룰질문',
    icon: '📜',
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: '공식 텍스트 룰이나 판정 수치 이상 및 질문을 남깁니다.',
  },
  FEATURE: {
    label: '개선제안',
    icon: '💡',
    color: '#10b981',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: '신규 기능, 편의성 개선안, 새로운 아이디어를 제안합니다.',
  },
  GENERAL: {
    label: '일반',
    icon: '💬',
    color: '#6366f1',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    desc: '게임 밸런스 소감, 팁, 자유로운 잡담을 나눕니다.',
  },
};

const SEED_POSTS: FeedbackItem[] = [
  {
    id: 'notice-01',
    category: 'GENERAL',
    isNotice: true,
    title: '📢 [공지] 명조 배틀 TCG 시뮬레이터 이용 수칙 및 덱 공유 가이드',
    content: '명조 배틀 TCG 시뮬레이터 공식 커뮤니티(아카 채널)에 오신 것을 환영합니다.\n\n[이용 수칙 안내]\n1. 덱 공유 시 본인의 덱 프리셋이나 덱 코드를 첨부해주시면 다른 유저들이 즉시 1클릭 복사하여 게임에서 즐길 수 있습니다.\n2. 버그 제보 시 발생 턴, 사용 카드, 상대 상태 등 상황을 구체적으로 기재해주시면 빠른 패치에 큰 도움이 됩니다.\n3. 매너 있는 소통과 훈훈한 덱 연구 문화를 함께 만들어갑시다!',
    createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    appVersion: CURRENT_GAME_VERSION,
    contact: '관리자',
    likes: 45,
    dislikes: 0,
    views: 1240,
    likedByMe: false,
    comments: [
      {
        id: 'c-n1',
        author: '방랑자99',
        text: '웹에서 바로 덱 짜고 플레이할 수 있어서 너무 좋습니다 화이팅!',
        createdAt: new Date(Date.now() - 3600 * 1000 * 36).toISOString(),
      },
    ],
  },
  {
    id: 'notice-02',
    category: 'FEATURE',
    isNotice: true,
    title: '📢 [공지] v1.1.0 대규모 업데이트 안내 (비대칭 벤토 그리드, SFX, 자유게시판 오픈)',
    content: '명조 배틀 TCG v1.1.0 업데이트가 완료되었습니다.\n\n- 로비 화면 비대칭 벤토 그리드(Bento Grid) 리팩토링\n- SFX 효과음 커스텀 시스템 및 덱 빌더 연동\n- 아카라이브 스타일 자유게시판(커뮤니티) 오픈 및 URL 해시(#board) 지원',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    appVersion: CURRENT_GAME_VERSION,
    contact: '운영진',
    likes: 38,
    dislikes: 1,
    views: 980,
    likedByMe: false,
    comments: [],
  },
  {
    id: 'seed-deck-01',
    category: 'DECK',
    title: '[추천] 방랑자 회멸 + 앙코 원턴킬 콤보덱 공유',
    content: '방랑자(회멸)의 2레벨 연격과 앙코의 화염 연타 시너지를 극대화한 공격형 덱입니다. 초반에는 RED 공격 카드로 압박하고 3턴 차에 콤보를 몰아쳐서 20 라이프를 순식간에 깎아낼 수 있습니다. 덱 코드 복사해서 덱 빌더에서 테스트해보세요!',
    createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    appVersion: CURRENT_GAME_VERSION,
    contact: '마스터방랑자',
    deckName: '회멸 앙코 폭풍 공격덱',
    deckCode: 'WTCG-DECK-HD-V1-ROVER-HAVOC-ENCORE-BURST',
    likes: 24,
    dislikes: 1,
    views: 312,
    likedByMe: false,
    comments: [
      {
        id: 'c-1',
        author: '초보유저',
        text: '덱 코드로 바로 불러와서 AI전 해봤는데 손맛 장난 아니네요 추천드립니다!',
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      },
    ],
  },
  {
    id: 'seed-bug-01',
    category: 'BUG',
    title: '[버그제보] 연격 자동 종료 시 사운드 중복 출력 현상',
    content: '상대가 2연격 또는 3연격을 연속 시전할 때 연격 효과음이 겹치거나, 자동 종료 시 연격 사운드가 여러 개 동시에 터지는 현상이 가끔 있습니다. 효과음 재생 채널 제어 확인 부탁드립니다!',
    createdAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
    appVersion: CURRENT_GAME_VERSION,
    contact: '사운드탐정',
    likes: 11,
    dislikes: 0,
    views: 185,
    likedByMe: false,
    comments: [
      {
        id: 'c-2',
        author: '운영진',
        text: '제보 감사드립니다! 사운드 매니저 중복 방지 로직 적용 및 패치 완료되었습니다.',
        createdAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
      },
    ],
  },
  {
    id: 'seed-feat-01',
    category: 'FEATURE',
    title: '[개선제안] 모바일 브라우저 가로 화면 락 지원 요청',
    content: '모바일 스마트폰에서 접속할 때 배틀 화면은 무조건 가로 화면으로 자동 전환되거나 회전 안내 팝업이 뜨면 훨씬 쾌적할 것 같습니다.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
    appVersion: CURRENT_GAME_VERSION,
    contact: '폰유저A',
    likes: 19,
    dislikes: 2,
    views: 260,
    likedByMe: false,
    comments: [],
  },
  {
    id: 'seed-rule-01',
    category: 'RULE',
    title: '[질문] 방랑자 회멸 2레벨 판정 시 체인 타이밍 질문드립니다',
    content: '방랑자 회멸 2레벨 효과 발동 시 상대가 RED 방어 카드를 냈을 때, 연격 처리 우선순위가 어떻게 되는지 궁금합니다. 공식 룰북 기준으로 설명해주실 분 계신가요?',
    createdAt: new Date(Date.now() - 3600 * 1000 * 22).toISOString(),
    appVersion: CURRENT_GAME_VERSION,
    contact: '카드초보',
    likes: 7,
    dislikes: 0,
    views: 142,
    likedByMe: false,
    comments: [
      {
        id: 'c-3',
        author: '룰마스터',
        text: '공식 룰북 4조 2항에 따라 공격 선언 시점에 먼저 연격 판정이 완료된 후 방어자 액션 스텝으로 넘어갑니다!',
        createdAt: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
      },
    ],
  },
];

export function getFeedbackList(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_POSTS));
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
  if (!remotePosts) {
    return localPosts;
  }

  // 원격 게시글과 로컬 게시글을 ID 기준으로 병합
  const mergedMap = new Map<string, FeedbackItem>();
  for (const p of [...remotePosts, ...localPosts]) {
    if (!p || !p.id) continue;
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

export function addCommentToFeedback(id: string, author: string, text: string): CommentItem | null {
  if (!text.trim()) return null;
  const list = getFeedbackList();
  const newComment: CommentItem = {
    id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    author: author.trim() || '방랑자',
    text: text.trim(),
    createdAt: new Date().toISOString(),
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
