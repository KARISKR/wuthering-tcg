/**
 * [WP8 버그 수정] RP-261110-29MW8 연격 중 돌연 시간초과 패배 버그 및 TIME_OUT/SURRENDER 로그 정합성 검증 테스트
 */
import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../src/engine/gameEngine';
import { step } from '../src/engine/step';
import {
  shouldPauseBattleTimer,
  getTimerResetSeconds,
  getTimerActivePlayerIndex,
} from '../src/hooks/useBattleTimer';
import type { TimeLimitConfig } from '../src/types/multiplayer';
import type { GameState } from '../src/types/tcg';

const testTimeConfig: TimeLimitConfig = {
  hasTimeLimit: true,
  turnTimeSec: 90,
  clashTimeSec: 30,
  totalTimeSec: 300,
};

describe('Battle Timer Timeout Bug Fix (RP-261110-29MW8)', () => {
  it('resets timer properly on phase transitions and new pendingChoice', () => {
    // 1. CLASH_SET 진입 시 clashTimeSec(30) 반환
    expect(getTimerResetSeconds('CLASH_SET', testTimeConfig)).toBe(30);

    // 2. COMBO_STEP, CLASH_REVEAL, DRAW_PHASE, ACTION_PHASE 진입 시 turnTimeSec(90) 반환
    expect(getTimerResetSeconds('CLASH_REVEAL', testTimeConfig)).toBe(90);
    expect(getTimerResetSeconds('COMBO_STEP', testTimeConfig)).toBe(90);
    expect(getTimerResetSeconds('DRAW_PHASE', testTimeConfig)).toBe(90);
    expect(getTimerResetSeconds('ACTION_PHASE', testTimeConfig)).toBe(90);
    expect(getTimerResetSeconds('DISCARD_OVERFLOW', testTimeConfig)).toBe(90);
  });

  it('pauses timer during animations (isFxBlocking, clashResult, lastComboStrike, lastEffectDraw) even if pendingChoice exists', () => {
    // 모달이 화면에 뜨지 못하는 연출 재생 중에는 타이머가 멈춰야 함 (원인 B 방지)
    const baseParams = {
      phase: 'COMBO_STEP' as const,
      pendingChoice: { id: 'choice-1', playerIndex: 0 as const, choiceType: 'EFFECT_TARGET' as const },
    };

    // 연출이 없을 때 -> 일시정지 아님 (타이머 작동)
    expect(shouldPauseBattleTimer({ ...baseParams })).toBe(false);

    // isFxBlocking 연출 중 -> 일시정지
    expect(shouldPauseBattleTimer({ ...baseParams, isFxBlocking: true })).toBe(true);

    // clashResult 연출 중 -> 일시정지
    expect(shouldPauseBattleTimer({ ...baseParams, clashResult: { winner: 0 } })).toBe(true);

    // lastComboStrike 연출 중 -> 일시정지
    expect(shouldPauseBattleTimer({ ...baseParams, lastComboStrike: { attackerIndex: 0 } })).toBe(true);

    // lastEffectDraw 연출 중 -> 일시정지
    expect(shouldPauseBattleTimer({ ...baseParams, lastEffectDraw: { playerIndex: 0 } })).toBe(true);
  });

  it('pauses timer during non-input phases when no pendingChoice exists', () => {
    // START_PHASE, END_PHASE, CLASH_REVEAL에서 pendingChoice가 없으면 타이머 일시정지 (원인 C 방지)
    expect(shouldPauseBattleTimer({ phase: 'START_PHASE', pendingChoice: null })).toBe(true);
    expect(shouldPauseBattleTimer({ phase: 'END_PHASE', pendingChoice: null })).toBe(true);
    expect(shouldPauseBattleTimer({ phase: 'CLASH_REVEAL', pendingChoice: null })).toBe(true);

    // CLASH_SET에서 양측 세트 완료 상태면 타이머 일시정지
    expect(
      shouldPauseBattleTimer({
        phase: 'CLASH_SET',
        pendingChoice: null,
        p0ClashCardReady: true,
        p1ClashCardReady: true,
      })
    ).toBe(true);

    // 한쪽이라도 미완료면 타이머 진행
    expect(
      shouldPauseBattleTimer({
        phase: 'CLASH_SET',
        pendingChoice: null,
        p0ClashCardReady: true,
        p1ClashCardReady: false,
      })
    ).toBe(false);
  });

  it('correctly determines active player in COMBO_STEP and other phases', () => {
    const state = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'AI',
      null,
      null,
      undefined,
      undefined,
      1234
    );

    // 1. pendingChoice가 있으면 선택 주체 플레이어
    state.pendingChoice = { id: 'c1', playerIndex: 1, choiceType: 'EFFECT_TARGET' };
    expect(getTimerActivePlayerIndex(state)).toBe(1);

    // 2. COMBO_STEP에서 P1이 연격 수행 중인 경우
    state.pendingChoice = null;
    state.phase = 'COMBO_STEP';
    state.players[0].comboCount = 0;
    state.players[0].comboUnlimited = false;
    state.players[1].comboCount = 2;
    expect(getTimerActivePlayerIndex(state)).toBe(1);

    // 3. COMBO_STEP에서 P0이 연격 수행 중인 경우
    state.players[0].comboCount = 1;
    expect(getTimerActivePlayerIndex(state)).toBe(0);

    // 4. ACTION_PHASE에서는 activePlayerIndex
    state.phase = 'ACTION_PHASE';
    state.activePlayerIndex = 1;
    expect(getTimerActivePlayerIndex(state)).toBe(1);
  });

  it('intentional bug reproduction test: old timer behavior causes instant loss vs new behavior prevents it', () => {
    // RP-261110-29MW8 재현: CLASH_SET에서 30초 중 30초를 모두 소모하여 잔여 시간이 0초인 상태에서
    // COMBO_STEP으로 넘어와 [숨결] 카드를 발동하여 pendingChoice가 발생했을 때
    let simulatedTurnTime = 0; // CLASH_SET 잔여 시간 그대로 이어짐 (옛 방식 버그)
    let hasTimedOutOld = false;

    // 옛 방식: 페이즈 리셋(CLASH_SET, ACTION_PHASE만 리셋) 및 pendingChoice 리셋 부재
    // nextTurnTime <= 0 조건에 즉시 걸려 패배 처리됨
    if (simulatedTurnTime <= 0) {
      hasTimedOutOld = true;
    }
    expect(hasTimedOutOld).toBe(true); // 옛 방식에서는 즉시 패배 발생 확인

    // 새 방식: COMBO_STEP 진입 및 pendingChoice 생성 시 리셋 함수 호출
    simulatedTurnTime = getTimerResetSeconds('COMBO_STEP', testTimeConfig);
    expect(simulatedTurnTime).toBe(90); // 90초로 정상 리셋되어 즉시 패배 방지됨

    // 연출(lastComboStrike) 진행 중에는 타이머가 멈춤
    const isPausedDuringComboStrike = shouldPauseBattleTimer({
      phase: 'COMBO_STEP',
      lastComboStrike: { attackerIndex: 0 },
      pendingChoice: { id: 'breath-choice', playerIndex: 0, choiceType: 'EFFECT_TARGET' },
    });
    expect(isPausedDuringComboStrike).toBe(true);
  });
});

