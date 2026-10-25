import React, { useState } from 'react';
import { AnyCard } from '../types/tcg';
import { Sparkles, Layers } from 'lucide-react';

interface ZoneCardStackProps {
  cards: AnyCard[];
  zoneType: 'CONCERTO' | 'TRASH';
  maxVisible?: number;
  isSecret?: boolean;
  compact?: boolean;
  onOpenModal: () => void;
  onHoverCard?: (card: AnyCard) => void;
  className?: string;
}

export const ZoneCardStack: React.FC<ZoneCardStackProps> = ({
  cards,
  zoneType,
  maxVisible = 4,
  isSecret = false,
  compact = false,
  onOpenModal,
  onHoverCard,
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const count = cards.length;
  const isConcerto = zoneType === 'CONCERTO';

  // 코너 브라켓 및 테마 색상 (협주: 시안 #22d3ee, 트래시: 택티컬 오렌지 #f97316)
  const bracketColor = isConcerto ? 'border-cyan-400/80' : 'border-[#f97316]/70';
  const themeBorder = isConcerto
    ? 'border-white/10 hover:border-cyan-400/60'
    : 'border-white/10 hover:border-[#f97316]/60';
  const themeText = isConcerto ? 'text-cyan-300' : 'text-[#f97316]';
  const themeBadge = isConcerto
    ? 'text-cyan-300 bg-cyan-950/80 border-cyan-500/50'
    : 'text-[#f97316] bg-orange-950/50 border-[#f97316]/40';

  const visibleCards = cards.slice(Math.max(0, count - maxVisible));
  const visibleCount = visibleCards.length;

  const heightClass = className || (compact ? 'h-[164px] sm:h-[174px]' : 'h-[200px] sm:h-[212px]');
  const cardSizeClass = compact ? 'w-[60px] sm:w-[66px] aspect-[5/7]' : 'w-[72px] sm:w-[80px] aspect-[5/7]';

  return (
    <div
      onClick={onOpenModal}
      className={`relative border ${themeBorder} bg-[#0c101b]/80 backdrop-blur-md px-1 py-2 flex flex-col items-center justify-between text-center ${heightClass} shadow-xl cursor-pointer transition-all duration-200 group select-none overflow-visible`}
      title={
        isConcerto
          ? `협주 에리어 (${count}/10장) - 클릭 시 전체 목록`
          : `트래시 에리어 (${count}장) - 클릭 시 전체 목록`
      }
    >
      {/* 네 모서리 8px 골드/오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
      <span className={`pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${bracketColor}`} />
      <span className={`pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${bracketColor}`} />
      <span className={`pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${bracketColor}`} />
      <span className={`pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${bracketColor}`} />

      {/* 1. 네모칸 위 중앙 정렬 작은 직사각형 네모 라벨 */}
      <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-[#090d16] border ${
        isConcerto ? 'border-cyan-400/60 text-cyan-300' : 'border-[#f97316]/60 text-[#f97316]'
      } flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap z-20`}>
        <span className="text-[11px] sm:text-xs font-black tracking-tight leading-normal">
          {isConcerto ? '협주 에리어' : '트래시 에리어'}
        </span>
        <span className={`text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 border shrink-0 leading-normal ${themeBadge}`}>
          {isConcerto ? `${count}/10` : `${count}`}
        </span>
      </div>

      {/* 2. 중앙 자연스러운 세로형 카드 스택 영역 (여유롭고 자연스러운 배치) */}
      <div className="relative w-full flex-1 flex items-center justify-center pt-2 pb-1">
        {count === 0 ? (
          // 빈 영역 홀로그램 슬롯 (비어있음)
          <div className={`${cardSizeClass} relative border border-white/10 bg-[#090d16]/75 rounded-md flex flex-col items-center justify-center text-slate-500 gap-1 shadow-inner`}>
            <span className="text-base text-slate-600/40">✦</span>
            <span className="text-[9px] font-bold text-slate-500">EMPTY</span>
          </div>
        ) : isSecret ? (
          // 상대방 비공개 협주 에너지 스택 (단정한 세로형 카드 스택)
          <div className="relative flex items-center justify-center">
            {Array.from({ length: Math.min(count, 3) }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  top: `${idx * -2.5}px`,
                  left: `${idx * 1.5}px`,
                  zIndex: idx,
                }}
                className={`${cardSizeClass} absolute rounded-md border border-cyan-500/60 bg-gradient-to-br from-[#090d16] via-cyan-950/70 to-[#090d16] shadow-md flex flex-col items-center justify-center gap-1 p-1`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                <span className="text-[8px] font-black text-cyan-300 uppercase tracking-wider text-center">
                  CONCERTO
                </span>
              </div>
            ))}
            <div className={`${cardSizeClass} opacity-0 pointer-events-none`} />
          </div>
        ) : (
          // 공개된 카드 스택 (자연스러운 비율의 세로형 카드)
          <div className="relative flex items-center justify-center">
            {visibleCards.map((card, idx) => {
              const isTopCard = idx === visibleCount - 1;
              const isHovered = hoveredIdx === idx;
              const cardColor = (card as any).color;

              const colorBorder =
                cardColor === 'RED'
                  ? 'border-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                  : cardColor === 'GREEN'
                  ? 'border-emerald-500/80 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                  : cardColor === 'BLUE'
                  ? 'border-cyan-500/80 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                  : 'border-[#f97316]/60 shadow-[0_0_8px_rgba(249,115,22,0.25)]';

              const offsetTop = (visibleCount - 1 - idx) * -3;
              const offsetLeft = (visibleCount - 1 - idx) * -2;

              return (
                <div
                  key={card.id || `${idx}-${card.nameKr}`}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredIdx(idx);
                    onHoverCard?.(card);
                  }}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    top: `${offsetTop}px`,
                    left: `${offsetLeft}px`,
                    transform: isHovered ? 'scale(1.08) translateY(-4px)' : 'scale(1)',
                    zIndex: isHovered ? 40 : idx + 1,
                  }}
                  className={`absolute ${cardSizeClass} rounded-md overflow-hidden border ${colorBorder} bg-slate-950 shadow-md transition-all duration-150 cursor-pointer ${
                    isTopCard ? 'shadow-[0_4px_14px_rgba(0,0,0,0.85)]' : 'shadow'
                  }`}
                >
                  <img
                    src={(card as any).artUrl}
                    alt={card.nameKr}
                    className="w-full h-full object-cover object-top hover:object-center transition-all duration-200"
                  />

                  {/* 하단 미니 라벨 */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-1 py-0.5 text-center">
                    <span className="text-[9px] font-black text-white truncate block drop-shadow leading-tight" title={card.nameKr}>
                      {card.nameKr}
                    </span>
                  </div>

                  {!isTopCard && !isHovered && (
                    <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                  )}
                </div>
              );
            })}
            {/* 자리 확보용 invisible placeholder */}
            <div className={`${cardSizeClass} opacity-0 pointer-events-none`} />
          </div>
        )}
      </div>

      {/* 3. 하단 안내 텍스트 */}
      <div className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 group-hover:text-[#f97316] transition shrink-0 z-10">
        <Layers className="w-3 h-3" />
        <span>목록 보기</span>
      </div>
    </div>
  );
};
