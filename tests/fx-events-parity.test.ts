/**
 * [WP8 버그 수정 2026-11-07] 연출 이벤트 회귀 테스트
 *
 * WP8 단계 E에서 연출 필드를 지운 뒤 다음 버그가 있었다.
 *   1) 효과 발동 알림(EFFECT_TRIGGERED)이 0건 — 최신 로그가 배열 앞에 쌓이는데 뒤를 읽음
 *   2) 레벨업(UPGRADE)을 "칸 레벨 상승"으로 추정 — 리더 교체를 레벨업으로 표시, 실제 리더 교체 연출은 누락
 * 지금은 엔진이 fxSink로 직접 신호를 내보낸다.
 *
 * 아래 기대값은 연출 필드를 지우기 전 엔진(2026-11-07 full_v2)으로 같은 시드·같은 진행을 돌려 얻은 개수다.
 * 예전 화면이 알림·레벨업을 보여 준 뒤 CLEAR_LAST_EFFECT_EVENT / CLEAR_LAST_UPGRADE를 보내던 것까지 똑같이 흉내 낸다
 * (지금 엔진에서는 아무 일도 하지 않는 액션).
 * 60판 전체 비교(종류·턴·액션·플레이어·카드·칸·레벨·설명 단위)에서 5종 모두 차이 0건이었고, 여기서는 그중 12판을 고정한다.
 */
import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../src/engine/gameEngine';
import { step } from '../src/engine/step';
import { selectAiClashCard, decideAiMulligan } from '../src/engine/aiPlayer';
import type { GameAction, GameEvent, GameEventType } from '../src/engine/events';
import type { GameState } from '../src/types/tcg';

type Counts = Partial<Record<GameEventType, number>>;
const WATCH: GameEventType[] = ['UPGRADE', 'LEADER_SWITCH', 'EFFECT_TRIGGERED', 'COMBO_STRIKE', 'HEAL'];

// 연출 필드 삭제 전 엔진의 결과 (seed, p0 프리셋이 치샤인지, 기대 개수)
const EXPECTED: [number, boolean, Counts][] = [
  [500, true, { UPGRADE: 4, LEADER_SWITCH: 13, EFFECT_TRIGGERED: 10, COMBO_STRIKE: 4 }],
  [513, false, { UPGRADE: 4, EFFECT_TRIGGERED: 11, COMBO_STRIKE: 7, LEADER_SWITCH: 11 }],
  [526, true, { UPGRADE: 6, EFFECT_TRIGGERED: 16, LEADER_SWITCH: 19, COMBO_STRIKE: 10 }],
  [539, false, { UPGRADE: 3, EFFECT_TRIGGERED: 5, LEADER_SWITCH: 7, COMBO_STRIKE: 4 }],
  [552, true, { UPGRADE: 5, LEADER_SWITCH: 14, EFFECT_TRIGGERED: 17, COMBO_STRIKE: 8 }],
  [565, false, { UPGRADE: 3, LEADER_SWITCH: 10, EFFECT_TRIGGERED: 11, COMBO_STRIKE: 6, HEAL: 1 }],
  [578, true, { UPGRADE: 4, EFFECT_TRIGGERED: 15, COMBO_STRIKE: 8, LEADER_SWITCH: 12 }],
  [591, false, { UPGRADE: 3, LEADER_SWITCH: 12, EFFECT_TRIGGERED: 13, COMBO_STRIKE: 8, HEAL: 1 }],
  [604, true, { LEADER_SWITCH: 16, EFFECT_TRIGGERED: 14, UPGRADE: 4, COMBO_STRIKE: 5 }],
  [617, false, { UPGRADE: 6, LEADER_SWITCH: 11, EFFECT_TRIGGERED: 18, COMBO_STRIKE: 9 }],
  [630, true, { LEADER_SWITCH: 12, EFFECT_TRIGGERED: 11, COMBO_STRIKE: 6, UPGRADE: 1, HEAL: 1 }],
  [643, false, { UPGRADE: 3, LEADER_SWITCH: 12, EFFECT_TRIGGERED: 14, COMBO_STRIKE: 8 }],
];

