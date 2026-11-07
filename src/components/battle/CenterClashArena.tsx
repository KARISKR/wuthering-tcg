// src/components/battle/CenterClashArena.tsx
// [WP8-2] 2단: 중앙 공용 배틀 아레나 (상대/내 출전 액션 슬롯 + 턴 엠블럼 + 타이머 HUD)
import React, { memo } from 'react';
import { Bot, User, Clock } from 'lucide-react';
import { GameState, PlayerState, ActionCard, AnyCard } from '../../types/tcg';
import type { TimeLimitConfig } from '../../types/multiplayer';
import { CardView } from '../CardView';

export interface CenterClashArenaProps {
  otherPlayer: PlayerState;
  activeControlledPlayer: PlayerState;
  oppNormalAttackCount: number;
  oppActionCards: ActionCard[];
  myNormalAttackCount: number;
  myActionCards: ActionCard[];
  controlledPlayerIndex: 0 | 1;
  oppPlayerIndex: 0 | 1;
  myPlayerIndex: 0 | 1;
  gameState: GameState;
  isCurrentControlledTurn: boolean;
  comboPlayerIndex: number;
  canP0Draw: boolean;
  canP1Draw: boolean;
  currentTurnDrawCount: number;
  isMultiplayer: boolean;
  timeLimitConfig: TimeLimitConfig;
  currentTurnTime: number;
  p0TotalTime: number;
  p1TotalTime: number;
  formatChessTime: (secs: number) => string;
  setPreviewCard: (c: AnyCard | null) => void;
}

