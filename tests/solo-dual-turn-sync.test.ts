/**
 * [WP8 버그 수정] 1인 2역 (SOLO_DUAL) 모드 드로우 페이즈 턴 동기화 및 CenterDrawOverlay 방어 검증 테스트
 */
import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../src/engine/gameEngine';
import { step } from '../src/engine/step';
import { selectAiClashCard, decideAiMulligan } from '../src/engine/aiPlayer';
import { computeSoloDualControlledPlayerIndex } from '../src/hooks/useSoloDualTurnSync';
import { isCenterDrawUserTurn } from '../src/components/CenterDrawOverlay';
import type { GameState } from '../src/types/tcg';
import type { GameAction } from '../src/engine/events';

describe('SOLO_DUAL turn sync & CenterDrawOverlay deadlock prevention', () => {
  it('computeSoloDualControlledPlayerIndex synchronizes properly in DRAW_PHASE, ACTION_PHASE, and END_PHASE for both players', () => {
    const state = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'SOLO_DUAL',
      null,
      null,
      undefined,
      undefined,
      1234
    );

    // DRAW_PHASE P0 턴
    state.phase = 'DRAW_PHASE';
    state.activePlayerIndex = 0;
    expect(computeSoloDualControlledPlayerIndex(state)).toBe(0);

    // DRAW_PHASE P1 턴 (버그 상황: 2P 선공이거나 1턴 종료 후 2P 드로우 페이즈 진입 시)
    state.activePlayerIndex = 1;
    expect(computeSoloDualControlledPlayerIndex(state)).toBe(1);

    // ACTION_PHASE P1 턴
    state.phase = 'ACTION_PHASE';
    state.activePlayerIndex = 1;
    expect(computeSoloDualControlledPlayerIndex(state)).toBe(1);

    // END_PHASE P1 턴
    state.phase = 'END_PHASE';
    state.activePlayerIndex = 1;
    expect(computeSoloDualControlledPlayerIndex(state)).toBe(1);

    // ACTION_PHASE P0 턴
    state.activePlayerIndex = 0;
    expect(computeSoloDualControlledPlayerIndex(state)).toBe(0);
  });

  it('computeSoloDualControlledPlayerIndex prioritizes pendingChoice playerIndex in any phase', () => {
    const state = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'SOLO_DUAL',
      null,
      null,
      undefined,
      undefined,
      1234
    );

    state.phase = 'ACTION_PHASE';
    state.activePlayerIndex = 0;

    // P1에게 선택 요구가 발생한 경우 (예: 상대 효과로 인한 대상 선택)
    state.pendingChoice = {
      playerIndex: 1,
      choiceType: 'EFFECT_TARGET',
      prompt: '카드 1장을 선택하세요',
    };

    expect(computeSoloDualControlledPlayerIndex(state)).toBe(1);

    // P0에게 선택 요구가 발생한 경우
    state.pendingChoice.playerIndex = 0;
    expect(computeSoloDualControlledPlayerIndex(state)).toBe(0);
  });

  it('computeSoloDualControlledPlayerIndex handles CLASH_SET, COMBO_STEP, and DISCARD_OVERFLOW', () => {
    const state = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'SOLO_DUAL',
      null,
      null,
      undefined,
      undefined,
      1234
    );

    // CLASH_SET: P0 미제출 -> 0
    state.phase = 'CLASH_SET';
    state.players[0].clashCardReady = false;
    state.players[1].clashCardReady = false;
    expect(computeSoloDualControlledPlayerIndex(state)).toBe(0);

    // CLASH_SET: P0 제출 완료, P1 미제출 -> 1
    state.players[0].clashCardReady = true;
    state.players[1].clashCardReady = false;
    expect(computeSoloDualControlledPlayerIndex(state)).toBe(1);

    // COMBO_STEP: P1 콤보 카운트 보유 -> 1
    state.phase = 'COMBO_STEP';
    state.players[0].comboCount = 0;
    state.players[0].comboUnlimited = false;
    state.players[1].comboCount = 2;
    expect(computeSoloDualControlledPlayerIndex(state)).toBe(1);

    // DISCARD_OVERFLOW: P1 손패 9장 초과 -> 1
    state.phase = 'DISCARD_OVERFLOW';
    state.players[1].hand = new Array(9).fill(state.players[0].hand[0]);
    expect(computeSoloDualControlledPlayerIndex(state)).toBe(1);
  });

  it('computeSoloDualControlledPlayerIndex properly returns 0 for AI mode and role-based index for MULTIPLAYER', () => {
    const aiState = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'AI',
      null,
      null,
      undefined,
      undefined,
      1234
    );
    expect(computeSoloDualControlledPlayerIndex(aiState)).toBe(0);

    const multiState = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'MULTIPLAYER',
      null,
      null,
      undefined,
      undefined,
      1234
    );
    expect(computeSoloDualControlledPlayerIndex(multiState, 'HOST')).toBe(0);
    expect(computeSoloDualControlledPlayerIndex(multiState, 'GUEST')).toBe(1);
  });

  it('isCenterDrawUserTurn returns true in SOLO_DUAL mode even before controlledPlayerIndex updates', () => {
    // 2P 선공이거나 턴 전환 직후 첫 렌더 프레임: active=1, controlled=0
    const isUserTurnSoloDual = isCenterDrawUserTurn({
      isSpectator: false,
      activePlayerIsAi: false,
      activePlayerIndex: 1,
      controlledPlayerIndex: 0,
      isSoloDual: true,
      gameMode: 'SOLO_DUAL',
    });
    expect(isUserTurnSoloDual).toBe(true);

    // 의도적 버그 주입 검증 (옛 코드: SOLO_DUAL 모드 예외가 없던 경우)
    const oldCodeBehavior = isCenterDrawUserTurn({
      isSpectator: false,
      activePlayerIsAi: false,
      activePlayerIndex: 1,
      controlledPlayerIndex: 0,
      isSoloDual: false, // 옛 코드 시뮬레이션
      gameMode: undefined,
    });
    // 옛 방식에서는 1 === 0 이 false가 되어 유저 턴이 아니라고 판정 -> 데드락 발생했음
    expect(oldCodeBehavior).toBe(false);

    // AI 모드에서는 상대(AI) 턴일 때 정상적으로 false
    const isUserTurnAi = isCenterDrawUserTurn({
      isSpectator: false,
      activePlayerIsAi: true,
      activePlayerIndex: 1,
      controlledPlayerIndex: 0,
      isSoloDual: false,
      gameMode: 'AI',
    });
    expect(isUserTurnAi).toBe(false);
  });

  it('SOLO_DUAL mode completes 50 full matches through step() without deadlock in any phase', () => {
    for (let seed = 1001; seed <= 1050; seed++) {
      let state = createInitialGameState(
        'STARTER_ROVER',
        'STARTER_CHIXIA',
        'SOLO_DUAL',
        null,
        null,
        undefined,
        undefined,
        seed
      );

      const doStep = (action: GameAction) => {
        const res = step(state, action);
        state = res.state;
      };

      if (state.phase === 'LEADER_SELECT') {
        const p0Leader = state.players[0].slots.leader?.id || state.players[0].characterDeck[0]?.id || '방랑자';
        const p1Leader = state.players[1].slots.leader?.id || state.players[1].characterDeck[0]?.id || '치샤';
        doStep({
          type: 'SELECT_STARTING_LEADER',
          p0LeaderIdOrName: p0Leader,
          p1LeaderIdOrName: p1Leader,
        });
      }

      doStep({
        type: 'MULLIGAN',
        p0DiscardIds: decideAiMulligan(state.players[0]),
        p1DiscardIds: decideAiMulligan(state.players[1]),
      });

      let loop = 0;
      while (state.phase !== 'GAME_OVER' && loop < 1200) {
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
        // 각 단계별로 시점 계산이 반환될 경우 유효한 플레이어(0 또는 1)를 가리키는지 검증
        const controlled = computeSoloDualControlledPlayerIndex(state);
        if (controlled !== undefined) {
          expect([0, 1]).toContain(controlled);
        }

        switch (state.phase) {
          case 'START_PHASE':
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
            const over: 0 | 1 = state.players[0].hand.length > 8 ? 0 : 1;
            doStep({ type: 'AI_DISCARD_OVERFLOW', playerIndex: over });
            break;
          }
          case 'END_PHASE':
            doStep({ type: 'FINALIZE_END_PHASE' });
            break;
          default:
            break;
        }
      }

      expect(state.phase).toBe('GAME_OVER');
      expect(loop).toBeLessThan(1200);
    }
  });
});
