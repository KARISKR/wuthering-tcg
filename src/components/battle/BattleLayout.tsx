// src/components/battle/BattleLayout.tsx
// [WP8-6] 배틀 전장 레이아웃 전담 컴포넌트 (GameBoard 분해 컴포넌트)
import React, { memo } from 'react';
import { Eye, ScrollText, Swords, ChevronRight } from 'lucide-react';
import { BattleTopBar, BattleTopBarProps } from './BattleTopBar';
import { CardDetailSidebar, CardDetailSidebarProps } from './CardDetailSidebar';
import { OpponentFieldArea, OpponentFieldAreaProps } from './OpponentFieldArea';
import { CenterClashArena, CenterClashArenaProps } from './CenterClashArena';
import { PlayerFieldArea, PlayerFieldAreaProps } from './PlayerFieldArea';
import { PlayerHandDock, PlayerHandDockProps } from './PlayerHandDock';
import { TacticalConsoleSidebar, TacticalConsoleSidebarProps } from './TacticalConsoleSidebar';

export interface BattleLayoutProps {
  // 줌 및 반응형
  modalZoomScale: number;
  arenaZoom: number;
  viewportScale: number;
  centerArenaRef: React.RefObject<HTMLDivElement | null>;
  handleArenaScroll: () => void;

  // 헤더 및 패널 영역 Props
  topBarProps: BattleTopBarProps;
  cardDetailProps: CardDetailSidebarProps;
  opponentFieldProps: OpponentFieldAreaProps;
  centerClashProps: CenterClashArenaProps;
  playerFieldProps: PlayerFieldAreaProps;
  playerHandProps: PlayerHandDockProps;
  tacticalConsoleProps: TacticalConsoleSidebarProps;

  // 모바일 플로팅 컨트롤 바 관련 상태 및 액션
  isMobileBattle: boolean;
  isRightPanelCollapsed: boolean;
  isSpectator: boolean;
  isCurrentControlledTurn: boolean;
  isActionLockedByModal: boolean;
  isPlayerComboPhase: boolean;
  canP0Draw: boolean;
  canP1Draw: boolean;
  currentTurnDrawCount: number;
  controlledPlayerIndex: 0 | 1;
  phase: string;
  clashCardReady: boolean;
  handLength: number;
  selectedOverflowIds: string[];
  setShowMobileCardModal: (show: boolean) => void;
  setShowMobileLogModal: (show: boolean) => void;
  handleDrawCards: (pIdx?: 0 | 1) => void;
  setIsConfirmingEndTurn: (val: boolean) => void;
  handleDecideClash: (enterClash: boolean) => void;
  handleSetClashCard: (pIdx: 0 | 1, cardId: string | null) => void;
  setNoComboCountdown: (val: number | null) => void;
  handleFinishCombo: (pIdx: 0 | 1) => void;
  handleDiscardOverflow: (pIdx: 0 | 1, cardIds: string[]) => void;
  setSelectedOverflowIds: (ids: string[]) => void;

  // 커스텀 헤더 덮어쓰기 (리플레이 모드 등)
  customTopBar?: React.ReactNode;
}

