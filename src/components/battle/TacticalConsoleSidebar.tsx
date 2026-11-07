// src/components/battle/TacticalConsoleSidebar.tsx
// [WP8-1] 우측 택티컬 콘솔 및 실시간 배틀 로그 사이드바 (GameBoard 분해 컴포넌트)
import React, { memo } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Bot,
  Eye,
  Sparkles,
  Swords,
  SkipForward,
  ArrowLeftRight,
  Zap,
  Flame,
  RotateCcw,
  ScrollText,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import {
  GameState,
  PlayerState,
  CharacterSlots,
  ActionCard,
  AnyCard,
  LogItem,
} from '../../types/tcg';
import { formatBattleLogText } from '../../utils/formatEffectText';
import { useBattleStore } from '../../battle/store';

export interface TacticalConsoleSidebarProps {
  isMobileBattle: boolean;
  isRightPanelCollapsed: boolean;
  setIsRightPanelCollapsed: (val: boolean | ((prev: boolean) => boolean)) => void;
  gameState: GameState;
  isAiThinking: boolean;
  isCurrentControlledTurn: boolean;
  canP0Draw: boolean;
  canP1Draw: boolean;
  currentTurnDrawCount: number;
  isSpectator: boolean;
  checkCanUpgradeSlot: (
    slotName: 'leader' | 'leftSupport' | 'rightSupport',
    playerIdx?: 0 | 1
  ) => boolean;
  controlledPlayerIndex: 0 | 1;
  openUpgradeModal: (
    slot: 'leader' | 'leftSupport' | 'rightSupport',
    playerIdx: 0 | 1
  ) => void;
  activeControlledPlayer: PlayerState;
  isActionLockedByModal: boolean;
  isConfirmingEndTurn: boolean;
  setIsConfirmingEndTurn: (val: boolean | ((prev: boolean) => boolean)) => void;
  handleDecideClash: (isBattle: boolean) => void;
  isMultiplayer: boolean;
  otherPlayer: PlayerState;
  setControlledPlayerIndex: (idx: 0 | 1) => void;
  p0: PlayerState;
  p1: PlayerState;
  getEffectiveCardCost: (player: PlayerState, card: ActionCard) => number;
  canPlayerUseActionCard: (
    slots: CharacterSlots,
    card: ActionCard,
    actionArea?: ActionCard[]
  ) => { canUse: boolean; reason?: string };
  isConfirmingNoCardPass: boolean;
  setIsConfirmingNoCardPass: (val: boolean | ((prev: boolean) => boolean)) => void;
  lastDrawDismissTimeRef: React.RefObject<number>;
  handleSetClashCard: (pIdx: 0 | 1, cardId: string | null, spentConcertoIds?: string[]) => void;
  handleForceResolveClash: () => void;
  isPlayerComboPhase: boolean;
  canPlayerExecuteCombo: (player: PlayerState) => boolean;
  setNoComboCountdown: (val: number | null | ((prev: number | null) => number | null)) => void;
  handleFinishCombo: (pIdx: 0 | 1) => void;
  selectedOverflowIds: string[];
  setSelectedOverflowIds: (val: string[] | ((prev: string[]) => string[])) => void;
  handleDiscardOverflow: (pIdx: 0 | 1, cardIds: string[]) => void;
  isLogPanelExpanded: boolean;
  setIsLogPanelExpanded: (val: boolean | ((prev: boolean) => boolean)) => void;
  logEndRef: React.RefObject<HTMLDivElement | null>;
  oppPlayerIndex: 0 | 1;
  setPreviewCard: (card: AnyCard | null) => void;
  getDisplayLogText: (log: LogItem) => string;
}

