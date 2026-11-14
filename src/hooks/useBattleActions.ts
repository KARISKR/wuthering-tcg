// src/hooks/useBattleActions.ts
// [WP8-6] 배틀 액션 발동 핸들러 및 모달 오픈 헬퍼 훅 (GameBoard 슬림화)
import { useCallback } from 'react';
import { GameState } from '../types/tcg';
import { BattleStore } from '../battle/store';
import {
  isIntroSkillCard,
  isComboDiscardBonusCard,
  findAllUpgradableCards,
  getEffectiveCardCost,
  canPlayerUseActionCard,
} from '../engine/gameEngine';
import { soundEffects } from '../utils/soundEffects';

export interface UseBattleActionsParams {
  gameState: GameState;
  battleStore: BattleStore;
  isSpectator: boolean;
  isActionLockedByModal: boolean;
  lastDrawDismissTimeRef: React.MutableRefObject<number>;
  handleSetClashCard: (playerIndex: 0 | 1, cardId: string | null) => void;
  handleComboAttack: (playerIndex: 0 | 1, cardId: string) => void;
  selectedOverflowIds: string[];
  setSelectedOverflowIds: (val: string[] | ((prev: string[]) => string[])) => void;
  handleSwitchLeader: (playerIndex: 0 | 1, slotName: 'leftSupport' | 'rightSupport') => void;
}