export const BattleLayout: React.FC<BattleLayoutProps> = memo(({
  modalZoomScale,
  arenaZoom,
  viewportScale,
  centerArenaRef,
  handleArenaScroll,
  topBarProps,
  cardDetailProps,
  opponentFieldProps,
  centerClashProps,
  playerFieldProps,
  playerHandProps,
  tacticalConsoleProps,
  isMobileBattle,
  isRightPanelCollapsed,
  isSpectator,
  isCurrentControlledTurn,
  isActionLockedByModal,
  isPlayerComboPhase,
  canP0Draw,
  canP1Draw,
  currentTurnDrawCount,
  controlledPlayerIndex,
  phase,
  clashCardReady,
  handLength,
  selectedOverflowIds,
  setShowMobileCardModal,
  setShowMobileLogModal,
  handleDrawCards,
  setIsConfirmingEndTurn,
  handleDecideClash,
  handleSetClashCard,
  setNoComboCountdown,
  handleFinishCombo,
  handleDiscardOverflow,
  setSelectedOverflowIds,
  customTopBar,
}) => {
  return (
    <div
      className="flex flex-col h-[100dvh] w-screen bg-[#070913] text-slate-100 font-sans select-none overflow-hidden relative"
      style={
        {
          '--modal-zoom': `${modalZoomScale}`,
        } as React.CSSProperties
      }
    >
      {/* 1. 상단 명조 택티컬 네비게이션 헤더 또는 커스텀 헤더 */}
      {customTopBar ? customTopBar : <BattleTopBar {...topBarProps} />}

      {/* 2. 메인 컨테이너 (좌측: 카드 상세 단말기 | 중앙: 100vh 4단 배틀 보드 | 우측: 택티컬 콘솔 & 배틀로그) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* [WP8-1] 좌측 패널: 카드 상세 단말기 */}
        <CardDetailSidebar {...cardDetailProps} />

        {/* [중앙 메인 보드] 100vh 원스크린 4단 수직 분할 (전체 스크롤 없음) */}
        <div
          ref={centerArenaRef}
          onScroll={handleArenaScroll}
          className="flex-1 flex flex-col justify-between min-h-0 py-1 px-2 sm:px-3.5 gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative bg-[#060810]"
          style={{ zoom: Math.round(arenaZoom * viewportScale * 100) / 100 }}
        >
          {/* 배경 은은한 그리드 & 광원 */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_50%,rgba(223,194,134,0.04),transparent_80%)]" />

          {/* [WP8-2 Tier 1] 1단: 상대방 진영 */}
          <OpponentFieldArea {...opponentFieldProps} />

          {/* [WP8-2 Tier 2] 2단: 중앙 공용 배틀 아레나 (CLASH ZONE) */}
          <CenterClashArena {...centerClashProps} />

          {/* [WP8-2 Tier 3] 3단: 플레이어 진영 */}
          <PlayerFieldArea {...playerFieldProps} />

          {/* [WP8-2 Tier 4] 4단: 플레이어 손패 도크 */}
          <PlayerHandDock {...playerHandProps} />
        </div>

        {/* [WP8-1 Part 2] 우측 패널: 택티컬 콘솔 및 실시간 배틀 로그 */}
        <TacticalConsoleSidebar {...tacticalConsoleProps} />
      </div>

      {/* 우측 패널 접힘 시 또는 모바일 배틀 모드일 때 엄지용 플로팅 퀵 액션 컨트롤 바 */}
      {(isMobileBattle || isRightPanelCollapsed) && !isSpectator && (
        <div
          className={`fixed z-40 flex items-center gap-1.5 bg-[#0c101b]/95 border border-[#f97316]/70 p-1.5 shadow-[0_0_25px_rgba(0,0,0,0.9)] backdrop-blur-md animate-in fade-in slide-in-from-right-3 ${
            isMobileBattle ? 'bottom-2.5 right-2 rounded-lg' : 'bottom-3 right-14'
          }`}
        >
          {/* 모바일 퀵 도구 버튼: 카드 상세 & 배틀 로그 */}
          {isMobileBattle && (
            <>
              <button
                onClick={() => setShowMobileCardModal(true)}
                className="px-2.5 py-2 bg-[#111520] hover:bg-[#1a2234] text-cyan-300 border border-cyan-500/40 text-xs font-black rounded transition cursor-pointer flex items-center gap-1"
                title="선택된 카드 상세 정보"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>카드</span>
              </button>
              <button
                onClick={() => setShowMobileLogModal(true)}
                className="px-2.5 py-2 bg-[#111520] hover:bg-[#1a2234] text-amber-300 border border-amber-500/40 text-xs font-black rounded transition cursor-pointer flex items-center gap-1"
                title="배틀 로그 보기"
              >
                <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                <span>로그</span>
              </button>
            </>
          )}

          {/* 드로우 단계 */}
          {phase === 'DRAW_PHASE' && (canP0Draw || canP1Draw) && isCurrentControlledTurn && (
            <button
              onClick={() => handleDrawCards(controlledPlayerIndex)}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-black text-xs sm:text-sm rounded shadow transition cursor-pointer flex items-center gap-1.5 animate-pulse"
            >
              <span>🎴 드로우 ({currentTurnDrawCount}장)</span>
            </button>
          )}

          {/* 메인 액션 페이즈 */}
          {phase === 'ACTION_PHASE' && isCurrentControlledTurn && (
            <>
              <button
                disabled={isActionLockedByModal}
                onClick={() => {
                  setIsConfirmingEndTurn(false);
                  handleDecideClash(true);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-xs sm:text-sm rounded shadow transition cursor-pointer flex items-center gap-1"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>배틀 선언</span>
              </button>
              <button
                disabled={isActionLockedByModal}
                onClick={() => setIsConfirmingEndTurn(true)}
                className="px-3 py-2 bg-[#111520] hover:bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm rounded border border-white/20 transition cursor-pointer"
              >
                턴 종료
              </button>
            </>
          )}

          {/* 대결 세트 단계 카드 없이 패스 */}
          {phase === 'CLASH_SET' && !clashCardReady && (
            <button
              disabled={isActionLockedByModal}
              onClick={() => handleSetClashCard(controlledPlayerIndex, null)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs sm:text-sm rounded border border-amber-500/40 transition cursor-pointer"
            >
              카드 없이 패스
            </button>
          )}

          {/* 연격 단계 연격 종료 */}
          {phase === 'COMBO_STEP' && isPlayerComboPhase && (
            <button
              onClick={() => {
                setNoComboCountdown(null);
                handleFinishCombo(controlledPlayerIndex);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-[#ea580c] to-[#fb923c] text-white font-black text-xs sm:text-sm rounded shadow transition cursor-pointer flex items-center gap-1 animate-pulse"
            >
              <span>연격 종료</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 패 초과 버리기 단계 */}
          {phase === 'DISCARD_OVERFLOW' && handLength > 8 && (
            <button
              disabled={selectedOverflowIds.length !== handLength - 8}
              onClick={() => {
                handleDiscardOverflow(controlledPlayerIndex, selectedOverflowIds);
                setSelectedOverflowIds([]);
              }}
              className={`px-3 py-2 rounded text-xs sm:text-sm font-black transition ${
                selectedOverflowIds.length === handLength - 8
                  ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              버리기 ({selectedOverflowIds.length}/{handLength - 8})
            </button>
          )}
        </div>
      )}
    </div>
  );
});
