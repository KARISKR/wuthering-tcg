import { GameState, ActionCard, PlayerState, CharacterCard, CardColor } from '../types/tcg';
import {
  upgradeCharacter,
  switchLeader,
  chargeConcerto,
  decideClash,
  executeComboAttack,
  finishComboStep,
  discardOverflowCards,
  canPlayerUseActionCard,
  findEvolutionCard,
  slotHasCharacterSkill,
  getAllCardsInSlot,
  getEffectiveCardCost,
  isNormalAttackCard,
  isAerialCard,
  isIntroSkillCard,
  getIntroSkillTargetChar,
  doesCharMatchIntroTarget,
  isLeaderSkillCard,
  isEchoCard,
  getConcertoSonataBonusDamage,
} from './gameEngine';

// ==========================================================
// AI 난이도 / 전략 레벨
//  - BASIC : 초기 버전 (규칙 준수형 단순 휴리스틱) - 비교/회귀 테스트용으로 유지
//  - SMART : 상성 확률 추정 + 무지성 레벨업 방지 + 원턴킬(OTK)/다중 콤보 설계 AI (기본값)
// ==========================================================
export type AiLevel = 'BASIC' | 'SMART' | 'SMART_ALT';
export const DEFAULT_AI_LEVEL: AiLevel = 'SMART';

type SlotKey = 'leader' | 'leftSupport' | 'rightSupport';
const SLOT_KEYS: SlotKey[] = ['leader', 'leftSupport', 'rightSupport'];

export const SMART_PARAMS = {
  upgradeMinHandAfter: 3, // 일반 레벨업 후 최소 남겨야 할 패 수 (무지성 패 소모 방지)
  costPenalty: 0.35, // 협주(코스트) 1 소모당 가치 손실
  lossCost: { RED: 3.4, GREEN: 2.3, BLUE: 1.9 } as Record<CardColor, number>,
  noise: 0.15, // 읽히지 않도록 EV 근접 시 섞는 랜덤 폭
  comboMinDmgPerCost: 0.8, // 연격에서 코스트 대비 최소 효율
  concertoTarget: 2, // 기본 협주 존 목표 장수
  mulliganKeepHeavy: 1, // 멀리건 시 보유할 코스트 2+ 피니셔 수
  mulliganMaxSwap: 3, // 멀리건 교체 최대 장수
  oppModelWeight: 0.25, // 상대 묘지 색상 분포 반영 강도
  charBonusScale: 1.0, // 확장팩(BP01) 캐릭터 고유 스킬 가치 반영 배율
  effectBonusScale: 2.0, // 카드 고유 효과(레벨업/리더교체/회수/드로우) 가치 반영 배율
};

export const SMART_ALT_PARAMS: typeof SMART_PARAMS = {
  ...SMART_PARAMS,
  lossCost: { ...SMART_PARAMS.lossCost },
};

function paramsFor(level: AiLevel) {
  return level === 'SMART_ALT' ? SMART_ALT_PARAMS : SMART_PARAMS;
}

// ----------------------------------------------------------
// 공통 헬퍼 및 유효 코스트/스킬 판별
// ----------------------------------------------------------
const other = (idx: 0 | 1): 0 | 1 => (idx === 0 ? 1 : 0);

function baseCodeOf(code?: string): string {
  return (code || '').split('_')[0];
}

// BP01-062 그늘이의 대폭주 우세 코스트 감소(-1) 및 SD01-016 적색 코스트 페널티(+1)를 모두 반영한 실제 코스트
export function comboCostOf(p: PlayerState, c: ActionCard): number {
  return getEffectiveCardCost(p, c);
}

function canPlay(
  p: PlayerState,
  c: ActionCard,
  leader: CharacterCard = p.slots.leader,
  extraConcerto = 0,
  actionArea: ActionCard[] = p.actionArea || []
): boolean {
  const slots = {
    leader,
    leftSupport: leader === p.slots.leftSupport ? p.slots.leader : p.slots.leftSupport,
    rightSupport: leader === p.slots.rightSupport ? p.slots.leader : p.slots.rightSupport,
  };
  const cost = comboCostOf(p, c);
  return p.concertoZone.length + extraConcerto >= cost && canPlayerUseActionCard(slots, c, actionArea).canUse;
}

// 카드 효과로 무료 레벨업이 가능한 액션 카드 매핑
const LEVELUP_CARD_TARGET: Record<string, string> = {
  'BP01-048': '카멜리아', // 피어난 동백꽃: 배틀 시 카멜리아 레벨업
  'BP01-046': '카멜리아', // 팔천의 춘추: 콤보 교체 시 카멜리아 레벨업
  'BP01-062': '앙코', // 그늘이의 대폭주: 배틀 시 앙코 Lv.2 직행 + 리더 교체
  'BP01-056': '파수인', // 혼돈의 이론: 판정 승리 시 파수인 레벨업
  'BP01-076': '산화', // 매서운 가시: 판정 승리 시 산화 레벨업
};

// 연격을 즉시 종료시키는 피니셔 카드 여부 (반드시 연격 맨 마지막에 사용해야 함!)
function isComboTerminator(c: ActionCard): boolean {
  const code = baseCodeOf(c.code);
  return code === 'BP01-074' || code === 'BP01-061';
}

// 특정 캐릭터 슬롯이 특정 카드 코드를 보유(중첩 포함) 중인지 확인
function slotHasCode(slot: CharacterCard | null | undefined, codePrefix: string): boolean {
  return getAllCardsInSlot(slot).some((c) => baseCodeOf(c.code) === codePrefix);
}

function playerFieldHasCode(p: PlayerState, codePrefix: string): boolean {
  return SLOT_KEYS.some((k) => slotHasCode(p.slots[k], codePrefix));
}

// 【콤보】 전용 효과를 가진 카드인지 판별 (대결 오프너로 소모하지 않고 연격 스텝에서 핵심 활용해야 하는 카드)
function isComboOnlyEffectCard(c: ActionCard): boolean {
  if (isIntroSkillCard(c)) return true;
  const code = baseCodeOf(c.code);
  return (
    code === 'BP01-050' || // 넝쿨의 춤: 【콤보】 일반 공격 2장 이상 시 +1 데미지
    code === 'BP01-065' || // 소리의 변화·강공격(여): 【콤보】 패 1장 버리고 +1 데미지
    code === 'BP01-067' || // 소리의 변화·강공격(남): 【콤보】 패 1장 버리고 +1 데미지
    code === 'BP01-071' || // 복성재우: 【콤보】 직전 카드가 <체공>이면 협주 +1
    code === 'SD02-011'    // 만물의 정화: 【콤보】 액션 에리어 3장 이상 시 +3 데미지
  );
}

// 대결(【배틀】/【판정】)에서만 고유 효과가 발동하는 적색 카드인지 판별 (무지성 연격 덤핑 방지 대상)
function isPureClashEffectRedCard(c: ActionCard): boolean {
  if (c.color !== 'RED') return false;
  const code = baseCodeOf(c.code);
  return (
    code === 'SD01-015' || // 점프: 【판정】 승리 시 1드로우 + 추격 1 (0 데미지)
    code === 'SD01-020' || // 스캔: 【판정】 승리 시 1드로우 + 패 확인 (0 데미지)
    code === 'SD02-020' || // 스캔: 【판정】 승리 시 1드로우 + 패 확인 (0 데미지)
    code === 'BP01-047' || // 육성·강공격: 【판정】 승리 시 1드로우
    code === 'BP01-048' || // 피어난 동백꽃: 【배틀】 카멜리아 레벨업 (스피드 14)
    code === 'BP01-051' || // 회전의 춤: 【판정】 승리 시 1드로우
    code === 'BP01-056' || // 혼돈의 이론: 【판정】 승리 시 파수인 레벨업 (스피드 11)
    code === 'BP01-059' || // 그늘이와 구름이 출격·일반 공격: 【우세】【배틀】 스피드 10
    code === 'BP01-062' || // 그늘이의 대폭주: 【배틀】 앙코 Lv.2 진화 및 리더 교체
    code === 'BP01-066' || // 소리의 변화·공중 공격(여): 【판정】 승리 시 1드로우
    code === 'BP01-068'    // 소리의 변화·공중 공격(남): 【판정】 승리 시 1드로우
  );
}

// <변주 스킬> 카드를 현재 슬롯 상태에서 사용했을 때 고유 변주 보너스가 발동하는지 판별
function canIntroSkillTriggerBonus(
  p: PlayerState,
  slots: { leader: CharacterCard; leftSupport?: CharacterCard | null; rightSupport?: CharacterCard | null },
  c: ActionCard
): boolean {
  if (!isIntroSkillCard(c)) return false;
  const code = baseCodeOf(c.code);
  const targetName = getIntroSkillTargetChar(c);
  if (!targetName) return false;

  // 팔천의 춘추 [BP01-046]: 「카멜리아」가 서포터에서 리더로 교체 진입할 때만 레벨업 발동!
  if (code === 'BP01-046') {
    const camInSup = (['leftSupport', 'rightSupport'] as const).find((k) =>
      doesCharMatchIntroTarget(slots[k], '카멜리아')
    );
    if (!camInSup || !slots[camInSup]) return false;
    const camCard = slots[camInSup]!;
    return Boolean(findEvolutionCard(p.characterDeck, camCard));
  }

  const leaderMatches = doesCharMatchIntroTarget(slots.leader, targetName);
  const supMatches = (['leftSupport', 'rightSupport'] as const).some((k) =>
    doesCharMatchIntroTarget(slots[k], targetName)
  );
  if (!leaderMatches && !supMatches) return false;

  // 계발 [BP01-054]: 파수인 교체 시 생명력 1 회복 (이미 풀피이고 파수인 힐 패시브도 없으면 회복 이득 없음)
  if (code === 'BP01-054' && p.hp >= p.maxHp && !playerFieldHasCode(p, 'BP01-006')) {
    return false;
  }

  // 양들의 도움 [BP01-063]: 앙코 교체 시 트래시에서 <변주 스킬> 외의 앙코 적색 카드 1장 회수
  if (code === 'BP01-063') {
    return p.dropZone.some(
      (dc) =>
        dc.kind === 'ACTION' &&
        (dc as ActionCard).color === 'RED' &&
        (dc as ActionCard).characterExclusive?.includes('앙코') &&
        !isIntroSkillCard(dc as ActionCard)
    );
  }

  return true;
}

