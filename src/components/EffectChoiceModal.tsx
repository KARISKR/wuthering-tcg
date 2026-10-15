import React, { useState } from 'react';
import { PendingChoice } from '../types/tcg';
import { Sparkles, Check, CheckCircle2, ChevronRight, Eye } from 'lucide-react';

interface EffectChoiceModalProps {
  choice: PendingChoice | null | undefined;
  onResolve: (chosenCardIds: string[]) => void;
}

export const EffectChoiceModal: React.FC<EffectChoiceModalProps> = ({ choice, onResolve }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    setIsSubmitting(false);
    if (choice) {
      if (choice.maxSelect === 1 && choice.revealedCards.length === 1) {
        setSelectedIds([choice.revealedCards[0].id]);
      } else {
        setSelectedIds([]);
      }
    }
  }, [choice?.id]);

  if (!choice) return null;

  const toggleSelect = (cardId: string) => {
    if (choice.onResolveType === 'VIEW_ONLY') return;
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
    if (choice.onResolveType === 'VIEW_ONLY') return;
    setSelectedIds(choice.revealedCards.slice(0, choice.maxSelect).map((c) => c.id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const handleConfirm = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (choice.onResolveType === 'VIEW_ONLY') {
      onResolve([]);
    } else {
      const unique = Array.from(new Set(selectedIds)).slice(0, choice.maxSelect ?? 1);
      onResolve(unique);
    }
    // 더블 클릭 방지 및 자동 리셋 가드 (멈춤 방지)
    setTimeout(() => setIsSubmitting(false), 800);
  };

  const handleSkip = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onResolve([]);
    setTimeout(() => setIsSubmitting(false), 800);
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
            <span>
              {choice.onResolveType === 'VIEW_ONLY'
                ? `상대의 패 ${choice.revealedCards.length}장이 확인되었습니다.`
                : choice.onResolveType === 'SET_CONCERTO'
                ? `덱 위의 카드 ${choice.revealedCards.length}장이 확인되었습니다 (협주 에리어 배치 선택)`
                : choice.onResolveType === 'RECOVER_FROM_DROP'
                ? `트래시 에리어의 회수 대상 카드 ${choice.revealedCards.length}장 확인`
                : choice.onResolveType === 'DISCARD_FOR_DAMAGE'
                ? `버릴 수 있는 패 목록 (${choice.revealedCards.length}장)`
                : `덱 위의 카드 ${choice.revealedCards.length}장이 공개되었습니다!`}
            </span>
          </div>
          <span>{choice.description}</span>
        </div>

        {/* 선택 카운터 & 단축 버튼 (VIEW_ONLY가 아닐 때만 노출) */}
        {choice.onResolveType !== 'VIEW_ONLY' ? (
          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold">
                {choice.onResolveType === 'SET_CONCERTO'
                  ? '협주 에리어에 배치할 카드:'
                  : choice.onResolveType === 'RECOVER_FROM_DROP'
                  ? '패에 회수할 카드:'
                  : choice.onResolveType === 'DISCARD_FOR_DAMAGE'
                  ? '버릴 패:'
                  : '패에 추가할 카드 선택:'}
              </span>
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
        ) : (
          <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-800/60 rounded-xl px-4 py-2">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-cyan-400" />
              상대방이 보유하고 있는 패 카드입니다. 확인 후 [확인 완료] 버튼을 누르세요.
            </span>
            <span className="text-xs font-mono font-black text-cyan-200 bg-cyan-900/60 px-2.5 py-0.5 rounded border border-cyan-700">
              총 {choice.revealedCards.length}장
            </span>
          </div>
        )}

        {/* 공개된 카드 리스트 */}
        <div className="flex items-center justify-center gap-4 py-2 flex-wrap max-h-[50vh] overflow-y-auto">
          {choice.revealedCards.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm font-medium">
              확인할 카드가 없습니다.
            </div>
          ) : (
            choice.revealedCards.map((card, idx) => {
              const isSelected = selectedIds.includes(card.id);
              const isViewOnly = choice.onResolveType === 'VIEW_ONLY';
              return (
                <div
                  key={`${card.id}-${idx}`}
                  onClick={() => {
                    if (!isViewOnly) toggleSelect(card.id);
                  }}
                  className={`relative w-44 aspect-[5/7] rounded-2xl overflow-hidden border-2 transition transform select-none shadow-xl ${
                    isViewOnly
                      ? 'border-cyan-500/50 hover:border-cyan-400 cursor-default'
                      : isSelected
                      ? 'border-emerald-400 ring-4 ring-emerald-400/50 shadow-[0_0_25px_rgba(52,211,153,0.6)] cursor-pointer hover:scale-105'
                      : 'border-slate-700 opacity-75 hover:opacity-100 hover:border-slate-500 cursor-pointer hover:scale-105'
                  }`}
                >
                  <img
                    src={card.artUrl}
                    alt={card.nameKr}
                    className="w-full h-full object-cover"
                  />

                  {/* 공개 순서 라벨 */}
                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-slate-200 border border-slate-700">
                    {choice.onResolveType === 'VIEW_ONLY'
                      ? `상대 패 #${idx + 1}`
                      : choice.onResolveType === 'RECOVER_FROM_DROP'
                      ? '트래시'
                      : `공개 #${idx + 1}`}
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
            })
          )}
        </div>

        {/* 하단 확인 버튼들 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          {choice.onResolveType === 'VIEW_ONLY' ? (
            <div className="w-full flex justify-end">
              <button
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:brightness-110 shadow-lg shadow-cyan-500/25 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>확인 완료 (계속 진행)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <button
                disabled={isSubmitting}
                onClick={handleSkip}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 transition"
              >
                {choice.onResolveType === 'SET_CONCERTO'
                  ? '협주 에리어에 배치하지 않고 넘어가기 (덱 맨 위 유지)'
                  : choice.onResolveType === 'RECOVER_FROM_DROP'
                  ? '회수하지 않고 넘어가기'
                  : choice.onResolveType === 'DISCARD_FOR_DAMAGE'
                  ? '패를 버리지 않고 기본 피해로 공격'
                  : '패에 추가하지 않고 넘어가기 (0장)'}
              </button>

              <button
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {choice.onResolveType === 'SET_CONCERTO'
                    ? `선택한 ${selectedIds.length}장 협주 에리어에 배치`
                    : choice.onResolveType === 'RECOVER_FROM_DROP'
                    ? `선택한 ${selectedIds.length}장 패에 회수`
                    : choice.onResolveType === 'DISCARD_FOR_DAMAGE'
                    ? `선택한 패 버리기 (+1 데미지)`
                    : `선택한 ${selectedIds.length}장 패에 추가`}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
