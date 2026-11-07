// src/hooks/useBattleTimer.ts
// [WP8-4] 배틀 타이머 및 Chess Clock 관리 훅
import { useState, useEffect } from 'react';
import { GameState } from '../types/tcg';
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

  // 턴 / 페이즈 전환 시 개별 턴 타이머 리셋
  useEffect(() => {
    if (!timeLimitConfig.hasTimeLimit) return;
    if (gameState.phase === 'CLASH_SET') {
      setCurrentTurnTime(timeLimitConfig.clashTimeSec || 30);
    } else if (gameState.phase === 'ACTION_PHASE') {
      setCurrentTurnTime(timeLimitConfig.turnTimeSec || 90);
    }
  }, [gameState.phase, gameState.turn, timeLimitConfig]);

  // [멀티플레이 시간 제한] 호스트 1초 타이머 틱 루프 (공식 Chess Clock & 턴/대결/효과선택 카운트다운)
  useEffect(() => {
    if (!isMultiplayer || !isHost || !timeLimitConfig.hasTimeLimit) return;
    if (gameState.phase === 'GAME_OVER') return;

    if (
      gameState.phase === 'LEADER_SELECT' ||
      gameState.phase === 'MULLIGAN' ||
      (gameState.phase === 'START_PHASE' && !gameState.pendingChoice)
    ) {
      return;
    }

    if (isMultiplayerDisconnected || isInitiativeRolling) {
      return;
    }

    if (!gameState.pendingChoice) {
      if (
        isFxBlocking ||
        (gameState.clashResult && gameState.phase !== 'CLASH_REVEAL')
      ) {
        return;
      }
    }

    const timer = setInterval(() => {
      setCurrentTurnTime((prevTurnTime) => {
        const nextTurnTime = Math.max(0, prevTurnTime - 1);

        if (gameState.pendingChoice) {
          const choosingIdx = gameState.pendingChoice.playerIndex;
          if (choosingIdx === 0) {
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
        } else if (gameState.phase === 'CLASH_SET') {
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
        } else if (gameState.phase === 'ACTION_PHASE') {
          const activeIdx = gameState.activePlayerIndex;
          if (activeIdx === 0) {
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
        }

        if (nextTurnTime <= 0) {
          if (gameState.pendingChoice) {
            handleTriggerTimeOut(gameState.pendingChoice.playerIndex);
          } else if (gameState.phase === 'CLASH_SET') {
            if (!gameState.players[0].clashCardReady && gameState.players[1].clashCardReady) {
              handleTriggerTimeOut(0);
            } else if (gameState.players[0].clashCardReady && !gameState.players[1].clashCardReady) {
              handleTriggerTimeOut(1);
            } else {
              handleTriggerTimeOut(gameState.activePlayerIndex);
            }
          } else if (gameState.phase === 'ACTION_PHASE') {
            handleTriggerTimeOut(gameState.activePlayerIndex);
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
    gameState.pendingChoice,
    gameState.players[0]?.clashCardReady,
    gameState.players[1]?.clashCardReady,
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