// <변주 스킬> 사용 시 교체되어 들어올 최적 서포터 슬롯 반환
function pickIntroSkillSwapSlot(
  p: PlayerState,
  opp: PlayerState,
  slots: { leader: CharacterCard; leftSupport?: CharacterCard | null; rightSupport?: CharacterCard | null },
  c: ActionCard
): 'leftSupport' | 'rightSupport' | null {
  const targetName = getIntroSkillTargetChar(c);
  const matchedSup = (['leftSupport', 'rightSupport'] as const).find((k) =>
    doesCharMatchIntroTarget(slots[k], targetName)
  );
  if (matchedSup && slots[matchedSup]) return matchedSup;

  // 파수인 Lv.1 [BP01-008] 【교체】 스킬을 보유한 서포터가 있다면 우선 고려
  const shorekeeperSup = (['leftSupport', 'rightSupport'] as const).find((k) =>
    slotHasCode(slots[k], 'BP01-008')
  );
  if (shorekeeperSup && slots[shorekeeperSup]) return shorekeeperSup;

  const lChar = slots.leftSupport;
  const rChar = slots.rightSupport;
  if (lChar && rChar) {
    const lScore = leaderScore(p, opp, lChar, 1);
    const rScore = leaderScore(p, opp, rChar, 1);
    return lScore >= rScore ? 'leftSupport' : 'rightSupport';
  }
  return lChar ? 'leftSupport' : rChar ? 'rightSupport' : null;
}

// ----------------------------------------------------------
// 단일 카드 예상 데미지 계산 (리더/필드 패시브/협주 화음/카드 조건 포함)
// ----------------------------------------------------------
function estimateCardDamage(
  p: PlayerState,
  opp: PlayerState,
  c: ActionCard,
  leader: CharacterCard | undefined = p.slots.leader,
  isComboStep = false,
  virtualActionArea: ActionCard[] = p.actionArea || [],
  firstNormalAttackUsed = Boolean(p.actionFlags?.firstNormalAttackBonusUsed),
  curSlots: { leader: CharacterCard; leftSupport?: CharacterCard | null; rightSupport?: CharacterCard | null } = p.slots
): number {
  const code = baseCodeOf(c.code);
  let dmg = c.damage;

  // 연격 스텝에서 <변주 스킬>을 사용하는 경우 리더 교체가 먼저 일어난 뒤 리더 패시브가 적용됨
  let effectiveLeader = leader;
  if (isComboStep && isIntroSkillCard(c)) {
    const swapSlot = pickIntroSkillSwapSlot(p, opp, curSlots, c);
    if (swapSlot && curSlots[swapSlot]) {
      effectiveLeader = curSlots[swapSlot]!;
    }
  }

  const leaderCards = getAllCardsInSlot(effectiveLeader);

  // 1. 리더/필드 상시 데미지 버프
  if (!isComboStep) {
    // 배틀 스텝 번 데미지 (치샤 Lv.0 BP01-027 / 금희 Lv.0 BP01-030)
    if (
      c.color === 'RED' &&
      leaderCards.some((lc) => baseCodeOf(lc.code) === 'BP01-027' || baseCodeOf(lc.code) === 'BP01-030')
    ) {
      dmg += 1;
    }
    // 금희 Lv.1 BP01-029 판정 승리 시 +2 데미지
    if (c.color === 'RED' && leaderCards.some((lc) => baseCodeOf(lc.code) === 'BP01-029')) {
      dmg += 2;
    }
  } else {
    // 금희 Lv.2 SD02-005: 적색 카드 【콤보】 데미지 +1
    if (c.color === 'RED' && leaderCards.some((lc) => baseCodeOf(lc.code) === 'SD02-005')) {
      dmg += 1;
    }
    // 변주 스킬 보너스 데미지 (도약의 불빛 SD01-009, 반룡의 빛 SD02-009): 대상 캐릭터가 실제로 교체될 때만 +2!
    if ((code === 'SD01-009' || code === 'SD02-009') && canIntroSkillTriggerBonus(p, curSlots, c)) {
      dmg += 2;
    }
  }

  // 치샤 Lv.2 SD01-005: 필드 어디든 치샤 【리더 스킬】 카드 데미지 +3
  if (playerFieldHasCode(p, 'SD01-005') && c.characterExclusive?.includes('치샤') && isLeaderSkillCard(c)) {
    dmg += 3;
  }

  // 카멜리아 Lv.2 BP01-001 리더: 카멜리아 적색 카드 데미지 +1
  if (
    leaderCards.some((lc) => baseCodeOf(lc.code) === 'BP01-001') &&
    c.characterExclusive?.includes('카멜리아') &&
    c.color === 'RED'
  ) {
    dmg += 1;
  }

  // 앙코 Lv.2 BP01-011 필드 상시: 앙코 적색 카드 데미지 +1
  if (playerFieldHasCode(p, 'BP01-011') && c.characterExclusive?.includes('앙코') && c.color === 'RED') {
    dmg += 1;
  }

  // 앙코 Lv.0 BP01-015 리더: 매 턴 첫 앙코 기본 공격 데미지 +2
  if (
    leaderCards.some((lc) => baseCodeOf(lc.code) === 'BP01-015') &&
    c.characterExclusive?.includes('앙코') &&
    isNormalAttackCard(c) &&
    !firstNormalAttackUsed
  ) {
    dmg += 2;
  }

  // 2. 개별 액션 카드 조건부 데미지 (【콤보】 전용 조건부 데미지는 isComboStep일 때만 발동!)
  // SD02-011 만물의 정화: 【콤보】 액션 에리어 3장 이상일 때 +3
  if (isComboStep && code === 'SD02-011' && virtualActionArea.length + 1 >= 3) {
    dmg += 3;
  }
  // BP01-050 넝쿨의 춤: 【콤보】 액션 에리어에 일반 공격 2장 이상일 때 +1
  if (isComboStep && code === 'BP01-050') {
    const normalCount = [...virtualActionArea, c].filter(isNormalAttackCard).length;
    if (normalCount >= 2) dmg += 1;
  }
  // BP01-055 근원의 추구·강공격: 내 체력이 상대보다 많으면 +1 (상시 효과)
  if (code === 'BP01-055' && p.hp > opp.hp) {
    dmg += 1;
  }
  // BP01-074 승천하는 용: 액션 에리어 카드 1장당 +1 (배틀/콤보 모두 가능하나 콤보에서 누적)
  if (code === 'BP01-074') {
    dmg += virtualActionArea.length;
  }
  // BP01-065 / BP01-067 소리의 변화·강공격: 【콤보】 패 1장 버리고 +1
  if (isComboStep && (code === 'BP01-065' || code === 'BP01-067') && p.hand.length >= 2) {
    dmg += 1;
  }

  // 3. 0코스트 프리즘 에코 협주 시너지 보너스
  dmg += getConcertoSonataBonusDamage(p, c);

  // 4. 상대 리더가 BP01-001 카멜리아 Lv.2인 경우 받는 피해 +1
  if (dmg > 0 && slotHasCode(opp.slots.leader, 'BP01-001')) {
    dmg += 1;
  }

  return dmg;
}

// ----------------------------------------------------------
// ★ 원턴킬(OTK) 및 다중 카드 폭딜 플랜 시뮬레이터
// ----------------------------------------------------------
export interface BurstPlan {
  leaderSlot: SlotKey;
  clashCardId: string | null;
  comboSequenceIds: string[];
  usedCardIds: Set<string>;
  totalDamage: number;
  isOtk: boolean;
  needsExtraConcerto: boolean; // 패에서 비콤보 카드 1장을 협주 충전하면 성립하는지 여부
}

