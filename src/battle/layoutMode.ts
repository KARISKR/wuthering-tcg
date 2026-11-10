// src/battle/layoutMode.ts
// 전투 화면 레이아웃 모드 판정 (설계서: _docs/모바일_전투UI_반응형_설계서_2026-11-11.md 2-1절)
//
// 화면 크기와 입력 방식만 보고 결정하는 순수 함수. 브라우저 API는 호출부(useBattleViewport)에서 읽어 넘긴다.
//   - portrait-blocked : 터치 기기 세로 → 가로 전환 안내(MobileOrientationGuard)가 화면을 덮는다
//   - phone-landscape  : 터치 기기 가로 + 높이 500 미만 → 가로 폰 전용 3열 배치 (4단계부터 사용)
//   - standard         : 그 외 (PC, 태블릿 가로, 작은 PC 창) → 기존 레이아웃

export type BattleLayoutMode = 'portrait-blocked' | 'phone-landscape' | 'standard';

export interface BattleLayoutInput {
  width: number;
  height: number;
  /** matchMedia('(pointer: coarse)') — 주 입력이 손가락인 기기 */
  coarsePointer: boolean;
  /** 개발·측정용 강제 지정 (?layout=phone) */
  forced?: 'phone-landscape' | null;
}

/** 가로 폰 판정 높이 상한. 가로 폰 실측 360~430, 태블릿 가로 최소 ≈744 (iPad mini). */
export const PHONE_LANDSCAPE_MAX_HEIGHT = 500;

export function decideBattleLayoutMode({ width, height, coarsePointer, forced }: BattleLayoutInput): BattleLayoutMode {
  if (forced === 'phone-landscape') return 'phone-landscape';
  if (coarsePointer && height > width) return 'portrait-blocked';
  if (coarsePointer && height < PHONE_LANDSCAPE_MAX_HEIGHT) return 'phone-landscape';
  return 'standard';
}

/** URL 검색어에서 강제 모드를 읽는다. `?layout=phone` 만 인정한다. */
export function readForcedLayout(search: string): 'phone-landscape' | null {
  const value = new URLSearchParams(search).get('layout');
  return value === 'phone' ? 'phone-landscape' : null;
}
