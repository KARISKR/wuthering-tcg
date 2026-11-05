/**
 * 카드 이미지 초고속 프리로더 (Card Image Preloader)
 * - 배틀 시작 시 덱 및 슬롯 내 모든 카드를 백그라운드에서 브라우저 메모리에 선행 캐시
 * - 리플레이 재생 시 타임라인 상의 모든 카드 선행 캐시
 * - 대기실/로비 유휴 시간(Idle)에 주요 공식 카드 순차적 프리로드
 */
import { GameState, ActionCard, CharacterCard } from '../types/tcg';
import { BattleReplayData } from './replayManager';

const preloadedUrls = new Set<string>();
const inFlightUrls = new Set<string>();

/** 단일 이미지 프리로드 */
export function preloadImage(
  url: string | undefined,
  priority: 'high' | 'low' | 'auto' = 'auto'
): Promise<boolean> {
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
    (img as any).fetchPriority = priority;
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
export function preloadImages(
  urls: (string | undefined)[],
  priority: 'high' | 'low' | 'auto' = 'auto'
): Promise<boolean[]> {
  const validUrls = Array.from(new Set(urls.filter((u): u is string => Boolean(u) && !preloadedUrls.has(u!))));
  return Promise.all(validUrls.map((url) => preloadImage(url, priority)));
}

function getLodUrl(url: string | undefined, width = 512): string | undefined {
  if (!url || !url.includes('/cards/card_images/')) return url;
  const dot = url.lastIndexOf('.');
  const base = dot > -1 ? url.slice(0, dot) : url;
  return base.replace('/cards/card_images/', `/cards/card_images_lod/${width}/`) + '.webp';
}

/** 배틀 매치 시작 시 핵심 카드 우선 프리로드 (화면 표시 캐릭터/손패/카드뒷면, 512px LOD 1종만 캐싱) */
export function preloadBattleCards(state: GameState) {
  if (!state || !state.players) return;

  const targetUrls: string[] = [
    '/cards/card_back_action.webp',
    '/cards/card_back_character.webp',
  ];

  state.players.forEach((p) => {
    if (!p) return;
    // 1. 현재 화면에 즉시 노출되는 필드 캐릭터 슬롯 및 상속 카드
    if (p.slots) {
      Object.values(p.slots).forEach((c: CharacterCard | null) => {
        if (c?.artUrl) {
          const lod = getLodUrl(c.artUrl, 512) || c.artUrl;
          targetUrls.push(lod);
        }
        c?.underlyingCards?.forEach((u: CharacterCard) => {
          if (u?.artUrl) {
            const lod = getLodUrl(u.artUrl, 512) || u.artUrl;
            targetUrls.push(lod);
          }
        });
      });
    }
    // 2. 현재 손패 (첫 턴 멀리건 및 초반 플레이 즉각 표시)
    p.hand?.forEach((c: ActionCard) => {
      if (c?.artUrl) {
        const lod = getLodUrl(c.artUrl, 512) || c.artUrl;
        targetUrls.push(lod);
      }
    });
  });

  // 중복 제거 후 병렬 프리로드 (LOD 단일 요청만 수행)
  preloadImages(targetUrls);
}

/** 리플레이 시작 시 타임라인 상의 모든 카드 프리로드 */
export async function preloadReplayCards(replay: BattleReplayData) {
  if (!replay) return;

  const urls: string[] = [
    '/cards/card_back_action.webp',
    '/cards/card_back_character.webp',
    replay.p0Leader?.artUrl,
    replay.p1Leader?.artUrl,
  ].filter(Boolean) as string[];

  try {
    const { buildReplayTimeline } = await import('./replayTimelineBuilder');
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

/**
 * 로비 유휴 시간 전체 카드 프리로드는 비활성화됨:
 * 초기 로비 진입 시 192장의 카드 이미지(6.25MB) 및 OFFICIAL_CARDS 청크(105KB)의 불필요한 백그라운드 다운로드를 방지.
 * 카드도감/덱편집기/배틀 진입 시 화면에 필요한 카드를 가상화/지연 로딩 방식으로 직접 로드함.
 */
export function startIdleCardPreload() {
  // no-op: 불필요한 로비 백그라운드 프리로드 완전 차단
}