export function estimateBurstPlan(state: GameState, idx: 0 | 1): BurstPlan {
  const p = state.players[idx];
  const opp = state.players[other(idx)];

  let bestPlan: BurstPlan = {
    leaderSlot: 'leader',
    clashCardId: null,
    comboSequenceIds: [],
    usedCardIds: new Set(),
    totalDamage: 0,
    isOtk: false,
    needsExtraConcerto: false,
  };

  // 리더 후보: 현재 리더 + (아직 교대 안 했으면) 좌/우 서포터
  const candidateLeaderSlots: SlotKey[] = p.actionFlags.switchedLeader
    ? ['leader']
    : (['leader', 'leftSupport', 'rightSupport'] as SlotKey[]).filter((k) => Boolean(p.slots[k]));

  // 협주 충전 여유 여부 (아직 충전 안 했고 패가 2장 이상이면 +1 협주 가능)
  const canChargeOne = !p.actionFlags.chargedConcerto && p.hand.length >= 2;
  const concertoOptions = canChargeOne ? [0, 1] : [0];

  for (const extraConc of concertoOptions) {
    for (const lSlot of candidateLeaderSlots) {
      const startLeader = p.slots[lSlot]!;
      const startSlots = {
        leader: startLeader,
        leftSupport: lSlot === 'leftSupport' ? p.slots.leader : p.slots.leftSupport,
        rightSupport: lSlot === 'rightSupport' ? p.slots.leader : p.slots.rightSupport,
      };

      // 대결 오프너 후보: 현재 협주(+extraConc)로 사용 가능한 카드들
      const allPlayableOpeners = p.hand.filter((c) => {
        const cost = comboCostOf(p, c);
        return p.concertoZone.length + extraConc >= cost && canPlayerUseActionCard(startSlots, c, []).canUse;
      });
      // <변주 스킬>은 스피드 0 / 데미지 0의 【콤보】 전용 카드이므로 다른 오프너가 있으면 대결 오프너 후보에서 제외하여 연격용으로 보존!
      const nonIntroOpeners = allPlayableOpeners.filter((c) => !isIntroSkillCard(c));
      const openers = nonIntroOpeners.length > 0 ? nonIntroOpeners : allPlayableOpeners;

      for (const opener of openers) {
        const openerCode = baseCodeOf(opener.code);
        const openerCost = comboCostOf(p, opener);
        // extraConc===1일 때는 오프너 외에 충전으로 소모할 카드 1장이 필요함
        const remainingHand = p.hand.filter((c) => c.id !== opener.id);
        if (extraConc > 0 && remainingHand.length < extraConc) continue;

        let curConcerto = p.concertoZone.length + extraConc - openerCost;
        let curLeader = startLeader;
        let curSlots = { ...startSlots };
        const virtualActionArea: ActionCard[] = [opener];
        let firstNormalUsed: boolean =
          Boolean(p.actionFlags?.firstNormalAttackBonusUsed) ||
          Boolean(opener.characterExclusive?.includes('앙코') && isNormalAttackCard(opener));

        // 1) 오프너가 BP01-062 (그늘이의 대폭주)인 경우 앙코 Lv.2 진화 및 리더 교체 반영
        if (openerCode === 'BP01-062') {
          const ankeSlot = SLOT_KEYS.find((k) => curSlots[k]?.characterName === '앙코');
          if (ankeSlot && curSlots[ankeSlot]) {
            const ankeChar = { ...curSlots[ankeSlot]!, level: 2 as const, code: 'BP01-011' };
            if (ankeSlot !== 'leader') {
              const prevL = curSlots.leader;
              curSlots.leader = ankeChar;
              curSlots[ankeSlot] = prevL;
            } else {
              curSlots.leader = ankeChar;
            }
            curLeader = curSlots.leader;
          }
        }
        // 오프너가 BP01-048 (피어난 동백꽃)인 경우 카멜리아 레벨업 반영
        if (openerCode === 'BP01-048') {
          if (curSlots.leader.characterName === '카멜리아' && curSlots.leader.level < 2) {
            curSlots.leader = {
              ...curSlots.leader,
              level: (curSlots.leader.level + 1) as 1 | 2,
              code: curSlots.leader.level + 1 === 2 ? 'BP01-001' : 'BP01-003',
            };
            curLeader = curSlots.leader;
          }
        }
        // 오프너가 SD02-015 (만년적설)인 경우 승리 시 협주 +2 충전
        if (openerCode === 'SD02-015') {
          curConcerto += 2;
        }
        // 양양/산화 Lv.0 청색 배틀 협주 +1 충전
        if (
          opener.color === 'BLUE' &&
          getAllCardsInSlot(curLeader).some((lc) => baseCodeOf(lc.code) === 'BP01-024' || baseCodeOf(lc.code) === 'BP01-033')
        ) {
          curConcerto += 1;
        }

        let totalDmg = estimateCardDamage(
          p,
          opp,
          opener,
          curLeader,
          false,
          [],
          Boolean(p.actionFlags?.firstNormalAttackBonusUsed),
          curSlots
        );

        // 2) 대결 승리 시 연격 가능 횟수 계산
        const comboUnlimited = opener.color === 'RED' && !isComboTerminator(opener);
        let comboCount = isComboTerminator(opener) ? 0 : opener.pursuitCount ?? 0;
        if (slotHasCode(curLeader, 'SD01-006') && !isComboTerminator(opener)) {
          comboCount += 1; // 치샤 Lv.1 추격 1
        }
        if (opener.color === 'GREEN' && slotHasCode(curLeader, 'BP01-019')) {
          comboCount += 3; // 방랑자(남) Lv.2 녹색 승리 시 추격 3
        }
        if (opener.color === 'BLUE' && slotHasCode(curLeader, 'BP01-031')) {
          comboCount += 3; // 산화 Lv.2 청색 승리 시 추격 3
        }

        // extraConc === 1이면 가장 가치가 낮은 비적색(또는 고코스트) 카드 1장을 충전용으로 예약 제외
        let pool = [...remainingHand];
        let chargeReserveId: string | null = null;
        if (extraConc === 1) {
          pool.sort((a, b) => {
            const aRed = a.color === 'RED' ? 1 : 0;
            const bRed = b.color === 'RED' ? 1 : 0;
            return aRed - bRed || b.cost - a.cost || a.damage - b.damage;
          });
          chargeReserveId = pool[0].id;
          pool = pool.slice(1);
        }

        // 카멜리아 Lv.0/Lv.1 판정 승리 시 트래시에서 0코스트 일반 공격 1장 회수 시뮬레이션
        if (
          getAllCardsInSlot(curLeader).some((lc) => baseCodeOf(lc.code) === 'BP01-005' || baseCodeOf(lc.code) === 'BP01-004')
        ) {
          const trashNormal = p.dropZone.find((dc) => dc.kind === 'ACTION' && (dc as ActionCard).color === 'RED' && isNormalAttackCard(dc)) as ActionCard | undefined;
          if (trashNormal) {
            pool.push(trashNormal);
          }
        }

        const comboSeq: string[] = [];
        // 3) 연격 체인 그리디 시뮬레이션 (실제 runAiComboStep과 동일한 우선순위로 시뮬레이션)
        let steps = 0;
        while ((comboUnlimited || comboCount > 0) && steps < 10) {
          steps++;
          const playableReds = pool.filter(
            (c) =>
              c.color === 'RED' &&
              curConcerto >= comboCostOf(p, c) &&
              canPlayerUseActionCard(curSlots, c, virtualActionArea).canUse
          );
          if (playableReds.length === 0) break;

          const nextCard = pickBestNextComboCard(
            p,
            opp,
            playableReds,
            curSlots,
            virtualActionArea,
            curConcerto,
            opp.hp - totalDmg,
            firstNormalUsed
          );
          if (!nextCard) break;

          const cCost = comboCostOf(p, nextCard);
          const cCode = baseCodeOf(nextCard.code);
          curConcerto -= cCost;

          // 변주 스킬 리더 교체 시뮬레이션 (데미지 계산 전에 교체가 수행되나 estimateCardDamage가 curSlots 기준으로 처리)
          const stepDmg = estimateCardDamage(
            p,
            opp,
            nextCard,
            curLeader,
            true,
            virtualActionArea,
            firstNormalUsed,
            curSlots
          );

          if (isIntroSkillCard(nextCard)) {
            const swapKey = pickIntroSkillSwapSlot(p, opp, curSlots, nextCard);
            const bonusTriggered = canIntroSkillTriggerBonus(p, curSlots, nextCard);
            if (swapKey && curSlots[swapKey]) {
              const prevL = curSlots.leader;
              curSlots.leader = curSlots[swapKey]!;
              curSlots[swapKey] = prevL;
              curLeader = curSlots.leader;
            }
            if ((cCode === 'SD01-014' || cCode === 'SD02-014') && bonusTriggered) {
              curConcerto += 1; // 숨결 / 차가운 눈꽃 협주 +1
            }
            if (cCode === 'BP01-046' && curLeader.characterName === '카멜리아' && curLeader.level < 2) {
              curSlots.leader = { ...curLeader, level: 2, code: 'BP01-001' };
              curLeader = curSlots.leader;
            }
          }

          // 복성재우 (BP01-071): 직전 카드가 <체공>이면 협주 +1
          if (cCode === 'BP01-071' && isAerialCard(virtualActionArea[virtualActionArea.length - 1])) {
            curConcerto += 1;
          }

          totalDmg += stepDmg;
          if (nextCard.characterExclusive?.includes('앙코') && isNormalAttackCard(nextCard)) {
            firstNormalUsed = true;
          }

          virtualActionArea.push(nextCard);
          comboSeq.push(nextCard.id);
          pool = pool.filter((c) => c.id !== nextCard.id);

          if (!comboUnlimited) comboCount -= 1;
          if (isComboTerminator(nextCard)) break;
        }

        // 4) 배틀 페이즈 종료 시 추가 데미지 (치샤 Lv.2 BP01-025: 액션 에리어에 기본 공격 2장 이상이면 3pt)
        if (
          slotHasCode(curLeader, 'BP01-025') &&
          virtualActionArea.filter(isNormalAttackCard).length >= 2
        ) {
          totalDmg += 3;
        }

        const isOtk = totalDmg >= opp.hp;
        const planScore =
          totalDmg +
          (isOtk ? 50 : 0) +
          (opener.color === 'RED' ? (opener.speed ?? 0) * 0.25 : 0.5) -
          (isComboOnlyEffectCard(opener) ? 2.5 : 0) -
          (extraConc * 1.5);

        const bestScoreSoFar =
          bestPlan.totalDamage +
          (bestPlan.isOtk ? 50 : 0) -
          (bestPlan.needsExtraConcerto ? 1.5 : 0);

        if (planScore > bestScoreSoFar) {
          const used = new Set<string>([opener.id, ...comboSeq]);
          if (chargeReserveId) used.add(chargeReserveId);
          bestPlan = {
            leaderSlot: lSlot,
            clashCardId: opener.id,
            comboSequenceIds: comboSeq,
            usedCardIds: used,
            totalDamage: totalDmg,
            isOtk,
            needsExtraConcerto: extraConc === 1,
          };
        }
      }
    }
  }

  return bestPlan;
}

