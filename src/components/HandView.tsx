import React, { useState, useEffect, useRef } from 'react';
import { ActionCard, GamePhase } from '../types/tcg';
import { CardView } from './CardView';
import { BatteryCharging, Swords, Zap, Trash2, X, Sparkles } from 'lucide-react';
import { canLeaderUseCard } from '../engine/gameEngine';
import { soundEffects } from '../utils/soundEffects';

interface HandViewProps {
  hand: ActionCard[];
  concertoCount: number;
  leaderName: string;
  phase: GamePhase;
  isTurnPlayer: boolean;
  canChargeConcerto: boolean;
  canSetClashCard: boolean;
  isComboStep: boolean;
  selectedOverflowCardIds?: string[];
  onSelectOverflowCard?: (cardId: string) => void;
  onChargeConcerto: (cardId: string) => void;
  onSetClashCard: (cardId: string) => void;
  onComboAttack: (cardId: string) => void;
  comboCount?: number;
  onHover?: (card: ActionCard | null) => void;
}

export const HandView: React.FC<HandViewProps> = ({
  hand,
  concertoCount,
  leaderName,
  phase,
  isTurnPlayer,
  canChargeConcerto,
  canSetClashCard,
  isComboStep,
  selectedOverflowCardIds = [],
  onSelectOverflowCard,
  onChargeConcerto,
  onSetClashCard,
  onComboAttack,
  comboCount = 0,
  onHover,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // 새로 드로우된 카드 추적 및 드로우 애니메이션 활성화 상태
  const [animatingDrawIds, setAnimatingDrawIds] = useState<Set<string>>(new Set());
  const prevHandIdsRef = useRef<Set<string>>(new Set(hand.map((c) => c.id)));
  const isInitialMount = useRef(true);

  useEffect(() => {
    // 최초 렌더링(초기 세팅) 시에는 기본 표시
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevHandIdsRef.current = new Set(hand.map((c) => c.id));
      return;
    }

    const currentIds = new Set(hand.map((c) => c.id));
    const newCards = hand.filter((c) => !prevHandIdsRef.current.has(c.id));

    if (newCards.length > 0) {
      const newIds = new Set(newCards.map((c) => c.id));
      setAnimatingDrawIds(newIds);

      // 드로우 효과음 재생
      soundEffects.playCardPlace();

      // 700ms 후 애니메이션 종료
      const timer = setTimeout(() => {
        setAnimatingDrawIds(new Set());
      }, 700);

      prevHandIdsRef.current = currentIds;
      return () => clearTimeout(timer);
    }

    prevHandIdsRef.current = currentIds;
  }, [hand]);

  const selectedCard = hand.find((c) => c.id === selectedCardId);

  // 카드별 사용 가능 여부 판별
  const checkCardUsable = (card: ActionCard): { canPlayClash: boolean; canCombo: boolean; reason?: string } => {
    const hasEnoughCost = concertoCount >= card.cost;
    const meetsLeader = canLeaderUseCard({ characterName: leaderName, nameKr: leaderName } as any, card);

    const canPlayClash = canSetClashCard && hasEnoughCost && meetsLeader;
    const canCombo = isComboStep && comboCount > 0 && card.color === 'RED' && hasEnoughCost;

    let reason = '';
    if (!hasEnoughCost) reason = `비용 부족 (필요 ${card.cost}, 보유 ${concertoCount})`;
    else if (!meetsLeader) reason = `리더 [${card.characterExclusive}] 전용`;

    return { canPlayClash, canCombo, reason };
  };

  const isOverflowPhase = phase === 'DISCARD_OVERFLOW';

  return (
    <div className="relative w-full bg-slate-950/85 backdrop-blur-md border-t border-slate-800 px-4 py-2.5 flex flex-col items-center">
      {/* 상단 패 카운트 및 가이드 라벨 */}
      <div className="w-full flex items-center justify-between text-xs sm:text-sm text-slate-400 mb-2 max-w-6xl">
        <div className="flex items-center gap-2.5">
          <span className="font-black text-slate-100 text-sm sm:text-base">내 핸드 (손패)</span>
          <span className={`px-3 py-0.5 rounded-full font-mono font-black text-xs sm:text-sm ${
            hand.length > 8 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-200'
          }`}>
            {hand.length} / 8장
          </span>
          {isOverflowPhase && (
            <span className="text-red-400 text-xs sm:text-sm font-bold">
              ⚠️ 패 상한 초과! 버릴 카드를 {hand.length - 8}장 선택하세요.
            </span>
          )}
        </div>
        <div className="text-xs sm:text-sm text-slate-300 font-bold">
          {phase === 'CLASH_SET' && <span className="text-amber-400 font-black">⚔️ 대결에 낼 액션 카드를 선택하세요</span>}
          {phase === 'ACTION_PHASE' && <span className="text-cyan-400 font-bold">💡 패를 눌러 [협주 충전]을 할 수 있습니다</span>}
          {isComboStep && <span className="text-red-400 font-black">🔥 연격 기회! 남은 연격: {comboCount}회</span>}
        </div>
      </div>

      {/* 손패 카드 가로 리스트 (대형 일러스트 & 일러스트 안 내용 제거 & 하단 간단 정보 & 호버 시 왼쪽 마스터듀얼 상세 연동) */}
      <div className="flex items-center justify-center gap-3.5 overflow-x-auto max-w-full pb-2 px-4 py-1">
        {hand.length === 0 ? (
          <div className="py-8 text-slate-500 text-sm font-medium">패에 카드가 없습니다.</div>
        ) : (
          hand.map((card) => {
            const { canPlayClash, canCombo } = checkCardUsable(card);
            const isSelected = selectedCardId === card.id || selectedOverflowCardIds.includes(card.id);
            const isHighlighted = (canSetClashCard && canPlayClash) || (isComboStep && canCombo);

            const isNewlyDrawn = animatingDrawIds.has(card.id);
            const drawIndex = Array.from(animatingDrawIds).indexOf(card.id);
            const drawDelay = drawIndex >= 0 ? `${drawIndex * 110}ms` : '0ms';

            const colorBorder =
              card.color === 'RED'
                ? 'border-red-500/80 hover:border-red-400'
                : card.color === 'GREEN'
                ? 'border-emerald-500/80 hover:border-emerald-400'
                : 'border-cyan-500/80 hover:border-cyan-400';

            return (
              <div
                key={card.id}
                onMouseEnter={() => {
                  setHoveredCardId(card.id);
                  onHover?.(card);
                }}
                onMouseLeave={() => setHoveredCardId(null)}
                onClick={() => {
                  onHover?.(card);
                  if (isOverflowPhase) {
                    onSelectOverflowCard?.(card.id);
                  } else {
                    setSelectedCardId(selectedCardId === card.id ? null : card.id);
                  }
                }}
                style={isNewlyDrawn ? { animationDelay: drawDelay } : undefined}
                className={`relative w-32 sm:w-36 md:w-40 shrink-0 flex flex-col items-center rounded-2xl bg-slate-900 border-2 p-1.5 transition-all duration-200 cursor-pointer select-none group shadow-xl ${
                  isNewlyDrawn ? 'animate-card-draw z-30' : ''
                } ${
                  isSelected
                    ? 'border-amber-400 ring-4 ring-amber-400/60 -translate-y-5 shadow-amber-500/30 scale-105 z-20'
                    : isHighlighted
                    ? `${colorBorder} ring-2 ring-emerald-400/80 hover:-translate-y-4 hover:scale-105 hover:z-20 shadow-emerald-500/20`
                    : `${colorBorder} hover:-translate-y-4 hover:scale-105 hover:z-20`
                }`}
              >
                {/* 신규 드로우 시 카드 주변 골드/시안 링 번쩍임 이펙트 */}
                {isNewlyDrawn && (
                  <div
                    className="absolute -inset-2 rounded-3xl border-2 border-amber-400/90 pointer-events-none animate-draw-ring z-40"
                    style={{ animationDelay: drawDelay }}
                  />
                )}
                {/* 호버 시 손패 바로 위 플로팅 대형 상세 팝업 (시선 이동 없이 즉시 확인) */}
                {hoveredCardId === card.id && (
                  <div className="absolute bottom-[108%] left-1/2 -translate-x-1/2 z-50 pointer-events-none w-64 sm:w-72 bg-slate-950/95 border-2 border-amber-400 rounded-2xl p-3 shadow-2xl shadow-black/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-2">
                    <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <img src={card.artUrl} alt={card.nameKr} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white">{card.nameKr}</span>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          card.color === 'RED'
                            ? 'bg-red-950 text-red-300 border border-red-500/40'
                            : card.color === 'GREEN'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {card.color}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
                      <span>비용: <strong className="text-amber-300 font-black">{card.cost}</strong></span>
                      <span>속도: <strong className="text-amber-200 font-black">{card.speed ?? '-'}</strong></span>
                      <span>피해: <strong className="text-red-400 font-black">{card.damage}</strong></span>
                    </div>
                    {card.description && (
                      <p className="text-[11px] text-slate-200 leading-snug line-clamp-3 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80 font-medium">
                        {card.description}
                      </p>
                    )}
                  </div>
                )}

                {/* 1. 일러스트: 대형 & 일러스트 안엔 아무것도 넣지 않음 (순수 원본 일러스트) */}
                <div className="w-full aspect-[5/7] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                  <img
                    src={card.artUrl}
                    alt={card.nameKr}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* 2. 하단 간단 정보 영역 (일러스트 밖 하단에 배치) */}
                <div className="w-full mt-2 px-1 flex flex-col gap-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-white truncate group-hover:text-amber-300 transition">
                      {card.nameKr}
                    </span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        card.color === 'RED'
                          ? 'bg-red-950 text-red-300 border border-red-500/40'
                          : card.color === 'GREEN'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {card.color}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <span>비용: <strong className="text-amber-300 text-xs sm:text-sm font-black">{card.cost}</strong></span>
                    <span>속도: <strong className="text-amber-200 text-xs sm:text-sm font-black">{card.speed ?? '-'}</strong></span>
                    <span>피해: <strong className="text-red-400 text-xs sm:text-sm font-black">{card.damage}</strong></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 카드 선택 시 하단 플로팅 액션 바 */}
      {selectedCard && !isOverflowPhase && (
        <div className="absolute bottom-24 z-30 bg-slate-900/95 border-2 border-amber-400/80 rounded-2xl p-3 shadow-2xl flex items-center gap-3 backdrop-blur-lg animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col pr-2 border-r border-slate-700">
            <span className="text-xs font-bold text-slate-100">{selectedCard.nameKr}</span>
            <span className="text-[10px] text-slate-400">
              비용 {selectedCard.cost} | 피해 {selectedCard.damage}
              {selectedCard.speed !== undefined ? ` | 속도 ${selectedCard.speed}` : ''}
            </span>
          </div>

          {/* 1. 대결 카드로 세트 */}
          {canSetClashCard && (
            <button
              onClick={() => {
                onSetClashCard(selectedCard.id);
                setSelectedCardId(null);
              }}
              disabled={!checkCardUsable(selectedCard).canPlayClash}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer ${
                checkCardUsable(selectedCard).canPlayClash
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              대결에 세트
            </button>
          )}

          {/* 2. 연격 단계 연속 공격 */}
          {isComboStep && (
            <button
              onClick={() => {
                onComboAttack(selectedCard.id);
                setSelectedCardId(null);
              }}
              disabled={!checkCardUsable(selectedCard).canCombo}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer ${
                checkCardUsable(selectedCard).canCombo
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              연격 시전!
            </button>
          )}

          {/* 3. 협주 충전 */}
          {phase === 'ACTION_PHASE' && isTurnPlayer && (
            <button
              onClick={() => {
                onChargeConcerto(selectedCard.id);
                setSelectedCardId(null);
              }}
              disabled={!canChargeConcerto}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer ${
                canChargeConcerto
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <BatteryCharging className="w-3.5 h-3.5" />
              협주 충전 (자원화)
            </button>
          )}

          {/* 닫기 버튼 */}
          <button
            onClick={() => setSelectedCardId(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
