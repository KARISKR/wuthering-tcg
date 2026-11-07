import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../src/engine/gameEngine';
import { step } from '../src/engine/step';
import { selectAiClashCard, decideAiMulligan } from '../src/engine/aiPlayer';
import { replayToEnd, replayFrames, stateFingerprint } from '../src/engine/replay';
import { STARTER_PRESETS, generateStarterActionDeck } from '../src/data/cards';
import { CURRENT_GAME_VERSION } from '../src/data/gameVersion';
import type { ReplayV2 } from '../src/utils/replayManager';
import type { GameAction } from '../src/engine/events';
import type { CustomDeckConfig } from '../src/types/tcg';

function simulateMatch(seed: number, p0CustomDeck?: CustomDeckConfig | null, p1CustomDeck?: CustomDeckConfig | null): { finalState: ReturnType<typeof createInitialGameState>; v2: ReplayV2 } {
  const actions: GameAction[] = [];
  const startArgs = {
    p0PresetKey: 'STARTER_ROVER' as const,
    p1PresetKey: 'STARTER_CHIXIA' as const,
    gameMode: 'AI' as const,
    p0Deck: p0CustomDeck ?? null,
    p1Deck: p1CustomDeck ?? null,
    seed,
  };

  let state = createInitialGameState(
    startArgs.p0PresetKey,
    startArgs.p1PresetKey,
    startArgs.gameMode,
    startArgs.p0Deck,
    startArgs.p1Deck,
    undefined,
    undefined,
    startArgs.seed
  );

  function dispatch(action: GameAction) {
    actions.push(action);
    state = step(state, action).state;
  }

  if (state.phase === 'LEADER_SELECT') {
    const p0Leader = state.players[0].slots.leader?.id || state.players[0].characterDeck[0]?.id || '방랑자';
    const p1Leader = state.players[1].slots.leader?.id || state.players[1].characterDeck[0]?.id || '치샤';
    dispatch({
      type: 'SELECT_STARTING_LEADER',
      p0LeaderIdOrName: p0Leader,
      p1LeaderIdOrName: p1Leader,
    });
  }

  dispatch({
    type: 'MULLIGAN',
    p0DiscardIds: decideAiMulligan(state.players[0]),
    p1DiscardIds: decideAiMulligan(state.players[1]),
  });

  let loop = 0;
  const MAX_LOOPS = 2500;

  while (state.phase !== 'GAME_OVER' && loop < MAX_LOOPS) {
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

  expect(state.phase).toBe('GAME_OVER');

  const v2: ReplayV2 = {
    format: 2,
    engineVersion: CURRENT_GAME_VERSION,
    start: startArgs,
    actions,
    finalFingerprint: stateFingerprint(state),
  };

  return { finalState: state, v2 };
}

describe('Replay V2 Recording & Deterministic Replay (Step A)', () => {
  it('records and replays 10 AI vs AI matches with 100% fingerprint match (10/10)', () => {
    let successCount = 0;
    const totalMatches = 10;

    for (let i = 0; i < totalMatches; i++) {
      const seed = 20011 + i * 19;
      const { v2, finalState } = simulateMatch(seed);

      expect(v2.actions.length).toBeGreaterThan(0);
      expect(v2.finalFingerprint).toBe(stateFingerprint(finalState));

      const replayedState = replayToEnd(v2);
      const replayedFp = stateFingerprint(replayedState);

      expect(replayedFp).toBe(v2.finalFingerprint);
      expect(replayedState.phase).toBe('GAME_OVER');
      expect(replayedState.winner).toBe(finalState.winner);
      expect(replayedState.turn).toBe(finalState.turn);

      successCount++;
    }

    expect(successCount).toBe(totalMatches);
  });

  it('records and deterministically replays a custom deck match', () => {
    const customDeck: CustomDeckConfig = {
      id: 'custom-replay-test-deck',
      name: 'Custom Test Deck',
      leader: { ...STARTER_PRESETS.STARTER_ROVER.leader },
      leftSupport: { ...STARTER_PRESETS.STARTER_ROVER.leftSupport },
      rightSupport: { ...STARTER_PRESETS.STARTER_ROVER.rightSupport },
      characterDeck: [...STARTER_PRESETS.STARTER_ROVER.characterDeck],
      actionCards: generateStarterActionDeck('STARTER_ROVER'),
    };

    const { v2, finalState } = simulateMatch(443322, customDeck, null);
    expect(v2.start.p0Deck).not.toBeNull();
    expect(v2.start.p0Deck?.name).toBe('Custom Test Deck');

    const replayed = replayToEnd(v2);
    expect(stateFingerprint(replayed)).toBe(v2.finalFingerprint);
    expect(replayed.phase).toBe('GAME_OVER');
    expect(replayed.winner).toBe(finalState.winner);
  });

  it('verifies replayFrames produces steps where the last frame matches replayToEnd exactly', () => {
    const { v2, finalState } = simulateMatch(887766);
    const frames = replayFrames(v2);

    expect(frames.length).toBe(v2.actions.length);

    const lastFrame = frames[frames.length - 1];
    expect(lastFrame.state.phase).toBe('GAME_OVER');
    expect(stateFingerprint(lastFrame.state)).toBe(v2.finalFingerprint);
    expect(stateFingerprint(lastFrame.state)).toBe(stateFingerprint(finalState));
  });

  it('confirms server payload boundary handling (> 512KB string length check)', () => {
    const dummyV2: ReplayV2 = {
      format: 2,
      engineVersion: CURRENT_GAME_VERSION,
      start: {
        p0PresetKey: 'STARTER_ROVER',
        p1PresetKey: 'STARTER_CHIXIA',
        gameMode: 'AI',
        p0Deck: null,
        p1Deck: null,
        seed: 1234,
      },
      actions: [],
      finalFingerprint: 'dummy',
    };

    const normalJson = JSON.stringify({ v2: dummyV2 });
    expect(normalJson.length).toBeLessThan(512 * 1024);

    const hugeActions = new Array(50000).fill({ type: 'DRAW_CARDS', playerIndex: 0 });
    const hugeV2: ReplayV2 = { ...dummyV2, actions: hugeActions };
    const hugeJson = JSON.stringify({ v2: hugeV2 });
    expect(hugeJson.length).toBeGreaterThan(512 * 1024);
  });
});
