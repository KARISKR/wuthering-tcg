// src/hooks/useSoloDualTurnSync.ts
// [WP8-6] 1인 2역 (SOLO_DUAL) 모드 페이즈별 턴/시점 자동 전환 훅 (GameBoard 슬림화)
import { useEffect } from 'react';
import { GameState } from '../types/tcg';
import type { MultiplayerRole } from '../types/multiplayer';

export interface UseSoloDualTurnSyncParams {
  gameState: GameState;
  multiplayerRole: MultiplayerRole | null | undefined;
  setControlledPlayerIndex: React.Dispatch<React.SetStateAction<0 | 1>>;
}

/**
 * 1인 2역(SOLO_DUAL) 또는 멀티플레이 시 현재 조작해야 할 플레이어 인덱스를 계산하는 순수 함수
 */
export function computeSoloDualControlledPlayerIndex(
  gameState: GameState,
  multiplayerRole?: MultiplayerRole | null
): 0 | 1 | undefined {
  if (gameState.gameMode === 'SOLO_DUAL') {
    // 1. 선택 대기 모달이 떠 있으면 해당 선택 주체 플레이어로 즉시 시점 전환
    if (gameState.pendingChoice) {
      return gameState.pendingChoice.playerIndex;
    }
    // 2. 드로우, 액션, 엔드 페이즈는 현재 턴 플레이어로 자동 동기화
    if (
      gameState.phase === 'DRAW_PHASE' ||
      gameState.phase === 'ACTION_PHASE' ||
      gameState.phase === 'END_PHASE'
    ) {
      return gameState.activePlayerIndex;
    }
    // 3. 격돌 세팅 단계: P0가 먼저 세팅했으면 P1 차례로 전환, 아직 P0가 안 했으면 P0
    if (gameState.phase === 'CLASH_SET') {
      const p0 = gameState.players[0];
      const p1 = gameState.players[1];
      if (p0.clashCardReady && !p1.clashCardReady) {
        return 1;
      }
      if (!p0.clashCardReady) {
        return 0;
      }
    } else if (gameState.phase === 'COMBO_STEP') {
      const p0 = gameState.players[0];
      const p1 = gameState.players[1];
      if (p0.comboUnlimited || p0.comboCount > 0) return 0;
      if (p1.comboUnlimited || p1.comboCount > 0) return 1;
    } else if (gameState.phase === 'DISCARD_OVERFLOW') {
      const p0 = gameState.players[0];
      const p1 = gameState.players[1];
      if (p0.hand.length > 8) return 0;
      if (p1.hand.length > 8) return 1;
    }
    return undefined;
  }
  if (gameState.gameMode === 'MULTIPLAYER') {
    return multiplayerRole === 'GUEST' ? 1 : 0;
  }
  return 0;
}

export function useSoloDualTurnSync({
  gameState,
  multiplayerRole,
  setControlledPlayerIndex,
}: UseSoloDualTurnSyncParams) {
  const p0 = gameState.players[0];
  const p1 = gameState.players[1];

  useEffect(() => {
    const target = computeSoloDualControlledPlayerIndex(gameState, multiplayerRole);
    if (target !== undefined) {
      setControlledPlayerIndex(target);
    }
  }, [
    gameState.gameMode,
    gameState.phase,
    gameState.activePlayerIndex,
    Boolean(gameState.pendingChoice),
    gameState.pendingChoice?.playerIndex,
    p0.clashCardReady,
    p1.clashCardReady,
    p0.comboCount,
    p1.comboCount,
    p0.comboUnlimited,
    p1.comboUnlimited,
    p0.hand.length,
    p1.hand.length,
    multiplayerRole,
    setControlledPlayerIndex,
  ]);
}

