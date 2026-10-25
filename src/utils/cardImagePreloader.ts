/**
 * 카드 이미지 초고속 프리로더 (Card Image Preloader)
 * - 배틀 시작 시 덱 및 슬롯 내 모든 카드를 백그라운드에서 브라우저 메모리에 선행 캐시
 * - 리플레이 재생 시 타임라인 상의 모든 카드 선행 캐시
 * - 대기실/로비 유휴 시간(Idle)에 주요 공식 카드 순차적 프리로드
 */
import { GameState, ActionCard, CharacterCard } from '../types/tcg';
import { BattleReplayData } from './replayManager';
import { buildReplayTimeline } from './replayTimelineBuilder';
import { OFFICIAL_CARDS } from '../data/officialCards';

const preloadedUrls = new Set<string>();
const inFlightUrls = new Set<string>();

/** 단일 이미지 프리로드 */
export function preloadImage(url: string | undefined): Promise<boolean> {
  if (!url || typeof url !== 'string' || preloadedUrls.has(url)) {
    return Promise.resolve(true);
  }
  if (inFlightUrls.has(url)) {
    return Promise.resolve(false);
  }

  inFlightUrls.add(url);

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      preloadedUrls.add(url);
      inFlightUrls.delete(url);
      resolve(true);
    };
    img.onerror = () => {
      inFlightUrls.delete(url);
      resolve(false);
    };
    img.src = url;
  });
}

/** 여러 이미지 병렬 프리로드 */
export function preloadImages(urls: (string | undefined)[]): Promise<boolean[]> {
  const validUrls = Array.from(new Set(urls.filter((u): u is string => Boolean(u) && !preloadedUrls.has(u!))));
  return Promise.all(validUrls.map((url) => preloadImage(url)));
}

/** 배틀 매치 시작 시 양측 덱/슬롯/진화 카드 전수 프리로드 */
export function preloadBattleCards(state: GameState) {
  if (!state || !state.players) return;

  const urls: string[] = [
    '/cards/card_back_action.png',
    '/cards/card_back_character.png',
  ];

  state.players.forEach((p) => {
    if (!p) return;
    // 1. 패 카드
    p.hand?.forEach((c: ActionCard) => c?.artUrl && urls.push(c.artUrl));
    // 2. 덱 카드
    p.actionDeck?.forEach((c: ActionCard) => c?.artUrl && urls.push(c.artUrl));
    // 3. 필드 캐릭터 슬롯 및 상속 카드
    if (p.slots) {
      Object.values(p.slots).forEach((c: CharacterCard | null) => {
        if (c?.artUrl) urls.push(c.artUrl);
        c?.underlyingCards?.forEach((u: CharacterCard) => u?.artUrl && urls.push(u.artUrl));
      });
    }
    // 4. 캐릭터 덱 (진화용 카드)
    p.characterDeck?.forEach((c: CharacterCard) => c?.artUrl && urls.push(c.artUrl));
    // 5. 협주 존 및 버린 카드 존
    p.concertoZone?.forEach((c: ActionCard) => c?.artUrl && urls.push(c.artUrl));
    p.dropZone?.forEach((c) => (c as any)?.artUrl && urls.push((c as any).artUrl));
  });

  preloadImages(urls);
}

/** 리플레이 시작 시 타임라인 상의 모든 카드 프리로드 */
export function preloadReplayCards(replay: BattleReplayData) {
  if (!replay) return;

  const urls: string[] = [
    '/cards/card_back_action.png',
    '/cards/card_back_character.png',
    replay.p0Leader?.artUrl,
    replay.p1Leader?.artUrl,
  ].filter(Boolean) as string[];

  try {
    const timeline = buildReplayTimeline(replay);
    timeline.forEach((snap) => {
      if (snap.p0?.leader?.artUrl) urls.push(snap.p0.leader.artUrl);
      if (snap.p0?.leftSupport?.artUrl) urls.push(snap.p0.leftSupport.artUrl);
      if (snap.p0?.rightSupport?.artUrl) urls.push(snap.p0.rightSupport.artUrl);
      if (snap.p1?.leader?.artUrl) urls.push(snap.p1.leader.artUrl);
      if (snap.p1?.leftSupport?.artUrl) urls.push(snap.p1.leftSupport.artUrl);
      if (snap.p1?.rightSupport?.artUrl) urls.push(snap.p1.rightSupport.artUrl);

      if (snap.actionCard?.artUrl) urls.push(snap.actionCard.artUrl);
      if (snap.p0ActionCard?.artUrl) urls.push(snap.p0ActionCard.artUrl);
      if (snap.p1ActionCard?.artUrl) urls.push(snap.p1ActionCard.artUrl);
      snap.p0ActionCards?.forEach((c) => c?.artUrl && urls.push(c.artUrl));
      snap.p1ActionCards?.forEach((c) => c?.artUrl && urls.push(c.artUrl));

      if (snap.clash?.p0CardArt) urls.push(snap.clash.p0CardArt);
      if (snap.clash?.p1CardArt) urls.push(snap.clash.p1CardArt);
    });
  } catch {}

  preloadImages(urls);
}

/** 로비 유휴 시간에 주요 공식 카드 점진적 백그라운드 프리로드 */
let idlePreloadTimer: any = null;
export function startIdleCardPreload() {
  if (idlePreloadTimer) return;

  const cardsToPreload = OFFICIAL_CARDS.map((c) => c.artUrl).filter(Boolean);
  let batchIndex = 0;
  const BATCH_SIZE = 8; // 한 번에 8장씩 대역폭 부하 없이 백그라운드 로드

  const loadNextBatch = () => {
    if (batchIndex >= cardsToPreload.length) return;
    const batch = cardsToPreload.slice(batchIndex, batchIndex + BATCH_SIZE);
    batchIndex += BATCH_SIZE;

    preloadImages(batch);

    if (batchIndex < cardsToPreload.length) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(loadNextBatch, { timeout: 2000 });
      } else {
        idlePreloadTimer = setTimeout(loadNextBatch, 1500);
      }
    }
  };

  // 초기 렌더링 완료 1.2초 후 점진적 프리로드 시작
  idlePreloadTimer = setTimeout(loadNextBatch, 1200);
}