export const CenterClashArena: React.FC<CenterClashArenaProps> = memo(({
  otherPlayer,
  activeControlledPlayer,
  oppNormalAttackCount,
  oppActionCards,
  myNormalAttackCount,
  myActionCards,
  controlledPlayerIndex,
  oppPlayerIndex,
  myPlayerIndex,
  gameState,
  isCurrentControlledTurn,
  comboPlayerIndex,
  canP0Draw,
  canP1Draw,
  currentTurnDrawCount,
  isMultiplayer,
  timeLimitConfig,
  currentTurnTime,
  p0TotalTime,
  p1TotalTime,
  formatChessTime,
  setPreviewCard,
}) => {
  return (
    <div className="relative z-10 w-full max-w-[1540px] mx-auto h-[178px] sm:h-[198px] shrink-0 bg-[#0c101b]/80 backdrop-blur-md border border-white/10 px-3.5 py-2 flex items-center justify-between gap-3 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.85)]">
      {/* 네 모서리 8px 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
      <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
      <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]" />
      <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#22d3ee]" />
      <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#22d3ee]" />

      {/* 배경: 은은하게 회전/맥동하는 원형 공명 주파수 마법진 & 명조 4각 별(✦) 워터마크 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
        <div className="w-56 h-56 rounded-full border border-[#f97316]/40 animate-spin" style={{ animationDuration: '24s' }} />
        <div className="absolute w-40 h-40 rounded-full border border-[#22d3ee]/40 animate-pulse" />
        <div className="absolute w-24 h-24 rounded-full border border-[#f97316]/30" />
        <span className="absolute text-5xl text-[#f97316]/20 select-none">✦</span>
      </div>

      {/* [좌측: 🤖 상대 출전 액션 슬롯] */}
      <div className="relative flex-1 h-full bg-[#090d16]/75 border border-white/10 px-3 py-1 flex flex-col justify-center overflow-hidden">
        <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#22d3ee]/80" />
        <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#22d3ee]/80" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#22d3ee]/80" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#22d3ee]/80" />

        {/* 슬롯 상단 라벨 */}
        <div className="absolute top-1.5 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          <span className="text-xs font-black text-[#22d3ee] tracking-wider uppercase flex items-center gap-1.5">
            {otherPlayer.isAi ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            <span>상대 ({otherPlayer.name}) 출전 액션 슬롯</span>
          </span>
          <div className="flex items-center gap-1.5">
            {oppNormalAttackCount > 0 && (
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                일반공격 {oppNormalAttackCount}
              </span>
            )}
            {oppActionCards.length > 0 && (
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-cyan-950/90 text-cyan-300 border border-cyan-500/40">
                {oppActionCards.length}장
              </span>
            )}
          </div>
        </div>

        {oppActionCards.length > 0 ? (
          <div className="w-full h-full flex items-center justify-center gap-2.5 overflow-x-auto pt-4 custom-scrollbar">
            {oppActionCards.map((card, idx) => {
              const isLastCard = idx === oppActionCards.length - 1;
              const isOppClashRevealed =
                controlledPlayerIndex === oppPlayerIndex ||
                gameState.phase === 'CLASH_REVEAL' ||
                gameState.phase === 'COMBO_STEP' ||
                gameState.phase === 'ACTION_PHASE' ||
                gameState.phase === 'END_PHASE' ||
                gameState.phase === 'DISCARD_OVERFLOW';
              const isFacedown = !isOppClashRevealed;

              return (
                <div
                  key={card.id ? `${card.id}-${idx}` : `opp-action-${idx}`}
                  onMouseEnter={() => {
                    if (!isFacedown) setPreviewCard(card);
                  }}
                  onClick={() => {
                    if (!isFacedown) setPreviewCard(card);
                  }}
                  className={`shrink-0 transition-transform hover:scale-105 cursor-pointer relative ${
                    isLastCard ? 'ring-1 ring-[#22d3ee] shadow-[0_0_15px_rgba(34,211,238,0.35)]' : 'opacity-90'
                  } ${
                    activeControlledPlayer.clashCardReady && otherPlayer.clashCardReady && gameState.phase === 'CLASH_SET'
                      ? 'animate-card-tense'
                      : 'animate-card-slam'
                  }`}
                >
                  <CardView
                    card={card}
                    customSizeClass="w-[104px] h-[148px] sm:w-[116px] sm:h-[164px] text-xs"
                    isFacedown={isFacedown}
                    badge={isFacedown ? undefined : idx === 0 ? '대결' : `연격 ${idx}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            <div className="w-20 h-20 rounded-full border border-[#22d3ee]/20 flex items-center justify-center animate-pulse">
              <span className="text-xl text-[#22d3ee]/35">✦</span>
            </div>
            <span className="absolute text-xs sm:text-sm font-bold text-slate-300 tracking-wider">
              대결 대기
            </span>
          </div>
        )}
      </div>

      {/* [정중앙: ⚔️ CLASH ARENA 공명 주파수 마법진 & 깔끔한 TURN / 턴 주도권 표시] */}
      <div className="relative z-10 w-48 sm:w-56 h-full flex flex-col items-center justify-between py-1 text-center shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-[#f97316] uppercase">
          <span>✦</span>
          <span>CLASH ARENA</span>
          <span>✦</span>
        </div>

        {/* 중앙 원형 TURN 엠블럼: VS/번개 제거, 깔끔한 TURN 01 */}
        <div className="relative flex items-center justify-center my-0.5">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-[#f97316]/60 bg-[#090d16] shadow-[0_0_20px_rgba(249,115,22,0.3)] flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider leading-none">TURN</span>
            <span className="text-base sm:text-lg font-black text-[#f97316] leading-tight mt-0.5">
              {String(gameState.turn).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* 실시간 턴 소유자 & 페이즈 안내 */}
        <div className="flex flex-col items-center gap-1 w-full">
          <div className={`flex items-center justify-center gap-1.5 text-xs font-black px-3 py-1 border shadow-md [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)] ${
            isCurrentControlledTurn
              ? 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/70 shadow-[0_0_12px_rgba(249,115,22,0.35)]'
              : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
          }`}>
            <span>{isCurrentControlledTurn ? '플레이어 (당신)의 턴' : `상대 (${otherPlayer.name})의 턴`}</span>
          </div>

          <span className="text-xs sm:text-[13px] font-bold text-slate-200 text-center max-w-full leading-tight">
            {gameState.phase === 'CLASH_SET' &&
              (activeControlledPlayer.clashCardReady && otherPlayer.clashCardReady ? '🔒 양측 세트 완료!' : '⚔️ 대결 카드 세트 중')}
            {gameState.phase === 'CLASH_REVEAL' && '⚡ 상성 & 속도 판정!'}
            {gameState.phase === 'COMBO_STEP' && `🔥 연격 단계 (${(gameState.players[comboPlayerIndex]?.comboUnlimited) ? '∞' : `${gameState.players[comboPlayerIndex]?.comboCount ?? 0}회`})`}
            {gameState.phase === 'ACTION_PHASE' && '메인 행동 단계'}
            {gameState.phase === 'DRAW_PHASE' && (canP0Draw || canP1Draw ? `🎴 덱 클릭 드로우 (${currentTurnDrawCount}장)` : '드로우 단계')}
            {gameState.phase === 'DISCARD_OVERFLOW' && '엔드 페이즈 (패 정리)'}
            {(gameState.phase === 'LEADER_SELECT' || gameState.phase === 'MULLIGAN' || gameState.phase === 'START_PHASE') && '대전 준비 중'}
          </span>

          {/* [멀티플레이 제한시간 HUD] 플레이어 (당신) 밑 타이머 게이지 & Chess Clock */}
          {isMultiplayer && timeLimitConfig.hasTimeLimit && gameState.phase !== 'START_PHASE' && gameState.phase !== 'LEADER_SELECT' && gameState.phase !== 'MULLIGAN' && (
            <div className="w-full mt-1 px-1.5 py-1 bg-[#070a12]/95 border border-slate-700/80 rounded-xl flex flex-col gap-1 shadow-md">
              {/* 행동/턴 남은 시간 게이지 */}
              <div className="flex items-center justify-between text-[11px] font-mono font-black">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{gameState.phase === 'CLASH_SET' ? '대결 제한' : '행동 제한'}</span>
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded font-black tracking-wider text-xs ${
                    currentTurnTime <= 10
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/60 animate-pulse'
                      : currentTurnTime <= 30
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-200'
                  }`}
                >
                  {currentTurnTime}s
                </span>
              </div>

              {/* 카운트다운 프로그레스 바 */}
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    currentTurnTime <= 10
                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                      : currentTurnTime <= 30
                      ? 'bg-amber-400'
                      : isCurrentControlledTurn
                      ? 'bg-gradient-to-r from-orange-500 to-amber-400'
                      : 'bg-cyan-400'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        (currentTurnTime /
                          (gameState.phase === 'CLASH_SET'
                            ? (timeLimitConfig.clashTimeSec || 30)
                            : (timeLimitConfig.turnTimeSec || 90))) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>

              {/* Chess Clock: 각 플레이어 총 잔여 시간 */}
              <div className="grid grid-cols-2 gap-1 pt-0.5 text-[10px] font-mono font-black">
                <div
                  className={`flex items-center justify-between px-1.5 py-0.5 rounded border transition-colors ${
                    (isCurrentControlledTurn && gameState.phase === 'ACTION_PHASE') ||
                    (gameState.phase === 'CLASH_SET' && !activeControlledPlayer.clashCardReady)
                      ? 'bg-amber-950/80 border-amber-500/70 text-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.25)]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                  title="내 총 잔여 시간"
                >
                  <span className="truncate">나(총)</span>
                  <span>
                    {formatChessTime(myPlayerIndex === 0 ? p0TotalTime : p1TotalTime)}
                  </span>
                </div>
                <div
                  className={`flex items-center justify-between px-1.5 py-0.5 rounded border transition-colors ${
                    (!isCurrentControlledTurn && gameState.phase === 'ACTION_PHASE') ||
                    (gameState.phase === 'CLASH_SET' && !otherPlayer.clashCardReady)
                      ? 'bg-cyan-950/80 border-cyan-500/70 text-cyan-300 shadow-[0_0_6px_rgba(6,182,212,0.25)]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                  title="상대 총 잔여 시간"
                >
                  <span className="truncate">상대(총)</span>
                  <span>
                    {formatChessTime(myPlayerIndex === 0 ? p1TotalTime : p0TotalTime)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* [우측: 👤 내 출전 액션 슬롯] */}
      <div className="relative flex-1 h-full bg-[#090d16]/75 border border-white/10 px-3 py-1 flex flex-col justify-center overflow-hidden">
        <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]/80" />
        <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]/80" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#f97316]/80" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#f97316]/80" />

        {/* 슬롯 상단 라벨 */}
        <div className="absolute top-1.5 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          <span className="text-xs font-black text-[#f97316] tracking-wider uppercase flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>내 ({activeControlledPlayer.name}) 출전 액션 슬롯</span>
          </span>
          <div className="flex items-center gap-1.5">
            {myNormalAttackCount > 0 && (
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                일반공격 {myNormalAttackCount}
              </span>
            )}
            {myActionCards.length > 0 && (
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/40">
                {myActionCards.length}장
              </span>
            )}
          </div>
        </div>

        {myActionCards.length > 0 ? (
          <div className="w-full h-full flex items-center justify-center gap-2.5 overflow-x-auto pt-4 custom-scrollbar">
            {myActionCards.map((card, idx) => {
              const isLastCard = idx === myActionCards.length - 1;
              const isFacedown = false;

              return (
                <div
                  key={card.id ? `${card.id}-${idx}` : `my-action-${idx}`}
                  onMouseEnter={() => {
                    setPreviewCard(card);
                  }}
                  onClick={() => {
                    setPreviewCard(card);
                  }}
                  className={`shrink-0 transition-transform hover:scale-105 cursor-pointer relative ${
                    isLastCard ? 'ring-1 ring-[#f97316] shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'opacity-90'
                  } ${
                    activeControlledPlayer.clashCardReady && otherPlayer.clashCardReady && gameState.phase === 'CLASH_SET'
                      ? 'animate-card-tense'
                      : 'animate-card-slam'
                  }`}
                >
                  <CardView
                    card={card}
                    customSizeClass="w-[104px] h-[148px] sm:w-[116px] sm:h-[164px] text-xs"
                    isFacedown={isFacedown}
                    badge={idx === 0 ? '대결' : `연격 ${idx}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            <div className="w-20 h-20 rounded-full border border-[#f97316]/25 flex items-center justify-center animate-pulse">
              <span className="text-xl text-[#f97316]/35">✦</span>
            </div>
            <span className="absolute text-xs sm:text-sm font-bold text-slate-300 tracking-wider">
              대결 대기
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
