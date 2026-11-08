/**
 * [WP5] 공격 이펙트 스프라이트 재생기.
 * public/effects/attack/<캐릭터키>_t<단계>.webp + .json (attack-fx 생성기 결과물)을 canvas로 재생한다.
 * - 단계: 격돌 대미지 1~2 → t1, 3~4 → t2, 5+ → t3 / 연격 1·2·3단계 이상 → t1·t2·t3
 * - 프레임 안의 대상(맞는 카드) 중심은 (276, 176) / 384. 공격 방향은 왼쪽 → 오른쪽이므로 오른쪽 승자는 flip.
 * - 로드 실패 시 onError → 호출부가 기존 검기 연출로 대체.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { loadAttackFxConfig, type AttackFxGlobalConfig } from './attackFxConfig';

export type SheetMeta = {
  frameWidth: number;
  frameHeight: number;
  frames: number;
  columns: number;
  fps: number;
  impactFrame: number;
};

/** 스프라이트를 다시 뽑아 같은 파일명으로 교체할 때마다 올린다 (1년 캐시·서비스 워커 무효화) */
export const FX_VERSION = '3';
const BASE = '/effects/attack/';
/** 스프라이트 프레임 안에서 대상 카드 중심 위치 (생성기 common.py의 IMPACT) */
export const FX_IMPACT = { x: 276 / 384, y: 176 / 384 };

const cache = new Map<string, Promise<{ img: HTMLImageElement; meta: SheetMeta }>>();
const resolvedMeta = new Map<string, SheetMeta>();

export const tierForDamage = (d: number) => (d >= 5 ? 3 : d >= 3 ? 2 : d >= 1 ? 1 : 0);
export const tierForCombo = (n = 1) => Math.min(3, Math.max(1, n));

export function loadSheet(name: string, priority: 'high' | 'low' = 'high') {
  let p = cache.get(name);
  if (!p) {
    p = (async () => {
      const resp = await fetch(`${BASE}${name}.json?v=${FX_VERSION}`, { priority } as RequestInit & { priority?: string });
      if (!resp.ok) throw new Error(`sprite meta ${resp.status}`);
      const meta: SheetMeta = await resp.json();
      const img = new Image();
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = priority;
      img.src = `${BASE}${name}.webp?v=${FX_VERSION}`;
      await img.decode();
      resolvedMeta.set(name, meta);
      return { img, meta };
    })();
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p;
}

/** 이미 로드가 끝난 스프라이트의 메타 정보 (없으면 undefined) — 타이머 계산용 */
export function peekSheetMeta(name: string): SheetMeta | undefined {
  return resolvedMeta.get(name);
}

/**
 * 전투 진입 시 미리 받기 (실패해도 무시).
 * 전투 직후의 효과음·카드 이미지와 대역폭을 다투지 않도록 3초 뒤부터 낮은 우선순위로 한 파일씩 받는다.
 * 첫 격돌 결과(약 3.4초 + 카드 제출 시간)까지는 보통 충분하고, 늦으면 격돌 화면이 직접 high로 요청한다.
 */
export function preloadAttackFx(characterKeys: (string | null | undefined)[]) {
  const keys = Array.from(new Set(characterKeys.filter((k): k is string => Boolean(k))));
  const names = keys.flatMap((k) => [1, 2, 3].map((t) => `${k}_t${t}`)).filter((n) => !cache.has(n));
  if (names.length === 0) return;
  window.setTimeout(async () => {
    for (const n of names) {
      if (cache.has(n)) continue;
      await loadSheet(n, 'low').catch(() => {});
    }
  }, 3000);
}

export function SpriteEffect(props: {
  name: string;
  size: number;
  flip?: boolean;
  onImpact?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}) {
  const { name, size, flip = false } = props;
  const ref = useRef<HTMLCanvasElement>(null);
  const cb = useRef(props);
  cb.current = props;

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    loadSheet(name)
      .then(({ img, meta }) => {
        const cv = ref.current;
        if (cancelled || !cv) return;
        cv.width = cv.height = Math.round(size * dpr);
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        const t0 = performance.now();
        let impacted = false;
        const tick = (now: number) => {
          const f = Math.floor(((now - t0) / 1000) * meta.fps);
          ctx.clearRect(0, 0, cv.width, cv.height);
          if (f >= meta.frames) {
            cb.current.onEnd?.();
            return;
          }
          if (!impacted && f >= meta.impactFrame) {
            impacted = true;
            cb.current.onImpact?.();
          }
          const sx = (f % meta.columns) * meta.frameWidth;
          const sy = Math.floor(f / meta.columns) * meta.frameHeight;
          ctx.drawImage(img, sx, sy, meta.frameWidth, meta.frameHeight, 0, 0, cv.width, cv.height);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!cancelled) cb.current.onError?.();
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [name, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, transform: flip ? 'scaleX(-1)' : undefined, pointerEvents: 'none' }}
    />
  );
}

/**
 * 맞는 카드 컨테이너(relative) 안에 놓으면, 스프라이트의 대상 중심이 컨테이너 중심에 오도록 배치한다.
 * 실패하면 fallback(기존 검기)을 그린다.
 */
export function AttackFx(props: {
  characterKey: string | null;
  tier: number;
  attackerOnRight: boolean;
  size?: number;
  fallback: ReactNode;
  failed: boolean;
  onFail: () => void;
  scene?: 'clash' | 'combo';
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  customConfig?: AttackFxGlobalConfig;
}) {
  const {
    characterKey,
    tier,
    attackerOnRight,
    fallback,
    failed,
    onFail,
    scene,
    customConfig,
  } = props;

  const [activeConfig, setActiveConfig] = useState<AttackFxGlobalConfig>(() => customConfig || loadAttackFxConfig());

  useEffect(() => {
    if (customConfig) {
      setActiveConfig(customConfig);
      return;
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AttackFxGlobalConfig>).detail;
      if (detail) setActiveConfig(detail);
    };
    window.addEventListener('wuthering_attack_fx_config_changed', handler);
    return () => window.removeEventListener('wuthering_attack_fx_config_changed', handler);
  }, [customConfig]);

  if (!characterKey || tier <= 0 || failed) return <>{fallback}</>;

  const sceneConfig = scene ? activeConfig[scene] : undefined;
  const baseSize = props.size ?? sceneConfig?.size ?? (scene === 'combo' ? 420 : 360);
  const scale = props.scale ?? sceneConfig?.scale ?? 1.0;
  const size = Math.round(baseSize * scale);

  const impactX = activeConfig.impactX ?? FX_IMPACT.x;
  const impactY = activeConfig.impactY ?? FX_IMPACT.y;

  const baseOffsetX = props.offsetX ?? sceneConfig?.offsetX ?? 0;
  const baseOffsetY = props.offsetY ?? sceneConfig?.offsetY ?? 0;
  const directionalOffsetX = attackerOnRight ? -baseOffsetX : baseOffsetX;

  const ix = attackerOnRight ? 1 - impactX : impactX;

  return (
    <div
      className="absolute pointer-events-none z-30"
      style={{
        left: `calc(50% - ${size * ix}px + ${directionalOffsetX}px)`,
        top: `calc(50% - ${size * impactY}px + ${baseOffsetY}px)`,
        width: size,
        height: size,
      }}
    >
      <SpriteEffect name={`${characterKey}_t${tier}`} size={size} flip={attackerOnRight} onError={onFail} />
    </div>
  );
}
