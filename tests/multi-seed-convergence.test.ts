import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../src/engine/gameEngine';
import { step } from '../src/engine/step';
import { selectAiClashCard, decideAiMulligan } from '../src/engine/aiPlayer';

describe('multi-seed GAME_OVER convergence test (50 seeds)', () => {
  it('runs 50 distinct seeds to GAME_OVER without hanging or breaking rules', () => {
    let finishedCount = 0;
    const totalSeeds = 50;
    const failures: { seed: number; turn: number; phase: string; loop: number }[] = [];

    for (let i = 0; i < totalSeeds; i++) {
      const seed = 10007 + i * 37;
      let state = createInitialGameState(
        'STARTER_ROVER',
        'STARTER_CHIXIA',
        'AI',
        null,
        null,
        undefined,
        undefined,
        seed
      );

      if (state.phase === 'LEADER_SELECT') {
        const p0Leader = state.players[0].slots.leader?.id || state.players[0].characterDeck[0]?.id || '방랑자';
        const p1Leader = state.players[1].slots.leader?.id || state.players[1].characterDeck[0]?.id || '치샤';
        state = step(state, {
          type: 'SELECT_STARTING_LEADER',
          p0LeaderIdOrName: p0Leader,
          p1LeaderIdOrName: p1Leader,
        }).state;
      }

      state = step(state, {
        type: 'MULLIGAN',
        p0DiscardIds: decideAiMulligan(state.players[0]),
        p1DiscardIds: decideAiMulligan(state.players[1]),
      }).state;

      let loop = 0;
      const MAX_LOOPS = 2500;

      while (state.phase !== 'GAME_OVER' && loop < MAX_LOOPS) {
        loop++;

        if (state.lastEffectDraw) {
          state = step(state, { type: 'FINISH_EFFECT_DRAW' }).state;
          continue;
        }
        if (state.pendingChoice) {
          const choice = state.pendingChoice;
          const chosen = (choice.revealedCards || []).slice(0, choice.maxSelect ?? 1).map((c) => c.id);
          state = step(state, { type: 'RESOLVE_PENDING_CHOICE', chosenCardIds: chosen }).state;
          continue;
        }

        const active = state.activePlayerIndex;

        switch (state.phase) {
          case 'START_PHASE':
          case 'DRAW_PHASE':
            state = step(state, { type: 'DRAW_CARDS', playerIndex: active }).state;
            break;
          case 'ACTION_PHASE':
            state = step(state, { type: 'AI_ACTION_PHASE', playerIndex: active }).state;
            if (state.phase === 'ACTION_PHASE') {
              state = step(state, { type: 'DECIDE_CLASH', startClash: true }).state;
            }
            break;
          case 'CLASH_SET': {
            const c0 = selectAiClashCard(state, 0);
            state = step(state, { type: 'SET_CLASH_CARD', playerIndex: 0, cardId: c0 }).state;
            const c1 = selectAiClashCard(state, 1);
            state = step(state, { type: 'SET_CLASH_CARD', playerIndex: 1, cardId: c1 }).state;
            state = step(state, { type: 'RESOLVE_CLASH' }).state;
            break;
          }
          case 'CLASH_REVEAL':
            state = step(state, { type: 'PROCEED_AFTER_CLASH' }).state;
            break;
          case 'COMBO_STEP': {
            const comboIdx: 0 | 1 =
              state.players[0].comboUnlimited || state.players[0].comboCount > 0 ? 0 : 1;
            state = step(state, { type: 'AI_COMBO_STEP', playerIndex: comboIdx }).state;
            if (state.phase === 'COMBO_STEP') {
              state = step(state, { type: 'FINISH_COMBO', playerIndex: comboIdx }).state;
            }
            break;
          }
          case 'DISCARD_OVERFLOW': {
            const over: 0 | 1 = state.players[0].hand.length > 8 ? 0 : 1;
            state = step(state, { type: 'AI_DISCARD_OVERFLOW', playerIndex: over }).state;
            break;
          }
          case 'END_PHASE':
            state = step(state, { type: 'FINALIZE_END_PHASE' }).state;
            break;
          default:
            break;
        }
      }

      if (state.phase === 'GAME_OVER') {
        finishedCount++;
      } else {
        failures.push({ seed, turn: state.turn, phase: state.phase, loop });
      }
    }

    expect(failures).toEqual([]);
    expect(finishedCount).toBe(totalSeeds);
  });
});
