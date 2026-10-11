import React, { useState } from 'react';
import { CharacterCard } from '../types/tcg';
import {
  Layers,
  X,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Zap,
  Maximize2,
  Info,
  Shield,
  Flame,
  Wind,
} from 'lucide-react';

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
  const [zoomCard, setZoomCard] = useState<CharacterCard | null>(null);

  if (!isOpen || !character) return null;

  // 하위 스택 카드들과 현재 카드를 레벨 오름차순(Lv.0 -> Lv.1 -> Lv.2)으로 정렬
  const underlying = character.underlyingCards || [];
  const allCards: CharacterCard[] = [...underlying, character].sort(
    (a, b) => (a.level ?? 0) - (b.level ?? 0)
  );

  const getElementBadge = (element: CharacterCard['element']) => {
    switch (element) {
      case 'SPECTRO':
        return {
          label: '회광 (빛)',
          style: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
        };
      case 'HAVOC':
        return {
          label: '인멸 (어둠)',
          style: 'bg-purple-500/20 text-purple-300 border-purple-400/50',
        };
      case 'AERO':
        return {
          label: '기류 (바람)',
          style: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
        };
      case 'FUSION':
        return {
          label: '용융 (화염)',
          style: 'bg-red-500/20 text-red-300 border-red-400/50',
        };
      case 'GLACIO':
        return {
          label: '응결 (얼음)',
          style: 'bg-sky-500/20 text-sky-300 border-sky-400/50',
        };
      default:
        return {
          label: String(element),
          style: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  // 텍스트 가독성 향상: [리더], [배틀], [판정] 등의 태그를 가독성 높은 뱃지로 렌더링
  const renderFormattedEffectText = (description: string) => {
    if (!description) return <span className="text-slate-400 text-sm">보유 효과 없음</span>;

    const parts = description.split(/(\[[^\]]+\])/g);
    return (
      <div className="leading-relaxed">
        {parts.map((part, i) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const tag = part.slice(1, -1);
            let tagStyle = 'bg-amber-500/25 text-amber-300 border-amber-400/60 font-black';
            if (tag.includes('배틀')) {
              tagStyle = 'bg-red-600/25 text-red-300 border-red-400/60 font-black';
            } else if (tag.includes('판정')) {
              tagStyle = 'bg-cyan-600/25 text-cyan-300 border-cyan-400/60 font-black';
            } else if (tag.includes('리더')) {
              tagStyle = 'bg-yellow-500/30 text-yellow-300 border-yellow-400/70 font-black shadow-sm';
            } else if (tag.includes('상시')) {
              tagStyle = 'bg-purple-600/25 text-purple-300 border-purple-400/60 font-black';
            } else if (tag.includes('기동') || tag.includes('추격')) {
              tagStyle = 'bg-emerald-600/25 text-emerald-300 border-emerald-400/60 font-black';
            }
            return (
              <span
                key={i}
                className={`inline-block text-xs sm:text-sm px-2 py-0.5 rounded-md border mr-1.5 mb-1 shadow-sm align-middle tracking-tight ${tagStyle}`}
              >
                {part}
              </span>
            );
          }
          return (
            <span
              key={i}
              className="text-slate-100 text-sm sm:text-base font-normal leading-relaxed align-middle"
            >
              {part}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-6xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-7 md:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col gap-5 max-h-[95vh] overflow-y-auto custom-scrollbar">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-600/30 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow">
                <Layers className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white">
                    {character.characterName || character.nameKr} 진화 계보 & 상속 스킬
                  </h2>
                  <span className="text-xs sm:text-sm px-3 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 font-mono font-bold shadow">
                    총 {allCards.length}개 스택
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                  현재 필드 활성 캐릭터:{' '}
                  <strong className="text-amber-400 font-black">
                    Lv.{character.level} {character.nameKr}
                  </strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 공식 룰 안내 배너 */}
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-xs sm:text-sm text-amber-100 flex items-start gap-3 leading-relaxed shadow-inner">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-black">공식 룰 규정:</strong> 캐릭터가 레벨업(진화)하면 이전에 겹쳐진{' '}
              <strong className="text-white underline decoration-amber-400 font-black">
                하위 레벨 카드의 모든 효과와 스킬을 영구 상속하여 함께 보유
              </strong>
              합니다. 아래에 나열된 모든 스킬이 현재 활성화되어 실시간 적용 중입니다.
            </div>
          </div>

          {/* 진화 계보 카드 리스트 (Lv.0 ➔ Lv.1 ➔ Lv.2) */}
          <div className="flex flex-col lg:flex-row items-stretch justify-center gap-5 py-2">
            {allCards.map((card, idx) => {
              const isCurrentTop = card.id === character.id;
              const elemInfo = getElementBadge(card.element);

              return (
                <React.Fragment key={card.id || `${card.code}-${idx}`}>
                  {idx > 0 && (
                    <div className="hidden lg:flex items-center justify-center text-amber-400/60 shrink-0">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          진화
                        </span>
                        <ChevronRight className="w-7 h-7 stroke-[3] text-amber-400 animate-pulse" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex-1 rounded-3xl border-2 p-4 sm:p-5 flex flex-col gap-4 transition-all duration-200 select-none shadow-xl ${
                      isCurrentTop
                        ? 'bg-slate-900/95 border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_35px_rgba(245,158,11,0.25)]'
                        : 'bg-slate-950/90 border-slate-700/80 hover:border-slate-500'
                    }`}
                  >
                    {/* 카드 헤더 배지 */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm font-black flex items-center gap-1.5 shadow ${
                          isCurrentTop
                            ? 'bg-amber-500 text-slate-950 shadow-amber-500/30'
                            : 'bg-slate-800 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        <span>Lv.{card.level}</span>
                        <span>{card.level === 0 ? '기본' : card.level === 1 ? '진화' : '각성'}</span>
                      </span>

                      <span
                        className={`text-xs sm:text-sm font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow ${
                          isCurrentTop
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                            : 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isCurrentTop ? '현재 본체' : '상속 스킬 보유 중'}</span>
                      </span>
                    </div>

                    {/* 카드 일러스트 이미지 (잘림 방지: portrait 비율 보존 및 object-contain) */}
                    <div
                      onClick={() => setZoomCard(card)}
                      className="relative w-full flex items-center justify-center p-3 rounded-2xl bg-black/60 border border-slate-800 shadow-inner group cursor-pointer"
                      title="클릭하여 실물 카드 전체 확대 보기"
                    >
                      <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[5/7] rounded-xl overflow-hidden shadow-2xl flex items-center justify-center bg-slate-950 border border-slate-700/80">
                        <img
                          src={card.artUrl}
                          alt={card.nameKr}
                          className="w-full h-full object-contain drop-shadow-2xl transition transform duration-300 group-hover:scale-105"
                        />
                        {/* 카드 고유 코드 뱃지 */}
                        <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-200 border border-slate-700 shadow">
                          {card.code}
                        </div>
                        {/* 확대 버튼 */}
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/85 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-amber-400 border border-amber-500/40 opacity-90 group-hover:opacity-100 transition shadow">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">확대</span>
                        </div>
                      </div>
                    </div>

                    {/* 카드 명칭 및 속성 */}
                    <div className="space-y-2">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-wide">
                        {card.nameKr}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg border shadow-sm ${elemInfo.style}`}
                        >
                          속성: {elemInfo.label}
                        </span>
                        {card.characterName && (
                          <span className="text-xs sm:text-sm font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                            공명자: <strong className="text-white">{card.characterName}</strong>
                          </span>
                        )}
                        {card.rarity && (
                          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-500/30">
                            {card.rarity}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 효과 텍스트 박스 (가독성 최적화: 2pt 상향 & 태그 뱃지화) */}
                    <div className="flex-1 bg-slate-950/95 rounded-2xl p-4 sm:p-5 border border-slate-800/90 flex flex-col gap-2.5 shadow-inner">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span>Lv.{card.level} 보유 효과 / 스킬 원문</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {isCurrentTop ? '본체 스킬' : '영구 상속 중'}
                        </span>
                      </div>
                      <div className="overflow-y-auto max-h-[160px] custom-scrollbar pr-1">
                        {renderFormattedEffectText(card.description)}
                      </div>
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
              className="px-8 py-3 rounded-xl text-sm sm:text-base font-black bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              확인 및 닫기
            </button>
          </div>
        </div>
      </div>

      {/* 실물 카드 전체 확대 라이트박스 뷰어 */}
      {zoomCard && (
        <div
          onClick={() => setZoomCard(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-950 border-2 border-amber-400/90 rounded-3xl p-5 sm:p-6 max-w-lg w-full flex flex-col items-center gap-4 shadow-2xl shadow-amber-500/20"
          >
            <button
              onClick={() => setZoomCard(null)}
              className="absolute top-3 right-3 p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 카드 실물 전체 이미지 */}
            <div className="max-h-[65vh] w-auto aspect-[5/7] flex items-center justify-center rounded-2xl overflow-hidden bg-black/40 border border-slate-800 shadow-2xl">
              <img
                src={zoomCard.artUrl}
                alt={zoomCard.nameKr}
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>

            {/* 카드 스펙 정보 */}
            <div className="w-full space-y-2 text-left">
              <div className="flex items-center justify-between">
                <h4 className="text-lg sm:text-xl font-black text-white">{zoomCard.nameKr}</h4>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  Lv.{zoomCard.level} {zoomCard.code}
                </span>
              </div>
              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800">
                {renderFormattedEffectText(zoomCard.description)}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
