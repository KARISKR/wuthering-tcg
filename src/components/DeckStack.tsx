import React from 'react';
import { Layers, Sparkles, Crown } from 'lucide-react';

interface DeckStackProps {
  type: 'CHARACTER' | 'ACTION';
  count: number;
  label?: string;
  isDrawing?: boolean;
  canDraw?: boolean;
  drawCount?: number;
  playerTheme?: 'p0' | 'p1';
  onClick?: () => void;
  className?: string;
}

export const DeckStack: React.FC<DeckStackProps> = ({
  type,
  count,
  label,
  isDrawing = false,
  canDraw = false,
  drawCount = 1,
  playerTheme = 'p0',
  onClick,
  className = '',
}) => {
  const isCharacter = type === 'CHARACTER';
  const defaultLabel = isCharacter ? '캐릭터 덱' : '액션 덱';
  const displayLabel = label || defaultLabel;

  const cardBackSrc = isCharacter
    ? '/cards/card_back_character.png'
    : '/cards/card_back_action.png';

  // 테마 색상 및 테두리 글로우
  const themeBorder = canDraw
    ? 'border-amber-400 ring-4 ring-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.7)] scale-[1.02] cursor-pointer animate-pulse'
    : isDrawing
    ? isCharacter
      ? 'border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.5)] -translate-y-1'
      : playerTheme === 'p1'
      ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.5)] -translate-y-1'
      : 'border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.5)] -translate-y-1'
    : isCharacter
    ? 'border-amber-500/30 hover:border-amber-400/60'
    : playerTheme === 'p1'
    ? 'border-slate-800 hover:border-cyan-500/40'
    : 'border-amber-500/30 hover:border-amber-400/50';

  const badgeBg = canDraw
    ? 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse'
    : isCharacter
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    : playerTheme === 'p1'
    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  const titleColor = canDraw
    ? 'text-amber-300 font-black'
    : isCharacter
    ? 'text-amber-400/90'
    : playerTheme === 'p1'
    ? 'text-slate-400'
    : 'text-slate-300';

  return (
    <div
      onClick={onClick}
      className={`flex-1 rounded-2xl border ${themeBorder} bg-slate-950/90 p-2 sm:p-2.5 flex flex-col items-center justify-between text-center relative shadow-xl transition-all duration-300 group select-none min-h-[190px] sm:min-h-[210px] ${
        canDraw ? 'hover:shadow-[0_0_35px_rgba(245,158,11,0.8)] cursor-pointer active:scale-95' : ''
      } ${className}`}
      title={`${displayLabel} (${count}장 남음)${canDraw ? ' - 클릭하여 카드 뽑기!' : ''}`}
    >
      {/* 0. 드로우 대기 시 상단 바운스 배지 */}
      {canDraw && count > 0 && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-black text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-[0_0_18px_rgba(245,158,11,0.9)] border border-yellow-100 animate-bounce flex items-center gap-1 pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 fill-slate-950 text-slate-950 animate-spin" />
          <span>클릭하여 드로우! ({drawCount}장)</span>
        </div>
      )}
      {/* 1. 상단 라벨 & 남은 장수 뱃지 */}
      <div className="flex items-center justify-between w-full px-1 z-10 shrink-0">
        <span className={`text-xs sm:text-sm font-mono font-black ${titleColor} flex items-center gap-1`}>
          {isCharacter ? (
            <Crown className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Sparkles className={`w-3.5 h-3.5 ${isDrawing ? 'text-amber-300 animate-spin' : 'text-slate-400'}`} />
          )}
          <span>{displayLabel}</span>
        </span>
        <span className={`text-[11px] font-mono font-black px-1.5 py-0.5 rounded border ${badgeBg}`}>
          {count}장
        </span>
      </div>

      {/* 2. 중앙 입체 카드 덱 스택 영역 */}
      <div className="relative w-full flex-1 flex items-center justify-center my-1">
        {count === 0 ? (
          /* 덱 소진 플레이스홀더 */
          <div className="w-[82px] sm:w-[94px] md:w-[104px] aspect-[588/1024] rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-slate-600 gap-1.5 shadow-inner">
            <Layers className="w-5 h-5 text-slate-700" />
            <span className="text-[10px] font-bold text-slate-500 font-mono">덱 소진</span>
          </div>
        ) : (
          /* 입체 3D 카드 덱 (실제 카드 뒷면 이미지 렌더링) */
          <div className="relative flex items-center justify-center">
            {/* 3장 이상일 때 최하단 레이어 그림자 */}
            {count >= 3 && (
              <div
                className="absolute w-[82px] sm:w-[94px] md:w-[104px] aspect-[588/1024] rounded-xl bg-slate-900 border border-slate-800/80 shadow-md pointer-events-none translate-x-[4px] translate-y-[4px]"
                aria-hidden="true"
              />
            )}
            {/* 2장 이상일 때 중간 레이어 */}
            {count >= 2 && (
              <div
                className="absolute w-[82px] sm:w-[94px] md:w-[104px] aspect-[588/1024] rounded-xl bg-slate-850 border border-slate-700/80 shadow-md pointer-events-none translate-x-[2px] translate-y-[2px]"
                aria-hidden="true"
              />
            )}
            {/* 맨 위 실제 카드 뒷면 */}
            <div
              className={`relative w-[82px] sm:w-[94px] md:w-[104px] aspect-[588/1024] rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
                canDraw
                  ? 'ring-4 ring-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.8)] -translate-y-2 scale-105 group-hover:scale-110 group-hover:-translate-y-3 cursor-pointer'
                  : 'group-hover:scale-105 group-hover:-translate-y-1'
              } ${isDrawing ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
            >
              <img
                src={cardBackSrc}
                alt={`${displayLabel} 뒷면`}
                className="w-full h-full object-cover pointer-events-none rounded-xl"
                loading="eager"
              />
              {/* 카드 표면 은은한 입체 광택 하이라이트 */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/15 pointer-events-none rounded-xl" />
              {/* 드로우 대기 시 황금빛 마력 파동 오버레이 */}
              {canDraw && (
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/35 via-transparent to-yellow-300/30 pointer-events-none animate-pulse rounded-xl" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. 하단 장수 표시 바 */}
      <div className="w-full text-center mt-1 shrink-0">
        <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400/80">
          남은 카드 <strong className="text-white font-mono">{count}</strong>장
        </span>
      </div>
    </div>
  );
};
