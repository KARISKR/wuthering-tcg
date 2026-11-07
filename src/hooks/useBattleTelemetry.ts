// src/hooks/useBattleTelemetry.ts
// [WP8-6] 경기 종료 리플레이 생성 및 텔레메트리 전송 훅 (GameBoard 슬림화)
import { useState, useEffect, useRef } from 'react';
import { GameState } from '../types/tcg';
import { GameAction } from '../engine/events';
import {
  BattleReplayData,
  createBattleReplayData,
  uploadPublicMultiplayerReplay,
  ReplayV2,
} from '../utils/replayManager';
import { CURRENT_GAME_VERSION } from '../data/gameVersion';
import { multiplayerService } from '../services/multiplayerService';
import { telemetryService } from '../services/telemetryService';
import { stateFingerprint, replayToEnd } from '../engine/replay';
import type { CustomDeckConfig } from '../types/tcg';
import type { GameStartArgs } from './useGame';

export interface UseBattleTelemetryParams {
  gameState: GameState;
  isMultiplayer: boolean;
  isHost: boolean;
  startArgsRef: React.MutableRefObject<GameStartArgs | null>;
  actionLogRef: React.MutableRefObject<GameAction[]>;
  customDeck: CustomDeckConfig | null;
  opponentDeck: CustomDeckConfig | null;
}

export function useBattleTelemetry({
  gameState,
  isMultiplayer,
  isHost,
  startArgsRef,
  actionLogRef,
  customDeck,
  opponentDeck,
}: UseBattleTelemetryParams) {
  const [currentMatchReplay, setCurrentMatchReplay] = useState<BattleReplayData | null>(null);
  const matchStartTimeRef = useRef<number>(0);
  const hasProcessedGameOverRef = useRef<boolean>(false);

  useEffect(() => {
    if (matchStartTimeRef.current === 0) {
      matchStartTimeRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (gameState.phase !== 'GAME_OVER' || gameState.winner === null) {
      if (hasProcessedGameOverRef.current) {
        hasProcessedGameOverRef.current = false;
        setCurrentMatchReplay(null);
      }
      return;
    }

    if (hasProcessedGameOverRef.current) return;
    hasProcessedGameOverRef.current = true;

    let v2: ReplayV2 | undefined;
    if (startArgsRef.current && (!isMultiplayer || isHost)) {
      v2 = {
        format: 2,
        engineVersion: CURRENT_GAME_VERSION,
        start: { ...startArgsRef.current },
        actions: [...actionLogRef.current],
        finalFingerprint: stateFingerprint(gameState),
      };

      if (import.meta.env.DEV) {
        try {
          const replayed = replayToEnd(v2);
          const replayedFp = stateFingerprint(replayed);
          if (replayedFp !== v2.finalFingerprint) {
            console.error('[ReplayV2] Fingerprint mismatch!', {
              expected: v2.finalFingerprint,
              actual: replayedFp,
            });
          }
        } catch (err) {
          console.error('[ReplayV2] Verification failed:', err);
        }
      }
    }

    const replayData = createBattleReplayData(
      gameState.winner as 0 | 1,
      gameState.players,
      gameState.logs,
      gameState.turn,
      gameState.gameMode,
      v2
    );
    setCurrentMatchReplay(replayData);

    // [텔레메트리] 멀티플레이 경기 종료 시 AI 학습용 배틀 데이터 자동 수집 및 전송
    if (isMultiplayer && isHost) {
      const startTime = matchStartTimeRef.current || Date.now();
      const durationSec = Math.max(1, (Date.now() - startTime) / 1000);
      const matchId = `match-${multiplayerService.sessionId || Date.now()}-${gameState.turn}`;

      telemetryService.sendMatchTelemetry(
        matchId,
        gameState,
        gameState.winner as 0 | 1,
        durationSec,
        customDeck,
        opponentDeck
      );

      if (replayData.totalTurns >= 2) {
        uploadPublicMultiplayerReplay(replayData).catch((err) => {
          console.warn('[Auto Upload Public Replay Error]:', err);
        });
      }
    }
  }, [
    gameState,
    isMultiplayer,
    isHost,
    startArgsRef,
    actionLogRef,
    customDeck,
    opponentDeck,
  ]);

  return { currentMatchReplay };
}
