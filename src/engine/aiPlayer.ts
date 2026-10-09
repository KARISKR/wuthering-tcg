import { GameState, ActionCard, PlayerState } from '../types/tcg';
import {
  upgradeCharacter,
  switchLeader,
  chargeConcerto,
  decideClash,
  setClashCard,
  executeComboAttack,
  finishComboStep,
  discardOverflowCards,
  canLeaderUseCard,
} from './gameEngine';

// AI 멀리건 결정
export function decideAiMulligan(aiPlayer: PlayerState): string[] {
  const discardIds: string[] = [];
  // 코스트가 2 이상인 무거운 카드는 초반 패에서 교체
  aiPlayer.hand.forEach((card) => {
    if (card.cost >= 2 && discardIds.length < 2) {
      discardIds.push(card.id);
    }
  });
  return discardIds;
}

// AI 액션 단계 전체 턴 실행
export function runAiActionPhase(state: GameState): GameState {
  let currentState = { ...state };
  const aiIdx = 1;
  const ai = currentState.players[aiIdx];

  // 1. 레벨업 검토 (패가 3장 이상 여유 있을 때)
  if (!ai.actionFlags.upgraded && ai.hand.length >= 3) {
    const slots: ('leader' | 'leftSupport' | 'rightSupport')[] = ['leader', 'leftSupport', 'rightSupport'];
    for (const slotKey of slots) {
      const currentCh = ai.slots[slotKey];
      if (!currentCh) continue;

      const nextLevel = (currentCh.level + 1) as 1 | 2;
      const upgradeCard = ai.characterDeck.find(
        (c) => c.characterName === currentCh.characterName && c.level === nextLevel
      );

      if (upgradeCard) {
        // 버릴 카드 선정 (가장 코스트가 높거나 덜 유용한 카드)
        const discardCandidates = [...ai.hand].sort((a, b) => b.cost - a.cost);
        const requiredCount = upgradeCard.level; // Lv.1이면 1장, Lv.2면 2장

        if (discardCandidates.length >= requiredCount) {
          const discardIds = discardCandidates.slice(0, requiredCount).map((c) => c.id);
          const upgradeRes = upgradeCharacter(currentState, aiIdx, slotKey, upgradeCard.id, discardIds);
          if (upgradeRes.success) {
            currentState = upgradeRes.newState;
            break; // 한 턴 1회 제한
          }
        }
      }
    }
  }

  // 2. 협주 충전 검토 (협주 카드가 2장 미만이고 패가 2장 이상일 때)
  const updatedAi = currentState.players[aiIdx];
  if (!updatedAi.actionFlags.chargedConcerto && updatedAi.concertoZone.length < 2 && updatedAi.hand.length >= 2) {
    // 0코스트나 중복 카드 중 1장 충전
    const chargeCard = updatedAi.hand.find((c) => c.cost === 0) || updatedAi.hand[0];
    if (chargeCard) {
      const chargeRes = chargeConcerto(currentState, aiIdx, chargeCard.id);
      if (chargeRes.success) {
        currentState = chargeRes.newState;
      }
    }
  }

  // 3. 리더 교대 검토 (후방 서포터가 더 높은 레벨이거나 리더가 Lv.0인데 서포터가 Lv.1/2일 때)
  const reUpdatedAi = currentState.players[aiIdx];
  if (!reUpdatedAi.actionFlags.switchedLeader) {
    const currentLeader = reUpdatedAi.slots.leader;
    const leftSup = reUpdatedAi.slots.leftSupport;
    const rightSup = reUpdatedAi.slots.rightSupport;

    if (leftSup && leftSup.level > currentLeader.level) {
      const switchRes = switchLeader(currentState, aiIdx, 'leftSupport');
      if (switchRes.success) {
        currentState = switchRes.newState;
      }
    } else if (rightSup && rightSup.level > currentLeader.level) {
      const switchRes = switchLeader(currentState, aiIdx, 'rightSupport');
      if (switchRes.success) {
        currentState = switchRes.newState;
      }
    }
  }

  // 4. 대결(Clash) 여부 결정
  // AI 패에 사용 가능한 액션 카드가 최소 1장이라도 있거나 패가 여유 있으면 적극적으로 배틀 진행
  const finalAi = currentState.players[aiIdx];
  const usableCards = finalAi.hand.filter((c) => {
    const hasCost = finalAi.concertoZone.length >= c.cost;
    const meetsLeader = canLeaderUseCard(finalAi.slots.leader, c);
    return hasCost && meetsLeader;
  });

  if (usableCards.length > 0 || finalAi.hand.length >= 2 || finalAi.hp <= 5) {
    currentState = decideClash(currentState, true);
  } else {
    // 낼 카드도 없고 위험하면 패스
    currentState = decideClash(currentState, false);
  }

  return currentState;
}

