import React, { useState, useEffect, useRef } from 'react';
import { ActionCard } from '../types/tcg';
import { RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface MulliganModalProps {
  hand: ActionCard[];
  deck?: ActionCard[];
  onConfirm: (discardIds: string[]) => void;
}

export const MulliganModal: React.FC<MulliganModalProps> = ({ hand, deck = [], onConfirm }) => {
  const [displayedHand, setDisplayedHand] = useState<ActionCard[]>(hand);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mulliganPhase, setMulliganPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());
  const [initialAnimActive, setInitialAnimActive] = useState<boolean>(true);
  const soundPlayedRef = useRef<boolean>(false);

  // 모달 마운트 시 초기 5장 샥! 샥! 샥! 샥! 샥! 딜링 사운드 1회 재생
  useEffect(() => {
    setDisplayedHand(hand);
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      soundEffects.playCardDealSequence(hand.length, 90);
    }
    const timer = setTimeout(() => {
      setInitialAnimActive(false);
    }, hand.length * 90 + 350);
    return () => clearTimeout(timer);
  }, [hand]);

  // 카드 클릭 토글 (딜링 애니메이션 중이라도 언제든 즉시 선택 가능)
  const toggleSelect = (id: string) => {
    if (mulliganPhase !== 'idle') return;

    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        soundEffects.playCardDraw(1.2);
        return prev.filter((item) => item !== id);
      } else {
        soundEffects.playCardDraw(0.9);
        return [...prev, id];
      }
    });
  };

  // 교체 확정 애니메이션 시퀀스
  const handleExecuteMulligan = () => {
    if (selectedIds.length === 0 || mulliganPhase !== 'idle') return;

    // 1단계: 선택된 카드들이 덱으로 샤악- 빠져나감 (Exiting)
    setMulliganPhase('exiting');
    soundEffects.playCardWhooshOut(1.0);
    if (selectedIds.length > 2) {
      setTimeout(() => soundEffects.playCardWhooshOut(1.2), 100);
    }

    // 2단계: 360ms 후 새 카드로 교체 및 등장 (Entering)
    setTimeout(() => {
      // 덱에서 현재 패에 없는 카드들을 우선 선발
      const currentHandIds = new Set(displayedHand.map((c) => c.id));
      const availableFromDeck = deck.filter((c) => !currentHandIds.has(c.id));
      let deckIdx = 0;

      const newlyAddedIds = new Set<string>();
      const nextHand = displayedHand.map((card) => {
        if (selectedIds.includes(card.id)) {
          const replacement = availableFromDeck[deckIdx];
          if (replacement) {
            deckIdx++;
            newlyAddedIds.add(replacement.id);
            return replacement;
          }
        }
        return card;
      });

      setDisplayedHand(nextHand);
      setNewCardIds(newlyAddedIds);
      setMulliganPhase('entering');

      // 새 카드 장수만큼 샥! 샥! 연속 사운드 재생
      soundEffects.playCardDealSequence(selectedIds.length, 90);

      // 3단계: 새 카드가 안착된 후 (550ms) 본 게임으로 전환
      setTimeout(() => {
        onConfirm(selectedIds);
      }, 550);
    }, 360);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-950/95 border-2 border-amber-500/70 rounded-3xl max-w-6xl xl:max-w-7xl w-full p-5 sm:p-7 md:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col items-center gap-3.5 text-slate-100 text-center max-h-[96vh] overflow-y-auto custom-scrollbar">
        {/* 상단 뱃지 */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-xs sm:text-sm uppercase tracking-wider border border-amber-500/50 shadow">
          <RefreshCw className={`w-4 h-4 text-amber-400 ${mulliganPhase !== 'idle' ? 'animate-spin' : ''}`} />
          <span>START PHASE MULLIGAN</span>
        </div>

        {/* 타이틀 및 가이드 */}
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wide flex items-center justify-center gap-2">
            <span>초기 패 교체 (멀리건)</span>
            {mulliganPhase === 'entering' && (
              <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
            )}
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed font-medium mt-1.5">
            시작 패 5장 중 교체할 카드를 클릭하여 선택하세요.<br className="hidden sm:inline" />
            선택된 카드는 덱 맨 아래로 돌아가고 새 카드를 뽑습니다 (1회 한정).
          </p>
        </div>

        {/* 5장 대형 카드 선택 영역 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 sm:gap-4 md:gap-5 w-full my-2">
          {displayedHand.map((card, idx) => {
            const isSelected = selectedIds.includes(card.id);
            const isNewCard = newCardIds.has(card.id);
            const isExiting = mulliganPhase === 'exiting' && isSelected;
            const isEntering = mulliganPhase === 'entering' && isNewCard;

            const colorClass =
              card.color === 'RED'
                ? 'border-red-500/70'
                : card.color === 'GREEN'
                ? 'border-emerald-500/70'
                : 'border-cyan-500/70';

            // 애니메이션 클래스 매핑
            let animClass = '';
            let animStyle: React.CSSProperties = {};

            if (isExiting) {
              animClass = 'animate-card-mulligan-exit pointer-events-none';
            } else if (isEntering) {
              animClass = 'animate-card-mulligan-enter ring-4 ring-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.6)]';
              animStyle = { animationDelay: `${idx * 70}ms` };
            } else if (initialAnimActive) {
              animClass = 'animate-card-deal';
              animStyle = { animationDelay: `${idx * 90}ms` };
            }

            return (
              <div
                key={`${card.id}-${idx}`}
                onClick={() => toggleSelect(card.id)}
                style={animStyle}
                className={`relative flex flex-col justify-between rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 p-2 sm:p-2.5 transition-all duration-200 select-none group shadow-xl ${animClass} ${
                  mulliganPhase !== 'idle' ? 'cursor-default pointer-events-none' : 'cursor-pointer'
                } ${
                  isSelected && mulliganPhase === 'idle'
                    ? 'border-amber-400 ring-4 ring-amber-400/60 -translate-y-3 shadow-[0_20px_35px_rgba(245,158,11,0.35)] bg-slate-900'
                    : isNewCard
                    ? 'border-amber-400 ring-2 ring-amber-300/80 bg-amber-950/20'
                    : `${colorClass} hover:-translate-y-2 hover:border-amber-400/80 hover:shadow-2xl`
                }`}
              >
                {/* 새로 뽑힌 카드 뱃지 */}
                {isNewCard && (
                  <div className="absolute -top-3 -right-2 z-20 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1 border border-amber-200 animate-bounce">
                    <Sparkles className="w-3 h-3 fill-slate-950" />
                    <span>NEW!</span>
                  </div>
                )}

                {/* 1. 실물 카드 일러스트 */}
                <div className="relative w-full aspect-[5/7] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group-hover:scale-[1.02] transition-transform duration-200">
                  <img
                    src={card.artUrl}
                    alt={card.nameKr}
                    className="w-full h-full object-contain drop-shadow-md pointer-events-none"
                  />

                  {/* 선택 시 오버레이 이펙트 */}
                  {isSelected && mulliganPhase === 'idle' && (
                    <div className="absolute inset-0 bg-amber-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 border-2 border-amber-400 rounded-xl transition-all pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/50 flex items-center justify-center animate-bounce">
                        <RefreshCw className="w-6 h-6 stroke-[3]" />
                      </div>
                      <span className="px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs sm:text-sm tracking-wider shadow-lg">
                        교체 대상
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. 하단 상세 정보 영역 */}
                <div className="w-full mt-2 sm:mt-2.5 px-1 flex flex-col gap-1.5 text-left pointer-events-none">
                  {/* 카드명 & 속성 배지 */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-black text-xs sm:text-sm md:text-base text-white truncate" title={card.nameKr}>
                      {card.nameKr}
                    </span>
                    <span
                      className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md shrink-0 ${
                        card.color === 'RED'
                          ? 'bg-red-950 text-red-300 border border-red-500/50'
                          : card.color === 'GREEN'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                      }`}
                    >
                      {card.color}
                    </span>
                  </div>

                  {/* 스탯 바 */}
                  <div className="grid grid-cols-3 gap-1 text-center bg-slate-950/90 p-1.5 rounded-xl border border-slate-800/80 font-mono">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold">비용</span>
                      <strong className="text-xs sm:text-sm text-amber-300 font-black">{card.cost}</strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold">속도</span>
                      <strong className="text-xs sm:text-sm text-amber-200 font-black">{card.speed ?? '-'}</strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold">피해</span>
                      <strong className="text-xs sm:text-sm text-red-400 font-black">{card.damage}</strong>
                    </div>
                  </div>

                  {/* 카드 효과 텍스트 */}
                  {card.description && (
                    <p className="text-[11px] sm:text-xs text-slate-300 leading-snug line-clamp-2 font-medium">
                      {card.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 조작 가이드 안내문 */}
        <div className="text-xs sm:text-sm font-semibold text-slate-400">
          {mulliganPhase === 'exiting' ? (
            <span className="text-amber-400 font-bold animate-pulse">선택한 카드를 덱으로 반환하는 중...</span>
          ) : mulliganPhase === 'entering' ? (
            <span className="text-amber-300 font-bold animate-pulse">덱에서 새로운 카드를 드로우했습니다!</span>
          ) : selectedIds.length === 0 ? (
            <span>선택된 카드가 없습니다. <span className="text-slate-300">[패 유지]</span>로 현재 패를 그대로 시작할 수 있습니다.</span>
          ) : (
            <span className="text-amber-300 font-bold">
              총 {selectedIds.length}장의 카드가 교체 대상으로 선택되었습니다.
            </span>
          )}
        </div>

        {/* 하단 버튼 영역 */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 mt-1 w-full sm:w-auto">
          <button
            onClick={() => onConfirm([])}
            disabled={mulliganPhase !== 'idle'}
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 font-extrabold text-sm sm:text-base text-slate-200 transition cursor-pointer shadow-lg hover:border-slate-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            교체 없이 시작 (패 유지)
          </button>
          <button
            onClick={handleExecuteMulligan}
            disabled={selectedIds.length === 0 || mulliganPhase !== 'idle'}
            className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 sm:px-10 py-3.5 rounded-xl font-black text-sm sm:text-base shadow-2xl transition cursor-pointer ${
              selectedIds.length > 0 && mulliganPhase === 'idle'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/40 border border-amber-300 animate-pulse transform hover:scale-[1.02] active:scale-95'
                : 'bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {mulliganPhase === 'idle'
                ? `선택한 ${selectedIds.length}장 교체하고 시작`
                : '교체 진행 중...'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
