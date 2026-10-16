import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState } from '../types/tcg';
import {
  createInitialGameState,
  executeMulligan,
  executeDrawPhase,
  selectStartingLeader,
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
  resolveClash,
  resolvePendingChoice,
  canPlayerExecuteCombo,
  addLog,
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
  const [isDrawFlightActive, setIsDrawFlightActive] = useState(false);
  const isDrawingInProgress = useRef(false);

  // 새 게임 시작
  const restartGame = useCallback(
    (newP0Preset = p0PresetKey, newP1Preset = p1PresetKey, newMode = gameState.gameMode) => {
      setGameState(createInitialGameState(newP0Preset, newP1Preset, newMode, customDeck, p1CustomDeck));
      setIsAiThinking(false);
      setIsDrawFlightActive(false);
      isDrawingInProgress.current = false;
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

  // 0. 선공 주사위 결정 (LEADER_SELECT 또는 MULLIGAN 단계에서 적용)
  const handleSetInitiative = useCallback(
    (
      firstPlayerIndex: 0 | 1,
      roll0: number,
      roll1: number,
      choiceDetail?: { winnerIndex: 0 | 1; chosenOrder: 'FIRST' | 'SECOND' }
    ) => {
      setGameState((prev) => {
        if (prev.phase !== 'LEADER_SELECT' && prev.phase !== 'MULLIGAN') return prev;
        if (prev.logs.some((l) => l.id.startsWith('log-dice-'))) return prev;

        const firstPlayerName = prev.players[firstPlayerIndex].name;
        const diceWinnerIndex = choiceDetail?.winnerIndex ?? (roll0 > roll1 ? 0 : 1);
        const diceWinnerName = prev.players[diceWinnerIndex].name;
        const orderText = choiceDetail?.chosenOrder === 'SECOND' ? '후공' : '선공';

        const rollLog: import('../types/tcg').LogItem = {
          id: `log-dice-${Date.now()}`,
          turn: prev.turn,
          playerIndex: firstPlayerIndex,
          type: 'SYSTEM',
          text: `🎲 [선/후공 결정] ${prev.players[0].name}: ${roll0} vs ${prev.players[1].name}: ${roll1} ➔ [${diceWinnerName}] 주사위 승리! [${orderText}]을(를) 선택하여 [${firstPlayerName}] 1턴 선공 확정!`,
          timestamp: Date.now(),
        };
        return {
          ...prev,
          activePlayerIndex: firstPlayerIndex,
          logs: [rollLog, ...prev.logs],
        };
      });
    },
    []
  );

  // 0.5. 시작 리더 카드 선택 (LEADER_SELECT)
  const handleSelectStartingLeader = useCallback(
    (p0LeaderIdOrName: string, p1LeaderIdOrName?: string) => {
      setGameState((prev) => selectStartingLeader(prev, p0LeaderIdOrName, p1LeaderIdOrName));
    },
    []
  );

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

  // 1.5. 카드 드로우 실행 (수동 클릭 및 AI 자동 드로우 공용)
  const handleDrawCards = useCallback(
    (playerIndex?: 0 | 1) => {
      setGameState((prev) => {
        if (prev.phase !== 'DRAW_PHASE') return prev;
        const targetIdx = playerIndex ?? (prev.activePlayerIndex as 0 | 1);
        if (prev.activePlayerIndex !== targetIdx) return prev;

        const afterDraw = executeDrawPhase(prev);
        return {
          ...afterDraw,
          phase: 'ACTION_PHASE',
        };
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
  const handleSetClashCard = useCallback((playerIndex: 0 | 1, cardId: string | null, spentConcertoIds?: string[]) => {
    setGameState((prev) => {
      const res = setClashCard(prev, playerIndex, cardId, spentConcertoIds);
      return res.success ? res.newState : prev;
    });
  }, []);

  // 7. 대결 결과 확인 후 다음으로
  const handleProceedAfterClash = useCallback(() => {
    setGameState((prev) => proceedAfterClashReveal(prev));
  }, []);

  // 8. 연격(Combo) 공격
  const handleComboAttack = useCallback(
    (
      playerIndex: 0 | 1,
      cardId: string,
      spentConcertoIds?: string[],
      discardForBonusDmgId?: string,
      swapSupportSlot?: 'leftSupport' | 'rightSupport'
    ) => {
      setGameState((prev) => {
        const res = executeComboAttack(
          prev,
          playerIndex,
          cardId,
          spentConcertoIds,
          discardForBonusDmgId,
          swapSupportSlot
        );
        return res.success ? res.newState : prev;
      });
    },
    []
  );

  // 8-1. 선택 발동 효과 해결
  const handleResolvePendingChoice = useCallback((chosenCardIds: string[]) => {
    setGameState((prev) => resolvePendingChoice(prev, chosenCardIds));
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

  // 레벨업 연출 완료 후 lastUpgrade 초기화
  const clearLastUpgrade = useCallback(() => {
    setGameState((prev) => (prev.lastUpgrade ? { ...prev, lastUpgrade: null } : prev));
  }, []);

  // 연격 연출 완료 후 lastComboStrike 초기화
  const clearLastComboStrike = useCallback(() => {
    setGameState((prev) => (prev.lastComboStrike ? { ...prev, lastComboStrike: null } : prev));
  }, []);

  // 효과 발동 팝업 닫힘 시 lastEffectEvent 초기화
  const clearLastEffectEvent = useCallback(() => {
    setGameState((prev) => (prev.lastEffectEvent ? { ...prev, lastEffectEvent: null } : prev));
  }, []);

  // ==========================================
  // 드로우 단계 (DRAW_PHASE) 관리
  // - 플레이어 턴: 사용자가 덱을 직접 클릭할 때까지 DRAW_PHASE 유지
  // - AI 턴: 750ms 후 자동으로 AI 드로우 트리거
  // ==========================================
  useEffect(() => {
    if (gameState.phase !== 'DRAW_PHASE') {
      isDrawingInProgress.current = false;
      setIsDrawFlightActive(false);
    }
  }, [gameState.phase]);

  useEffect(() => {
    if (
      gameState.phase === 'DRAW_PHASE' &&
      gameState.activePlayerIndex === 1 &&
      gameState.players[1].isAi &&
      !isDrawingInProgress.current &&
      !gameState.pendingChoice
    ) {
      // CenterDrawOverlay가 800ms에 자동 연출을 트리거하고 카드를 패로 보낸 뒤 드로우를 완료합니다.
      // 본 타이머는 혹시 모를 오버레이 미작동 시의 안전 폴백(Watchdog)으로 4000ms로 설정합니다.
      const timer = setTimeout(() => {
        handleDrawCards(1);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, gameState.activePlayerIndex, gameState.players, gameState.pendingChoice, handleDrawCards]);

  // ==========================================
  // AI 봇 비동기 턴 처리 (레이스 컨디션 및 멈춤 방지)
  // ==========================================
  useEffect(() => {
    const isAiTurn = gameState.activePlayerIndex === 1 && gameState.players[1].isAi;
    const isGameOver = gameState.phase === 'GAME_OVER' || gameState.phase === 'MULLIGAN';

    // 플레이어가 효과 선택 발동 팝업(스캔, 드로우, 버리기 등)을 진행 중일 때는 모든 AI 행동과 턴 진행을 일시 정지!
    if (isGameOver || Boolean(gameState.pendingChoice)) {
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

    // 2-B) 양 플레이어 카드 세트 완료 후 전장 대치 연출 (900ms 대치 후 자동 오픈 및 판정)
    // 플레이어가 효과 선택 팝업 중이면 대결 판정을 백그라운드에서 절대 진행하지 않음!
    if (
      gameState.phase === 'CLASH_SET' &&
      gameState.players[0].clashCardReady &&
      gameState.players[1].clashCardReady &&
      !gameState.pendingChoice
    ) {
      const timer = setTimeout(() => {
        setGameState((prev) => {
          if (
            prev.phase === 'CLASH_SET' &&
            prev.players[0].clashCardReady &&
            prev.players[1].clashCardReady &&
            !prev.pendingChoice
          ) {
            return resolveClash(prev);
          }
          return prev;
        });
      }, 900);
      return () => {
        clearTimeout(timer);
      };
    }

    // 3) AI 연격 단계 (AI인 플레이어 1에게 연격 차례일 때)
    const isAiComboTurn =
      gameState.players[1].isAi &&
      (gameState.clashResult?.winnerIndex === 1 ||
        gameState.lastComboStrike?.attackerIndex === 1 ||
        Boolean(gameState.players[1].comboUnlimited) ||
        (gameState.players[1].comboCount ?? 0) > 0);

    const isUserComboTurn =
      !gameState.players[0].isAi &&
      (Boolean(gameState.players[0].comboUnlimited) || (gameState.players[0].comboCount ?? 0) > 0);

    if (gameState.phase === 'COMBO_STEP' && isAiComboTurn && !isUserComboTurn) {
      const p1HasCombo =
        Boolean(gameState.players[1].comboUnlimited) || (gameState.players[1].comboCount ?? 0) > 0;
      const p1CanCombo = p1HasCombo && canPlayerExecuteCombo(gameState.players[1]);

      if (p1CanCombo) {
        setIsAiThinking(true);
        const timer = setTimeout(() => {
          setGameState((prev) => {
            const stillHasCombo =
              Boolean(prev.players[1].comboUnlimited) || (prev.players[1].comboCount ?? 0) > 0;
            if (prev.phase === 'COMBO_STEP' && prev.players[1].isAi && stillHasCombo) {
              if (canPlayerExecuteCombo(prev.players[1])) {
                return runAiComboStep(prev, 1);
              } else {
                return finishComboStep(prev, 1);
              }
            }
            return prev;
          });
          setIsAiThinking(false);
        }, 1800);
        return () => {
          clearTimeout(timer);
          setIsAiThinking(false);
        };
      } else {
        // AI에게 남은 연격이 없거나 낼 수 있는 적색 카드가 없을 때 -> 연격 정상 종료!
        // (1350ms 연격 애니메이션 및 보이스가 완전히 끝난 뒤 450ms의 여유를 두고 종료 페이즈 진입)
        setIsAiThinking(true);
        const timer = setTimeout(() => {
          setGameState((prev) => {
            if (prev.phase === 'COMBO_STEP' && prev.players[1].isAi) {
              return finishComboStep(prev, 1);
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
    gameState.players[1].comboUnlimited,
    gameState.players[0].comboUnlimited,
    gameState.players[1].hand.length,
    gameState.players[0].hand.length,
    gameState.players[1].actionArea?.length,
    gameState.lastComboStrike?.id,
    gameState.pendingChoice?.id,
  ]);

  return {
    gameState,
    isAiThinking,
    restartGame,
    setGameMode,
    handleSetInitiative,
    handleSelectStartingLeader,
    handleMulligan,
    handleDrawCards,
    isDrawFlightActive,
    handleUpgrade,
    handleSwitchLeader,
    handleChargeConcerto,
    handleDecideClash,
    handleSetClashCard,
    handleProceedAfterClash,
    handleComboAttack,
    handleResolvePendingChoice,
    handleFinishCombo,
    handleDiscardOverflow,
    handleEndTurn,
    handleForceResolveClash,
    clearLastUpgrade,
    clearLastComboStrike,
    clearLastEffectEvent,
  };
}