// ----------------------------------------------------------
// ★ 연격(Combo) 중 최적의 다음 카드 및 시퀀싱 선택기
// ----------------------------------------------------------
function pickBestNextComboCard(
  p: PlayerState,
  opp: PlayerState,
  playableReds: ActionCard[],
  curSlots: { leader: CharacterCard; leftSupport?: CharacterCard | null; rightSupport?: CharacterCard | null },
  virtualActionArea: ActionCard[],
  curConcerto: number,
  remainingOppHp: number,
  firstNormalUsed: boolean
): ActionCard | null {
  if (playableReds.length === 0) return null;

  const lastActionCard = virtualActionArea[virtualActionArea.length - 1] || null;
  const lastWasAerial = isAerialCard(lastActionCard);
  const hasBp01071InList = playableReds.some((c) => baseCodeOf(c.code) === 'BP01-071');
  const hasNormalAttackScalingCard = playableReds.some((c) => baseCodeOf(c.code) === 'BP01-050');
  const hasActionAreaScalingCard = playableReds.some(
    (c) => baseCodeOf(c.code) === 'SD02-011' || baseCodeOf(c.code) === 'BP01-074'
  );

  // 0순위: 연격 스텝에서 아무런 의미 없는 카드(0데미지 판정 전용 카드 및 무효 변주 스킬) 사전 필터링!
  const meaningfulReds = playableReds.filter((c) => {
    const code = baseCodeOf(c.code);
    const dmg = estimateCardDamage(p, opp, c, curSlots.leader, true, virtualActionArea, firstNormalUsed, curSlots);

    // 킬각이면 무조건 허용
    if (dmg >= remainingOppHp && remainingOppHp > 0) return true;

    // 스캔(SD01-020, SD02-020): 【판정】 전용 0데미지 카드 -> 연격에서 무지성 소모 금지 (만물의 정화/승천하는 용 장수 채우기나 버프 딜이 있을 때만 허용)
    if (code === 'SD01-020' || code === 'SD02-020') {
      return dmg >= 2 || hasActionAreaScalingCard;
    }

    // 점프(SD01-015): 【판정】 전용 0데미지 <체공> 카드 -> 복성재우(BP01-071) 연계나 장수 조건부 카드가 있을 때만 연격 허용!
    if (code === 'SD01-015') {
      return (hasBp01071InList && !lastWasAerial) || hasActionAreaScalingCard || dmg >= 2;
    }

    // <변주 스킬> 카드: 변주 보너스가 발동하거나, 파수인 Lv.1 [BP01-008] 교체 효과가 발동하거나,
    // 결말의 순환 [BP01-057] 드로우가 켜져 있거나, 교체 시 남은 연격 카드를 강화/해금하는 경우에만 사용!
    if (isIntroSkillCard(c)) {
      const targetChar = getIntroSkillTargetChar(c);
      const targetAlreadyLeader = Boolean(targetChar && curSlots.leader?.characterName === targetChar);
      const alreadySwappedInCombo = virtualActionArea.some((prev) => isIntroSkillCard(prev));
      const bonusOk = canIntroSkillTriggerBonus(p, curSlots, c);
      const swapKey = pickIntroSkillSwapSlot(p, opp, curSlots, c);
      const nextLeader = swapKey ? curSlots[swapKey] : null;
      const triggersShorekeeperSwitch =
        slotHasCode(curSlots.leader, 'BP01-008') || slotHasCode(nextLeader, 'BP01-008');
      const triggersBp057Draw = Boolean(p.introSkillBonusDrawCount && p.introSkillBonusDrawCount > 0);
      const unlocksLeaderSkillInHand = Boolean(
        nextLeader &&
          p.hand.some(
            (h) =>
              h.id !== c.id &&
              h.color === 'RED' &&
              !canPlayerUseActionCard(curSlots, h, virtualActionArea).canUse &&
              canPlayerUseActionCard({ ...curSlots, leader: nextLeader }, h, virtualActionArea).canUse
          )
      );
      const unlocksOrBuffsCombo = Boolean(
        nextLeader &&
          (unlocksLeaderSkillInHand ||
            (!targetAlreadyLeader &&
              (slotHasCode(nextLeader, 'SD02-005') ||
                slotHasCode(nextLeader, 'BP01-001') ||
                slotHasCode(nextLeader, 'BP01-025'))))
      );

      // ★ 이미 해당 변주 스킬의 대상 캐릭터가 리더에 나와 있거나 이번 연격에서 이미 변주 교체를 수행한 경우,
      // 0데미지 유틸 변주 스킬(차가운 눈꽃, 숨결, 계발 등)로 다시 리더를 되돌리는 핑퐁(역스왑) 금지!
      // (단, 파수인 Lv.1 [BP01-008] 교체 효과 발동, 결말의 순환 드로우, 손패의 리더 전용 스킬 해금은 예외)
      if ((targetAlreadyLeader || alreadySwappedInCombo) && c.damage === 0) {
        return triggersShorekeeperSwitch || triggersBp057Draw || unlocksLeaderSkillInHand;
      }

      return bonusOk || triggersShorekeeperSwitch || triggersBp057Draw || unlocksOrBuffsCombo || dmg >= 2;
    }

    return true;
  });

  if (meaningfulReds.length === 0) return null;

  // 1순위: 단일 카드로 즉시 킬각(Lethal)이 나오는 경우 코스트가 가장 낮은 킬 카드 즉시 선택!
  const immediateLethals = meaningfulReds
    .map((c) => ({
      c,
      dmg: estimateCardDamage(p, opp, c, curSlots.leader, true, virtualActionArea, firstNormalUsed, curSlots),
      cost: comboCostOf(p, c),
    }))
    .filter((x) => x.dmg >= remainingOppHp)
    .sort((a, b) => a.cost - b.cost || b.dmg - a.dmg);

  if (immediateLethals.length > 0) {
    return immediateLethals[0].c;
  }

  const nonTerminatorCount = meaningfulReds.filter((c) => !isComboTerminator(c)).length;

  // 현재 리더가 적색 연격 데미지 버프(금희 Lv.2 SD02-005, 카멜리아 Lv.2 BP01-001, 앙코 Lv.0 BP01-015, 치샤 Lv.2 BP01-025)를 보유 중인지 확인
  const currentLeaderHasComboBuff =
    slotHasCode(curSlots.leader, 'SD02-005') ||
    slotHasCode(curSlots.leader, 'BP01-001') ||
    slotHasCode(curSlots.leader, 'BP01-025') ||
    (slotHasCode(curSlots.leader, 'BP01-015') && !firstNormalUsed);

  // 현재 리더 전용 【리더 스킬】이나 버프 받을 일반 공격 카드가 아직 손에 남아있는지 확인
  const hasOtherNonIntroRedAttacks = meaningfulReds.some(
    (c) => !isIntroSkillCard(c) && !isComboTerminator(c)
  );
  const hasCurrentLeaderExclusiveSkill = meaningfulReds.some(
    (c) =>
      !isIntroSkillCard(c) &&
      !isComboTerminator(c) &&
      isLeaderSkillCard(c) &&
      canPlayerUseActionCard(curSlots, c, virtualActionArea).canUse
  );

  const scored = meaningfulReds.map((c) => {
    const code = baseCodeOf(c.code);
    const cost = comboCostOf(p, c);
    const dmg = estimateCardDamage(p, opp, c, curSlots.leader, true, virtualActionArea, firstNormalUsed, curSlots);
    let priority = dmg * 12 - cost * 6;

    // [규칙 0] 연격 강제 종료 카드(BP01-074 승천하는 용, BP01-061 그늘이와 구름이)는 다른 연격 카드가 남아있으면 무조건 맨 마지막에 사용!
    if (isComboTerminator(c) && nonTerminatorCount > 0) {
      priority -= 1000;
    }

    // [규칙 1] <체공> -> BP01-071 (복성재우) 협주 +1 시너지 시퀀싱
    if (code === 'BP01-071') {
      if (lastWasAerial) {
        priority += 520; // 직전 카드가 체공이면 최우선 발동하여 공짜 협주 +1 획득!
      } else if (meaningfulReds.some((otherCard) => otherCard.id !== c.id && isAerialCard(otherCard))) {
        priority -= 280; // 손에 체공 카드가 있다면 체공 카드를 먼저 내도록 대기!
      }
    }
    if (isAerialCard(c) && hasBp01071InList && !lastWasAerial) {
      priority += 420; // 복성재우 발동을 위해 체공 카드를 먼저 시전!
    }

    // [규칙 2] 【콤보】 전용 효과 카드(변주 스킬, 넝쿨의 춤, 만물의 정화, 소리의 변화·강공격, 앙코 강공격) 적극 활용!
    if (isComboOnlyEffectCard(c) && !isIntroSkillCard(c)) {
      priority += 140; // 일반 대결/판정 카드보다 【콤보】 전용 카드를 연격에서 우선 사용!
    }
    if (code === 'BP01-060' && slotHasCharacterSkill(curSlots.leader, '앙코')) {
      priority += 230; // 앙코 리더일 때 적중 시 1드로우!
    }
    if ((code === 'BP01-065' || code === 'BP01-067') && p.hand.length >= 2) {
      priority += 160; // 소리의 변화·강공격 【콤보】 데미지 +1
    }

    // [규칙 2-B] <변주 스킬> 정밀 시퀀싱 (리더 버프 유지 vs 선행 교체)
    if (isIntroSkillCard(c)) {
      const bonusOk = canIntroSkillTriggerBonus(p, curSlots, c);
      const swapKey = pickIntroSkillSwapSlot(p, opp, curSlots, c);
      const nextLeader = swapKey ? curSlots[swapKey] : null;
      const nextLeaderHasComboBuff = Boolean(
        nextLeader &&
          (slotHasCode(nextLeader, 'SD02-005') ||
            slotHasCode(nextLeader, 'BP01-001') ||
            slotHasCode(nextLeader, 'BP01-025'))
      );

      if (code === 'BP01-046' && bonusOk) {
        priority += 360; // 카멜리아 리더 진입 + 즉시 레벨업은 최우선 발동!
      } else if (nextLeaderHasComboBuff && !currentLeaderHasComboBuff) {
        priority += 340; // 서포터에 있던 주력 딜러(금희 Lv.2 / 카멜리아 Lv.2 등)를 리더로 먼저 끌어올려 후속 연격 전체 강화!
      } else if (currentLeaderHasComboBuff && hasOtherNonIntroRedAttacks) {
        // 현재 리더가 이미 강력한 연격 버퍼(금희 Lv.2 등)라면, 다른 적색 공격 카드를 먼저 다 꽂은 뒤 마지막에 변주 스킬(반룡의 빛 등)로 마무리!
        priority -= 260;
      } else if (hasCurrentLeaderExclusiveSkill) {
        // 현재 리더 전용 【리더 스킬】을 먼저 쓴 뒤에 변주 스킬로 교체!
        priority -= 240;
      } else if (bonusOk) {
        if (code === 'SD01-014' || code === 'SD02-014') {
          priority += 240; // 0코스트 협주 +1 충전 변주 스킬
        } else if (code === 'SD01-019' || code === 'SD02-019' || code === 'BP01-063') {
          priority += 210; // 0코스트 드로우 / 트래시 적색 회수 변주 스킬
        } else if (code === 'SD01-009' || code === 'SD02-009') {
          priority += 190; // 도약의 불빛 / 반룡의 빛 (+2 데미지)
        } else if (code === 'BP01-054') {
          priority += 160; // 계발 (+1 회복)
        }
      }
    }

    // [규칙 3] <일반 공격> 카드를 넝쿨의 춤(BP01-050), 만물의 정화(SD02-011), 치샤 Lv.2(BP01-025) 조건 충족용으로 먼저 사용!
    if (isNormalAttackCard(c) && cost === 0 && !isComboOnlyEffectCard(c)) {
      priority += 70;
      if (hasNormalAttackScalingCard || hasActionAreaScalingCard || slotHasCode(curSlots.leader, 'BP01-025')) {
        priority += 110;
      }
    }

    // [규칙 4] 액션 에리어 장수 조건부 【콤보】 카드(SD02-011 만물의 정화, BP01-050 넝쿨의 춤)는 조건 충족 전이면 후순위로 대기, 충족 시 최우선 폭딜!
    if (code === 'SD02-011') {
      if (virtualActionArea.length + 1 < 3 && meaningfulReds.length > 1) {
        priority -= 320;
      } else if (virtualActionArea.length + 1 >= 3) {
        priority += 220;
      }
    }
    if (code === 'BP01-050') {
      const normalCount = [...virtualActionArea, c].filter(isNormalAttackCard).length;
      if (normalCount < 2 && meaningfulReds.some((o) => o.id !== c.id && isNormalAttackCard(o))) {
        priority -= 220;
      } else if (normalCount >= 2) {
        priority += 190;
      }
    }

    // [규칙 5] 【판정】/【배틀】 전용 효과를 가진 고성능 대결 카드(1드로우 강공격/공중공격, 피어난 동백꽃 등)는
    // 순수 【콤보】 카드나 일반 공격보다 후순위로 밀어 다음 턴 대결 오프너로 아낄 수 있게 함
    if (isPureClashEffectRedCard(c)) {
      priority -= 65;
    }

    return { c, dmg, cost, priority };
  });

  scored.sort((a, b) => b.priority - a.priority || b.dmg - a.dmg);
  return scored[0]?.c || null;
}

