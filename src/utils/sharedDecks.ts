import { SharedDeck, CustomDeckConfig, DeckPreset } from '../types/tcg';
import {
  encodeDeckCode,
  customDeckToPreset,
  presetToCustomDeck,
  savePreset,
  getDefaultPresets,
} from './deckCode';
import { ACTION_CARD_TEMPLATES, DEDUPED_LV0_CHARACTERS } from '../data/cards';

const SHARED_DECKS_STORAGE_KEY = 'wuthering_shared_decks';
const LIKED_DECKS_STORAGE_KEY = 'wuthering_liked_shared_decks';

// 기본 추천 커뮤니티 덱 시드 데이터 생성
// 초기 기본 공유 덱 (임의 생성 덱 없이 빈 목록으로 시작)
function generateInitialSharedDecks(): SharedDeck[] {
  return [];
}

// 내가 좋아요 누른 덱 ID 목록 가져오기
export function getLikedDeckIds(): string[] {
  try {
    const raw = localStorage.getItem(LIKED_DECKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// 공유된 덱 목록 가져오기
export function getSharedDecks(): SharedDeck[] {
  const likedIds = new Set(getLikedDeckIds());
  const raw = localStorage.getItem(SHARED_DECKS_STORAGE_KEY);

  let decks: SharedDeck[] = [];
  if (!raw) {
    decks = [];
    localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(decks));
  } else {
    try {
      decks = JSON.parse(raw);
    } catch (e) {
      console.error('공유 덱 파싱 실패:', e);
      decks = [];
      localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(decks));
    }
  }

  // 임의 생성되었던 가상 덱(shared-deck-1 ~ 5 등) 완벽 제거 및 정화
  const PURGE_IDS = new Set([
    'shared-deck-1',
    'shared-deck-2',
    'shared-deck-3',
    'shared-deck-4',
    'shared-deck-5',
    'shared-preset-chixia-rush',
    'shared-preset-sanhua-control',
    'shared-preset-jinhsi-burst',
  ]);

  const cleanedDecks = decks.filter((d) => !PURGE_IDS.has(d.id));
  if (cleanedDecks.length !== decks.length) {
    localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(cleanedDecks));
  }

  // likedByMe 플래그 갱신
  return cleanedDecks.map((d) => ({
    ...d,
    likedByMe: likedIds.has(d.id),
  }));
}

// 새 덱 공유 등록하기
export interface ShareDeckParams {
  deckName: string;
  authorName: string;
  isAnonymous: boolean;
  description: string;
  deckConfig?: CustomDeckConfig;
  preset?: DeckPreset;
  tags?: string[];
}

export function shareNewDeck(params: ShareDeckParams): SharedDeck {
  const currentDecks = getSharedDecks();

  let targetPreset: DeckPreset;
  let targetCode: string;

  if (params.deckConfig) {
    targetPreset = customDeckToPreset(params.deckConfig);
    targetCode = encodeDeckCode(params.deckConfig);
  } else if (params.preset) {
    targetPreset = params.preset;
    const config = presetToCustomDeck(params.preset);
    targetCode = encodeDeckCode(config);
  } else {
    throw new Error('공유할 덱 정보가 없습니다.');
  }

  const finalAuthor = params.isAnonymous
    ? '익명의 방랑자'
    : params.authorName.trim() || '방랑자';

  const newSharedDeck: SharedDeck = {
    id: `shared-deck-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    deckName: params.deckName.trim() || targetPreset.name,
    authorName: finalAuthor,
    isAnonymous: !!params.isAnonymous,
    description: params.description.trim() || '공유된 커뮤니티 덱입니다.',
    deckCode: targetCode,
    deckPreset: {
      ...targetPreset,
      name: params.deckName.trim() || targetPreset.name,
      description: params.description.trim() || targetPreset.description,
    },
    likes: 0, // 실제 추천수 0부터 시작
    likedByMe: false,
    createdAt: Date.now(),
    tags: params.tags && params.tags.length > 0 ? params.tags : ['커뮤니티', '유저공유'],
  };

  const updated = [newSharedDeck, ...currentDecks];
  localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(updated));

  return newSharedDeck;
}

// 좋아요 토글
export function toggleLikeSharedDeck(id: string): { likes: number; liked: boolean } {
  const decks = getSharedDecks();
  const likedIds = getLikedDeckIds();
  const alreadyLiked = likedIds.includes(id);

  let newLikedState = !alreadyLiked;
  let newLikes = 0;

  const updatedDecks = decks.map((d) => {
    if (d.id === id) {
      newLikes = newLikedState ? d.likes + 1 : Math.max(0, d.likes - 1);
      return {
        ...d,
        likes: newLikes,
        likedByMe: newLikedState,
      };
    }
    return d;
  });

  localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(updatedDecks));

  const updatedLikedIds = newLikedState
    ? [...likedIds, id]
    : likedIds.filter((likedId) => likedId !== id);
  localStorage.setItem(LIKED_DECKS_STORAGE_KEY, JSON.stringify(updatedLikedIds));

  return { likes: newLikes, liked: newLikedState };
}

// 공유된 덱을 내 로컬 프리셋으로 가져오기(복사)
export function importSharedDeckToPreset(sharedDeck: SharedDeck): DeckPreset {
  const newPreset: DeckPreset = {
    ...sharedDeck.deckPreset,
    id: `preset-imported-${Date.now()}`,
    name: `[공유] ${sharedDeck.deckName}`,
    isOfficial: false,
    createdAt: new Date().toISOString().split('T')[0],
    description: `공유자: ${sharedDeck.authorName} | ${sharedDeck.description}`,
  };

  savePreset(newPreset);
  return newPreset;
}

// 공유된 덱 삭제 (내가 등록한 덱 또는 관리용)
export function deleteSharedDeck(id: string): void {
  const decks = getSharedDecks();
  const filtered = decks.filter((d) => d.id !== id);
  localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(filtered));
}
