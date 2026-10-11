import React from 'react';
import { CharacterCard } from '../types/tcg';
import { Layers, X, Sparkles, ChevronRight, CheckCircle2, Shield, Swords, Zap } from 'lucide-react';

interface EvolutionTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterCard | null;
}

export const EvolutionTreeModal: React.FC<EvolutionTreeModalProps> = ({
  isOpen,
  onClose,
  character,
}) => {
  if (!isOpen || !character) return null;

  // 하위 스택 카드들과 현재 카드를 레벨 오름차순(Lv.0 -> Lv.1 -> Lv.2)으로 정렬
  const underlying = character.underlyingCards || [];
  const allCards: CharacterCard[] = [...underlying, character].sort(
    (a, b) => (a.level ?? 0) - (b.level ?? 0)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-7 shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col gap-4 max-h-[94vh] overflow-y-auto custom-scrollbar">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-600/30 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {character.characterName || character.nameKr} 진화 계보 & 상속 스킬
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 font-mono font-bold">
                  총 {allCards.length}개 스택
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">
                현재 필드 활성: <strong className="text-amber-400">Lv.{character.level} {character.nameKr}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 공식 룰 안내 배너 */}
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-100 flex items-start gap-2.5 leading-relaxed shadow-inner">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300">공식 룰 규정:</strong> 캐릭터가 레벨업(진화)하면 이전에 겹쳐진{' '}
            <strong className="text-white">하위 레벨 카드의 모든 효과와 스킬을 영구 상속하여 함께 보유</strong>합니다. 아래에 나열된 모든 스킬이 현재 활성화되어 적용 중입니다.
          </div>
        </div>

        {/* 진화 계보 카드 리스트 (Lv.0 ➔ Lv.1 ➔ Lv.2) */}
        <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 py-2">
          {allCards.map((card, idx) => {
            const isCurrentTop = card.id === character.id;
            const isUnderlying = !isCurrentTop;

            return (
              <React.Fragment key={card.id || `${card.code}-${idx}`}>
                {idx > 0 && (
                  <div className="hidden md:flex items-center justify-center text-amber-400/60 shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-mono font-bold text-amber-500/80">진화</span>
                      <ChevronRight className="w-6 h-6 stroke-[3] text-amber-400 animate-pulse" />
                    </div>
                  </div>
                )}

                <div
                  className={`flex-1 rounded-2xl border-2 p-3.5 flex flex-col gap-3 transition-all duration-200 select-none ${
                    isCurrentTop
                      ? 'bg-slate-900/90 border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-950/80 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  {/* 카드 헤더 배지 */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 shadow ${
                        isCurrentTop
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      <span>Lv.{card.level}</span>
                      <span>{card.level === 0 ? '기본' : card.level === 1 ? '진화' : '각성'}</span>
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isCurrentTop
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-500/30 flex items-center gap-1'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isCurrentTop ? '현재 본체' : '상속 스킬 보유 중'}</span>
                    </span>
                  </div>

                  {/* 카드 일러스트 이미지 */}
                  <div className="relative w-full aspect-[5/7] max-h-56 mx-auto rounded-xl overflow-hidden border border-slate-700 shadow-md group">
                    <img
                      src={card.artUrl}
                      alt={card.nameKr}
                      className="w-full h-full object-cover transition transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold text-slate-200 border border-slate-700">
                      {card.code}
                    </div>
                  </div>

                  {/* 카드 명칭 및 속성 */}
                  <div>
                    <h3 className="text-base font-black text-white truncate">{card.nameKr}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="text-cyan-400 font-bold">속성: {card.element}</span>
                      {card.characterName && (
                        <span>공명자: <strong className="text-slate-300">{card.characterName}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* 효과 텍스트 박스 */}
                  <div className="flex-1 bg-slate-950/90 rounded-xl p-3 border border-slate-800/80 flex flex-col gap-1.5 min-h-[90px]">
                    <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Lv.{card.level} 보유 효과 원문</span>
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-medium overflow-y-auto max-h-[120px] custom-scrollbar pr-1">
                      {card.description}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* 하단 닫기 버튼 */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