export const TacticalConsoleSidebar: React.FC<TacticalConsoleSidebarProps> = memo(({
  isMobileBattle,
  isRightPanelCollapsed,
  setIsRightPanelCollapsed,
  gameState,
  isAiThinking,
  isCurrentControlledTurn,
  canP0Draw,
  canP1Draw,
  currentTurnDrawCount,
  isSpectator,
  checkCanUpgradeSlot,
  controlledPlayerIndex,
  openUpgradeModal,
  activeControlledPlayer,
  isActionLockedByModal,
  isConfirmingEndTurn,
  setIsConfirmingEndTurn,
  handleDecideClash,
  isMultiplayer,
  otherPlayer,
  setControlledPlayerIndex,
  p0,
  p1,
  getEffectiveCardCost,
  canPlayerUseActionCard,
  isConfirmingNoCardPass,
  setIsConfirmingNoCardPass,
  lastDrawDismissTimeRef,
  handleSetClashCard,
  handleForceResolveClash,
  isPlayerComboPhase,
  canPlayerExecuteCombo,
  setNoComboCountdown,
  handleFinishCombo,
  selectedOverflowIds,
  setSelectedOverflowIds,
  handleDiscardOverflow,
  isLogPanelExpanded,
  setIsLogPanelExpanded,
  logEndRef,
  oppPlayerIndex,
  setPreviewCard,
  getDisplayLogText,
}) => {
  const isFxBlocking = useBattleStore((s) => s.isFxBlocking);

  if (isMobileBattle) {
    return null;
  }

  if (isRightPanelCollapsed) {
    return (
      <div className="w-11 shrink-0 bg-[#090d16] border-l border-white/10 py-3 flex flex-col items-center justify-between h-full select-none z-20">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setIsRightPanelCollapsed(false)}
            className="w-7 h-7 bg-[#111520] hover:bg-[#f97316]/20 text-slate-400 hover:text-[#f97316] border border-white/10 hover:border-[#f97316]/60 flex items-center justify-center transition cursor-pointer"
            title="택티컬 콘솔 펼치기"
          >
            <PanelLeftClose className="w-4 h-4 rotate-180" />
          </button>

          <div
            onClick={() => setIsRightPanelCollapsed(false)}
            className="cursor-pointer text-xs font-black tracking-widest text-slate-400 hover:text-[#f97316] py-4 transition flex items-center gap-2 font-mono"
            style={{ writingMode: 'vertical-rl' }}
          >
            <span>✦ TACTICAL CONSOLE</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-68 lg:w-76 xl:w-84 2xl:w-90 h-full max-h-full min-h-0 shrink-0 bg-[#090d16]/95 border-l border-white/10 flex flex-col justify-between overflow-hidden select-text z-20">
      {/* ======================================================= */}
      {/* 1. 상단: 택티컬 콘솔 (TACTICAL CONSOLE) */}
      {/* ======================================================= */}
      <div className="p-3.5 border-b border-white/10 bg-[#0c101b]/90 shrink-0 flex flex-col gap-2.5 relative">
        <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]" />

        {/* 콘솔 타이틀 & 턴 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[#f97316] text-sm">✦</span>
            <h3 className="font-black text-sm text-white tracking-wider uppercase">
              택티컬 콘솔
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-black text-[#f97316] bg-[#111520] border border-[#f97316]/40 px-2 py-0.5">
              TURN {gameState.turn}
            </span>
            <button
              onClick={() => setIsRightPanelCollapsed(true)}
              className="p-1 bg-[#111520] hover:bg-[#1a2234] text-slate-400 hover:text-white border border-white/10 transition cursor-pointer"
              title="우측 콘솔 접기 (전장 최대화)"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 rotate-180 text-[#f97316]" />
            </button>
          </div>
        </div>

        {/* 페이즈 진행 바 (UP ▸ [MAIN] ▸ BATTLE ▸ END) */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#070a12] border border-white/10 text-center font-mono text-xs font-black">
          <div
            className={`py-1.5 transition-all ${
              gameState.phase === 'DRAW_PHASE' || gameState.phase === 'START_PHASE' || gameState.phase === 'MULLIGAN'
                ? 'bg-[#22d3ee] text-slate-950 shadow-[0_0_10px_#22d3ee]'
                : 'text-slate-500'
            }`}
          >
            DRAW
          </div>
          <div
            className={`py-1.5 transition-all ${
              gameState.phase === 'ACTION_PHASE'
                ? 'bg-[#f97316] text-white shadow-[0_0_10px_rgba(249,115,22,0.6)]'
                : 'text-slate-500'
            }`}
          >
            MAIN
          </div>
          <div
            className={`py-1.5 transition-all ${
              gameState.phase === 'CLASH_SET' || gameState.phase === 'CLASH_REVEAL' || gameState.phase === 'COMBO_STEP'
                ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                : 'text-slate-500'
            }`}
          >
            BATTLE
          </div>
          <div
            className={`py-1.5 transition-all ${
              gameState.phase === 'DISCARD_OVERFLOW'
                ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.6)]'
                : 'text-slate-500'
            }`}
          >
            END
          </div>
        </div>

        {/* 페이즈별 사선 깎인(clip-path) 명조 골드 솔리드 택티컬 버튼들 */}
        <div className="flex flex-col gap-2">
          {isAiThinking && (
            <div className="w-full py-2.5 px-3 bg-cyan-950/80 border border-[#22d3ee]/50 text-[#22d3ee] font-black text-xs sm:text-sm flex items-center justify-center gap-2 animate-pulse">
              <Bot className="w-4 h-4 animate-spin" />
              <span>상대(AI) 수 연산 중...</span>
            </div>
          )}

          {gameState.phase === 'DRAW_PHASE' && (
            <div className="p-2.5 bg-[#111520] border border-[#f97316]/40 text-center text-xs sm:text-sm text-[#f97316] font-bold">
              {isCurrentControlledTurn && (canP0Draw || canP1Draw)
                ? `🎴 액션 덱을 클릭하여 ${currentTurnDrawCount}장 드로우하세요!`
                : '상대가 카드를 드로우하고 있습니다...'}
            </div>
          )}

          {/* 1. 메인 페이즈 (행동 단계) */}
          {gameState.phase === 'ACTION_PHASE' && !isAiThinking && (
            isSpectator ? (
              <div className="flex flex-col gap-2 p-3 bg-[#0c101b] border border-indigo-500/50 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-indigo-300">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <span>실시간 관전 진행 중</span>
                </div>
                <div className="text-xs text-slate-300">
                  현재 <strong className="text-amber-300">{gameState.players[gameState.activePlayerIndex].name}</strong>의 메인 페이즈입니다.
                </div>
              </div>
            ) : (
              <>
                {isCurrentControlledTurn ? (
                  <>
                    {/* 캐릭터 진화 퀵 실행 버튼 */}
                    {(() => {
                      const canLeaderUp = checkCanUpgradeSlot('leader', controlledPlayerIndex);
                      const canLeftUp = checkCanUpgradeSlot('leftSupport', controlledPlayerIndex);
                      const canRightUp = checkCanUpgradeSlot('rightSupport', controlledPlayerIndex);
                      const canAnyUp = canLeaderUp || canLeftUp || canRightUp;
                      const isUpgraded = activeControlledPlayer.actionFlags.upgraded;

                      return (
                        <button
                          onClick={() => {
                            if (canLeaderUp) openUpgradeModal('leader', controlledPlayerIndex);
                            else if (canLeftUp) openUpgradeModal('leftSupport', controlledPlayerIndex);
                            else if (canRightUp) openUpgradeModal('rightSupport', controlledPlayerIndex);
                          }}
                          disabled={isUpgraded || !canAnyUp}
                          className={`w-full py-2 px-3 text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 cursor-pointer border [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                            isUpgraded
                              ? 'bg-[#090d16] text-slate-600 border-white/5 cursor-not-allowed'
                              : canAnyUp
                              ? 'bg-[#111520] hover:bg-[#1c2334] text-[#22d3ee] border-[#22d3ee]/70 shadow-[0_0_12px_rgba(34,211,238,0.2)] animate-pulse'
                              : 'bg-[#090d16] text-slate-500 border-white/10'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {isUpgraded
                              ? '이번 턴 진화 완료 (1회)'
                              : canAnyUp
                              ? '🆙 캐릭터 레벨업(진화) 실행'
                              : '캐릭터 진화 (조건 미달)'}
                          </span>
                        </button>
                      );
                    })()}

                    {/* ⚔️ 배틀 선언 (명조 솔리드 오렌지 사선 택티컬 버튼) */}
                    <button
                      disabled={isActionLockedByModal}
                      onClick={() => {
                        setIsConfirmingEndTurn(false);
                        handleDecideClash(true);
                      }}
                      className={`w-full py-3 px-4 font-black text-xs sm:text-sm transition transform flex items-center justify-center gap-2 [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] ${
                        isActionLockedByModal
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                      }`}
                    >
                      <Swords className="w-4 h-4 fill-white" />
                      <span>⚔️ 배틀 선언 (CLASH PHASE)</span>
                    </button>

                    {/* 턴 종료 (END) 사선 택티컬 버튼 & 재확인 경고창 */}
                    {!isConfirmingEndTurn ? (
                      <button
                        disabled={isActionLockedByModal}
                        onClick={() => setIsConfirmingEndTurn(true)}
                        className={`w-full py-2.5 px-4 font-bold text-xs sm:text-sm transition border flex items-center justify-center gap-1.5 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] ${
                          isActionLockedByModal
                            ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                            : 'bg-[#111520] hover:bg-[#1a2234] text-[#f97316] border-[#f97316]/60 cursor-pointer'
                        }`}
                      >
                        <SkipForward className="w-3.5 h-3.5 text-[#f97316]" />
                        <span>턴 종료 (END PHASE)</span>
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2 p-2.5 bg-red-950/90 border border-red-500/80 rounded-lg animate-in fade-in shadow-[0_0_15px_rgba(239,68,68,0.25)]">
                        <div className="text-red-200 text-xs font-black text-center leading-snug">
                          ⚠️ 배틀 페이즈 없이 바로 턴을 종료하시겠습니까?
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setIsConfirmingEndTurn(false);
                              handleDecideClash(false);
                            }}
                            className="py-1.5 px-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded transition cursor-pointer"
                          >
                            턴 종료 확정
                          </button>
                          <button
                            onClick={() => setIsConfirmingEndTurn(false)}
                            className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded transition cursor-pointer"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="p-2.5 bg-[#090d16] border border-white/10 text-center text-xs sm:text-sm font-black text-slate-300">
                      {isMultiplayer
                        ? `상대방 (${otherPlayer.name})의 턴 진행 중`
                        : (gameState.activePlayerIndex === 0 ? 'P1 턴 진행 중' : 'P2 턴 진행 중')}
                    </div>
                    {gameState.gameMode === 'SOLO_DUAL' && (
                      <button
                        onClick={() => setControlledPlayerIndex(gameState.activePlayerIndex as 0 | 1)}
                        className="w-full py-2 px-3 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>P{gameState.activePlayerIndex + 1} 시점 전환</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )
          )}

          {/* 2. 대결 세트 단계 (CLASH_SET) */}
          {gameState.phase === 'CLASH_SET' && (() => {
            const isTurnPlayer = controlledPlayerIndex === gameState.activePlayerIndex;
            const turnPlayerReady = gameState.players[gameState.activePlayerIndex].clashCardReady;
            const hasPlayableCard = activeControlledPlayer.hand.some((c) => {
              const effCost = getEffectiveCardCost(activeControlledPlayer, c);
              return (
                activeControlledPlayer.concertoZone.length >= effCost &&
                canPlayerUseActionCard(activeControlledPlayer.slots, c, activeControlledPlayer.actionArea).canUse
              );
            });

            return (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-1.5 text-xs font-mono font-bold">
                  <div className={`p-1.5 border text-center ${activeControlledPlayer.clashCardReady ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-[#090d16] border-white/10 text-[#f97316] animate-pulse'}`}>
                    나 ({isTurnPlayer ? '선공' : '수비'}): {activeControlledPlayer.clashCardReady ? (activeControlledPlayer.clashCard ? '✓ 세트 완료' : '✓ 패스') : '선택 대기'}
                  </div>
                  <div className={`p-1.5 border text-center ${otherPlayer.clashCardReady ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-[#090d16] border-white/10 text-[#22d3ee] animate-pulse'}`}>
                    상대 ({!isTurnPlayer ? '선공' : '수비'}): {otherPlayer.clashCardReady ? (otherPlayer.clashCard ? '✓ 세트 완료' : '✓ 패스') : '선택 대기'}
                  </div>
                </div>

                {gameState.gameMode === 'SOLO_DUAL' && (
                  <>
                    {p0.clashCardReady && !p1.clashCardReady && (
                      <button
                        onClick={() => setControlledPlayerIndex(1)}
                        className="w-full py-2 px-3 bg-[#22d3ee] text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>P2(상대) 세트로 전환</span>
                      </button>
                    )}
                    {!p0.clashCardReady && p1.clashCardReady && (
                      <button
                        onClick={() => setControlledPlayerIndex(0)}
                        className="w-full py-2 px-3 bg-[#f97316] text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>P1(당신) 세트로 전환</span>
                      </button>
                    )}
                  </>
                )}

                {isSpectator ? (
                  <div className="p-3 bg-[#111520] border border-indigo-500/50 text-indigo-200 text-xs text-center font-bold animate-pulse">
                    👁️ 양 플레이어가 대결(CLASH) 카드를 세트하는 중입니다...
                  </div>
                ) : !activeControlledPlayer.clashCardReady ? (
                  <>
                    {!isTurnPlayer && !turnPlayerReady ? (
                      <div className="p-2.5 bg-[#111520] border border-cyan-500/50 text-cyan-200 text-xs text-center font-bold animate-pulse">
                        ⏳ 【공식 룰 604.1.1.2】 턴 플레이어({gameState.players[gameState.activePlayerIndex].name})가 먼저 카드를 세트 중입니다...
                      </div>
                    ) : (
                      <>
                        <div className="p-2 bg-[#111520] border border-[#f97316]/50 text-[#f97316] text-xs text-center font-black animate-pulse">
                          {isTurnPlayer
                            ? '【선공 배틀 세트】 하단 손패에서 출전할 대결 카드를 선택하세요!'
                            : '【수비 배틀 세트】 하단 손패에서 대결 카드를 선택하거나 패스하세요!'}
                        </div>

                        {isTurnPlayer ? (
                          hasPlayableCard ? (
                            <div className="w-full py-2 px-3 bg-slate-900/90 border border-slate-700/80 text-slate-400 font-bold text-xs text-center">
                              선공은 낼 수 있는 카드가 있으면 반드시 세트해야 합니다 (공식 룰 604.1.1.2)
                            </div>
                          ) : (
                            !isConfirmingNoCardPass ? (
                              <button
                                onClick={() => {
                                  if (Date.now() - (lastDrawDismissTimeRef.current || 0) < 500) return;
                                  setIsConfirmingNoCardPass(true);
                                }}
                                className="w-full py-2.5 px-3 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 font-black text-xs sm:text-sm transition cursor-pointer border border-amber-500/80 flex items-center justify-center gap-1.5 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] shadow-lg"
                              >
                                <Eye className="w-4 h-4 text-amber-400" />
                                <span>낼 수 있는 카드 없음 (패 전체 공개 후 패스)</span>
                              </button>
                            ) : (
                              <div className="flex flex-col gap-1.5 p-2 bg-red-950/90 border border-red-500/80 rounded-lg animate-in fade-in">
                                <div className="text-red-200 text-xs font-black text-center">
                                  ⚠️ 낼 수 있는 카드가 없어 패스하시겠습니까? (상대 공격 무방비 피격)
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <button
                                    onClick={() => {
                                      if (Date.now() - (lastDrawDismissTimeRef.current || 0) < 500) return;
                                      setIsConfirmingNoCardPass(false);
                                      handleSetClashCard(controlledPlayerIndex, null);
                                    }}
                                    className="py-1.5 px-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded transition cursor-pointer"
                                  >
                                    패스 확정
                                  </button>
                                  <button
                                    onClick={() => setIsConfirmingNoCardPass(false)}
                                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded transition cursor-pointer"
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            )
                          )
                        ) : (
                          <button
                            onClick={() => handleSetClashCard(controlledPlayerIndex, null)}
                            className="w-full py-2 px-3 bg-[#111520] hover:bg-[#1a2234] text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer border border-white/15 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
                          >
                            카드 없이 패스 (수비 포기)
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  !otherPlayer.clashCardReady ? (
                    <div className="p-3 bg-[#111520] border border-cyan-400/40 text-center text-xs sm:text-sm text-cyan-300 font-bold animate-pulse">
                      상대방({otherPlayer.name})이 대결 카드를 세트하는 중입니다... ⏳
                    </div>
                  ) : (
                    <button
                      disabled={Boolean(gameState.pendingChoice)}
                      onClick={handleForceResolveClash}
                      className={`w-full py-3 px-4 font-black text-xs sm:text-sm transition transform flex items-center justify-center gap-2 [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] ${
                        gameState.pendingChoice
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)] cursor-pointer animate-pulse'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>대결 즉시 오픈 & 판정</span>
                    </button>
                  )
                )}
              </div>
            );
          })()}

          {/* 3. 연격 단계 (COMBO_STEP) */}
          {gameState.phase === 'COMBO_STEP' && (
            isSpectator ? (
              <div className="p-3 bg-[#111520] border border-indigo-500/50 text-indigo-200 text-xs text-center font-bold animate-pulse">
                👁️ 연격(COMBO) 단계 진행 중입니다...
              </div>
            ) : isPlayerComboPhase ? (
              <div className="flex flex-col gap-2">
                {canPlayerExecuteCombo(activeControlledPlayer) ? (
                  <div className="p-2.5 bg-red-950/90 border border-red-500 text-red-200 font-black text-xs sm:text-sm flex items-center justify-between animate-pulse">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                      <span>{activeControlledPlayer.comboUnlimited ? '무제한 연격!' : '추격 연격 가동!'}</span>
                    </span>
                    <span className="font-mono text-[#f97316]">
                      {activeControlledPlayer.comboUnlimited ? '∞' : `${activeControlledPlayer.comboCount}회`}
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-[#111520] border border-[#f97316]/60 text-xs font-bold text-center flex flex-col gap-1">
                    <span className="text-[#f97316] font-black">
                      {!activeControlledPlayer.comboUnlimited && (activeControlledPlayer.comboCount ?? 0) === 0
                        ? '⚡ 추격(연격) 횟수 소진 완료'
                        : '⚠️ 연격 가능한 적색 카드 / 협주 코스트 부족'}
                    </span>
                    <span className="text-slate-300 text-[11px]">
                      아래 [연격 종료] 버튼을 눌러 턴을 마치세요.
                    </span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setNoComboCountdown(null);
                    handleFinishCombo(controlledPlayerIndex);
                  }}
                  className={`w-full py-3 px-4 bg-gradient-to-r from-red-600 via-amber-500 to-orange-500 hover:brightness-110 text-white font-black text-xs sm:text-sm transition cursor-pointer [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 ${
                    !canPlayerExecuteCombo(activeControlledPlayer) ? 'ring-2 ring-[#f97316] animate-pulse' : ''
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>
                    {!canPlayerExecuteCombo(activeControlledPlayer)
                      ? '턴 종료 (END PHASE)'
                      : '연격 종료 및 턴 넘기기'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-[#111520] border border-cyan-400/40 text-center text-xs sm:text-sm text-cyan-300 font-bold animate-pulse">
                상대방({otherPlayer.name})이 턴을 마무리하고 있습니다... ⏳
              </div>
            )
          )}

          {/* 4. 패 초과 버리기 단계 (DISCARD_OVERFLOW, 드로우 연출이 끝난 후 표출) */}
          {gameState.phase === 'DISCARD_OVERFLOW' && !isFxBlocking && (
            isSpectator ? (
              <div className="p-3 bg-[#111520] border border-indigo-500/50 text-indigo-200 text-xs text-center font-bold animate-pulse">
                👁️ 손패 상한 초과 카드 정리 중입니다...
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeControlledPlayer.hand.length > 8 ? (
                  <>
                    <div className="text-xs sm:text-sm text-[#f97316] font-bold p-2 bg-[#090d16] border border-white/10 text-center">
                      초과된 카드 {activeControlledPlayer.hand.length - 8}장을 선택하여 버리세요.
                    </div>
                    <button
                      disabled={selectedOverflowIds.length !== activeControlledPlayer.hand.length - 8}
                      onClick={() => {
                        handleDiscardOverflow(controlledPlayerIndex, selectedOverflowIds);
                        setSelectedOverflowIds([]);
                      }}
                      className={`w-full py-2.5 px-4 font-black text-xs sm:text-sm transition [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] ${
                        selectedOverflowIds.length === activeControlledPlayer.hand.length - 8
                          ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer animate-pulse'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      초과 카드 버리기 ({selectedOverflowIds.length}/{activeControlledPlayer.hand.length - 8})
                    </button>
                  </>
                ) : (
                  <div className="p-3 bg-[#111520] border border-cyan-400/40 text-center text-xs sm:text-sm text-cyan-300 font-bold">
                    상대방({otherPlayer.name})이 초과된 카드를 버리는 중입니다... ⏳
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* ======================================================= */}
      {/* 2. 하단: 실시간 배틀 로그 (내부만 스크롤) */}
      {/* ======================================================= */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#070a12] overflow-hidden">
        <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#090d16]">
          <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-[#f97316]">
            <ScrollText className="w-3.5 h-3.5 text-[#22d3ee]" />
            <span>실시간 배틀 로그</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-slate-300 bg-[#111520] px-2 py-0.5 border border-white/10">
              {gameState.logs.length}건
            </span>
            <button
              onClick={() => setIsLogPanelExpanded((prev) => !prev)}
              className="text-slate-400 hover:text-white p-0.5 transition cursor-pointer"
              title={isLogPanelExpanded ? '로그 접기' : '로그 펼치기'}
            >
              {isLogPanelExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isLogPanelExpanded ? (
          <div className="flex-1 overflow-y-auto space-y-2 p-2.5 text-xs sm:text-[13px] custom-scrollbar min-h-0">
            {(() => {
              const chronologicalLogs = [...gameState.logs].reverse();
              return chronologicalLogs.map((log, idx) => {
                const isNewTurn = idx === 0 || chronologicalLogs[idx - 1].turn !== log.turn;

                let containerStyle = 'bg-[#0c101b] border-white/10';
                let badgeColor = 'bg-[#141a29] text-slate-300 border-white/10';

                if (log.type === 'DAMAGE') {
                  containerStyle = 'bg-red-950/25 border-red-500/40';
                  badgeColor = 'bg-red-500/20 text-red-300 border-red-500/50 font-black';
                } else if (log.type === 'HEAL') {
                  containerStyle = 'bg-emerald-950/25 border-emerald-500/40';
                  badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-black';
                } else if (log.type === 'CLASH') {
                  containerStyle = 'bg-[#141a29] border-[#f97316]/40';
                  badgeColor = 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/50 font-black';
                }

                return (
                  <React.Fragment key={log.id}>
                    {isNewTurn && (
                      <div className="flex items-center gap-2 py-1 sticky top-0 bg-[#070a12]/95 backdrop-blur z-10">
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#f97316]/40" />
                        <span className="px-2.5 py-0.5 bg-[#111520] border border-[#f97316]/40 text-[#f97316] font-mono text-xs font-black tracking-wider">
                          ⚔️ TURN {log.turn}
                        </span>
                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#f97316]/40" />
                      </div>
                    )}

                    <div className={`p-2 border transition-all duration-200 ${containerStyle}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-slate-500 font-bold">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 border uppercase ${badgeColor}`}>
                            {log.type}
                          </span>
                          {log.effectTag && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#111520] text-[#f97316] border border-[#f97316]/30">
                              {log.effectTag}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {log.type === 'DAMAGE' && log.amount !== undefined && (
                            <span className="text-[10px] font-mono font-black px-1.5 py-0.2 bg-red-600/30 text-red-300 border border-red-500/50">
                              -{log.amount} HP
                            </span>
                          )}
                          {log.type === 'HEAL' && log.amount !== undefined && (
                            <span className="text-[10px] font-mono font-black px-1.5 py-0.2 bg-emerald-600/30 text-emerald-300 border border-emerald-500/50">
                              +{log.amount} HP
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        {log.cardArt && (!isMultiplayer || log.playerIndex !== oppPlayerIndex || log.text.includes('[카드 공개]')) && (
                          <div
                            onMouseEnter={() => {
                              if (log.cardName) {
                                  const synthCard: ActionCard = {
                                    id: log.id,
                                    code: log.cardName,
                                    nameKr: log.cardName,
                                    artUrl: log.cardArt,
                                    description: log.text,
                                    kind: 'ACTION',
                                    color: 'RED',
                                    cost: 0,
                                    damage: log.amount || 0,
                                  };
                                  setPreviewCard(synthCard);
                              }
                            }}
                            className="relative w-9 h-12 shrink-0 overflow-hidden border border-[#f97316]/60 bg-slate-950 cursor-pointer hover:scale-105 transition"
                          >
                            <img
                              src={log.cardArt}
                              alt={log.cardName || '카드'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-snug whitespace-pre-line text-slate-200 font-medium">
                            {formatBattleLogText(getDisplayLogText(log))}
                          </p>

                          {log.drawnCards && log.drawnCards.length > 0 && (!isMultiplayer || log.playerIndex !== oppPlayerIndex || log.text.includes('[카드 공개]')) && (
                            <div className="mt-1.5 pt-1 border-t border-white/10 flex flex-wrap gap-1">
                              {log.drawnCards.map((card, cIdx) => (
                                <span
                                  key={card.id || cIdx}
                                  onMouseEnter={() => setPreviewCard(card)}
                                  className={`cursor-pointer px-1.5 py-0.5 text-[10px] font-bold border transition hover:scale-105 ${
                                    card.color === 'RED'
                                      ? 'bg-red-950/90 text-red-300 border-red-500/60'
                                      : card.color === 'BLUE'
                                      ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60'
                                      : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                                  }`}
                                >
                                  {card.nameKr} (⚡{card.cost})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              });
            })()}
            <div ref={logEndRef} />
          </div>
        ) : (
          <div
            onClick={() => setIsLogPanelExpanded(true)}
            className="p-3 text-center text-xs text-slate-400 hover:text-[#f97316] transition cursor-pointer"
          >
            로그 펼치기
          </div>
        )}
      </div>
    </div>
  );
});
