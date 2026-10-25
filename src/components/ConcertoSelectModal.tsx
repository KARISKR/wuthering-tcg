import React, { useState, useEffect } from 'react';
import { ActionCard } from '../types/tcg';
import { BatteryCharging, Check, X, Sparkles, Eye, EyeOff } from 'lucide-react';

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
  const [isFieldPeek, setIsFieldPeek] = useState(false);

  // 모달이 열릴 때 초기화 (기본적으로 첫번째 requiredCost 장을 자동 선택해두어 편의성 제공)
  useEffect(() => {
    if (isOpen && concertoCards.length >= requiredCost) {
      setSelectedIds(concertoCards.slice(0, requiredCost).map((c) => c.id));
      setIsFieldPeek(false);
    } else {
      setSelectedIds([]);
      setIsFieldPeek(false);
    }
  }, [isOpen, concertoCards, requiredCost]);

  if (!isOpen || !targetCard) return null;

  if (isFieldPeek) {
    return (
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-top-4 select-none">
        <button
          type="button"
          onClick={() => setIsFieldPeek(false)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0c101b]/95 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.7)] text-xs sm:text-sm font-black transition cursor-pointer hover:bg-cyan-950/80 hover:scale-105 active:scale-95 animate-pulse"
        >
          <EyeOff className="w-4 h-4 text-cyan-300" />
          <span>필드 상황 확인 중 · 협주 선택창 복귀 (클릭)</span>
        </button>
      </div>
    );
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-2xl bg-[#0c101b]/98 border border-[#f97316]/80 p-6 shadow-[0_0_80px_rgba(0,0,0,0.95),0_0_25px_rgba(249,115,22,0.3)] flex flex-col gap-4 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* 네 모서리 명조 택티컬 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
        <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

        {/* 우측 상단 액션 버튼 그룹 */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFieldPeek(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
            title="모달을 잠시 접어두고 필드 상황을 확인합니다"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>필드 확인</span>
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-[#111520] hover:bg-[#1a2234] text-slate-300 hover:text-white border border-white/15 flex items-center justify-center transition cursor-pointer [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 헤더 */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-12 h-12 bg-[#111520] border border-[#f97316]/50 flex items-center justify-center text-[#f97316] shadow [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]">
            <BatteryCharging className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 pr-8">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">협주 게이지 소모 선택</h2>
              <span className="text-xs px-2.5 py-0.5 bg-[#141a29] text-[#f97316] border border-[#f97316]/40 font-mono font-bold [clip-path:polygon(3px_0,100%_0,100%_calc(100%-3px),calc(100%-3px)_100%,0_100%,0_3px)]">
                {actionType === 'CLASH' ? '대결 카드 세트' : '연격 연속 공격'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              <strong className="text-[#f97316]">[{targetCard.nameKr}]</strong>{' '}
              사용에 필요한 협주 카드 <strong className="text-cyan-300 font-mono text-sm">{requiredCost}장</strong>을 직접 선택하여 트래시(묘지)로 보냅니다.
            </p>
          </div>
        </div>

        {/* 선택 카운터 안내 바 */}
        <div className="flex items-center justify-between bg-[#111624] border border-[#f97316]/30 px-4 py-2">
          <span className="text-xs text-slate-300 font-bold">소모할 협주 카드 선택</span>
          <span className={`text-xs font-mono font-black px-2.5 py-0.5 border ${
            isReady
              ? 'bg-[#f97316] text-white border-[#fb923c] shadow-[0_0_10px_rgba(249,115,22,0.5)]'
              : 'bg-[#1a2235] text-amber-300 border-amber-500/30'
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
                  key={`${card.id}-${idx}`}
                  onClick={() => toggleSelect(card.id)}
                  className={`relative aspect-[5/7] overflow-hidden border-2 cursor-pointer transition transform hover:scale-105 group select-none ${
                    isSelected
                      ? 'border-[#f97316] ring-2 ring-[#f97316]/80 shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                      : 'border-white/10 hover:border-slate-500 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={card.artUrl}
                    alt={card.nameKr}
                    className="w-full h-full object-contain bg-slate-950"
                  />

                  {/* 인덱스 뱃지 */}
                  <div className="absolute top-1 left-1 bg-black/80 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-300 border border-white/10">
                    #{idx + 1}
                  </div>

                  {/* 선택 표시 체크마크 */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[#f97316]/20 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-[#f97316] text-white flex items-center justify-center font-black shadow-lg animate-in zoom-in-75">
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
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-300 bg-[#111520] hover:bg-[#1a2234] hover:text-white border border-white/15 transition cursor-pointer [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]"
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
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black shadow-lg transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
              isReady
                ? 'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white hover:brightness-110 shadow-[0_0_20px_rgba(249,115,22,0.4)]'
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