// ----------------------------------------------------------
// 멀리건 (Mulligan)
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

  // SMART:
  // 1) 파티의 누구도 사용할 수 없는 데드 카드나 2코스트 이상 무거운 카드 우선 교체
  // 2) 단, BP01-062(그늘이의 대폭주)나 핵심 1코스트 진화 카드(BP01-048, BP01-056, SD02-010, BP01-057)는 보존!
  const keepCodes = new Set(['BP01-048', 'BP01-062', 'BP01-056', 'SD02-010', 'BP01-057', 'BP01-058']);
  const candidates = aiPlayer.hand.filter((c) => {
    const code = baseCodeOf(c.code);
    if (keepCodes.has(code)) return false;
    const usableAny = SLOT_KEYS.some((k) => {
      const ch = aiPlayer.slots[k];
      if (!ch) return false;
      const slotsIfL = {
        leader: ch,
        leftSupport: k === 'leftSupport' ? aiPlayer.slots.leader : aiPlayer.slots.leftSupport,
        rightSupport: k === 'rightSupport' ? aiPlayer.slots.leader : aiPlayer.slots.rightSupport,
      };
      return canPlayerUseActionCard(slotsIfL, c).canUse;
    });
    if (!usableAny) return true;
    return c.cost >= 2 || isComboTerminator(c);
  });

  candidates
    .sort((a, b) => b.cost - a.cost)
    .slice(0, MP.mulliganMaxSwap)
    .forEach((c) => discardIds.push(c.id));

  return discardIds;
}

// ----------------------------------------------------------
// 카드/캐릭터 가치 평가 (SMART)
// ----------------------------------------------------------
function cardRawValue(p: PlayerState, opp: PlayerState, c: ActionCard, leader: CharacterCard | undefined): number {
  const code = baseCodeOf(c.code);
  const dmg = estimateCardDamage(p, opp, c, leader, false, []);
  let v = dmg * 1.15;

  const leaderName = leader?.characterName || leader?.nameKr || '';
  if ((leaderName.includes('치샤') || leaderName.includes('금희')) && c.color === 'RED') v += 1.0;
  if ((leaderName.includes('산화') || leaderName.includes('양양')) && c.color === 'BLUE') v += 1.1;
  if ((leaderName.includes('방랑자') || leaderName.includes('파수인')) && c.color === 'GREEN') v += 1.3;

  let combo = (c.color === 'RED' && !isComboTerminator(c) ? 1.5 : 0) + (c.pursuitCount ?? 0);
  if (slotHasCode(leader, 'SD01-006') && !isComboTerminator(c)) combo += 1;
  if (code === 'SD02-010') {
    combo += 8;
    v += 5.0; // 용을 타고 하늘로 향해 (추격 8 + 3드로우)
  }
  if (code === 'BP01-057') {
    combo += 8;
    v += 4.2; // 결말의 순환 (추격 8 + 1힐 + 변주 드로우)
  }
  if (code === 'SD01-023') v += 4.0; // 울림의 연주 (5pt 힐)
  if (code === 'SD02-015') v += 3.2; // 만년적설 (승리 시 협주 +2)
  if (code === 'SD02-016' || code === 'SD01-016') v += 2.8; // 상대 다음 턴 콤보 봉쇄 / 적색 코스트 +1
  if (code === 'BP01-073') v += 3.0; // 창공의 무지개 (용을 타고 하늘로 향해 서치)
  if (code === 'BP01-048' || code === 'BP01-062' || code === 'BP01-056' || code === 'BP01-046') {
    v += 3.5; // 무료 캐릭터 레벨업 핵심 카드
  }
  v += Math.min(combo, 8) * 1.0;
  if (c.effectType === 'DRAW' || code === 'BP01-058' || code === 'BP01-047' || code === 'BP01-051' || code === 'BP01-075') {
    v += 1.8;
  }
  if (c.effectType === 'HEAL') v += 1.8;
  if (c.effectType === 'CHARGE') v += 1.8;
  if (c.color === 'BLUE') v += 1.1; // 상대 적색 콤보 카운터 가치
  return v;
}

// 손패 한 장의 "보유 가치" (충전/버림 선택에 사용): 낮을수록 먼저 소비
function cardKeepValue(p: PlayerState, opp: PlayerState, c: ActionCard, protectedIds?: Set<string>): number {
  if (protectedIds && protectedIds.has(c.id)) {
    return 100; // 이번 턴 OTK/핵심 콤보에 사용될 카드는 절대 버리지 않음!
  }
  const code = baseCodeOf(c.code);
  // 무료 레벨업 카드가 아직 유효한 경우 절대 버리지 않음
  const lvTarget = LEVELUP_CARD_TARGET[code];
  if (lvTarget) {
    const canStillEvolve = SLOT_KEYS.some((k) => {
      const ch = p.slots[k];
      return ch && ch.characterName === lvTarget && ch.level < 2;
    });
    if (canStillEvolve) return 40;
  }

  // 협주 에코 시너지용 0코스트 프리즘 에코는 협주 충전용(chargeConcerto)으로는 최고 가치(가장 먼저 충전하고 싶음)지만,
  // 일반 버리기(레벨업 코스트)보다는 협주 존에 넣는 것이 유리함
  let best = 0;
  let usableByAny = false;
  for (const k of SLOT_KEYS) {
    const ch = p.slots[k];
    if (!ch) continue;
    const slotsIfLeader = {
      leader: ch,
      leftSupport: k === 'leftSupport' ? p.slots.leader : p.slots.leftSupport,
      rightSupport: k === 'rightSupport' ? p.slots.leader : p.slots.rightSupport,
    };
    if (canPlayerUseActionCard(slotsIfLeader, c).canUse) {
      usableByAny = true;
      const w = k === 'leader' ? 1 : 0.72;
      best = Math.max(best, cardRawValue(p, opp, c, ch) * w);
    }
  }
  if (!usableByAny) return -5; // 아무도 못 쓰는 카드 (완전한 데드 카드 -> 최우선 처분)

  // 【콤보】 전용 카드(유효한 <변주 스킬>, 만물의 정화, 넝쿨의 춤, 복성재우, 소리의 변화·강공격)가
  // 대결 기준 데미지가 낮다는 이유로 협주 충전/레벨업 코스트로 무지성 갈려나가는 현상 방지!
  if (isIntroSkillCard(c) && canIntroSkillTriggerBonus(p, p.slots, c)) {
    best += 4.2;
  } else if (code === 'SD02-011' || code === 'BP01-050' || code === 'BP01-065' || code === 'BP01-067') {
    best += 3.5;
  } else if (code === 'BP01-071' && p.hand.some((h) => isAerialCard(h))) {
    best += 3.8;
  } else if (code === 'BP01-060' && SLOT_KEYS.some((k) => p.slots[k]?.characterName === '앙코')) {
    best += 3.5;
  }

  // 이미 동일 코드 카드가 손에 여러 장 있으면 중복분은 버리기 후보로 가치 소폭 감소
  const dupCount = p.hand.filter((h) => baseCodeOf(h.code) === code).length;
  const dupPenalty = dupCount >= 2 ? 0.85 : 1.0;

  const cost = comboCostOf(p, c);
  const afford = p.concertoZone.length >= cost ? 1 : p.concertoZone.length + 1 >= cost ? 0.85 : 0.65;
  return best * afford * dupPenalty - cost * 0.2;
}

function chooseDiscards(p: PlayerState, opp: PlayerState, n: number, excludeIds: Set<string> = new Set()): ActionCard[] {
  return [...p.hand]
    .filter((c) => !excludeIds.has(c.id))
    .sort((a, b) => cardKeepValue(p, opp, a, excludeIds) - cardKeepValue(p, opp, b, excludeIds))
    .slice(0, n);
}

// 협주 충전용 카드 선택: 데드 카드 -> 0코스트 프리즘 에코(협주 시너지) -> 보유 가치가 가장 낮은 카드 순
function chooseCardForConcertoCharge(
  p: PlayerState,
  opp: PlayerState,
  protectedIds: Set<string> = new Set()
): ActionCard | null {
  const candidates = p.hand.filter((c) => !protectedIds.has(c.id));
  if (candidates.length === 0) return null;

  // 0코스트 프리즘 에코(BP01-034, 036, 038, 040, 042)나 짝꿍 에코가 손에 있으면 협주 에리어에 넣을 때 시너지 발생!
  const echoCandidate = candidates.find((c) => isEchoCard(c) && c.cost === 0);
  if (echoCandidate) return echoCandidate;

  candidates.sort((a, b) => cardKeepValue(p, opp, a, protectedIds) - cardKeepValue(p, opp, b, protectedIds));
  return candidates[0];
}

