/**
 * [WP6] 엔진 전용 시드 난수 + 결정적 ID 시계.
 *
 * - engineRandom(): 게임 결과에 영향을 주는 난수(덱 셔플, 상대 손패 무작위 선택)에만 사용.
 * - engineTick() / engineTag(): 카드·로그·선택지 id에 쓰던 Date.now()·Math.random() 대체.
 *   난수 시퀀스를 소비하지 않으므로, id를 몇 개 만들든 게임 결과 난수는 바뀌지 않는다.
 * - createInitialGameState(..., seed)가 매 게임 시작 시 seedEngineRng(seed)를 호출한다.
 *   같은 시드 + 같은 엔진 호출 순서 → 항상 같은 결과 (tests/determinism.test.ts).
 * - 로그의 timestamp 필드는 표시·정렬용이라 실제 시간을 쓴다. 엔진에서 실제 시간을 읽는 곳은 logTimestamp() 하나뿐이다.
 * - 엔진(src/engine)에서 Math.random / Date.now / performance.now 를 직접 쓰면 lint 오류가 난다(.oxlintrc.json). 예외는 이 파일뿐.
 */

let state = 0x9e3779b9;
let aiState = 0x85ebca6b;
let tick = 0;
let currentSeed = 0;

/** 로그 표시·정렬용 실제 시각. 게임 결과·id에 쓰면 안 된다 (결정성 비교 시 timestamp 키는 제외) */
export function logTimestamp(): number {
  return Date.now();
}

/** 새 게임용 무작위 시드 (32bit) */
export function newEngineSeed(): number {
  return (Math.floor(Math.random() * 0x100000000) >>> 0) || 1;
}

/** 엔진 난수 상태를 시드로 초기화 */
export function seedEngineRng(seed: number) {
  currentSeed = seed >>> 0;
  state = currentSeed || 1;
  aiState = ((currentSeed ^ 0x85ebca6b) >>> 0) || 1;
  tick = 0;
}

export function getEngineSeed(): number {
  return currentSeed;
}

/** mulberry32: 0 이상 1 미만 균등 난수 */
export function engineRandom(): number {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** AI 판단 노이즈 전용 시드 난수 (덱 셔플/카드 효과 난수 시퀀스를 소비하지 않음) */
export function aiRandom(): number {
  aiState = (aiState + 0x6d2b79f5) >>> 0;
  let t = aiState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** id용 단조 증가 값 (이전: Date.now()) */
export function engineTick(): number {
  tick += 1;
  return tick;
}

/** id 충돌 방지용 짧은 태그 (이전: Math.random().toString(36).substring(...)). 난수 시퀀스를 쓰지 않음 */
export function engineTag(): string {
  const h = Math.imul(tick + 0x9e37, 0x85ebca6b) ^ Math.imul(currentSeed, 0xc2b2ae35);
  return ((h >>> 0) % 1679616).toString(36).padStart(4, '0');
}
