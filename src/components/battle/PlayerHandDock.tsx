// src/components/battle/PlayerHandDock.tsx
// [WP8-2] 4단: 플레이어 하단 손패 도크 (연격 플로팅 바 + HandView)
import React, { memo, useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { GameState, PlayerState, ActionCard, AnyCard } from '../../types/tcg';
import { HandView } from '../HandView';
import { useBattleStore, selectDisplayedHand } from '../../battle/store';

export interface PlayerHandDockProps {
  activeControlledPlayer: PlayerState;
  gameState: GameState;
  controlledPlayerIndex: 0 | 1;
  isSpectator: boolean;
  isPlayerComboPhase: boolean;
  canPlayerExecuteCombo: (player: PlayerState) => boolean;
  introSwapModalState: { isOpen: boolean };
  concertoModalState: { isOpen: boolean };
  setNoComboCountdown: (val: number | null | ((prev: number | null) => number | null)) => void;
  handleFinishCombo: (playerIndex: 0 | 1) => void;
  isCurrentControlledTurn: boolean;
  isActionLockedByModal: boolean;
  selectedOverflowIds: string[];
  toggleOverflowCard: (id: string) => void;
  handleChargeConcerto: (pIdx: 0 | 1, cardId: string) => void;
  requestSetClashCard: (pIdx: 0 | 1, cardId: string) => void;
  requestComboAttack: (pIdx: 0 | 1, cardId: string) => void;
  setPreviewCard: (c: AnyCard | null, isFromHand?: boolean) => void;
  /** 가로 폰 3열 전장에서 쓰일 때: 손패를 살짝 보임/펼침 2단으로 표시 (모바일 5단계) */
  phoneLayout?: boolean;
}

export const PlayerHandDock: React.FC<PlayerHandDockProps> = memo(({
  activeControlledPlayer,
  gameState,
  controlledPlayerIndex,
  isSpectator,
  isPlayerComboPhase,
  canPlayerExecuteCombo,
  introSwapModalState,
  concertoModalState,
  setNoComboCountdown,
  handleFinishCombo,
  isCurrentControlledTurn,
  isActionLockedByModal,
  selectedOverflowIds,
  toggleOverflowCard,
  handleChargeConcerto,
  requestSetClashCard,
  requestComboAttack,
  setPreviewCard,
  phoneLayout = false,
}) => {
  const isFxBlocking = useBattleStore((s) => s.isFxBlocking);
  const displayedHand = useBattleStore((s) => selectDisplayedHand(s, controlledPlayerIndex));

  // HandView 에 넘기는 조건 (기존 식 그대로 — 가로 폰 자동 펼침 판단에도 같은 값을 쓴다)
  const canChargeConcerto =
    !isSpectator && !isActionLockedByModal && !activeControlledPlayer.actionFlags.chargedConcerto && gameState.phase === 'ACTION_PHASE' && isCurrentControlledTurn;
  const canSetClashCard =
    !isSpectator &&
    !isActionLockedByModal &&
    gameState.phase === 'CLASH_SET' &&
    !activeControlledPlayer.clashCardReady &&
    (isCurrentControlledTurn || gameState.players[gameState.activePlayerIndex].clashCardReady);
  const isComboStep =
    !isSpectator &&
    !isActionLockedByModal &&
    gameState.phase === 'COMBO_STEP' &&
    isPlayerComboPhase &&
    (Boolean(activeControlledPlayer.comboUnlimited) || activeControlledPlayer.comboCount > 0);
  const mustDiscard = !isSpectator && gameState.phase === 'DISCARD_OVERFLOW' && isCurrentControlledTurn && displayedHand.length > 8;

  // [가로 폰] 손패 표시 상태 (설계서 3절)
  //  - 손패에서 골라야 하는 단계(대결 세트·연격·패 정리)에 들어가면 자동으로 펼침
  //  - 카드를 낸 직후(손패 감소, 더 고를 게 없을 때)·상대 턴 시작·바깥 탭·아래로 쓸기·접기 버튼 → 살짝 보임
  const [phoneHandMode, setPhoneHandMode] = useState<'peek' | 'expanded'>('peek');
  const needsHandPick = canSetClashCard || isComboStep || mustDiscard;
  const prevNeedsPick = useRef(needsHandPick);
  const prevHandLength = useRef(displayedHand.length);
  const prevMyTurn = useRef(isCurrentControlledTurn);
  useEffect(() => {
    if (!phoneLayout) return;
    if (needsHandPick && !prevNeedsPick.current) setPhoneHandMode('expanded');
    else if (displayedHand.length < prevHandLength.current && !needsHandPick) setPhoneHandMode('peek');
    else if (prevMyTurn.current && !isCurrentControlledTurn && !needsHandPick) setPhoneHandMode('peek');
    prevNeedsPick.current = needsHandPick;
    prevHandLength.current = displayedHand.length;
    prevMyTurn.current = isCurrentControlledTurn;
  }, [phoneLayout, needsHandPick, displayedHand.length, isCurrentControlledTurn]);
  const swipeStartY = useRef<number | null>(null);

  const renderHand = (mode?: 'peek' | 'expanded') => (
    <HandView
      phoneMode={mode}
      onPhoneExpand={() => setPhoneHandMode('expanded')}
      onPhoneCollapse={() => setPhoneHandMode('peek')}
      hand={displayedHand}
      concertoCount={activeControlledPlayer.concertoZone.length}
      leaderName={activeControlledPlayer.slots.leader.characterName}
      leaderCard={activeControlledPlayer.slots.leader}
      supportCards={[activeControlledPlayer.slots.leftSupport, activeControlledPlayer.slots.rightSupport]}
      playerSlots={activeControlledPlayer.slots}
      playerState={activeControlledPlayer}
      actionArea={activeControlledPlayer.actionArea}
      phase={gameState.phase}
      isTurnPlayer={isCurrentControlledTurn}
      canChargeConcerto={canChargeConcerto}
      canSetClashCard={canSetClashCard}
      isComboStep={isComboStep}
      comboCount={activeControlledPlayer.comboCount}
      comboUnlimited={activeControlledPlayer.comboUnlimited}
      selectedOverflowCardIds={selectedOverflowIds}
      onSelectOverflowCard={isSpectator ? () => {} : toggleOverflowCard}
      onChargeConcerto={(cardId: string) => (!isSpectator && handleChargeConcerto(controlledPlayerIndex, cardId))}
      onSetClashCard={(cardId: string) => (!isSpectator && requestSetClashCard(controlledPlayerIndex, cardId))}
      onComboAttack={(cardId: string) => (!isSpectator && requestComboAttack(controlledPlayerIndex, cardId))}
      onHover={(card: ActionCard | null) => setPreviewCard(card, true)}
    />
  );

  // 가로 폰: 자리에는 늘 살짝 보임 띠(56px). 펼치면 화면 위에 손패 패널을 띄우고 뒤 보드를 어둡게 덮는다.
  // 패널은 화면 아래 64px(퀵 액션 바 줄)를 비워 두어 대결 패스·턴 종료 버튼을 가리지 않는다.
  const renderPhoneHand = () => (
    <>
      {renderHand('peek')}
      {phoneHandMode === 'expanded' && (
        <>
          <div
            data-phone-hand-backdrop
            aria-hidden="true"
            onClick={() => setPhoneHandMode('peek')}
            className="fixed inset-0 z-[35] bg-black/55 animate-in fade-in duration-150"
          />
          <div
            data-phone-hand-panel
            className="fixed z-[38] animate-in slide-in-from-bottom-4 duration-200"
            style={{
              left: 'max(4px, env(safe-area-inset-left))',
              right: 'max(4px, env(safe-area-inset-right))',
              top: '52px',
              bottom: 'calc(64px + env(safe-area-inset-bottom))',
            }}
            onTouchStart={(e) => {
              swipeStartY.current = e.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(e) => {
              const start = swipeStartY.current;
              const end = e.changedTouches[0]?.clientY;
              swipeStartY.current = null;
              if (start !== null && end !== undefined && end - start > 60) setPhoneHandMode('peek');
            }}
          >
            {renderHand('expanded')}
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="w-full shrink-0 z-30 overflow-visible flex flex-col gap-1.5">
      {/* [내 손패 바로 위 플로팅 알림] 연격(추격) 불가 시 손패 바로 위에서 사유 안내 및 즉시 턴 넘기기 버튼 */}
      {!isSpectator &&
        isPlayerComboPhase &&
        !canPlayerExecuteCombo(activeControlledPlayer) &&
        !isFxBlocking &&
        !gameState.pendingChoice &&
        !introSwapModalState.isOpen &&
        !concertoModalState.isOpen && (
          <div className="w-full max-w-[1200px] mx-auto px-3 py-2 bg-[#0c101b]/95 border-2 border-[#f97316] rounded-xl shadow-[0_0_25px_rgba(249,115,22,0.4)] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-[#f97316] shrink-0 animate-bounce" />
              <span className="text-xs sm:text-sm font-black text-white truncate">
                {!activeControlledPlayer.comboUnlimited && (activeControlledPlayer.comboCount ?? 0) === 0
                  ? '⚡ 남은 추격(연격) 횟수를 모두 소진했습니다.'
                  : '⚠️ 손패에 사용 가능한 적색(RED) 연격 카드가 없거나 협주 코스트가 부족합니다.'}
              </span>
              <span className="hidden md:inline text-xs text-slate-300">
                (연격을 종료하고 턴을 넘기세요)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setNoComboCountdown(null);
                handleFinishCombo(controlledPlayerIndex);
              }}
              className={`shrink-0 ${phoneLayout ? 'min-h-[44px]' : ''} px-3.5 py-1.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-xs sm:text-sm rounded-lg shadow-md transition transform hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1.5`}
            >
              <span>연격 종료 (턴 넘기기)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      {phoneLayout ? renderPhoneHand() : renderHand()}
    </div>
  );
});
