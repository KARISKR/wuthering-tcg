import { SharedDeck, CustomDeckConfig, DeckPreset } from '../types/tcg';
import {
  encodeDeckCode,
  customDeckToPreset,
  presetToCustomDeck,
  savePreset,
} from './deckCode';
import { INITIAL_COMMUNITY_SHARED_DECKS } from '../data/communityDecks';

const SHARED_DECKS_STORAGE_KEY = 'wuthering_shared_decks';
const LIKED_DECKS_STORAGE_KEY = 'wuthering_liked_shared_decks';


// 기본 추천 커뮤니티 덱 시드 데이터 생성 (mc.sldark.com 실전 공유 덱 4종)
function generateInitialSharedDecks(): SharedDeck[] {
  return [...INITIAL_COMMUNITY_SHARED_DECKS];
}

// 구버전 더미 데이터 필터링 및 정화
function sanitizeDecks(decks: SharedDeck[]): SharedDeck[] {
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

  const ALLOWED_INITIAL_IDS = new Set([
    'shared-deck-sld-rin',
    'shared-deck-sld-nv-yang-chun',
    'shared-deck-sld-anke-loop',
    'shared-deck-sld-an-san-shou',
  ]);

  let cleanedDecks = decks.filter(
    (d) =>
      d &&
      d.id &&
      !PURGE_IDS.has(d.id) &&
      !d.id.startsWith('shared-deck-preset-sld-') &&
      (!d.id.startsWith('shared-deck-sld-') || ALLOWED_INITIAL_IDS.has(d.id))
  );

  const initialDecks = generateInitialSharedDecks();
  const existingIds = new Set(cleanedDecks.map((d) => d.id));
  const missingInitials = initialDecks.filter((d) => !existingIds.has(d.id));
  if (missingInitials.length > 0) {
    cleanedDecks = [...cleanedDecks, ...missingInitials];
  }

  // ID 중복 제거 (최신 항목 우선)
  const seen = new Set<string>();
  return cleanedDecks.filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
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

// 로컬 스토리지 기준 공유된 덱 목록 가져오기 (즉시 렌더링용)
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

  const cleanedDecks = sanitizeDecks(decks);
  if (cleanedDecks.length !== decks.length) {
    localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(cleanedDecks));
  }

  return cleanedDecks.map((d) => ({
    ...d,
    likedByMe: likedIds.has(d.id),
  }));
}

// 클라우드 서버에서 전체 플레이어 공유 덱 실시간 조회 및 로컬 병합
export async function fetchGlobalSharedDecks(): Promise<SharedDeck[]> {
  let remoteDecks: SharedDeck[] | null = null;

  // 1순위: Cloudflare Pages Function (/api/community?type=decks)
  try {
    const res = await fetch(`/api/community?type=decks&t=${Date.now()}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.decks)) {
        remoteDecks = data.decks;
      }
    }
  } catch {}

  const localDecks = getSharedDecks();
  if (!remoteDecks) {
    return localDecks;
  }

  // 서버 목록이 기준 (좋아요 수 포함). 서버에 아직 반영되지 않았을 수 있는 내 새 덱(2분 이내)만 덧붙인다
  const remoteIds = new Set(remoteDecks.map((d) => d.id));
  const pendingSince = Date.now() - 120_000;
  const pendingLocal = localDecks.filter((d) => d && d.id && !remoteIds.has(d.id) && (d.createdAt || 0) > pendingSince);
  const mergedMap = new Map<string, SharedDeck>();
  for (const d of [...remoteDecks, ...pendingLocal]) if (d && d.id) mergedMap.set(d.id, d);

  const merged = sanitizeDecks(Array.from(mergedMap.values()));
  localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(merged));

  const likedIds = new Set(getLikedDeckIds());
  return merged.map((d) => ({
    ...d,
    likedByMe: likedIds.has(d.id),
  }));
}

// 공유 덱 1건 요청 (등록 upsertDeck / 좋아요 likeDeck). 목록 전체를 보내지 않는다
async function postDeckAction(body: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/community?type=decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn('[sharedDecks] 서버 반영 실패:', err);
  }
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
    likes: 0,
    likedByMe: false,
    createdAt: Date.now(),
    tags: params.tags && params.tags.length > 0 ? params.tags : ['커뮤니티', '유저공유'],
  };

  const updated = [newSharedDeck, ...currentDecks];
  localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(updated));

  // 서버에는 이 덱 1건만 올린다
  const { likedByMe: _liked, ...deckForServer } = newSharedDeck;
  void postDeckAction({ action: 'upsertDeck', deck: deckForServer });

  return newSharedDeck;
}

// 좋아요 토글
export function toggleLikeSharedDeck(id: string): { likes: number; liked: boolean } {
  const decks = getSharedDecks();
  const likedIds = getLikedDeckIds();
  const alreadyLiked = likedIds.includes(id);

  const newLikedState = !alreadyLiked;
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

  // 서버에는 +1/-1만 보낸다 (내 화면의 오래된 숫자로 덮어쓰지 않게)
  void postDeckAction({ action: 'likeDeck', id, delta: newLikedState ? 1 : -1 });

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
