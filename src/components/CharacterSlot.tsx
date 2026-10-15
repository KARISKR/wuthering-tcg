import React from 'react';
import { CharacterCard } from '../types/tcg';
import { CardView } from './CardView';
import { ArrowLeftRight, ChevronUp, Crown, UserCheck, Layers, MessageSquareQuote } from 'lucide-react';
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
}) => {
  const isLeader = role === 'leader';
  const cardSizeClass = isLeader ? 'w-48 h-72' : 'w-36 h-52';
  const charIdentifier = card?.characterName || card?.nameKr;
  const openingQuote = isLeader && card ? getCharacterOpeningQuote(charIdentifier) : undefined;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onClick={onCardClick}
      title={openingQuote ? `[${card?.nameKr} 출격 대사] "${openingQuote}"` : undefined}
      className={`relative flex flex-col items-center rounded-2xl p-1.5 transition-all duration-200 cursor-pointer group/slot ${
        isLeader
          ? 'bg-slate-950/90 border-2 border-amber-400/90 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
          : 'bg-slate-950/60 border border-slate-800/80 hover:border-slate-700'
      }`}
    >
      {/* 슬롯 상단 라벨 */}
      <div className="flex items-center gap-1.5 mb-1.5">
        {isLeader ? (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs tracking-wider uppercase shadow-md">
            <Crown className="w-3.5 h-3.5 fill-slate-950" />
            리더 (LEADER)
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold text-xs tracking-wider uppercase">
            <UserCheck className="w-3 h-3" />
            백 (SUPPORT)
          </span>
        )}
      </div>

      {/* 카드 본체: 리더 대형(lg), 서포터 중형(md) */}
      <div className="relative">
        {/* 하위 카드 실물 계단식 겹침 & 마우스 호버 시 부채꼴 펼치기 (Fan-Out) */}
        {card && card.underlyingCards && card.underlyingCards.length > 0 && (
          <>
            {card.underlyingCards.map((underCard, idx) => {
              const isBottom = idx === 0;
              const count = card.underlyingCards!.length;

              // 이전 카드 계단식 오프셋 및 호버 시 부채꼴 펼치기 클래스
              const baseTopClass = count === 1 ? '-top-3.5 -left-2.5' : isBottom ? '-top-6 -left-4' : '-top-3 -left-2';
              const hoverTopClass =
                count === 1
                  ? 'group-hover/slot:-top-7 group-hover/slot:-left-4'
                  : isBottom
                  ? 'group-hover/slot:-top-11 group-hover/slot:-left-7'
                  : 'group-hover/slot:-top-6 group-hover/slot:-left-3.5';
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
                  className={`absolute ${cardSizeClass} ${baseTopClass} ${hoverTopClass} ${rotateClass} ${zClass} rounded-2xl border-2 border-amber-500/80 bg-slate-900 shadow-2xl overflow-hidden transition-all duration-300 ease-out cursor-pointer hover:border-amber-300 hover:ring-2 hover:ring-amber-400/50 group/undercard`}
                  title={`클릭하여 진화 계보 전체 보기 | Lv.${underCard.level} [${underCard.nameKr}] (상속 스킬 보유 중)`}
                >
                  {/* 하위 카드 실물 일러스트 */}
                  <img
                    src={underCard.artUrl}
                    alt={underCard.nameKr}
                    className="w-full h-full object-cover opacity-80 group-hover/undercard:opacity-100 transition-opacity"
                  />

                  {/* 계단식 돌출 상단 영역의 레벨 배지 */}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/90 backdrop-blur-sm px-2 py-0.5 rounded-full border border-amber-400 text-amber-300 font-mono font-black text-[9px] shadow-lg">
                    <span>Lv.{underCard.level}</span>
                    <span className="text-[8px] text-slate-300">상속</span>
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
              className="absolute -top-3 -left-3 z-30 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-[10px] sm:text-[11px] shadow-xl border border-white/80 flex items-center gap-1.5 cursor-pointer transform hover:scale-110 active:scale-95 transition"
              title="클릭하여 진화 계보(Lv.0~Lv.2) 및 상속 스킬 모람 보기"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>스택 {card.underlyingCards.length + 1}장 ⤢</span>
            </button>
          </>
        )}

        <CardView
          card={card}
          size={isLeader ? 'lg' : 'md'}
          onClick={onCardClick}
          className="transition-transform duration-200"
        />

        {/* 레벨업 가능 시 펄스 버튼 오버레이 (플레이어만 조작 가능) */}
        {!isAi && canUpgrade && isOwnerActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpgradeClick?.();
            }}
            className="absolute -top-3 -right-3 z-20 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black px-3 py-1 rounded-full text-xs shadow-xl shadow-amber-500/50 border border-white/60 animate-bounce cursor-pointer"
            title="캐릭터 레벨업"
          >
            <ChevronUp className="w-4 h-4" />
            진화
          </button>
        )}
      </div>

      {/* 조작 버튼 (리더 교대) */}
      {!isAi && !isLeader && canSwitch && isOwnerActive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSwitchClick?.();
          }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md cursor-pointer border border-indigo-400/50"
          title="리더로 교대"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          리더 교대
        </button>
      )}
    </div>
  );
};
