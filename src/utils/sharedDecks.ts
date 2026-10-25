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

const DECKS_POINTER_ID = 'ff808181a09d98f701a173ca3379092e';
const DECKS_POINTER_NAME = 'wuthering-tcg-shared-decks-v2';

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

  // 2순위 폴백: 직접 클라우드 스토어 조회 (로컬 개발 환경 등)
  if (!remoteDecks) {
    try {
      const ptrRes = await fetch(`https://api.restful-api.dev/objects/${DECKS_POINTER_ID}`);
      if (ptrRes.ok) {
        const ptrJson = await ptrRes.json();
        const blobKey = ptrJson?.data?.key;
        if (blobKey) {
          const blobRes = await fetch(`https://bytebin.lucko.me/${blobKey}`);
          if (blobRes.ok) {
            const blobData = await blobRes.json();
            if (Array.isArray(blobData?.decks)) {
              remoteDecks = blobData.decks;
            }
          }
        }
      }
    } catch {}
  }

  const localDecks = getSharedDecks();
  if (!remoteDecks) {
    return localDecks;
  }

  // 원격 덱과 로컬 덱을 ID 기준으로 병합 (좋아요 수 최댓값 반영, 신규 등록 덱 보존)
  const mergedMap = new Map<string, SharedDeck>();
  for (const d of [...remoteDecks, ...localDecks]) {
    if (!d || !d.id) continue;
    const existing = mergedMap.get(d.id);
    if (!existing) {
      mergedMap.set(d.id, d);
    } else {
      mergedMap.set(d.id, {
        ...existing,
        likes: Math.max(existing.likes || 0, d.likes || 0),
      });
    }
  }

  const merged = sanitizeDecks(Array.from(mergedMap.values()));
  localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(merged));

  const likedIds = new Set(getLikedDeckIds());
  return merged.map((d) => ({
    ...d,
    likedByMe: likedIds.has(d.id),
  }));
}

// 클라우드 서버에 공유 덱 리스트 저장 (비동기 백그라운드 동기화)
export async function syncSharedDecksToCloud(decksToSync?: SharedDeck[]): Promise<void> {
  try {
    // 최신 원격 데이터와 먼저 병합하여 다른 유저가 올린 덱이 덮어써지지 않도록 보장
    const mergedDecks = decksToSync ? sanitizeDecks(decksToSync) : await fetchGlobalSharedDecks();
    const payload = JSON.stringify({
      decks: mergedDecks.map(({ likedByMe, ...rest }) => rest),
      updatedAt: Date.now(),
    });

    // 1순위: Cloudflare Pages Function
    let savedViaApi = false;
    try {
      const res = await fetch('/api/community?type=decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (res.ok) savedViaApi = true;
    } catch {}

    // 2순위 폴백: 직접 클라우드 스토어에 기록
    if (!savedViaApi) {
      const blobRes = await fetch('https://bytebin.lucko.me/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (blobRes.ok) {
        const { key } = await blobRes.json();
        if (key) {
          await fetch(`https://api.restful-api.dev/objects/${DECKS_POINTER_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: DECKS_POINTER_NAME,
              data: { key, updatedAt: Date.now() },
            }),
          });
        }
      }
    }
  } catch (err) {
    console.warn('[sharedDecks] 클라우드 동기화 실패:', err);
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

  // 글로벌 클라우드에 비동기 병합 및 업로드
  fetchGlobalSharedDecks().then((latestDecks) => {
    const exists = latestDecks.some((d) => d.id === newSharedDeck.id);
    const finalDecks = exists ? latestDecks : [newSharedDeck, ...latestDecks];
    localStorage.setItem(SHARED_DECKS_STORAGE_KEY, JSON.stringify(finalDecks));
    syncSharedDecksToCloud(finalDecks);
  });

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

  // 글로벌 클라우드 동기화
  syncSharedDecksToCloud(updatedDecks);

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
  syncSharedDecksToCloud(filtered);
}
