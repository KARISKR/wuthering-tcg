import { SharedDeck, CustomDeckConfig, DeckPreset } from '../types/tcg';
import {
  encodeDeckCode,
  customDeckToPreset,
  presetToCustomDeck,
  savePreset,
  getDefaultPresets,
  COMMUNITY_DECK_PRESETS,
} from './deckCode';
import { ACTION_CARD_TEMPLATES, DEDUPED_LV0_CHARACTERS } from '../data/cards';

const SHARED_DECKS_STORAGE_KEY = 'wuthering_shared_decks';
const LIKED_DECKS_STORAGE_KEY = 'wuthering_liked_shared_decks';

// 기본 추천 커뮤니티 덱 시드 데이터 생성 (mc.sldark.com 실전 공유 덱 4종)
function generateInitialSharedDecks(): SharedDeck[] {
  return [
    {
      id: 'shared-deck-sld-rin',
      deckName: '🔥 RIN (카멜리아 · 앙코 · 양양)',
      authorName: 'RIN',
      isAnonymous: false,
      description:
        'mc.sldark.com 커뮤니티 공유 덱 [코드: SLD-TLL2EZT6] - 카멜리아 소멸 연격과 앙코 용융 속공, 양양 기류 서포트 콤보 덱',
      deckCode: 'SLD-TLL2EZT6',
      deckPreset: COMMUNITY_DECK_PRESETS[0],
      likes: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 12,
      tags: ['카멜리아', '앙코', '양양', '용융', '소멸', '기류', '속공', 'sldark'],
    },
    {
      id: 'shared-deck-sld-nv-yang-chun',
      deckName: '🌸 女秧椿 (카멜리아 · 여랑자 · 양양)',
      authorName: 'sldark 유저',
      isAnonymous: false,
      description:
        'mc.sldark.com 커뮤니티 공유 덱 [코드: SLD-7LKN8P9G] - 방랑자(여)와 양양의 기류 순환으로 카멜리아의 소멸 연격을 몰아치는 연계 덱',
      deckCode: 'SLD-7LKN8P9G',
      deckPreset: COMMUNITY_DECK_PRESETS[1],
      likes: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
      tags: ['카멜리아', '방랑자(여)', '양양', '소멸', '기류', '회절', '콤보', 'sldark'],
    },
    {
      id: 'shared-deck-sld-anke-loop',
      deckName: '🐑 安克loop (앙코 · 양양 · 산화)',
      authorName: 'sldark 유저',
      isAnonymous: false,
      description:
        'mc.sldark.com 커뮤니티 공유 덱 [코드: SLD-DVQMKQPG] - 앙코 대폭주 화력과 산화 응결 방어, 양양 서포트로 매 턴 회피 및 연격을 이어가는 루프 덱',
      deckCode: 'SLD-DVQMKQPG',
      deckPreset: COMMUNITY_DECK_PRESETS[2],
      likes: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 36,
      tags: ['앙코', '양양', '산화', '용융', '응결', '기류', '콤보', 'sldark'],
    },
    {
      id: 'shared-deck-sld-an-san-shou',
      deckName: '🌌 安散守 (파수인 · 앙코 · 양양)',
      authorName: 'sldark 유저',
      isAnonymous: false,
      description:
        'mc.sldark.com 커뮤니티 공유 덱 [코드: SLD-DV56VXTG] - 파수인의 회절 드로우 및 결말 순환과 앙코 용융 화력을 조합한 안정적인 컨트롤 제어 덱',
      deckCode: 'SLD-DV56VXTG',
      deckPreset: COMMUNITY_DECK_PRESETS[3],
      likes: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 48,
      tags: ['파수인', '앙코', '양양', '회절', '용융', '기류', '컨트롤', 'sldark'],
    },
  ];
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
    decks = generateInitialSharedDecks();
    localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(decks));
  } else {
    try {
      decks = JSON.parse(raw);
    } catch (e) {
      console.error('공유 덱 파싱 실패:', e);
      decks = generateInitialSharedDecks();
      localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(decks));
    }
  }

  // 임의 생성되었던 구버전 가상 덱(shared-deck-1 ~ 5 등) 완벽 제거 및 정화
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

  let cleanedDecks = decks.filter((d) => !PURGE_IDS.has(d.id));

  // 신규 4종 커뮤니티 실전 덱 시드 보장 (기존 유저 생성 덱 유지하며 누락된 시드 덱 자동 보충)
  const initialDecks = generateInitialSharedDecks();
  const existingIds = new Set(cleanedDecks.map((d) => d.id));
  const missingInitials = initialDecks.filter((d) => !existingIds.has(d.id));
  if (missingInitials.length > 0) {
    cleanedDecks = [...missingInitials, ...cleanedDecks];
    localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(cleanedDecks));
  } else if (cleanedDecks.length !== decks.length) {
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
