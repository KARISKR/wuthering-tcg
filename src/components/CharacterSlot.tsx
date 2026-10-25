import React from 'react';
import { CharacterCard } from '../types/tcg';
import { CardView } from './CardView';
import { ArrowLeftRight, ChevronUp, Crown, UserCheck, Layers } from 'lucide-react';
import { getCharacterOpeningQuote } from '../data/characterQuotes';

interface CharacterSlotProps {
  card: CharacterCard | null;
  role: 'leader' | 'leftSupport' | 'rightSupport';
  isOwnerActive: boolean;
  canUpgrade: boolean;
  canSwitch: boolean;
  onUpgradeClick?: () => void;
  onSwitchClick?: () => void;
  onCardClick?: () => void;
  onMouseEnter?: () => void;
  onOpenEvolutionModal?: (char: CharacterCard) => void;
  onHoverUnderlyingCard?: (card: CharacterCard) => void;
  isAi?: boolean;
  isOpponent?: boolean;
}

export const CharacterSlot: React.FC<CharacterSlotProps> = ({
  card,
  role,
  isOwnerActive,
  canUpgrade,
  canSwitch,
  onUpgradeClick,
  onSwitchClick,
  onCardClick,
  onMouseEnter,
  onOpenEvolutionModal,
  onHoverUnderlyingCard,
  isAi = false,
  isOpponent = false,
}) => {
  const isLeader = role === 'leader';

  // 시인성 극대화 대형 카드 규격 + 리더 15% 확대 위계 (상하 여백 최적화)
  const cardSizeClass = isOpponent
    ? isLeader
      ? 'w-[124px] h-[174px] sm:w-[136px] sm:h-[190px]'
      : 'w-[108px] h-[152px] sm:w-[118px] sm:h-[165px]'
    : isLeader
    ? 'w-[152px] h-[214px] sm:w-[166px] sm:h-[234px]'
    : 'w-[132px] h-[186px] sm:w-[144px] sm:h-[202px]';

  const charIdentifier = card?.characterName || card?.nameKr;
  const openingQuote = isLeader && card ? getCharacterOpeningQuote(charIdentifier) : undefined;

  // 코너 브라켓 색상 (리더: 택티컬 오렌지 #f97316, 상대 서포트: 시안, 내 서포트: 오렌지/화이트)
  const bracketColor = isLeader
    ? 'border-[#f97316]'
    : isOpponent
    ? 'border-cyan-400/60'
    : 'border-[#f97316]/50';

  return (
    <div
      onMouseEnter={onMouseEnter}
      onClick={onCardClick}
      title={openingQuote ? `[${card?.nameKr} 출격 대사] "${openingQuote}"` : undefined}
      className={`relative flex flex-col items-center p-2 transition-all duration-200 cursor-pointer group/slot bg-[#0c101b]/85 backdrop-blur-md ${
        isLeader
          ? 'scale-105 z-10 border border-[#f97316]/70 shadow-[0_0_28px_rgba(249,115,22,0.28)]'
          : 'border border-white/10 hover:border-[#f97316]/40'
      }`}
    >
      {/* 네 모서리 8px 명조 택티컬 'ㄱ'자 코너 브라켓 장식 */}
      <span className={`pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${bracketColor}`} />
      <span className={`pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${bracketColor}`} />
      <span className={`pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${bracketColor}`} />
      <span className={`pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${bracketColor}`} />

      {/* 리더 슬롯 바닥 상시 택티컬 오렌지(#f97316) 오라 광원 효과 */}
      {isLeader && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_100%,rgba(249,115,22,0.32),transparent_75%)]" />
          <div className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 w-4/5 h-[3px] bg-gradient-to-r from-transparent via-[#f97316] to-transparent shadow-[0_0_12px_#f97316]" />
        </>
      )}

      {/* 슬롯 상단 라벨 */}
      <div className="relative z-10 flex items-center gap-1 mb-1.5">
        {isLeader ? (
          <span className="flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white font-black text-xs tracking-wider uppercase shadow-[0_0_10px_rgba(249,115,22,0.4)] [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]">
            <Crown className="w-3.5 h-3.5 fill-white" />
            <span>LEADER</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-[#141a29] border border-[#f97316]/30 text-[#f97316]/90 font-bold text-[10px] sm:text-[11px] tracking-wider uppercase">
            <UserCheck className="w-3 h-3 text-[#f97316]/80" />
            <span>SUPPORT</span>
          </span>
        )}
      </div>

      {/* 카드 본체 */}
      <div className="relative z-10">
        {/* 하위 카드 실물 계단식 겹침 & 마우스 호버 시 부채꼴 펼치기 (Fan-Out) */}
        {card && card.underlyingCards && card.underlyingCards.length > 0 && (
          <>
            {card.underlyingCards.map((underCard, idx) => {
              const isBottom = idx === 0;
              const count = card.underlyingCards!.length;

              const baseTopClass = count === 1 ? '-top-2.5 -left-2' : isBottom ? '-top-4 -left-3' : '-top-2 -left-1.5';
              const hoverTopClass =
                count === 1
                  ? 'group-hover/slot:-top-5 group-hover/slot:-left-3.5'
                  : isBottom
                  ? 'group-hover/slot:-top-8 group-hover/slot:-left-6'
                  : 'group-hover/slot:-top-4 group-hover/slot:-left-3';
              const rotateClass =
                count === 1
                  ? '-rotate-2 group-hover/slot:-rotate-4'
                  : isBottom
                  ? '-rotate-3 group-hover/slot:-rotate-6'
                  : '-rotate-1 group-hover/slot:-rotate-3';
              const zClass = isBottom ? '-z-20' : '-z-10';

              return (
                <div
                  key={underCard.id || idx}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    onHoverUnderlyingCard?.(underCard);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEvolutionModal?.(card);
                  }}
                  className={`absolute ${cardSizeClass} ${baseTopClass} ${hoverTopClass} ${rotateClass} ${zClass} rounded-xl border border-[#f97316]/80 bg-slate-900 shadow-2xl overflow-hidden transition-all duration-300 ease-out cursor-pointer hover:border-[#f97316] hover:ring-2 hover:ring-[#f97316]/50 group/undercard`}
                  title={`클릭하여 진화 계보 전체 보기 | Lv.${underCard.level} [${underCard.nameKr}] (상속 스킬 보유 중)`}
                >
                  <img
                    src={underCard.artUrl}
                    alt={underCard.nameKr}
                    className="w-full h-full object-cover opacity-80 group-hover/undercard:opacity-100 transition-opacity"
                  />
                  <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-black/90 backdrop-blur-sm px-1.5 py-0.5 rounded border border-[#f97316] text-[#f97316] font-mono font-black text-[8px] shadow-lg">
                    <span>Lv.{underCard.level}</span>
                  </div>
                </div>
              );
            })}

            {/* 상단 스택 배지 (클릭 시 진화 계보 팝업 오픈) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenEvolutionModal?.(card);
              }}
              className="absolute -top-2.5 -left-2.5 z-30 px-2 py-0.5 rounded bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-[10px] sm:text-xs shadow-xl border border-white/80 flex items-center gap-1 cursor-pointer transform hover:scale-110 active:scale-95 transition"
              title="클릭하여 진화 계보(Lv.0~Lv.2) 및 상속 스킬 모음 보기"
            >
              <Layers className="w-3 h-3" />
              <span>스택 {card.underlyingCards.length + 1}</span>
            </button>
          </>
        )}

        <CardView
          card={card}
          size={isLeader ? 'md' : 'sm'}
          customSizeClass={cardSizeClass}
          onClick={onCardClick}
          showZoomModal={false}
          className="transition-transform duration-200"
        />

        {/* 레벨업 가능 시 펄스 버튼 오버레이 (플레이어만 조작 가능) */}
        {!isAi && canUpgrade && isOwnerActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpgradeClick?.();
            }}
            className="absolute -top-2.5 -right-2.5 z-20 flex items-center gap-1 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black px-2.5 py-0.5 text-xs shadow-[0_0_12px_rgba(249,115,22,0.8)] border border-white/80 animate-bounce cursor-pointer [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]"
            title="캐릭터 레벨업"
          >
            <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
            <span>진화</span>
          </button>
        )}
      </div>

      {/* 조작 버튼 (리더 교대) - 명조 공식 사선 깎인 차콜 블랙 + #f97316 오렌지 테두리 & 텍스트 */}
      {!isAi && !isLeader && canSwitch && isOwnerActive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSwitchClick?.();
          }}
          className="relative z-10 mt-2 w-full flex items-center justify-center gap-1.5 py-1 px-2.5 bg-[#111520] hover:bg-[#1d2436] text-[#f97316] hover:text-[#fb923c] font-black text-xs tracking-wide transition shadow-[0_2px_10px_rgba(0,0,0,0.7)] cursor-pointer border border-[#f97316]/80 hover:border-[#f97316] [clip-path:polygon(0_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%)]"
          title="리더로 교대"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[#f97316]" />
          <span>리더 교대</span>
        </button>
      )}
    </div>
  );
};

