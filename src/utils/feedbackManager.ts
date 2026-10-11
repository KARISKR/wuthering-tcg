import { CURRENT_GAME_VERSION } from '../data/patchNotes';

export type FeedbackCategory = 'BUG' | 'RULE' | 'FEATURE' | 'GENERAL';

export interface FeedbackItem {
  id: string;
  category: FeedbackCategory;
  title: string;
  content: string;
  createdAt: string; // ISO string
  appVersion: string; // e.g. "v1.9.4"
  contextView?: string; // "LOBBY" | "BATTLE" | "DECK_BUILDER" | "REPLAY_STAGE"
  contact?: string; // 작성자 닉네임 또는 연락처 (선택)
}

const STORAGE_KEY = 'wuthering_tcg_feedbacks_v1';
const DRAFT_KEY = 'wuthering_tcg_feedback_draft_v1';

export const CATEGORY_INFO: Record<
  FeedbackCategory,
  { label: string; icon: string; color: string; badgeClass: string; desc: string }
> = {
  BUG: {
    label: '버그 / 오류 제보',
    icon: '🐛',
    color: '#ef4444',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    desc: '게임 멈춤, 연출 꼬임, 화면 이상 등 버그를 제보합니다.',
  },
  RULE: {
    label: '카드 룰 / 효과 오류',
    icon: '🃏',
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: '공식 텍스트와 다른 효과 발동이나 판정 수치 이상을 제보합니다.',
  },
  FEATURE: {
    label: '기능 및 개선 제안',
    icon: '💡',
    color: '#10b981',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: '신규 편의기능, UI/UX 개선안, 새로운 아이디어를 제안합니다.',
  },
  GENERAL: {
    label: '일반 피드백 / 메모',
    icon: '💬',
    color: '#6366f1',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    desc: '게임 밸런스 소감, 감상평, 자유로운 의견을 남깁니다.',
  },
};

export function getFeedbackList(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: FeedbackItem[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
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
    ...data,
  };
  const updated = [newItem, ...list];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[feedbackManager] Failed to persist feedback list:', err);
  }
  return newItem;
}

export function updateFeedback(id: string, updates: Partial<Omit<FeedbackItem, 'id' | 'createdAt'>>): void {
  const list = getFeedbackList();
  const updated = list.map((item) => (item.id === id ? { ...item, ...updates } : item));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[feedbackManager] Failed to update feedback:', err);
  }
}

export function deleteFeedback(id: string): void {
  const list = getFeedbackList();
  const filtered = list.filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('[feedbackManager] Failed to delete feedback:', err);
  }
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
    `[명조 TCG 피드백 제보]`,
    `■ 분류: ${cat.icon} ${cat.label}`,
    `■ 버전: ${item.appVersion}${item.contextView ? ` (상황: ${item.contextView})` : ''}`,
    `■ 일시: ${dateStr}`,
    item.contact ? `■ 작성자: ${item.contact}` : null,
    `■ 제목: ${item.title}`,
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
  a.download = `wuthering_tcg_feedback_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface FeedbackDraft {
  category: FeedbackCategory;
  title: string;
  content: string;
  contact?: string;
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
