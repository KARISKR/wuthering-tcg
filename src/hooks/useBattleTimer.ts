// src/hooks/useBattleTimer.ts
// [WP8-4] 배틀 타이머 및 Chess Clock 관리 훅
import { useState, useEffect, useRef } from 'react';
import { GameState, GamePhase, ActionCard } from '../types/tcg';
import type { TimeLimitConfig } from '../types/multiplayer';
import { multiplayerService } from '../services/multiplayerService';
import { canPlayerUseActionCard, getEffectiveCardCost } from '../engine/gameEngine';

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

export interface TimeoutForceAdvanceCallbacks {
  onResolvePendingChoice: (chosenCardIds: string[]) => void;
  onDrawCards: (playerIndex: 0 | 1) => void;
  onDecideClash: (startClash: boolean) => void;
  onSetClashCard: (playerIndex: 0 | 1, cardId: string | null, spentConcertoIds?: string[]) => void;
  onFinishCombo: (playerIndex: 0 | 1) => void;
  onDiscardOverflow: (playerIndex: 0 | 1, discardCardIds: string[]) => void;
  onCloseLocalModals?: () => void;
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
 * 공식 룰 604.1.1.2: CLASH_SET에서는 턴 플레이어가 먼저 세트해야 하므로 순차적 타이머 적용
 */
export function getTimerActivePlayerIndex(gameState: GameState): 0 | 1 {
  if (gameState.pendingChoice) {
    return gameState.pendingChoice.playerIndex;
  }
  if (gameState.phase === 'CLASH_SET') {
    const activeIdx = gameState.activePlayerIndex;
    const defenderIdx: 0 | 1 = activeIdx === 0 ? 1 : 0;
    if (!gameState.players[activeIdx].clashCardReady) {
      return activeIdx;
    }
    if (!gameState.players[defenderIdx].clashCardReady) {
      return defenderIdx;
    }
    return activeIdx;
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

/**
 * 타임오버 발생 시 패배 처리 대신 현재 행동/페이즈/턴을 강제 완료하여 다음 단계로 넘기는 순수 헬퍼 함수
 */
export function executeTimeoutForceAdvance(
  gameState: GameState,
  callbacks: TimeoutForceAdvanceCallbacks
): void {
  // 1) pendingChoice가 존재할 때 (효과 선택/확인 모달 대기 중 타임오버)
  if (gameState.pendingChoice) {
    const minSelect = gameState.pendingChoice.minSelect ?? 0;
    const autoChosenIds =
      minSelect > 0
        ? (gameState.pendingChoice.revealedCards || []).slice(0, minSelect).map((c) => c.id)
        : [];
    callbacks.onResolvePendingChoice(autoChosenIds);
    return;
  }

  // 2) DRAW_PHASE일 때 (드로우 대기 중 타임오버)
  if (gameState.phase === 'DRAW_PHASE') {
    callbacks.onDrawCards(gameState.activePlayerIndex);
    return;
  }

  // 3) ACTION_PHASE || CLASH_SELECT일 때 (메인 행동 단계 타임오버)
  if (gameState.phase === 'ACTION_PHASE' || (gameState.phase as string) === 'CLASH_SELECT') {
    callbacks.onCloseLocalModals?.();
    callbacks.onDecideClash(false);
    return;
  }

  // 4) CLASH_SET일 때 (대결 카드 세트 단계 타임오버)
  if (gameState.phase === 'CLASH_SET') {
    const activeIdx = gameState.activePlayerIndex;
    const defenderIdx: 0 | 1 = activeIdx === 0 ? 1 : 0;
    const activePlayer = gameState.players[activeIdx];
    const defenderPlayer = gameState.players[defenderIdx];

    // 턴 플레이어가 아직 세트하지 않은 경우: 가능한 액션 카드 탐색 후 세트, 없으면 패스(null)
    if (!activePlayer.clashCardReady) {
      let chosenCard: ActionCard | null = null;
      let spentConcertoIds: string[] = [];

      for (const card of activePlayer.hand) {
        if (canPlayerUseActionCard(activePlayer.slots, card, activePlayer.actionArea).canUse) {
          const effectiveCost = getEffectiveCardCost(activePlayer, card);
          if (activePlayer.concertoZone.length >= effectiveCost) {
            chosenCard = card;
            spentConcertoIds = activePlayer.concertoZone.slice(0, effectiveCost).map((c) => c.id);
            break;
          }
        }
      }

      if (chosenCard) {
        callbacks.onSetClashCard(activeIdx, chosenCard.id, spentConcertoIds);
      } else {
        callbacks.onSetClashCard(activeIdx, null);
      }
      return;
    }

    // 턴 플레이어는 이미 세트했고, 수비 플레이어가 아직 세트하지 않은 경우: 수비 플레이어 패스(null)로 즉시 오픈
    if (!defenderPlayer.clashCardReady) {
      callbacks.onSetClashCard(defenderIdx, null);
      return;
    }
    return;
  }

  // 5) COMBO_STEP일 때 (연격 단계 타임오버)
  if (gameState.phase === 'COMBO_STEP') {
    callbacks.onCloseLocalModals?.();
    const p0 = gameState.players[0];
    const p1 = gameState.players[1];
    const comboPlayerIndex: 0 | 1 =
      p0.comboUnlimited || p0.comboCount > 0
        ? 0
        : p1.comboUnlimited || p1.comboCount > 0
        ? 1
        : gameState.lastComboStrike
        ? gameState.lastComboStrike.attackerIndex
        : gameState.lastClashWinnerIndex === 0 || gameState.lastClashWinnerIndex === 1
        ? gameState.lastClashWinnerIndex
        : gameState.activePlayerIndex;
    callbacks.onFinishCombo(comboPlayerIndex);
    return;
  }

  // 6) DISCARD_OVERFLOW일 때 (엔드 페이즈 8장 초과 패 버리기 타임오버)
  if (gameState.phase === 'DISCARD_OVERFLOW') {
    const overflowIdx: 0 | 1 = gameState.players[0].hand.length > 8 ? 0 : 1;
    const hand = gameState.players[overflowIdx].hand;
    const excess = Math.max(0, hand.length - 8);
    const discardIds = hand.slice(-excess).map((c) => c.id);
    callbacks.onDiscardOverflow(overflowIdx, discardIds);
    return;
  }
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
  const lastActivePlayerClashReadyRef = useRef<boolean>(false);
  const timeStateRef = useRef({ currentTurnTime, p0TotalTime, p1TotalTime });
  timeStateRef.current = { currentTurnTime, p0TotalTime, p1TotalTime };

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
      const resetSec = getTimerResetSeconds(gameState.phase, timeLimitConfig);
      timeStateRef.current.currentTurnTime = resetSec;
      setCurrentTurnTime(resetSec);
    }
  }, [gameState.phase, gameState.turn, timeLimitConfig]);

