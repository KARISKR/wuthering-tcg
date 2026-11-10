// 전투 레이아웃 모드 판정 테스트 (설계서 2-1절, 3단계)
import { describe, it, expect } from 'vitest';
import { decideBattleLayoutMode, readForcedLayout, PHONE_LANDSCAPE_MAX_HEIGHT, type BattleLayoutMode } from '../src/battle/layoutMode';

type Row = [label: string, width: number, height: number, coarsePointer: boolean, expected: BattleLayoutMode];

// CSS px 기준 대표 기종 (가로/세로는 화면 방향 그대로)
const DEVICES: Row[] = [
  // 가로 폰 → phone-landscape
  ['iPhone SE 가로', 667, 375, true, 'phone-landscape'],
  ['소형 Android 가로', 740, 360, true, 'phone-landscape'],
  ['iPhone 14 가로', 844, 390, true, 'phone-landscape'],
  ['Galaxy S20 Ultra 가로', 915, 412, true, 'phone-landscape'],
  ['iPhone 14 Pro Max 가로', 932, 430, true, 'phone-landscape'],
  ['Galaxy Z Fold 접힘 가로', 882, 344, true, 'phone-landscape'],
  // 세로 터치 기기 → portrait-blocked
  ['iPhone SE 세로', 375, 667, true, 'portrait-blocked'],
  ['iPhone 14 세로', 390, 844, true, 'portrait-blocked'],
  ['iPad Air 세로', 820, 1180, true, 'portrait-blocked'],
  ['iPad mini 세로', 744, 1133, true, 'portrait-blocked'],
  // 태블릿 가로 → standard
  ['iPad mini 가로', 1133, 744, true, 'standard'],
  ['iPad Air 가로', 1180, 820, true, 'standard'],
  ['Galaxy Tab S8 가로', 1280, 800, true, 'standard'],
  // 마우스 PC → 창 모양과 무관하게 standard
  ['PC FHD', 1920, 1080, false, 'standard'],
  ['PC HD', 1280, 720, false, 'standard'],
  ['작은 PC 창', 900, 700, false, 'standard'],
  ['세로로 긴 PC 창', 700, 1000, false, 'standard'],
  ['낮고 넓은 PC 창', 1200, 400, false, 'standard'],
];

describe('decideBattleLayoutMode — 대표 기종', () => {
  it.each(DEVICES)('%s (%ix%i, coarse=%s) → %s', (_label, width, height, coarsePointer, expected) => {
    expect(decideBattleLayoutMode({ width, height, coarsePointer })).toBe(expected);
  });

  it('세 모드가 모두 표에 등장한다 (빈 표로 가짜 통과 방지)', () => {
    const modes = new Set(DEVICES.map((d) => d[4]));
    expect(modes).toEqual(new Set(['phone-landscape', 'portrait-blocked', 'standard']));
    expect(DEVICES.length).toBeGreaterThanOrEqual(10);
  });
});

describe('decideBattleLayoutMode — 경계값', () => {
  const H = PHONE_LANDSCAPE_MAX_HEIGHT;

  it('높이 상한은 500', () => {
    expect(H).toBe(500);
  });

  it('터치 가로에서 높이 499는 phone-landscape, 500은 standard', () => {
    expect(decideBattleLayoutMode({ width: 1000, height: H - 1, coarsePointer: true })).toBe('phone-landscape');
    expect(decideBattleLayoutMode({ width: 1000, height: H, coarsePointer: true })).toBe('standard');
  });

  it('정사각형 화면은 세로로 보지 않는다 (height > width 일 때만 차단)', () => {
    expect(decideBattleLayoutMode({ width: 600, height: 600, coarsePointer: true })).not.toBe('portrait-blocked');
    expect(decideBattleLayoutMode({ width: 600, height: 601, coarsePointer: true })).toBe('portrait-blocked');
  });

  it('?layout=phone 강제는 입력 방식·방향보다 우선한다', () => {
    expect(decideBattleLayoutMode({ width: 1920, height: 1080, coarsePointer: false, forced: 'phone-landscape' })).toBe('phone-landscape');
    expect(decideBattleLayoutMode({ width: 390, height: 844, coarsePointer: true, forced: 'phone-landscape' })).toBe('phone-landscape');
    expect(decideBattleLayoutMode({ width: 390, height: 844, coarsePointer: true, forced: null })).toBe('portrait-blocked');
  });
});

describe('readForcedLayout', () => {
  it.each([
    ['?layout=phone', 'phone-landscape'],
    ['?foo=1&layout=phone', 'phone-landscape'],
    ['', null],
    ['?layout=tablet', null],
    ['?layout=PHONE', null],
  ] as const)('%s → %s', (search, expected) => {
    expect(readForcedLayout(search)).toBe(expected);
  });
});
