import { GameState } from '../types/tcg';
import { GameAction, GameEvent } from './events';
import { createInitialGameState } from './gameEngine';
import { step } from './step';
import type { ReplayV2 } from '../utils/replayManager';

/** cyrb53 문자열 해시 (53비트). 보안용이 아니라 같은 상태인지 빠르게 비교하는 용도 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function hashText(text: string): string {
  return `fp1-${cyrb53(text, 1).toString(36)}-${cyrb53(text, 2).toString(36)}-${text.length.toString(36)}`;
}

/**
 * 상태 지문(fingerprint): timestamp를 뺀 상태 JSON의 짧은 해시 (약 30자).
 * [WP8 버그 수정 2026-11-07] 이전에는 상태 JSON 전체(한 판 약 0.4~0.5MB)를 그대로 지문으로 써서
 * 리플레이 1개가 약 0.9MB가 되었고, 브라우저 저장 공간(5MB)이 5판쯤에서 차서 새 리플레이가 저장되지 않았다.
 */
export function stateFingerprint(state: GameState): string {
  return hashText(JSON.stringify(state, (k, v) => (k === 'timestamp' ? undefined : v)));
}

/** 지문 비교. 해시 도입 전 형식(상태 JSON 전체)으로 저장된 지문도 비교할 수 있게 한다 */
export function fingerprintMatches(state: GameState, fingerprint: string | undefined): boolean {
  if (!fingerprint) return false;
  const current = stateFingerprint(state);
  if (fingerprint.startsWith('fp1-')) return current === fingerprint;
  return current === hashText(fingerprint);
}

/**
 * ReplayV2 데이터를 처음부터 끝까지 일괄 재생하여 최종 GameState를 반환합니다.
 *
 * [주의]: 엔진 난수(rng.ts)는 모듈 전역 상태를 공유합니다.
 * 본 함수는 진행 중인 실전 게임이 없을 때만 호출해야 합니다 (게임 종료 후 검증, 리플레이 화면 등).
 * 실전 대전 도중에 본 함수를 호출하면 실전 난수 시퀀스가 덮어써집니다.
 */
export function replayToEnd(v2: ReplayV2): GameState {
  const { start, actions } = v2;
  let state = createInitialGameState(
    start.p0PresetKey,
    start.p1PresetKey,
    start.gameMode,
    start.p0Deck,
    start.p1Deck,
    start.p0Name,
    start.p1Name,
    start.seed
  );

  for (const action of actions) {
    state = step(state, action).state;
  }

  return state;
}

export interface ReplayFrame {
  action: GameAction;
  state: GameState;
  events: GameEvent[];
}

/**
 * ReplayV2 데이터를 재생하면서 액션마다의 상태 및 방출된 이벤트 프레임을 생성합니다.
 * (단계 F 리플레이 뷰어 연동용)
 *
 * [주의]: 진행 중인 실전 게임이 없을 때만 실행해야 합니다.
 */
export function replayFrames(v2: ReplayV2): ReplayFrame[] {
  const { start, actions } = v2;
  let state = createInitialGameState(
    start.p0PresetKey,
    start.p1PresetKey,
    start.gameMode,
    start.p0Deck,
    start.p1Deck,
    start.p0Name,
    start.p1Name,
    start.seed
  );

  const frames: ReplayFrame[] = [];

  for (const action of actions) {
    const res = step(state, action);
    state = res.state;
    frames.push({
      action,
      state: res.state,
      events: res.events,
    });
  }

  return frames;
}
