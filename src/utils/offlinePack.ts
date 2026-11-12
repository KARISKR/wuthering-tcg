/**
 * 앱 전체 데이터 미리 받기 (2026-11-13).
 * 카드 그림(256·512px 축소본), 효과음·캐릭터 보이스, 공격 이펙트를 서비스 워커가 쓰는 정적 캐시에 한 번에 넣는다.
 * 서비스 워커(public/sw.js)는 이 캐시를 먼저 보므로, 받은 뒤에는 도감·전투에서 다시 내려받지 않는다.
 * 배경음악은 크고(약 59MB) 늦게 나와도 되므로 넣지 않는다.
 */
import { OFFICIAL_CARDS } from '../data/officialCards';
import { lodUrl, lodWidths } from '../components/CardArt';
import { listAllSfxRequestUrls } from './soundEffects';
import { FX_VERSION } from '../components/attackMotions/SpriteEffect';

/** public/sw.js의 STATIC_CACHE와 같은 이름이어야 한다 */
const STATIC_CACHE = 'wtcg-static-v2';
const DONE_KEY = 'wuthering_offline_pack_v1';
const CARD_WIDTHS = [256, 512];
const CONCURRENCY = 6;

/** 받을 용량(MB). 파일 크기를 매번 물어보지 않으려고 미리 적어 둔 값 — tests/offline-pack.test.ts가 실제 파일 합계와 1MB 안으로 맞는지 확인한다 */
export const OFFLINE_PACK_SIZE_MB = { cards: 24.5, sfx: 16.7, fx: 5.1 };
export const OFFLINE_PACK_TOTAL_MB = OFFLINE_PACK_SIZE_MB.cards + OFFLINE_PACK_SIZE_MB.sfx + OFFLINE_PACK_SIZE_MB.fx;

/** 카드 그림 주소 (CardArt가 실제로 요청하는 주소와 같게 인코딩) */
export function listCardUrls(): string[] {
  const urls = new Set<string>(['/cards/card_back_action.webp', '/cards/card_back_character.webp']);
  for (const card of OFFICIAL_CARDS) {
    if (!card.artUrl) continue;
    const widths = lodWidths(card.artUrl).filter((w) => CARD_WIDTHS.includes(w));
    if (widths.length === 0) urls.add(encodeURI(card.artUrl));
    for (const w of widths) urls.add(encodeURI(lodUrl(card.artUrl, w)));
  }
  return [...urls];
}

async function listFxUrls(): Promise<string[]> {
  try {
    const resp = await fetch(`/effects/attack/attack_fx_manifest.json?v=${FX_VERSION}`);
    if (!resp.ok) return [];
    const manifest = (await resp.json()) as Record<string, { tiers?: Record<string, { file?: string }> }>;
    const urls: string[] = [];
    for (const entry of Object.values(manifest)) {
      for (const tier of Object.values(entry.tiers || {})) {
        if (!tier.file) continue;
        const base = tier.file.replace(/\.webp$/, '');
        urls.push(`/effects/attack/${base}.webp?v=${FX_VERSION}`, `/effects/attack/${base}.json?v=${FX_VERSION}`);
      }
    }
    return urls;
  } catch {
    return [];
  }
}

export function isOfflinePackDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

export interface OfflinePackProgress {
  done: number;
  total: number;
  failed: number;
  bytes: number;
}

/**
 * 전부 받아 캐시에 넣는다. 이미 캐시에 있는 파일은 건너뛴다.
 * 저장 공간 부족 등으로 캐시에 넣지 못하면 그 오류를 던진다 (일부 네트워크 실패는 failed로 세고 계속).
 */
export async function downloadOfflinePack(
  onProgress: (p: OfflinePackProgress) => void,
  { signal, concurrency = CONCURRENCY, askPersist = true }: { signal?: AbortSignal; concurrency?: number; askPersist?: boolean } = {}
): Promise<OfflinePackProgress> {
  if (typeof caches === 'undefined') throw new Error('이 브라우저는 앱 저장소(Cache Storage)를 지원하지 않습니다.');
  // 저장 공간이 부족할 때 브라우저가 지우지 않도록 요청 (거절돼도 계속). 파이어폭스는 확인 창을 띄우므로 직접 누를 때만
  if (askPersist) await navigator.storage?.persist?.().catch(() => false);

  const cache = await caches.open(STATIC_CACHE);
  const urls = [...listCardUrls(), ...listAllSfxRequestUrls(), ...(await listFxUrls())];
  const progress: OfflinePackProgress = { done: 0, total: urls.length, failed: 0, bytes: 0 };
  onProgress({ ...progress });

  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      if (signal?.aborted) return;
      const url = urls[next++];
      try {
        if (!(await cache.match(url))) {
          const resp = await fetch(url, { signal });
          const type = resp.headers.get('content-type') || '';
          if (!resp.ok || type.includes('text/html')) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          progress.bytes += blob.size;
          // 캐시 저장 실패(용량 부족)는 계속해도 소용없으므로 그대로 던진다
          await cache.put(url, new Response(blob, { status: 200, headers: resp.headers }));
        }
      } catch (err) {
        if (signal?.aborted) return;
        if (err instanceof DOMException && err.name === 'QuotaExceededError') throw err;
        progress.failed++;
      }
      progress.done++;
      onProgress({ ...progress });
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));

  if (!signal?.aborted && progress.failed === 0) {
    try {
      localStorage.setItem(DONE_KEY, '1');
    } catch {
      // 표시만 못 남길 뿐 데이터는 받았다
    }
  }
  return progress;
}

let autoController: AbortController | null = null;

/**
 * 로비에 있는 동안 배경에서 조금씩(동시 2개) 받는다. 이미 받은 파일은 건너뛰므로 끊겨도 다음에 이어서 받는다.
 * 데이터 절약 모드이거나 브라우저가 모바일 데이터라고 알려 주면 받지 않는다 (아이폰 등 알 수 없는 경우는 받음).
 */
export function startAutoOfflinePack(): void {
  if (autoController || isOfflinePackDone() || typeof caches === 'undefined') return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; type?: string } }).connection;
  if (conn?.saveData || conn?.type === 'cellular') return;
  const controller = new AbortController();
  autoController = controller;
  downloadOfflinePack(() => {}, { signal: controller.signal, concurrency: 2, askPersist: false })
    .catch(() => {}) // 용량 부족 등은 조용히 멈춘다. 「데이터 받기」 창에서 직접 받으면 원인을 보여 준다
    .finally(() => {
      if (autoController === controller) autoController = null;
    });
}

/** 전투로 들어갈 때·직접 받기를 누를 때 자동 받기를 멈춘다 */
export function stopAutoOfflinePack(): void {
  autoController?.abort();
  autoController = null;
}
