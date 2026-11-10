// src/components/battle/BattleOverlayHost.tsx
// [WP8-3] 모달 및 오버레이 전담 호스트 컴포넌트 (GameBoard 분해 컴포넌트)
import React, { Suspense, useEffect } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Home,
  EyeOff,
  ArrowLeftRight,
  Eye,
  AlertCircle,
  ChevronRight,
  ScrollText,
  X,
} from 'lucide-react';
import { PhaseBannerOverlay } from '../PhaseBannerOverlay';
import { CardDrawFlightOverlay } from '../CardDrawFlightOverlay';
import { CenterDrawOverlay } from '../CenterDrawOverlay';
import { InitiativeDiceModal } from '../InitiativeDiceModal';
import { LeaderSelectModal } from '../LeaderSelectModal';
import { MulliganModal } from '../MulliganModal';
import { MatchOpeningOverlay } from '../MatchOpeningOverlay';
import { UpgradeModal } from '../UpgradeModal';
import { ClashAnimationOverlay } from '../ClashAnimationOverlay';
import { CardListModal } from '../CardListModal';
import { RulesGuideModal } from '../RulesGuideModal';
import { CardCatalogModal } from '../CardCatalogModal';
import { CinematicFinisherOverlay } from '../CinematicFinisherOverlay';
import { GameOverModal } from '../GameOverModal';
import { BattleReplayModal } from '../BattleReplayModal';
import { ConcertoSelectModal } from '../ConcertoSelectModal';
import { EffectChoiceModal } from '../EffectChoiceModal';
import { EvolutionTreeModal } from '../EvolutionTreeModal';
import { HpHistoryModal } from '../HpHistoryModal';
import { InGameTutorialOverlay } from '../InGameTutorialOverlay';
import { MultiplayerDisconnectOverlay } from '../MultiplayerDisconnectOverlay';
import {
  CharacterCard,
  AnyCard,
  LogItem,
  getElementKr,
} from '../../types/tcg';
import type { BattleReplayData } from '../../utils/replayManager';
import type { MultiplayerRole } from '../../types/multiplayer';
import { multiplayerService } from '../../services/multiplayerService';
import {
  doesCharMatchIntroTarget,
  isIntroSkillCard,
  getIntroSkillTargetChar,
  canPlayerExecuteCombo,
} from '../../engine/gameEngine';
import { soundEffects } from '../../utils/soundEffects';
import { formatEffectText, formatBattleLogText } from '../../utils/formatEffectText';
import {
  useBattleStore,
  useBattleSetState,
  UpgradeTargetState,
  CardListModalState,
  ConcertoModalState,
  IntroSwapModalState,
} from '../../battle/store';

export type { UpgradeTargetState, CardListModalState, ConcertoModalState, IntroSwapModalState };

export interface BattleOverlayHostProps {
  currentTurnDrawCount: number;
  isMultiplayer: boolean;
  isDrawFlightActive: boolean;
  controlledPlayerIndex: 0 | 1;
  viewerPlayerIndex: 0 | 1;
  isSpectator: boolean;
  isHost: boolean;
  isGuest: boolean;
  multiplayerRole?: MultiplayerRole | null;
  onExitToLobby?: () => void;
  restartGame: () => void;
  handleRestartBattle: () => void;
  currentMatchReplay: BattleReplayData | null;
  onPlayBattleReplay?: (replay: BattleReplayData) => void;
  handleSurrenderConfirm: () => void;
  handleDecideClash: (enterClash: boolean) => void;
  handleSetClashCard: (playerIndex: 0 | 1, cardId: string, selectedConcertoIds?: string[]) => void;
  handleDrawCards: (playerIndex?: 0 | 1) => void;
  handleSelectStartingLeader: (p0LeaderCharName: string, p1LeaderCharName?: string) => void;
  handleMulligan: (replaceCardIds: string[]) => void;
  handleUpgrade: (
    playerIndex: 0 | 1,
    slotName: 'leader' | 'leftSupport' | 'rightSupport',
    upgradeCardId: string,
    discardCardIds: string[]
  ) => void;
  handleComboAttack: (
    playerIndex: 0 | 1,
    cardId: string,
    selectedConcertoIds?: string[],
    targetCardId?: string,
    swapSupportSlot?: 'leftSupport' | 'rightSupport'
  ) => void;
  handleFinishCombo: (playerIndex: 0 | 1) => void;
  handleProceedAfterClash: () => void;
  handleResolvePendingChoice: (chosenCardIds: string[]) => void;
  handleFinishEffectDrawWithCooldown: () => void;
  handleSetInitiative: (
    firstPlayerIndex: 0 | 1,
    roll0: number,
    roll1: number,
    choiceDetail?: { winnerIndex: 0 | 1; chosenOrder: 'FIRST' | 'SECOND' }
  ) => void;
  lastRoll0Ref: React.MutableRefObject<number | undefined>;
  lastRoll1Ref: React.MutableRefObject<number | undefined>;
}

