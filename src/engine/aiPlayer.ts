import { GameState, ActionCard, PlayerState, CharacterCard, CardColor } from '../types/tcg';
import {
  upgradeCharacter,
  switchLeader,
  chargeConcerto,
  decideClash,
  executeComboAttack,
  finishComboStep,
  discardOverflowCards,
  canLeaderUseCard,
  findEvolutionCard,
} from './gameEngine';

// ==========================================================
// AI 난이도 / 전략 레벨
//  - BASIC : 초기 버전 (규칙 준수형 단순 휴리스틱) - 비교/회귀 테스트용으로 유지
//  - SMART : 상성(가위바위보) 확률 추정 + 리더 최적 교대 + 자원 관리형 AI (기본값)
// ==========================================================
export type AiLevel = 'BASIC' | 'SMART' | 'SMART_ALT'; // SMART_ALT: 파라미터 튜닝 A/B 비교용 (동일 로직, 별도 파라미터)
export const DEFAULT_AI_LEVEL: AiLevel = 'SMART';

type SlotKey = 'leader' | 'leftSupport' | 'rightSupport';
const SLOT_KEYS: SlotKey[] = ['leader', 'leftSupport', 'rightSupport'];

// 튜닝 가능한 SMART AI 파라미터 (자동 시뮬레이션으로 보정됨)
export const SMART_PARAMS = {
  upgradeMinHandAfter: 7, // 레벨업 후 최소 남겨야 할 패 수
  costPenalty: 0.9, // 협주(코스트) 1 소모당 가치 손실
  lossCost: { RED: 4.5, GREEN: 2.4, BLUE: 1.6 } as Record<CardColor, number>,
  noise: 0.35, // 읽히지 않도록 EV 근접 시 섞는 랜덤 폭
  comboMinDmgPerCost: 1.5, // 연격에서 코스트 대비 최소 효율
  concertoTarget: 3, // 협주 존 목표 장수
  mulliganKeepHeavy: 2, // 멀리건 시 보유할 코스트 2+ 카드 수
  mulliganMaxSwap: 3, // 멀리건 교체 최대 장수
  oppModelWeight: 0, // 상대 묘지 색상 분포 반영 강도 (0 = 균등 추정)
};

export const SMART_ALT_PARAMS: typeof SMART_PARAMS = { ...SMART_PARAMS, lossCost: { ...SMART_PARAMS.lossCost } };
function paramsFor(level: AiLevel) {
  return level === 'SMART_ALT' ? SMART_ALT_PARAMS : SMART_PARAMS;
}

// ----------------------------------------------------------
// 공통 헬퍼
// ----------------------------------------------------------
const other = (idx: 0 | 1): 0 | 1 => (idx === 0 ? 1 : 0);

function canPlay(p: PlayerState, c: ActionCard, leader: CharacterCard = p.slots.leader): boolean {
  return p.concertoZone.length >= c.cost && canLeaderUseCard(leader, c);
}

function comboCostOf(p: PlayerState, c: ActionCard): number {
  if (p.slots.leader.characterName === '금희' && p.slots.leader.level >= 1) return Math.max(0, c.cost - 1);
  return c.cost;
}

// ----------------------------------------------------------
// 멀리건
// ----------------------------------------------------------
export function decideAiMulligan(aiPlayer: PlayerState, level: AiLevel = DEFAULT_AI_LEVEL): string[] {
  const discardIds: string[] = [];
  const MP = paramsFor(level);
  if (level === 'BASIC') {
    aiPlayer.hand.forEach((card) => {
      if (card.cost >= 2 && discardIds.length < 2) discardIds.push(card.id);
    });
    return discardIds;
  }

  // SMART: 초반엔 협주가 0이므로 코스트 높은 카드는 당장 못 쓴다.
  //        단, 고효율 피니셔(코스트 2~3)는 1장 정도 보유하는 것이 좋다 → 2장 이상일 때만 초과분 교체.
  const heavy = aiPlayer.hand.filter((c) => c.cost >= 2).sort((a, b) => b.cost - a.cost);
  heavy.slice(MP.mulliganKeepHeavy).forEach((c) => {
    if (discardIds.length < MP.mulliganMaxSwap) discardIds.push(c.id);
  });
  return discardIds;
}

