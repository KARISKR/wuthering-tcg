import React, { useState, useEffect } from 'react';
import { PendingChoice, getElementKr } from '../types/tcg';
import { Sparkles, Check, CheckCircle2, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { formatEffectText } from '../utils/formatEffectText';

const parseChoiceTitle = (rawTitle: string) => {
  let mainText = rawTitle;
  let tagText = '';
  let tagClass = 'text-[#f97316] bg-[#141a29] border-[#f97316]/40';

  if (rawTitle.includes('등장')) {
    tagText = '등장';
    tagClass = 'text-emerald-300 bg-emerald-950/80 border-emerald-500/60 shadow-[0_0_8px_rgba(52,211,153,0.3)]';
    mainText = rawTitle.replace(/등장\s*효과\s*발동/, '효과 발동').replace(/등장/, '').trim();
  } else if (rawTitle.includes('레벨업')) {
    tagText = '레벨업';
    tagClass = 'text-amber-300 bg-amber-950/80 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
    mainText = rawTitle.replace(/레벨업\s*효과\s*발동/, '효과 발동').replace(/레벨업/, '').trim();
  } else if (rawTitle.includes('배틀')) {
    tagText = '배틀 효과';
    tagClass = 'text-rose-300 bg-rose-950/80 border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.3)]';
    mainText = rawTitle.replace(/배틀\s*효과\s*발동/, '효과 발동').replace(/배틀/, '').trim();
  } else if (rawTitle.includes('교체')) {
    tagText = '교체';
    tagClass = 'text-cyan-300 bg-cyan-950/80 border-cyan-500/60 shadow-[0_0_8px_rgba(34,211,238,0.3)]';
    mainText = rawTitle.replace(/교체\s*효과\s*발동/, '효과 발동').replace(/교체/, '').trim();
  }

  if (tagText && !mainText.includes('효과 발동') && !mainText.includes('선택')) {
    mainText = `${mainText} 효과 발동`.trim();
  }

  return { mainText, tagText, tagClass };
};

interface EffectChoiceModalProps {
  choice: PendingChoice | null | undefined;
  onResolve: (chosenCardIds: string[]) => void;
}

export const EffectChoiceModal: React.FC<EffectChoiceModalProps> = ({ choice, onResolve }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFieldPeek, setIsFieldPeek] = useState(false);
  const isSubmittingRef = React.useRef(false);

  // 고유 ID 기준 중복 방어된 카드 목록
  const displayCards = React.useMemo(() => {
    if (!choice?.revealedCards) return [];
    const seen = new Set<string>();
    return choice.revealedCards.filter((c) => {
      if (!c.id) return true;
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [choice?.id, choice?.revealedCards]);

  React.useEffect(() => {
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setIsFieldPeek(false);
    if (choice) {
      if (
        choice.onResolveType === 'ADD_TO_HAND' ||
        choice.onResolveType === 'DRAW_THEN_DISCARD_CONFIRM' ||
        choice.onResolveType === 'SHOREKEEPER_SWITCH_DRAW' ||
        choice.onResolveType === 'PAY_CLASH_CONCERTO_COST'
      ) {
        setSelectedIds(displayCards.slice(0, choice.maxSelect).map((c) => c.id));
      } else if (
        choice.onResolveType !== 'SELECT_EFFECT_UPGRADE' &&
        choice.onResolveType !== 'SWAP_LEADER' &&
        (choice.minSelect ?? 0) > 0 &&
        choice.maxSelect === 1 &&
        displayCards.length === 1
      ) {
        setSelectedIds([displayCards[0].id]);
      } else {
        setSelectedIds([]);
      }
    }
  }, [choice?.id]);

  if (!choice) return null;

  const minSelect = choice.minSelect ?? 0;
  const isUpgradeChoice = choice.onResolveType === 'SELECT_EFFECT_UPGRADE';
  const titleInfo = parseChoiceTitle(choice.title);

  const toggleSelect = (cardId: string) => {
    if (
      choice.onResolveType === 'VIEW_ONLY' ||
      choice.onResolveType === 'SHOREKEEPER_SWITCH_PROMPT' ||
      choice.onResolveType === 'SHOREKEEPER_0_DRAW_PROMPT' ||
      choice.onResolveType === 'SHOREKEEPER_LV2_HEAL_DRAW_PROMPT'
    )
      return;
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
    if (
      choice.onResolveType === 'VIEW_ONLY' ||
      choice.onResolveType === 'SHOREKEEPER_SWITCH_PROMPT' ||
      choice.onResolveType === 'SHOREKEEPER_0_DRAW_PROMPT' ||
      choice.onResolveType === 'SHOREKEEPER_LV2_HEAL_DRAW_PROMPT'
    )
      return;
    setSelectedIds(displayCards.slice(0, choice.maxSelect).map((c) => c.id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const handleConfirm = () => {
    if (isSubmittingRef.current || isSubmitting) return;
    const isPrompt =
      choice.onResolveType === 'SHOREKEEPER_SWITCH_PROMPT' ||
      choice.onResolveType === 'SHOREKEEPER_0_DRAW_PROMPT' ||
      choice.onResolveType === 'SHOREKEEPER_LV2_HEAL_DRAW_PROMPT';
    if (choice.onResolveType !== 'VIEW_ONLY' && !isPrompt && selectedIds.length < minSelect) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    if (choice.onResolveType === 'VIEW_ONLY') {
      onResolve([]);
    } else if (isPrompt) {
      onResolve(['DRAW']);
    } else {
      const unique = Array.from(new Set(selectedIds)).slice(0, choice.maxSelect ?? 1);
      onResolve(unique);
    }
    // 더블 클릭 방지 및 자동 리셋 가드 (멈춤 방지)
    setTimeout(() => {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }, 800);
  };

  const handleSkip = () => {
    if (isSubmittingRef.current || isSubmitting || minSelect > 0) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    onResolve([]);
    setTimeout(() => {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }, 800);
  };

  if (isFieldPeek) {
    return (
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-top-4 select-none">
        <button
          type="button"
          onClick={() => setIsFieldPeek(false)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0c101b]/95 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.7)] text-xs sm:text-sm font-black transition cursor-pointer hover:bg-cyan-950/80 hover:scale-105 active:scale-95 animate-pulse"
        >
          <EyeOff className="w-4 h-4 text-cyan-300" />
          <span>필드 상황 확인 중 · 효과 선택창 복귀 (클릭)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-3xl bg-[#0c101b]/95 border border-[#f97316]/70 p-6 sm:p-7 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col gap-4 overflow-hidden">
        {/* 네 모서리 명조 택티컬 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
        <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3.5 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 bg-[#111520] border border-[#f97316]/50 flex items-center justify-center text-[#f97316] shadow overflow-hidden shrink-0">
              {choice.sourceCardArt ? (
                <img src={choice.sourceCardArt} alt="" className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="w-7 h-7 animate-pulse" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 flex-wrap">
                  <span>{titleInfo.mainText}</span>
                  {titleInfo.tagText && (
                    <span className={`text-xs sm:text-sm px-2.5 py-0.5 border font-black rounded ${titleInfo.tagClass}`}>
                      [{titleInfo.tagText}]
                    </span>
                  )}
                </h2>
                <span className="text-xs sm:text-sm px-3 py-0.5 bg-[#141a29] text-[#f97316] border border-[#f97316]/40 font-bold font-mono">
                  {choice.isPublicReveal
                    ? choice.onResolveType === 'VIEW_ONLY'
                      ? '📢 상대 공개 카드 확인'
                      : '📢 양측 공개 후 패 추가'
                    : isUpgradeChoice
                    ? '레벨업 대상 수동 선택'
                    : choice.onResolveType === 'SWAP_LEADER' || choice.onResolveType === 'BP01_022_YANGYANG_SWAP'
                    ? '리더 교체 선택'
                    : choice.onResolveType === 'RECOVER_BP01_069'
                    ? '배틀 페이즈 종료 효과'
                    : choice.onResolveType === 'ADD_TO_HAND'
                    ? '효과 드로우 확인'
                    : choice.onResolveType === 'SHOREKEEPER_SWITCH_PROMPT'
                    ? '교체 효과 발동 선택'
                    : choice.onResolveType === 'DISCARD_FROM_HAND'
                    ? '버릴 카드 선택'
                    : titleInfo.tagText
                    ? `${titleInfo.tagText} 효과 발동`
                    : choice.onResolveType === 'VIEW_ONLY'
                    ? (choice.title.includes('상대의 패') || choice.title.includes('스캔') ? '상대 패 확인' : '효과 발동 안내')
                    : '선택 발동'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium truncate">
                출처: <strong className="text-[#f97316]">{choice.sourceCardName}</strong>
              </p>
            </div>
          </div>

          {/* 필드 확인 버튼 */}
          <button
            type="button"
            onClick={() => setIsFieldPeek(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs sm:text-sm font-bold transition shadow-md cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            title="팝업을 잠시 접어두고 필드 상황을 확인합니다"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>필드 확인</span>
          </button>
        </div>

        {/* ============================================================
            파수인 교체/배틀/상시 회복 드로우 효과 전용 레이아웃 (SHOREKEEPER_SWITCH_PROMPT / SHOREKEEPER_0_DRAW_PROMPT / SHOREKEEPER_LV2_HEAL_DRAW_PROMPT)
           ============================================================ */}
        {choice.onResolveType === 'SHOREKEEPER_SWITCH_PROMPT' || choice.onResolveType === 'SHOREKEEPER_0_DRAW_PROMPT' || choice.onResolveType === 'SHOREKEEPER_LV2_HEAL_DRAW_PROMPT' ? (
          <div className="flex flex-col items-center gap-4 py-2 my-1">
            {/* 1. 중앙: 캐릭터 카드 풀 프레임 */}
            <div className="relative w-52 sm:w-60 aspect-[5/7] rounded-2xl overflow-hidden border-2 border-[#f97316] ring-4 ring-[#f97316]/30 shadow-[0_0_35px_rgba(249,115,22,0.45)] select-none">
              <img
                src={choice.sourceCardArt || '/cards/card_images/BP01-008_파수인_1908.webp'}
                alt={choice.sourceCardName}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur-sm px-2.5 py-1 text-xs font-mono font-bold text-amber-300 border border-amber-500/40 rounded">
                {choice.sourceCardName}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 text-center">
                <span className="text-sm font-black text-white drop-shadow block">
                  {choice.sourceCardName}
                </span>
                <span className="text-xs font-bold text-[#f97316]">
                  {choice.title.includes('배틀') ? '【배틀】 드로우 효과' : choice.title.includes('상시') || choice.title.includes('회복') ? '【상시】 회복 드로우 효과' : '【교체】 드로우 효과'}
                </span>
              </div>
            </div>

            {/* 2. 하단: 교체효과 발동 여부 안내 박스 */}
            <div className="w-full max-w-xl bg-[#111520]/95 border border-[#f97316]/50 p-4 sm:p-5 rounded-xl shadow-inner text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f97316]/20 border border-[#f97316]/40 text-[#f97316] font-black text-xs sm:text-sm mb-2">
                <Sparkles className="w-4 h-4 text-[#f97316]" />
                <span>【카드 드로우 진행 여부 선택】</span>
              </div>
              <div className="text-sm sm:text-base text-slate-100 font-bold leading-relaxed whitespace-pre-line">
                {formatEffectText(choice.description, 'md')}
              </div>
            </div>
          </div>
        ) : displayCards.length === 0 ? (
          /* ============================================================
              대상/공개 카드 없는 단순 효과 발동 안내 뷰 (중복 텍스트 완전 제거, 풀사이즈 카드 & 대형 네모칸)
             ============================================================ */
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-4 my-2">
            {/* 대형 캐릭터 카드 풀 프레임 */}
            <div className="relative w-52 sm:w-60 md:w-64 aspect-[5/7] rounded-2xl overflow-hidden border-2 border-[#f97316] ring-4 ring-[#f97316]/30 shadow-[0_0_35px_rgba(249,115,22,0.45)] shrink-0 select-none">
              {choice.sourceCardArt ? (
                <img
                  src={choice.sourceCardArt}
                  alt={choice.sourceCardName || '카드'}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full bg-[#111520] flex items-center justify-center text-[#f97316]">
                  <Sparkles className="w-16 h-16 animate-pulse" />
                </div>
              )}
              <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur-sm px-2.5 py-1 text-xs font-mono font-bold text-amber-300 border border-amber-500/40 rounded">
                {choice.sourceCardName}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 text-center">
                <span className="text-sm font-black text-white drop-shadow block truncate">
                  {choice.sourceCardName}
                </span>
                {titleInfo.tagText && (
                  <span className={`text-xs font-black inline-block mt-0.5 px-2 py-0.5 rounded border ${titleInfo.tagClass}`}>
                    [{titleInfo.tagText}]
                  </span>
                )}
              </div>
            </div>

            {/* 확장된 안내 네모칸: 텍스트 중복 제거, 카드에 맞춘 대형 레이아웃 및 폰트 확대 */}
            <div className="w-full max-w-xl bg-[#111520]/95 border-2 border-[#f97316]/60 p-6 rounded-2xl shadow-2xl flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#f97316] font-black text-base sm:text-lg">
                <Sparkles className="w-5 h-5 text-[#f97316] shrink-0" />
                <span>
                  {titleInfo.tagText ? `【${titleInfo.tagText} 효과 발동 결과】` : '【효과 발동 결과】'}
                </span>
              </div>
              <div className="text-base sm:text-lg text-slate-100 font-bold leading-relaxed whitespace-pre-line py-1">
                {formatEffectText(choice.description, 'md')}
              </div>
              <div className="mt-2 pt-3 border-t border-white/10 text-xs sm:text-sm text-slate-400 font-medium">
                아래 [확인 완료] 버튼을 누르면 다음 행동으로 계속 진행합니다.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 효과 설명 */}
            <div className="bg-[#111520]/90 border border-[#f97316]/40 p-4 sm:p-5 text-sm sm:text-base text-slate-100 leading-relaxed shadow-inner">
              <div className="flex items-center gap-2 text-[#f97316] font-extrabold text-sm sm:text-base mb-1.5">
                <Eye className="w-5 h-5 text-[#f97316] shrink-0" />
                <span>
                  {choice.onResolveType === 'VIEW_ONLY'
                    ? choice.title.includes('상대의 패') || choice.title.includes('스캔')
                      ? `상대의 패 ${displayCards.length}장이 확인되었습니다.`
                      : choice.title.includes('협주')
                      ? '【협주 에리어 배치 카드 확인】'
                      : choice.title.includes('등장')
                      ? '【등장 효과 발동 안내】'
                      : choice.title.includes('레벨업')
                      ? '【레벨업 효과 발동 안내】'
                      : choice.title.includes('회복')
                      ? '【생명력 회복 효과 안내】'
                      : '【효과 발동 안내】'
                    : choice.onResolveType === 'SELECT_EFFECT_UPGRADE'
                    ? `캐릭터 덱에서 중첩 레벨업 가능한 대상 카드 ${displayCards.length}장 확인`
                    : choice.onResolveType === 'SWAP_LEADER'
                    ? `교체 가능한 서포터 캐릭터 ${displayCards.length}명 확인`
                    : choice.onResolveType === 'BP01_022_YANGYANG_SWAP'
                    ? `버리고 양양으로 교체할 패 목록 (${displayCards.length}장)`
                    : choice.onResolveType === 'RECOVER_BP01_069'
                    ? `1 COST로 지불할 협주 에리어 카드 목록 (${displayCards.length}장)`
                    : choice.onResolveType === 'SET_CONCERTO'
                    ? `덱 위의 카드 ${displayCards.length}장이 확인되었습니다 (협주 에리어 배치 선택)`
                    : choice.onResolveType === 'RECOVER_FROM_DROP'
                    ? `트래시 에리어의 회수 대상 카드 ${displayCards.length}장 확인`
                    : choice.onResolveType === 'DISCARD_FOR_DAMAGE'
                    ? `버릴 수 있는 패 목록 (${displayCards.length}장)`
                    : choice.onResolveType === 'DISCARD_FROM_HAND'
                    ? `버릴 카드를 골라주세요 (보유 패 ${displayCards.length}장)`
                    : `덱 위의 카드 ${displayCards.length}장이 공개되었습니다!`}
                </span>
              </div>
              <div className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed whitespace-pre-line mt-1">
                {formatEffectText(choice.description, 'md')}
              </div>
              {choice.isPublicReveal && (
                <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-bold">
                  <Eye className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {choice.onResolveType === 'VIEW_ONLY'
                      ? '📢 [공개 효과] 상대가 덱에서 공개한 카드입니다. 확인 완료 시 상대 손패에 공개 상태(앞면)로 추가됩니다.'
                      : '📢 [양측 공개 효과] 이 카드는 상대방에게도 앞면으로 공개된 후 손패에 추가됩니다.'}
                  </span>
                </div>
              )}
            </div>

            {/* 선택 카운터 & 단축 버튼 (VIEW_ONLY가 아닐 때만 노출) */}
            {choice.onResolveType !== 'VIEW_ONLY' ? (
              <div className="flex items-center justify-between bg-[#111520] border border-white/10 px-4 sm:px-5 py-2.5 flex-wrap gap-2">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                  <span className="text-slate-300 font-bold">
                    {choice.onResolveType === 'SELECT_EFFECT_UPGRADE'
                      ? '중첩할 레벨업 캐릭터 카드 선택:'
                      : choice.onResolveType === 'SWAP_LEADER'
                      ? '새로운 리더로 세울 서포터 캐릭터 선택:'
                      : choice.onResolveType === 'BP01_022_YANGYANG_SWAP'
                      ? '버리고 양양으로 리더 교체할 패 선택:'
                      : choice.onResolveType === 'RECOVER_BP01_069'
                      ? '비용으로 지불할 협주 카드 선택:'
                      : choice.onResolveType === 'SET_CONCERTO'
                      ? '협주 에리어에 배치할 카드:'
                      : choice.onResolveType === 'RECOVER_FROM_DROP'
                      ? '패에 회수할 카드:'
                      : choice.onResolveType === 'DISCARD_FROM_HAND'
                      ? '버릴 카드를 골라주세요:'
                      : choice.onResolveType === 'DISCARD_FOR_DAMAGE'
                      ? '트래시로 보낼 패 선택:'
                      : '패에 추가할 카드 선택:'}
                  </span>
                  <span className="font-mono font-black text-[#f97316] px-2.5 py-0.5 bg-[#0c101b] border border-[#f97316]/50 text-xs sm:text-sm">
                    {minSelect > 0
                      ? `${selectedIds.length} / ${choice.maxSelect}장 (필수 ${minSelect}장 선택)`
                      : `${selectedIds.length} / 최대 ${choice.maxSelect}장 (0장 선택 가능)`}
                  </span>
                </div>
                {!isUpgradeChoice && (
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                    <button
                      onClick={selectAll}
                      className="text-[#f97316] hover:text-[#fb923c] font-bold px-2.5 py-1 transition cursor-pointer"
                    >
                      전체 선택 ({choice.maxSelect}장)
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      onClick={clearAll}
                      className="text-slate-400 hover:text-slate-200 font-bold px-2.5 py-1 transition cursor-pointer"
                    >
                      선택 초기화 (0장)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-800/60 px-4 sm:px-5 py-2.5">
                <span className="text-xs sm:text-sm font-bold text-cyan-200 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cyan-400 shrink-0" />
                  {choice.title.includes('상대의 패') || choice.title.includes('스캔')
                    ? '상대방이 보유하고 있는 패 카드입니다. 확인 후 [확인 완료] 버튼을 누르세요.'
                    : '효과 처리 결과를 확인하신 후 아래 [확인 완료] 버튼을 누르세요.'}
                </span>
                {displayCards.length > 0 && (
                  <span className="text-xs sm:text-sm font-mono font-black text-cyan-200 bg-cyan-900/60 px-3 py-0.5 border border-cyan-700">
                    총 {displayCards.length}장
                  </span>
                )}
              </div>
            )}

            {/* 공개된 카드 리스트 */}
            <div className="flex items-center justify-center gap-4 py-2 flex-wrap max-h-[50vh] overflow-y-auto custom-scrollbar">
              {displayCards.map((card, idx) => {
                  const isSelected = selectedIds.includes(card.id);
                  const isViewOnly = choice.onResolveType === 'VIEW_ONLY';
                  const isCharCard = card.kind === 'CHARACTER';
                  return (
                    <div
                      key={`${card.id}-${idx}`}
                      onClick={() => {
                        if (!isViewOnly) toggleSelect(card.id);
                      }}
                      className={`relative w-48 aspect-[5/7] overflow-hidden border transition transform select-none shadow-xl ${
                        isViewOnly
                          ? 'border-cyan-500/50 hover:border-cyan-400 cursor-default'
                          : isSelected
                          ? 'border-[#f97316] ring-4 ring-[#f97316]/50 shadow-[0_0_25px_rgba(249,115,22,0.6)] cursor-pointer hover:scale-105'
                          : 'border-white/15 opacity-80 hover:opacity-100 hover:border-[#f97316]/70 cursor-pointer hover:scale-105'
                      }`}
                    >
                      <img
                        src={card.artUrl}
                        alt={card.nameKr}
                        className="w-full h-full object-cover"
                      />

                      {/* 공개 순서 라벨 */}
                      <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-sm px-2 py-0.5 text-xs font-mono font-bold text-slate-200 border border-white/20">
                        {choice.isPublicReveal
                          ? `📢 공개 #${idx + 1}`
                          : choice.onResolveType === 'VIEW_ONLY'
                          ? (choice.title.includes('상대의 패') || choice.title.includes('스캔') ? `상대 패 #${idx + 1}` : `${card.code || '효과 카드'}`)
                          : choice.onResolveType === 'SELECT_EFFECT_UPGRADE'
                          ? `${card.code}`
                          : choice.onResolveType === 'SWAP_LEADER'
                          ? '서포터'
                          : choice.onResolveType === 'RECOVER_BP01_069'
                          ? '1 COST 회수'
                          : choice.onResolveType === 'RECOVER_FROM_DROP'
                          ? '트래시'
                          : choice.onResolveType === 'DISCARD_FROM_HAND' || choice.onResolveType === 'BP01_022_YANGYANG_SWAP'
                          ? '패 카드'
                          : `공개 #${idx + 1}`}
                      </div>

                      {/* 선택 상태 오버레이 */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#ea580c]/30 backdrop-blur-[1px] flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-[#f97316] text-white flex items-center justify-center shadow-xl animate-in zoom-in-75">
                            <Check className="w-8 h-8 stroke-[3]" />
                          </div>
                        </div>
                      )}

                  {/* 카드 정보 하단 배너 */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-2.5 text-left">
                    {isCharCard ? (
                      <>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-black text-white truncate">{card.nameKr}</span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 bg-[#141a29] text-[#f97316] border border-[#f97316]/40">
                            Lv.{card.level} · {getElementKr(card.element)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-200 line-clamp-3 leading-snug">
                          {formatEffectText(card.description, 'sm')}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-black text-white truncate">{card.nameKr}</span>
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.2 ${
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
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                          <span>비용: {card.cost}</span>
                          <span>피해: {card.damage}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
        )}

        {/* 하단 확인 버튼들 */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 flex-wrap gap-3">
          {choice.onResolveType === 'VIEW_ONLY' ? (
            <div className="w-full flex justify-end">
              <button
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="flex items-center gap-2.5 px-7 py-3 text-sm sm:text-base font-black bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:brightness-110 shadow-lg shadow-cyan-500/25 transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>확인 완료 (계속 진행)</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              {minSelect === 0 ? (
                <button
                  disabled={isSubmitting}
                  onClick={handleSkip}
                  className="px-5 py-3 text-xs sm:text-sm font-bold text-slate-300 hover:text-white bg-[#111520] hover:bg-[#1a2234] border border-white/15 transition cursor-pointer [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
                >
                  {choice.onResolveType === 'SHOREKEEPER_SWITCH_PROMPT' || choice.onResolveType === 'SHOREKEEPER_0_DRAW_PROMPT' || choice.onResolveType === 'SHOREKEEPER_LV2_HEAL_DRAW_PROMPT'
                    ? '뽑지 않음'
                    : choice.onResolveType === 'SHOREKEEPER_SWITCH_DRAW'
                    ? '드로우하지 않고 넘어가기 (덱 맨 위 유지)'
                    : choice.onResolveType === 'SET_CONCERTO'
                    ? '협주 에리어에 배치하지 않고 넘어가기 (덱 맨 위 유지)'
                    : choice.onResolveType === 'RECOVER_FROM_DROP'
                    ? '회수하지 않고 넘어가기'
                    : choice.onResolveType === 'DISCARD_FOR_DAMAGE'
                    ? '패를 버리지 않고 기본 피해로 공격'
                    : choice.onResolveType === 'DISCARD_FROM_HAND'
                    ? '패를 버리지 않고 넘어가기'
                    : choice.onResolveType === 'SWAP_LEADER'
                    ? '리더를 교체하지 않고 현재 리더 유지'
                    : choice.onResolveType === 'BP01_022_YANGYANG_SWAP'
                    ? '패를 버리지 않고 현재 리더 유지'
                    : choice.onResolveType === 'RECOVER_BP01_069'
                    ? '코스트를 지불하지 않고 회수 건너뛰기'
                    : '패에 추가하지 않고 넘어가기 (0장)'}
                </button>
              ) : (
                <div className="text-xs sm:text-sm font-bold text-[#f97316]">
                  {selectedIds.length < minSelect
                    ? `⚠️ 위 목록에서 카드를 클릭하여 ${minSelect}장 선택해주세요.`
                    : '✓ 대상 카드가 선택되었습니다. 우측 버튼을 눌러 확정하세요.'}
                </div>
              )}

              <button
                disabled={
                  isSubmitting ||
                  (choice.onResolveType !== 'SHOREKEEPER_SWITCH_PROMPT' &&
                    choice.onResolveType !== 'SHOREKEEPER_0_DRAW_PROMPT' &&
                    choice.onResolveType !== 'SHOREKEEPER_LV2_HEAL_DRAW_PROMPT' &&
                    selectedIds.length < minSelect)
                }
                onClick={handleConfirm}
                className={`flex items-center gap-2.5 px-7 py-3 text-sm sm:text-base font-black transition [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                  choice.onResolveType !== 'SHOREKEEPER_SWITCH_PROMPT' &&
                  choice.onResolveType !== 'SHOREKEEPER_0_DRAW_PROMPT' &&
                  choice.onResolveType !== 'SHOREKEEPER_LV2_HEAL_DRAW_PROMPT' &&
                  selectedIds.length < minSelect
                    ? 'bg-[#111520] text-slate-500 border border-white/10 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white hover:brightness-110 shadow-lg shadow-[#f97316]/25 cursor-pointer'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {choice.onResolveType === 'SHOREKEEPER_SWITCH_PROMPT' || choice.onResolveType === 'SHOREKEEPER_0_DRAW_PROMPT' || choice.onResolveType === 'SHOREKEEPER_LV2_HEAL_DRAW_PROMPT'
                    ? '카드 1장 뽑기'
                    : choice.onResolveType === 'SHOREKEEPER_SWITCH_DRAW' || choice.onResolveType === 'DRAW_THEN_DISCARD_CONFIRM'
                    ? '확인 및 패에 추가 (버릴 패 선택으로 진행)'
                    : choice.onResolveType === 'SELECT_EFFECT_UPGRADE'
                    ? selectedIds.length > 0
                      ? '선택한 카드로 중첩 레벨업 확정'
                      : '레벨업할 카드를 선택하세요'
                    : choice.onResolveType === 'SWAP_LEADER'
                    ? selectedIds.length > 0
                      ? '선택한 캐릭터로 리더 교체'
                      : '교체할 캐릭터를 선택하세요'
                    : choice.onResolveType === 'BP01_022_YANGYANG_SWAP'
                    ? selectedIds.length > 0
                      ? '선택한 패 1장 버리고 양양으로 리더 교체'
                      : '버릴 패를 선택하세요'
                    : choice.onResolveType === 'PAY_CLASH_CONCERTO_COST'
                    ? selectedIds.length >= minSelect
                      ? `선택한 협주 ${selectedIds.length}장 코스트 지불 확정`
                      : `지불할 협주 카드 ${minSelect}장을 선택하세요 (${selectedIds.length}/${minSelect})`
                    : choice.onResolveType === 'RECOVER_BP01_069'
                    ? selectedIds.length > 0
                      ? '선택한 1장 지불하여 패 회수'
                      : '지불할 협주 카드를 선택하세요'
                    : choice.onResolveType === 'SET_CONCERTO'
                    ? `선택한 ${selectedIds.length}장 협주 에리어에 배치`
                    : choice.onResolveType === 'RECOVER_FROM_DROP'
                    ? `선택한 ${selectedIds.length}장 패에 회수`
                    : choice.onResolveType === 'DISCARD_FOR_DAMAGE' || choice.onResolveType === 'DISCARD_FROM_HAND'
                    ? `선택한 패 ${selectedIds.length}장 버리기`
                    : `선택한 ${selectedIds.length}장 패에 추가`}
                </span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