export const BattleOverlayHost: React.FC<BattleOverlayHostProps> = (props) => {
  const {
    currentTurnDrawCount,
    isMultiplayer,
    isDrawFlightActive,
    controlledPlayerIndex,
    viewerPlayerIndex,
    isSpectator,
    lastRoll0Ref,
    lastRoll1Ref,
    isHost,
    isGuest,
    multiplayerRole,
    onExitToLobby,
    handleDecideClash,
    handleRestartBattle,
    currentMatchReplay,
    onPlayBattleReplay,
    handleSetClashCard,
    handleDrawCards,
    handleSelectStartingLeader,
    handleMulligan,
    handleUpgrade,
    handleComboAttack,
    handleFinishCombo,
    handleProceedAfterClash,
    handleResolvePendingChoice,
    handleFinishEffectDrawWithCooldown: _handleFinishEffectDrawWithCooldown,
    handleSetInitiative,
    handleSurrenderConfirm,
  } = props;

  const gameState = useBattleStore((s) => s.gameState);
  const showMatchOpening = useBattleStore((s) => s.showMatchOpening);
  const isFxBlocking = useBattleStore((s) => s.isFxBlocking);
  const externalDiceResult = useBattleStore((s) => s.externalDiceResult);
  const externalOrderChoice = useBattleStore((s) => s.externalOrderChoice);
  const leaderSelectPlayerIndex = useBattleStore((s) => s.leaderSelectPlayerIndex);
  const p0ChosenLeader = useBattleStore((s) => s.p0ChosenLeader);
  const hasSelectedMyLeader = useBattleStore((s) => s.hasSelectedMyLeader);
  const hasCompletedMyMulligan = useBattleStore((s) => s.hasCompletedMyMulligan);
  const showSurrenderConfirm = useBattleStore((s) => s.showSurrenderConfirm);
  const showExitConfirm = useBattleStore((s) => s.showExitConfirm);
  const isConfirmingEndTurn = useBattleStore((s) => s.isConfirmingEndTurn);
  const upgradeTarget = useBattleStore((s) => s.upgradeTarget);
  const cardListModalState = useBattleStore((s) => s.cardListModalState);
  const isRulesOpen = useBattleStore((s) => s.isRulesOpen);
  const isCatalogOpen = useBattleStore((s) => s.isCatalogOpen);
  const isFinisherFinished = useBattleStore((s) => s.isFinisherFinished);
  const isReplayOpen = useBattleStore((s) => s.isReplayOpen);
  const concertoModalState = useBattleStore((s) => s.concertoModalState);
  const introSwapModalState = useBattleStore((s) => s.introSwapModalState);
  const isIntroSwapFieldPeek = useBattleStore((s) => s.isIntroSwapFieldPeek);
  const evolutionModalChar = useBattleStore((s) => s.evolutionModalChar);
  const isHpHistoryModalOpen = useBattleStore((s) => s.isHpHistoryModalOpen);
  const showTutorialOverlay = useBattleStore((s) => s.showTutorialOverlay);
  const isMultiplayerDisconnected = useBattleStore((s) => s.isMultiplayerDisconnected);
  const disconnectCountdown = useBattleStore((s) => s.disconnectCountdown);
  const showMobileCardModal = useBattleStore((s) => s.showMobileCardModal);
  const showMobileLogModal = useBattleStore((s) => s.showMobileLogModal);
  const previewCard = useBattleStore((s) => s.previewCard);
  const isInitiativeRolling = useBattleStore((s) => s.isInitiativeRolling);
  const noComboCountdown = useBattleStore((s) => s.noComboCountdown);

  const setBattleState = useBattleSetState();

  const handleDismissMatchOpening = () => setBattleState({ showMatchOpening: false });
  const setLeaderSelectPlayerIndex = (val: 0 | 1 | ((prev: 0 | 1) => 0 | 1)) =>
    setBattleState((s) => ({
      leaderSelectPlayerIndex: typeof val === 'function' ? val(s.leaderSelectPlayerIndex) : val,
    }));
  const setP0ChosenLeader = (val: string | null | ((prev: string | null) => string | null)) =>
    setBattleState((s) => ({
      p0ChosenLeader: typeof val === 'function' ? val(s.p0ChosenLeader) : val,
    }));
  const setShowSurrenderConfirm = (val: boolean) => setBattleState({ showSurrenderConfirm: val });
  const setShowExitConfirm = (val: boolean) => setBattleState({ showExitConfirm: val });
  const setIsConfirmingEndTurn = (val: boolean) => setBattleState({ isConfirmingEndTurn: val });
  const setUpgradeTarget = (val: UpgradeTargetState | null) => setBattleState({ upgradeTarget: val });
  const setCardListModalState = (val: CardListModalState | null) => setBattleState({ cardListModalState: val });
  const setIsRulesOpen = (val: boolean) => setBattleState({ isRulesOpen: val });
  const setIsCatalogOpen = (val: boolean) => setBattleState({ isCatalogOpen: val });
  const setIsFinisherFinished = (val: boolean) => setBattleState({ isFinisherFinished: val });
  const setIsReplayOpen = (val: boolean) => setBattleState({ isReplayOpen: val });
  const setConcertoModalState = (val: ConcertoModalState | ((prev: ConcertoModalState) => ConcertoModalState)) =>
    setBattleState((s) => ({
      concertoModalState: typeof val === 'function' ? val(s.concertoModalState) : val,
    }));
  const setIntroSwapModalState = (val: IntroSwapModalState | ((prev: IntroSwapModalState) => IntroSwapModalState)) =>
    setBattleState((s) => ({
      introSwapModalState: typeof val === 'function' ? val(s.introSwapModalState) : val,
    }));
  const setIsIntroSwapFieldPeek = (val: boolean) => setBattleState({ isIntroSwapFieldPeek: val });
  const setEvolutionModalChar = (val: CharacterCard | null) => setBattleState({ evolutionModalChar: val });
  const setIsHpHistoryModalOpen = (val: boolean) => setBattleState({ isHpHistoryModalOpen: val });
  const setShowTutorialOverlay = (val: boolean) => setBattleState({ showTutorialOverlay: val });
  const setShowMobileCardModal = (val: boolean) => setBattleState({ showMobileCardModal: val });
  const setShowMobileLogModal = (val: boolean) => setBattleState({ showMobileLogModal: val });
  const setPreviewCard = (card: AnyCard | null) => setBattleState({ previewCard: card });
  const setIsInitiativeRolling = (val: boolean) => setBattleState({ isInitiativeRolling: val });
  const setNoComboCountdown = (val: number | null | ((prev: number | null) => number | null)) =>
    setBattleState((s) => ({
      noComboCountdown: typeof val === 'function' ? val(s.noComboCountdown) : val,
    }));

  const p0 = gameState.players[0];
  const p1 = gameState.players[1];
  const activeControlledPlayer = gameState.players[controlledPlayerIndex];
  const otherPlayerIndex = controlledPlayerIndex === 0 ? 1 : 0;
  const otherPlayer = gameState.players[otherPlayerIndex];
  const isPlayerComboPhase = gameState.phase === 'COMBO_STEP' && gameState.activePlayerIndex === controlledPlayerIndex;

  const opponentHandNameSet = React.useMemo(() => {
    return new Set(gameState.players[otherPlayerIndex].hand.map((c) => c.nameKr));
  }, [gameState.players, otherPlayerIndex]);

  const getDisplayLogText = (log: LogItem): string => {
    if (!isMultiplayer || log.playerIndex !== otherPlayerIndex) return log.text;
    if (log.text.includes('[카드 효과]')) return log.text;
    if (!/드로우|손패에 추가|획득/.test(log.text)) return log.text;
    return log.text.replace(/\[([^\]]+)\]/g, (match, name: string) =>
      opponentHandNameSet.has(name.trim()) ? '[비공개 카드]' : match
    );
  };

  const hasPendingChoice = Boolean(gameState.pendingChoice);

  useEffect(() => {
    if (isMultiplayer) {
      setNoComboCountdown(null);
      return;
    }

    if (
      !isPlayerComboPhase ||
      isFxBlocking ||
      hasPendingChoice ||
      Boolean(gameState.pendingChoiceQueue && gameState.pendingChoiceQueue.length > 0) ||
      introSwapModalState.isOpen ||
      concertoModalState.isOpen
    ) {
      setNoComboCountdown(null);
      return;
    }

    const canCombo = canPlayerExecuteCombo(activeControlledPlayer);
    if (!canCombo) {
      setNoComboCountdown(5);
      const interval = setInterval(() => {
        setNoComboCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    } else {
      setNoComboCountdown(null);
    }
  }, [
    isMultiplayer,
    isPlayerComboPhase,
    activeControlledPlayer.hand.length,
    activeControlledPlayer.concertoZone.length,
    activeControlledPlayer.comboCount,
    activeControlledPlayer.comboUnlimited,
    isFxBlocking,
    hasPendingChoice,
  ]);

  useEffect(() => {
    if (noComboCountdown === 0 && gameState.phase === 'COMBO_STEP') {
      handleFinishCombo(controlledPlayerIndex);
      setNoComboCountdown(null);
    }
  }, [noComboCountdown, gameState.phase, controlledPlayerIndex, handleFinishCombo]);

  return (
    <>
      {/* 4. 모달 오버레이들 */}
      {/* ========================================================= */}

      {/* 페이즈 전환 연출 애니메이션 배너 (매치 오프닝 오버레이 진행 중에는 disabled로 숨김 처리) */}
      <PhaseBannerOverlay
        phase={gameState.phase}
        turn={gameState.turn}
        activePlayerIndex={gameState.activePlayerIndex}
        isAiTurn={gameState.activePlayerIndex === 1 && gameState.players[1].isAi}
        disabled={showMatchOpening}
        drawCount={currentTurnDrawCount}
        isMultiplayer={isMultiplayer}
      />

      {/* 액션 덱 -> 손패 카드 드로우 비행 연출 오버레이 */}
      <CardDrawFlightOverlay
        isDrawing={isDrawFlightActive}
        playerIndex={gameState.activePlayerIndex}
        drawCount={currentTurnDrawCount}
      />

      {/* 중앙 3D 덱 드로우 & 카드 공개 연출 오버레이 (유희왕 마스터 듀얼 스타일) */}
      <CenterDrawOverlay
        isOpen={
          gameState.phase === 'DRAW_PHASE' &&
          !showMatchOpening &&
          !isFxBlocking && !gameState.pendingChoice
        }
        activePlayerIndex={gameState.activePlayerIndex}
        controlledPlayerIndex={controlledPlayerIndex}
        activePlayer={gameState.players[gameState.activePlayerIndex]}
        drawCount={currentTurnDrawCount}
        onExecuteDraw={(pIdx) => handleDrawCards(pIdx)}
        isSpectator={isSpectator}
        isSoloDual={gameState.gameMode === 'SOLO_DUAL'}
        gameMode={gameState.gameMode}
        gameState={gameState}
      />

      {/* 선공 결정 주사위 모달 (양측 주사위 투척 연출, 관전자는 제외) */}
      <InitiativeDiceModal
        isOpen={!isSpectator && isInitiativeRolling && (gameState.phase === 'LEADER_SELECT' || gameState.phase === 'MULLIGAN')}
        player0={gameState.players[0]}
        player1={gameState.players[1]}
        myPlayerIndex={isGuest ? 1 : 0}
        isMultiplayer={isMultiplayer}
        isSpectator={isSpectator}
        externalDiceResult={externalDiceResult}
        externalOrderChoice={externalOrderChoice}
        onSendDiceRoll={(val0, val1, winIdx) => {
          lastRoll0Ref.current = val0;
          lastRoll1Ref.current = val1;
          if (isHost) {
            multiplayerService.sendAction('INITIATIVE_ROLL', 0, { val0, val1, winIdx });
          }
        }}
        onSendOrderChoice={(order) => {
          if (isMultiplayer) {
            multiplayerService.sendAction('CHOOSE_ORDER', isGuest ? 1 : 0, {
              order,
              val0: lastRoll0Ref.current,
              val1: lastRoll1Ref.current,
            });
          }
        }}
        onComplete={(firstPlayerIndex, roll0, roll1, choiceDetail) => {
          setIsInitiativeRolling(false);
          if (!isGuest) {
            handleSetInitiative(firstPlayerIndex, roll0, roll1, choiceDetail);
          }
        }}
      />

      {/* 시작 리더 카드 선택 모달 (주사위 결정 연출 완료 후 노출) */}
      {gameState.phase === 'LEADER_SELECT' && !isInitiativeRolling && (
        isSpectator ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
            <div className="bg-[#0c101b]/95 border border-indigo-500/70 p-6 shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-white font-bold text-sm">
                대결 준비 중 (리더 선택)
              </div>
              <div className="text-xs text-slate-400">
                양 플레이어가 시작 리더를 선택하는 중입니다... ⏳
              </div>
            </div>
          </div>
        ) : isMultiplayer && hasSelectedMyLeader ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
            <div className="bg-[#0c101b]/95 border border-[#f97316]/70 p-6 shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
              <div className="text-white font-bold text-sm">
                시작 리더 선택 완료!
              </div>
              <div className="text-xs text-slate-400">
                상대방이 시작 리더를 선택하는 중입니다... ⏳
              </div>
            </div>
          </div>
        ) : (
          <LeaderSelectModal
            isOpen={true}
            player={isGuest ? gameState.players[1] : gameState.players[leaderSelectPlayerIndex]}
            isFirstTurnPlayer={gameState.activePlayerIndex === (isGuest ? 1 : leaderSelectPlayerIndex)}
            titlePrefix={
              isGuest
                ? 'P2 (당신)'
                : gameState.gameMode === 'SOLO_DUAL'
                ? (leaderSelectPlayerIndex === 0 ? 'P1 (당신)' : 'P2 (상대)')
                : undefined
            }
            onConfirm={(selectedCharName) => {
              if (isGuest) {
                handleSelectStartingLeader(selectedCharName);
              } else if (gameState.gameMode === 'SOLO_DUAL' && leaderSelectPlayerIndex === 0) {
                setP0ChosenLeader(selectedCharName);
                setLeaderSelectPlayerIndex(1);
              } else if (gameState.gameMode === 'SOLO_DUAL' && leaderSelectPlayerIndex === 1) {
                handleSelectStartingLeader(p0ChosenLeader || selectedCharName, selectedCharName);
                setLeaderSelectPlayerIndex(0);
              } else {
                handleSelectStartingLeader(selectedCharName);
              }
            }}
          />
        )
      )}

      {/* 멀리건 모달 (시작 리더 선택 완료 후 노출) */}
      {gameState.phase === 'MULLIGAN' && !isInitiativeRolling && (
        isSpectator ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
            <div className="bg-[#0c101b]/95 border border-indigo-500/70 p-6 shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-white font-bold text-sm">
                대결 준비 중 (패 교체)
              </div>
              <div className="text-xs text-slate-400">
                양 플레이어가 초기 손패 멀리건을 진행하고 있습니다... ⏳
              </div>
            </div>
          </div>
        ) : isMultiplayer && hasCompletedMyMulligan ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
            <div className="bg-[#0c101b]/95 border border-[#22d3ee]/70 p-6 shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-[#22d3ee] border-t-transparent rounded-full animate-spin" />
              <div className="text-white font-bold text-sm">
                멀리건 확인 완료!
              </div>
              <div className="text-xs text-slate-400">
                상대방이 멀리건을 진행하고 있습니다... ⏳
              </div>
            </div>
          </div>
        ) : (
          <MulliganModal
            hand={activeControlledPlayer.hand}
            deck={activeControlledPlayer.actionDeck}
            onConfirm={handleMulligan}
          />
        )
      )}

      {/* 매치 개시 양측 리더 컷인 및 출격 오프닝 대사 멘트 & 사운드 오버레이 */}
      {showMatchOpening && (
        <MatchOpeningOverlay
          p0Leader={p0.slots.leader}
          p1Leader={p1.slots.leader}
          p0Name={p0.name}
          p1Name={p1.name}
          onDismiss={handleDismissMatchOpening}
          myPlayerIndex={viewerPlayerIndex}
          isMultiplayer={isMultiplayer}
        />
      )}

      {/* 턴 종료 재확인 중앙 경고 모달 */}
      {isConfirmingEndTurn && gameState.phase === 'ACTION_PHASE' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="mobile-modal-scaled modal-readable relative bg-[#0c101b] border-2 border-[#f97316] max-w-md w-full p-6 shadow-[0_0_50px_rgba(0,0,0,0.95),0_0_25px_rgba(249,115,22,0.35)] flex flex-col gap-4 text-center">
            <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
            <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

            <div className="text-lg sm:text-xl font-black text-white flex items-center justify-center gap-2">
              <span className="text-[#f97316]">⚠️</span>
              <span>턴 종료 확인</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              배틀 페이즈에 진입하지 않고 바로 <strong className="text-[#f97316]">턴을 종료</strong>하시겠습니까?<br />
              <span className="text-xs text-slate-400">(배틀을 건너뛰면 상대방이 【우세】를 획득합니다)</span>
            </p>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={() => setIsConfirmingEndTurn(false)}
                className="py-2.5 px-4 bg-[#111520] hover:bg-[#1a2234] text-slate-300 font-bold text-xs sm:text-sm border border-white/15 transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setIsConfirmingEndTurn(false);
                  handleDecideClash(false);
                }}
                className="py-2.5 px-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-lg shadow-[#f97316]/30 transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                턴 종료 확정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 캐릭터 진화/레벨업 모달 (P0/P1 양측 지원) */}
      {upgradeTarget && (
        <UpgradeModal
          currentSlotName={upgradeTarget.slotName}
          currentChar={upgradeTarget.char}
          availableUpgrades={upgradeTarget.available}
          hand={gameState.players[upgradeTarget.playerIndex].hand}
          hasYangyangLv2={upgradeTarget.hasYangyangLv2}
          requiredDiscardCount={upgradeTarget.requiredDiscard}
          onUpgrade={(upgradeCardId: string, discardIds: string[]) => {
            handleUpgrade(upgradeTarget.playerIndex, upgradeTarget.slotName, upgradeCardId, discardIds);
            setUpgradeTarget(null);
          }}
          onClose={() => setUpgradeTarget(null)}
        />
      )}

      {/* 대결 오픈 & 상성 판정 애니메이션 모달 (승패가 결정되는 막타 판정인 경우에도 결과를 완전히 확인할 수 있도록 유지) */}
      {Boolean(gameState.clashResult) && (
        <ClashAnimationOverlay
          clashResult={gameState.clashResult!}
          players={gameState.players}
          onDismiss={handleProceedAfterClash}
          myPlayerIndex={viewerPlayerIndex}
          isMultiplayer={isMultiplayer}
        />
      )}

      {/* 트래시 에리어 및 협주 존 카드 목록 모달 */}
      {cardListModalState && (
        <Suspense fallback={null}>
          <CardListModal
            isOpen={cardListModalState.isOpen}
            onClose={() => setCardListModalState(null)}
            title={cardListModalState.title}
            type={cardListModalState.type}
            cards={cardListModalState.cards}
            onSelectCard={(card) => {
              setPreviewCard(card);
            }}
          />
        </Suspense>
      )}

      {/* 공식 룰 가이드 모달 */}
      {isRulesOpen && (
        <Suspense fallback={null}>
          <RulesGuideModal
            isOpen={isRulesOpen}
            onClose={() => setIsRulesOpen(false)}
          />
        </Suspense>
      )}

      {/* 카드 도감 모달 */}
      {isCatalogOpen && (
        <Suspense fallback={null}>
          <CardCatalogModal
            isOpen={isCatalogOpen}
            onClose={() => setIsCatalogOpen(false)}
          />
        </Suspense>
      )}

      {/* 게임 종료 치명타 피니시(카드 파쇄) 연출 및 종료 모달 (대결 결과창 및 연격 참격 연출이 완전히 끝난 후 순차 진행) */}
      {gameState.phase === 'GAME_OVER' &&
        gameState.winner !== null &&
        !gameState.clashResult &&
        !isFxBlocking && (
        !isFinisherFinished ? (
          <CinematicFinisherOverlay
            winner={gameState.winner as 0 | 1}
            players={gameState.players}
            onComplete={() => setIsFinisherFinished(true)}
            myPlayerIndex={viewerPlayerIndex}
            isMultiplayer={isMultiplayer}
          />
        ) : (
          <GameOverModal
            winner={gameState.winner as 0 | 1}
            players={gameState.players}
            turn={gameState.turn}
            currentReplay={currentMatchReplay}
            onRestart={handleRestartBattle}
            onExitToLobby={onExitToLobby}
            onOpenReplay={() => setIsReplayOpen(true)}
            onPlayBattleReplay={onPlayBattleReplay}
            onReplayFinisher={() => setIsFinisherFinished(false)}
            isMultiplayer={isMultiplayer}
            myPlayerIndex={viewerPlayerIndex}
          />
        )
      )}

      {/* 게임 진행 중 나가기 확인 팝업 모달 */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
          <div className="mobile-modal-scaled modal-readable relative w-full max-w-md bg-[#0c101b]/95 backdrop-blur-md border border-[#f97316]/60 p-6 shadow-[0_0_50px_rgba(0,0,0,0.95)] text-slate-100 flex flex-col items-center text-center overflow-hidden">
            {/* 네 모서리 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
            <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
            <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

            {/* 상단 장식 빛 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-gradient-to-r from-transparent via-[#f97316] to-transparent shadow-[0_0_15px_#f97316]" />

            <div className="w-14 h-14 bg-[#111520] text-[#f97316] flex items-center justify-center border border-[#f97316]/40 mb-3 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <AlertTriangle className="w-7 h-7 text-[#f97316]" />
            </div>

            <h3 className="text-xl font-black text-white mb-2 tracking-wide font-mono">
              게임 진행 중
            </h3>

            <p className="text-sm font-bold text-[#f97316] mb-1">
              게임이 진행 중입니다. 나가시겠습니까?
            </p>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              지금 나가시면 현재 배틀 진행 데이터가 저장되지 않고 메인 대기실로 이동합니다.
            </p>

            <div className="w-full flex flex-col sm:flex-row items-center gap-2.5">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full sm:flex-1 py-2.5 px-3 bg-[#111520] hover:bg-[#1a2234] text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer border border-white/15 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  handleRestartBattle();
                }}
                className="w-full sm:flex-1 py-2.5 px-3 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-xs sm:text-sm transition cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.3)] flex items-center justify-center gap-1.5 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>게임 다시시작</span>
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  if (isMultiplayer && !isSpectator && gameState.phase !== 'GAME_OVER' && gameState.winner === null) {
                    multiplayerService.sendSurrender(isGuest ? 1 : 0);
                  }
                  if (onExitToLobby) onExitToLobby();
                }}
                className="w-full sm:flex-1 py-2.5 px-3 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-[0_0_15px_rgba(225,29,72,0.3)] flex items-center justify-center gap-1.5 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{isMultiplayer ? '항복 후 나가기' : '나가기'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 항복(기권) 확인 모달 */}
      {showSurrenderConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
          <div className="mobile-modal-scaled modal-readable relative w-full max-w-md bg-[#0c101b]/95 backdrop-blur-md border border-rose-500/70 p-6 shadow-[0_0_50px_rgba(0,0,0,0.95)] text-slate-100 flex flex-col items-center text-center overflow-hidden">
            <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-rose-500" />
            <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-rose-500" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_#f43f5e]" />

            <div className="w-14 h-14 bg-[#111520] text-rose-400 flex items-center justify-center border border-rose-500/40 mb-3 shadow-[0_0_15px_rgba(244,63,94,0.2)] text-2xl">
              🏳️
            </div>

            <h3 className="text-xl font-black text-white mb-2 tracking-wide font-mono">
              항복 확인
            </h3>

            <p className="text-sm font-bold text-rose-400 mb-1">
              현재 대결을 포기하고 항복하시겠습니까?
            </p>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              항복을 선언하면 즉시 패배 처리되며 상대방의 승리로 경기가 종료됩니다.
            </p>

            <div className="w-full grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowSurrenderConfirm(false)}
                className="py-2.5 px-4 bg-[#111520] hover:bg-[#1a2234] text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer border border-white/15 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                취소
              </button>
              <button
                onClick={handleSurrenderConfirm}
                className="py-2.5 px-4 bg-rose-700 hover:bg-rose-600 text-white font-black text-xs sm:text-sm transition cursor-pointer shadow-[0_0_15px_rgba(225,29,72,0.4)] flex items-center justify-center gap-1.5 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                <span>🏳️</span>
                <span>항복 선언</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 대전 복기 리플레이 모달 */}
      {isReplayOpen && (
        <Suspense fallback={null}>
          <BattleReplayModal
            isOpen={isReplayOpen}
            onClose={() => setIsReplayOpen(false)}
            onPlayBattleReplay={onPlayBattleReplay}
          />
        </Suspense>
      )}

      {/* 협주 게이지 소모 선택 모달 */}
      <ConcertoSelectModal
        isOpen={concertoModalState.isOpen}
        onClose={() => setConcertoModalState((prev) => ({ ...prev, isOpen: false, targetCard: null }))}
        concertoCards={gameState.players[concertoModalState.playerIndex].concertoZone}
        requiredCost={concertoModalState.requiredCost}
        targetCard={concertoModalState.targetCard}
        actionType={concertoModalState.actionType}
        onConfirm={(selectedConcertoIds) => {
          if (concertoModalState.actionType === 'CLASH' && concertoModalState.targetCard) {
            handleSetClashCard(concertoModalState.playerIndex, concertoModalState.targetCard.id, selectedConcertoIds);
          } else if (concertoModalState.actionType === 'COMBO' && concertoModalState.targetCard) {
            const targetCard = concertoModalState.targetCard;
            const pIdx = concertoModalState.playerIndex;
            const pState = gameState.players[pIdx];
            if (isIntroSkillCard(targetCard) && !pState.actionFlags.leaderSwapLockedThisTurn) {
              setIntroSwapModalState({
                isOpen: true,
                targetCard,
                spentConcertoIds: selectedConcertoIds,
                playerIndex: pIdx,
              });
            } else {
              handleComboAttack(pIdx, targetCard.id, selectedConcertoIds);
            }
          }
        }}
      />

      {/* <변주 스킬> 발동 시 리더와 교체할 백(서포터) 캐릭터 선택 모달 */}
      {introSwapModalState.isOpen && introSwapModalState.targetCard && (() => {
        const swapPlayer = gameState.players[introSwapModalState.playerIndex];
        const card = introSwapModalState.targetCard;
        const targetCharName = getIntroSkillTargetChar(card);
        const currentLeader = swapPlayer.slots.leader;
        const isLeaderAlreadyTarget = doesCharMatchIntroTarget(currentLeader, targetCharName);
        const supportOptions = (
          [
            { slotKey: 'leftSupport' as const, label: '좌측 백 (LEFT SUPPORT)', char: swapPlayer.slots.leftSupport },
            { slotKey: 'rightSupport' as const, label: '우측 백 (RIGHT SUPPORT)', char: swapPlayer.slots.rightSupport },
          ]
        ).filter((item): item is { slotKey: 'leftSupport' | 'rightSupport'; label: string; char: CharacterCard } => Boolean(item.char));

        if (isIntroSwapFieldPeek) {
          return (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-top-4 select-none">
              <button
                type="button"
                onClick={() => setIsIntroSwapFieldPeek(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0c101b]/95 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.7)] text-xs sm:text-sm font-black transition cursor-pointer hover:bg-cyan-950/80 hover:scale-105 active:scale-95 animate-pulse"
              >
                <EyeOff className="w-4 h-4 text-cyan-300" />
                <span>필드 상황 확인 중 · 변주 교체창 복귀 (클릭)</span>
              </button>
            </div>
          );
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
            <div className="mobile-modal-scaled modal-readable relative w-full max-w-2xl bg-[#0c101b]/95 border border-[#f97316]/70 p-6 sm:p-7 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col gap-4 overflow-hidden">
              {/* 네 모서리 명조 택티컬 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
              <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
              <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

              <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 bg-[#111520] border border-[#f97316]/50 flex items-center justify-center text-[#f97316] shadow">
                    <ArrowLeftRight className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-black text-white">변주 스킬 리더 교체 대상 선택</h3>
                      <span className="text-xs sm:text-sm px-2.5 py-0.5 bg-[#141a29] text-[#f97316] border border-[#f97316]/40 font-bold font-mono">
                        {card.nameKr}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 mt-1">
                      현재 리더 <strong className="text-[#f97316]">[{currentLeader.nameKr}]</strong>와(과) 자리를 교체할 백(서포터) 캐릭터를 선택하세요.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIntroSwapFieldPeek(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs sm:text-sm font-bold transition shadow-md cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                  title="모달을 잠시 접어두고 필드 상황을 확인합니다"
                >
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>필드 확인</span>
                </button>
              </div>

              <div className="bg-[#111520]/80 border border-[#f97316]/30 p-4 text-sm sm:text-base text-slate-100 leading-relaxed shadow-inner">
                <div className="font-bold text-[#f97316] text-sm sm:text-base mb-1">
                  효과 조건: 「{targetCharName || '대상 캐릭터'}」가 {card.code === 'BP01-046' ? '리더로 교체된 경우' : '교체될 경우'} 추가 효과 발동
                </div>
                <div className="text-slate-200 text-sm sm:text-base leading-relaxed">{formatEffectText(card.description, 'md')}</div>
                {isLeaderAlreadyTarget && card.code !== 'BP01-046' && (
                  <p className="text-emerald-400 font-bold mt-2 text-xs sm:text-sm">
                    ✓ 현재 「{currentLeader.nameKr}」가 리더 자리에 있으므로, 어느 백 캐릭터와 교체하더라도 「{currentLeader.nameKr}」가 교체되어 변주 스킬 추가 효과가 정상 발동됩니다!
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 py-1">
                {supportOptions.map(({ slotKey, label, char }) => {
                  const triggersBonus =
                    (isLeaderAlreadyTarget && card.code !== 'BP01-046') ||
                    doesCharMatchIntroTarget(char, targetCharName);
                  return (
                    <button
                      key={slotKey}
                      onClick={() => {
                        const charName = char.characterName || char.nameKr;
                        soundEffects.playLeaderSwitch(charName);
                        const pIdx = introSwapModalState.playerIndex;
                        const spentIds = introSwapModalState.spentConcertoIds;
                        setIntroSwapModalState({
                          isOpen: false,
                          targetCard: null,
                          spentConcertoIds: undefined,
                          playerIndex: 0,
                        });
                        handleComboAttack(pIdx, card.id, spentIds, undefined, slotKey);
                      }}
                      className={`group relative overflow-hidden border p-3 flex flex-col items-center gap-2.5 transition transform hover:scale-[1.02] cursor-pointer text-left ${
                        triggersBonus
                          ? 'border-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/50 shadow-[0_0_25px_rgba(52,211,153,0.3)]'
                          : 'border-white/10 bg-[#0c101b] hover:border-[#f97316]/70 hover:bg-[#111520]'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between text-xs sm:text-sm font-bold">
                        <span className="text-slate-400 font-mono">{label}</span>
                        {triggersBonus ? (
                          <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 font-black text-xs">
                            ✨ 변주 보너스 발동
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#141a29] text-slate-300 font-bold text-xs border border-white/10">
                            일반 리더 교체
                          </span>
                        )}
                      </div>

                      <div className="relative w-36 aspect-[5/7] overflow-hidden border border-white/15 shadow-lg">
                        <img src={char.artUrl} alt={char.nameKr} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1.5 text-center">
                          <div className="text-sm font-black text-white truncate">{char.nameKr}</div>
                          <div className="text-xs font-mono font-bold text-[#f97316]">
                            Lv.{char.level} · {getElementKr(char.element)}
                          </div>
                        </div>
                      </div>

                      <div className="w-full py-2.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] group-hover:brightness-110 text-white font-black text-xs sm:text-sm text-center shadow transition [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]">
                        [{char.nameKr}] 리더로 교체 후 공격
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2 border-t border-white/10">
                <button
                  onClick={() =>
                    setIntroSwapModalState({
                      isOpen: false,
                      targetCard: null,
                      spentConcertoIds: undefined,
                      playerIndex: 0,
                    })
                  }
                  className="px-4 py-2 bg-[#111520] hover:bg-[#1a2234] text-slate-300 font-bold text-xs transition cursor-pointer border border-white/10 [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 연격 카드 없음 / 추격 횟수 소진 알림 팝업 모달 */}
      {!isFxBlocking && !gameState.pendingChoice && (!gameState.pendingChoiceQueue || gameState.pendingChoiceQueue.length === 0) &&
        !introSwapModalState.isOpen &&
        !concertoModalState.isOpen &&
        !isMultiplayer &&
        isPlayerComboPhase &&
        !canPlayerExecuteCombo(activeControlledPlayer) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
            <div className="mobile-modal-scaled modal-readable relative max-w-md w-full bg-[#0c101b]/95 border border-[#f97316]/80 p-6 shadow-[0_0_60px_rgba(249,115,22,0.3)] text-center flex flex-col items-center gap-4 overflow-hidden">
              {/* 네 모서리 명조 택티컬 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
              <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
              <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

              <div className="w-14 h-14 bg-[#111520] border border-[#f97316]/50 flex items-center justify-center text-[#f97316] shadow-lg">
                <AlertCircle className="w-8 h-8 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-white flex items-center justify-center gap-2">
                  <span>
                    {!activeControlledPlayer.comboUnlimited && (activeControlledPlayer.comboCount ?? 0) === 0
                      ? '추격(연격) 공격 완료'
                      : '연격 카드가 없습니다'}
                  </span>
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {!activeControlledPlayer.comboUnlimited && (activeControlledPlayer.comboCount ?? 0) === 0 ? (
                    <>
                      남은 추격(연격) 횟수를 모두 소진했습니다.<br />
                      <span className="text-xs text-[#f97316]/90 mt-1 block font-medium">연격을 종료하고 턴을 넘깁니다. (5초 후 자동 전환 또는 버튼 클릭)</span>
                    </>
                  ) : (
                    <>
                      손패에 사용할 수 있는 <strong className="text-[#f97316]">적색(RED) 연격 카드</strong>나 협주 에너지가 없습니다.<br />
                      <span className="text-xs text-[#f97316]/90 mt-1 block font-medium">연격을 종료하고 턴을 넘깁니다. (5초 후 자동 전환 또는 버튼 클릭)</span>
                    </>
                  )}
                </p>
              </div>

              {/* 5초 진행 바 */}
              <div className="w-full bg-[#070a12] h-1.5 overflow-hidden border border-[#f97316]/30">
                <div className="h-full bg-gradient-to-r from-[#ea580c] to-[#fb923c] animate-progress-5s" />
              </div>

              <div className="w-full bg-[#111520] p-3 border border-white/10 flex items-center justify-between px-4">
                <span className="text-xs font-bold text-slate-400">자동 턴 넘김 대기</span>
                <span className="text-sm font-black font-mono text-[#f97316] bg-[#0c101b] border border-[#f97316]/40 px-3 py-1">
                  {noComboCountdown !== null && noComboCountdown > 0 ? `${noComboCountdown}초 후 넘김` : '전환 중...'}
                </span>
              </div>

              <button
                onClick={() => {
                  setNoComboCountdown(null);
                  handleFinishCombo(controlledPlayerIndex);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-[#f97316]/20 active:scale-95 flex items-center justify-center gap-2 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                <span>즉시 턴 넘기기</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      {/* 선택 발동 효과 모달 (대결 결과 확인 창, 레벨업 및 연격 참격, 효과 드로우 연출 완료 후 표출) */}
      <EffectChoiceModal
        choice={
          !isSpectator &&
          (!isMultiplayer || gameState.pendingChoice?.playerIndex === controlledPlayerIndex) &&
          !isFxBlocking && !gameState.clashResult
            ? gameState.pendingChoice
            : null
        }
        onResolve={(chosenCardIds) => handleResolvePendingChoice(chosenCardIds)}
      />

      {/* 멀티플레이 상대방 효과 선택 중 대기 오버레이 (레벨업/연격/대결 결과/드로우 연출이 모두 끝난 뒤 표시) */}
      {isMultiplayer &&
        gameState.pendingChoice &&
        (isSpectator || gameState.pendingChoice.playerIndex !== controlledPlayerIndex) &&
        !isFxBlocking && !gameState.clashResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="bg-[#0c101b]/95 border border-cyan-400/60 p-6 shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-white font-bold text-sm">
              {isSpectator
                ? `${gameState.players[gameState.pendingChoice.playerIndex].name} 선수가 효과를 선택하고 있습니다...`
                : `상대방(${otherPlayer.name})이 효과를 선택하고 있습니다...`}
            </div>
            <div className="text-xs text-slate-400">
              선택 완료 시 자동으로 진행됩니다. ⏳
            </div>
          </div>
        </div>
      )}

      {/* 캐릭터 진화 계보 & 상속 스킬 모람 팝업 모달 */}
      <EvolutionTreeModal
        isOpen={Boolean(evolutionModalChar)}
        onClose={() => setEvolutionModalChar(null)}
        character={evolutionModalChar}
      />

      {/* 생명력(HP) 변동 상세 이력 모달 (HP 게이지 클릭 시 표출) */}
      <HpHistoryModal
        isOpen={isHpHistoryModalOpen}
        onClose={() => setIsHpHistoryModalOpen(false)}
        history={gameState.hpHistory}
        players={gameState.players}
      />

      {/* 실시간 카드 효과 발동 알림 토스트 (판정 연출 중에는 화면 겹침 방지를 위해 보류) */}
      {/* 인게임 실전 대화형 튜토리얼 캐릭터 말풍선 가이드 (멀티플레이에서는 비활성화) */}
      {!isMultiplayer && (
        <InGameTutorialOverlay
          gameState={gameState}
          isActive={showTutorialOverlay}
          onClose={() => setShowTutorialOverlay(false)}
        />
      )}

      {/* [멀티플레이] 60초 네트워크 끊김 및 재접속 대기 오버레이 */}
      {isMultiplayerDisconnected && (
        <MultiplayerDisconnectOverlay
          countdownSec={disconnectCountdown ?? 60}
          isHost={multiplayerRole === 'HOST'}
          onSurrenderOrLeave={() => {
            multiplayerService.send({ type: 'SURRENDER', playerIndex: controlledPlayerIndex });
            multiplayerService.cleanUp();
            if (onExitToLobby) onExitToLobby();
          }}
          onAttemptReconnect={() => {
            multiplayerService.attemptReconnect();
          }}
        />
      )}

      {/* [모바일 전용] 선택 카드 상세 정보 팝업 모달 */}
      {showMobileCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="relative mobile-modal-scaled modal-readable w-full max-w-sm max-h-[92dvh] overflow-y-auto custom-scrollbar bg-[#0c101b]/98 border border-[#f97316]/70 p-4 shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col gap-3">
            <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
            <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-1.5 font-black text-sm text-[#f97316]">
                <span>✦ CARD PREVIEW</span>
              </div>
              <button
                onClick={() => setShowMobileCardModal(false)}
                className="p-1.5 bg-[#111520] hover:bg-[#1a2234] text-slate-400 hover:text-white border border-white/15 cursor-pointer [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {previewCard ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-44 aspect-[5/7] rounded-xl overflow-hidden border-2 border-[#f97316]/60 shadow-2xl bg-slate-950">
                  <img
                    src={previewCard.artUrl}
                    alt={previewCard.nameKr}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="w-full text-center space-y-1">
                  <h3 className="font-black text-lg text-white">{previewCard.nameKr}</h3>
                  <div className="flex items-center justify-center gap-2 text-xs font-mono">
                    <span className="px-2 py-0.5 bg-[#141a29] text-[#f97316] border border-[#f97316]/40">
                      {previewCard.kind}
                    </span>
                    {previewCard.kind === 'ACTION' ? (
                      <span className="px-2 py-0.5 bg-slate-800 text-cyan-300">
                        비용 {previewCard.cost} · 피해 {previewCard.damage}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-800 text-cyan-300">
                        Lv.{previewCard.level} {getElementKr(previewCard.element)}
                      </span>
                    )}
                  </div>
                </div>
                {previewCard.description && (
                  <div className="w-full bg-[#111520] p-3 border border-white/10 rounded text-xs leading-relaxed text-slate-200 text-left">
                    {formatEffectText(previewCard.description, 'sm')}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs font-mono">
                현재 선택된 카드가 없습니다.<br />손패나 필드의 카드를 터치하세요.
              </div>
            )}
          </div>
        </div>
      )}

      {/* [모바일 전용] 배틀 로그 팝업 모달 */}
      {showMobileLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="relative mobile-modal-scaled modal-readable w-full max-w-md h-[80dvh] bg-[#0c101b]/98 border border-[#22d3ee]/70 p-4 shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col gap-2">
            <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#22d3ee]" />
            <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#22d3ee]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#f97316]" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#f97316]" />

            <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
              <div className="flex items-center gap-1.5 font-black text-sm text-[#22d3ee]">
                <ScrollText className="w-4 h-4" />
                <span>실시간 배틀 로그 ({gameState.logs.length}건)</span>
              </div>
              <button
                onClick={() => setShowMobileLogModal(false)}
                className="p-1.5 bg-[#111520] hover:bg-[#1a2234] text-slate-400 hover:text-white border border-white/15 cursor-pointer [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0 text-xs">
              {gameState.logs.slice().reverse().map((log: LogItem, idx: number) => (
                <div
                  key={log.id || idx}
                  className={`p-2 border rounded ${
                    log.type === 'DAMAGE'
                      ? 'bg-red-950/30 border-red-500/40 text-red-200'
                      : log.type === 'HEAL'
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-[#111520] border-white/10 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-mono font-bold text-[#f97316]">TURN {log.turn}</span>
                    <span className="uppercase font-mono">{log.type}</span>
                  </div>
                  <div className="leading-snug">{formatBattleLogText(getDisplayLogText(log))}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