// ----------------------------------------------------------
// ★ 스마트 레벨업 가치 평가 (무지성 레벨업 원천 차단!)
// ----------------------------------------------------------
function evaluateUpgradeCandidate(
  p: PlayerState,
  opp: PlayerState,
  slotKey: SlotKey,
  upCard: CharacterCard,
  burstPlan: BurstPlan
): number {
  const curChar = p.slots[slotKey];
  if (!curChar) return -999;

  const reqDiscard = upCard.level; // 공식 룰: Lv.1은 1장, Lv.2는 2장 패 버림
  const upCode = baseCodeOf(upCard.code);
  const charName = curChar.characterName;

  // 1. 손패에 해당 캐릭터를 공짜로 레벨업시켜주는 액션 카드(BP01-048, BP01-046, BP01-062, BP01-056, BP01-076)가 있다면
  //    패를 버리는 수동 레벨업을 절대 하지 않는다!
  const holdsFreeEvolutionCard = p.hand.some((c) => {
    const cCode = baseCodeOf(c.code);
    if (LEVELUP_CARD_TARGET[cCode] !== charName) return false;
    if (cCode === 'BP01-076' && curChar.level >= 1) return false;
    return true;
  });
  if (holdsFreeEvolutionCard) {
    return -999;
  }

  // 2. 이번 턴 OTK가 가능한 상태라면 패를 소모하는 수동 레벨업 금지!
  if (burstPlan.isOtk) {
    return -999;
  }

  // 3. 버릴 수 있는 비보호 카드가 충분한지 확인
  const nonProtectedHand = p.hand.filter((c) => !burstPlan.usedCardIds.has(c.id));
  if (p.hand.length - reqDiscard < SMART_PARAMS.upgradeMinHandAfter) {
    // 예외: 양양 Lv.1(BP01-023)이나 방랑자 Lv.1(BP01-017/020), 치샤 Lv.1(BP01-026), 카멜리아 Lv.1(BP01-003), 앙코 Lv.1(BP01-013), 파수인 Lv.1(BP01-009)처럼
    // 레벨업 즉시 패/협주를 +1 보충해주는 경우에는 남는 패가 2장이어도 허용!
    const isSelfReplenishing =
      upCode === 'BP01-023' ||
      upCode === 'BP01-017' ||
      upCode === 'BP01-020' ||
      (upCode === 'BP01-003' && p.dropZone.some(isNormalAttackCard)) ||
      (upCode === 'BP01-009' && p.dropZone.some((c) => c.kind === 'ACTION' && isIntroSkillCard(c as ActionCard))) ||
      (upCode === 'BP01-026' && p.dropZone.some(isNormalAttackCard)) ||
      (upCode === 'BP01-013' && p.dropZone.some((c) => c.kind === 'ACTION' && c.characterExclusive?.includes('앙코'))) ||
      (upCode === 'BP01-032' && p.dropZone.some((c) => c.kind === 'ACTION'));
    if (!isSelfReplenishing || p.hand.length - reqDiscard < 2) {
      return -999;
    }
  }
  if (nonProtectedHand.length < reqDiscard && burstPlan.totalDamage >= 8) {
    return -999; // 8데미지 이상 빅턴 콤보 파츠를 깨면서까지 수동 레벨업하지 않음
  }

  const isLeader = slotKey === 'leader';
  const canBecomeLeaderThisTurn = isLeader || !p.actionFlags.switchedLeader;

  // 4. 진화 카드의 실제 효과 분류 평가
  let effectValue = 0;

  // (A) 위치 무관 즉시 발동 【등장】/【레벨업】 효과
  if (upCode === 'BP01-023') {
    // 양양 Lv.1: 덱 위 1장 협주 충전 (패 1장 버리고 협주 +1 & 레벨 1 달성 -> 초고효율!)
    effectValue += 5.5;
  } else if (upCode === 'BP01-032') {
    // 산화 Lv.1: 트래시에서 카드 1장 협주 배치
    const hasDropAction = p.dropZone.some((c) => c.kind === 'ACTION');
    effectValue += hasDropAction ? 5.2 : -3.0; // 트래시가 비어있으면 지금 올리지 마라!
  } else if (upCode === 'BP01-003') {
    // 카멜리아 Lv.1: 트래시에서 <일반 공격> 1장 패 회수
    const hasNormalInDrop = p.dropZone.some(isNormalAttackCard);
    effectValue += hasNormalInDrop ? 5.1 : 1.2;
  } else if (upCode === 'BP01-017' || upCode === 'BP01-020') {
    // 방랑자 Lv.1: 덱 위 1장 공개 후 패에 추가 (사실상 무료 루팅 레벨업!)
    effectValue += 5.0;
  } else if (upCode === 'BP01-026') {
    // 치샤 Lv.1: 트래시에서 기본 공격 1장 패 회수
    const hasNormalInDrop = p.dropZone.some(isNormalAttackCard);
    effectValue += hasNormalInDrop ? 5.0 : 1.0;
  } else if (upCode === 'BP01-013') {
    // 앙코 Lv.1: 트래시에서 앙코 적색 카드 1장 패 회수
    const hasAnkeInDrop = p.dropZone.some(
      (c) => c.kind === 'ACTION' && (c as ActionCard).color === 'RED' && c.characterExclusive?.includes('앙코')
    );
    effectValue += hasAnkeInDrop ? 5.2 : 1.0;
  } else if (upCode === 'BP01-009') {
    // 파수인 Lv.1: 트래시에서 <변주 스킬> 카드 1장 패 회수
    const hasIntroInDrop = p.dropZone.some((c) => c.kind === 'ACTION' && isIntroSkillCard(c as ActionCard));
    effectValue += hasIntroInDrop ? 4.8 : 1.0;
  } else if (upCode === 'BP01-008') {
    // 파수인 Lv.1 [BP01-008]: 【교체】 1드로우 후 1장 버리기 (패 순환 엔진)
    effectValue += 3.8;
  }

  // (B) 위치 무관 필드 상시 패시브 (서포터 자리에 있어도 100% 작동!)
  if (upCode === 'SD01-001') {
    // 방랑자(여) Lv.2: 자신의 턴 시작마다 +1 드로우 (서포터 자리에서도 발동하는 최고급 엔진!)
    effectValue += 7.5;
  } else if (upCode === 'SD01-005') {
    // 치샤 Lv.2: 치샤 리더 스킬 데미지 +3 (필드 어디든 유효)
    effectValue += 6.0;
  } else if (upCode === 'BP01-006') {
    // 파수인 Lv.2: 회복 시 카드 1장 드로우 (필드 어디든 유효)
    effectValue += 5.8;
  } else if (upCode === 'BP01-022') {
    // 양양 Lv.2: 턴 종료 시 리더를 양양으로 교체 가능
    effectValue += 3.8;
  } else if (upCode === 'BP01-011') {
    // 앙코 Lv.2: 앙코 적색 카드 데미지 +1 (필드 어디든 유효)
    effectValue += 5.6;
  }

  // (C) 【리더】 전용 스킬들
  const isLeaderOnlySkill =
    upCard.description?.includes('【리더】') &&
    !['BP01-023', 'BP01-032', 'BP01-003', 'BP01-017', 'BP01-020', 'BP01-026', 'BP01-013', 'BP01-009', 'BP01-008', 'SD01-001', 'SD01-005', 'BP01-006', 'BP01-022', 'BP01-011'].includes(
      upCode
    );

  if (isLeaderOnlySkill) {
    if (!canBecomeLeaderThisTurn) {
      // 이미 리더 교대를 마쳐서 이번 턴 리더가 될 수 없는 서포터라면 【리더】 전용 레벨업 금지!
      // (단, 방랑자(여) SD01-001 등 필드 패시브 Lv.2로 가기 위한 Lv.1 징검다리이고 패가 6장 이상 많을 때만 예외 허용)
      const hasFieldPassiveLv2InDeck = p.characterDeck.some(
        (cd) =>
          cd.characterName === charName &&
          cd.level === 2 &&
          ['SD01-001', 'SD01-005', 'BP01-006', 'BP01-011'].includes(baseCodeOf(cd.code))
      );
      if (upCard.level === 1 && hasFieldPassiveLv2InDeck && p.hand.length >= 6) {
        effectValue += 2.2;
      } else {
        return -999;
      }
    } else {
      // 리더 자리이거나 이번 턴 리더로 나설 후보인 경우
      const upgradedChar = { ...curChar, ...upCard, level: upCard.level } as CharacterCard;
      const curLScore = leaderScore(p, opp, curChar, SMART_PARAMS.charBonusScale);
      const nextLScore = leaderScore(p, opp, upgradedChar, SMART_PARAMS.charBonusScale);
      // 서포터 자리라면 현재 리더보다 점수가 높아져서 실제로 교대할 만한지 확인
      if (!isLeader) {
        const activeLeaderScore = leaderScore(p, opp, p.slots.leader, SMART_PARAMS.charBonusScale);
        const hasFieldPassiveLv2InDeck = p.characterDeck.some(
          (cd) =>
            cd.characterName === charName &&
            cd.level === 2 &&
            ['SD01-001', 'SD01-005', 'BP01-006', 'BP01-011'].includes(baseCodeOf(cd.code))
        );
        if (nextLScore <= activeLeaderScore && !(upCard.level === 1 && hasFieldPassiveLv2InDeck && p.hand.length >= 5)) {
          return -999; // 리더로 내보내지도 않을 서포터를 무지성으로 레벨업하지 않는다!
        }
      }
      effectValue += Math.max(2.5, nextLScore - curLScore + (upCard.level === 2 ? 4.5 : 2.5));
    }
  }

  // 버려야 할 카드들의 가치 손실 차감
  const discards = chooseDiscards(p, opp, reqDiscard, burstPlan.usedCardIds);
  if (discards.length < reqDiscard) return -999;
  const discardCost = discards.reduce((sum, dc) => sum + Math.max(0.5, cardKeepValue(p, opp, dc) * 0.45), 0);

  return effectValue - discardCost;
}

// ----------------------------------------------------------
// 상대 색상 확률 모델 & 대결 EV 계산
// ----------------------------------------------------------
function opponentColorProbs(state: GameState, idx: 0 | 1, level: AiLevel): Record<CardColor, number> {
  const w = paramsFor(level).oppModelWeight;
  const opp = state.players[other(idx)];
  const probs: Record<CardColor, number> = { RED: 1.6, GREEN: 1.1, BLUE: 0.9 };
  opp.dropZone.forEach((c) => {
    if (c.kind === 'ACTION') probs[(c as ActionCard).color] += w;
  });
  const leaderName = opp.slots.leader.characterName || opp.slots.leader.nameKr;
  if (leaderName.includes('치샤') || leaderName.includes('금희') || leaderName.includes('카멜리아') || leaderName.includes('앙코')) {
    probs.RED += 0.65;
  }
  if (leaderName.includes('산화') || leaderName.includes('양양')) {
    probs.BLUE += 0.55;
  }
  if (leaderName.includes('방랑자') || leaderName.includes('파수인')) {
    probs.GREEN += 0.55;
  }
  const sum = probs.RED + probs.GREEN + probs.BLUE;
  return { RED: probs.RED / sum, GREEN: probs.GREEN / sum, BLUE: probs.BLUE / sum };
}

const BEATS: Record<CardColor, CardColor> = { RED: 'GREEN', GREEN: 'BLUE', BLUE: 'RED' };

function effectiveSpeed(p: PlayerState, c: ActionCard): number {
  let s = c.speed ?? 0;
  const code = baseCodeOf(c.code);
  if (slotHasCode(p.slots.leader, 'BP01-027') && c.color === 'RED') s += 0.5;
  if (code === 'BP01-059' && p.hasDominance && slotHasCharacterSkill(p.slots.leader, '앙코')) s = 10;
  return s;
}

function speedWinProb(mySpeed: number, color: CardColor, iAmActive: boolean): number {
  const oppAvg = color === 'RED' ? 8 : 7;
  const p = 0.5 + (mySpeed - oppAvg) * 0.07 + (iAmActive ? 0.08 : -0.02);
  return Math.max(0.08, Math.min(0.92, p));
}

function effectBonus(p: PlayerState, c: ActionCard, scale: number): number {
  if (scale <= 0) return 0;
  let b = 0;
  const code = baseCodeOf(c.code);
  const target = LEVELUP_CARD_TARGET[code];
  if (target) {
    const has = SLOT_KEYS.some((k) => {
      const ch = p.slots[k];
      return !!ch && ch.characterName === target && ch.level < 2;
    });
    if (has) b += 2.8;
  }
  // 우세 시 보너스가 켜지는 카드들 (지옥불 기사, 반디의 군세, 폭주의 고릴라, 크라운리스, 애곡하는 아익스, 억압, 해금, 그늘이와 구름이 출격)
  if (
    p.hasDominance &&
    ['BP01-035', 'BP01-037', 'BP01-039', 'BP01-041', 'BP01-043', 'BP01-072', 'BP01-058', 'BP01-059'].includes(code)
  ) {
    b += 1.6;
  }
  return b * scale;
}

