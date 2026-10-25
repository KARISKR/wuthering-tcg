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
  compact?: boolean;
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
  compact = false,
  onClick,
  className = '',
}) => {
  const isCharacter = type === 'CHARACTER';
  const defaultLabel = isCharacter ? '캐릭터 덱' : '액션 덱';
  const displayLabel = label || defaultLabel;

  const cardBackSrc = isCharacter
    ? '/cards/card_back_character.png'
    : '/cards/card_back_action.png';

  const bracketColor = canDraw
    ? 'border-[#f97316]'
    : playerTheme === 'p1'
    ? 'border-cyan-400/70'
    : 'border-[#f97316]/70';

  const themeBorder = canDraw
    ? 'border-[#f97316] ring-2 ring-[#f97316]/80 shadow-[0_0_25px_rgba(249,115,22,0.65)] scale-[1.02] cursor-pointer animate-pulse'
    : isDrawing
    ? playerTheme === 'p1'
      ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.5)] -translate-y-0.5'
      : 'border-[#f97316] ring-2 ring-[#f97316]/80 shadow-[0_0_20px_rgba(249,115,22,0.5)] -translate-y-0.5'
    : 'border-white/10 hover:border-[#f97316]/40';

  const badgeBg = canDraw
    ? 'bg-[#f97316] text-white font-black border-[#fb923c] shadow-[0_0_10px_rgba(249,115,22,0.5)] animate-pulse'
    : isCharacter
    ? 'bg-orange-950/60 text-[#f97316] border-[#f97316]/40'
    : playerTheme === 'p1'
    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
    : 'bg-orange-950/60 text-[#f97316] border-[#f97316]/40';

  const titleColor = canDraw
    ? 'text-[#f97316] font-black'
    : isCharacter
    ? 'text-[#f97316]'
    : playerTheme === 'p1'
    ? 'text-cyan-300/90'
    : 'text-slate-200';

  const cardSizeClass = compact
    ? 'w-[64px] sm:w-[70px] aspect-[588/1024]'
    : 'w-[80px] sm:w-[88px] aspect-[588/1024]';

  return (
    <div
      onClick={onClick}
      className={`relative border ${themeBorder} bg-[#0c101b]/80 backdrop-blur-md px-1 py-3 flex flex-col items-center justify-center text-center shadow-xl transition-all duration-300 group select-none overflow-visible ${
        compact ? 'h-[164px] sm:h-[174px]' : 'h-[200px] sm:h-[212px]'
      } ${
        canDraw
          ? 'hover:shadow-[0_0_35px_rgba(249,115,22,0.8)] cursor-pointer active:scale-95'
          : onClick
          ? 'cursor-pointer hover:border-[#f97316] hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] active:scale-95'
          : ''
      } ${className}`}
      title={`${displayLabel} (${count}장 남음)${canDraw ? ' - 클릭하여 카드 뽑기!' : ''}`}
    >
      {/* 네 모서리 8px 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
      <span className={`pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${bracketColor}`} />
      <span className={`pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${bracketColor}`} />
      <span className={`pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${bracketColor}`} />
      <span className={`pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${bracketColor}`} />

      {/* 0. 드로우 대기 시 상단 바운스 배지 */}
      {canDraw && count > 0 && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white font-black text-xs px-2.5 py-0.5 shadow-[0_0_15px_rgba(249,115,22,0.9)] border border-white animate-bounce flex items-center gap-1 pointer-events-none [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]">
          <Sparkles className="w-3.5 h-3.5 fill-white text-white animate-spin" />
          <span>드로우 ({drawCount}장)</span>
        </div>
      )}

      {/* 1. 네모칸 위 중앙 정렬 작은 직사각형 네모 라벨 */}
      <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-[#090d16] border ${
        isCharacter || playerTheme === 'p0'
          ? 'border-[#f97316]/60 text-[#f97316]'
          : 'border-cyan-400/60 text-cyan-300'
      } flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap z-20`}>
        {isCharacter ? (
          <Crown className="w-3.5 h-3.5 text-[#f97316] shrink-0" />
        ) : (
          <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isDrawing ? 'text-[#f97316] animate-spin' : 'text-cyan-400'}`} />
        )}
        <span className="text-[11px] sm:text-xs font-black tracking-tight leading-normal">{displayLabel}</span>
        <span className={`text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 border shrink-0 leading-normal ${badgeBg}`}>
          {count}
        </span>
      </div>

      {/* 2. 중앙 입체 카드 덱 스택 영역 (CSS 다중 그림자 입체 스택 적용, 카드 박스 내부 완벽 안착) */}
      <div className="relative w-full flex-1 flex items-center justify-center pt-2 pb-1">
        {count === 0 ? (
          /* 덱 소진 홀로그램 슬롯 (점선 제거) */
          <div className={`${cardSizeClass} relative border border-white/10 bg-[#090d16]/80 flex flex-col items-center justify-center text-slate-500 gap-1 shadow-inner`}>
            <Layers className="w-4 h-4 text-slate-600" />
            <span className="text-[9px] font-bold text-slate-500">EMPTY</span>
          </div>
        ) : (
          /* 입체 3D 다중 그림자 카드 덱 */
          <div className="relative flex items-center justify-center">
            <div
              className={`relative ${cardSizeClass} rounded-lg border border-[#f97316]/50 overflow-hidden shadow-[2px_2px_0_#1e293b,4px_4px_0_#0f172a,6px_6px_0_#334155,0_10px_25px_rgba(0,0,0,0.8)] transition-all duration-300 ${
                canDraw
                  ? 'ring-2 ring-[#f97316] -translate-y-1 scale-105 group-hover:scale-110 group-hover:-translate-y-2 cursor-pointer'
                  : 'group-hover:scale-105 group-hover:-translate-y-0.5'
              } ${isDrawing ? 'ring-2 ring-[#f97316] animate-pulse' : ''}`}
            >
              <img
                src={cardBackSrc}
                alt={`${displayLabel} 뒷면`}
                className="w-full h-full object-cover pointer-events-none"
                loading="eager"
              />
              {/* 카드 표면 입체 광택 하이라이트 */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/20 pointer-events-none" />
              {canDraw && (
                <div className="absolute inset-0 bg-gradient-to-t from-[#f97316]/35 via-transparent to-orange-200/30 pointer-events-none animate-pulse" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