// ----------------------------------------------------------
// 카드/캐릭터 가치 평가 (SMART)
// ----------------------------------------------------------
function cardRawValue(c: ActionCard, leader: CharacterCard | undefined): number {
  let dmg = c.damage;
  if (leader?.characterName === '금희' && c.color === 'RED') dmg += 1 + (leader.level === 2 ? 1 : 0);
  let v = dmg;
  let combo = (c.color === 'RED' ? 1 : 0) + (c.pursuitCount ?? 0);
  if (leader?.characterName === '치샤' && leader.level >= 1) combo += 1;
  v += Math.min(combo, 4) * 1.1;
  if (c.effectType === 'DRAW') v += 1.5;
  if (c.effectType === 'HEAL') v += 1.5;
  if (c.effectType === 'CHARGE') v += 2;
  if (c.color === 'BLUE') v += 1.0; // 상대 연격 봉쇄 가치
  return v;
}

// 손패 한 장의 "보유 가치" (충전/버림 선택에 사용): 낮을수록 먼저 소비
function cardKeepValue(p: PlayerState, c: ActionCard): number {
  // 세 캐릭터 중 하나가 리더가 될 수 있으므로 현재 리더 + 서포터 모두 고려
  let best = 0;
  let usableByAny = false;
  for (const k of SLOT_KEYS) {
    const ch = p.slots[k];
    if (!ch) continue;
    if (canLeaderUseCard(ch, c)) {
      usableByAny = true;
      const w = k === 'leader' ? 1 : 0.65;
      best = Math.max(best, cardRawValue(c, ch) * w);
    }
  }
  if (!usableByAny) return -1; // 아무도 못 쓰는 카드 (완전한 데드 카드)
  // 고코스트 카드는 협주가 부족하면 가치 하락
  const afford = p.concertoZone.length >= c.cost ? 1 : 0.8;
  return best * afford - c.cost * 0.1;
}

function opponentColorProbs(state: GameState, idx: 0 | 1, level: AiLevel): Record<CardColor, number> {
  const w = paramsFor(level).oppModelWeight;
  const opp = state.players[other(idx)];
  const probs: Record<CardColor, number> = { RED: 1.6, GREEN: 1.1, BLUE: 0.9 }; // 사전 확률(라플라스 평활)
  // 공개 정보: 상대 묘지에 쌓인 사용 카드 색상 분포
  opp.dropZone.forEach((c) => {
    if (c.kind === 'ACTION') probs[(c as ActionCard).color] += w;
  });
  // 상대 리더에 사용 가능한 카드가 많은 색상이 유력하나 손패는 비공개이므로 약하게 반영
  const leaderName = opp.slots.leader.characterName;
  if (leaderName === '치샤' || leaderName === '금희') probs.RED += 0.6;
  if (leaderName === '산화') probs.BLUE += 0.6;
  if (leaderName === '방랑자') probs.GREEN += 0.4;
  const sum = probs.RED + probs.GREEN + probs.BLUE;
  return { RED: probs.RED / sum, GREEN: probs.GREEN / sum, BLUE: probs.BLUE / sum };
}

const BEATS: Record<CardColor, CardColor> = { RED: 'GREEN', GREEN: 'BLUE', BLUE: 'RED' };

function effectiveSpeed(p: PlayerState, c: ActionCard): number {
  let s = c.speed ?? 0;
  if (p.slots.leader.characterName === '치샤' && c.color === 'RED') s += 1;
  if (p.slots.leader.characterName === '금희' && p.slots.leader.level === 2 && c.color === 'RED') s += 1;
  return s;
}

// 속도 대결 승리 확률 추정 (상대 평균 속도 ≈ 색상별 기대치)
function speedWinProb(mySpeed: number, color: CardColor, iAmActive: boolean): number {
  const oppAvg = color === 'RED' ? 8 : 7;
  const p = 0.5 + (mySpeed - oppAvg) * 0.07 + (iAmActive ? 0.08 : -0.02);
  return Math.max(0.08, Math.min(0.92, p));
}

function clashEV(state: GameState, idx: 0 | 1, c: ActionCard, probs: Record<CardColor, number>, level: AiLevel): number {
  const P = paramsFor(level);
  const me = state.players[idx];
  const iAmActive = state.activePlayerIndex === idx;
  const winValue = cardRawValue(c, me.slots.leader);
  const mySpeed = effectiveSpeed(me, c);
  let ev = 0;
  (['RED', 'GREEN', 'BLUE'] as CardColor[]).forEach((k) => {
    const pk = probs[k];
    let pWin = 0;
    let pLose = 0;
    if (BEATS[c.color] === k) pWin = 1;
    else if (BEATS[k] === c.color) pLose = 1;
    else if (c.color === 'BLUE') {
      // BLUE 미러 = 무승부
    } else {
      pWin = speedWinProb(mySpeed, c.color, iAmActive);
      pLose = 1 - pWin;
    }
    ev += pk * (pWin * winValue - pLose * P.lossCost[k]);
  });
  ev -= c.cost * P.costPenalty;
  return ev;
}

