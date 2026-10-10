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
function generateInitialSharedDecks(): SharedDeck[] {
  const defaultPresets = getDefaultPresets();
  const sd01Preset = defaultPresets[0];
  const sd02Preset = defaultPresets[1];

  // 1. 치샤 속공 덱 구성
  const chixiaActions = ACTION_CARD_TEMPLATES.filter(
    (c) => c.color === 'RED' || c.effectType === 'EXTRA_DAMAGE' || c.speed !== undefined
  ).slice(0, 14);
  const chixiaActionCounts: { code: string; count: number }[] = [];
  let chixiaTotal = 0;
  for (const c of chixiaActions) {
    const qty = chixiaTotal + 3 <= 40 ? 3 : 40 - chixiaTotal;
    if (qty > 0) {
      chixiaActionCounts.push({ code: c.code, count: qty });
      chixiaTotal += qty;
    }
    if (chixiaTotal >= 40) break;
  }
  const chixiaPreset: DeckPreset = {
    id: 'shared-preset-chixia-rush',
    name: '🔥 치샤 폭렬 속공 연격 덱',
    createdAt: '2026-03-20',
    leaderCode: 'BP01-027', // 치샤
    leftSupportCode: 'BP01-024', // 양양
    rightSupportCode: 'BP01-018', // 방랑자(여)
    actionCards: chixiaActionCounts,
    description: '치샤의 고속 RED 카드로 1턴부터 상대 가드를 부수고 폭풍 연격을 꽂아넣는 극공형 어그로 덱입니다.',
  };

  // 2. 산화 빙결 결계 컨트롤 덱
  const sanhuaActions = ACTION_CARD_TEMPLATES.filter(
    (c) => c.color === 'BLUE' || c.effectType === 'GUARD' || c.effectType === 'DRAW'
  ).slice(0, 14);
  const sanhuaActionCounts: { code: string; count: number }[] = [];
  let sanhuaTotal = 0;
  for (const c of sanhuaActions) {
    const qty = sanhuaTotal + 3 <= 40 ? 3 : 40 - sanhuaTotal;
    if (qty > 0) {
      sanhuaActionCounts.push({ code: c.code, count: qty });
      sanhuaTotal += qty;
    }
    if (sanhuaTotal >= 40) break;
  }
  const sanhuaPreset: DeckPreset = {
    id: 'shared-preset-sanhua-control',
    name: '❄️ 산화 빙결 결계 컨트롤 덱',
    createdAt: '2026-03-22',
    leaderCode: 'BP01-033', // 산화
    leftSupportCode: 'BP01-021', // 방랑자(남)
    rightSupportCode: 'BP01-030', // 파수인
    actionCards: sanhuaActionCounts,
    description: 'BLUE 방어 카드의 결계와 반격 데미지로 상대의 공격을 무력화하고 후반을 도모하는 방어형 컨트롤 덱.',
  };

  // 3. 금희 회절 승천 덱
  const jinhsiActions = ACTION_CARD_TEMPLATES.slice(5, 19);
  const jinhsiActionCounts: { code: string; count: number }[] = [];
  let jinhsiTotal = 0;
  for (const c of jinhsiActions) {
    const qty = jinhsiTotal + 3 <= 40 ? 3 : 40 - jinhsiTotal;
    if (qty > 0) {
      jinhsiActionCounts.push({ code: c.code, count: qty });
      jinhsiTotal += qty;
    }
    if (jinhsiTotal >= 40) break;
  }
  const jinhsiPreset: DeckPreset = {
    id: 'shared-preset-jinhsi-burst',
    name: '✨ 금희 승천 회절 콤보 덱',
    createdAt: '2026-03-25',
    leaderCode: 'BP01-030', // 금희
    leftSupportCode: 'BP01-033', // 산화
    rightSupportCode: 'BP01-024', // 양양
    actionCards: jinhsiActionCounts,
    description: '협주 게이지를 빠르게 축적하여 금희의 용의 비늘 고위력 연격을 몰아치는 회절 콤보 덱입니다.',
  };

  return [
    {
      id: 'shared-deck-1',
      deckName: '🔥 치샤 폭렬 속공 연격 덱',
      authorName: '용융마스터',
      isAnonymous: false,
      description: '초반 속도전에서 무조건 우위를 점할 수 있는 레드 카드 위주 구성입니다. 2~3턴 킬 각이 잘 나옵니다!',
      deckCode: encodeDeckCode(presetToCustomDeck(chixiaPreset)),
      deckPreset: chixiaPreset,
      likes: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 14, // 14시간 전
      tags: ['속공', '용융', '공격형', '치샤', '추천'],
    },
    {
      id: 'shared-deck-2',
      deckName: '❄️ 산화 빙결 결계 컨트롤',
      authorName: '익명의 방랑자',
      isAnonymous: true,
      description: '상대가 공격해올 때 BLUE 가드로 데미지를 상쇄하고 지속 반격으로 말려 죽이는 덱입니다. 익명으로 올립니다 ㅎㅎ',
      deckCode: encodeDeckCode(presetToCustomDeck(sanhuaPreset)),
      deckPreset: sanhuaPreset,
      likes: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 36, // 36시간 전
      tags: ['컨트롤', '응결', '방어', '산화', '익명'],
    },
    {
      id: 'shared-deck-3',
      deckName: '✨ 금희 승천 회절 콤보 덱',
      authorName: '금주의수호자',
      isAnonymous: false,
      description: '양양과 산화의 협주 시너지로 3레벨 금희 승천 후 폭발적인 피니시를 노립니다. 토너먼트 3연승 달성 레시피!',
      deckCode: encodeDeckCode(presetToCustomDeck(jinhsiPreset)),
      deckPreset: jinhsiPreset,
      likes: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 4, // 4시간 전
      tags: ['콤보', '회절', '금희', '대회입상', '추천'],
    },
    {
      id: 'shared-deck-4',
      deckName: '🗡️ 방랑자(여) 기류 연격 정석 덱',
      authorName: '솔라리스탐험가',
      isAnonymous: false,
      description: 'SD01 스타터를 기반으로 밸런스를 개선한 덱. 방랑자(여)의 기류 패 보충 능력으로 패 마름 없이 안정적인 운영이 가능합니다.',
      deckCode: encodeDeckCode(presetToCustomDeck(sd01Preset)),
      deckPreset: sd01Preset,
      likes: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 48,
      tags: ['입문추천', '기류', '밸런스', '방랑자(여)'],
    },
    {
      id: 'shared-deck-5',
      deckName: '🛡️ 방랑자(남) 빙결 철벽 방어 덱',
      authorName: '익명의 방랑자',
      isAnonymous: true,
      description: 'SD02 기반으로 방어 카드와 회복 카드를 꽉 채운 지구전 덱입니다. 봇 대전 상대로 승률 90% 이상 보장합니다.',
      deckCode: encodeDeckCode(presetToCustomDeck(sd02Preset)),
      deckPreset: sd02Preset,
      likes: 0,
      createdAt: Date.now() - 1000 * 60 * 60 * 72,
      tags: ['입문추천', '응결', '철벽', '방랑자(남)', '익명'],
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
      console.error('공유 덱 파싱 실패, 초기 덱으로 복원:', e);
      decks = generateInitialSharedDecks();
      localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(decks));
    }
  }

  // likedByMe 플래그 갱신 및 기존에 캐싱된 가짜 추천수(128, 210 등) 실제 추천수로 교정
  const SEED_DECK_IDS = new Set(['shared-deck-1', 'shared-deck-2', 'shared-deck-3', 'shared-deck-4', 'shared-deck-5']);
  let needsSync = false;

  const normalized = decks.map((d) => {
    const isLiked = likedIds.has(d.id);
    let realLikes = d.likes;

    // 시드 덱에 기존 가짜 추천수가 남아있다면 실제 추천수(0 또는 1)로 강제 정정
    if (SEED_DECK_IDS.has(d.id) && d.likes > 1) {
      realLikes = isLiked ? 1 : 0;
      needsSync = true;
    }

    return {
      ...d,
      likes: realLikes,
      likedByMe: isLiked,
    };
  });

  if (needsSync) {
    localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
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
