import React, { useState } from 'react';
import { CharacterCard, ActionCard } from '../types/tcg';
import { ChevronUp, X, Sparkles, AlertCircle, Trash2 } from 'lucide-react';

interface UpgradeModalProps {
  currentSlotName: 'leader' | 'leftSupport' | 'rightSupport';
  currentChar: CharacterCard;
  availableUpgrades: CharacterCard[];
  hand: ActionCard[];
  requiredDiscardCount: number;
  onUpgrade: (upgradeCardId: string, discardCardIds: string[]) => void;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  currentChar,
  availableUpgrades,
  hand,
  requiredDiscardCount,
  onUpgrade,
  onClose,
}) => {
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string | null>(
    availableUpgrades.length > 0 ? availableUpgrades[0].id : null
  );
  const [selectedDiscardIds, setSelectedDiscardIds] = useState<string[]>([]);

  const toggleDiscardCard = (cardId: string) => {
    if (selectedDiscardIds.includes(cardId)) {
      setSelectedDiscardIds(selectedDiscardIds.filter((id) => id !== cardId));
    } else {
      if (selectedDiscardIds.length < requiredDiscardCount) {
        setSelectedDiscardIds([...selectedDiscardIds, cardId]);
      }
    }
  };

  const canConfirm =
    selectedUpgradeId !== null &&
    selectedDiscardIds.length === requiredDiscardCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-950/95 border-2 border-amber-500/70 rounded-3xl max-w-5xl xl:max-w-6xl w-full p-5 sm:p-7 md:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col gap-4 sm:gap-5 text-slate-100 max-h-[96vh] overflow-y-auto custom-scrollbar">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-xl sm:text-2xl text-white flex items-center gap-2">
                <span>캐릭터 진화 (레벨업)</span>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  LEVEL UP
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                현재 [<strong className="text-amber-300">Lv.{currentChar.level} {currentChar.characterName}</strong>]을(를) 상위 레벨로 진화시킵니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1단계: 진화할 상위 캐릭터 선택 */}
        <div className="bg-slate-900/60 rounded-2xl p-3.5 sm:p-4 border border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow">
                1
              </span>
              <span className="text-sm sm:text-base font-black text-amber-300">
                1단계: 진화할 캐릭터 카드 선택 (캐릭터 덱)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              후보 {availableUpgrades.length}장
            </span>
          </div>

          {availableUpgrades.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 text-center text-xs sm:text-sm text-slate-400 flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>캐릭터 덱에 진화 가능한 다음 레벨 카드가 없습니다.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4 w-full">
              {availableUpgrades.map((up) => {
                const isSelected = selectedUpgradeId === up.id;
                return (
                  <div
                    key={up.id}
                    onClick={() => setSelectedUpgradeId(up.id)}
                    className={`flex flex-col justify-between rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 p-2 sm:p-2.5 transition-all duration-200 cursor-pointer select-none group shadow-lg ${
                      isSelected
                        ? 'border-amber-400 ring-4 ring-amber-400/60 -translate-y-2 shadow-[0_15px_30px_rgba(245,158,11,0.35)] bg-slate-900'
                        : 'border-slate-800 hover:border-amber-400/70 hover:-translate-y-1'
                    }`}
                  >
                    {/* 카드 일러스트 */}
                    <div className="relative w-full aspect-[5/7] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group-hover:scale-[1.02] transition-transform duration-200">
                      <img
                        src={up.artUrl}
                        alt={up.nameKr}
                        className="w-full h-full object-contain drop-shadow"
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1 animate-pulse">
                          <Sparkles className="w-3.5 h-3.5" /> 선택됨
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-xs shadow">
                        Lv.{up.level}
                      </div>
                    </div>

                    {/* 카드 정보 */}
                    <div className="w-full mt-2 px-1 flex flex-col gap-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs sm:text-sm text-white truncate" title={up.nameKr}>
                          {up.nameKr}
                        </span>
                        <span className="text-[10px] sm:text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                          {up.element}
                        </span>
                      </div>
                      {up.description && (
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                          {up.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2단계: 버릴 패 선택 */}
        <div className="bg-slate-900/60 rounded-2xl p-3.5 sm:p-4 border border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow">
                2
              </span>
              <span className="text-sm sm:text-base font-black text-amber-300">
                2단계: 소비할 패 선택 ({selectedDiscardIds.length} / {requiredDiscardCount}장 선택됨)
              </span>
            </div>
            <span className="text-xs font-bold text-rose-300 bg-rose-950/60 px-3 py-1 rounded-full border border-rose-500/40 shrink-0">
              Lv.{currentChar.level + 1} 레벨업 비용: 패 {requiredDiscardCount}장 버리기
            </span>
          </div>

          <div className="flex items-stretch gap-3 sm:gap-3.5 overflow-x-auto pb-3 custom-scrollbar min-h-[220px]">
            {hand.map((card) => {
              const isSelected = selectedDiscardIds.includes(card.id);
              const colorClass =
                card.color === 'RED'
                  ? 'border-red-500/70'
                  : card.color === 'GREEN'
                  ? 'border-emerald-500/70'
                  : 'border-cyan-500/70';

              return (
                <div
                  key={card.id}
                  onClick={() => toggleDiscardCard(card.id)}
                  className={`w-36 sm:w-40 md:w-44 shrink-0 flex flex-col justify-between rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 p-2 transition-all duration-200 cursor-pointer select-none group shadow-lg ${
                    isSelected
                      ? 'border-rose-500 ring-4 ring-rose-500/50 -translate-y-2 shadow-[0_15px_30px_rgba(244,63,94,0.35)] bg-slate-900'
                      : `${colorClass} hover:-translate-y-1 hover:border-amber-400/70`
                  }`}
                >
                  {/* 카드 일러스트 */}
                  <div className="relative w-full aspect-[5/7] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group-hover:scale-[1.02] transition-transform duration-200">
                    <img
                      src={card.artUrl}
                      alt={card.nameKr}
                      className="w-full h-full object-contain drop-shadow"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-rose-950/75 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 border-2 border-rose-500 rounded-xl transition-all">
                        <Trash2 className="w-6 h-6 text-rose-400 animate-bounce" />
                        <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-black text-xs shadow-lg">
                          버릴 카드
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 카드 정보 */}
                  <div className="w-full mt-2 px-1 flex flex-col gap-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs sm:text-sm text-white truncate" title={card.nameKr}>
                        {card.nameKr}
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        card.color === 'RED'
                          ? 'bg-red-950 text-red-300 border border-red-500/40'
                          : card.color === 'GREEN'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                      }`}>
                        {card.color}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 bg-slate-950/80 p-1 rounded-lg">
                      <span>비용 <strong className="text-amber-300">{card.cost}</strong></span>
                      <span>피해 <strong className="text-red-400">{card.damage}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 푸터 버튼 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 pt-3">
          <div className="text-xs sm:text-sm text-slate-400 font-semibold">
            {!selectedUpgradeId ? (
              <span>진화할 캐릭터 카드를 선택해주세요.</span>
            ) : selectedDiscardIds.length < requiredDiscardCount ? (
              <span className="text-amber-300">
                비용으로 버릴 패를 {requiredDiscardCount - selectedDiscardIds.length}장 더 선택해주세요.
              </span>
            ) : (
              <span className="text-emerald-300 font-bold">
                ✓ 진화 준비 완료! 아래 [레벨업 확정]을 클릭하세요.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer border border-slate-800"
            >
              취소
            </button>
            <button
              onClick={() => {
                if (selectedUpgradeId && canConfirm) {
                  onUpgrade(selectedUpgradeId, selectedDiscardIds);
                }
              }}
              disabled={!canConfirm}
              className={`flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-xl transition cursor-pointer ${
                canConfirm
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/40 border border-amber-300 animate-pulse transform hover:scale-[1.02] active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
              }`}
            >
              <ChevronUp className="w-4 h-4 stroke-[3]" />
              <span>레벨업 확정</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
