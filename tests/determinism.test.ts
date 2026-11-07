/**
 * [WP6] 결정성 테스트: 같은 엔진 시드 + 같은 입력이면 게임이 끝까지 똑같이 진행되는지 검증.
 *
 * AI 대 AI 대전을 같은 시드로 두 번 돌려 최종 상태(로그 timestamp 제외)가 완전히 같아야 한다.
 * AI 자체의 판단 노이즈(aiPlayer의 Math.random)는 엔진 밖의 "입력"이므로, 이 테스트에서는
 * Math.random을 고정 시드로 바꿔 두 실행의 AI 판단을 같게 맞춘다.
 * 또, 시드가 다르면 덱 셔플이 달라져 게임 진행이 달라지는지도 확인한다(시드가 실제로 쓰이는지).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createInitialGameState,
  executeMulligan,
  executeDrawPhase,
  setClashCard,
  resolveClash,
  resolvePendingChoice,
  proceedAfterClashReveal,
  executeEndPhase,
  finalizeEndPhase,
} from '../src/engine/gameEngine';
import {
  decideAiMulligan,
  runAiActionPhase,
  selectAiClashCard,
  runAiComboStep,
  runAiDiscardOverflow,
  AiLevel,
} from '../src/engine/aiPlayer';
import type { GameState } from '../src/types/tcg';

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Preset = 'STARTER_ROVER' | 'STARTER_CHIXIA';

function playMatch(engineSeed: number, aiSeed: number, p0: Preset, p1: Preset): GameState {
  vi.spyOn(Math, 'random').mockImplementation(mulberry(aiSeed)); // AI 판단 노이즈 고정
  const levels: AiLevel[] = ['SMART', 'BASIC'];
  let state = createInitialGameState(p0, p1, 'SOLO_DUAL', null, null, undefined, undefined, engineSeed);
  state = executeMulligan(state, decideAiMulligan(state.players[0], levels[0]), decideAiMulligan(state.players[1], levels[1]));
  let steps = 0;
  while (state.phase !== 'GAME_OVER' && steps < 3000) {
    steps++;
    const active = state.activePlayerIndex;
    // 화면 연출(효과 드로우 오버레이)이 끝났을 때 useGame.handleFinishEffectDraw가 하는 일의 최소 버전
    if (state.lastEffectDraw) {
      const chained = state.lastEffectDraw.nextPendingChoice || null;
      const rest = [...(state.deferredEffectDraws || [])];
      const next = !chained && rest.length > 0 ? rest.shift()! : null;
      state = {
        ...state,
        lastEffectDraw: next,
        deferredEffectDraws: rest,
        deferredEffectDraw: rest[0] ?? null,
        pendingChoice: chained || state.pendingChoice,
      };
      if (!next && !state.pendingChoice && state.phase === 'START_PHASE') state = { ...state, phase: 'DRAW_PHASE' };
      continue;
    }
    if (state.pendingChoice) {
      const pc = state.pendingChoice;
      state = resolvePendingChoice(state, pc.revealedCards.slice(0, pc.maxSelect ?? 1).map((c) => c.id));
      continue;
    }
    switch (state.phase) {
      case 'DRAW_PHASE':
        state = { ...executeDrawPhase(state), phase: 'ACTION_PHASE' };
        break;
      case 'ACTION_PHASE':
        state = runAiActionPhase(state, active, levels[active]);
        break;
      case 'CLASH_SET': {
        const c0 = selectAiClashCard(state, 0, levels[0]);
        const c1 = selectAiClashCard(state, 1, levels[1]);
        state = setClashCard(state, 0, c0).newState;
        state = setClashCard(state, 1, c1).newState;
        state = resolveClash(state);
        break;
      }
      case 'CLASH_REVEAL':
        state = proceedAfterClashReveal(state);
        break;
      case 'COMBO_STEP': {
        const idx: 0 | 1 = state.players[0].comboUnlimited || state.players[0].comboCount > 0 ? 0 : 1;
        state = runAiComboStep(state, idx, levels[idx]);
        break;
      }
      case 'DISCARD_OVERFLOW':
        state = runAiDiscardOverflow(state, active, levels[active]);
        break;
      case 'END_PHASE': {
        const before = state;
        state = executeEndPhase(state);
        // GameBoard는 END_PHASE 배너 1초 뒤 finalizeEndPhase로 다음 턴 전환
        if (state.phase === 'END_PHASE' && !state.pendingChoice && !state.lastEffectDraw) state = finalizeEndPhase(state);
        if (state === before) steps = 3000;
        break;
      }
      case 'START_PHASE':
        state = { ...state, phase: 'DRAW_PHASE' };
        break;
      default:
        steps = 3000;
    }
  }
  vi.restoreAllMocks();
  return state;
}

/** 비교용 직렬화: 실제 시각(timestamp)만 제외 */
const fingerprint = (s: GameState) =>
  JSON.stringify(s, (k, v) => (k === 'timestamp' ? undefined : v));

const GAMES = Number(process.env.DETERMINISM_GAMES ?? 200);

describe('engine determinism (seeded RNG)', () => {
  afterEach(() => vi.restoreAllMocks());

  it(`same seed → identical game, ${GAMES} AI matches`, () => {
    const decks: [Preset, Preset][] = [
      ['STARTER_ROVER', 'STARTER_CHIXIA'],
      ['STARTER_CHIXIA', 'STARTER_ROVER'],
    ];
    let mismatches = 0;
    let finished = 0;
    let totalTurns = 0;
    for (let g = 0; g < GAMES; g++) {
      const [p0, p1] = decks[g % 2];
      const a = playMatch(1000 + g, 5000 + g, p0, p1);
      const b = playMatch(1000 + g, 5000 + g, p0, p1);
      if (fingerprint(a) !== fingerprint(b)) mismatches++;
      if (a.phase === 'GAME_OVER') finished++;
      totalTurns += a.turn;
    }
    // 결정성: 시드가 같으면 어디서 끝나든 최종 상태가 완전히 같아야 함
    expect(mismatches).toBe(0);
    // 의미 있는 길이까지 진행됐는지 (헤드리스 진행 보조 로직이 UI 훅에 있어 일부 판은 중간에 멈출 수 있음)
    console.info(`determinism: ${GAMES} games, finished ${finished}, avg turns ${(totalTurns / GAMES).toFixed(1)}`);
    expect(totalTurns / GAMES).toBeGreaterThan(3);
  }, 600_000);

  it('different seed → different shuffle', () => {
    const a = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', null, null, undefined, undefined, 1);
    const b = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', null, null, undefined, undefined, 2);
    const order = (s: GameState) => s.players[0].actionDeck.map((c) => c.code).join(',');
    expect(a.rngSeed).toBe(1);
    expect(order(a)).not.toBe(order(b));
  });
});
