import React, { useState } from 'react';
import { AnyCard } from '../types/tcg';
import { BatteryCharging, Trash2, Sparkles, Layers } from 'lucide-react';

interface ZoneCardStackProps {
  cards: AnyCard[];
  zoneType: 'CONCERTO' | 'TRASH';
  maxVisible?: number;
  isSecret?: boolean; // 비공개 협주 카드(상대 AI 등)
  onOpenModal: () => void;
  onHoverCard?: (card: AnyCard) => void;
  className?: string;
}

export const ZoneCardStack: React.FC<ZoneCardStackProps> = ({
  cards,
  zoneType,
  maxVisible = 5,
  isSecret = false,
  onOpenModal,
  onHoverCard,
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const count = cards.length;
  const isConcerto = zoneType === 'CONCERTO';

  // 테마 색상 및 아이콘
  const themeBorder = isConcerto ? 'border-cyan-500/50 hover:border-cyan-400' : 'border-slate-700 hover:border-amber-400/70';
  const themeBg = isConcerto ? 'bg-cyan-950/20' : 'bg-slate-900/40';
  const themeText = isConcerto ? 'text-cyan-400' : 'text-slate-300';
  const themeBadge = isConcerto
    ? 'text-cyan-300 bg-cyan-950/80 border-cyan-500/50'
    : 'text-amber-300 bg-slate-900 border-slate-700';

  // 최근 쌓인 카드들 중 최대 maxVisible장 추출
  const visibleCards = cards.slice(Math.max(0, count - maxVisible));
  const visibleCount = visibleCards.length;

  // 장수가 많아질수록 겹침 간격(오프셋)을 동적으로 조절 (최대 높이 85px 내에 안착)
  const stepOffset = visibleCount <= 1 ? 0 : Math.min(12, Math.max(5, Math.floor(45 / (visibleCount - 1))));

  return (
    <div
      onClick={onOpenModal}
      className={`rounded-2xl border ${themeBorder} bg-slate-950/90 p-2 flex flex-col items-center justify-between text-center ${
        className || 'h-[140px] sm:h-[150px] shrink-0'
      } relative shadow-lg cursor-pointer transition-all duration-200 group select-none overflow-hidden`}
      title={
        isConcerto
          ? `협주 에리어 (${count}/10장) - 90도 회전 카드 스택 (클릭 시 전체 목록)`
          : `트래시 에리어 (${count}장) - 90도 회전 카드 스택 (클릭 시 전체 목록)`
      }
    >
      {/* 1. 상단 타이틀 & 카운트 뱃지 */}
      <div className="flex items-center justify-between w-full px-1 z-10 shrink-0">
        <span className={`text-xs font-mono font-black ${themeText} flex items-center gap-1`}>
          {isConcerto ? (
            <>
              <BatteryCharging className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>협주 게이지</span>
            </>
          ) : (
            <>
              <Trash2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>트래시</span>
            </>
          )}
        </span>
        <span className={`text-[11px] font-mono font-black px-1.5 py-0.5 rounded border ${themeBadge}`}>
          {isConcerto ? `${count} / 10` : `${count}장`}
        </span>
      </div>

      {/* 2. 중앙 90도 가로형 눕힌 카드 스택 영역 (Fanned Stack) */}
      <div className="relative w-full flex-1 flex items-center justify-center my-1 min-h-[85px] sm:min-h-[92px]">
        {count === 0 ? (
          // 빈 영역 플레이스홀더
          <div className="w-[105px] sm:w-[115px] h-[72px] sm:h-[78px] rounded-xl border border-dashed border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-slate-600 gap-1">
            {isConcerto ? (
              <BatteryCharging className="w-5 h-5 text-cyan-500/30" />
            ) : (
              <Trash2 className="w-5 h-5 text-slate-600/50" />
            )}
            <span className="text-[10px] font-bold text-slate-500">비어있음</span>
          </div>
        ) : isSecret ? (
          // 상대방 비공개 협주 에너지 스택
          <div className="relative w-[105px] sm:w-[115px] h-[72px] sm:h-[78px]">
            {Array.from({ length: Math.min(count, 4) }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  top: `${idx * 4}px`,
                  left: `${idx * 2}px`,
                  zIndex: idx,
                }}
                className="absolute w-[105px] sm:w-[115px] h-[68px] sm:h-[74px] rounded-xl border border-cyan-500/60 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 shadow-md flex items-center justify-between px-2.5 transition-transform"
              >
                <div className="w-6 h-6 rounded-full border border-cyan-400/40 bg-slate-900/80 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-cyan-300 animate-pulse" />
                </div>
                <span className="text-[9px] font-mono font-black text-cyan-300 uppercase tracking-wider">
                  CONCERTO
                </span>
                <span className="text-xs font-mono font-black text-cyan-200">#{idx + 1}</span>
              </div>
            ))}
          </div>
        ) : (
          // 공개된 카드 스택 (90도 눕혀서 가로로 크게 배치 + 계단식 겹침)
          <div className="relative w-[108px] sm:w-[122px] h-[82px] sm:h-[88px] flex items-center justify-center">
            {visibleCards.map((card, idx) => {
              const isTopCard = idx === visibleCount - 1;
              const isHovered = hoveredIdx === idx;
              const cardColor = (card as any).color;

              // 속성별 테두리 및 글로우
              const colorBorder =
                cardColor === 'RED'
                  ? 'border-red-500/80'
                  : cardColor === 'GREEN'
                  ? 'border-emerald-500/80'
                  : cardColor === 'BLUE'
                  ? 'border-cyan-500/80'
                  : 'border-slate-600';

              // 계단식 세로 오프셋
              const topOffset = idx * stepOffset;
              const leftOffset = (idx % 2 === 0 ? -1 : 1) * Math.min(2, idx);

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
                    top: `${topOffset}px`,
                    transform: `translateX(${leftOffset}px) ${isHovered ? 'scale(1.08) translateY(-4px)' : 'scale(1)'}`,
                    zIndex: isHovered ? 30 : idx + 1,
                  }}
                  className={`absolute w-[105px] sm:w-[118px] h-[64px] sm:h-[70px] rounded-xl overflow-hidden border-2 ${colorBorder} bg-slate-950 shadow-md transition-all duration-150 cursor-pointer ${
                    isTopCard ? 'shadow-[0_4px_16px_rgba(0,0,0,0.8)]' : 'shadow'
                  }`}
                >
                  {/* 카드 일러스트: 가로형(눕힘) 뷰포트에 꽉 차게 렌더링 */}
                  <img
                    src={(card as any).artUrl}
                    alt={card.nameKr}
                    className="w-full h-full object-cover object-top hover:object-center transition-all duration-200"
                  />

                  {/* 하단 카드명 및 속성 오버레이 */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-1.5 py-0.5 flex items-center justify-between text-[10px] sm:text-[11px] font-black">
                    <span className="text-white truncate max-w-[85px] drop-shadow" title={card.nameKr}>
                      {card.nameKr}
                    </span>
                    {cardColor && (
                      <span
                        className={`text-[9px] px-1 rounded font-black ${
                          cardColor === 'RED'
                            ? 'text-red-300 bg-red-950/80'
                            : cardColor === 'GREEN'
                            ? 'text-emerald-300 bg-emerald-950/80'
                            : 'text-cyan-300 bg-cyan-950/80'
                        }`}
                      >
                        {cardColor[0]}
                      </span>
                    )}
                  </div>

                  {/* 맨 위 카드가 아닐 때 살짝 어두운 섀도우 효과 (입체감 부여) */}
                  {!isTopCard && !isHovered && (
                    <div className="absolute inset-0 bg-black/35 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 하단 안내 텍스트 & 목록 아이콘 */}
      <div className="w-full flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-400 group-hover:text-amber-300 transition shrink-0 z-10 pt-0.5">
        <Layers className="w-3 h-3" />
        <span>전체 목록 보기</span>
      </div>
    </div>
  );
};
