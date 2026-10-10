import React, { useState } from 'react';
import { PendingChoice } from '../types/tcg';
import { Sparkles, Check, CheckCircle2, ChevronRight, Eye } from 'lucide-react';

interface EffectChoiceModalProps {
  choice: PendingChoice | null | undefined;
  onResolve: (chosenCardIds: string[]) => void;
}

export const EffectChoiceModal: React.FC<EffectChoiceModalProps> = ({ choice, onResolve }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!choice) return null;

  const toggleSelect = (cardId: string) => {
    if (selectedIds.includes(cardId)) {
      setSelectedIds(selectedIds.filter((id) => id !== cardId));
    } else {
      if (selectedIds.length < choice.maxSelect) {
        setSelectedIds([...selectedIds, cardId]);
      } else {
        // 최대 수량에 도달했을 경우 안내 또는 교체
        if (choice.maxSelect === 1) {
          setSelectedIds([cardId]);
        }
      }
    }
  };

  const selectAll = () => {
    setSelectedIds(choice.revealedCards.slice(0, choice.maxSelect).map((c) => c.id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
        {/* 헤더 */}
        <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-600/30 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">{choice.title}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                선택 발동
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              출처: <strong className="text-amber-300">{choice.sourceCardName}</strong>
            </p>
          </div>
        </div>

        {/* 효과 설명 */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-100 leading-relaxed">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
            <Eye className="w-4 h-4" />
            <span>덱 위의 카드 {choice.revealedCards.length}장이 공개되었습니다!</span>
          </div>
          <span>{choice.description}</span>
        </div>

        {/* 선택 카운터 & 단축 버튼 */}
        <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-bold">패에 추가할 카드 선택:</span>
            <span className="font-mono font-black text-amber-300 px-2 py-0.5 bg-slate-900 rounded border border-slate-700">
              {selectedIds.length} / 최대 {choice.maxSelect}장 (0장 선택 가능)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={selectAll}
              className="text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 rounded hover:bg-emerald-950/40 transition"
            >
              전체 선택 ({choice.maxSelect}장)
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={clearAll}
              className="text-slate-400 hover:text-slate-200 font-bold px-2 py-1 rounded hover:bg-slate-800 transition"
            >
              선택 초기화 (0장)
            </button>
          </div>
        </div>

        {/* 공개된 카드 리스트 */}
        <div className="flex items-center justify-center gap-4 py-2">
          {choice.revealedCards.map((card, idx) => {
            const isSelected = selectedIds.includes(card.id);
            return (
              <div
                key={card.id}
                onClick={() => toggleSelect(card.id)}
                className={`relative w-44 aspect-[5/7] rounded-2xl overflow-hidden border-2 cursor-pointer transition transform hover:scale-105 select-none shadow-xl ${
                  isSelected
                    ? 'border-emerald-400 ring-4 ring-emerald-400/50 shadow-[0_0_25px_rgba(52,211,153,0.6)]'
                    : 'border-slate-700 opacity-75 hover:opacity-100 hover:border-slate-500'
                }`}
              >
                <img
                  src={card.artUrl}
                  alt={card.nameKr}
                  className="w-full h-full object-cover"
                />

                {/* 공개 순서 라벨 */}
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-slate-200 border border-slate-700">
                  공개 #{idx + 1}
                </div>

                {/* 선택 상태 오버레이 */}
                {isSelected && (
                  <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl animate-in zoom-in-75">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                  </div>
                )}

                {/* 카드 정보 하단 배너 */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 text-left">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-black text-white truncate">{card.nameKr}</span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                        card.color === 'RED'
                          ? 'bg-red-950 text-red-300'
                          : card.color === 'GREEN'
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-cyan-950 text-cyan-300'
                      }`}
                    >
                      {card.color}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                    <span>비용: {card.cost}</span>
                    <span>피해: {card.damage}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 확인 버튼들 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={() => onResolve([])}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 transition"
          >
            패에 추가하지 않고 넘어가기 (0장)
          </button>

          <button
            onClick={() => onResolve(selectedIds)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>선택한 {selectedIds.length}장 패에 추가</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