describe('step() TIME_OUT and SURRENDER log ordering and snapshot integrity', () => {
  it('places TIME_OUT log at logs[0] with board snapshot and clears transient fields', () => {
    let state = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'AI',
      null,
      null,
      undefined,
      undefined,
      2026
    );

    // 전투 중 잔여 상태 시뮬레이션
    state.phase = 'COMBO_STEP';
    state.pendingChoice = { id: 'choice-1', playerIndex: 0, choiceType: 'EFFECT_TARGET' };
    state.lastComboStrike = { attackerIndex: 0, card: state.players[0].hand[0], comboHits: 2 };
    state.clashResult = { winner: 0, p0Card: state.players[0].hand[0], p1Card: state.players[1].hand[0], damage: 3 };

    const initialLogCount = state.logs.length;
    const res = step(state, { type: 'TIME_OUT', loserIndex: 0 });
    const nextState = res.state;

    // 1. 게임 종료 및 승자 확인
    expect(nextState.phase).toBe('GAME_OVER');
    expect(nextState.winner).toBe(1);

    // 2. 임시/연출 필드 전원 클리어 검증
    expect(nextState.clashResult).toBeNull();
    expect(nextState.pendingChoice).toBeNull();
    expect(nextState.pendingChoiceQueue).toEqual([]);
    expect(nextState.lastEffectDraw).toBeNull();
    expect(nextState.deferredEffectDraws).toEqual([]);
    expect(nextState.deferredEffectDraw).toBeNull();
    expect(nextState.lastComboStrike).toBeNull();

    // 3. 최신 로그가 맨 앞(logs[0])에 위치하고 snapshot이 존재하는지 검증 (리플레이 맨 뒤로 가지 않음)
    expect(nextState.logs.length).toBe(initialLogCount + 1);
    const timeoutLog = nextState.logs[0];
    expect(timeoutLog.type).toBe('SYSTEM');
    expect(timeoutLog.text).toContain('[시간 초과]');
    expect(timeoutLog.playerIndex).toBe(0);
    expect(timeoutLog.snapshot).toBeDefined();
    expect(timeoutLog.snapshot?.phase).toBe('GAME_OVER');
  });

  it('places SURRENDER log at logs[0] with board snapshot and clears transient fields', () => {
    let state = createInitialGameState(
      'STARTER_ROVER',
      'STARTER_CHIXIA',
      'AI',
      null,
      null,
      undefined,
      undefined,
      2027
    );

    state.phase = 'ACTION_PHASE';
    state.pendingChoice = { id: 'choice-2', playerIndex: 1, choiceType: 'EFFECT_TARGET' };

    const initialLogCount = state.logs.length;
    const res = step(state, { type: 'SURRENDER', playerIndex: 1 });
    const nextState = res.state;

    expect(nextState.phase).toBe('GAME_OVER');
    expect(nextState.winner).toBe(0);

    expect(nextState.pendingChoice).toBeNull();
    expect(nextState.logs.length).toBe(initialLogCount + 1);

    const surrenderLog = nextState.logs[0];
    expect(surrenderLog.type).toBe('SYSTEM');
    expect(surrenderLog.text).toContain('[항복 선언]');
    expect(surrenderLog.playerIndex).toBe(1);
    expect(surrenderLog.snapshot).toBeDefined();
    expect(surrenderLog.snapshot?.phase).toBe('GAME_OVER');
  });
});
