// src/hooks/useBattleLayoutProps.ts
// [WP8-6] 배틀 레이아웃 하위 컴포넌트 Props 구성 전담 훅 (GameBoard 800줄 이하 달성)
import React, { useMemo } from 'react';
import type { BattleLayoutProps } from '../components/battle/BattleLayout';
import type { GameState, PlayerState, CharacterCard, AnyCard, ElementType, ActionCard } from '../types/tcg';
import type { MultiplayerRole, TimeLimitConfig } from '../types/multiplayer';
import type { ConcertoModalState, IntroSwapModalState } from '../battle/store';
import type { BattleLayoutMode } from '../battle/layoutMode';

export interface UseBattleLayoutPropsParams {
  gameState: GameState;
  p0: PlayerState;
  p1: PlayerState;
  activeControlledPlayer: PlayerState;
  otherPlayer: PlayerState;
  controlledPlayerIndex: 0 | 1;
  oppPlayerIndex: 0 | 1;
  myPlayerIndex: 0 | 1;
  isSpectator: boolean;
  isMultiplayer: boolean;
  multiplayerRole: MultiplayerRole | null | undefined;
  roomCode?: string;
  pingLatency: number | null;
  spectatorCount: number;
  arenaZoom: number;
  viewportScale: number;
  modalZoomScale: number;
  centerArenaRef: React.RefObject<HTMLDivElement | null>;
  handleArenaScroll: () => void;
  changeArenaZoom: (delta: number) => void;
  resetArenaZoom: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  showTutorialOverlay: boolean;
  setShowTutorialOverlay: (val: boolean | ((prev: boolean) => boolean)) => void;
  setGameMode: (mode: GameState['gameMode']) => void;
  setIsInitiativeRolling: (val: boolean | ((prev: boolean) => boolean)) => void;
  restartGame: () => void;
  handleExitClick: () => void;
  setShowSurrenderConfirm: (val: boolean | ((prev: boolean) => boolean)) => void;
  onExitToLobby?: () => void;
  isMobileBattle: boolean;
  setIsMobileBattle: (val: boolean | ((prev: boolean) => boolean)) => void;
  battleLayoutMode?: BattleLayoutMode;
  isCurrentControlledTurn: boolean;
  isAiThinking: boolean;
  setControlledPlayerIndex: React.Dispatch<React.SetStateAction<0 | 1>>;
  isLeftPanelCollapsed: boolean;
  toggleLeftPanelCollapsed: () => void;
  previewCard: AnyCard | null;
  leftPanelRef: React.RefObject<HTMLDivElement | null>;
  handleLeftPanelWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  leftPanelTab: 'PREVIEW' | 'LOG';
  setLeftPanelTab: React.Dispatch<React.SetStateAction<'PREVIEW' | 'LOG'>>;
  getDisplayLogText: (log: { text: string; playerIndex?: 0 | 1 }) => string;
  officialPreview?: { weaponType?: string } | null;
  getElementKr: (elem: ElementType) => string;
  formatEffectText: (text: string | null | undefined, size?: 'sm' | 'md') => React.ReactNode;
  setEvolutionModalChar: (c: CharacterCard | null) => void;
  setPreviewCard: (c: AnyCard | null) => void;
  timeLimitConfig: TimeLimitConfig;
  p0TotalTime: number;
  p1TotalTime: number;
  currentTurnTime: number;
  formatChessTime: (sec: number) => string;
  setIsHpHistoryModalOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  oppHealAlert?: { diff: number } | null;
  oppDamageAlert?: { diff: number } | null;
  oppDeckDrawing: boolean;
  myHealAlert?: { diff: number } | null;
  myDamageAlert?: { diff: number } | null;
  myDeckDrawing: boolean;
  currentTurnDrawCount: number;
  isActionLockedByModal: boolean;
  checkCanUpgradeSlot: (slot: 'leader' | 'leftSupport' | 'rightSupport', pIdx?: 0 | 1) => boolean;
  openUpgradeModal: (slot: 'leader' | 'leftSupport' | 'rightSupport', pIdx?: 0 | 1) => void;
  openCardListModal: (type: 'TRASH' | 'CONCERTO' | 'CHARACTER', pIdx: 0 | 1) => void;
  onSwitchLeaderWithSound: (pIdx: 0 | 1, slot: 'leftSupport' | 'rightSupport') => void;
  oppNormalAttackCount: number;
  oppActionCards: ActionCard[];
  myNormalAttackCount: number;
  myActionCards: ActionCard[];
  comboPlayerIndex: 0 | 1;
  canP0Draw: boolean;
  canP1Draw: boolean;
  handleDrawCards: (pIdx?: 0 | 1) => void;
  idleSpeech?: { visible: boolean; text: string };
  isPlayerComboPhase: boolean;
  canPlayerExecuteCombo: (p: PlayerState) => boolean;
  introSwapModalState: IntroSwapModalState;
  concertoModalState: ConcertoModalState;
  setNoComboCountdown: (val: number | null | ((prev: number | null) => number | null)) => void;
  handleFinishCombo: (pIdx: 0 | 1) => void;
  selectedOverflowIds: string[];
  toggleOverflowCard: (id: string, handLen: number) => void;
  handleChargeConcerto: (pIdx: 0 | 1, cardId: string) => void;
  requestSetClashCard: (pIdx: 0 | 1, cardId: string | null) => void;
  requestComboAttack: (pIdx: 0 | 1, cardId: string) => void;
  isRightPanelCollapsed: boolean;
  setIsRightPanelCollapsed: (val: boolean | ((prev: boolean) => boolean)) => void;
  isConfirmingEndTurn: boolean;
  setIsConfirmingEndTurn: (val: boolean | ((prev: boolean) => boolean)) => void;
  handleDecideClash: (enter: boolean) => void;
  getEffectiveCardCost: (p: PlayerState, c: ActionCard) => number;
  canPlayerUseActionCard: (slots: PlayerState['slots'], c: ActionCard, area?: ActionCard[]) => { canUse: boolean; reason?: string };
  isConfirmingNoCardPass: boolean;
  setIsConfirmingNoCardPass: (val: boolean | ((prev: boolean) => boolean)) => void;
  lastDrawDismissTimeRef: React.MutableRefObject<number>;
  handleSetClashCard: (pIdx: 0 | 1, cardId: string | null) => void;
  handleForceResolveClash: () => void;
  setSelectedOverflowIds: (val: string[] | ((prev: string[]) => string[])) => void;
  handleDiscardOverflow: (pIdx: 0 | 1, cardIds: string[]) => void;
  isLogPanelExpanded: boolean;
  setIsLogPanelExpanded: (val: boolean | ((prev: boolean) => boolean)) => void;
  logEndRef: React.RefObject<HTMLDivElement | null>;
  setShowMobileCardModal: (val: boolean | ((prev: boolean) => boolean)) => void;
  setShowMobileLogModal: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export function useBattleLayoutProps(p: UseBattleLayoutPropsParams): BattleLayoutProps {
  return useMemo<BattleLayoutProps>(() => ({
    modalZoomScale: p.modalZoomScale,
    arenaZoom: p.arenaZoom,
    viewportScale: p.viewportScale,
    centerArenaRef: p.centerArenaRef,
    handleArenaScroll: p.handleArenaScroll,
    topBarProps: {
      onExitToLobby: p.onExitToLobby,
      handleExitClick: p.handleExitClick,
      isSpectator: p.isSpectator,
      gameState: p.gameState,
      setShowSurrenderConfirm: p.setShowSurrenderConfirm,
      isMobileBattle: p.isMobileBattle,
      setIsMobileBattle: p.setIsMobileBattle,
      isCurrentControlledTurn: p.isCurrentControlledTurn,
      isAiThinking: p.isAiThinking,
      controlledPlayerIndex: p.controlledPlayerIndex,
      setControlledPlayerIndex: p.setControlledPlayerIndex,
      isMultiplayer: p.isMultiplayer,
      multiplayerRole: p.multiplayerRole,
      roomCode: p.roomCode,
      pingLatency: p.pingLatency,
      spectatorCount: p.spectatorCount,
      arenaZoom: p.arenaZoom,
      changeArenaZoom: p.changeArenaZoom,
      resetArenaZoom: p.resetArenaZoom,
      isFullscreen: p.isFullscreen,
      toggleFullscreen: p.toggleFullscreen,
      showTutorialOverlay: p.showTutorialOverlay,
      setShowTutorialOverlay: p.setShowTutorialOverlay,
      setGameMode: p.setGameMode,
      setIsInitiativeRolling: p.setIsInitiativeRolling,
      restartGame: p.restartGame,
    },
    cardDetailProps: {
      isMobileBattle: p.isMobileBattle,
      isLeftPanelCollapsed: p.isLeftPanelCollapsed,
      toggleLeftPanelCollapsed: p.toggleLeftPanelCollapsed,
      previewCard: p.previewCard,
      leftPanelRef: p.leftPanelRef,
      handleLeftPanelWheel: p.handleLeftPanelWheel,
      leftPanelTab: p.leftPanelTab,
      setLeftPanelTab: p.setLeftPanelTab,
      gameState: p.gameState,
      getDisplayLogText: p.getDisplayLogText,
      officialPreview: p.officialPreview,
      getElementKr: p.getElementKr,
      formatEffectText: p.formatEffectText,
      setEvolutionModalChar: p.setEvolutionModalChar,
      setPreviewCard: p.setPreviewCard,
    },
    opponentFieldProps: {
      otherPlayer: p.otherPlayer,
      oppPlayerIndex: p.oppPlayerIndex,
      myPlayerIndex: p.myPlayerIndex,
      isMultiplayer: p.isMultiplayer,
      timeLimitConfig: p.timeLimitConfig,
      p0TotalTime: p.p0TotalTime,
      p1TotalTime: p.p1TotalTime,
      isCurrentControlledTurn: p.isCurrentControlledTurn,
      formatChessTime: p.formatChessTime,
      setIsHpHistoryModalOpen: p.setIsHpHistoryModalOpen,
      oppHealAlert: p.oppHealAlert,
      oppDamageAlert: p.oppDamageAlert,
      oppDeckDrawing: p.oppDeckDrawing,
      gameState: p.gameState,
      currentTurnDrawCount: p.currentTurnDrawCount,
      isActionLockedByModal: p.isActionLockedByModal,
      checkCanUpgradeSlot: p.checkCanUpgradeSlot,
      openUpgradeModal: p.openUpgradeModal,
      openCardListModal: p.openCardListModal,
      setPreviewCard: p.setPreviewCard,
      setEvolutionModalChar: p.setEvolutionModalChar,
      onSwitchLeaderWithSound: p.onSwitchLeaderWithSound,
      getElementKr: p.getElementKr,
    },
    centerClashProps: {
      otherPlayer: p.otherPlayer,
      activeControlledPlayer: p.activeControlledPlayer,
      oppNormalAttackCount: p.oppNormalAttackCount,
      oppActionCards: p.oppActionCards,
      myNormalAttackCount: p.myNormalAttackCount,
      myActionCards: p.myActionCards,
      controlledPlayerIndex: p.controlledPlayerIndex,
      oppPlayerIndex: p.oppPlayerIndex,
      myPlayerIndex: p.myPlayerIndex,
      gameState: p.gameState,
      isCurrentControlledTurn: p.isCurrentControlledTurn,
      comboPlayerIndex: p.comboPlayerIndex,
      canP0Draw: p.canP0Draw,
      canP1Draw: p.canP1Draw,
      currentTurnDrawCount: p.currentTurnDrawCount,
      isMultiplayer: p.isMultiplayer,
      timeLimitConfig: p.timeLimitConfig,
      currentTurnTime: p.currentTurnTime,
      p0TotalTime: p.p0TotalTime,
      p1TotalTime: p.p1TotalTime,
      formatChessTime: p.formatChessTime,
      setPreviewCard: p.setPreviewCard,
    },
    playerFieldProps: {
      activeControlledPlayer: p.activeControlledPlayer,
      myPlayerIndex: p.myPlayerIndex,
      gameState: p.gameState,
      isCurrentControlledTurn: p.isCurrentControlledTurn,
      isSpectator: p.isSpectator,
      isActionLockedByModal: p.isActionLockedByModal,
      isMultiplayer: p.isMultiplayer,
      timeLimitConfig: p.timeLimitConfig,
      p0TotalTime: p.p0TotalTime,
      p1TotalTime: p.p1TotalTime,
      formatChessTime: p.formatChessTime,
      setIsHpHistoryModalOpen: p.setIsHpHistoryModalOpen,
      myHealAlert: p.myHealAlert,
      myDamageAlert: p.myDamageAlert,
      myDeckDrawing: p.myDeckDrawing,
      currentTurnDrawCount: p.currentTurnDrawCount,
      canP0Draw: p.canP0Draw,
      canP1Draw: p.canP1Draw,
      handleDrawCardClick: p.handleDrawCards,
      checkCanUpgradeSlot: p.checkCanUpgradeSlot,
      openUpgradeModal: p.openUpgradeModal,
      openCardListModal: p.openCardListModal,
      setPreviewCard: p.setPreviewCard,
      setEvolutionModalChar: p.setEvolutionModalChar,
      onSwitchLeaderWithSound: p.onSwitchLeaderWithSound,
      idleSpeech: p.idleSpeech ?? { visible: false, text: '' },
    },
    playerHandProps: {
      activeControlledPlayer: p.activeControlledPlayer,
      gameState: p.gameState,
      controlledPlayerIndex: p.controlledPlayerIndex,
      isSpectator: p.isSpectator,
      isPlayerComboPhase: p.isPlayerComboPhase,
      canPlayerExecuteCombo: p.canPlayerExecuteCombo,
      introSwapModalState: p.introSwapModalState,
      concertoModalState: p.concertoModalState,
      setNoComboCountdown: p.setNoComboCountdown,
      handleFinishCombo: p.handleFinishCombo,
      isCurrentControlledTurn: p.isCurrentControlledTurn,
      isActionLockedByModal: p.isActionLockedByModal,
      selectedOverflowIds: p.selectedOverflowIds,
      toggleOverflowCard: (id) => p.toggleOverflowCard(id, p.activeControlledPlayer.hand.length),
      handleChargeConcerto: p.handleChargeConcerto,
      requestSetClashCard: p.requestSetClashCard,
      requestComboAttack: p.requestComboAttack,
      setPreviewCard: p.setPreviewCard,
    },
    tacticalConsoleProps: {
      isMobileBattle: p.isMobileBattle,
      isRightPanelCollapsed: p.isRightPanelCollapsed,
      setIsRightPanelCollapsed: p.setIsRightPanelCollapsed,
      gameState: p.gameState,
      isAiThinking: p.isAiThinking,
      isCurrentControlledTurn: p.isCurrentControlledTurn,
      canP0Draw: p.canP0Draw,
      canP1Draw: p.canP1Draw,
      currentTurnDrawCount: p.currentTurnDrawCount,
      isSpectator: p.isSpectator,
      checkCanUpgradeSlot: p.checkCanUpgradeSlot,
      controlledPlayerIndex: p.controlledPlayerIndex,
      openUpgradeModal: p.openUpgradeModal,
      activeControlledPlayer: p.activeControlledPlayer,
      isActionLockedByModal: p.isActionLockedByModal,
      isConfirmingEndTurn: p.isConfirmingEndTurn,
      setIsConfirmingEndTurn: p.setIsConfirmingEndTurn,
      handleDecideClash: p.handleDecideClash,
      isMultiplayer: p.isMultiplayer,
      otherPlayer: p.otherPlayer,
      setControlledPlayerIndex: p.setControlledPlayerIndex,
      p0: p.p0,
      p1: p.p1,
      getEffectiveCardCost: p.getEffectiveCardCost,
      canPlayerUseActionCard: p.canPlayerUseActionCard,
      isConfirmingNoCardPass: p.isConfirmingNoCardPass,
      setIsConfirmingNoCardPass: p.setIsConfirmingNoCardPass,
      lastDrawDismissTimeRef: p.lastDrawDismissTimeRef,
      handleSetClashCard: p.handleSetClashCard,
      handleForceResolveClash: p.handleForceResolveClash,
      isPlayerComboPhase: p.isPlayerComboPhase,
      canPlayerExecuteCombo: p.canPlayerExecuteCombo,
      setNoComboCountdown: p.setNoComboCountdown,
      handleFinishCombo: p.handleFinishCombo,
      selectedOverflowIds: p.selectedOverflowIds,
      setSelectedOverflowIds: p.setSelectedOverflowIds,
      handleDiscardOverflow: p.handleDiscardOverflow,
      isLogPanelExpanded: p.isLogPanelExpanded,
      setIsLogPanelExpanded: p.setIsLogPanelExpanded,
      logEndRef: p.logEndRef,
      oppPlayerIndex: p.oppPlayerIndex,
      setPreviewCard: p.setPreviewCard,
      getDisplayLogText: p.getDisplayLogText,
    },
    isMobileBattle: p.isMobileBattle,
    battleLayoutMode: p.battleLayoutMode,
    isRightPanelCollapsed: p.isRightPanelCollapsed,
    isSpectator: p.isSpectator,
    isCurrentControlledTurn: p.isCurrentControlledTurn,
    isActionLockedByModal: p.isActionLockedByModal,
    isPlayerComboPhase: p.isPlayerComboPhase,
    canP0Draw: p.canP0Draw,
    canP1Draw: p.canP1Draw,
    currentTurnDrawCount: p.currentTurnDrawCount,
    controlledPlayerIndex: p.controlledPlayerIndex,
    phase: p.gameState.phase,
    clashCardReady: p.activeControlledPlayer.clashCardReady,
    handLength: p.activeControlledPlayer.hand.length,
    selectedOverflowIds: p.selectedOverflowIds,
    setShowMobileCardModal: p.setShowMobileCardModal,
    setShowMobileLogModal: p.setShowMobileLogModal,
    handleDrawCards: p.handleDrawCards,
    setIsConfirmingEndTurn: p.setIsConfirmingEndTurn,
    handleDecideClash: p.handleDecideClash,
    handleSetClashCard: p.handleSetClashCard,
    setNoComboCountdown: p.setNoComboCountdown,
    handleFinishCombo: p.handleFinishCombo,
    handleDiscardOverflow: p.handleDiscardOverflow,
    setSelectedOverflowIds: p.setSelectedOverflowIds,
  }), [p]);
}