// ----------------------------------------------------------
// 액션 단계
// ----------------------------------------------------------
function chooseDiscards(p: PlayerState, n: number, excludeIds: string[] = []): ActionCard[] {
  return [...p.hand]
    .filter((c) => !excludeIds.includes(c.id))
    .sort((a, b) => cardKeepValue(p, a) - cardKeepValue(p, b))
    .slice(0, n);
}

// 리더 후보 슬롯의 "이번 대결 가치"
function leaderScore(p: PlayerState, ch: CharacterCard): number {
  const playable = p.hand.filter((c) => canPlay(p, c, ch));
  if (playable.length === 0) return -5 + ch.level * 0.2;
  const vals = playable.map((c) => cardRawValue(c, ch) - c.cost * 0.3).sort((a, b) => b - a);
  let s = vals[0] + 0.35 * (vals[1] ?? 0) + 0.15 * playable.length;
  // 캐릭터 레벨 특성 보너스
  const name = ch.characterName;
  const lv = ch.level;
  if (name === '치샤') s += 0.4 + (lv >= 1 ? 0.8 : 0) + (lv >= 2 ? 0.6 : 0);
  if (name === '금희') s += 0.8 + (lv >= 1 ? 0.5 : 0) + (lv >= 2 ? 1.0 : 0);
  if (name === '산화') s += (lv >= 1 ? 0.7 : 0) + (lv >= 2 ? 1.2 : 0);
  if (name === '양양') s += 0.6 + (lv >= 1 ? 0.6 : 0);
  if (name === '방랑자') s += (lv >= 1 ? 0.3 : 0) + (lv >= 2 ? 0.8 : 0);
  return s;
}

function smartActionPhase(state: GameState, idx: 0 | 1, level: AiLevel): GameState {
  const P = paramsFor(level);
  let cur = state;
  let p = cur.players[idx];

  // 1. 협주 충전 (먼저: 충전 후 리더/업그레이드 판단이 정확해진다)
  const doCharge = () => {
    p = cur.players[idx];
    if (p.actionFlags.chargedConcerto || p.hand.length < 2) return;
    const wantMore = p.concertoZone.length < P.concertoTarget || p.hand.length > 6;
    if (!wantMore) return;
    const [worst] = chooseDiscards(p, 1);
    if (!worst) return;
    // 충분히 가치 있는 카드를 협주로 소모하지 않는다 (단, 패가 넘치면 허용)
    if (cardKeepValue(p, worst) > 4.5 && p.hand.length <= 6) return;
    const res = chargeConcerto(cur, idx, worst.id);
    if (res.success) cur = res.newState;
  };

  // 2. 레벨업: 여유 패가 있고 업그레이드가 의미 있을 때
  p = cur.players[idx];
  if (!p.actionFlags.upgraded) {
    let bestSlot: SlotKey | null = null;
    let bestScore = -Infinity;
    let bestUpgrade: CharacterCard | null = null;
    for (const k of SLOT_KEYS) {
      const ch = p.slots[k];
      if (!ch || ch.level >= 2) continue;
      const up = findEvolutionCard(p.characterDeck, ch);
      if (!up) continue;
      let req = up.level;
      const hasYang2 = SLOT_KEYS.some((s) => p.slots[s]?.characterName === '양양' && p.slots[s]?.level === 2);
      if (hasYang2 && req > 1) req -= 1;
      if (p.hand.length - req < P.upgradeMinHandAfter) continue;
      // 업그레이드 이득: 해당 캐릭터를 리더로 세웠을 때의 점수 상승 + 현재 리더 보너스
      const gain = leaderScore(p, { ...ch, level: up.level } as CharacterCard) - leaderScore(p, ch) + 1.2;
      const isLeader = k === 'leader' ? 0.8 : 0;
      const score = gain + isLeader - req * 0.9;
      if (score > bestScore) {
        bestScore = score;
        bestSlot = k;
        bestUpgrade = up;
      }
    }
    if (bestSlot && bestUpgrade && bestScore > 0) {
      let req = bestUpgrade.level;
      const hasYang2 = SLOT_KEYS.some((s) => p.slots[s]?.characterName === '양양' && p.slots[s]?.level === 2);
      if (hasYang2 && req > 1) req -= 1;
      const discards = chooseDiscards(p, req).map((c) => c.id);
      const res = upgradeCharacter(cur, idx, bestSlot, bestUpgrade.id, discards);
      if (res.success) cur = res.newState;
    }
  }

  doCharge();

  // 3. 리더 교대: 이번 손패로 가장 강한 리더 선택 (교대는 무료 / 턴당 1회)
  p = cur.players[idx];
  if (!p.actionFlags.switchedLeader) {
    const curScore = leaderScore(p, p.slots.leader);
    let bestKey: SlotKey = 'leader';
    let bestScore = curScore;
    (['leftSupport', 'rightSupport'] as const).forEach((k) => {
      const ch = p.slots[k];
      if (!ch) return;
      const s = leaderScore(p, ch);
      if (s > bestScore + 0.25) {
        bestScore = s;
        bestKey = k;
      }
    });
    if (bestKey !== 'leader') {
      const res = switchLeader(cur, idx, bestKey as 'leftSupport' | 'rightSupport');
      if (res.success) cur = res.newState;
    }
  }

  // 4. 대결 선언: 낼 수 있는 카드가 있어야 한다. (카드 없이 선언하면 상대에게 공짜 승리를 준다)
  p = cur.players[idx];
  const usable = p.hand.filter((c) => canPlay(p, c));
  if (usable.length > 0) return decideClash(cur, true);
  return decideClash(cur, false);
}