// AI 대결 카드 세트
export function selectAiClashCard(state: GameState): string | null {
  const ai = state.players[1];
  const usableCards = ai.hand.filter((c) => {
    const hasCost = ai.concertoZone.length >= c.cost;
    const meetsLeader = canLeaderUseCard(ai.slots.leader, c);
    return hasCost && meetsLeader;
  });

  if (usableCards.length === 0) {
    return null;
  }

  // 전략적 선택:
  // 1. 자신의 리더 특성에 맞는 카드 우선
  // 예: 리더가 치샤/금희 -> RED 우선
  // 리더가 산화 -> BLUE 우선
  // 리더가 방랑자 -> GREEN 우선
  const leaderName = ai.slots.leader.characterName || ai.slots.leader.nameKr;

  let preferredColor: 'RED' | 'GREEN' | 'BLUE' = 'RED';
  if (leaderName.includes('산화')) preferredColor = 'BLUE';
  else if (leaderName.includes('방랑자')) preferredColor = 'GREEN';
  else if (leaderName.includes('치샤') || leaderName.includes('금희')) preferredColor = 'RED';

  const matched = usableCards.find((c) => c.color === preferredColor);
  if (matched) return matched.id;

  // 없으면 가장 대미지나 속도가 좋은 카드 선택
  usableCards.sort((a, b) => b.damage + (b.speed ?? 0) - (a.damage + (a.speed ?? 0)));
  return usableCards[0].id;
}

// AI 연격 단계 연속 공격 실행 (1회 공격 실행 후 반환하여 비주얼 연격 연출 지원)
export function runAiComboStep(state: GameState): GameState {
  let currentState = { ...state };
  const aiIdx = 1;

  if (currentState.phase !== 'COMBO_STEP' || currentState.players[aiIdx].comboCount <= 0) {
    return finishComboStep(currentState, aiIdx);
  }

  const ai = currentState.players[aiIdx];
  const redCards = ai.hand.filter((c) => {
    let cost = c.cost;
    if (ai.slots.leader.characterName === '금희' && ai.slots.leader.level >= 1) {
      cost = Math.max(0, cost - 1);
    }
    return c.color === 'RED' && ai.concertoZone.length >= cost;
  });

  if (redCards.length === 0) {
    // 낼 수 있는 빨간 카드가 없으면 연격 종료
    return finishComboStep(currentState, aiIdx);
  }

  // 가장 강력한 빨간 카드 선택
  redCards.sort((a, b) => b.damage - a.damage);
  const chosenCard = redCards[0];

  const comboRes = executeComboAttack(currentState, aiIdx, chosenCard.id);
  if (comboRes.success) {
    return comboRes.newState;
  } else {
    return finishComboStep(currentState, aiIdx);
  }
}

// AI 패 상한(8장 초과) 버리기
export function runAiDiscardOverflow(state: GameState): GameState {
  const ai = state.players[1];
  const excess = ai.hand.length - 8;
  if (excess <= 0) return state;

  // 가장 비용이 높거나 중복된 카드부터 버림
  const sorted = [...ai.hand].sort((a, b) => b.cost - a.cost);
  const discardIds = sorted.slice(0, excess).map((c) => c.id);

  const res = discardOverflowCards(state, 1, discardIds);
  return res.success ? res.newState : state;
}