function clashEV(
  state: GameState,
  idx: 0 | 1,
  c: ActionCard,
  probs: Record<CardColor, number>,
  level: AiLevel,
  burstPlan?: BurstPlan
): number {
  const P = paramsFor(level);
  const me = state.players[idx];
  const opp = state.players[other(idx)];
  const iAmActive = state.activePlayerIndex === idx;
  let winValue = cardRawValue(me, opp, c, me.slots.leader) + effectBonus(me, c, P.effectBonusScale);

  // 만약 이 카드가 이번 턴 OTK 또는 대폭딜 플랜의 오프너라면 승리 가치를 대폭 상향!
  if (burstPlan && burstPlan.clashCardId === c.id) {
    if (burstPlan.isOtk) {
      winValue += 35.0; // 원턴킬 오프너 최우선!
    } else if (burstPlan.totalDamage >= 7) {
      winValue += burstPlan.totalDamage * 1.1;
    }
  }

  // 다른 사용 가능한 카드가 손에 있는지 확인
  const otherPlayableInHand = me.hand.filter((h) => h.id !== c.id && canPlay(me, h));
  const hasNonComboRedOpener = otherPlayableInHand.some((h) => h.color === 'RED' && !isComboOnlyEffectCard(h) && !isComboTerminator(h));

  // 1) <변주 스킬> 카드는 스피드 0, 데미지 0, 대결 효과 없음! 다른 카드가 있으면 절대 대결 카드로 낭비하지 않고 【콤보】용으로 보존!
  if (isIntroSkillCard(c) && otherPlayableInHand.length > 0) {
    winValue -= 18.0;
  }

  // 2) 【콤보】 전용 효과 카드(넝쿨의 춤 BP01-050, 만물의 정화 SD02-011, 복성재우 BP01-071, 소리의 변화·강공격 BP01-065/067)는
  //    손에 다른 적색 오프너가 있다면 대결 오프너로 소모하지 않고 연격(COMBO_STEP)에서 터뜨리도록 보존!
  if (!isIntroSkillCard(c) && isComboOnlyEffectCard(c) && hasNonComboRedOpener) {
    winValue -= 4.5;
  }

  // 3) 반대로 【판정】/【배틀】 전용 효과가 있는 적색 카드(1드로우 강공격/공중공격, 점프, 스캔, 피어난 동백꽃 등)는
  //    연격에서 쓰면 효과가 증발하므로 대결 오프너로 적극 우선 사용!
  if (isPureClashEffectRedCard(c)) {
    winValue += 2.2;
  }

  // 4) 연격 종료 디메리트가 있는 카드(BP01-074, BP01-061)는 손에 다른 적색 콤보 카드가 있을 때 대결 오프너로 내면 손해!
  if (isComboTerminator(c) && me.hand.filter((h) => h.color === 'RED' && h.id !== c.id).length > 0) {
    const d = estimateCardDamage(me, opp, c, me.slots.leader, false, []);
    if (d < opp.hp) {
      winValue -= 8.0;
    }
  }

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
  ev -= comboCostOf(me, c) * P.costPenalty;
  if (isIntroSkillCard(c) && otherPlayableInHand.length > 0) {
    ev -= 12.0;
  }
  return ev;
}

// 리더 후보 슬롯의 "이번 대결 가치"
function leaderScore(p: PlayerState, opp: PlayerState, ch: CharacterCard, scale = 1): number {
  const playable = p.hand.filter((c) => canPlay(p, c, ch));
  if (playable.length === 0) return -5 + ch.level * 0.2;
  const vals = playable
    .map((c) => cardRawValue(p, opp, c, ch) - comboCostOf(p, c) * 0.3)
    .sort((a, b) => b - a);
  let s = vals[0] + 0.35 * (vals[1] ?? 0) + 0.15 * playable.length;

  const name = ch.characterName;
  const lv = ch.level;
  if (name === '치샤') s += 0.5 + (lv >= 1 ? 0.9 : 0) + (lv >= 2 ? 1.4 : 0);
  if (name === '금희') s += 0.8 + (lv >= 1 ? 0.9 : 0) + (lv >= 2 ? 1.5 : 0);
  if (name === '산화') s += (lv >= 1 ? 0.7 : 0) + (lv >= 2 ? 1.4 : 0);
  if (name === '양양') s += 0.6 + (lv >= 1 ? 0.6 : 0) + (lv >= 2 ? 1.1 : 0);
  if (name === '방랑자' || name.includes('방랑자')) s += (lv >= 1 ? 0.5 : 0) + (lv >= 2 ? 1.2 : 0);

  if (scale > 0) {
    let extra = 0;
    if (name === '카멜리아') extra += 1.0 + (lv >= 2 ? 1.4 : 0);
    if (name === '앙코') extra += 0.9 + (lv >= 2 ? 1.5 : 0) + (playable.some((c) => baseCodeOf(c.code) === 'BP01-059') ? 0.8 : 0);
    if (name === '파수인') extra += (playable.some((c) => c.color === 'GREEN') ? 1.2 : 0.3) + (lv >= 2 ? 1.3 : 0);
    s += extra * scale;
    playable.forEach((c) => {
      const t = LEVELUP_CARD_TARGET[baseCodeOf(c.code)];
      if (t && SLOT_KEYS.some((k) => p.slots[k]?.characterName === t)) {
        s += 0.6 * scale;
      }
    });
  }
  return s;
}

// ----------------------------------------------------------
// ★ 액션 단계 (SMART: 원턴킬 설계 + 무지성 레벨업 방지 + 전략적 턴 패스)
// ----------------------------------------------------------
function smartActionPhase(state: GameState, idx: 0 | 1, level: AiLevel): GameState {
  const P = paramsFor(level);
  let cur = state;
  let p = cur.players[idx];
  let opp = cur.players[other(idx)];

  // 0. 현재 패/필드 상태에서 원턴킬(OTK) 및 최대 폭딜 플랜 계산
  let burstPlan = estimateBurstPlan(cur, idx);

  // 1. 협주 충전 판단 (OTK에 추가 협주 1장이 필요하거나, 고코스트 피니셔를 위해 협주가 필요할 때)
  const doSmartCharge = () => {
    p = cur.players[idx];
    opp = cur.players[other(idx)];
    if (p.actionFlags.chargedConcerto || p.hand.length < 2) return;

    const maxCardCostInHand = Math.max(0, ...p.hand.map((c) => comboCostOf(p, c)));
    const targetConcerto = Math.max(P.concertoTarget, Math.min(3, maxCardCostInHand));
    const hasZeroCostEcho = p.hand.some((c) => isEchoCard(c) && c.cost === 0 && !burstPlan.usedCardIds.has(c.id));

    const wantMore =
      burstPlan.needsExtraConcerto ||
      hasZeroCostEcho ||
      p.concertoZone.length < targetConcerto ||
      p.hand.length > 7;
    if (!wantMore) return;

    const chosen = chooseCardForConcertoCharge(p, opp, burstPlan.usedCardIds);
    if (!chosen) return;

    // 충분히 가치 있는 카드는(패가 넘치거나 OTK에 협주가 꼭 필요한 경우가 아니면) 협주로 버리지 않음
    const keepVal = cardKeepValue(p, opp, chosen, burstPlan.usedCardIds);
    if (!burstPlan.needsExtraConcerto && !hasZeroCostEcho && keepVal > 5.0 && p.hand.length <= 6) {
      return;
    }

    const res = chargeConcerto(cur, idx, chosen.id);
    if (res.success) {
      cur = res.newState;
      burstPlan = estimateBurstPlan(cur, idx);
    }
  };

  doSmartCharge();

  // 2. 스마트 레벨업: 무지성 서포터 레벨업을 금지하고, 실질적 이득이 확실할 때만 실행!
  p = cur.players[idx];
  opp = cur.players[other(idx)];
  if (!p.actionFlags.upgraded && !burstPlan.isOtk) {
    let bestSlot: SlotKey | null = null;
    let bestScore = 0.8; // 최소 임계값 이상일 때만 레벨업 실행
    let bestUpgrade: CharacterCard | null = null;

    for (const k of SLOT_KEYS) {
      const ch = p.slots[k];
      if (!ch || ch.level >= 2) continue;
      const up = findEvolutionCard(p.characterDeck, ch);
      if (!up) continue;

      const score = evaluateUpgradeCandidate(p, opp, k, up, burstPlan);
      if (score > bestScore) {
        bestScore = score;
        bestSlot = k;
        bestUpgrade = up;
      }
    }

    if (bestSlot && bestUpgrade) {
      const req = bestUpgrade.level;
      const discards = chooseDiscards(p, opp, req, burstPlan.usedCardIds).map((c) => c.id);
      if (discards.length === req) {
        const res = upgradeCharacter(cur, idx, bestSlot, bestUpgrade.id, discards);
        if (res.success) {
          cur = res.newState;
          burstPlan = estimateBurstPlan(cur, idx);
        }
      }
    }
  }

  // 레벨업 효과(예: 방랑자 Lv.1 드로우, 치샤/앙코 트래시 회수)로 패가 늘어났다면 협주 충전 재검토
  doSmartCharge();

  // 3. 리더 교대: OTK 플랜이 지정한 리더가 있거나, 이번 손패로 가장 강한 리더 선택
  p = cur.players[idx];
  opp = cur.players[other(idx)];
  if (!p.actionFlags.switchedLeader) {
    let targetSlot: SlotKey = 'leader';
    if (burstPlan.isOtk || burstPlan.totalDamage >= 9) {
      targetSlot = burstPlan.leaderSlot;
    } else {
      const curScore = leaderScore(p, opp, p.slots.leader, P.charBonusScale);
      let bestScore = curScore;
      (['leftSupport', 'rightSupport'] as const).forEach((k) => {
        const ch = p.slots[k];
        if (!ch) return;
        const s = leaderScore(p, opp, ch, P.charBonusScale);
        if (s > bestScore + 0.35) {
          bestScore = s;
          targetSlot = k;
        }
      });
    }
    if (targetSlot !== 'leader') {
      const res = switchLeader(cur, idx, targetSlot as 'leftSupport' | 'rightSupport');
      if (res.success) {
        cur = res.newState;
        burstPlan = estimateBurstPlan(cur, idx);
      }
    }
  }

  // 4. 배틀 개시 vs 전략적 패스(콤보 파츠 모으기) 판단
  p = cur.players[idx];
  opp = cur.players[other(idx)];
  const usable = p.hand.filter((c) => canPlay(p, c));
  if (usable.length === 0) {
    return decideClash(cur, false);
  }

  // 원턴킬이나 강한 콤보(6데미지 이상)가 준비되었거나, 무료 레벨업/드로우(녹색) 카드가 있으면 무조건 배틀 개시!
  const hasGreenSetup = usable.some((c) => c.color === 'GREEN');
  const hasFreeLevelUpPlay = usable.some((c) => Boolean(LEVELUP_CARD_TARGET[baseCodeOf(c.code)]));
  if (burstPlan.isOtk || burstPlan.totalDamage >= 5 || hasGreenSetup || hasFreeLevelUpPlay || opp.hp <= 5) {
    return decideClash(cur, true);
  }

  // 전략적 축적(존버): 내 체력이 충분하고(HP >= 12), 패가 너무 적어서(2장 이하) 콤보가 전혀 이어지지 않으며,
  // 낼 수 있는 카드가 저속/단발(최대 데미지 1~2)뿐이라면 무리하게 박치기하지 않고 턴을 넘겨 다음 턴 폭발적인 콤보를 노린다!
  if (
    p.hp >= 12 &&
    opp.hp >= 10 &&
    p.hand.length <= 2 &&
    burstPlan.totalDamage <= 2 &&
    !p.hasDominance
  ) {
    return decideClash(cur, false);
  }

  return decideClash(cur, true);
}

