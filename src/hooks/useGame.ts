import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, EffectDrawAnimation } from '../types/tcg';
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
  finishClashJudgment,
  continuePostClashOrBattlePhase,
  resolvePendingChoice,
  canPlayerExecuteCombo,
  checkGameOver,
  addLog,
  cloneGameState,
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
  const [gameState, rawSetGameState] = useState<GameState>(() =>
    createInitialGameState(p0PresetKey, p1PresetKey, initialGameMode, customDeck, p1CustomDeck)
  );

  // React 19 <StrictMode>는 setState(updater)의 updater(prev)를 2회(EagerState + Render Double Invoke) 호출하므로,
  // 동일 prev 참조에 대해 1회만 엔진 상태 전이를 실행하고 캐시된 결과(cachedNext)를 반환하여
  // 인플레이스 변이로 인한 연격 2회 동시 실행(2·3연격 스킵), 배틀 로그 누락, 덱 중복 셔플 버그를 원천 차단합니다.
  const setGameState = useCallback(
    (updater: GameState | ((prev: GameState) => GameState)) => {
      if (typeof updater === 'function') {
        let cachedPrev: GameState | null = null;
        let cachedNext: GameState | null = null;
        rawSetGameState((prev) => {
          if (cachedPrev === prev && cachedNext !== null) {
            return cachedNext;
          }
          cachedPrev = prev;
          cachedNext = updater(cloneGameState(prev));
          return cachedNext;
        });
      } else {
        rawSetGameState(updater);
      }
    },
    []
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
          firstPlayerIndex,
          firstTurnDrawCompleted: false,
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

  // 연격 연출 완료 후 lastComboStrike 초기화 및 치명타 피니시(GAME_OVER) 전환
  const clearLastComboStrike = useCallback(() => {
    setGameState((prev) => {
      if (!prev.lastComboStrike) return prev;
      let nextState = { ...prev, lastComboStrike: null };
      // 만약 어느 한 쪽의 체력이 0 이하인 결정타 상태라면, 연격 연출 확인이 끝났으므로 여기서 GAME_OVER 및 피니시로 진입!
      if (nextState.players[0].hp <= 0 || nextState.players[1].hp <= 0) {
        return checkGameOver(nextState);
      }
      return nextState;
    });
  }, []);

  // 효과 발동 팝업 닫힘 시 lastEffectEvent 초기화
  const clearLastEffectEvent = useCallback(() => {
    setGameState((prev) => (prev.lastEffectEvent ? { ...prev, lastEffectEvent: null } : prev));
  }, []);

  // 효과 드로우 및 패 비행 연출 완료 후 정리 및 후속 선택 모달 활성화
  const handleFinishEffectDraw = useCallback(() => {
    setGameState((prev) => {
      if (!prev.lastEffectDraw) return prev;
      if (
        !prev.clashResult &&
        !prev.lastComboStrike &&
        (prev.phase === 'GAME_OVER' || prev.players[0].hp <= 0 || prev.players[1].hp <= 0)
      ) {
        return checkGameOver({ ...prev, lastEffectDraw: null });
      }
      const chainedChoice = prev.lastEffectDraw.nextPendingChoice || null;

      // 체인된 선택(예: 파수인 Lv.1 드로우 직후 패 1장 버리기)과 기존 대기 중인 선택들을 무손실 병합
      const mergedChoices: import('../types/tcg').PendingChoice[] = [];
      const pushUniqueChoice = (ch: import('../types/tcg').PendingChoice | null | undefined) => {
        if (!ch) return;
        if (!mergedChoices.some((existing) => existing.id === ch.id)) {
          mergedChoices.push(ch);
        }
      };

      pushUniqueChoice(chainedChoice);
      pushUniqueChoice(prev.pendingChoice);
      for (const qItem of prev.pendingChoiceQueue || []) {
        pushUniqueChoice(qItem);
      }

      let remainingDraws = prev.deferredEffectDraws ? [...prev.deferredEffectDraws] : [];
      let nextDraw: EffectDrawAnimation | null = null;

      // 방금 끝난 드로우에 직결된 후속 선택(chainedChoice, 예: 버릴 카드 선택)이 없는 경우에만 다음 보류 드로우를 즉시 재생
      if (!chainedChoice && remainingDraws.length > 0) {
        nextDraw = remainingDraws.shift() || null;
      }

      const nextChoice = mergedChoices.length > 0 ? mergedChoices[0] : null;
      const nextQueue = mergedChoices.length > 1 ? mergedChoices.slice(1) : [];

      const newState: GameState = {
        ...prev,
        lastEffectDraw: nextDraw,
        deferredEffectDraws: remainingDraws,
        deferredEffectDraw: remainingDraws.length > 0 ? remainingDraws[0] : null,
        pendingChoice: nextChoice,
        pendingChoiceQueue: nextQueue,
      };

      if (
        !nextDraw &&
        !newState.pendingChoice &&
        newState.phase === 'CLASH_REVEAL' &&
        !newState.clashResult &&
        Boolean(newState.players[0].clashCard || newState.players[1].clashCard)
      ) {
        return finishClashJudgment(newState);
      }

      // 대결 판정(CLASH_REVEAL) 중 보류되었던 효과 드로우가 완료된 경우에만
      // 게임이 멈추지 않고 계속해서 연격 단계(COMBO_STEP) 또는 배틀 종료 단계로 안전하게 진행!
      // (이미 연격 단계(COMBO_STEP) 등 후속 페이즈에서 발생한 효과 드로우는 현재 페이즈를 정상 유지)
      if (!nextDraw && !newState.pendingChoice) {
        // 턴 시작(START_PHASE)에서 발동한 효과 드로우(예: 방랑자(여) Lv.2 1장 드로우) 확인 완료 시 -> 정규 드로우 단계(DRAW_PHASE)로 진입!
        if (newState.phase === 'START_PHASE') {
          return { ...newState, phase: 'DRAW_PHASE' };
        }
        if (newState.phase === 'CLASH_REVEAL' || (newState.phase as any) === 'CLASH_JUDGING') {
          return continuePostClashOrBattlePhase(newState);
        }
      }

      return newState;
    });
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
      !gameState.pendingChoice &&
      !gameState.lastEffectDraw
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

    // 플레이어가 효과 선택 발동 팝업(스캔, 드로우, 버리기 등), 효과 드로우 애니메이션, 연격 오버레이, 레벨업 연출을 진행 중일 때는 모든 AI 행동과 턴 진행을 일시 정지!
    if (
      isGameOver ||
      Boolean(gameState.pendingChoice) ||
      Boolean(gameState.lastEffectDraw) ||
      Boolean(gameState.lastComboStrike) ||
      Boolean(gameState.lastUpgrade)
    ) {
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

    // 2) AI 대결 카드 세트 단계 (공식 룰 604.1.1.2: 턴 플레이어가 먼저 세트!)
    const isAiTurnPlayer = gameState.activePlayerIndex === 1;
    const isTurnPlayerReady = gameState.players[gameState.activePlayerIndex].clashCardReady;
    const canAiSetClash = isAiTurnPlayer || isTurnPlayerReady;

    if (
      gameState.phase === 'CLASH_SET' &&
      gameState.players[1].isAi &&
      !gameState.players[1].clashCardReady &&
      canAiSetClash
    ) {
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
      }, isAiTurnPlayer ? 1500 : 900);
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
      // 화면에 이전 연격 참격 연출(lastComboStrike)이 재생 중이면 연출이 완전히 닫힐 때까지 다음 연격 대기!
      if (Boolean(gameState.lastComboStrike)) {
        return;
      }

      const p1HasCombo =
        Boolean(gameState.players[1].comboUnlimited) || (gameState.players[1].comboCount ?? 0) > 0;
      const p1CanCombo = p1HasCombo && canPlayerExecuteCombo(gameState.players[1]);

      if (p1CanCombo) {
        setIsAiThinking(true);
        const timer = setTimeout(() => {
          setGameState((prev) => {
            // 실행 직전에도 연격 오버레이가 아직 떠있으면 보류
            if (Boolean(prev.lastComboStrike)) return prev;

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
        }, 950);
        return () => {
          clearTimeout(timer);
          setIsAiThinking(false);
        };
      } else {
        // AI에게 남은 연격이 없거나 낼 수 있는 적색 카드가 없을 때 -> 연격 정상 종료!
        // (연격 오버레이가 완전히 닫힌 뒤 850ms의 여유를 두고 종료 페이즈 진입)
        setIsAiThinking(true);
        const timer = setTimeout(() => {
          setGameState((prev) => {
            if (prev.phase === 'COMBO_STEP' && prev.players[1].isAi) {
              return finishComboStep(prev, 1);
            }
            return prev;
          });
          setIsAiThinking(false);
        }, 850);
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
    gameState.lastUpgrade?.id,
    gameState.pendingChoice?.id,
    gameState.lastEffectDraw?.id,
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
    handleFinishEffectDraw,
  };
}