/** AI 대 AI 한 판을 진행하며 (액션, 이벤트) 기록. 예전 화면의 CLEAR_* 동작을 흉내 낸다 */
function playMatch(seed: number, chixiaFirst: boolean) {
  let state: GameState = createInitialGameState(
    chixiaFirst ? 'STARTER_CHIXIA' : 'STARTER_ROVER',
    chixiaFirst ? 'STARTER_ROVER' : 'STARTER_CHIXIA',
    'AI',
    null,
    null,
    undefined,
    undefined,
    seed
  );
  const log: { action: GameAction; event: GameEvent; before: GameState; after: GameState }[] = [];
  const doStep = (action: GameAction) => {
    const before = state;
    const r = step(state, action);
    state = r.state;
    for (const event of r.events) log.push({ action, event, before, after: state });
    if (r.events.some((e) => e.type === 'EFFECT_TRIGGERED')) state = step(state, { type: 'CLEAR_LAST_EFFECT_EVENT' }).state;
    if (r.events.some((e) => e.type === 'UPGRADE')) state = step(state, { type: 'CLEAR_LAST_UPGRADE' }).state;
  };

  if (state.phase === 'LEADER_SELECT') {
    doStep({
      type: 'SELECT_STARTING_LEADER',
      p0LeaderIdOrName: state.players[0].slots.leader?.id || state.players[0].characterDeck[0]?.id,
      p1LeaderIdOrName: state.players[1].slots.leader?.id || state.players[1].characterDeck[0]?.id,
    } as GameAction);
  }
  doStep({
    type: 'MULLIGAN',
    p0DiscardIds: decideAiMulligan(state.players[0]),
    p1DiscardIds: decideAiMulligan(state.players[1]),
  });

  let loop = 0;
  while (state.phase !== 'GAME_OVER' && loop++ < 2500) {
    if (state.lastEffectDraw) {
      doStep({ type: 'FINISH_EFFECT_DRAW' });
      continue;
    }
    if (state.pendingChoice) {
      const c = state.pendingChoice;
      doStep({
        type: 'RESOLVE_PENDING_CHOICE',
        chosenCardIds: (c.revealedCards || []).slice(0, c.maxSelect ?? 1).map((x) => x.id),
      });
      continue;
    }
    const a = state.activePlayerIndex;
    switch (state.phase) {
      case 'START_PHASE':
      case 'DRAW_PHASE':
        doStep({ type: 'DRAW_CARDS', playerIndex: a });
        break;
      case 'ACTION_PHASE':
        doStep({ type: 'AI_ACTION_PHASE', playerIndex: a });
        if (state.phase === 'ACTION_PHASE') doStep({ type: 'DECIDE_CLASH', startClash: true });
        break;
      case 'CLASH_SET':
        doStep({ type: 'SET_CLASH_CARD', playerIndex: 0, cardId: selectAiClashCard(state, 0) });
        doStep({ type: 'SET_CLASH_CARD', playerIndex: 1, cardId: selectAiClashCard(state, 1) });
        doStep({ type: 'RESOLVE_CLASH' });
        break;
      case 'CLASH_REVEAL':
        doStep({ type: 'PROCEED_AFTER_CLASH' });
        break;
      case 'COMBO_STEP': {
        const ci: 0 | 1 = state.players[0].comboUnlimited || state.players[0].comboCount > 0 ? 0 : 1;
        doStep({ type: 'AI_COMBO_STEP', playerIndex: ci });
        if (state.phase === 'COMBO_STEP') doStep({ type: 'FINISH_COMBO', playerIndex: ci });
        break;
      }
      case 'DISCARD_OVERFLOW':
        doStep({ type: 'AI_DISCARD_OVERFLOW', playerIndex: state.players[0].hand.length > 8 ? 0 : 1 });
        break;
      case 'END_PHASE':
        doStep({ type: 'FINALIZE_END_PHASE' });
        break;
    }
  }
  return { state, log };
}

describe('[WP8 버그 수정] 연출 이벤트 회귀', () => {
  it('UPGRADE / LEADER_SWITCH / EFFECT_TRIGGERED / COMBO_STRIKE / HEAL counts match the pre-removal engine (12 seeds)', () => {
    const mismatches: string[] = [];
    for (const [seed, chixiaFirst, expected] of EXPECTED) {
      const { state, log } = playMatch(seed, chixiaFirst);
      expect(state.phase).toBe('GAME_OVER');
      const got: Counts = {};
      for (const { event } of log) if (WATCH.includes(event.type)) got[event.type] = (got[event.type] || 0) + 1;
      for (const t of WATCH) {
        if ((got[t] || 0) !== (expected[t] || 0)) mismatches.push(`seed ${seed} ${t}: got ${got[t] || 0}, expected ${expected[t] || 0}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('every UPGRADE event is a card newly placed at that level (not a card that only moved)', () => {
    let checked = 0;
    for (const [seed, chixiaFirst] of EXPECTED.slice(0, 6)) {
      const { log } = playMatch(seed, chixiaFirst);
      for (const { event, before, after } of log) {
        if (event.type !== 'UPGRADE') continue;
        const p = event.payload as { cardCode?: string; slotName?: 'leader' | 'leftSupport' | 'rightSupport'; newLevel?: number };
        const slots = after.players[event.playerIndex!].slots;
        // 같은 액션 안에서 레벨업 후 리더 교체가 일어나면 칸이 바뀔 수 있으므로, 세 칸 중 어딘가에 그 카드·레벨이 있어야 함
        const found = [slots.leader, slots.leftSupport, slots.rightSupport].some(
          (c) => c && c.code === p.cardCode && c.level === p.newLevel
        );
        expect(found).toBe(true);
        // 그리고 액션 전에는 그 카드·레벨이 필드에 없었어야 함 (단순 자리 이동은 레벨업이 아님)
        const pb = before.players[event.playerIndex!].slots;
        const existedBefore = [pb.leader, pb.leftSupport, pb.rightSupport].some(
          (c) => c && c.code === p.cardCode && c.level === p.newLevel
        );
        expect(existedBefore).toBe(false);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('a leader switch alone never produces an UPGRADE event', () => {
    let switchOnly = 0;
    for (const [seed, chixiaFirst] of EXPECTED.slice(0, 6)) {
      const { log } = playMatch(seed, chixiaFirst);
      const byAction = new Map<GameAction, GameEvent[]>();
      for (const { action, event } of log) byAction.set(action, [...(byAction.get(action) || []), event]);
      for (const [action, events] of byAction) {
        if (action.type !== 'AI_COMBO_STEP') continue; // 연격 단계의 리더 교체는 레벨업 처리가 없음
        if (events.some((e) => e.type === 'LEADER_SWITCH')) {
          switchOnly++;
          expect(events.filter((e) => e.type === 'UPGRADE')).toEqual([]);
        }
      }
    }
    expect(switchOnly).toBeGreaterThan(0);
  });
});
