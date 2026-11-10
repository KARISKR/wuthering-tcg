// src/components/battle/phone/PhoneBattleBoard.tsx
// [모바일 4단계] 가로 폰(phone-landscape) 전용 전장: 상대 진영 | 대결 | 내 진영 3열 + 하단 손패.
// 설계서: _docs/모바일_전투UI_반응형_설계서_2026-11-11.md 2-2절
//
// 기존 OpponentFieldArea / CenterClashArena / PlayerFieldArea 가 받는 props 를 그대로 받아,
// 각 슬롯·존의 노출 조건과 클릭 동작을 기존 컴포넌트와 같은 식으로 계산해 열 컴포넌트에 넘긴다.
// 손패는 PlayerHandDock(phoneLayout)이 살짝 보임 띠 / 펼침 패널로 그린다 (5단계).
import React, { memo } from 'react';
import type { AnyCard } from '../../../types/tcg';
import type { OpponentFieldAreaProps } from '../OpponentFieldArea';
import type { PlayerFieldAreaProps } from '../PlayerFieldArea';
import type { CenterClashArenaProps } from '../CenterClashArena';
import { PlayerHandDock, type PlayerHandDockProps } from '../PlayerHandDock';
import { PhoneFieldColumn, type PhoneSlotModel, type SlotKey } from './PhoneFieldColumn';
import { PhoneClashColumn } from './PhoneClashColumn';

export interface PhoneBattleBoardProps {
  opponentFieldProps: OpponentFieldAreaProps;
  centerClashProps: CenterClashArenaProps;
  playerFieldProps: PlayerFieldAreaProps;
  playerHandProps: PlayerHandDockProps;
  setShowMobileCardModal: (show: boolean) => void;
  /** 퀵 액션 버튼(카드·로그·배틀 선언·턴 종료·패스 등). 손패 띠 오른쪽에 붙는다 (6단계) */
  quickActions?: React.ReactNode;
}


function buildOpponentModel(o: OpponentFieldAreaProps) {
  const { otherPlayer, oppPlayerIndex, gameState } = o;
  const isSolo = gameState.gameMode === 'SOLO_DUAL';
  const isOwnerActive = gameState.activePlayerIndex === oppPlayerIndex;
  // 기존 CharacterSlot 버튼 노출: !isAi && canUpgrade && isOwnerActive / !isAi && !isLeader && canSwitch && isOwnerActive
  const canSwitch =
    !o.isActionLockedByModal && isSolo && !otherPlayer.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && isOwnerActive;

  const slot = (key: SlotKey): PhoneSlotModel => {
    const canUpgrade = isSolo ? o.checkCanUpgradeSlot(key, oppPlayerIndex) : false;
    const card = otherPlayer.slots[key];
    return {
      showUpgrade: !otherPlayer.isAi && canUpgrade && isOwnerActive,
      showSwitch: key !== 'leader' && !otherPlayer.isAi && canSwitch && isOwnerActive,
      onCardClick: () => {
        if (isSolo && gameState.phase === 'ACTION_PHASE' && isOwnerActive && o.checkCanUpgradeSlot(key, oppPlayerIndex)) {
          o.openUpgradeModal(key, oppPlayerIndex);
        } else if (card) {
          o.setEvolutionModalChar(card);
        }
      },
      onUpgrade: () => {
        if (isSolo) o.openUpgradeModal(key, oppPlayerIndex);
      },
      onSwitch: () => {
        if (isSolo && key !== 'leader') o.onSwitchLeaderWithSound(oppPlayerIndex, key);
      },
    };
  };

  // 공개된 상대 손패 (기존 OpponentFieldArea 와 같은 조건)
  const pendingRevealIds = new Set<string>();
  for (const ch of [...(gameState.pendingChoice ? [gameState.pendingChoice] : []), ...(gameState.pendingChoiceQueue || []), ...(gameState.deferredChoices || [])]) {
    if (ch?.isPublicReveal && ch.onResolveType === 'VIEW_ONLY') ch.revealedCards.forEach((rc) => pendingRevealIds.add(rc.id));
  }
  const revealedHand = otherPlayer.hand.filter((c) => Boolean(c.isRevealed) || pendingRevealIds.has(c.id));

  const oppTime = o.myPlayerIndex === 0 ? o.p1TotalTime : o.p0TotalTime;
  return {
    player: otherPlayer,
    clock:
      o.isMultiplayer && o.timeLimitConfig.hasTimeLimit
        ? { text: o.formatChessTime(oppTime), urgent: oppTime <= 30, active: !o.isCurrentControlledTurn }
        : null,
    healAlert: o.oppHealAlert,
    damageAlert: o.oppDamageAlert,
    onHpClick: () => o.setIsHpHistoryModalOpen(true),
    slots: { leftSupport: slot('leftSupport'), leader: slot('leader'), rightSupport: slot('rightSupport') },
    zones: {
      characterDeck: {
        count: otherPlayer.characterDeck.length,
        onClick: isSolo || !otherPlayer.isAi ? () => o.openCardListModal('CHARACTER', oppPlayerIndex) : undefined,
      },
      concerto: { count: otherPlayer.concertoZone.length, onClick: () => o.openCardListModal('CONCERTO', oppPlayerIndex) },
      actionDeck: { count: otherPlayer.actionDeck.length },
      trash: { count: otherPlayer.dropZone.length, onClick: () => o.openCardListModal('TRASH', oppPlayerIndex) },
    },
    revealedHand,
    onPreview: (c: AnyCard) => o.setPreviewCard(c),
  };
}

