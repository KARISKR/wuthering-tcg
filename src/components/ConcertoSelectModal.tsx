import React, { useState, useEffect } from 'react';
import { ActionCard } from '../types/tcg';
import { BatteryCharging, Check, X, Sparkles } from 'lucide-react';

interface ConcertoSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  concertoCards: ActionCard[];
  requiredCost: number;
  targetCard: ActionCard | null;
  actionType: 'CLASH' | 'COMBO';
  onConfirm: (selectedConcertoIds: string[]) => void;
}

export const ConcertoSelectModal: React.FC<ConcertoSelectModalProps> = ({
  isOpen,
  onClose,
  concertoCards,
  requiredCost,
  targetCard,
  actionType,
  onConfirm,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 모달이 열릴 때 초기화 (기본적으로 첫번째 requiredCost 장을 자동 선택해두어 편의성 제공)
  useEffect(() => {
    if (isOpen && concertoCards.length >= requiredCost) {
      setSelectedIds(concertoCards.slice(0, requiredCost).map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  }, [isOpen, concertoCards, requiredCost]);

  if (!isOpen || !targetCard) return null;

  const toggleSelect = (cardId: string) => {
    if (selectedIds.includes(cardId)) {
      setSelectedIds(selectedIds.filter((id) => id !== cardId));
    } else {
      if (selectedIds.length < requiredCost) {
        setSelectedIds([...selectedIds, cardId]);
      } else {
        // 이미 꽉 찬 경우 가장 먼저 선택했던 것을 빼고 새것을 추가
        setSelectedIds([...selectedIds.slice(1), cardId]);
      }
    }
  };

  const isReady = selectedIds.length === requiredCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-cyan-500/50 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 헤더 */}
        <div className="flex items-center gap-3 border-b border-cyan-500/20 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow">
            <BatteryCharging className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>협주 게이지 소모 선택</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                {actionType === 'CLASH' ? '대결 카드 세트' : '연격 연속 공격'}
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              <strong className="text-amber-300">[{targetCard.nameKr}]</strong>{' '}
              사용에 필요한 협주 카드 <strong className="text-cyan-300 font-mono text-sm">{requiredCost}장</strong>을 직접 선택하여 드롭(묘지)으로 보냅니다.
            </p>
          </div>
        </div>

        {/* 선택 카운터 안내 */}
        <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2">
          <span className="text-xs text-slate-400 font-bold">소모할 협주 카드 선택</span>
          <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
            isReady ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-amber-300'
          }`}>
            선택: {selectedIds.length} / {requiredCost}장
          </span>
        </div>

        {/* 협주 카드 목록 그리드 */}
        <div className="max-h-[340px] overflow-y-auto custom-scrollbar p-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {concertoCards.map((card, idx) => {
              const isSelected = selectedIds.includes(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => toggleSelect(card.id)}
                  className={`relative aspect-[5/7] rounded-xl overflow-hidden border-2 cursor-pointer transition transform hover:scale-105 group select-none ${
                    isSelected
                      ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                      : 'border-slate-700/80 hover:border-slate-500 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={card.artUrl}
                    alt={card.nameKr}
                    className="w-full h-full object-cover"
                  />

                  {/* 인덱스 뱃지 */}
                  <div className="absolute top-1 left-1 bg-black/70 rounded px-1 text-[10px] font-mono font-bold text-slate-300">
                    #{idx + 1}
                  </div>

                  {/* 선택 표시 체크마크 */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-cyan-950/40 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-black shadow-lg animate-in zoom-in-75">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                    </div>
                  )}

                  {/* 하단 이름 */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-1">
                    <span className="text-[10px] font-black text-white truncate block text-center">
                      {card.nameKr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (isReady) {
                onConfirm(selectedIds);
                onClose();
              }
            }}
            disabled={!isReady}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition cursor-pointer ${
              isReady
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 text-slate-950 hover:brightness-110 shadow-cyan-500/25'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>협주 {requiredCost}장 소모하고 {actionType === 'CLASH' ? '세트' : '공격'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
