import React from 'react';
import { CharacterCard } from '../types/tcg';
import { CardView } from './CardView';
import { ArrowLeftRight, ChevronUp, Crown, UserCheck, Layers } from 'lucide-react';

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
  isAi = false,
}) => {
  const isLeader = role === 'leader';

  return (
    <div
      onMouseEnter={onMouseEnter}
      onClick={onCardClick}
      className={`relative flex flex-col items-center rounded-2xl p-1.5 transition-all duration-200 cursor-pointer ${
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

      {/* 카드 본체: 리더 대형(lg), 서포터 중형(md)으로 대폭 확대 */}
      <div className="relative">
        {/* 하위 카드 겹침(스택) 계단식 섀도우 연출 */}
        {card && card.underlyingCards && card.underlyingCards.length > 0 && (
          <>
            <div className="absolute -top-1 -right-1 w-full h-full rounded-2xl border border-amber-500/40 bg-slate-800/60 -z-10 shadow-md" />
            {card.underlyingCards.length > 1 && (
              <div className="absolute -top-2 -right-2 w-full h-full rounded-2xl border border-amber-500/20 bg-slate-800/30 -z-20" />
            )}
            <div
              className="absolute -top-2.5 -left-2 z-20 px-2 py-0.5 rounded-full bg-slate-900/95 border border-amber-400 text-amber-300 font-mono font-black text-[10px] shadow-lg flex items-center gap-1"
              title={`이전 레벨 카드 ${card.underlyingCards.length}장 겹침 (이전 모든 스킬 보유 중)`}
            >
              <Layers className="w-3 h-3 text-amber-400" />
              <span>스택 {card.underlyingCards.length + 1}</span>
            </div>
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