// ----------------------------------------------------------
// BASIC (초기 버전 로직 - 플레이어 인덱스만 일반화)
// ----------------------------------------------------------
function basicActionPhase(state: GameState, aiIdx: 0 | 1): GameState {
  let currentState = { ...state };
  const ai = currentState.players[aiIdx];

  if (!ai.actionFlags.upgraded && ai.hand.length >= 3) {
    for (const slotKey of SLOT_KEYS) {
      const currentCh = ai.slots[slotKey];
      if (!currentCh) continue;
      const nextLevel = (currentCh.level + 1) as 1 | 2;
      const upgradeCard = ai.characterDeck.find(
        (c) => c.characterName === currentCh.characterName && c.level === nextLevel
      );
      if (upgradeCard) {
        const discardCandidates = [...ai.hand].sort((a, b) => b.cost - a.cost);
        const requiredCount = upgradeCard.level;
        if (discardCandidates.length >= requiredCount) {
          const discardIds = discardCandidates.slice(0, requiredCount).map((c) => c.id);
          const upgradeRes = upgradeCharacter(currentState, aiIdx, slotKey, upgradeCard.id, discardIds);
          if (upgradeRes.success) {
            currentState = upgradeRes.newState;
            break;
          }
        }
      }
    }
  }

  const updatedAi = currentState.players[aiIdx];
  if (!updatedAi.actionFlags.chargedConcerto && updatedAi.concertoZone.length < 2 && updatedAi.hand.length >= 2) {
    const chargeCard = updatedAi.hand.find((c) => c.cost === 0) || updatedAi.hand[0];
    if (chargeCard) {
      const chargeRes = chargeConcerto(currentState, aiIdx, chargeCard.id);
      if (chargeRes.success) currentState = chargeRes.newState;
    }
  }

  const reUpdatedAi = currentState.players[aiIdx];
  if (!reUpdatedAi.actionFlags.switchedLeader) {
    const currentLeader = reUpdatedAi.slots.leader;
    const leftSup = reUpdatedAi.slots.leftSupport;
    const rightSup = reUpdatedAi.slots.rightSupport;
    if (leftSup && leftSup.level > currentLeader.level) {
      const r = switchLeader(currentState, aiIdx, 'leftSupport');
      if (r.success) currentState = r.newState;
    } else if (rightSup && rightSup.level > currentLeader.level) {
      const r = switchLeader(currentState, aiIdx, 'rightSupport');
      if (r.success) currentState = r.newState;
    }
  }

  const finalAi = currentState.players[aiIdx];
  const usableCards = finalAi.hand.filter((c) => canPlay(finalAi, c));
  if (usableCards.length > 0 || finalAi.hand.length >= 2 || finalAi.hp <= 5) {
    currentState = decideClash(currentState, true);
  } else {
    currentState = decideClash(currentState, false);
  }
  return currentState;
}

// AI 액션 단계 전체 턴 실행
export function runAiActionPhase(state: GameState, idx: 0 | 1 = 1, level: AiLevel = DEFAULT_AI_LEVEL): GameState {
  return level === 'BASIC' ? basicActionPhase(state, idx) : smartActionPhase(state, idx, level);
}