// ----------------------------------------------------------
// BASIC (초기 버전 로직 - 비교/회귀 테스트용)
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
  if (usableCards.length > 0) {
    currentState = decideClash(currentState, true);
  } else {
    currentState = decideClash(currentState, false);
  }
  return currentState;
}

export function runAiActionPhase(state: GameState, idx: 0 | 1 = 1, level: AiLevel = DEFAULT_AI_LEVEL): GameState {
  return level === 'BASIC' ? basicActionPhase(state, idx) : smartActionPhase(state, idx, level);
}

// ----------------------------------------------------------
// 대결 카드 선택 (Clash Set)
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
  const burstPlan = state.activePlayerIndex === idx ? estimateBurstPlan(state, idx) : undefined;

  const scored = usableCards.map((c) => ({
    c,
    ev: clashEV(state, idx, c, probs, level, burstPlan) + (Math.random() - 0.5) * 2 * paramsFor(level).noise,
  }));
  scored.sort((a, b) => b.ev - a.ev);
  return scored[0].c.id;
}

// ----------------------------------------------------------
// ★ 연격 단계 (1회 공격 후 반환 - 【콤보】 카드 최우선 활용 & 무지성 패 털기 방지)
// ----------------------------------------------------------
export function runAiComboStep(state: GameState, idx: 0 | 1 = 1, level: AiLevel = DEFAULT_AI_LEVEL): GameState {
  const currentState = { ...state };
  const ai = currentState.players[idx];
  const opp = currentState.players[other(idx)];

  if (
    currentState.phase !== 'COMBO_STEP' ||
    (!ai.comboUnlimited && ai.comboCount <= 0)
  ) {
    return finishComboStep(currentState, idx);
  }

  const actionArea = ai.actionArea || [];
  const redCards = ai.hand.filter(
    (c) =>
      c.color === 'RED' &&
      ai.concertoZone.length >= comboCostOf(ai, c) &&
      canPlayerUseActionCard(ai.slots, c, actionArea).canUse
  );
  if (redCards.length === 0) return finishComboStep(currentState, idx);

  let chosen: ActionCard | null = null;
  if (level === 'BASIC') {
    redCards.sort((a, b) => b.damage - a.damage);
    chosen = redCards[0];
  } else {
    chosen = pickBestNextComboCard(
      ai,
      opp,
      redCards,
      ai.slots,
      actionArea,
      ai.concertoZone.length,
      opp.hp,
      Boolean(ai.actionFlags?.firstNormalAttackBonusUsed)
    );

    if (chosen) {
      const cost = comboCostOf(ai, chosen);
      const dmg = estimateCardDamage(
        ai,
        opp,
        chosen,
        ai.slots.leader,
        true,
        actionArea,
        Boolean(ai.actionFlags?.firstNormalAttackBonusUsed),
        ai.slots
      );
      const code = baseCodeOf(chosen.code);

      // 현재 손패의 가용 적색 카드들로 이번 턴 킬각(Lethal)이 나오는지 계산
      const maxRemainingChainCount = ai.comboUnlimited ? redCards.length : Math.min(ai.comboCount, redCards.length);
      const sortedEstimates = redCards
        .map((rc) =>
          estimateCardDamage(
            ai,
            opp,
            rc,
            ai.slots.leader,
            true,
            actionArea,
            Boolean(ai.actionFlags?.firstNormalAttackBonusUsed),
            ai.slots
          )
        )
        .sort((a, b) => b - a);
      const chixiaEndBonus =
        slotHasCode(ai.slots.leader, 'BP01-025') &&
        [...actionArea, ...redCards].filter(isNormalAttackCard).length >= 2
          ? 3
          : 0;
      const totalPotentialDmg =
        sortedEstimates.slice(0, maxRemainingChainCount).reduce((s, v) => s + v, 0) + chixiaEndBonus;
      const isLethalTurn = dmg >= opp.hp || totalPotentialDmg >= opp.hp;

      if (!isLethalTurn) {
        const lastActionCard = actionArea[actionArea.length - 1] || null;
        const lastWasAerial = isAerialCard(lastActionCard);
        const hasBp01071InHand = redCards.some((rc) => baseCodeOf(rc.code) === 'BP01-071');
        const hasScalingInHand = redCards.some((rc) => {
          const rCode = baseCodeOf(rc.code);
          return rCode === 'BP01-050' || rCode === 'SD02-011' || rCode === 'BP01-074';
        });
        const needsNormalForChixiaLv2 =
          slotHasCode(ai.slots.leader, 'BP01-025') &&
          actionArea.filter(isNormalAttackCard).length < 2 &&
          isNormalAttackCard(chosen);

        // 이 카드가 연격(COMBO_STEP)에서 고유 시너지/어드밴티지를 창출하는 진짜 【콤보】 플레이인지 판별
        const isTrueComboSynergyPlay =
          (isIntroSkillCard(chosen) &&
            (canIntroSkillTriggerBonus(ai, ai.slots, chosen) ||
              Boolean(ai.introSkillBonusDrawCount && ai.introSkillBonusDrawCount > 0) ||
              slotHasCode(ai.slots.leader, 'BP01-008'))) ||
          (code === 'BP01-071' && lastWasAerial) ||
          (isAerialCard(chosen) && hasBp01071InHand && !lastWasAerial) ||
          (code === 'BP01-050' && [...actionArea, chosen].filter(isNormalAttackCard).length >= 2) ||
          (code === 'SD02-011' && actionArea.length + 1 >= 3) ||
          ((code === 'BP01-065' || code === 'BP01-067') &&
            ai.hand.some((h) => h.id !== chosen!.id && (h.color !== 'RED' || !canPlay(ai, h)))) ||
          (code === 'BP01-060' && slotHasCharacterSkill(ai.slots.leader, '앙코') && dmg > 0) ||
          (isNormalAttackCard(chosen) && (hasScalingInHand || needsNormalForChixiaLv2));

        // 1) 0 데미지이면서 연격 시너지도 없는 카드는 절대 무지성으로 버리지 않음
        if (dmg <= 0 && !isTrueComboSynergyPlay) {
          return finishComboStep(currentState, idx);
        }

        // 2) 코스트를 소모하는 카드는 코스트 대비 딜 효율이 기준 미달이면 협주 보존을 위해 연격 중단
        if (!isTrueComboSynergyPlay && cost > 0 && dmg / cost < paramsFor(level).comboMinDmgPerCost) {
          return finishComboStep(currentState, idx);
        }

        // 3) 다음 턴 대결(Clash)을 위한 스마트 패 보존:
        //    킬각이 아닐 때 【판정】/【배틀】 전용 효과를 가진 카드(예: 승리 시 1드로우 강공격/공중공격, 피어난 동백꽃, 고속 오프너)나
        //    손에 남은 마지막 대결 카드를 고작 1~2 데미지 짤짤이로 무지성 소모하지 않고 다음 턴 대결용으로 남긴다!
        if (!isTrueComboSynergyPlay) {
          const remainingHandAfter = ai.hand.filter((h) => h.id !== chosen!.id);
          const remainingGoodClashCards = remainingHandAfter.filter(
            (h) => !isIntroSkillCard(h) && (h.color !== 'RED' || (h.speed ?? 0) >= 6)
          );

          // (a) 【판정】/【배틀】 전용 효과 카드이거나 스피드 10 이상 주력 대결 오프너인 경우:
          //     연격 데미지가 2 이하이고 다음 턴 쓸만한 대결 카드가 1장 이하로 줄어든다면 아낀다!
          if (
            (isPureClashEffectRedCard(chosen) || (chosen.speed ?? 0) >= 10) &&
            dmg <= 2 &&
            opp.hp > dmg + 3 &&
            remainingGoodClashCards.length <= 1
          ) {
            return finishComboStep(currentState, idx);
          }

          // (b) 손패의 마지막 1장인데 상대 체력이 여유 있고(HP > 5) 1데미지짜리 일반 카드라면 다음 턴 대결을 위해 세이브!
          if (
            remainingHandAfter.length === 0 &&
            dmg <= 1 &&
            opp.hp > 5 &&
            (chosen.speed ?? 0) >= 5
          ) {
            return finishComboStep(currentState, idx);
          }
        }
      }
    }
  }

  if (!chosen) return finishComboStep(currentState, idx);

  // <변주 스킬>인 경우 어느 서포터와 교체할지 최적 슬롯 지정
  let swapSupportSlot: 'leftSupport' | 'rightSupport' | undefined = undefined;
  if (isIntroSkillCard(chosen)) {
    swapSupportSlot = pickIntroSkillSwapSlot(ai, opp, ai.slots, chosen) ?? undefined;
  }

  const res = executeComboAttack(currentState, idx, chosen.id, undefined, undefined, swapSupportSlot);
  return res.success ? res.newState : finishComboStep(currentState, idx);
}

// ----------------------------------------------------------
// 패 상한(8장 초과) 버리기
// ----------------------------------------------------------
export function runAiDiscardOverflow(state: GameState, idx: 0 | 1 = 1, level: AiLevel = DEFAULT_AI_LEVEL): GameState {
  const ai = state.players[idx];
  const opp = state.players[other(idx)];
  const excess = ai.hand.length - 8;
  if (excess <= 0) return state;

  let discardIds: string[];
  if (level === 'BASIC') {
    discardIds = [...ai.hand].sort((a, b) => b.cost - a.cost).slice(0, excess).map((c) => c.id);
  } else {
    discardIds = chooseDiscards(ai, opp, excess).map((c) => c.id);
  }
  const res = discardOverflowCards(state, idx, discardIds);
  return res.success ? res.newState : state;
}
