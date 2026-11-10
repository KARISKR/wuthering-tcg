// src/components/battle/BattleReplayV2Stage.tsx
// [WP8-6] 리플레이 v2 전용 정밀 재생 뷰어 (BattleLayout + FxQueueHost 재사용)
import React, { Suspense, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Home,
} from 'lucide-react';
import { BattleLayout } from './BattleLayout';
import { BattleStoreProvider, createBattleStore, useBattleStore } from '../../battle/store';
import { FxQueueHost } from '../../battle/fxQueue';
import { ReplaySource } from '../../battle/ReplaySource';
import type { BattleReplayData } from '../../utils/replayManager';
import { CURRENT_GAME_VERSION } from '../../data/gameVersion';
import { getOfficialCardByCode } from '../../data/officialCards';
import { formatChessTime } from '../../hooks/useBattleTimer';
import { formatEffectText } from '../../utils/formatEffectText';
import { getElementKr } from '../../types/tcg';
import { useBattleViewport } from '../../hooks/useBattleViewport';
import { useBattleAudio } from '../../hooks/useBattleAudio';
import { useBattleLayoutProps } from '../../hooks/useBattleLayoutProps';
import { PhaseBannerOverlay } from '../PhaseBannerOverlay';
import { ClashAnimationOverlay } from '../ClashAnimationOverlay';
import { CinematicFinisherOverlay } from '../CinematicFinisherOverlay';
import { CardListModal } from '../CardListModal';
import { EvolutionTreeModal } from '../EvolutionTreeModal';
import { HpHistoryModal } from '../HpHistoryModal';

export interface BattleReplayV2StageProps {
  replay: BattleReplayData;
  onExit: () => void;
}