// ----------------------------------------------------------
// 대결 카드 선택
// ----------------------------------------------------------
export function selectAiClashCard(state: GameState, idx: 0 | 1 = 1, level: AiLevel = DEFAULT_AI_LEVEL): string | null {
  const ai = state.players[idx];
  const usableCards = ai.hand.filter((c) => canPlay(ai, c));
  if (usableCards.length === 0) return null;

  if (level === 'BASIC') {
    const leaderName = ai.slots.leader.characterName || ai.slots.leader.nameKr;
    let preferredColor: CardColor = 'RED';
    if (leaderName.includes('산화')) preferredColor = 'BLUE';
    else if (leaderName.includes('방랑자')) preferredColor = 'GREEN';
    const matched = usableCards.find((c) => c.color === preferredColor);
    if (matched) return matched.id;
    usableCards.sort((a, b) => b.damage + (b.speed ?? 0) - (a.damage + (a.speed ?? 0)));
    return usableCards[0].id;
  }

  const probs = opponentColorProbs(state, idx, level);
  const scored = usableCards.map((c) => ({
    c,
    ev: clashEV(state, idx, c, probs, level) + (Math.random() - 0.5) * 2 * paramsFor(level).noise,
  }));
  scored.sort((a, b) => b.ev - a.ev);
  return scored[0].c.id;
}

// ----------------------------------------------------------
// 연격 단계 (1회 공격 후 반환)
// ----------------------------------------------------------
export function runAiComboStep(state: GameState, idx: 0 | 1 = 1, level: AiLevel = DEFAULT_AI_LEVEL): GameState {
  const currentState = { ...state };
  if (currentState.phase !== 'COMBO_STEP' || currentState.players[idx].comboCount <= 0) {
    return finishComboStep(currentState, idx);
  }
  const ai = currentState.players[idx];
  const opp = currentState.players[other(idx)];

  const redCards = ai.hand.filter((c) => c.color === 'RED' && ai.concertoZone.length >= comboCostOf(ai, c));
  if (redCards.length === 0) return finishComboStep(currentState, idx);

  let chosen: ActionCard;
  if (level === 'BASIC') {
    redCards.sort((a, b) => b.damage - a.damage);
    chosen = redCards[0];
  } else {
    const bonus = ai.slots.leader.characterName === '치샤' && ai.slots.leader.level === 2 ? 1 : 0;
    const dmgOf = (c: ActionCard) => c.damage + bonus;
    // 치명타 가능하면 최우선
    const lethal = redCards.filter((c) => dmgOf(c) >= opp.hp).sort((a, b) => comboCostOf(ai, a) - comboCostOf(ai, b));
    if (lethal.length > 0) {
      chosen = lethal[0];
    } else {
      // 코스트 대비 효율이 낮은 공격은 협주를 아끼기 위해 생략 (단, 코스트 0은 무조건 이득)
      const efficient = redCards
        .map((c) => ({ c, d: dmgOf(c), cost: comboCostOf(ai, c) }))
        .filter((x) => x.d > 0 && (x.cost === 0 || x.d / x.cost >= paramsFor(level).comboMinDmgPerCost));
      if (efficient.length === 0) return finishComboStep(currentState, idx);
      // 비용 대비 효율 → 같은 효율이면 높은 대미지
      efficient.sort((a, b) => {
        const ra = a.cost === 0 ? 99 : a.d / a.cost;
        const rb = b.cost === 0 ? 99 : b.d / b.cost;
        return rb - ra || b.d - a.d;
      });
      chosen = efficient[0].c;
    }
  }

  const res = executeComboAttack(currentState, idx, chosen.id);
  return res.success ? res.newState : finishComboStep(currentState, idx);
}

// ----------------------------------------------------------
// 패 상한(8장 초과) 버리기
// ----------------------------------------------------------
export function runAiDiscardOverflow(state: GameState, idx: 0 | 1 = 1, level: AiLevel = DEFAULT_AI_LEVEL): GameState {
  const ai = state.players[idx];
  const excess = ai.hand.length - 8;
  if (excess <= 0) return state;

  let discardIds: string[];
  if (level === 'BASIC') {
    discardIds = [...ai.hand].sort((a, b) => b.cost - a.cost).slice(0, excess).map((c) => c.id);
  } else {
    discardIds = chooseDiscards(ai, excess).map((c) => c.id);
  }
  const res = discardOverflowCards(state, idx, discardIds);
  return res.success ? res.newState : state;
}




