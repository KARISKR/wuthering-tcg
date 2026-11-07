import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../src/engine/gameEngine';
import { step } from '../src/engine/step';
import { selectAiClashCard, decideAiMulligan } from '../src/engine/aiPlayer';
import { stateFingerprint, replayToEnd } from '../src/engine/replay';
import { CURRENT_GAME_VERSION } from '../src/data/gameVersion';
import { LocalSource } from '../src/battle/LocalSource';
import { PeerSource } from '../src/battle/PeerSource';
import { ReplaySource } from '../src/battle/ReplaySource';
import type { GameAction, GameEvent } from '../src/engine/events';
import type { ReplayV2 } from '../src/utils/replayManager';

describe('BattleSource Adapter & Event Subscription (Step B)', () => {
  it('LocalSource: 20 actions result in matching subscription calls and unique event ids', () => {
    const initialState = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'AI',
      null,
      null,
      undefined,
      undefined,
      12345
    );

    const source = new LocalSource(initialState);
    let subscriberCalls = 0;
    const collectedEvents: GameEvent[] = [];

    source.subscribe((_state, events) => {
      subscriberCalls++;
      collectedEvents.push(...events);
    });

    // 20개의 액션을 순차 디스패치
    source.dispatch({
      type: 'SELECT_STARTING_LEADER',
      p0LeaderIdOrName: '방랑자',
      p1LeaderIdOrName: '치샤',
    });

    source.dispatch({
      type: 'MULLIGAN',
      p0DiscardIds: decideAiMulligan(source.getState().players[0]),
      p1DiscardIds: decideAiMulligan(source.getState().players[1]),
    });

    for (let i = 0; i < 18; i++) {
      const state = source.getState();
      if (state.phase === 'GAME_OVER') break;

      if (state.lastEffectDraw) {
        source.dispatch({ type: 'FINISH_EFFECT_DRAW' });
        continue;
      }
      if (state.pendingChoice) {
        const choice = state.pendingChoice;
        const chosen = (choice.revealedCards || []).slice(0, choice.maxSelect ?? 1).map((c) => c.id);
        source.dispatch({ type: 'RESOLVE_PENDING_CHOICE', chosenCardIds: chosen });
        continue;
      }

      const active = state.activePlayerIndex;
      switch (state.phase) {
        case 'START_PHASE':
        case 'DRAW_PHASE':
          source.dispatch({ type: 'DRAW_CARDS', playerIndex: active });
          break;
        case 'ACTION_PHASE':
          source.dispatch({ type: 'AI_ACTION_PHASE', playerIndex: active });
          break;
        case 'CLASH_SET': {
          const c0 = selectAiClashCard(state, 0);
          source.dispatch({ type: 'SET_CLASH_CARD', playerIndex: 0, cardId: c0 });
          break;
        }
        case 'CLASH_REVEAL':
          source.dispatch({ type: 'PROCEED_AFTER_CLASH' });
          break;
        case 'COMBO_STEP': {
          const comboIdx: 0 | 1 =
            state.players[0].comboUnlimited || state.players[0].comboCount > 0 ? 0 : 1;
          source.dispatch({ type: 'AI_COMBO_STEP', playerIndex: comboIdx });
          break;
        }
        case 'DISCARD_OVERFLOW': {
          const over: 0 | 1 = state.players[0].hand.length > 8 ? 0 : 1;
          source.dispatch({ type: 'AI_DISCARD_OVERFLOW', playerIndex: over });
          break;
        }
        case 'END_PHASE':
          source.dispatch({ type: 'FINALIZE_END_PHASE' });
          break;
        default:
          source.dispatch({ type: 'DRAW_CARDS', playerIndex: active });
          break;
      }
    }

    expect(subscriberCalls).toBe(20);
    expect(source.getActionLog().length).toBe(20);

    // 이벤트 ID 중복 검사
    const eventIds = collectedEvents.map((e) => e.id);
    expect(eventIds.length).toBeGreaterThan(0);
    const uniqueIds = new Set(eventIds);
    expect(uniqueIds.size).toBe(eventIds.length);
  });

  it('PeerSource guest mode: receiving the exact same state twice emits 0 events on the second time', () => {
    const stateA = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'MULTIPLAYER',
      null,
      null,
      undefined,
      undefined,
      9999
    );

    const stepResult = step(stateA, {
      type: 'SELECT_STARTING_LEADER',
      p0LeaderIdOrName: '방랑자',
      p1LeaderIdOrName: '치샤',
    });
    const stateB = stepResult.state;

    const sentActions: GameAction[] = [];
    const guestSource = new PeerSource('peer-guest', stateA, {
      sendAction: (action) => sentActions.push(action),
    });

    const emittedEventsList: GameEvent[][] = [];
    guestSource.subscribe((_state, events) => {
      emittedEventsList.push(events);
    });

    // 1. 새로운 상태 stateB 수신 -> 이벤트 방출 (PHASE_CHANGED 등)
    guestSource.receiveState(stateB);
    expect(emittedEventsList.length).toBe(1);
    expect(emittedEventsList[0].length).toBeGreaterThan(0);

    // 2. 동일한 상태 stateB 재수신 -> 이벤트 0개 방출
    guestSource.receiveState(stateB);
    expect(emittedEventsList.length).toBe(2);
    expect(emittedEventsList[1].length).toBe(0);

    // 3. 게스트의 dispatch는 로컬 step을 돌리지 않고 sendAction을 호출
    const testAction: GameAction = { type: 'DRAW_CARDS', playerIndex: 1 };
    guestSource.dispatch(testAction);
    expect(sentActions).toEqual([testAction]);
    // 로컬 상태는 변하지 않음
    expect(guestSource.getState()).toBe(stateB);
  });

  it('ReplaySource: playing to the end matches replayToEnd exactly', () => {
    // 1. 샘플 경기 시뮬레이션으로 ReplayV2 생성
    const actions: GameAction[] = [];
    let state = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'AI',
      null,
      null,
      undefined,
      undefined,
      554433
    );

    function dispatch(a: GameAction) {
      actions.push(a);
      state = step(state, a).state;
    }

    dispatch({
      type: 'SELECT_STARTING_LEADER',
      p0LeaderIdOrName: '방랑자',
      p1LeaderIdOrName: '치샤',
    });

    dispatch({
      type: 'MULLIGAN',
      p0DiscardIds: decideAiMulligan(state.players[0]),
      p1DiscardIds: decideAiMulligan(state.players[1]),
    });

    let loop = 0;
    while (state.phase !== 'GAME_OVER' && loop < 2500) {
      loop++;
      if (state.lastEffectDraw) {
        dispatch({ type: 'FINISH_EFFECT_DRAW' });
        continue;
      }
      if (state.pendingChoice) {
        const choice = state.pendingChoice;
        const chosen = (choice.revealedCards || []).slice(0, choice.maxSelect ?? 1).map((c) => c.id);
        dispatch({ type: 'RESOLVE_PENDING_CHOICE', chosenCardIds: chosen });
        continue;
      }

      const active = state.activePlayerIndex;
      switch (state.phase) {
        case 'START_PHASE':
        case 'DRAW_PHASE':
          dispatch({ type: 'DRAW_CARDS', playerIndex: active });
          break;
        case 'ACTION_PHASE':
          dispatch({ type: 'AI_ACTION_PHASE', playerIndex: active });
          if (state.phase === 'ACTION_PHASE') {
            dispatch({ type: 'DECIDE_CLASH', startClash: true });
          }
          break;
        case 'CLASH_SET': {
          const c0 = selectAiClashCard(state, 0);
          dispatch({ type: 'SET_CLASH_CARD', playerIndex: 0, cardId: c0 });
          const c1 = selectAiClashCard(state, 1);
          dispatch({ type: 'SET_CLASH_CARD', playerIndex: 1, cardId: c1 });
          dispatch({ type: 'RESOLVE_CLASH' });
          break;
        }
        case 'CLASH_REVEAL':
          dispatch({ type: 'PROCEED_AFTER_CLASH' });
          break;
        case 'COMBO_STEP': {
          const comboIdx: 0 | 1 =
            state.players[0].comboUnlimited || state.players[0].comboCount > 0 ? 0 : 1;
          dispatch({ type: 'AI_COMBO_STEP', playerIndex: comboIdx });
          if (state.phase === 'COMBO_STEP') {
            dispatch({ type: 'FINISH_COMBO', playerIndex: comboIdx });
          }
          break;
        }
        case 'DISCARD_OVERFLOW': {
          const over: 0 | 1 = state.players[0].hand.length > 8 ? 0 : 1;
          dispatch({ type: 'AI_DISCARD_OVERFLOW', playerIndex: over });
          break;
        }
        case 'END_PHASE':
          dispatch({ type: 'FINALIZE_END_PHASE' });
          break;
        default:
          break;
      }
    }

    const v2: ReplayV2 = {
      format: 2,
      engineVersion: CURRENT_GAME_VERSION,
      start: {
        p0PresetKey: 'STARTER_ROVER',
        p1PresetKey: 'STARTER_CHIXIA',
        gameMode: 'AI',
        p0Deck: null,
        p1Deck: null,
        seed: 554433,
      },
      actions,
      finalFingerprint: stateFingerprint(state),
    };

    // 2. ReplaySource 실행 및 끝까지 전진
    const replaySource = new ReplaySource(v2);
    expect(replaySource.getTotalFrames()).toBe(actions.length);

    replaySource.playToEnd();

    const expectedFinalState = replayToEnd(v2);
    expect(stateFingerprint(replaySource.getState())).toBe(stateFingerprint(expectedFinalState));
    expect(stateFingerprint(replaySource.getState())).toBe(v2.finalFingerprint);
  });
});
