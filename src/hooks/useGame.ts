import { useState, useEffect, useCallback } from 'react';
import { GameState } from '../types/tcg';
import {
  createInitialGameState,
  executeMulligan,
  upgradeCharacter,
  switchLeader,
  chargeConcerto,
  decideClash,
  setClashCard,
  proceedAfterClashReveal,
  executeComboAttack,
  finishComboStep,
  discardOverflowCards,
  executeEndPhase,
  forceResolveClash,
  CustomDeckConfig,
} from '../engine/gameEngine';
import {
  decideAiMulligan,
  runAiActionPhase,
  selectAiClashCard,
  runAiComboStep,
  runAiDiscardOverflow,
} from '../engine/aiPlayer';

export function useGame(
  p0PresetKey: 'STARTER_ROVER' | 'STARTER_CHIXIA' = 'STARTER_ROVER',
  p1PresetKey: 'STARTER_ROVER' | 'STARTER_CHIXIA' = 'STARTER_CHIXIA',
  initialGameMode: 'AI' | 'SOLO_DUAL' = 'AI',
  customDeck?: CustomDeckConfig | null,
  p1CustomDeck?: CustomDeckConfig | null
) {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState(p0PresetKey, p1PresetKey, initialGameMode, customDeck, p1CustomDeck)
  );

  const [isAiThinking, setIsAiThinking] = useState(false);

  // 새 게임 시작
  const restartGame = useCallback(
    (newP0Preset = p0PresetKey, newP1Preset = p1PresetKey, newMode = gameState.gameMode) => {
      setGameState(createInitialGameState(newP0Preset, newP1Preset, newMode, customDeck, p1CustomDeck));
      setIsAiThinking(false);
    },
    [p0PresetKey, p1PresetKey, gameState.gameMode, customDeck, p1CustomDeck]
  );

  // 게임 모드 변경 (AI 대전 <-> 1인 2역)
  const setGameMode = useCallback((mode: 'AI' | 'SOLO_DUAL') => {
    setGameState((prev) => ({
      ...prev,
      gameMode: mode,
      players: [
        prev.players[0],
        {
          ...prev.players[1],
          isAi: mode === 'AI',
          name: mode === 'AI' ? '상대 (AI 봇)' : '상대 (플레이어 2)',
        },
      ],
    }));
  }, []);

  // 1. 멀리건 확인
  const handleMulligan = useCallback(
    (p0DiscardIds: string[]) => {
      setGameState((prev) => {
        let p1DiscardIds: string[] = [];
        if (prev.players[1].isAi) {
          p1DiscardIds = decideAiMulligan(prev.players[1]);
        }
        return executeMulligan(prev, p0DiscardIds, p1DiscardIds);
      });
    },
    []
  );

  // 2. 캐릭터 레벨업
  const handleUpgrade = useCallback(
    (playerIndex: 0 | 1, targetSlot: 'leader' | 'leftSupport' | 'rightSupport', upgradeCardId: string, discardIds: string[]) => {
      setGameState((prev) => {
        const res = upgradeCharacter(prev, playerIndex, targetSlot, upgradeCardId, discardIds);
        return res.success ? res.newState : prev;
      });
    },
    []
  );

  // 3. 리더 교대
  const handleSwitchLeader = useCallback(
    (playerIndex: 0 | 1, targetSlot: 'leftSupport' | 'rightSupport') => {
      setGameState((prev) => {
        const res = switchLeader(prev, playerIndex, targetSlot);
        return res.success ? res.newState : prev;
      });
    },
    []
  );

  // 4. 협주 충전
  const handleChargeConcerto = useCallback(
    (playerIndex: 0 | 1, cardId: string) => {
      setGameState((prev) => {
        const res = chargeConcerto(prev, playerIndex, cardId);
        return res.success ? res.newState : prev;
      });
    },
    []
  );

  // 5. 대결 여부 선택 (Clash or Pass)
  const handleDecideClash = useCallback((startClash: boolean) => {
    setGameState((prev) => decideClash(prev, startClash));
  }, []);

  // 6. 대결 카드 세트
  const handleSetClashCard = useCallback((playerIndex: 0 | 1, cardId: string | null) => {
    setGameState((prev) => {
      const res = setClashCard(prev, playerIndex, cardId);
      return res.success ? res.newState : prev;
    });
  }, []);

  // 7. 대결 결과 확인 후 다음으로
  const handleProceedAfterClash = useCallback(() => {
    setGameState((prev) => proceedAfterClashReveal(prev));
  }, []);

  // 8. 연격(Combo) 공격
  const handleComboAttack = useCallback((playerIndex: 0 | 1, cardId: string) => {
    setGameState((prev) => {
      const res = executeComboAttack(prev, playerIndex, cardId);
      return res.success ? res.newState : prev;
    });
  }, []);

  // 9. 연격 종료
  const handleFinishCombo = useCallback((playerIndex: 0 | 1) => {
    setGameState((prev) => finishComboStep(prev, playerIndex));
  }, []);

  // 10. 패 초과 버리기
  const handleDiscardOverflow = useCallback((playerIndex: 0 | 1, discardIds: string[]) => {
    setGameState((prev) => {
      const res = discardOverflowCards(prev, playerIndex, discardIds);
      return res.success ? res.newState : prev;
    });
  }, []);

  // 11. 수동 턴 종료 (대결 패스 시 등)
  const handleEndTurn = useCallback(() => {
    setGameState((prev) => executeEndPhase(prev));
  }, []);

  // 대결 즉시 판정 (마스터듀얼식 수동 진행 및 대기 해제)
  const handleForceResolveClash = useCallback(() => {
    setGameState((prev) => forceResolveClash(prev));
  }, []);

  // ==========================================
  // AI 봇 비동기 턴 처리 (레이스 컨디션 및 멈춤 방지)
  // ==========================================
  useEffect(() => {
    const isAiTurn = gameState.activePlayerIndex === 1 && gameState.players[1].isAi;
    const isGameOver = gameState.phase === 'GAME_OVER' || gameState.phase === 'MULLIGAN';

    if (isGameOver) {
      setIsAiThinking(false);
      return;
    }

    // 1) AI 액션 단계 (턴 시작 배너가 충분히 나온 뒤 2.0초 후 수 실행)
    if (isAiTurn && gameState.phase === 'ACTION_PHASE') {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        setGameState((prev) => {
          if (prev.activePlayerIndex === 1 && prev.phase === 'ACTION_PHASE') {
            return runAiActionPhase(prev);
          }
          return prev;
        });
        setIsAiThinking(false);
      }, 2000);
      return () => {
        clearTimeout(timer);
        setIsAiThinking(false);
      };
    }

    // 2) AI 대결 카드 세트 단계 (배틀 페이즈 배너 이후 1.8초 동안 고민 후 세트)
    if (gameState.phase === 'CLASH_SET' && gameState.players[1].isAi && !gameState.players[1].clashCardReady) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        setGameState((prev) => {
          if (prev.phase === 'CLASH_SET' && !prev.players[1].clashCardReady) {
            const aiCardId = selectAiClashCard(prev);
            let res = setClashCard(prev, 1, aiCardId);
            if (!res.success) {
              res = setClashCard(prev, 1, null);
            }
            return res.success ? res.newState : prev;
          }
          return prev;
        });
        setIsAiThinking(false);
      }, 1800);
      return () => {
        clearTimeout(timer);
        setIsAiThinking(false);
      };
    }

    // 3) AI 연격 단계 (연격 콤보 연출을 충분히 볼 수 있도록 1.8초 템포)
    if (gameState.phase === 'COMBO_STEP' && gameState.players[1].isAi) {
      if (gameState.players[1].comboCount > 0) {
        setIsAiThinking(true);
        const timer = setTimeout(() => {
          setGameState((prev) => {
            if (prev.phase === 'COMBO_STEP' && prev.players[1].comboCount > 0) {
              return runAiComboStep(prev);
            }
            return prev;
          });
          setIsAiThinking(false);
        }, 1800);
        return () => {
          clearTimeout(timer);
          setIsAiThinking(false);
        };
      } else if (gameState.players[0].comboCount === 0) {
        setGameState((prev) => finishComboStep(prev, 1));
      }
    }

    // 4) AI 패 초과 단계 (1.4초 후 버리기)
    if (gameState.phase === 'DISCARD_OVERFLOW' && isAiTurn) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        setGameState((prev) => {
          if (prev.phase === 'DISCARD_OVERFLOW') {
            return runAiDiscardOverflow(prev);
          }
          return prev;
        });
        setIsAiThinking(false);
      }, 1400);
      return () => {
        clearTimeout(timer);
        setIsAiThinking(false);
      };
    }
  }, [
    gameState.phase,
    gameState.activePlayerIndex,
    gameState.players[0].clashCardReady,
    gameState.players[1].clashCardReady,
    gameState.players[1].isAi,
    gameState.players[1].comboCount,
    gameState.players[0].comboCount,
  ]);

  return {
    gameState,
    isAiThinking,
    restartGame,
    setGameMode,
    handleMulligan,
    handleUpgrade,
    handleSwitchLeader,
    handleChargeConcerto,
    handleDecideClash,
    handleSetClashCard,
    handleProceedAfterClash,
    handleComboAttack,
    handleFinishCombo,
    handleDiscardOverflow,
    handleEndTurn,
    handleForceResolveClash,
  };
}
