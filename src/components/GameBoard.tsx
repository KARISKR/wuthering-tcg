// src/components/GameBoard.tsx
// [WP8] 메인 대전 게임 보드 (Zustand 상태 관리, 뷰포트/레이아웃 분리 컴포넌트)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CharacterCard,
  ElementType,
  ActionCard,
  CustomDeckConfig,
  getElementKr,
} from '../types/tcg';
import type { MultiplayerRole, TimeLimitConfig, MultiplayerSessionData } from '../types/multiplayer';
import { multiplayerService } from '../services/multiplayerService';
import {
  canPlayerUseActionCard,
  canPlayerExecuteCombo,
  getEffectiveCardCost,
} from '../engine/gameEngine';
import { formatEffectText } from '../utils/formatEffectText';
import { getOfficialCardByCode } from '../data/officialCards';
import { useGame } from '../hooks/useGame';
import {
  useBattleTimer,
  formatChessTime,
  executeTimeoutForceAdvance,
  type TimeoutForceAdvanceCallbacks,
} from '../hooks/useBattleTimer';
import { useMultiplayerBattle } from '../hooks/useMultiplayerBattle';
import { useBattleAudio } from '../hooks/useBattleAudio';
import { useBattleViewport } from '../hooks/useBattleViewport';
import { useBattleActions } from '../hooks/useBattleActions';
import { useBattleTelemetry } from '../hooks/useBattleTelemetry';
import { useSoloDualTurnSync } from '../hooks/useSoloDualTurnSync';
import { useBattlePreload } from '../hooks/useBattlePreload';
import { useBattleLayoutProps } from '../hooks/useBattleLayoutProps';
import {
  useBattleStore,
  BattleStoreProvider,
  createBattleStore,
  shallowEqual,
  selectComboPlayerIndex,
  selectIsAiComboInProgress,
} from '../battle/store';
import { FxQueueHost } from '../battle/fxQueue';
import { BattleLayout } from './battle/BattleLayout';
import { BattleOverlayHost } from './battle/BattleOverlayHost';
import type { BattleReplayData } from '../utils/replayManager';

