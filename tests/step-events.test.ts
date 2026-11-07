/**
 * [WP7-3] step() 함수 이벤트 정합성 및 액션 로그 리플레이 재현 검증 테스트
 */
import { describe, it, expect } from 'vitest';
import { createInitialGameState, findAllUpgradableCards } from '../src/engine/gameEngine';
import { decideAiMulligan, selectAiClashCard } from '../src/engine/aiPlayer';
import { step } from '../src/engine/step';
import type { GameAction, GameEvent } from '../src/engine/events';
import type { GameState } from '../src/types/tcg';

const fingerprint = (s: GameState) =>
  JSON.stringify(s, (k, v) => (k === 'timestamp' ? undefined : v));

describe('WP7 step() events and action replay', () => {
  it('step() progresses a full match, emits real combat/draw/play events, and replays deterministically', () => {
    const SEED = 7777;
    let state = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'SOLO_DUAL',
      null,
      null,
      undefined,
      undefined,
      SEED
    );

    const allEvents: GameEvent[] = [];
    const actions: GameAction[] = [];

    const doStep = (action: GameAction) => {
      actions.push(action);
      const res = step(state, action);
      state = res.state;
      allEvents.push(...res.events);
    };

    // 1. 시작 리더 선택 단계가 있으면 처리
    if (state.phase === 'LEADER_SELECT') {
      const p0Leader = state.players[0].slots.leader?.id || state.players[0].characterDeck[0]?.id || '방랑자';
      const p1Leader = state.players[1].slots.leader?.id || state.players[1].characterDeck[0]?.id || '치샤';
      doStep({
        type: 'SELECT_STARTING_LEADER',
        p0LeaderIdOrName: p0Leader,
        p1LeaderIdOrName: p1Leader,
      });
    }

    // 2. 멀리건
    doStep({
      type: 'MULLIGAN',
      p0DiscardIds: decideAiMulligan(state.players[0]),
      p1DiscardIds: decideAiMulligan(state.players[1]),
    });

    let loop = 0;
    while (state.phase !== 'GAME_OVER' && loop < 1500) {
      loop++;
      if (state.lastEffectDraw) {
        doStep({ type: 'FINISH_EFFECT_DRAW' });
        continue;
      }
      if (state.pendingChoice) {
        const choice = state.pendingChoice;
        const chosen = (choice.revealedCards || []).slice(0, choice.maxSelect ?? 1).map((c) => c.id);
        doStep({ type: 'RESOLVE_PENDING_CHOICE', chosenCardIds: chosen });
        continue;
      }

      const active = state.activePlayerIndex;

      switch (state.phase) {
        case 'START_PHASE':
          doStep({ type: 'DRAW_CARDS', playerIndex: active });
          break;
        case 'DRAW_PHASE':
          doStep({ type: 'DRAW_CARDS', playerIndex: active });
          break;
        case 'ACTION_PHASE':
          doStep({ type: 'AI_ACTION_PHASE', playerIndex: active });
          if (state.phase === 'ACTION_PHASE') {
            doStep({ type: 'DECIDE_CLASH', startClash: true });
          }
          break;
        case 'CLASH_SET': {
          const c0 = selectAiClashCard(state, 0);
          doStep({ type: 'SET_CLASH_CARD', playerIndex: 0, cardId: c0 });
          const c1 = selectAiClashCard(state, 1);
          doStep({ type: 'SET_CLASH_CARD', playerIndex: 1, cardId: c1 });
          doStep({ type: 'RESOLVE_CLASH' });
          break;
        }
        case 'CLASH_REVEAL':
          doStep({ type: 'PROCEED_AFTER_CLASH' });
          break;
        case 'COMBO_STEP': {
          const comboIdx: 0 | 1 =
            state.players[0].comboUnlimited || state.players[0].comboCount > 0 ? 0 : 1;
          doStep({ type: 'AI_COMBO_STEP', playerIndex: comboIdx });
          if (state.phase === 'COMBO_STEP') {
            doStep({ type: 'FINISH_COMBO', playerIndex: comboIdx });
          }
          break;
        }
        case 'DISCARD_OVERFLOW': {
          // 버려야 하는 쪽은 턴 플레이어가 아닐 수 있으므로 패가 8장을 넘는 쪽을 지정
          const over: 0 | 1 = state.players[0].hand.length > 8 ? 0 : 1;
          doStep({ type: 'AI_DISCARD_OVERFLOW', playerIndex: over });
          break;
        }
        case 'END_PHASE':
          // END_PHASE는 이미 턴 종료 스킬이 처리된 상태 → 마무리만 진행 (END_TURN 재호출 금지)
          doStep({ type: 'FINALIZE_END_PHASE' });
          break;
        default:
          break;
      }
    }

    // 실제 경기가 끝까지 진행되었는지 검증 (루프 상한에 걸려 멈춘 경우 실패)
    expect(loop).toBeLessThan(1500);
    expect(state.phase).toBe('GAME_OVER');
    expect(state.turn).toBeGreaterThan(3);

    // 발생한 이벤트 종류별 검증 (단순 0 = 0 비교 방지)
    const damageEvents = allEvents.filter((e) => e.type === 'DAMAGE');
    const healEvents = allEvents.filter((e) => e.type === 'HEAL');
    const cardDrawnEvents = allEvents.filter((e) => e.type === 'CARD_DRAWN');
    const cardPlayedEvents = allEvents.filter((e) => e.type === 'CARD_PLAYED');
    const clashRevealEvents = allEvents.filter((e) => e.type === 'CLASH_REVEAL');
    const clashResultEvents = allEvents.filter((e) => e.type === 'CLASH_RESULT');
    const phaseChangedEvents = allEvents.filter((e) => e.type === 'PHASE_CHANGED');

    expect(damageEvents.length).toBeGreaterThan(0);
    expect(cardDrawnEvents.length).toBeGreaterThan(0);
    expect(cardPlayedEvents.length).toBeGreaterThan(0);
    expect(clashRevealEvents.length).toBeGreaterThan(0);
    expect(clashResultEvents.length).toBeGreaterThan(0);
    expect(phaseChangedEvents.length).toBeGreaterThan(0);

    // hpHistory와 DAMAGE / HEAL 이벤트 정합성 검증
    const historyDamages = (state.hpHistory || []).filter((h) => h.type === 'DAMAGE');
    const historyHeals = (state.hpHistory || []).filter((h) => h.type === 'HEAL');
    expect(damageEvents.length).toBe(historyDamages.length);
    expect(healEvents.length).toBe(historyHeals.length);

    // 리플레이 재현성: 동일한 시드 + 기록된 actions만으로 상태와 이벤트가 100% 일치하는지 검증
    let replayState = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'SOLO_DUAL',
      null,
      null,
      undefined,
      undefined,
      SEED
    );
    const replayEvents: GameEvent[] = [];
    for (const a of actions) {
      const res = step(replayState, a);
      replayState = res.state;
      replayEvents.push(...res.events);
    }

    expect(fingerprint(replayState)).toBe(fingerprint(state));
    expect(replayEvents.map((e) => e.type)).toEqual(allEvents.map((e) => e.type));
  });

  it('step() emits LEADER_SWITCH, UPGRADE, SURRENDER, and TIME_OUT events', () => {
    let state = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'SOLO_DUAL',
      null,
      null,
      undefined,
      undefined,
      12345
    );

    state = step(state, { type: 'MULLIGAN', p0DiscardIds: [], p1DiscardIds: [] }).state;
    if (state.phase === 'START_PHASE') {
      state = step(state, { type: 'FINISH_EFFECT_DRAW' }).state;
    }
    if (state.phase === 'DRAW_PHASE') {
      state = step(state, { type: 'DRAW_CARDS', playerIndex: state.activePlayerIndex }).state;
    }

    const active = state.activePlayerIndex;
    const player = state.players[active];

    // 1. LEADER_SWITCH 검증
    const switchRes = step(state, {
      type: 'SWITCH_LEADER',
      playerIndex: active,
      targetSlot: 'leftSupport',
    });
    expect(switchRes.events.some((e) => e.type === 'LEADER_SWITCH')).toBe(true);
    state = switchRes.state;

    // 2. UPGRADE 검증 (가능한 진화 후보 탐색)
    const candidates = findAllUpgradableCards(
      state.players[active].characterDeck,
      state.players[active].slots.leader
    );
    if (candidates.length > 0 && player.hand.length >= candidates[0].level) {
      const targetUpgrade = candidates[0];
      const discardIds = state.players[active].hand.slice(0, targetUpgrade.level).map((c) => c.id);
      const upgRes = step(state, {
        type: 'UPGRADE',
        playerIndex: active,
        targetSlot: 'leader',
        upgradeCardId: targetUpgrade.id,
        discardIds,
      });
      expect(upgRes.events.some((e) => e.type === 'UPGRADE')).toBe(true);
      state = upgRes.state;
    }

    // 3. SURRENDER 검증
    const surrenderRes = step(state, { type: 'SURRENDER', playerIndex: 0 });
    expect(surrenderRes.state.phase).toBe('GAME_OVER');
    expect(surrenderRes.state.winner).toBe(1);
    expect(surrenderRes.events.some((e) => e.type === 'GAME_OVER')).toBe(true);

    // 4. TIME_OUT 검증
    const timeoutRes = step(state, { type: 'TIME_OUT', loserIndex: 1 });
    expect(timeoutRes.state.phase).toBe('GAME_OVER');
    expect(timeoutRes.state.winner).toBe(0);
    expect(timeoutRes.events.some((e) => e.type === 'GAME_OVER')).toBe(true);
  });

  it('END_TURN is ignored outside valid phases (no double end-turn skills)', () => {
    // step()이 비어 있는 큐 필드(undefined → null/[])를 정규화하는 것은 무시하고 비교
    const norm = (st: GameState) =>
      JSON.stringify(st, (k, v) => {
        if (k === 'timestamp') return undefined;
        if (v === null || (Array.isArray(v) && v.length === 0)) return undefined;
        return v;
      });
    let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', null, null, undefined, undefined, 4242);
    const before = norm(state);
    // 게임 준비 단계(LEADER_SELECT/MULLIGAN)에서 END_TURN은 상태를 바꾸지 않는다
    const r0 = step(state, { type: 'END_TURN' });
    expect(norm(r0.state)).toBe(before);

    // END_PHASE에서 END_TURN을 다시 보내도 상태가 바뀌지 않는다
    state = { ...state, phase: 'END_PHASE' };
    const endPhaseSnap = norm(state);
    const r1 = step(state, { type: 'END_TURN' });
    expect(norm(r1.state)).toBe(endPhaseSnap);
    expect(r1.state.players[0].hand.length).toBe(state.players[0].hand.length);
    expect(r1.state.players[1].hand.length).toBe(state.players[1].hand.length);
  });
});
