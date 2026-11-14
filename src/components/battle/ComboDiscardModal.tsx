import React from 'react';
import type { ActionCard } from '../../types/tcg';

interface ComboDiscardModalProps {
  /** 연격으로 낼 카드 (소리의 변화·강공격 BP01-065/067) */
  card: ActionCard;
  /** 버릴 수 있는 패 (낼 카드 제외) */
  candidates: ActionCard[];
  /** 버릴 카드 id (없으면 버리지 않고 공격) */
  onAttack: (discardId?: string) => void;
  onCancel: () => void;
}

/** 【콤보】 패 1장을 버리면 데미지 +1. 버리지 않고 공격할 수도 있다 */
export const ComboDiscardModal: React.FC<ComboDiscardModalProps> = ({ card, candidates, onAttack, onCancel }) => (
  <div data-combo-discard-modal className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs select-none">
    <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[#0b0f19] border border-[#f97316]/50 p-4 sm:p-5 flex flex-col gap-3 shadow-2xl">
      <div>
        <h3 className="text-lg sm:text-xl font-black text-white">{card.nameKr} — 버릴 패 선택</h3>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          【콤보】 패 1장을 버리면 이 카드의 데미지가 +1 됩니다. 버리지 않고 공격할 수도 있습니다.
        </p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onAttack(c.id)}
            className="flex flex-col gap-1 border border-white/10 hover:border-[#f97316] bg-[#111520] p-1.5 text-left cursor-pointer transition"
            title={`[${c.nameKr}] 버리고 데미지 +1`}
          >
            <img src={c.artUrl} alt={c.nameKr} className="w-full aspect-[5/7] object-cover" />
            <span className="text-[11px] sm:text-xs font-bold text-white truncate">{c.nameKr}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 min-h-[44px] text-sm font-bold text-slate-300 border border-white/15 bg-[#111520] hover:bg-[#161c2b] cursor-pointer"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => onAttack()}
          className="px-4 py-2 min-h-[44px] text-sm font-black text-slate-950 bg-[#f97316] hover:bg-[#fb923c] cursor-pointer"
        >
          버리지 않고 공격
        </button>
      </div>
    </div>
  </div>
);
