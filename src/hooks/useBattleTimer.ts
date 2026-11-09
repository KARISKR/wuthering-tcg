// src/hooks/useBattleTimer.ts
// [WP8-4] 배틀 타이머 및 Chess Clock 관리 훅
import { useState, useEffect, useRef } from 'react';
import { GameState, GamePhase } from '../types/tcg';
import type { TimeLimitConfig } from '../types/multiplayer';
import { multiplayerService } from '../services/multiplayerService';

export function formatChessTime(totalSec: number): string {
  const m = Math.floor(Math.max(0, totalSec) / 60);
  const s = Math.max(0, totalSec) % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface SavedTimerSession {
  currentTurnTime?: number;
  p0TotalTime?: number;
  p1TotalTime?: number;
}

export interface UseBattleTimerProps {
  isMultiplayer: boolean;
  isHost: boolean;
  timeLimitConfig: TimeLimitConfig;
  gameState: GameState;
  isMultiplayerDisconnected: boolean;
  isInitiativeRolling: boolean;
  isFxBlocking: boolean;
  isCurrentControlledTurn: boolean;
  handleTriggerTimeOut: (loserIndex: 0 | 1) => void;
  initialSavedSession?: SavedTimerSession | null;
}

export interface ShouldPauseBattleTimerParams {
  phase: GamePhase;
  hasTimeLimit?: boolean;
  isMultiplayer?: boolean;
  isHost?: boolean;
  isMultiplayerDisconnected?: boolean;
  isInitiativeRolling?: boolean;
  isFxBlocking?: boolean;
  clashResult?: unknown | null;
  lastComboStrike?: unknown | null;
  lastEffectDraw?: unknown | null;
  pendingChoice?: unknown | null;
  p0ClashCardReady?: boolean;
  p1ClashCardReady?: boolean;
}

/**
 * 페이즈별 타이머 리셋 기준 초를 반환하는 순수 헬퍼 함수
 */
export function getTimerResetSeconds(
  phase: GamePhase,
  timeLimitConfig: TimeLimitConfig
): number {
  if (phase === 'CLASH_SET') {
    return timeLimitConfig.clashTimeSec || 30;
  }
  return timeLimitConfig.turnTimeSec || 90;
}

/**
 * 타이머 카운트다운을 일시정지해야 하는지 판정하는 순수 헬퍼 함수
 */
export function shouldPauseBattleTimer(params: ShouldPauseBattleTimerParams): boolean {
  if (params.phase === 'GAME_OVER') return true;

  // 비대결/준비 단계
  if (
    params.phase === 'LEADER_SELECT' ||
    params.phase === 'MULLIGAN'
  ) {
    return true;
  }

  // 연결 끊김 또는 이니셔티브 주사위 굴리는 중
  if (params.isMultiplayerDisconnected || params.isInitiativeRolling) {
    return true;
  }

  // pendingChoice 유무와 무관하게 연출 중에는 타이머 즉시 정지 (EffectChoiceModal도 연출 중에는 화면에 뜨지 않음)
  if (
    params.isFxBlocking ||
    Boolean(params.clashResult) ||
    Boolean(params.lastComboStrike) ||
    Boolean(params.lastEffectDraw)
  ) {
    return true;
  }

  // 유저 입력 대기가 아닌 자동 진행/연출 대기 단계 (pendingChoice가 없을 때)
  if (!params.pendingChoice) {
    if (
      params.phase === 'START_PHASE' ||
      params.phase === 'END_PHASE' ||
      params.phase === 'CLASH_REVEAL'
    ) {
      return true;
    }
    // 격돌 세팅 양측 완료 상태
    if (
      params.phase === 'CLASH_SET' &&
      params.p0ClashCardReady &&
      params.p1ClashCardReady
    ) {
      return true;
    }
  }

  return false;
}

/**
 * 현재 페이즈 및 상태에서 제한 시간을 차감해야 하는 대상 플레이어를 판정하는 순수 헬퍼 함수
 */
export function getTimerActivePlayerIndex(gameState: GameState): 0 | 1 | 'BOTH' {
  if (gameState.pendingChoice) {
    return gameState.pendingChoice.playerIndex;
  }
  if (gameState.phase === 'CLASH_SET') {
    const p0Ready = gameState.players[0].clashCardReady;
    const p1Ready = gameState.players[1].clashCardReady;
    if (!p0Ready && !p1Ready) return 'BOTH';
    if (!p0Ready) return 0;
    if (!p1Ready) return 1;
    return gameState.activePlayerIndex;
  }
  if (gameState.phase === 'COMBO_STEP') {
    const p0 = gameState.players[0];
    const p1 = gameState.players[1];
    return p0.comboUnlimited || p0.comboCount > 0
      ? 0
      : p1.comboUnlimited || p1.comboCount > 0
      ? 1
      : gameState.lastComboStrike
      ? gameState.lastComboStrike.attackerIndex
      : gameState.lastClashWinnerIndex === 0 || gameState.lastClashWinnerIndex === 1
      ? gameState.lastClashWinnerIndex
      : gameState.activePlayerIndex;
  }
  return gameState.activePlayerIndex;
}

export function useBattleTimer({
  isMultiplayer,
  isHost,
  timeLimitConfig,
  gameState,
  isMultiplayerDisconnected,
  isInitiativeRolling,
  isFxBlocking,
  isCurrentControlledTurn: _isCurrentControlledTurn,
  handleTriggerTimeOut,
  initialSavedSession,
}: UseBattleTimerProps) {
  const [currentTurnTime, setCurrentTurnTime] = useState<number>(() => {
    return initialSavedSession?.currentTurnTime ?? timeLimitConfig.turnTimeSec ?? 90;
  });

  const [p0TotalTime, setP0TotalTime] = useState<number>(() => {
    return initialSavedSession?.p0TotalTime ?? multiplayerService.p0TotalTime ?? 300;
  });

  const [p1TotalTime, setP1TotalTime] = useState<number>(() => {
    return initialSavedSession?.p1TotalTime ?? multiplayerService.p1TotalTime ?? 300;
  });

  const lastPendingChoiceIdRef = useRef<string | null>(null);

  // 1. 턴 / 페이즈 전환 시 개별 턴 타이머 리셋
  useEffect(() => {
    if (!timeLimitConfig.hasTimeLimit) return;
    if (
      gameState.phase === 'CLASH_SET' ||
      gameState.phase === 'DRAW_PHASE' ||
      gameState.phase === 'ACTION_PHASE' ||
      gameState.phase === 'CLASH_REVEAL' ||
      gameState.phase === 'COMBO_STEP' ||
      gameState.phase === 'DISCARD_OVERFLOW'
    ) {
      setCurrentTurnTime(getTimerResetSeconds(gameState.phase, timeLimitConfig));
    }
  }, [gameState.phase, gameState.turn, timeLimitConfig]);

  // 2. 새로운 pendingChoice 발생 시 타이머 리셋 (모달이 열리자마자 이전 단계의 잔여 0초로 즉시 패배 방지)
  const currentPendingChoiceId = gameState.pendingChoice?.id;
  useEffect(() => {
    if (!timeLimitConfig.hasTimeLimit) return;
    if (currentPendingChoiceId && currentPendingChoiceId !== lastPendingChoiceIdRef.current) {
      setCurrentTurnTime(getTimerResetSeconds(gameState.phase, timeLimitConfig));
    }
    lastPendingChoiceIdRef.current = currentPendingChoiceId || null;
  }, [currentPendingChoiceId, gameState.phase, timeLimitConfig]);

  // 3. [멀티플레이 시간 제한] 호스트 1초 타이머 틱 루프 (공식 Chess Clock & 턴/대결/효과선택 카운트다운)
  useEffect(() => {
    if (!isMultiplayer || !isHost || !timeLimitConfig.hasTimeLimit) return;

    const isPaused = shouldPauseBattleTimer({
      phase: gameState.phase,
      isMultiplayerDisconnected,
      isInitiativeRolling,
      isFxBlocking,
      clashResult: gameState.clashResult,
      lastComboStrike: gameState.lastComboStrike,
      lastEffectDraw: gameState.lastEffectDraw,
      pendingChoice: gameState.pendingChoice,
      p0ClashCardReady: gameState.players[0]?.clashCardReady,
      p1ClashCardReady: gameState.players[1]?.clashCardReady,
    });

    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentTurnTime((prevTurnTime) => {
        const nextTurnTime = Math.max(0, prevTurnTime - 1);
        const activeTarget = getTimerActivePlayerIndex(gameState);

        if (activeTarget === 'BOTH') {
          if (!gameState.players[0].clashCardReady) {
            setP0TotalTime((prev) => {
              const nextP0 = Math.max(0, prev - 1);
              if (nextP0 <= 0) handleTriggerTimeOut(0);
              return nextP0;
            });
          }
          if (!gameState.players[1].clashCardReady) {
            setP1TotalTime((prev) => {
              const nextP1 = Math.max(0, prev - 1);
              if (nextP1 <= 0) handleTriggerTimeOut(1);
              return nextP1;
            });
          }
        } else if (activeTarget === 0) {
          setP0TotalTime((prev) => {
            const nextP0 = Math.max(0, prev - 1);
            if (nextP0 <= 0) handleTriggerTimeOut(0);
            return nextP0;
          });
        } else {
          setP1TotalTime((prev) => {
            const nextP1 = Math.max(0, prev - 1);
            if (nextP1 <= 0) handleTriggerTimeOut(1);
            return nextP1;
          });
        }

        if (nextTurnTime <= 0) {
          if (activeTarget === 'BOTH') {
            if (!gameState.players[0].clashCardReady && gameState.players[1].clashCardReady) {
              handleTriggerTimeOut(0);
            } else if (gameState.players[0].clashCardReady && !gameState.players[1].clashCardReady) {
              handleTriggerTimeOut(1);
            } else {
              handleTriggerTimeOut(gameState.activePlayerIndex);
            }
          } else {
            handleTriggerTimeOut(activeTarget);
          }
        }

        return nextTurnTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isMultiplayer,
    isHost,
    timeLimitConfig,
    gameState.phase,
    gameState.turn,
    gameState.activePlayerIndex,
    currentPendingChoiceId,
    gameState.players[0]?.clashCardReady,
    gameState.players[1]?.clashCardReady,
    gameState.players[0]?.comboCount,
    gameState.players[1]?.comboCount,
    gameState.players[0]?.comboUnlimited,
    gameState.players[1]?.comboUnlimited,
    gameState.lastComboStrike,
    gameState.lastEffectDraw,
    gameState.lastClashWinnerIndex,
    isMultiplayerDisconnected,
    isInitiativeRolling,
    isFxBlocking,
    gameState.clashResult,
    handleTriggerTimeOut,
  ]);

  // 호스트가 게스트에게 주기적으로 시간 동기화 브로드캐스트
  useEffect(() => {
    if (!isMultiplayer || !isHost || !timeLimitConfig.hasTimeLimit) return;
    multiplayerService.send({
      type: 'TIME_SYNC',
      p0TotalTime,
      p1TotalTime,
      currentTurnTime,
      activePlayerIndex: gameState.activePlayerIndex,
    });
  }, [isMultiplayer, isHost, timeLimitConfig.hasTimeLimit, p0TotalTime, p1TotalTime, currentTurnTime, gameState.activePlayerIndex]);

  return {
    currentTurnTime,
    setCurrentTurnTime,
    p0TotalTime,
    setP0TotalTime,
    p1TotalTime,
    setP1TotalTime,
    formatChessTime,
  };
}
