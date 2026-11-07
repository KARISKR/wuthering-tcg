import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState } from '../types/tcg';
import {
  createInitialGameState,
  cloneGameState,
  canPlayerExecuteCombo,
  CustomDeckConfig,
} from '../engine/gameEngine';
import {
  selectAiClashCard,
} from '../engine/aiPlayer';
import { GameAction, GameEvent } from '../engine/events';
import { LocalSource } from '../battle/LocalSource';

export interface GameStartArgs {
  p0PresetKey: 'STARTER_ROVER' | 'STARTER_CHIXIA';
  p1PresetKey: 'STARTER_ROVER' | 'STARTER_CHIXIA';
  gameMode: 'AI' | 'SOLO_DUAL' | 'MULTIPLAYER';
  p0Deck: CustomDeckConfig | null;
  p1Deck: CustomDeckConfig | null;
  p0Name?: string;
  p1Name?: string;
  seed: number;
}

export function useGame(
  p0PresetKey: 'STARTER_ROVER' | 'STARTER_CHIXIA' = 'STARTER_ROVER',
  p1PresetKey: 'STARTER_ROVER' | 'STARTER_CHIXIA' = 'STARTER_CHIXIA',
  initialGameMode: 'AI' | 'SOLO_DUAL' | 'MULTIPLAYER' = 'AI',
  customDeck?: CustomDeckConfig | null,
  p1CustomDeck?: CustomDeckConfig | null,
  p0CustomName?: string,
  p1CustomName?: string,
  initialSavedGameState?: GameState | null
) {
  // [Step B] BattleSource: LocalSource 인스턴스 보유
  const [localSource] = useState<LocalSource>(() => {
    const initial = initialSavedGameState || createInitialGameState(
      p0PresetKey,
      p1PresetKey,
      initialGameMode,
      customDeck,
      p1CustomDeck,
      p0CustomName,
      p1CustomName
    );
    return new LocalSource(initial);
  });

  // [WP6/WP8] 시작 인자 보관 (리플레이 v2 기록용, initialSavedGameState 시작 시 null)
  const startArgsRef = useRef<GameStartArgs | null>(
    initialSavedGameState
      ? null
      : {
          p0PresetKey,
          p1PresetKey,
          gameMode: initialGameMode,
          p0Deck: customDeck || null,
          p1Deck: p1CustomDeck || null,
          p0Name: p0CustomName,
          p1Name: p1CustomName,
          seed: localSource.getState().seed ?? localSource.getState().rngSeed ?? 0,
        }
  );

  const [gameState, rawSetGameState] = useState<GameState>(() => localSource.getState());
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);

  // [WP7-2] 실행된 모든 액션 로그 및 최근 발생한 이벤트
  const actionLogRef = useRef<GameAction[]>([]);
  const lastEventsRef = useRef<GameEvent[]>([]);

  // [Step B] LocalSource 구독을 통해 상태 및 이벤트 발행 (액션당 정확히 1회)
  useEffect(() => {
    const unsub = localSource.subscribe((nextState, events) => {
      rawSetGameState(nextState);
      setLastEvents(events);
      lastEventsRef.current = events;
      actionLogRef.current = [...localSource.getActionLog()];
    });
    return unsub;
  }, [localSource]);

  const setGameState = useCallback(
    (updater: GameState | ((prev: GameState) => GameState)) => {
      if (typeof updater === 'function') {
        const next = updater(cloneGameState(localSource.getState()));
        localSource.reset(next);
      } else {
        localSource.reset(updater);
      }
    },
    [localSource]
  );

  // [WP7-2 / Step B] 액션 디스패치 일원화 함수
  const dispatch = useCallback(
    (action: GameAction) => {
      localSource.dispatch(action);
    },
    [localSource]
  );

  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isDrawFlightActive, setIsDrawFlightActive] = useState(false);
  const [isFxBlocking, setIsFxBlocking] = useState(false);
  const isDrawingInProgress = useRef(false);

  // 새 게임 시작
  const restartGame = useCallback(
    (newP0Preset = p0PresetKey, newP1Preset = p1PresetKey, newMode = gameState.gameMode) => {
      const fresh = createInitialGameState(
        newP0Preset,
        newP1Preset,
        newMode,
        customDeck,
        p1CustomDeck,
        p0CustomName,
        p1CustomName
      );
      localSource.reset(fresh);
      startArgsRef.current = {
        p0PresetKey: newP0Preset,
        p1PresetKey: newP1Preset,
        gameMode: newMode,
        p0Deck: customDeck || null,
        p1Deck: p1CustomDeck || null,
        p0Name: p0CustomName,
        p1Name: p1CustomName,
        seed: fresh.seed ?? fresh.rngSeed ?? 0,
      };
      actionLogRef.current = [];
      lastEventsRef.current = [];
      setLastEvents([]);
      setIsAiThinking(false);
      setIsDrawFlightActive(false);
      isDrawingInProgress.current = false;
    },
    [p0PresetKey, p1PresetKey, gameState.gameMode, customDeck, p1CustomDeck, p0CustomName, p1CustomName, localSource]
  );

  // 게임 모드 변경 (AI 대전 <-> 1인 2역 <-> 온라인 P2P)
  const setGameMode = useCallback((mode: 'AI' | 'SOLO_DUAL' | 'MULTIPLAYER') => {
    setGameState((prev) => ({
      ...prev,
      gameMode: mode,
      players: [
        prev.players[0],
        {
          ...prev.players[1],
          isAi: mode === 'AI',
          name: mode === 'AI' ? '상대 (AI 봇)' : mode === 'MULTIPLAYER' ? '상대 (온라인 참가자)' : '상대 (플레이어 2)',
        },
      ],
    }));
  }, [setGameState]);

  // 0. 선공 주사위 결정 (LEADER_SELECT 또는 MULLIGAN 단계에서 적용)
  const handleSetInitiative = useCallback(
    (
      firstPlayerIndex: 0 | 1,
      roll0: number,
      roll1: number,
      choiceDetail?: { winnerIndex: 0 | 1; chosenOrder: 'FIRST' | 'SECOND' }
    ) => {
      dispatch({
        type: 'SET_INITIATIVE',
        firstPlayerIndex,
        roll0,
        roll1,
        choiceDetail,
      });
    },
    [dispatch]
  );

  // 0.5. 시작 리더 카드 선택 (LEADER_SELECT)
  const handleSelectStartingLeader = useCallback(
    (p0LeaderIdOrName: string, p1LeaderIdOrName?: string) => {
      dispatch({
        type: 'SELECT_STARTING_LEADER',
        p0LeaderIdOrName,
        p1LeaderIdOrName,
      });
    },
    [dispatch]
  );

  // 1. 멀리건 확인 (p1DiscardIds 지원)
  const handleMulligan = useCallback(
    (p0DiscardIds: string[], p1DiscardIds?: string[]) => {
      dispatch({
        type: 'MULLIGAN',
        p0DiscardIds,
        p1DiscardIds,
      });
    },
    [dispatch]
  );

  // 1.5. 카드 드로우 실행 (수동 클릭 및 AI 자동 드로우 공용)
  const handleDrawCards = useCallback(
    (playerIndex?: 0 | 1) => {
      dispatch({
        type: 'DRAW_CARDS',
        playerIndex,
      });
    },
    [dispatch]
  );

  // 2. 캐릭터 레벨업
  const handleUpgrade = useCallback(
    (playerIndex: 0 | 1, targetSlot: 'leader' | 'leftSupport' | 'rightSupport', upgradeCardId: string, discardIds: string[]) => {
      dispatch({
        type: 'UPGRADE',
        playerIndex,
        targetSlot,
        upgradeCardId,
        discardIds,
      });
    },
    [dispatch]
  );

  // 3. 리더 교대
  const handleSwitchLeader = useCallback(
    (playerIndex: 0 | 1, targetSlot: 'leftSupport' | 'rightSupport') => {
      dispatch({
        type: 'SWITCH_LEADER',
        playerIndex,
        targetSlot,
      });
    },
    [dispatch]
  );

  // 4. 협주 충전
  const handleChargeConcerto = useCallback(
    (playerIndex: 0 | 1, cardId: string) => {
      dispatch({
        type: 'CHARGE_CONCERTO',
        playerIndex,
        cardId,
      });
    },
    [dispatch]
  );

  // 5. 대결 여부 선택 (Clash or Pass)
  const handleDecideClash = useCallback(
    (startClash: boolean) => {
      dispatch({
        type: 'DECIDE_CLASH',
        startClash,
      });
    },
    [dispatch]
  );

  // 6. 대결 카드 세트
  const handleSetClashCard = useCallback(
    (playerIndex: 0 | 1, cardId: string | null, spentConcertoIds?: string[]) => {
      dispatch({
        type: 'SET_CLASH_CARD',
        playerIndex,
        cardId,
        spentConcertoIds,
      });
    },
    [dispatch]
  );

  // 7. 대결 결과 확인 후 다음으로
  const handleProceedAfterClash = useCallback(() => {
    dispatch({ type: 'PROCEED_AFTER_CLASH' });
  }, [dispatch]);

  // 8. 연격(Combo) 공격
  const handleComboAttack = useCallback(
    (
      playerIndex: 0 | 1,
      cardId: string,
      spentConcertoIds?: string[],
      discardForBonusDmgId?: string,
      swapSupportSlot?: 'leftSupport' | 'rightSupport'
    ) => {
      dispatch({
        type: 'COMBO_ATTACK',
        playerIndex,
        cardId,
        spentConcertoIds,
        discardForBonusDmgId,
        swapSupportSlot,
      });
    },
    [dispatch]
  );

  // 8-1. 선택 발동 효과 해결
  const handleResolvePendingChoice = useCallback(
    (chosenCardIds: string[]) => {
      dispatch({
        type: 'RESOLVE_PENDING_CHOICE',
        chosenCardIds,
      });
    },
    [dispatch]
  );

  // 9. 연격 종료
  const handleFinishCombo = useCallback(
    (playerIndex: 0 | 1) => {
      dispatch({
        type: 'FINISH_COMBO',
        playerIndex,
      });
    },
    [dispatch]
  );

  // 10. 패 초과 버리기
  const handleDiscardOverflow = useCallback(
    (playerIndex: 0 | 1, discardIds: string[]) => {
      dispatch({
        type: 'DISCARD_OVERFLOW',
        playerIndex,
        discardIds,
      });
    },
    [dispatch]
  );

  // 11. 수동 턴 종료 (대결 패스 시 등)
  const handleEndTurn = useCallback(() => {
    dispatch({ type: 'END_TURN' });
  }, [dispatch]);

  // 11-B. 엔드 페이즈 마무리 및 다음 턴 전환 (END_PHASE 배너 종료 후 호출)
  const handleFinalizeEndPhase = useCallback(() => {
    dispatch({ type: 'FINALIZE_END_PHASE' });
  }, [dispatch]);

  // 11-C. 항복 선언
  const handleSurrender = useCallback(
    (playerIndex: 0 | 1) => {
      dispatch({ type: 'SURRENDER', playerIndex });
    },
    [dispatch]
  );

  // 11-D. 제한 시간 초과 패배 처리
  const handleTimeOut = useCallback(
    (loserIndex: 0 | 1, reason?: string) => {
      dispatch({ type: 'TIME_OUT', loserIndex, reason });
    },
    [dispatch]
  );

  // 대결 즉시 판정 (마스터듀얼식 수동 진행 및 대기 해제)
  const handleForceResolveClash = useCallback(() => {
    dispatch({ type: 'FORCE_RESOLVE_CLASH' });
  }, [dispatch]);

  // 레벨업 연출 완료 액션 디스패치
  const clearLastUpgrade = useCallback(() => {
    dispatch({ type: 'CLEAR_LAST_UPGRADE' });
  }, [dispatch]);

  // 연격 연출 완료 액션 디스패치
  const clearLastComboStrike = useCallback(() => {
    dispatch({ type: 'CLEAR_LAST_COMBO_STRIKE' });
  }, [dispatch]);

  // 효과 발동 팝업 닫힘 시 액션 디스패치
  const clearLastEffectEvent = useCallback(() => {
    dispatch({ type: 'CLEAR_LAST_EFFECT_EVENT' });
  }, [dispatch]);

  // 효과 드로우 및 패 비행 연출 완료 후 정리 및 후속 선택 모달 활성화
  const handleFinishEffectDraw = useCallback(
    (completedDrawId?: string) => {
      dispatch({
        type: 'FINISH_EFFECT_DRAW',
        completedDrawId,
      });
    },
    [dispatch]
  );

  // ==========================================
  // 드로우 단계 (DRAW_PHASE) 관리
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
      !isFxBlocking
    ) {
      const timer = setTimeout(() => {
        handleDrawCards(1);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, gameState.activePlayerIndex, gameState.players, gameState.pendingChoice, isFxBlocking, handleDrawCards]);

  // ==========================================
  // AI 봇 비동기 턴 처리 (레이스 컨디션 및 멈춤 방지)
  // ==========================================
  useEffect(() => {
    const isAiTurn = gameState.activePlayerIndex === 1 && gameState.players[1].isAi;
    const isGameOver = gameState.phase === 'GAME_OVER' || gameState.phase === 'MULLIGAN';

    if (
      isGameOver ||
      Boolean(gameState.pendingChoice) ||
      isFxBlocking
    ) {
      setIsAiThinking(false);
      return;
    }

    // 1) AI 액션 단계 (턴 시작 배너가 충분히 나온 뒤 2.0초 후 수 실행)
    if (isAiTurn && gameState.phase === 'ACTION_PHASE') {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        dispatch({ type: 'AI_ACTION_PHASE' });
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
        if (!gameState.players[1].clashCardReady) {
          const aiCardId = selectAiClashCard(gameState);
          dispatch({
            type: 'SET_CLASH_CARD',
            playerIndex: 1,
            cardId: aiCardId,
          });
        }
        setIsAiThinking(false);
      }, isAiTurnPlayer ? 1500 : 900);
      return () => {
        clearTimeout(timer);
        setIsAiThinking(false);
      };
    }

    // 2-B) 양 플레이어 카드 세트 완료 후 전장 대치 연출 (900ms 대치 후 자동 오픈 및 판정)
    if (
      gameState.phase === 'CLASH_SET' &&
      gameState.players[0].clashCardReady &&
      gameState.players[1].clashCardReady &&
      !gameState.pendingChoice
    ) {
      const timer = setTimeout(() => {
        dispatch({ type: 'RESOLVE_CLASH' });
      }, 900);
      return () => {
        clearTimeout(timer);
      };
    }

    // 3) AI 연격 단계 (AI인 플레이어 1에게 연격 차례일 때)
    const isAiComboTurn =
      gameState.players[1].isAi &&
      (gameState.clashResult?.winnerIndex === 1 ||
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
          dispatch({ type: 'AI_COMBO_STEP', playerIndex: 1 });
          setIsAiThinking(false);
        }, 950);
        return () => {
          clearTimeout(timer);
          setIsAiThinking(false);
        };
      } else {
        setIsAiThinking(true);
        const timer = setTimeout(() => {
          dispatch({ type: 'FINISH_COMBO', playerIndex: 1 });
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
        dispatch({ type: 'AI_DISCARD_OVERFLOW' });
        setIsAiThinking(false);
      }, 1400);
      return () => {
        clearTimeout(timer);
        setIsAiThinking(false);
      };
    }
  }, [
    gameState,
    isFxBlocking,
    dispatch,
  ]);

  return {
    gameState,
    setGameState,
    dispatch,
    battleSource: localSource,
    lastEvents,
    actionLogRef,
    lastEventsRef,
    startArgsRef,
    isAiThinking,
    setIsFxBlocking,
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
    handleFinalizeEndPhase,
    handleSurrender,
    handleTimeOut,
    handleForceResolveClash,
    clearLastUpgrade,
    clearLastComboStrike,
    clearLastEffectEvent,
    handleFinishEffectDraw,
  };
}