export const BattleReplayV2Stage: React.FC<BattleReplayV2StageProps> = ({ replay, onExit }) => {
  const v2 = replay.v2!;

  const replaySource = useMemo(() => new ReplaySource(v2), [v2]);
  const replayStore = useMemo(
    () =>
      createBattleStore(replaySource, {
        isInitiativeRolling: false,
      }),
    [replaySource]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  const isFxBlocking = useBattleStore((s) => s.isFxBlocking, Object.is, replayStore);
  const cardListModalState = useBattleStore((s) => s.cardListModalState, Object.is, replayStore);
  const evolutionModalChar = useBattleStore((s) => s.evolutionModalChar, Object.is, replayStore);
  const isHpHistoryModalOpen = useBattleStore((s) => s.isHpHistoryModalOpen, Object.is, replayStore);
  const isFinisherFinished = useBattleStore((s) => s.isFinisherFinished, Object.is, replayStore);

  // ReplaySource 프레임 변경 동기화 및 블로킹 연출 대기 조건 연결
  useEffect(() => {
    replaySource.setAutoStepCondition(
      () => !replayStore.fxQueue.getIsBlocking() && !replaySource.getState().clashResult
    );

    const unsub = replaySource.subscribe(() => {
      setCurrentIndex(replaySource.getCurrentIndex());
      setIsPlaying(replaySource.getIsPlaying());
    });

    return () => {
      unsub();
      replaySource.setAutoStepCondition(null);
      replaySource.destroy();
    };
  }, [replaySource, replayStore]);

  const currentFrame = replaySource.getCurrentFrame();
  const gameState = currentFrame.state;
  const lastEvents = currentFrame.events;
  const totalFrames = replaySource.getTotalFrames();

  const isVersionMismatch = !replaySource.isVersionMatched;
  const isFingerprintMismatch = !replaySource.isFingerprintMatched;

  // 뷰포트 스케일링
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
    battleLayoutMode,
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
  } = useBattleViewport({ initialPreviewCard: gameState.players[0].slots.leader });

  const p0 = gameState.players[0];
  const p1 = gameState.players[1];
  const activeControlledPlayer = p0;
  const otherPlayer = p1;

  const currentTurnDrawCount = gameState.turn === 1 && !gameState.firstTurnDrawCompleted ? 1 : 2;
  const logEndRef = useRef<HTMLDivElement>(null);

  const {
    p0DamageAlert,
    p1DamageAlert,
    p0HealAlert,
    p1HealAlert,
    p0DeckDrawing,
    p1DeckDrawing,
  } = useBattleAudio({
    gameState,
    p0,
    p1,
    isDrawFlightActive: false,
    lastEvents,
    isFxBlocking,
    isRulesOpen: false,
    isCatalogOpen: false,
    isReplayOpen: false,
    showMatchOpening: false,
    showExitConfirm: false,
    isInitiativeRolling: false,
    evolutionModalChar,
    cardListModalState,
    concertoModalState: { isOpen: false },
  });

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.logs.length]);

  const handleStepForward = useCallback(() => {
    replayStore.fxQueue.clear();
    replaySource.stepForward();
    setCurrentIndex(replaySource.getCurrentIndex());
    setIsPlaying(replaySource.getIsPlaying());
  }, [replaySource, replayStore]);

  const handleStepBackward = useCallback(() => {
    replayStore.fxQueue.clear();
    replaySource.stepBackward();
    setCurrentIndex(replaySource.getCurrentIndex());
    setIsPlaying(replaySource.getIsPlaying());
  }, [replaySource, replayStore]);

  const handleTogglePlay = useCallback(() => {
    replaySource.togglePlay();
    setIsPlaying(replaySource.getIsPlaying());
  }, [replaySource]);

  const handleSpeedChange = useCallback(
    (newSpeed: 1 | 2 | 4) => {
      setSpeed(newSpeed);
      replaySource.setSpeed(newSpeed);
    },
    [replaySource]
  );

  const handleTurnJump = useCallback(
    (targetTurn: number) => {
      replayStore.fxQueue.clear();
      replaySource.jumpToTurn(targetTurn);
      setCurrentIndex(replaySource.getCurrentIndex());
    },
    [replaySource, replayStore]
  );

  // 자동 재생 중 격돌 결과창(ClashAnimationOverlay)이 열리면 5단계 연출 완료 후 자동으로 다음 프레임 진행
  useEffect(() => {
    if (!isPlaying || !gameState.clashResult) return;
    const waitMs = Math.max(1500, Math.round(5200 / speed));
    const timer = setTimeout(() => {
      replaySource.stepForward();
      setCurrentIndex(replaySource.getCurrentIndex());
      setIsPlaying(replaySource.getIsPlaying());
    }, waitMs);
    return () => clearTimeout(timer);
  }, [isPlaying, gameState.clashResult, speed, replaySource]);

  const openCardListModal = useCallback(
    (type: 'TRASH' | 'CONCERTO' | 'CHARACTER', playerIndex: 0 | 1) => {
      const targetPlayer = replayStore.getState().gameState.players[playerIndex];
      const playerLabel = playerIndex === 0 ? `${targetPlayer.name} (P1)` : `${targetPlayer.name} (P2)`;
      if (type === 'TRASH') {
        replayStore.setState({
          cardListModalState: {
            isOpen: true,
            title: `${playerLabel} 트래시 에리어`,
            type: 'TRASH',
            cards: targetPlayer.dropZone,
          },
        });
      } else if (type === 'CONCERTO') {
        replayStore.setState({
          cardListModalState: {
            isOpen: true,
            title: `${playerLabel} 협주(코스트) 존`,
            type: 'CONCERTO',
            cards: targetPlayer.concertoZone,
          },
        });
      } else {
        replayStore.setState({
          cardListModalState: {
            isOpen: true,
            title: `${playerLabel} 캐릭터 진화 덱`,
            type: 'CHARACTER',
            cards: targetPlayer.characterDeck,
          },
        });
      }
    },
    [replayStore]
  );

  // 상단 정밀 리플레이 커스텀 헤더 및 컨트롤 바
  const customTopBar = (
    <div className="w-full bg-[#0c101b]/95 border-b border-[#f97316]/50 shadow-[0_4px_25px_rgba(0,0,0,0.8)] backdrop-blur-md z-40 px-3 py-1.5 flex flex-col gap-1 select-none">
      {/* 경고 알림 바 (버전 불일치 또는 지문 불일치 시) */}
      {(isVersionMismatch || isFingerprintMismatch) && (
        <div className="w-full bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs px-3 py-1 flex items-center justify-between gap-2 rounded">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {isVersionMismatch &&
                `엔진 버전 차이 (리플레이: v${v2.engineVersion} / 현재: v${CURRENT_GAME_VERSION}) — 일부 연출 또는 판정이 다를 수 있습니다.`}
              {isVersionMismatch && isFingerprintMismatch && ' | '}
              {isFingerprintMismatch && '최종 결과 지문 불일치 감지'}
            </span>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono">Replay V2</span>
        </div>
      )}

      {/* 리플레이 조작 네비게이션 헤더 */}
      <div className="flex items-center justify-between gap-2">
        {/* 좌측: 타이틀 및 배지 */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-[#f97316] text-black text-[11px] font-black rounded flex items-center gap-1 shadow-sm">
            <Sparkles className="w-3 h-3 text-black" />
            <span>정밀 재생 (v2)</span>
          </span>
          <span className="text-xs font-bold text-slate-300 hidden sm:inline">
            {replay.p0Name} <span className="text-slate-500 font-normal">vs</span> {replay.p1Name}
          </span>
          <span className="text-xs font-mono text-[#f97316] font-bold">
            Turn {gameState.turn} <span className="text-slate-500">({gameState.phase})</span>
          </span>
        </div>

        {/* 중앙: 재생 컨트롤러 */}
        <div className="flex items-center gap-1 bg-[#111520] p-1 rounded-lg border border-white/10 shadow-inner">
          <button
            onClick={() => handleTurnJump(Math.max(1, gameState.turn - 1))}
            className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition cursor-pointer"
            title="이전 턴으로 이동"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleStepBackward}
            disabled={currentIndex === 0}
            className="p-1 hover:bg-white/10 text-slate-400 hover:text-white disabled:text-slate-700 rounded transition cursor-pointer"
            title="1단계 뒤로"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleTogglePlay}
            className="px-2.5 py-1 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:brightness-110 text-white rounded font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow"
            title={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="text-[11px] font-black">{isPlaying ? '정지' : '재생'}</span>
          </button>
          <button
            onClick={handleStepForward}
            disabled={currentIndex >= totalFrames - 1}
            className="p-1 hover:bg-white/10 text-slate-400 hover:text-white disabled:text-slate-700 rounded transition cursor-pointer"
            title="1단계 앞으로"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleTurnJump(gameState.turn + 1)}
            className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition cursor-pointer"
            title="다음 턴으로 이동"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* 배속 선택 버튼들 */}
          <div className="flex items-center ml-1 border-l border-white/10 pl-1.5 gap-0.5">
            {([1, 2, 4] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-1.5 py-0.5 text-[10px] font-black rounded transition cursor-pointer ${
                  speed === s
                    ? 'bg-amber-400 text-black shadow-xs'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* 우측: 프레임 표시 및 나가기 버튼 */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
            Frame <strong className="text-amber-400">{currentIndex}</strong> / {totalFrames - 1}
          </span>
          <button
            onClick={onExit}
            className="px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-200 hover:text-white text-xs font-bold rounded border border-rose-600/40 transition cursor-pointer flex items-center gap-1 shadow"
          >
            <Home className="w-3 h-3" />
            <span>나가기</span>
          </button>
        </div>
      </div>
    </div>
  );

  const myActionCards =
    activeControlledPlayer.actionArea && activeControlledPlayer.actionArea.length > 0
      ? activeControlledPlayer.actionArea
      : activeControlledPlayer.clashCard
      ? [activeControlledPlayer.clashCard]
      : [];
  const myNormalAttackCount = myActionCards.filter(
    (c) => c.nameKr.includes('일반 공격') || c.nameKr.includes('기본 공격')
  ).length;
  const oppActionCards =
    otherPlayer.actionArea && otherPlayer.actionArea.length > 0
      ? otherPlayer.actionArea
      : otherPlayer.clashCard
      ? [otherPlayer.clashCard]
      : [];
  const oppNormalAttackCount = oppActionCards.filter(
    (c) => c.nameKr.includes('일반 공격') || c.nameKr.includes('기본 공격')
  ).length;

  const officialPreview = previewCard ? getOfficialCardByCode(previewCard.code) : null;

  const layoutProps = useBattleLayoutProps({
    gameState,
    p0,
    p1,
    activeControlledPlayer,
    otherPlayer,
    controlledPlayerIndex: 0,
    oppPlayerIndex: 1,
    myPlayerIndex: 0,
    isSpectator: true,
    isMultiplayer: false,
    multiplayerRole: null,
    pingLatency: null,
    spectatorCount: 0,
    arenaZoom,
    viewportScale,
    modalZoomScale,
    centerArenaRef,
    handleArenaScroll,
    changeArenaZoom,
    resetArenaZoom,
    isFullscreen,
    toggleFullscreen,
    showTutorialOverlay: false,
    setShowTutorialOverlay: () => {},
    setGameMode: () => {},
    setIsInitiativeRolling: () => {},
    restartGame: () => {},
    handleExitClick: onExit,
    setShowSurrenderConfirm: () => {},
    onExitToLobby: onExit,
    isMobileBattle,
    setIsMobileBattle,
    battleLayoutMode,
    isCurrentControlledTurn: false,
    isAiThinking: false,
    setControlledPlayerIndex: () => {},
    isLeftPanelCollapsed,
    toggleLeftPanelCollapsed,
    previewCard,
    leftPanelRef,
    handleLeftPanelWheel,
    leftPanelTab,
    setLeftPanelTab,
    getDisplayLogText: (log) => log.text,
    officialPreview,
    getElementKr,
    formatEffectText: (text) => formatEffectText(text || ''),
    setEvolutionModalChar: (c) => replayStore.setState({ evolutionModalChar: c }),
    setPreviewCard: (c) => {
      setPreviewCard(c);
      replayStore.setState({ previewCard: c });
    },
    timeLimitConfig: { hasTimeLimit: false, totalTimeSec: 300, turnTimeSec: 90, clashTimeSec: 30 },
    p0TotalTime: 300,
    p1TotalTime: 300,
    currentTurnTime: 0,
    formatChessTime,
    setIsHpHistoryModalOpen: (v) =>
      replayStore.setState((s) => ({
        isHpHistoryModalOpen: typeof v === 'function' ? v(s.isHpHistoryModalOpen) : v,
      })),
    oppHealAlert: p1HealAlert,
    oppDamageAlert: p1DamageAlert,
    oppDeckDrawing: p1DeckDrawing,
    myHealAlert: p0HealAlert,
    myDamageAlert: p0DamageAlert,
    myDeckDrawing: p0DeckDrawing,
    currentTurnDrawCount,
    isActionLockedByModal: false,
    checkCanUpgradeSlot: () => false,
    openUpgradeModal: () => {},
    openCardListModal,
    onSwitchLeaderWithSound: () => {},
    oppNormalAttackCount,
    oppActionCards,
    myNormalAttackCount,
    myActionCards,
    comboPlayerIndex: 0,
    canP0Draw: false,
    canP1Draw: false,
    handleDrawCards: () => {},
    isPlayerComboPhase: false,
    canPlayerExecuteCombo: () => false,
    introSwapModalState: { isOpen: false, targetCard: null, playerIndex: 0 },
    concertoModalState: { isOpen: false, actionType: 'CLASH', targetCard: null, requiredCost: 0, playerIndex: 0 },
    setNoComboCountdown: () => {},
    handleFinishCombo: () => {},
    selectedOverflowIds: [],
    toggleOverflowCard: () => {},
    handleChargeConcerto: () => {},
    requestSetClashCard: () => {},
    requestComboAttack: () => {},
    isRightPanelCollapsed,
    setIsRightPanelCollapsed,
    isConfirmingEndTurn: false,
    setIsConfirmingEndTurn: () => {},
    handleDecideClash: () => {},
    getEffectiveCardCost: () => 0,
    canPlayerUseActionCard: () => ({ canUse: false }),
    isConfirmingNoCardPass: false,
    setIsConfirmingNoCardPass: () => {},
    lastDrawDismissTimeRef: { current: 0 },
    handleSetClashCard: () => {},
    handleForceResolveClash: () => {},
    setSelectedOverflowIds: () => {},
    handleDiscardOverflow: () => {},
    isLogPanelExpanded,
    setIsLogPanelExpanded,
    logEndRef,
    setShowMobileCardModal,
    setShowMobileLogModal,
  });

  return (
    <BattleStoreProvider store={replayStore}>
      <BattleLayout {...layoutProps} customTopBar={customTopBar} />

      {/* 페이즈 전환 배너 */}
      <PhaseBannerOverlay
        phase={gameState.phase}
        turn={gameState.turn}
        activePlayerIndex={gameState.activePlayerIndex}
        isAiTurn={false}
        disabled={false}
        drawCount={currentTurnDrawCount}
        isMultiplayer={false}
      />

      {/* 격돌 5단계 시네마틱 판정 연출 (실전과 동일한 컴포넌트 재사용) */}
      {Boolean(gameState.clashResult) && (
        <ClashAnimationOverlay
          clashResult={gameState.clashResult!}
          players={gameState.players}
          onDismiss={handleStepForward}
          myPlayerIndex={0}
          isMultiplayer={false}
        />
      )}

      {/* 게임 종료 치명타 피니시 연출 */}
      {gameState.phase === 'GAME_OVER' &&
        gameState.winner !== null &&
        !gameState.clashResult &&
        !isFxBlocking &&
        !isFinisherFinished && (
          <CinematicFinisherOverlay
            winner={gameState.winner as 0 | 1}
            players={gameState.players}
            onComplete={() => replayStore.setState({ isFinisherFinished: true })}
            myPlayerIndex={0}
            isMultiplayer={false}
          />
        )}

      {/* 트래시 / 협주 존 / 캐릭터 진화 덱 열람 모달 */}
      {cardListModalState && (
        <Suspense fallback={null}>
          <CardListModal
            isOpen={cardListModalState.isOpen}
            onClose={() => replayStore.setState({ cardListModalState: null })}
            title={cardListModalState.title}
            type={cardListModalState.type}
            cards={cardListModalState.cards}
            onSelectCard={(card) => {
              setPreviewCard(card);
              replayStore.setState({ previewCard: card });
            }}
          />
        </Suspense>
      )}

      {/* 진화 계보 열람 모달 */}
      <EvolutionTreeModal
        isOpen={Boolean(evolutionModalChar)}
        onClose={() => replayStore.setState({ evolutionModalChar: null })}
        character={evolutionModalChar}
      />

      {/* HP 변동 상세 이력 모달 */}
      <HpHistoryModal
        isOpen={isHpHistoryModalOpen}
        onClose={() => replayStore.setState({ isHpHistoryModalOpen: false })}
        history={gameState.hpHistory}
        players={gameState.players}
      />

      {/* 연출 큐 호스트 (연격, 레벨업, 효과 드로우, 효과 알림, 회복 연출) */}
      <FxQueueHost queue={replayStore.fxQueue} />
    </BattleStoreProvider>
  );
};