export function useBattleActions({
  gameState,
  battleStore,
  isSpectator,
  isActionLockedByModal,
  lastDrawDismissTimeRef,
  handleSetClashCard,
  handleComboAttack,
  selectedOverflowIds,
  setSelectedOverflowIds,
  handleSwitchLeader,
}: UseBattleActionsParams) {
  // [공식 룰] 대결 세트 시 블라인드 즉시 세트
  const requestSetClashCard = useCallback((playerIndex: 0 | 1, cardId: string | null) => {
    if (isSpectator || isActionLockedByModal) return;
    if (Date.now() - lastDrawDismissTimeRef.current < 500) return;
    if (!cardId) {
      handleSetClashCard(playerIndex, null);
      return;
    }
    const player = gameState.players[playerIndex];
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) return;

    const effectiveCost = getEffectiveCardCost(player, card);
    if (player.concertoZone.length < effectiveCost) return;
    const cardUsage = canPlayerUseActionCard(player.slots, card, player.actionArea);
    if (!cardUsage.canUse) return;

    handleSetClashCard(playerIndex, card.id);
  }, [isSpectator, isActionLockedByModal, lastDrawDismissTimeRef, handleSetClashCard, gameState.players]);

  // 연격 공격 시 코스트 지불 및 변주 스킬 분기
  const requestComboAttack = useCallback((playerIndex: 0 | 1, cardId: string) => {
    if (isSpectator || isActionLockedByModal) return;
    const player = gameState.players[playerIndex];
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) return;

    const effectiveCost = getEffectiveCardCost(player, card);
    if (effectiveCost > 0) {
      battleStore.setState({
        concertoModalState: {
          isOpen: true,
          targetCard: card,
          requiredCost: effectiveCost,
          actionType: 'COMBO',
          playerIndex,
        },
      });
    } else if (isIntroSkillCard(card) && !player.actionFlags.leaderSwapLockedThisTurn) {
      battleStore.setState({
        introSwapModalState: {
          isOpen: true,
          targetCard: card,
          spentConcertoIds: undefined,
          playerIndex,
        },
      });
    } else if (isComboDiscardBonusCard(card) && player.hand.length > 1) {
      // 소리의 변화·강공격: 버릴 패를 고르게 한다 (예전에는 화면이 버릴 카드를 넘기지 않아 사람은 +1 효과를 못 썼다)
      battleStore.setState({
        comboDiscardModalState: { isOpen: true, targetCard: card, spentConcertoIds: undefined, playerIndex },
      });
    } else {
      handleComboAttack(playerIndex, card.id);
    }
  }, [isSpectator, isActionLockedByModal, gameState.players, battleStore, handleComboAttack]);

  // 카드 목록 뷰어 모달 열기
  const openCardListModal = useCallback((type: 'TRASH' | 'CONCERTO' | 'CHARACTER', playerIndex: 0 | 1) => {
    const player = gameState.players[playerIndex];
    const cards =
      type === 'TRASH'
        ? player.dropZone
        : type === 'CONCERTO'
        ? player.concertoZone
        : player.characterDeck;
    const title = `${player.name}의 ${
      type === 'TRASH'
        ? '트래시 에리어 (묘지)'
        : type === 'CONCERTO'
        ? '협주 에리어 (에너지)'
        : '캐릭터 덱 (보유 캐릭터)'
    }`;
    battleStore.setState({
      cardListModalState: {
        isOpen: true,
        title,
        type,
        cards,
      },
    });
  }, [gameState.players, battleStore]);

  // 레벨업 모달 열기
  const openUpgradeModal = useCallback((slotName: 'leader' | 'leftSupport' | 'rightSupport', playerIdx: 0 | 1 = 0) => {
    if (isSpectator) return;
    const targetPlayer = gameState.players[playerIdx];
    const currentChar = targetPlayer.slots[slotName];
    if (!currentChar) return;
    if (isActionLockedByModal || targetPlayer.actionFlags.upgraded || gameState.phase !== 'ACTION_PHASE') return;

    const available = findAllUpgradableCards(targetPlayer.characterDeck, currentChar);
    const firstCandidate = available[0];
    const initialTargetLevel = firstCandidate ? firstCandidate.level : ((currentChar.level + 1) as 1 | 2);

    battleStore.setState({
      upgradeTarget: {
        playerIndex: playerIdx,
        slotName,
        char: currentChar,
        available,
        requiredDiscard: initialTargetLevel,
        hasYangyangLv2: false,
      },
    });
  }, [isSpectator, gameState.players, isActionLockedByModal, gameState.phase, battleStore]);

  // 슬롯별 레벨업 가능 여부 체크
  const checkCanUpgradeSlot = useCallback((slotName: 'leader' | 'leftSupport' | 'rightSupport', playerIdx: 0 | 1 = 0) => {
    if (isSpectator) return false;
    const targetPlayer = gameState.players[playerIdx];
    const isPlayerTurn = gameState.activePlayerIndex === playerIdx;
    if (isActionLockedByModal || targetPlayer.actionFlags.upgraded || gameState.phase !== 'ACTION_PHASE' || !isPlayerTurn) return false;
    const currentChar = targetPlayer.slots[slotName];
    if (!currentChar) return false;

    const validCandidates = findAllUpgradableCards(targetPlayer.characterDeck, currentChar);
    if (validCandidates.length === 0) return false;
    const minLevel = Math.min(...validCandidates.map((c) => c.level));
    return targetPlayer.hand.length >= minLevel;
  }, [isSpectator, gameState.players, gameState.activePlayerIndex, isActionLockedByModal, gameState.phase]);

  // 패 상한 버리기 토글
  const toggleOverflowCard = useCallback((cardId: string, handLength: number) => {
    const needed = handLength - 8;
    if (selectedOverflowIds.includes(cardId)) {
      setSelectedOverflowIds(selectedOverflowIds.filter((id) => id !== cardId));
    } else if (selectedOverflowIds.length < needed) {
      setSelectedOverflowIds([...selectedOverflowIds, cardId]);
    }
  }, [selectedOverflowIds, setSelectedOverflowIds]);

  // 리더 교체 시 사운드 재생
  const onSwitchLeaderWithSound = useCallback((playerIndex: 0 | 1, slotName: 'leftSupport' | 'rightSupport') => {
    if (isSpectator || isActionLockedByModal) return;
    const targetCard = gameState.players[playerIndex].slots[slotName];
    if (targetCard) {
      const charName = targetCard.characterName || targetCard.nameKr;
      soundEffects.playLeaderSwitch(charName);
    }
    handleSwitchLeader(playerIndex, slotName);
  }, [isSpectator, isActionLockedByModal, gameState.players, handleSwitchLeader]);

  return {
    requestSetClashCard,
    requestComboAttack,
    openCardListModal,
    openUpgradeModal,
    checkCanUpgradeSlot,
    toggleOverflowCard,
    onSwitchLeaderWithSound,
  };
}
