// src/components/battle/BattleTopBar.tsx
// [WP8-2] 상단 네비게이션 헤더 바 (GameBoard 분해 컴포넌트)
import React, { memo } from 'react';
import {
  Home,
  Swords,
  Bot,
  User,
  ArrowLeftRight,
  Copy,
  Eye,
  ZoomIn,
  ZoomOut,
  Minimize2,
  Maximize2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { GameState } from '../../types/tcg';
import { BgmPlayer } from '../BgmPlayer';

export interface BattleTopBarProps {
  onExitToLobby?: () => void;
  handleExitClick: () => void;
  isSpectator: boolean;
  gameState: GameState;
  setShowSurrenderConfirm: (val: boolean) => void;
  isMobileBattle: boolean;
  setIsMobileBattle: (val: boolean | ((prev: boolean) => boolean)) => void;
  isCurrentControlledTurn: boolean;
  isAiThinking: boolean;
  controlledPlayerIndex: 0 | 1;
  setControlledPlayerIndex: (idx: 0 | 1) => void;
  isMultiplayer: boolean;
  multiplayerRole?: string | null;
  roomCode?: string;
  pingLatency: number | null;
  spectatorCount: number;
  arenaZoom: number;
  changeArenaZoom: (delta: number) => void;
  resetArenaZoom: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  showTutorialOverlay: boolean;
  setShowTutorialOverlay: (val: boolean | ((prev: boolean) => boolean)) => void;
  setGameMode: (mode: 'AI' | 'SOLO_DUAL' | 'MULTIPLAYER') => void;
  setIsInitiativeRolling: (val: boolean) => void;
  restartGame: () => void;
}

export const BattleTopBar: React.FC<BattleTopBarProps> = memo(({
  onExitToLobby,
  handleExitClick,
  isSpectator,
  gameState,
  setShowSurrenderConfirm,
  isMobileBattle,
  setIsMobileBattle,
  isCurrentControlledTurn,
  isAiThinking,
  controlledPlayerIndex,
  setControlledPlayerIndex,
  isMultiplayer,
  multiplayerRole,
  roomCode,
  pingLatency,
  spectatorCount,
  arenaZoom,
  changeArenaZoom,
  resetArenaZoom,
  isFullscreen,
  toggleFullscreen,
  showTutorialOverlay,
  setShowTutorialOverlay,
  setGameMode,
  setIsInitiativeRolling,
  restartGame,
}) => {
  return (
    <header className="h-10 sm:h-12 border-b border-white/10 bg-[#090d16]/95 backdrop-blur-md px-2 sm:px-4 flex items-center justify-between z-30 shrink-0">
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {onExitToLobby && (
          <button
            onClick={handleExitClick}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-[#111520] hover:bg-[#1c2334] text-[#f97316] border border-[#f97316]/50 text-[11px] sm:text-xs font-black transition cursor-pointer [clip-path:polygon(5px_0,100%_0,100%_calc(100%-5px),calc(100%-5px)_100%,0_100%,0_5px)]"
            title="대기실(메인 메뉴)로 나가기"
          >
            <Home className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#f97316]" />
            <span className="hidden xs:inline">대기실</span>
          </button>
        )}

        {!isSpectator && gameState.phase !== 'GAME_OVER' && gameState.winner === null && (
          <button
            onClick={() => setShowSurrenderConfirm(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900/90 text-rose-300 hover:text-white border border-rose-500/50 text-[11px] sm:text-xs font-black transition cursor-pointer [clip-path:polygon(5px_0,100%_0,100%_calc(100%-5px),calc(100%-5px)_100%,0_100%,0_5px)]"
            title="현재 배틀 항복(기권)하기"
          >
            <span>🏳️</span>
            <span>항복</span>
          </button>
        )}

        {/* 모바일 / PC 뷰 강제 전환 토글 */}
        <button
          onClick={() => setIsMobileBattle((prev) => !prev)}
          className={`px-2 py-1 text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)] ${
            isMobileBattle
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
              : 'bg-[#111520] text-slate-400 border-white/10 hover:text-white'
          }`}
          title={isMobileBattle ? '데스크톱 뷰(사이드바 포함)로 전환' : '모바일 풀스크린 뷰로 전환'}
        >
          <span>{isMobileBattle ? '📱모바일' : '🖥️PC'}</span>
        </button>

        <div className="hidden lg:flex items-center gap-2">
          <span className="text-[#f97316] text-base leading-none drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">✦</span>
          <h1 className="text-xs sm:text-sm font-black tracking-widest text-white flex items-center gap-2 font-mono">
            <span>WUTHERING WAVES :</span>
            <span className="text-[#f97316]">DUEL ARENA</span>
          </h1>
        </div>
      </div>

      {/* 중앙: 현재 턴 & 페이즈 택티컬 배너 + 1인 2역 시점 전환 */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center gap-2 px-4 py-1 bg-[#0c101b] border border-[#f97316]/60 text-xs shadow-[0_0_15px_rgba(249,115,22,0.15)] [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]">
          <Swords className="w-3.5 h-3.5 text-[#f97316]" />
          <span className="font-mono font-black text-[#f97316] tracking-wider">
            TURN {gameState.turn}
          </span>
          <span className="text-slate-600">:</span>
          <span className={`font-black tracking-wide ${isCurrentControlledTurn ? 'text-[#f97316]' : 'text-[#22d3ee]'}`}>
            {isCurrentControlledTurn ? 'YOUR PHASE' : 'OPPONENT PHASE'}
          </span>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            ({gameState.phase === 'LEADER_SELECT' && 'LEADER SELECT'}
            {gameState.phase === 'MULLIGAN' && 'MULLIGAN'}
            {gameState.phase === 'ACTION_PHASE' && 'MAIN'}
            {gameState.phase === 'CLASH_SET' && 'CLASH SET'}
            {gameState.phase === 'CLASH_REVEAL' && 'JUDGMENT'}
            {gameState.phase === 'COMBO_STEP' && 'COMBO'}
            {gameState.phase === 'DISCARD_OVERFLOW' && 'END'}
            {gameState.phase === 'START_PHASE' && 'START'}
            {gameState.phase === 'DRAW_PHASE' && 'DRAW'})
          </span>
          {isAiThinking && (
            <span className="text-[10px] text-[#22d3ee] font-extrabold animate-pulse ml-1 flex items-center gap-1">
              <Bot className="w-3 h-3" /> AI 연산 중
            </span>
          )}
        </div>

        {gameState.gameMode === 'SOLO_DUAL' && (
          <div className="flex items-center gap-1 bg-[#0c101b] p-0.5 rounded border border-[#f97316]/50">
            <button
              onClick={() => setControlledPlayerIndex(0)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-black transition cursor-pointer ${
                controlledPlayerIndex === 0
                  ? 'bg-[#f97316] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3 h-3" />
              P1
            </button>
            <button
              onClick={() => setControlledPlayerIndex(1)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-black transition cursor-pointer ${
                controlledPlayerIndex === 1
                  ? 'bg-[#22d3ee] text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              P2
            </button>
          </div>
        )}

        {gameState.gameMode === 'MULTIPLAYER' && (
          <div className="flex items-center gap-1.5 bg-[#0c101b] px-2.5 py-1 rounded border border-violet-400/60 text-xs shadow-[0_0_15px_rgba(139,92,246,0.25)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-violet-300 font-black tracking-wider text-[11px]">
              ROOM {roomCode}
            </span>
            <button
              onClick={() => {
                try {
                  if (roomCode) navigator.clipboard.writeText(roomCode);
                } catch {}
              }}
              className="p-0.5 text-slate-400 hover:text-white transition cursor-pointer"
              title="방 코드 복사"
            >
              <Copy className="w-3 h-3" />
            </button>
            {pingLatency !== null && (
              <span className="font-mono text-[10px] text-slate-400 pl-1 border-l border-white/20">
                {pingLatency}ms
              </span>
            )}
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${
              isSpectator
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-violet-500/20 text-violet-300 border-violet-500/40'
            }`}>
              {isSpectator ? 'SPECTATOR' : (multiplayerRole === 'GUEST' ? 'GUEST' : 'HOST')}
            </span>
          </div>
        )}

        {/* 관전자 시점 전환 컨트롤러 (P1 시점 vs P2 시점) */}
        {isSpectator && (
          <div className="flex items-center gap-1 bg-[#0c101b] p-0.5 rounded border border-indigo-500/50">
            <button
              onClick={() => setControlledPlayerIndex(0)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-black transition cursor-pointer ${
                controlledPlayerIndex === 0
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="P1(호스트) 시점으로 전장 보기"
            >
              <Eye className="w-3 h-3" />
              <span>P1 시점</span>
            </button>
            <button
              onClick={() => setControlledPlayerIndex(1)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-black transition cursor-pointer ${
                controlledPlayerIndex === 1
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="P2(도전자) 시점으로 전장 보기"
            >
              <Eye className="w-3 h-3" />
              <span>P2 시점</span>
            </button>
          </div>
        )}

        {/* 관전자 수 실시간 배지 */}
        {isMultiplayer && spectatorCount > 0 && (
          <div className="hidden sm:flex items-center gap-1 bg-indigo-950/80 border border-indigo-500/50 px-2 py-0.5 rounded text-[11px] font-black text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.25)]">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>관전 {spectatorCount}명</span>
          </div>
        )}
      </div>

      {/* 우측 퀵 컨트롤 버튼 */}
      <div className="flex items-center gap-1.5">
        {/* 전장 배율 줌 컨트롤러 */}
        <div className="flex items-center gap-0.5 bg-[#0c101b] px-1.5 py-0.5 border border-white/10">
          <button
            onClick={() => changeArenaZoom(-0.1)}
            disabled={arenaZoom <= 0.5}
            className="p-0.5 hover:bg-white/10 disabled:opacity-30 text-slate-400 hover:text-white transition cursor-pointer"
            title="전장 축소 (-10%)"
          >
            <ZoomOut className="w-3.5 h-3.5 text-[#f97316]" />
          </button>
          <button
            onClick={resetArenaZoom}
            className="px-1 text-[11px] font-mono font-black text-[#f97316] hover:bg-white/10 transition cursor-pointer"
            title="기본 배율(100%) 복원"
          >
            {Math.round(arenaZoom * 100)}%
          </button>
          <button
            onClick={() => changeArenaZoom(0.1)}
            disabled={arenaZoom >= 1.4}
            className="p-0.5 hover:bg-white/10 disabled:opacity-30 text-slate-400 hover:text-white transition cursor-pointer"
            title="전장 확대 (+10%)"
          >
            <ZoomIn className="w-3.5 h-3.5 text-[#f97316]" />
          </button>
        </div>

        {/* 모바일 전체화면 토글 버튼 */}
        <button
          onClick={toggleFullscreen}
          className="p-1 bg-[#111520] hover:bg-[#1c2334] text-cyan-400 border border-white/10 transition cursor-pointer"
          title={isFullscreen ? '전체화면 종료' : '전체화면 전환'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <div className="hidden lg:block mr-1">
          <BgmPlayer />
        </div>

        {/* 아브의 튜토리얼 가이드 버튼, 게임 모드 전환, 게임 재시작은 멀티플레이 모드가 아닐 때만 노출 (아브 가이드는 상단이 비좁은 모바일에서는 숨김) */}
        {!isMultiplayer && (
          <>
            {!isMobileBattle && (
              <button
                onClick={() => setShowTutorialOverlay((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-black transition cursor-pointer border ${
                  showTutorialOverlay
                    ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                    : 'bg-[#111520] hover:bg-amber-950/40 text-amber-400 border-amber-500/40'
                }`}
                title="아브의 인터랙티브 튜토리얼 가이드 열기"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">아브 가이드</span>
              </button>
            )}

            <button
              onClick={() => setGameMode(gameState.gameMode === 'AI' ? 'SOLO_DUAL' : 'AI')}
              className="flex items-center gap-1 px-2 py-1 bg-[#111520] hover:bg-[#1c2334] text-slate-300 text-[11px] font-bold transition cursor-pointer border border-white/10"
              title="게임 모드 전환"
            >
              {gameState.gameMode === 'AI' ? <Bot className="w-3.5 h-3.5 text-[#22d3ee]" /> : <User className="w-3.5 h-3.5 text-[#f97316]" />}
              <span className="hidden xl:inline">{gameState.gameMode === 'AI' ? 'AI 모드' : '1인 2역'}</span>
            </button>

            <button
              onClick={() => {
                setIsInitiativeRolling(true);
                restartGame();
              }}
              className="p-1 bg-[#111520] hover:bg-red-950/60 text-rose-400 border border-white/10 transition cursor-pointer"
              title="게임 재시작"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </header>
  );
});
