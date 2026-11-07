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

export function useSoloDualTurnSync({
  gameState,
  multiplayerRole,
  setControlledPlayerIndex,
}: UseSoloDualTurnSyncParams) {
  const p0 = gameState.players[0];
  const p1 = gameState.players[1];

  useEffect(() => {
    if (gameState.gameMode === 'SOLO_DUAL') {
      if (gameState.phase === 'ACTION_PHASE') {
        setControlledPlayerIndex(gameState.activePlayerIndex);
      } else if (gameState.phase === 'CLASH_SET') {
        if (p0.clashCardReady && !p1.clashCardReady) {
          setControlledPlayerIndex(1);
        } else if (!p0.clashCardReady) {
          setControlledPlayerIndex(0);
        }
      } else if (gameState.phase === 'COMBO_STEP') {
        if (p0.comboUnlimited || p0.comboCount > 0) setControlledPlayerIndex(0);
        else if (p1.comboUnlimited || p1.comboCount > 0) setControlledPlayerIndex(1);
      } else if (gameState.phase === 'DISCARD_OVERFLOW') {
        if (p0.hand.length > 8) setControlledPlayerIndex(0);
        else if (p1.hand.length > 8) setControlledPlayerIndex(1);
      }
    } else if (gameState.gameMode === 'MULTIPLAYER') {
      setControlledPlayerIndex(multiplayerRole === 'GUEST' ? 1 : 0);
    } else {
      setControlledPlayerIndex(0);
    }
  }, [
    gameState.gameMode,
    gameState.phase,
    gameState.activePlayerIndex,
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
