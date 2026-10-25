import React, { useState, useEffect } from 'react';
import { CharacterCard } from '../types/tcg';
import {
  Layers,
  X,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatEffectText } from '../utils/formatEffectText';

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
  const [isFieldPeek, setIsFieldPeek] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsFieldPeek(false);
    }
  }, [isOpen]);

  if (!isOpen || !character) return null;

  if (isFieldPeek) {
    return (
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-top-4 select-none">
        <button
          type="button"
          onClick={() => setIsFieldPeek(false)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0c101b]/95 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.7)] text-xs sm:text-sm font-black transition cursor-pointer hover:bg-cyan-950/80 hover:scale-105 active:scale-95 animate-pulse"
        >
          <EyeOff className="w-4 h-4 text-cyan-300" />
          <span>필드 상황 확인 중 · 진화 계보 팝업 복귀 (클릭)</span>
        </button>
      </div>
    );
  }

  // 하위 스택 카드들과 현재 카드를 레벨 및 겹침 순서(Lv.0 -> Lv.1 -> Lv.2)로 정렬
  const underlying = character.underlyingCards || [];
  const allCards: CharacterCard[] = [...underlying, character].sort(
    (a, b) => (a.level ?? 0) - (b.level ?? 0)
  );

  const getElementBadge = (element: CharacterCard['element']) => {
    switch (element) {
      case 'SPECTRO':
      case '회절':
        return {
          label: '회절 (빛)',
          style: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
        };
      case 'HAVOC':
      case '인멸':
        return {
          label: '인멸 (어둠)',
          style: 'bg-purple-500/20 text-purple-300 border-purple-400/50',
        };
      case 'AERO':
      case '기류':
        return {
          label: '기류 (바람)',
          style: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
        };
      case 'FUSION':
      case '용융':
        return {
          label: '용융 (화염)',
          style: 'bg-red-500/20 text-red-300 border-red-400/50',
        };
      case 'GLACIO':
      case '응결':
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

  const elemInfo = getElementBadge(character.element);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-[#0c101b]/95 backdrop-blur-md border border-[#f97316]/60 p-5 sm:p-7 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col gap-5 max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        {/* 네 모서리 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
        <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-[#111520] border border-[#f97316]/40 flex items-center justify-center text-[#f97316] shadow">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {character.characterName || character.nameKr} 진화 계보 & 누적 효과
                </h2>
                <span className="text-xs px-2.5 py-0.5 bg-[#111520] text-[#f97316] border border-[#f97316]/40 font-mono font-bold">
                  총 {allCards.length}장 겹침
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${elemInfo.style}`}>
                  {elemInfo.label}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                현재 대표 캐릭터:{' '}
                <strong className="text-[#f97316] font-black">
                  Lv.{character.level} {character.nameKr} ({character.code})
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFieldPeek(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs sm:text-sm font-bold transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
              title="모달을 잠시 접어두고 필드 상황을 확인합니다"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>필드 확인</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-[#111520] hover:bg-[#1a2234] text-slate-400 hover:text-white border border-white/15 transition cursor-pointer"
              title="닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ============================================================
            1. 상단: 레벨업 계보 카드 일러스트 가로 나열 (찌그러짐 방지 고정 폭)
           ============================================================ */}
        <div className="bg-[#111520]/90 border border-slate-800 rounded-2xl p-4 shadow-inner">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>레벨업 진화 계보 (카드 스택 순서)</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              하위 레벨부터 순서대로 겹쳐진 카드 목록입니다
            </span>
          </div>

          <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {allCards.map((card, idx) => {
              const isCurrentTop = card.id === character.id;
              return (
                <React.Fragment key={card.id || `${card.code}-top-${idx}`}>
                  {idx > 0 && (
                    <div className="flex flex-col items-center justify-center text-amber-400 shrink-0 px-0.5">
                      <ChevronRight className="w-6 h-6 stroke-[3] text-amber-400 animate-pulse" />
                    </div>
                  )}

                  <div
                    className={`w-32 sm:w-36 shrink-0 rounded-xl border-2 p-2 flex flex-col gap-1.5 transition-all select-none ${
                      isCurrentTop
                        ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
                        : 'bg-slate-950/90 border-slate-700/80 opacity-90'
                    }`}
                  >
                    {/* 레벨 & 상태 뱃지 */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-black ${
                          isCurrentTop
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        Lv.{card.level}
                      </span>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          isCurrentTop
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {isCurrentTop ? '현재 본체' : '상속 중'}
                      </span>
                    </div>

                    {/* 카드 일러스트 */}
                    <div className="relative w-full aspect-[5/7] rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                      <img
                        src={card.artUrl}
                        alt={card.nameKr}
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute bottom-1 left-1 bg-black/85 backdrop-blur-sm rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-200 border border-slate-700">
                        {card.code}
                      </div>
                    </div>

                    {/* 카드 이름 */}
                    <div className="text-center truncate text-xs sm:text-sm font-black text-white pt-0.5">
                      {card.nameKr}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ============================================================
            2. 하단: 가로형 누적 효과 텍스트 리스트 (파수인 Lv.0 어쩌구 / 파수인 Lv.1 어쩌구)
           ============================================================ */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>현재 적용 중인 누적 스킬 & 상속 효과 ({allCards.length}개)</span>
            </span>
            <span className="text-xs text-slate-400">
              공식 룰에 따라 하위 레벨 카드의 모든 효과를 함께 보유합니다
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {allCards.map((card, idx) => {
              const isCurrentTop = card.id === character.id;
              return (
                <div
                  key={card.id || `${card.code}-desc-${idx}`}
                  className={`w-full rounded-xl border p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-5 transition-all ${
                    isCurrentTop
                      ? 'bg-gradient-to-r from-amber-950/40 via-slate-900/95 to-slate-900/95 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'bg-slate-900/90 border-slate-700/80'
                  }`}
                >
                  {/* 좌측: 캐릭터명 + 레벨 + 카드코드 식별자 */}
                  <div className="flex items-center justify-between md:justify-start gap-2.5 md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 pb-2 md:pb-0 md:pr-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black shrink-0 ${
                          isCurrentTop
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'bg-slate-800 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        Lv.{card.level}
                      </span>
                      <div>
                        <div className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                          <span>{card.nameKr}</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-400">
                          [{card.code}]
                        </div>
                      </div>
                    </div>

                    <span
                      className={`md:ml-auto text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                        isCurrentTop
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                          : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isCurrentTop ? '본체' : '상속'}</span>
                    </span>
                  </div>

                  {/* 우측: 가로 전체 폭을 활용한 큼직한 효과 설명 텍스트 */}
                  <div className="flex-1 text-slate-100 leading-relaxed text-sm sm:text-base">
                    {card.description ? (
                      formatEffectText(card.description, 'md')
                    ) : (
                      <span className="text-slate-400 text-sm">보유 효과 없음</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 닫기 버튼 */}
        <div className="flex items-center justify-end pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-8 py-2.5 text-sm sm:text-base font-black bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white hover:brightness-110 shadow-[0_0_15px_rgba(249,115,22,0.3)] transition cursor-pointer [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