  // 2. CLASH_SET 도중 턴 플레이어가 세트 완료 시 비턴 플레이어(수비자)에게 30초 리셋 부여
  const activeIdx = gameState.activePlayerIndex;
  const activeClashReady = gameState.players[activeIdx]?.clashCardReady ?? false;
  useEffect(() => {
    if (!timeLimitConfig.hasTimeLimit) return;
    if (gameState.phase === 'CLASH_SET') {
      if (activeClashReady && !lastActivePlayerClashReadyRef.current) {
        const resetSec = getTimerResetSeconds('CLASH_SET', timeLimitConfig);
        timeStateRef.current.currentTurnTime = resetSec;
        setCurrentTurnTime(resetSec);
      }
    }
    lastActivePlayerClashReadyRef.current = activeClashReady;
  }, [gameState.phase, activeClashReady, timeLimitConfig]);

  // 3. 새로운 pendingChoice 발생 시 타이머 리셋 (모달이 열리자마자 이전 단계의 잔여 0초로 즉시 패배 방지)
  const currentPendingChoiceId = gameState.pendingChoice?.id;
  useEffect(() => {
    if (!timeLimitConfig.hasTimeLimit) return;
    if (currentPendingChoiceId && currentPendingChoiceId !== lastPendingChoiceIdRef.current) {
      const resetSec = getTimerResetSeconds(gameState.phase, timeLimitConfig);
      timeStateRef.current.currentTurnTime = resetSec;
      setCurrentTurnTime(resetSec);
    }
    lastPendingChoiceIdRef.current = currentPendingChoiceId || null;
  }, [currentPendingChoiceId, gameState.phase, timeLimitConfig]);

  // 4. [멀티플레이 시간 제한] 호스트 1초 타이머 틱 루프 (공식 Chess Clock & 턴/대결/효과선택 카운트다운)
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
      const prevTurnTime = timeStateRef.current.currentTurnTime;
      const nextTurnTime = Math.max(0, prevTurnTime - 1);
      const activeTarget = getTimerActivePlayerIndex(gameState);
      let totalExpired = false;

      if (activeTarget === 0) {
        const prevP0 = timeStateRef.current.p0TotalTime;
        const nextP0 = Math.max(0, prevP0 - 1);
        if (prevP0 > 0 && nextP0 <= 0) {
          totalExpired = true;
        }
        timeStateRef.current.p0TotalTime = nextP0;
        setP0TotalTime(nextP0);
      } else {
        const prevP1 = timeStateRef.current.p1TotalTime;
        const nextP1 = Math.max(0, prevP1 - 1);
        if (prevP1 > 0 && nextP1 <= 0) {
          totalExpired = true;
        }
        timeStateRef.current.p1TotalTime = nextP1;
        setP1TotalTime(nextP1);
      }

      // 제한 시간 초과 판정: nextTurnTime <= 0 또는 방금 총 시간이 소진된 순간 1회만 호출
      if (nextTurnTime <= 0 || totalExpired) {
        const resetSec = getTimerResetSeconds(gameState.phase, timeLimitConfig);
        timeStateRef.current.currentTurnTime = resetSec;
        setCurrentTurnTime(resetSec);
        handleTriggerTimeOut(activeTarget);
        return;
      }

      timeStateRef.current.currentTurnTime = nextTurnTime;
      setCurrentTurnTime(nextTurnTime);
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
    activeClashReady,
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
