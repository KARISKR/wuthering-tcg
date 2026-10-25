import React, { useState, useEffect, useRef } from 'react';
import { ActionCard, GamePhase } from '../types/tcg';
import { CardView } from './CardView';
import { BatteryCharging, Swords, Zap, Trash2, X, Sparkles, Flame, AlertTriangle } from 'lucide-react';
import { canLeaderUseCard, canPlayerUseActionCard, getEffectiveCardCost } from '../engine/gameEngine';
import { soundEffects } from '../utils/soundEffects';
import { formatEffectText } from '../utils/formatEffectText';

interface HandViewProps {
  hand: ActionCard[];
  concertoCount: number;
  leaderName: string;
  leaderCard?: import('../types/tcg').CharacterCard;
  supportCards?: (import('../types/tcg').CharacterCard | null)[];
  playerSlots?: import('../types/tcg').CharacterSlots;
  playerState?: import('../types/tcg').PlayerState;
  actionArea?: ActionCard[];
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
  comboUnlimited?: boolean;
  onHover?: (card: ActionCard | null) => void;
}

export const HandView: React.FC<HandViewProps> = ({
  hand,
  concertoCount,
  leaderName,
  leaderCard,
  supportCards,
  playerSlots,
  playerState,
  actionArea,
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
  comboUnlimited = false,
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

      // 드로우 효과음 재생 (전용 card_deal 사운드)
      soundEffects.playCardDeal();

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

  // 카드별 사용 가능 여부 판별 (공식 룰: 일반 카드는 누구나, 비 리더 전용 카드는 서포터로 파티에 있어도 사용 가능, 리더 스킬만 리더 필수)
  const checkCardUsable = (card: ActionCard): { canPlayClash: boolean; canCombo: boolean; reason?: string } => {
    const currentLeader = leaderCard || ({ characterName: leaderName, nameKr: leaderName } as any);
    const slots = playerSlots || {
      leader: currentLeader,
      leftSupport: supportCards?.[0],
      rightSupport: supportCards?.[1],
    };
    const cardUsage = canPlayerUseActionCard(slots, card, actionArea || playerState?.actionArea);
    const meetsRequirements = cardUsage.canUse;

    const clashEffectiveCost = playerState ? getEffectiveCardCost(playerState, card) : card.cost;
    // 금희 Lv.1: 연격 단계 적색 카드 비용 1 경감
    const effectiveCost =
      isComboStep && (currentLeader?.characterName === '금희' || currentLeader?.nameKr?.includes('금희')) && currentLeader?.level >= 1
        ? Math.max(0, clashEffectiveCost - 1)
        : clashEffectiveCost;
    const hasEnoughCost = concertoCount >= effectiveCost;

    const canPlayClash = canSetClashCard && concertoCount >= clashEffectiveCost && meetsRequirements;
    // 공식 룰: 연격 단계에서는 RED 카드 사용 가능 (연격 리더 교체/효과 카드 포함)
    const canCombo = isComboStep && (comboUnlimited || comboCount > 0) && card.color === 'RED' && hasEnoughCost && meetsRequirements;

    const reasons: string[] = [];
    if (!meetsRequirements) {
      if (cardUsage.reason?.includes('에코')) {
        reasons.push('에코 중복 불가');
      } else if (cardUsage.reason?.includes('리더일 때만')) {
        reasons.push(`필요 리더 [${card.characterExclusive}]`);
      } else {
        reasons.push(`필요 캐릭터 [${card.characterExclusive}]`);
      }
    }
    if (!hasEnoughCost) {
      reasons.push('협주 코스트 부족');
    }
    if (isComboStep && card.color !== 'RED') {
      reasons.push('적색 카드만 연격 가능');
    }
    const reason = reasons.join(' · ');

    return { canPlayClash, canCombo, reason };
  };

  const isOverflowPhase = phase === 'DISCARD_OVERFLOW';

  return (
    <div className="relative w-full px-3 pt-1 pb-1.5 flex flex-col items-center bg-gradient-to-t from-[#05070e] via-[#080c17]/90 to-transparent select-none">
      {/* 슬림 상단 HUD 안내 바 */}
      <div className="w-full max-w-5xl flex items-center justify-between text-[11px] text-slate-400 mb-1 px-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-[#f97316] tracking-wider uppercase flex items-center gap-1">
            <span>✦ HAND DOCK</span>
          </span>
          <span
            className={`px-2 py-0.2 font-mono font-black text-[11px] border [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)] ${
              hand.length > 8
                ? 'bg-red-600 text-white border-red-300 animate-pulse'
                : 'bg-[#111624] text-[#f97316] border-[#f97316]/40'
            }`}
          >
            {hand.length} / 8
          </span>
          {isOverflowPhase && (
            <span className="text-red-400 text-[11px] font-bold animate-pulse">
              ⚠️ 상한 초과: 버릴 카드 {hand.length - 8}장 선택
            </span>
          )}
        </div>

        <div className="text-[11px] text-slate-300 font-bold flex items-center gap-2">
          {phase === 'CLASH_SET' && (
            <span className="text-[#f97316] font-black animate-pulse">
              ⚔️ 대결에 출전할 카드를 선택/더블클릭하세요
            </span>
          )}
          {phase === 'ACTION_PHASE' && (
            <span className="text-cyan-300/90 font-semibold">
              💡 카드를 클릭해 [협주 충전] 가능
            </span>
          )}
          {isComboStep && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-950/90 border border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse">
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
              <span className="text-[10px] font-black text-orange-300">
                {comboUnlimited ? '무제한 연격' : `추격 ${comboCount}회`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 하단 플로팅 & 도킹 손패 카드 리스트 (-space-x-2 겹침 + 부채꼴 아치 + 호버 시 위로 솟구침) */}
      <div className="relative flex items-end justify-center -space-x-2 sm:-space-x-3 overflow-visible max-w-full px-6 pt-3 pb-0.5 min-h-[170px] sm:min-h-[188px]">
        {hand.length === 0 ? (
          <div className="my-auto py-4 px-8 border border-white/10 bg-[#0c101b]/70 text-slate-500 text-xs font-mono">
            ✦ 패에 보유한 카드가 없습니다
          </div>
        ) : (
          hand.map((card, idx) => {
            const { canPlayClash, canCombo, reason } = checkCardUsable(card);
            const isSelected = selectedCardId === card.id || selectedOverflowCardIds.includes(card.id);
            const isHighlighted = (canSetClashCard && canPlayClash) || (isComboStep && canCombo);

            const isNewlyDrawn = animatingDrawIds.has(card.id);
            const drawIndex = Array.from(animatingDrawIds).indexOf(card.id);
            const drawDelay = drawIndex >= 0 ? `${drawIndex * 110}ms` : '0ms';

            // 부채꼴(Fan) 미세 회전 각도 및 아치형 오프셋 계산
            const mid = (hand.length - 1) / 2;
            const offsetFromCenter = idx - mid;
            const fanRotateDeg = hand.length > 1 ? offsetFromCenter * 1.4 : 0;
            const fanYOffsetPx = hand.length > 2 ? Math.abs(offsetFromCenter) * 1.8 : 0;

            const colorBorder =
              card.color === 'RED'
                ? 'border-2 border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.45)] hover:border-red-400'
                : card.color === 'GREEN'
                ? 'border-2 border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.45)] hover:border-emerald-300'
                : 'border-2 border-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.45)] hover:border-cyan-300';

            const isHovered = hoveredCardId === card.id;

            // 카드 변형 스타일: isSelected > isHovered > 기본 부채꼴 (CSS :hover 클래스 대신 제어하여 지터 현상 완벽 방지)
            const cardTransform = isSelected
              ? 'translateY(-28px) scale(1.08)'
              : isHovered
              ? 'translateY(-22px) scale(1.08)'
              : `translateY(${fanYOffsetPx}px) rotate(${fanRotateDeg}deg)`;

            const cardZIndex = isSelected ? 60 : isHovered ? 55 : isNewlyDrawn ? 40 : 10 + idx;

            // 호버 툴팁 가로 위치: 화면 좌우 짤림 방지
            const popupAlignClass =
              hand.length <= 1
                ? 'left-1/2 -translate-x-1/2'
                : idx === 0
                ? 'left-0'
                : idx === hand.length - 1
                ? 'right-0'
                : 'left-1/2 -translate-x-1/2';

            return (
              <div
                key={`${card.id}-${idx}`}
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
                onDoubleClick={() => {
                  if (isComboStep && canCombo) {
                    onComboAttack(card.id);
                    setSelectedCardId(null);
                  } else if (canSetClashCard && canPlayClash) {
                    onSetClashCard(card.id);
                    setSelectedCardId(null);
                  }
                }}
                style={{
                  transform: cardTransform,
                  zIndex: cardZIndex,
                  ...(isNewlyDrawn ? { animationDelay: drawDelay } : {}),
                }}
                className={`relative w-[122px] sm:w-[134px] md:w-[146px] h-[172px] sm:h-[188px] shrink-0 flex flex-col justify-between rounded-xl bg-[#0c101b]/95 p-1.5 transition-[transform,box-shadow,border-color] duration-200 ease-out cursor-pointer select-none group ${
                  isNewlyDrawn ? 'animate-card-draw' : ''
                } ${
                  isSelected
                    ? 'border-2 border-[#f97316] ring-2 ring-[#f97316] shadow-[0_0_25px_rgba(249,115,22,0.7)]'
                    : isHovered
                    ? isHighlighted
                      ? `${colorBorder} ring-2 ring-[#22d3ee]/90 shadow-[0_0_28px_rgba(34,211,238,0.7)]`
                      : `${colorBorder} ring-2 ring-[#f97316]/90 shadow-[0_0_28px_rgba(249,115,22,0.65)]`
                    : isHighlighted
                    ? `${colorBorder} ring-2 ring-[#22d3ee]/80 shadow-[0_0_14px_rgba(34,211,238,0.4)]`
                    : colorBorder
                }`}
              >
                {/* 네 모서리 마이크로 브라켓 */}
                <span className="pointer-events-none absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#f97316]/80" />
                <span className="pointer-events-none absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#f97316]/80" />

                {/* 신규 드로우 시 카드 주변 오렌지/시안 링 번쩍임 이펙트 */}
                {isNewlyDrawn && (
                  <div
                    className="absolute -inset-2 rounded-2xl border-2 border-[#f97316] pointer-events-none animate-draw-ring z-40"
                    style={{ animationDelay: drawDelay }}
                  />
                )}

                {/* 호버 시 손패 바로 위 플로팅 홀로그램 상세 팝업 (단, 카드를 클릭하여 액션 바가 열려있을 때는 팝업이 버튼을 가리지 않도록 숨김 처리) */}
                {isHovered && !selectedCardId && (
                  <div
                    className={`absolute bottom-[calc(100%+12px)] ${popupAlignClass} z-[65] pointer-events-auto w-[290px] sm:w-[330px] max-w-[88vw] bg-[#0c101b]/98 border border-[#f97316] p-3 shadow-[0_0_40px_rgba(0,0,0,0.98),0_0_20px_rgba(249,115,22,0.4)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-2 before:absolute before:-bottom-3 before:left-0 before:right-0 before:h-3 before:content-['']`}
                  >
                    <span className="pointer-events-none absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#f97316]" />
                    <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#f97316]" />
                    <span className="pointer-events-none absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400" />
                    <span className="pointer-events-none absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400" />

                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs sm:text-sm font-black text-white truncate">{card.nameKr}</span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${
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

                    <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-[#111624] px-2.5 py-1 border border-white/10">
                      <span>COST <strong className="text-amber-300 font-black">{card.cost}</strong></span>
                      <span>SPD <strong className="text-cyan-300 font-black">{card.speed ?? '-'}</strong></span>
                      <span>DMG <strong className="text-red-400 font-black">{card.damage}</strong></span>
                    </div>

                    {card.description ? (
                      <div className="text-xs text-slate-100 leading-relaxed bg-[#0c101b] p-2.5 border border-white/10 font-medium whitespace-pre-line">
                        {formatEffectText(card.description, 'md')}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic bg-[#0c101b] p-2 border border-white/10">
                        특수 효과 없음 (기본 타격 카드)
                      </div>
                    )}
                  </div>
                )}

                {/* 1. 일러스트 영역 */}
                <div className="w-full h-[88px] sm:h-[96px] rounded-lg overflow-hidden bg-slate-950 border border-white/10 relative shrink-0">
                  <img
                    src={card.artUrl}
                    alt={card.nameKr}
                    className="w-full h-full object-cover object-top group-hover:object-center transition-all duration-200"
                  />
                  {card.isRevealed && (
                    <span
                      className="absolute top-1 right-1 px-1.5 py-0.2 bg-amber-950/90 border border-amber-400/60 text-amber-200 text-[9px] font-black rounded shadow"
                      title="효과로 상대에게 공개된 카드입니다"
                    >
                      👁️ 공개됨
                    </span>
                  )}
                </div>

                {/* 2. 하단 택티컬 정보 바 + 카드 효과 텍스트 */}
                <div className="w-full pt-0.5 px-0.5 flex flex-col gap-0.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-[13px] text-white truncate group-hover:text-[#f97316] transition">
                      {card.nameKr}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono text-slate-300 bg-[#080b13] px-2 py-0.5 rounded border border-white/5">
                    <span title="비용">⚡<strong className="text-amber-300 font-black ml-0.5">{card.cost}</strong></span>
                    <span title="속도">⏱<strong className="text-cyan-300 font-black ml-0.5">{card.speed ?? '-'}</strong></span>
                    <span title="피해">⚔<strong className="text-red-400 font-black ml-0.5">{card.damage}</strong></span>
                  </div>

                  {/* 카드 효과 설명 텍스트 (호버하지 않아도 패에서 즉시 확인 가능) */}
                  {card.description && (
                    <div className="w-full text-[9px] sm:text-[10px] text-slate-300 bg-[#080b13]/90 px-1.5 py-0.5 rounded leading-tight line-clamp-2 border border-white/5 font-medium">
                      {formatEffectText(card.description, 'sm')}
                    </div>
                  )}

                  {/* 연격 단계 전용 즉시 시전 표시 */}
                  {isComboStep && card.color === 'RED' && (
                    <div className="absolute inset-x-1 top-1 z-20">
                      {canCombo ? (
                        <div className="w-full py-0.5 bg-gradient-to-r from-red-600 to-amber-500 text-slate-950 font-black text-[10px] text-center shadow animate-pulse">
                          ⚡ 연격 가능
                        </div>
                      ) : (
                        <div className="w-full py-0.5 bg-black/85 text-red-300 font-bold text-[8px] text-center truncate px-1">
                          {reason || '불가'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 카드 선택 시 하단 플로팅 택티컬 액션 바 */}
      {selectedCard && !isOverflowPhase && (() => {
        const usability = checkCardUsable(selectedCard);
        return (
          <div className="absolute bottom-40 sm:bottom-44 z-[120] bg-[#0c101b]/98 border-2 border-[#f97316] p-2.5 shadow-[0_0_35px_rgba(0,0,0,0.98),0_0_25px_rgba(249,115,22,0.5)] flex flex-col gap-2 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2">
            <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f97316]" />
            <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f97316]" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400" />
            <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />

            {/* 세트/사용 불가능 사유 상단 안내 배너 */}
            {usability.reason && (
              <div className="w-full px-2.5 py-1.5 bg-red-950/90 border border-red-500/70 text-red-200 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{usability.reason}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <div className="flex flex-col pr-2.5 border-r border-white/15">
                <span className="text-xs font-black text-[#f97316]">{selectedCard.nameKr}</span>
                <span className="text-[10px] font-mono text-slate-400">
                  COST {selectedCard.cost} | DMG {selectedCard.damage}
                  {selectedCard.speed !== undefined ? ` | SPD ${selectedCard.speed}` : ''}
                </span>
              </div>

              {/* 1. 대결 카드로 세트 */}
              {canSetClashCard && (
                <button
                  onClick={() => {
                    onSetClashCard(selectedCard.id);
                    setSelectedCardId(null);
                  }}
                  disabled={!usability.canPlayClash}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 font-black text-xs shadow-md transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                    usability.canPlayClash
                      ? 'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>대결에 세트</span>
                </button>
              )}

              {/* 2. 연격 단계 연속 공격 */}
              {isComboStep && (
                <button
                  onClick={() => {
                    onComboAttack(selectedCard.id);
                    setSelectedCardId(null);
                  }}
                  disabled={!usability.canCombo}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 font-black text-xs shadow-md transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                    usability.canCombo
                      ? 'bg-gradient-to-r from-red-600 to-amber-500 hover:brightness-110 text-white animate-pulse'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>연격 시전!</span>
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
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 font-black text-xs shadow-md transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                    canChargeConcerto
                      ? 'bg-[#111520] hover:bg-[#1a2234] text-[#22d3ee] border border-[#22d3ee]/70 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <BatteryCharging className="w-3.5 h-3.5" />
                  <span>협주 충전 (자원화)</span>
                </button>
              )}

              {/* 닫기 버튼 */}
              <button
                onClick={() => setSelectedCardId(null)}
                className="p-1 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