interface GameBoardProps {
  onExitToLobby?: () => void;
  onPlayBattleReplay?: (replay: BattleReplayData) => void;
  p0PresetKey?: 'STARTER_ROVER' | 'STARTER_CHIXIA';
  p1PresetKey?: 'STARTER_ROVER' | 'STARTER_CHIXIA';
  customDeck?: CustomDeckConfig | null;
  opponentDeck?: CustomDeckConfig | null;
  initialMode?: 'AI' | 'SOLO_DUAL' | 'MULTIPLAYER';
  multiplayerRole?: MultiplayerRole | null;
  isTutorialMode?: boolean;
  initialSavedSession?: MultiplayerSessionData | null;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  onExitToLobby,
  onPlayBattleReplay,
  p0PresetKey = 'STARTER_ROVER',
  p1PresetKey = 'STARTER_CHIXIA',
  customDeck = null,
  opponentDeck = null,
  initialMode = 'AI',
  multiplayerRole: initialMultiplayerRole = null,
  isTutorialMode = false,
  initialSavedSession,
}) => {
  const {
    gameState,
    setGameState,
    battleSource,
    lastEvents,
    handleDrawCards: engineDrawCards,
    handleSelectStartingLeader: engineSelectStartingLeader,
    handleMulligan: engineMulligan,
    handleUpgrade: engineUpgrade,
    handleSetClashCard: engineSetClashCard,
    handleComboAttack: engineComboAttack,
    handleFinishCombo: engineFinishCombo,
    handleProceedAfterClash: engineProceedAfterClash,
    handleResolvePendingChoice: engineResolvePendingChoice,
    handleFinalizeEndPhase,
    handleFinishEffectDraw: engineFinishEffectDraw,
    handleSurrender: engineSurrender,
    handleTimeOut: engineTimeOut,
    handleSetInitiative,
    setGameMode,
    handleSwitchLeader: engineSwitchLeader,
    restartGame,
    handleDiscardOverflow: engineDiscardOverflow,
    handleForceResolveClash,
    handleChargeConcerto: engineChargeConcerto,
    handleDecideClash: engineDecideClash,
    actionLogRef,
    startArgsRef,
    isDrawFlightActive,
    isAiThinking,
    setIsFxBlocking,
  } = useGame(
    p0PresetKey,
    p1PresetKey,
    initialMode,
    customDeck,
    opponentDeck,
    undefined,
    undefined,
    initialSavedSession?.lastGameState
  );

  const isMultiplayer = gameState.gameMode === 'MULTIPLAYER';
  const multiplayerRole = isMultiplayer ? (multiplayerService.role ?? initialMultiplayerRole) : null;
  const isHost = isMultiplayer && multiplayerRole === 'HOST';
  const isGuest = isMultiplayer && multiplayerRole === 'GUEST';
  const isSpectator = isMultiplayer && multiplayerRole === 'SPECTATOR';

  const [controlledPlayerIndex, setControlledPlayerIndex] = useState<0 | 1>(() => {
    if (initialMode === 'MULTIPLAYER' && multiplayerRole === 'GUEST') return 1;
    return 0;
  });

  const [battleStore] = useState(() =>
    createBattleStore(battleSource, {
      showTutorialOverlay: isTutorialMode,
      isInitiativeRolling: !initialSavedSession?.lastGameState,
    })
  );

  const isMultiplayerDisconnected = useBattleStore((s) => s.isMultiplayerDisconnected, Object.is, battleStore);
  const disconnectCountdown = useBattleStore((s) => s.disconnectCountdown, Object.is, battleStore);
  const isInitiativeRolling = useBattleStore((s) => s.isInitiativeRolling, Object.is, battleStore);
  const isFxBlocking = useBattleStore((s) => s.isFxBlocking, Object.is, battleStore);
  const showTutorialOverlay = useBattleStore((s) => s.showTutorialOverlay, Object.is, battleStore);
  const concertoModalState = useBattleStore((s) => s.concertoModalState, Object.is, battleStore);
  const introSwapModalState = useBattleStore((s) => s.introSwapModalState, Object.is, battleStore);
  const upgradeTarget = useBattleStore((s) => s.upgradeTarget, Object.is, battleStore);
  const isConfirmingEndTurn = useBattleStore((s) => s.isConfirmingEndTurn, Object.is, battleStore);
  const isConfirmingNoCardPass = useBattleStore((s) => s.isConfirmingNoCardPass, Object.is, battleStore);
  const selectedOverflowIds = useBattleStore((s) => s.selectedOverflowIds, shallowEqual, battleStore);

  const lastRoll0Ref = useRef<number>(1);
  const lastRoll1Ref = useRef<number>(1);
  const guestLeaderRef = useRef<string | null>(null);
  const hostLeaderRef = useRef<string | null>(null);
  const guestMulliganRef = useRef<string[] | null>(null);
  const hostMulliganRef = useRef<string[] | null>(null);
  const lastDrawDismissTimeRef = useRef<number>(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  const isCurrentControlledTurn = isMultiplayer
    ? (isGuest ? gameState.activePlayerIndex === 1 : gameState.activePlayerIndex === 0)
    : controlledPlayerIndex === gameState.activePlayerIndex;

  const timeoutCallbacksRef = useRef<TimeoutForceAdvanceCallbacks>({
    onResolvePendingChoice: (ids) => engineResolvePendingChoice(ids),
    onDrawCards: (pIdx) => engineDrawCards(pIdx),
    onDecideClash: (startClash) => engineDecideClash(startClash),
    onSetClashCard: (pIdx, cardId, spentIds) => engineSetClashCard(pIdx, cardId, spentIds),
    onFinishCombo: (pIdx) => engineFinishCombo(pIdx),
    onDiscardOverflow: (pIdx, ids) => engineDiscardOverflow(pIdx, ids),
  });

  const handleTriggerTimeOut = useCallback(
    (_timedOutPlayerIndex: 0 | 1) => {
      if (isMultiplayer && !isHost) return;
      executeTimeoutForceAdvance(gameState, timeoutCallbacksRef.current);
    },
    [isMultiplayer, isHost, gameState]
  );

  const [timeLimitConfig, setTimeLimitConfig] = useState<TimeLimitConfig>(() => {
    return initialSavedSession?.timeLimitConfig || multiplayerService.timeLimitConfig || {
      hasTimeLimit: true,
      totalTimeSec: 300,
      turnTimeSec: 90,
      clashTimeSec: 30,
    };
  });

  const {
    currentTurnTime,
    setCurrentTurnTime,
    p0TotalTime,
    setP0TotalTime,
    p1TotalTime,
    setP1TotalTime,
  } = useBattleTimer({
    isMultiplayer,
    isHost,
    timeLimitConfig,
    gameState,
    isMultiplayerDisconnected,
    isInitiativeRolling,
    isFxBlocking,
    isCurrentControlledTurn,
    handleTriggerTimeOut,
    initialSavedSession,
  });

  const {
    pingLatency,
    spectatorCount,
    externalDiceResult,
    externalOrderChoice,
    handleDrawCards,
    handleSelectStartingLeader,
    handleMulligan,
    handleUpgrade,
    handleSwitchLeader,
    handleChargeConcerto,
    handleSetClashCard,
    handleDecideClash,
    handleProceedAfterClash,
    handleComboAttack,
    handleFinishCombo,
    handleDiscardOverflow,
    handleResolvePendingChoice,
  } = useMultiplayerBattle({
    gameState,
    setGameState,
    battleSource,
    initialMode,
    isMultiplayer,
    isHost,
    isGuest,
    isSpectator,
    controlledPlayerIndex,
    multiplayerRole,
    isMultiplayerDisconnected,
    setIsMultiplayerDisconnected: (v) => battleStore.setState((s) => ({ isMultiplayerDisconnected: typeof v === 'function' ? v(s.isMultiplayerDisconnected) : v })),
    disconnectCountdown,
    setDisconnectCountdown: (v) => battleStore.setState((s) => ({ disconnectCountdown: typeof v === 'function' ? v(s.disconnectCountdown) : v })),
    setIsInitiativeRolling: (v) => battleStore.setState((s) => ({ isInitiativeRolling: typeof v === 'function' ? v(s.isInitiativeRolling) : v })),
    setHasSelectedMyLeader: (v) => battleStore.setState((s) => ({ hasSelectedMyLeader: typeof v === 'function' ? v(s.hasSelectedMyLeader) : v })),
    setHasCompletedMyMulligan: (v) => battleStore.setState((s) => ({ hasCompletedMyMulligan: typeof v === 'function' ? v(s.hasCompletedMyMulligan) : v })),
    setTimeLimitConfig,
    setP0TotalTime,
    setP1TotalTime,
    setCurrentTurnTime,
    lastRoll0Ref,
    lastRoll1Ref,
    guestLeaderRef,
    hostLeaderRef,
    guestMulliganRef,
    hostMulliganRef,
    engineDrawCards,
    engineSelectStartingLeader,
    engineMulligan,
    engineUpgrade,
    engineSwitchLeader,
    engineChargeConcerto,
    engineSetClashCard,
    engineDecideClash,
    engineProceedAfterClash,
    engineComboAttack,
    engineFinishCombo,
    engineDiscardOverflow,
    engineResolvePendingChoice,
    engineFinishEffectDraw,
    engineSurrender,
    engineTimeOut,
    handleSetInitiative,
  });

  timeoutCallbacksRef.current = {
    onResolvePendingChoice: (ids) => {
      if (isMultiplayer) handleResolvePendingChoice(ids);
      else engineResolvePendingChoice(ids);
    },
    onDrawCards: (pIdx) => {
      if (isMultiplayer) handleDrawCards(pIdx);
      else engineDrawCards(pIdx);
    },
    onDecideClash: (startClash) => {
      if (isMultiplayer) handleDecideClash(startClash);
      else engineDecideClash(startClash);
    },
    onSetClashCard: (pIdx, cardId, spentIds) => {
      if (isMultiplayer) handleSetClashCard(pIdx, cardId || '', spentIds);
      else engineSetClashCard(pIdx, cardId, spentIds);
    },
    onFinishCombo: (pIdx) => {
      if (isMultiplayer) handleFinishCombo(pIdx);
      else engineFinishCombo(pIdx);
    },
    onDiscardOverflow: (pIdx, ids) => {
      if (isMultiplayer) handleDiscardOverflow(pIdx, ids);
      else engineDiscardOverflow(pIdx, ids);
    },
    onCloseLocalModals: () => {
      battleStore.setState({
        upgradeTarget: null,
        cardListModalState: null,
        concertoModalState: { isOpen: false, actionType: 'CLASH', targetCard: null, requiredCost: 0, playerIndex: 0 },
        introSwapModalState: { isOpen: false, targetCard: null, spentConcertoIds: undefined, playerIndex: 0 },
      });
    },
  };

  const isActionLockedByModal = Boolean(
    gameState.pendingChoice ||
    isFxBlocking ||
    concertoModalState.isOpen ||
    introSwapModalState.isOpen ||
    upgradeTarget !== null
  );

  const {
    requestSetClashCard,
    requestComboAttack,
    openCardListModal,
    openUpgradeModal,
    checkCanUpgradeSlot,
    toggleOverflowCard,
    onSwitchLeaderWithSound,
  } = useBattleActions({
    gameState,
    battleStore,
    isSpectator,
    isActionLockedByModal,
    lastDrawDismissTimeRef,
    handleSetClashCard,
    handleComboAttack,
    selectedOverflowIds,
    setSelectedOverflowIds: (v) => battleStore.setState((s) => ({ selectedOverflowIds: typeof v === 'function' ? v(s.selectedOverflowIds) : v })),
    handleSwitchLeader,
  });

  const { currentMatchReplay } = useBattleTelemetry({
    gameState,
    isMultiplayer,
    isHost,
    startArgsRef,
    actionLogRef,
    customDeck,
    opponentDeck,
  });

  useSoloDualTurnSync({ gameState, multiplayerRole, setControlledPlayerIndex });
  useBattlePreload(gameState);

  const p0 = gameState.players[0];
  const p1 = gameState.players[1];
  const viewerPlayerIndex: 0 | 1 = isMultiplayer ? (isSpectator ? controlledPlayerIndex : (isGuest ? 1 : 0)) : 0;
  const myPlayerIndex: 0 | 1 = controlledPlayerIndex;
  const oppPlayerIndex: 0 | 1 = controlledPlayerIndex === 0 ? 1 : 0;
  const activeControlledPlayer = gameState.players[myPlayerIndex];
  const otherPlayer = gameState.players[oppPlayerIndex];
  const otherPlayerIndex = oppPlayerIndex;

  const currentTurnDrawCount = (gameState.turn === 1 && !gameState.firstTurnDrawCompleted) ? 1 : 2;
  const canP0Draw = !isSpectator && gameState.phase === 'DRAW_PHASE' && gameState.activePlayerIndex === 0 && !isDrawFlightActive;
  const canP1Draw = !isSpectator && gameState.phase === 'DRAW_PHASE' && gameState.activePlayerIndex === 1 && !gameState.players[1].isAi && !isDrawFlightActive;

  const {
    previewCard,
    setPreviewCard,
    leftPanelRef,
    centerArenaRef,
    handleArenaScroll,
    handleLeftPanelWheel,
    leftPanelTab,
    setLeftPanelTab,
    isMobileBattle,
    setIsMobileBattle,
    setShowMobileCardModal,
    setShowMobileLogModal,
    modalZoomScale,
    isLeftPanelCollapsed,
    isRightPanelCollapsed,
    setIsRightPanelCollapsed,
    isFullscreen,
    toggleFullscreen,
    arenaZoom,
    viewportScale,
    toggleLeftPanelCollapsed,
    changeArenaZoom,
    resetArenaZoom,
    isLogPanelExpanded,
    setIsLogPanelExpanded,
    battleLayoutMode,
  } = useBattleViewport({ initialPreviewCard: gameState.players[0].slots.leader });

  const {
    p0DamageAlert,
    p1DamageAlert,
    p0HealAlert,
    p1HealAlert,
    p0DeckDrawing,
    p1DeckDrawing,
    idleSpeech,
    resetLowHpFlags,
  } = useBattleAudio({
    gameState,
    p0,
    p1,
    isDrawFlightActive,
    lastEvents,
    isFxBlocking,
    isRulesOpen: battleStore.getState().isRulesOpen,
    isCatalogOpen: battleStore.getState().isCatalogOpen,
    isReplayOpen: battleStore.getState().isReplayOpen,
    showMatchOpening: battleStore.getState().showMatchOpening,
    showExitConfirm: battleStore.getState().showExitConfirm,
    isInitiativeRolling,
    evolutionModalChar: battleStore.getState().evolutionModalChar,
    cardListModalState: battleStore.getState().cardListModalState,
    concertoModalState,
  });

  const handleRestartBattle = () => {
    battleStore.fxQueue.clear();
    battleStore.setState({ showMatchOpening: false, isInitiativeRolling: true });
    resetLowHpFlags();
    restartGame();
  };

  const handleExitClick = () => {
    if (isSpectator) {
      if (onExitToLobby) onExitToLobby();
      return;
    }
    if (gameState.phase !== 'GAME_OVER' && gameState.winner === null) {
      battleStore.setState({ showExitConfirm: true });
    } else if (onExitToLobby) {
      onExitToLobby();
    }
  };

  const handleSurrenderConfirm = () => {
    if (isSpectator || gameState.phase === 'GAME_OVER' || gameState.winner !== null) return;
    battleStore.fxQueue.clear();
    battleStore.setState({
      showSurrenderConfirm: false,
      showExitConfirm: false,
      isInitiativeRolling: false,
    });
    if (isMultiplayer) {
      multiplayerService.sendSurrender(controlledPlayerIndex);
      engineSurrender(controlledPlayerIndex);
    } else {
      engineSurrender(controlledPlayerIndex);
    }
  };

  useEffect(() => {
    setIsFxBlocking(isFxBlocking);
    battleStore.setState({
      externalDiceResult,
      externalOrderChoice,
      previewCard,
    });
  }, [isFxBlocking, setIsFxBlocking, externalDiceResult, externalOrderChoice, previewCard, battleStore]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.logs.length]);

  const opponentHandNameSet = new Set(otherPlayer.hand.map((c) => c.nameKr));
  const getDisplayLogText = (log: { text: string; playerIndex?: 0 | 1 }): string => {
    if (!isMultiplayer || log.playerIndex !== oppPlayerIndex) return log.text;
    if (log.text.includes('[카드 공개]')) return log.text;
    if (!/드로우|패에 추가|손패/.test(log.text)) return log.text;
    return log.text.replace(/\[([^\]]+)\]/g, (match, name: string) =>
      opponentHandNameSet.has(name.trim()) ? '[🔒 비공개 카드]' : match
    );
  };

  const myDamageAlert = myPlayerIndex === 0 ? p0DamageAlert : p1DamageAlert;
  const myHealAlert = myPlayerIndex === 0 ? p0HealAlert : p1HealAlert;
  const oppDamageAlert = oppPlayerIndex === 0 ? p0DamageAlert : p1DamageAlert;
  const oppHealAlert = oppPlayerIndex === 0 ? p0HealAlert : p1HealAlert;
  const myDeckDrawing = myPlayerIndex === 0 ? p0DeckDrawing : p1DeckDrawing;
  const oppDeckDrawing = oppPlayerIndex === 0 ? p0DeckDrawing : p1DeckDrawing;

  const myActionCards = (activeControlledPlayer.actionArea && activeControlledPlayer.actionArea.length > 0)
    ? activeControlledPlayer.actionArea
    : (activeControlledPlayer.clashCard ? [activeControlledPlayer.clashCard] : []);
  const myNormalAttackCount = myActionCards.filter((c) => c.nameKr.includes('일반 공격') || c.nameKr.includes('기본 공격')).length;
  const oppActionCards = (otherPlayer.actionArea && otherPlayer.actionArea.length > 0)
    ? otherPlayer.actionArea
    : (otherPlayer.clashCard ? [otherPlayer.clashCard] : []);
  const oppNormalAttackCount = oppActionCards.filter((c) => c.nameKr.includes('일반 공격') || c.nameKr.includes('기본 공격')).length;

  const comboPlayerIndex = useBattleStore(selectComboPlayerIndex, Object.is, battleStore);
  const isMyComboTurn = controlledPlayerIndex === comboPlayerIndex;
  const isAiComboInProgress = useBattleStore((s) => selectIsAiComboInProgress(s, otherPlayerIndex), Object.is, battleStore);
  const isPlayerComboPhase = gameState.phase === 'COMBO_STEP' && (isMultiplayer ? isMyComboTurn : (!activeControlledPlayer.isAi && !isAiComboInProgress));

  useEffect(() => {
    if (gameState.phase !== 'END_PHASE' || isGuest) return;
    if (gameState.pendingChoice || isFxBlocking) return;
    const timer = setTimeout(() => { handleFinalizeEndPhase(); }, 1000);
    return () => clearTimeout(timer);
  }, [gameState.phase, isGuest, gameState.pendingChoice, isFxBlocking, handleFinalizeEndPhase]);

  const officialPreview = previewCard ? getOfficialCardByCode(previewCard.code) : null;

  const layoutProps = useBattleLayoutProps({
    gameState,
    p0,
    p1,
    activeControlledPlayer,
    otherPlayer,
    controlledPlayerIndex,
    oppPlayerIndex,
    myPlayerIndex,
    isSpectator,
    isMultiplayer,
    multiplayerRole,
    roomCode: multiplayerService.roomCode,
    pingLatency,
    spectatorCount,
    arenaZoom,
    viewportScale,
    modalZoomScale,
    centerArenaRef,
    handleArenaScroll,
    changeArenaZoom,
    resetArenaZoom,
    isFullscreen,
    toggleFullscreen,
    showTutorialOverlay,
    setShowTutorialOverlay: (v) => battleStore.setState((s) => ({ showTutorialOverlay: typeof v === 'function' ? v(s.showTutorialOverlay) : v })),
    setGameMode,
    setIsInitiativeRolling: (v) => battleStore.setState((s) => ({ isInitiativeRolling: typeof v === 'function' ? v(s.isInitiativeRolling) : v })),
    restartGame,
    handleExitClick,
    setShowSurrenderConfirm: (v) => battleStore.setState((s) => ({ showSurrenderConfirm: typeof v === 'function' ? v(s.showSurrenderConfirm) : v })),
    onExitToLobby,
    isMobileBattle,
    setIsMobileBattle,
    isCurrentControlledTurn,
    isAiThinking,
    setControlledPlayerIndex,
    isLeftPanelCollapsed,
    toggleLeftPanelCollapsed,
    previewCard,
    leftPanelRef,
    handleLeftPanelWheel,
    leftPanelTab,
    setLeftPanelTab,
    getDisplayLogText,
    officialPreview,
    getElementKr,
    formatEffectText: (text) => formatEffectText(text || ''),
    setEvolutionModalChar: (c) => battleStore.setState({ evolutionModalChar: c }),
    setPreviewCard: (c) => {
      setPreviewCard(c);
      battleStore.setState({ previewCard: c });
    },
    timeLimitConfig,
    p0TotalTime,
    p1TotalTime,
    currentTurnTime,
    formatChessTime,
    setIsHpHistoryModalOpen: (v) => battleStore.setState((s) => ({ isHpHistoryModalOpen: typeof v === 'function' ? v(s.isHpHistoryModalOpen) : v })),
    oppHealAlert,
    oppDamageAlert,
    oppDeckDrawing,
    myHealAlert,
    myDamageAlert,
    myDeckDrawing,
    currentTurnDrawCount,
    isActionLockedByModal,
    checkCanUpgradeSlot,
    openUpgradeModal,
    openCardListModal,
    onSwitchLeaderWithSound,
    oppNormalAttackCount,
    oppActionCards,
    myNormalAttackCount,
    myActionCards,
    comboPlayerIndex,
    canP0Draw,
    canP1Draw,
    handleDrawCards,
    idleSpeech,
    isPlayerComboPhase,
    canPlayerExecuteCombo,
    introSwapModalState,
    concertoModalState,
    setNoComboCountdown: (v) => battleStore.setState((s) => ({ noComboCountdown: typeof v === 'function' ? v(s.noComboCountdown) : v })),
    handleFinishCombo,
    selectedOverflowIds,
    toggleOverflowCard,
    handleChargeConcerto,
    requestSetClashCard,
    requestComboAttack,
    isRightPanelCollapsed,
    setIsRightPanelCollapsed,
    isConfirmingEndTurn,
    setIsConfirmingEndTurn: (v) => battleStore.setState((s) => ({ isConfirmingEndTurn: typeof v === 'function' ? v(s.isConfirmingEndTurn) : v })),
    handleDecideClash,
    getEffectiveCardCost,
    canPlayerUseActionCard,
    isConfirmingNoCardPass,
    setIsConfirmingNoCardPass: (v) => battleStore.setState((s) => ({ isConfirmingNoCardPass: typeof v === 'function' ? v(s.isConfirmingNoCardPass) : v })),
    lastDrawDismissTimeRef,
    handleSetClashCard,
    handleForceResolveClash,
    setSelectedOverflowIds: (v) => battleStore.setState((s) => ({ selectedOverflowIds: typeof v === 'function' ? v(s.selectedOverflowIds) : v })),
    handleDiscardOverflow,
    isLogPanelExpanded,
    setIsLogPanelExpanded,
    logEndRef,
    setShowMobileCardModal: (v) => battleStore.setState((s) => ({ showMobileCardModal: typeof v === 'function' ? v(s.showMobileCardModal) : v })),
    setShowMobileLogModal: (v) => battleStore.setState((s) => ({ showMobileLogModal: typeof v === 'function' ? v(s.showMobileLogModal) : v })),
  });

  return (
    <BattleStoreProvider store={battleStore}>
      <div
        className={isMobileBattle ? 'mobile-battle-mode' : ''}
        data-battle-layout={battleLayoutMode}
        style={{ '--modal-zoom': String(modalZoomScale) } as React.CSSProperties}
      >
        <BattleLayout {...layoutProps} />

        {/* [WP8-3] 모달 및 오버레이 전담 호스트 */}
        <BattleOverlayHost
          currentTurnDrawCount={currentTurnDrawCount}
          isMultiplayer={isMultiplayer}
          isDrawFlightActive={isDrawFlightActive}
          controlledPlayerIndex={controlledPlayerIndex}
          viewerPlayerIndex={viewerPlayerIndex}
          isSpectator={isSpectator}
          isHost={isHost}
          isGuest={isGuest}
          multiplayerRole={multiplayerRole}
          onExitToLobby={onExitToLobby}
          restartGame={restartGame}
          handleRestartBattle={handleRestartBattle}
          currentMatchReplay={currentMatchReplay}
          onPlayBattleReplay={onPlayBattleReplay}
          handleSurrenderConfirm={handleSurrenderConfirm}
          handleDecideClash={handleDecideClash}
          handleSetClashCard={handleSetClashCard}
          handleDrawCards={handleDrawCards}
          handleSelectStartingLeader={handleSelectStartingLeader}
          handleMulligan={handleMulligan}
          handleUpgrade={handleUpgrade}
          handleComboAttack={handleComboAttack}
          handleFinishCombo={handleFinishCombo}
          handleProceedAfterClash={handleProceedAfterClash}
          handleResolvePendingChoice={handleResolvePendingChoice}
          handleFinishEffectDrawWithCooldown={() => {}}
          handleSetInitiative={handleSetInitiative}
          lastRoll0Ref={lastRoll0Ref}
          lastRoll1Ref={lastRoll1Ref}
        />

        {/* [WP8-4] 연출 큐 전담 호스트 */}
        <FxQueueHost queue={battleStore.fxQueue} />
      </div>
    </BattleStoreProvider>
  );
};