function buildPlayerModel(m: PlayerFieldAreaProps) {
  const { activeControlledPlayer: me, myPlayerIndex, gameState, isCurrentControlledTurn } = m;
  const canSwitch =
    !m.isSpectator && !m.isActionLockedByModal && !me.actionFlags.switchedLeader && gameState.phase === 'ACTION_PHASE' && isCurrentControlledTurn;

  const slot = (key: SlotKey): PhoneSlotModel => {
    const canUpgrade = m.checkCanUpgradeSlot(key, myPlayerIndex);
    const card = me.slots[key];
    return {
      showUpgrade: canUpgrade && isCurrentControlledTurn,
      showSwitch: key !== 'leader' && canSwitch,
      onCardClick: () => {
        if (gameState.phase === 'ACTION_PHASE' && isCurrentControlledTurn && m.checkCanUpgradeSlot(key, myPlayerIndex)) {
          m.openUpgradeModal(key, myPlayerIndex);
        } else if (card) {
          m.setEvolutionModalChar(card);
        }
      },
      onUpgrade: () => m.openUpgradeModal(key, myPlayerIndex),
      onSwitch: () => {
        if (key !== 'leader') m.onSwitchLeaderWithSound(myPlayerIndex, key);
      },
    };
  };

  const canDraw =
    !m.isSpectator &&
    gameState.phase === 'DRAW_PHASE' &&
    isCurrentControlledTurn &&
    ((myPlayerIndex === 0 && m.canP0Draw) || (myPlayerIndex === 1 && m.canP1Draw));
  const myTime = myPlayerIndex === 0 ? m.p0TotalTime : m.p1TotalTime;

  return {
    player: me,
    clock:
      m.isMultiplayer && m.timeLimitConfig.hasTimeLimit
        ? { text: m.formatChessTime(myTime), urgent: myTime <= 30, active: isCurrentControlledTurn }
        : null,
    healAlert: m.myHealAlert,
    damageAlert: m.myDamageAlert,
    onHpClick: () => m.setIsHpHistoryModalOpen(true),
    slots: { leftSupport: slot('leftSupport'), leader: slot('leader'), rightSupport: slot('rightSupport') },
    zones: {
      characterDeck: { count: me.characterDeck.length, onClick: () => m.openCardListModal('CHARACTER', myPlayerIndex) },
      concerto: { count: me.concertoZone.length, onClick: () => m.openCardListModal('CONCERTO', myPlayerIndex) },
      actionDeck: { count: me.actionDeck.length, onClick: m.handleDrawCardClick, highlight: canDraw },
      trash: { count: me.dropZone.length, onClick: () => m.openCardListModal('TRASH', myPlayerIndex) },
    },
    onPreview: (c: AnyCard) => m.setPreviewCard(c),
  };
}

export const PhoneBattleBoard: React.FC<PhoneBattleBoardProps> = memo(
  ({ opponentFieldProps, centerClashProps, playerFieldProps, playerHandProps, setShowMobileCardModal, quickActions }) => {
    const opp = buildOpponentModel(opponentFieldProps);
    const me = buildPlayerModel(playerFieldProps);
    const showDetail = (card: AnyCard) => {
      centerClashProps.setPreviewCard(card);
      setShowMobileCardModal(true);
    };

    return (
      <div
        data-phone-board
        className="flex-1 min-h-0 min-w-0 flex flex-col gap-1 bg-[#060810]"
        style={{
          paddingLeft: 'max(4px, env(safe-area-inset-left))',
          paddingRight: 'max(4px, env(safe-area-inset-right))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex-1 min-h-0 grid gap-1 pt-1" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1fr)' }}>
          <PhoneFieldColumn side="opponent" {...opp} onShowDetail={showDetail} />
          <PhoneClashColumn {...centerClashProps} onShowCard={showDetail} />
          <PhoneFieldColumn side="me" {...me} onShowDetail={showDetail} />
        </div>

        {/* 하단 줄: 손패 살짝 보임 띠(56px) | 퀵 액션 버튼.
            손패 펼침 패널(뒤 보드 어둡게)이 열려도 퀵 액션은 그 위(z-40)에 남아 패스·턴 종료를 누를 수 있다. */}
        <div className="shrink-0 flex items-end gap-1 min-w-0">
          <div data-phone-hand className="flex-1 min-w-0">
            <PlayerHandDock {...playerHandProps} phoneLayout />
          </div>
          {quickActions && (
            <div data-phone-quick-actions className="relative z-40 shrink-0 h-14 flex items-center gap-1 pl-1 border-t border-[#f97316]/40 bg-[#080c17]">
              {quickActions}
            </div>
          )}
        </div>
      </div>
    );
  }
);
