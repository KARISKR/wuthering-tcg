import {
  GameState,
  PlayerState,
  GamePhase,
  ClashResult,
  LogItem,
  ActionCard,
  CharacterCard,
  CardColor,
  TriggeredEffectEvent,
  CustomDeckConfig,
  PendingChoice,
} from '../types/tcg';
import {
  generateStarterActionDeck,
  STARTER_PRESETS,
  StarterDeckPreset,
  shuffleArray,
  shuffleActionDeck,
  ALL_CHARACTERS,
} from '../data/cards';
import { OFFICIAL_CARDS } from '../data/officialCards';

export type { CustomDeckConfig };

// 동일 캐릭터 여부 판별 헬퍼 (방랑자(남)과 방랑자(여)는 절대 서로 다른 캐릭터!)
export function isSameCharacter(charA: CharacterCard | undefined, charB: CharacterCard | undefined): boolean {
  if (!charA || !charB) return false;

  const isAFemale = charA.nameKr.includes('방랑자(여)') || charA.characterName.includes('방랑자(여)');
  const isAMale = charA.nameKr.includes('방랑자(남)') || charA.characterName.includes('방랑자(남)');
  const isBFemale = charB.nameKr.includes('방랑자(여)') || charB.characterName.includes('방랑자(여)');
  const isBMale = charB.nameKr.includes('방랑자(남)') || charB.characterName.includes('방랑자(남)');

  if (isAFemale || isBFemale || isAMale || isBMale) {
    if (isAFemale && isBFemale) return true;
    if (isAMale && isBMale) return true;
    return false;
  }

  return charA.characterName === charB.characterName || charA.nameKr === charB.nameKr;
}

/**
 * 캐릭터 슬롯에 중첩되어 있는 모든 카드 반환
 * (공식 룰 504.4.1: 캐릭터 카드 아래에 겹쳐 놓은 카드의 스킬은 계속 유효)
 */
export function getAllCardsInSlot(slot: CharacterCard | null | undefined): CharacterCard[] {
  if (!slot) return [];
  return [...(slot.underlyingCards || []), slot];
}

export interface ActiveCharacterCardInfo {
  card: CharacterCard;
  isLeader: boolean;
  slotKey: 'leader' | 'leftSupport' | 'rightSupport';
}

/**
 * 플레이어 필드에 활성화되어 있는 모든 캐릭터 카드와 포지션 정보 반환
 */
export function getActiveCharacterCards(player: PlayerState): ActiveCharacterCardInfo[] {
  const result: ActiveCharacterCardInfo[] = [];
  const slots: ('leader' | 'leftSupport' | 'rightSupport')[] = ['leader', 'leftSupport', 'rightSupport'];
  for (const slotKey of slots) {
    const slot = player.slots[slotKey];
    if (!slot) continue;
    const isLeader = slotKey === 'leader';
    const cards = getAllCardsInSlot(slot);
    for (const card of cards) {
      result.push({ card, isLeader, slotKey });
    }
  }
  return result;
}

/**
 * 특정 조건의 캐릭터 카드 스킬이 현재 활성 상태인지 검사
 */
export function hasActiveCharacterSkill(
  player: PlayerState,
  predicate: (info: ActiveCharacterCardInfo) => boolean
): boolean {
  return getActiveCharacterCards(player).some(predicate);
}

/**
 * 캐릭터 슬롯이 특정 캐릭터의 특정 레벨 이상 스킬을 보유(상속)하고 있는지 검사
 */
export function slotHasCharacterSkill(
  slot: CharacterCard | null | undefined,
  characterName: string,
  minLevel?: number
): boolean {
  if (!slot) return false;
  const cards = getAllCardsInSlot(slot);
  return cards.some((c) => {
    const match = c.characterName === characterName || c.nameKr.includes(characterName);
    if (!match) return false;
    if (minLevel === undefined) return true;
    return c.level >= minLevel;
  });
}

/**
 * 플레이어의 전체 필드 슬롯(리더, 서포트) 중 특정 캐릭터/레벨 스킬을 보유한 슬롯이 있는지 검사
 */
export function playerHasCharacterSkill(
  player: PlayerState,
  characterName: string,
  minLevel?: number,
  leaderOnly: boolean = false
): boolean {
  if (slotHasCharacterSkill(player.slots.leader, characterName, minLevel)) {
    return true;
  }
  if (!leaderOnly) {
    if (slotHasCharacterSkill(player.slots.leftSupport, characterName, minLevel)) return true;
    if (slotHasCharacterSkill(player.slots.rightSupport, characterName, minLevel)) return true;
  }
  return false;
}

// 캐릭터 일치 여부 판별 헬퍼 (방랑자(여) vs 방랑자(남) 정확한 분리 검증 포함)
export function isCharacterMatching(char: CharacterCard | null | undefined, exclusive: string | undefined): boolean {
  if (!char || !exclusive) return false;
  const exclusiveClean = exclusive.trim();
  if (exclusiveClean === '일반' || exclusiveClean === '-') return true;

  const charName = char.characterName || char.nameKr || '';

  if (exclusiveClean.includes('방랑자(여)')) {
    return charName.includes('방랑자(여)');
  }
  if (exclusiveClean.includes('방랑자(남)')) {
    return charName.includes('방랑자(남)');
  }

  return exclusiveClean.includes(charName) || charName.includes(exclusiveClean);
}

// 카드가 【리더 스킬】(리더 전용 발동 조건)을 요구하는지 판별
export function isLeaderSkillCard(card: ActionCard): boolean {
  const desc = card.description || '';
  const feat = (card as any).feature || '';
  return (
    desc.includes('【리더 스킬】') ||
    desc.includes('【리더스킬】') ||
    desc.includes('리더 스킬(자신의 리더가') ||
    desc.includes('자신의 리더가 이 카드의 전용 캐릭터일 경우에만 사용 가능') ||
    feat.includes('리더 스킬')
  );
}

export interface CharacterSlotsLike {
  leader: CharacterCard;
  leftSupport?: CharacterCard | null;
  rightSupport?: CharacterCard | null;
}

// <에코> 카드 판별 통합 헬퍼
export function isEchoCard(card: any): boolean {
  if (!card || card.kind !== 'ACTION') return false;
  const feat = card.feature || '';
  const desc = card.description || '';
  const baseCode = (card.code || '').split('_')[0];
  return (
    feat.includes('에코') ||
    desc.includes('동시에 1장의 <에코>만') ||
    (baseCode >= 'BP01-034' && baseCode <= 'BP01-043')
  );
}

// 공식 규칙에 따른 액션 카드 사용 가능 여부 판별
// 1. 일반 공용 카드: 누구나 사용 가능
// 2. 【리더 스킬】 카드: 해당 캐릭터가 '현재 리더(중앙)' 자리에 있어야만 발동 가능
// 3. 비(非) 리더 스킬 전용 카드: 해당 캐릭터가 '전장 3인 파티(리더 또는 좌/우 서포터)'에 존재하면 자유롭게 사용 가능!
// 4. <에코> 카드: 자신의 액션 에리어에는 동시에 1장의 <에코>만 존재할 수 있음
export function canPlayerUseActionCard(
  slots: CharacterSlotsLike,
  card: ActionCard,
  actionArea?: ActionCard[]
): { canUse: boolean; reason?: string } {
  if (actionArea && isEchoCard(card) && actionArea.some(isEchoCard)) {
    return {
      canUse: false,
      reason: '자신의 액션 에리어에는 동시에 1장의 <에코>만 존재할 수 있습니다.',
    };
  }

  if (!card.characterExclusive || card.characterExclusive === '일반' || card.characterExclusive === '-') {
    return { canUse: true };
  }

  const exclusive = card.characterExclusive;

  // 1. 【리더 스킬】이 붙어있는 카드: 현재 리더가 해당 캐릭터여야만 발동 가능
  if (isLeaderSkillCard(card)) {
    if (isCharacterMatching(slots.leader, exclusive)) {
      return { canUse: true };
    }
    return {
      canUse: false,
      reason: `【리더 스킬】은 [${exclusive}] 캐릭터가 현재 리더일 때만 사용할 수 있습니다.`,
    };
  }

  // 2. 【리더 스킬】이 없는 일반 전용 카드: 전장(리더 또는 서포터)에 해당 캐릭터가 존재하면 발동 가능
  const inLeader = isCharacterMatching(slots.leader, exclusive);
  const inLeftSupport = isCharacterMatching(slots.leftSupport, exclusive);
  const inRightSupport = isCharacterMatching(slots.rightSupport, exclusive);

  if (inLeader || inLeftSupport || inRightSupport) {
    return { canUse: true };
  }

  return {
    canUse: false,
    reason: `이 카드는 파티(리더 또는 서포터)에 [${exclusive}] 캐릭터가 있어야 사용할 수 있습니다.`,
  };
}

// 전용 카드 사용 가능 여부 판별 헬퍼 (하위 호환 지원)
export function canLeaderUseCard(
  leaderOrSlots: CharacterCard | CharacterSlotsLike | undefined,
  card: ActionCard
): boolean {
  if (!leaderOrSlots) {
    return !card.characterExclusive || card.characterExclusive === '일반' || card.characterExclusive === '-';
  }

  if ('leader' in leaderOrSlots) {
    return canPlayerUseActionCard(leaderOrSlots, card).canUse;
  }

  const char = leaderOrSlots as CharacterCard;
  if (!card.characterExclusive || card.characterExclusive === '일반' || card.characterExclusive === '-') {
    return true;
  }

  // 단일 캐릭터만 전달된 경우:
  if (isLeaderSkillCard(card)) {
    return isCharacterMatching(char, card.characterExclusive);
  }
  return isCharacterMatching(char, card.characterExclusive);
}

// <일반 공격>/<기본 공격> 카드 판별 통합 헬퍼 (카멜리아, 앙코, 치샤 등 공식 룰 매칭)
export function isNormalAttackCard(card: any): boolean {
  if (!card || card.kind !== 'ACTION') return false;
  const name = card.nameKr || '';
  const feat = card.feature || '';
  const desc = card.description || '';
  const code = (card.code || '').split('_')[0];

  return (
    name.includes('일반 공격') ||
    name.includes('기본 공격') ||
    name.includes('일반공격') ||
    feat.includes('일반 공격') ||
    feat.includes('기본 공격') ||
    desc.includes('<일반 공격>') ||
    code === 'BP01-044' || // 육성·일반 공격
    code === 'SD01-007' || // 펑펑·일반 공격
    code === 'SD01-012' || // 날카로운 바람·일반 공격
    code === 'SD01-017' || // 소리의 변화·일반 공격
    code === 'SD02-007' || // 달빛의 서리·일반 공격
    code === 'SD02-012' || // 차가운 빛·일반 공격
    code === 'SD02-017' || // 소리의 변화·일반 공격
    code === 'BP01-052' || // 근원의 추구·일반 공격
    code === 'BP01-059' || // 그늘이와 구름이 출격·일반 공격
    code === 'BP01-060'    // 양치기 소녀의 길·강공격 (<기본 공격,강공격,용융>)
  );
}

// <체공> (Aerial) 카드 판별 통합 헬퍼 (공식 카드 특성 매칭)
export function isAerialCard(card: any): boolean {
  if (!card) return false;
  const feat = card.feature || '';
  const desc = card.description || '';
  const name = card.nameKr || '';
  const code = (card.code || '').split('_')[0];
  return (
    feat.includes('체공') ||
    desc.includes('체공') ||
    desc.includes('<체공>') ||
    name.includes('체공') ||
    code === 'SD01-015' || // 점프 (이동,체공)
    code === 'SD01-021' || // 로프 (탐색 모듈,체공)
    code === 'SD02-021' || // 로프 (탐색 모듈,체공)
    code === 'BP01-069'    // 날개의 뜻·회피 (회피,체공)
  );
}

// 액션 카드 유효 코스트 계산 헬퍼 (SD01-016 북풍의 소용돌이 적색 코스트 페널티 반영)
export function getEffectiveCardCost(player: PlayerState, card: ActionCard): number {
  let effectiveCost = card.cost;
  if (card.color === 'RED' && player.tempCostPenaltyRed && player.tempCostPenaltyRed > 0) {
    effectiveCost += player.tempCostPenaltyRed;
  }
  return effectiveCost;
}

// 협주 에리어 코스트 지불 헬퍼 (자동 소모 시 에코 카드 보존 우선)
export function spendConcertoCost(
  player: PlayerState,
  cost: number,
  spentConcertoIds?: string[]
): ActionCard[] {
  if (cost <= 0) return [];
  const spentCards: ActionCard[] = [];
  if (spentConcertoIds && spentConcertoIds.length === cost) {
    const remaining: ActionCard[] = [];
    for (const c of player.concertoZone) {
      if (spentConcertoIds.includes(c.id) && spentCards.length < cost) {
        spentCards.push(c);
      } else {
        remaining.push(c);
      }
    }
    player.concertoZone = remaining;
  } else {
    // 에코가 아닌 일반 카드를 먼저 소모하여 협주 에코 시너지 유지
    const nonEchoIndices: number[] = [];
    const echoIndices: number[] = [];
    player.concertoZone.forEach((c, idx) => {
      if (isEchoCard(c)) echoIndices.push(idx);
      else nonEchoIndices.push(idx);
    });
    const toSpendIdxSet = new Set([...nonEchoIndices, ...echoIndices].slice(0, cost));
    const remaining: ActionCard[] = [];
    player.concertoZone.forEach((c, idx) => {
      if (toSpendIdxSet.has(idx)) spentCards.push(c);
      else remaining.push(c);
    });
    player.concertoZone = remaining;
  }
  player.dropZone.push(...spentCards);
  return spentCards;
}

// 0코스트 프리즘/후슈슈 에코 5종 【협주】 시너지 데미지 보너스 계산
const SONATA_ECHO_CONFIG = [
  { prismCode: 'BP01-034', sonataTag: '솟구치는 용암', partnerCode: 'BP01-035', elementTag: '용융' },
  { prismCode: 'BP01-036', sonataTag: '야밤의 서리', partnerCode: 'BP01-037', elementTag: '응결' },
  { prismCode: 'BP01-038', sonataTag: '스쳐가는 바람', partnerCode: 'BP01-039', elementTag: '기류' },
  { prismCode: 'BP01-040', sonataTag: '빛을 삼키는 해', partnerCode: 'BP01-041', elementTag: '인멸' },
  { prismCode: 'BP01-042', sonataTag: '빛나는 별', partnerCode: 'BP01-043', elementTag: '회절' },
] as const;

export function hasCardElementTag(card: ActionCard | null | undefined, elementTag: string): boolean {
  if (!card) return false;
  const feat = card.feature || (card as any).rawOfficial?.feature || '';
  return feat.includes(elementTag);
}

export function getConcertoSonataBonusDamage(player: PlayerState, card: ActionCard): number {
  let bonus = 0;
  const prevUsedCards = (player.actionArea || []).filter((c) => c.id !== card.id);

  for (const cfg of SONATA_ECHO_CONFIG) {
    if (!hasCardElementTag(card, cfg.elementTag)) continue;
    // 이번 턴에 자신이 처음 사용한 해당 속성 카드인지 확인
    const alreadyUsedElement = prevUsedCards.some((c) => hasCardElementTag(c, cfg.elementTag));
    if (alreadyUsedElement) continue;

    // 협주 에리어에 해당 프리즘 에코가 있고, 동일 화음의 다른 카드명 에코가 최소 2종류 이상 존재하는지 확인
    const matchingSonataCards = player.concertoZone.filter((c) => {
      const baseCode = (c.code || '').split('_')[0];
      const feat = c.feature || '';
      return baseCode === cfg.prismCode || baseCode === cfg.partnerCode || feat.includes(cfg.sonataTag);
    });
    const distinctCodes = new Set(matchingSonataCards.map((c) => (c.code || '').split('_')[0]));
    const prismCount = matchingSonataCards.filter((c) => (c.code || '').split('_')[0] === cfg.prismCode).length;

    if (prismCount > 0 && distinctCodes.size >= 2) {
      bonus += prismCount;
    }
  }
  return bonus;
}

// 덱에서 카드 1장 추출 헬퍼 (덱 소진 시 드롭 존의 액션 카드를 분산 리셔플)
export function drawSingleCardFromDeck(player: PlayerState): ActionCard | null {
  if (player.actionDeck.length === 0 && player.dropZone.length > 0) {
    const actionDrops = player.dropZone.filter((c): c is ActionCard => c.kind === 'ACTION');
    player.actionDeck = shuffleActionDeck(actionDrops);
    player.dropZone = player.dropZone.filter((c) => c.kind === 'CHARACTER');
  }
  if (player.actionDeck.length > 0) {
    return player.actionDeck.shift()!;
  }
  return null;
}

// 플레이어 상태 안전 깊은 복사 헬퍼 (React 불변성 보장 및 얕은 복사로 인한 참조 공유/중복 드로우 원천 차단)
export function clonePlayer(p: PlayerState): PlayerState {
  const cloneChar = (char: CharacterCard | null | undefined): any => {
    if (!char) return char;
    return {
      ...char,
      underlyingCards: char.underlyingCards ? [...char.underlyingCards] : undefined,
    };
  };

  return {
    ...p,
    hand: [...p.hand],
    actionDeck: [...p.actionDeck],
    characterDeck: [...p.characterDeck],
    concertoZone: [...p.concertoZone],
    dropZone: [...p.dropZone],
    actionArea: [...(p.actionArea || [])],
    slots: {
      leader: cloneChar(p.slots.leader),
      leftSupport: cloneChar(p.slots.leftSupport),
      rightSupport: cloneChar(p.slots.rightSupport),
    },
    actionFlags: { ...p.actionFlags },
  };
}

// 손패 카드 추가 헬퍼 (고유 ID 중복 방지 및 인스턴스 격리 보장)
export function addCardsToHand(player: PlayerState, cards: ActionCard[]): void {
  const existingIds = new Set(player.hand.map((c) => c.id));
  for (const card of cards) {
    if (!card) continue;
    let cardToAdd = card;
    if (!cardToAdd.id || existingIds.has(cardToAdd.id)) {
      cardToAdd = {
        ...cardToAdd,
        id: `card-${cardToAdd.code || 'action'}-${player.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };
    }
    player.hand.push(cardToAdd);
    existingIds.add(cardToAdd.id);
  }
}

// 캐릭터 진화 카드 탐색 헬퍼 (다음 레벨 Lv+1)
export function findEvolutionCard(characterDeck: CharacterCard[], slotChar: CharacterCard): CharacterCard | undefined {
  return characterDeck.find((c) => {
    if (slotChar.nameKr.includes('방랑자(여)')) return c.nameKr.includes('방랑자(여)') && c.level === slotChar.level + 1;
    if (slotChar.nameKr.includes('방랑자(남)')) return c.nameKr.includes('방랑자(남)') && c.level === slotChar.level + 1;
    const name = slotChar.characterName || slotChar.nameKr;
    return (c.nameKr.includes(name) || (c.characterName && c.characterName.includes(name))) && c.level === slotChar.level + 1;
  });
}

// 특정 캐릭터의 최고 진화(Lv.2) 카드 탐색 헬퍼
export function findLv2Card(characterDeck: CharacterCard[], slotChar: CharacterCard): CharacterCard | undefined {
  return characterDeck.find((c) => {
    if (slotChar.nameKr.includes('방랑자(여)')) return c.nameKr.includes('방랑자(여)') && c.level === 2;
    if (slotChar.nameKr.includes('방랑자(남)')) return c.nameKr.includes('방랑자(남)') && c.level === 2;
    const name = slotChar.characterName || slotChar.nameKr;
    return (c.nameKr.includes(name) || (c.characterName && c.characterName.includes(name))) && c.level === 2;
  });
}

// 특정 캐릭터의 모든 Lv.2 카드 목록 탐색 헬퍼 (그늘이의 대폭주 등 카드 효과 레벨업 선택용, BP01-011 포함)
export function findAllLv2Cards(characterDeck: CharacterCard[], slotChar: CharacterCard): CharacterCard[] {
  return characterDeck.filter((c) => isSameCharacter(c, slotChar) && c.level === 2);
}

// 공식 룰 603.1.2.2: 선택한 캐릭터와 레벨이 동일하거나 1단계 높은, 동명의 캐릭터 카드 전체 탐색
export function findAllUpgradableCards(characterDeck: CharacterCard[], slotChar: CharacterCard): CharacterCard[] {
  return characterDeck.filter(
    (c) =>
      isSameCharacter(c, slotChar) &&
      (c.level === slotChar.level + 1 || c.level === slotChar.level) &&
      c.code !== 'BP01-011'
  );
}

// <변주 스킬> 카드 여부 및 대상 캐릭터 판별 헬퍼
const INTRO_SKILL_TARGET_MAP: Record<string, string> = {
  'SD01-009': '치샤',       // 도약의 불빛
  'SD01-014': '양양',       // 숨결
  'SD01-019': '방랑자(여)', // 진동 소리 (방랑자 여)
  'SD02-009': '금희',       // 반룡의 빛
  'SD02-014': '산화',       // 차가운 눈꽃
  'SD02-019': '방랑자(남)', // 진동 소리 (방랑자 남)
  'BP01-046': '카멜리아',   // 팔천의 춘추
  'BP01-054': '파수인',     // 계발
  'BP01-063': '앙코',       // 양들의 도움
};

export function isIntroSkillCard(card: { code?: string; nameKr?: string; feature?: string } | null | undefined): boolean {
  if (!card) return false;
  const baseCode = (card.code || '').split('_')[0];
  if (INTRO_SKILL_TARGET_MAP[baseCode]) return true;
  if (card.feature && card.feature.includes('변주 스킬')) return true;
  if (card.nameKr && card.nameKr.includes('변주 스킬')) return true;
  return false;
}

export function getIntroSkillTargetChar(card: { code?: string; characterExclusive?: string; characterName?: string } | null | undefined): string | null {
  if (!card) return null;
  const baseCode = (card.code || '').split('_')[0];
  if (INTRO_SKILL_TARGET_MAP[baseCode]) return INTRO_SKILL_TARGET_MAP[baseCode];
  return card.characterExclusive || card.characterName || null;
}

export function doesCharMatchIntroTarget(char: CharacterCard | null | undefined, targetName: string | null): boolean {
  if (!char || !targetName) return false;
  if (targetName === '방랑자(여)') {
    return char.nameKr.includes('방랑자(여)') || char.characterName.includes('방랑자(여)');
  }
  if (targetName === '방랑자(남)') {
    return char.nameKr.includes('방랑자(남)') || char.characterName.includes('방랑자(남)');
  }
  return char.characterName === targetName || char.nameKr.includes(targetName);
}


// ==========================================
// 1. 초기 상태 생성
// ==========================================

// 커스텀 덱(프리셋 포함) 기반으로 한쪽 플레이어의 액션 덱과 캐릭터 덱 구성
function buildSideFromCustomDeck(custom: CustomDeckConfig): { deck: ActionCard[]; preset: StarterDeckPreset } {
  // 사용자가 캐릭터 덱(3~15장)을 직접 편성한 경우
  if (custom.characterDeck && custom.characterDeck.length >= 3) {
    const charDeckList = [...custom.characterDeck];

    // 필드 출전용 Lv.0 카드 3장 확보
    let leaderChar = custom.leader;
    let leftChar = custom.leftSupport;
    let rightChar = custom.rightSupport;

    // 만약 leader/left/right가 유효하지 않은 경우, characterDeck 내의 Lv.0 카드로 자동 배정
    const lv0Cards = charDeckList.filter((c) => c.level === 0);
    const uniqueLv0Map = new Map<string, CharacterCard>();
    lv0Cards.forEach((c) => {
      const name = c.characterName || c.nameKr;
      if (!uniqueLv0Map.has(name)) uniqueLv0Map.set(name, c);
    });
    const uniqueLv0List = Array.from(uniqueLv0Map.values());

    if (!leaderChar || !charDeckList.some((c) => c.code === leaderChar.code)) {
      leaderChar = uniqueLv0List[0] || charDeckList[0];
    }
    if (!leftChar || leftChar.characterName === leaderChar.characterName) {
      leftChar = uniqueLv0List.find((c) => c.characterName !== leaderChar.characterName) || uniqueLv0List[1] || charDeckList[1];
    }
    if (!rightChar || rightChar.characterName === leaderChar.characterName || rightChar.characterName === leftChar.characterName) {
      rightChar = uniqueLv0List.find((c) => c.characterName !== leaderChar.characterName && c.characterName !== leftChar.characterName) || uniqueLv0List[2] || charDeckList[2];
    }

    // 필드에 배치된 시작 3장을 제외한 나머지 카드들이 게임 중 레벨업(진화)용 캐릭터 덱이 됨
    // (동일 카드가 여러 장 있으면 1장만 필드로 나가고 나머지는 캐릭터 덱에 남음)
    const deployedIds = new Set<string>();
    const deployedCodes = [leaderChar.code, leftChar.code, rightChar.code];
    
    // 필드에 나간 카드 1장씩 제외
    const remainingDeck: CharacterCard[] = [];
    const usedCounts = new Map<string, number>();
    deployedCodes.forEach((cd) => usedCounts.set(cd, (usedCounts.get(cd) || 0) + 1));

    charDeckList.forEach((c) => {
      const needToDeduct = usedCounts.get(c.code) || 0;
      if (needToDeduct > 0 && c.level === 0) {
        usedCounts.set(c.code, needToDeduct - 1);
      } else {
        remainingDeck.push(c);
      }
    });

    return {
      deck: shuffleActionDeck([...custom.actionCards]),
      preset: {
        id: 'STARTER_CUSTOM',
        nameKr: custom.name,
        leader: leaderChar,
        leftSupport: leftChar,
        rightSupport: rightChar,
        characterDeck: remainingDeck,
      },
    };
  }

  // 기존 하위 호환 로직 (characterDeck 필드가 없는 구버전 덱)
  const selectedChars = [custom.leader, custom.leftSupport, custom.rightSupport];
  const seen = new Set<string>();
  const evolutionCards = OFFICIAL_CARDS.filter(
    (c) =>
      c.kind === 'CHARACTER' &&
      (c.level === 1 || c.level === 2) &&
      selectedChars.some((slotChar) => {
        const cIsFemale = c.nameKr.includes('방랑자(여)');
        const cIsMale = c.nameKr.includes('방랑자(남)');
        const slotIsFemale = slotChar.nameKr.includes('방랑자(여)') || slotChar.characterName.includes('방랑자(여)');
        const slotIsMale = slotChar.nameKr.includes('방랑자(남)') || slotChar.characterName.includes('방랑자(남)');

        if (cIsFemale || slotIsFemale || cIsMale || slotIsMale) {
          if (cIsFemale && slotIsFemale) return true;
          if (cIsMale && slotIsMale) return true;
          return false;
        }

        const slotName = slotChar.characterName || slotChar.nameKr;
        return c.nameKr.includes(slotName) || c.characterName?.includes(slotName);
      })
  )
    .filter((c) => {
      let charName = c.characterName || c.nameKr;
      if (c.nameKr.includes('방랑자(여)')) charName = '방랑자(여)';
      else if (c.nameKr.includes('방랑자(남)')) charName = '방랑자(남)';

      const key = `${charName}-${c.level}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((c) => {
      let charName = c.characterName || c.nameKr;
      if (c.nameKr.includes('방랑자(여)')) charName = '방랑자(여)';
      else if (c.nameKr.includes('방랑자(남)')) charName = '방랑자(남)';

      return {
        id: c.id,
        kind: 'CHARACTER' as const,
        code: c.code,
        characterName: charName,
        nameKr: c.nameKr,
        level: (c.level ?? 1) as 1 | 2,
        element: c.element,
        artUrl: c.artUrl,
        description: c.description,
        leaderSkill: c.description,
        clashSkill: c.description,
      };
    });

  return {
    deck: shuffleActionDeck([...custom.actionCards]),
    preset: {
      id: 'STARTER_ROVER',
      nameKr: custom.name,
      leader: custom.leader,
      leftSupport: custom.leftSupport,
      rightSupport: custom.rightSupport,
      characterDeck: evolutionCards,
    },
  };
}

export function createInitialGameState(
  p0PresetKey: 'STARTER_ROVER' | 'STARTER_CHIXIA' = 'STARTER_ROVER',
  p1PresetKey: 'STARTER_ROVER' | 'STARTER_CHIXIA' = 'STARTER_CHIXIA',
  gameMode: 'AI' | 'SOLO_DUAL' = 'AI',
  p0CustomDeck?: CustomDeckConfig | null,
  p1CustomDeck?: CustomDeckConfig | null
): GameState {
  let p0Deck = generateStarterActionDeck(p0PresetKey);
  let p1Deck = generateStarterActionDeck(p1PresetKey);
  let p0PresetObj = STARTER_PRESETS[p0PresetKey];
  let p1PresetObj = STARTER_PRESETS[p1PresetKey];

  // 커스텀 덱이 주어진 경우 해당 플레이어 세팅 교체 (양쪽 모두 지원)
  if (p0CustomDeck && p0CustomDeck.actionCards.length >= 40) {
    const built = buildSideFromCustomDeck(p0CustomDeck);
    p0Deck = built.deck;
    p0PresetObj = built.preset;
  }
  if (p1CustomDeck && p1CustomDeck.actionCards.length >= 40) {
    const built = buildSideFromCustomDeck(p1CustomDeck);
    p1Deck = built.deck;
    p1PresetObj = built.preset;
  }

  // 모든 액션 카드에 배틀 인스턴스 전용 고유 ID 재부여 및 디클러스터링 셔플
  p0Deck = shuffleActionDeck(
    p0Deck.map((c, i) => ({
      ...c,
      id: `card-${c.code}-p0-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    }))
  );
  p1Deck = shuffleActionDeck(
    p1Deck.map((c, i) => ({
      ...c,
      id: `card-${c.code}-p1-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    }))
  );

  // 초기 5장 드로우
  const p0Hand = p0Deck.splice(0, 5);
  const p1Hand = p1Deck.splice(0, 5);

  const player0: PlayerState = createPlayerState(
    'p0',
    '플레이어 (당신)',
    p0PresetObj,
    p0Deck,
    p0Hand,
    false
  );

  const player1: PlayerState = createPlayerState(
    'p1',
    gameMode === 'AI' ? '상대 (AI 봇)' : '상대 (플레이어 2)',
    p1PresetObj,
    p1Deck,
    p1Hand,
    gameMode === 'AI'
  );

  const initialLogs: LogItem[] = [
    {
      id: `log-init-1`,
      turn: 1,
      text: `《명조: 대결 (Wuthering Waves TCG)》 배틀이 시작되었습니다!`,
      type: 'SYSTEM',
      timestamp: Date.now(),
    },
    {
      id: `log-init-2`,
      turn: 1,
      text: `출격할 시작 리더(LEADER) 카드를 선택하세요.`,
      type: 'SYSTEM',
      timestamp: Date.now(),
    },
  ];

  return {
    turn: 1,
    activePlayerIndex: 0, // 플레이어 선공
    phase: 'LEADER_SELECT',
    players: [player0, player1],
    clashResult: null,
    lastComboStrike: null,
    winner: null,
    logs: initialLogs,
    gameMode,
  };
}

/**
 * AI용 시작 리더 자동 분석 및 최적 선택
 */
export function decideAiStartingLeader(aiPlayer: PlayerState): string {
  const chars = [aiPlayer.slots.leader, aiPlayer.slots.leftSupport, aiPlayer.slots.rightSupport].filter(Boolean) as CharacterCard[];
  if (chars.length <= 1) return chars[0]?.characterName || '방랑자';

  let bestScore = -Infinity;
  let bestChar = chars[0];

  for (const ch of chars) {
    const charName = ch.characterName;
    let score = 0;
    const exclusiveCount = aiPlayer.hand.filter((c) => c.characterExclusive === charName).length;
    const usableCount = aiPlayer.hand.filter((c) => canLeaderUseCard(ch, c)).length;
    const zeroCostUsable = aiPlayer.hand.filter((c) => c.cost === 0 && canLeaderUseCard(ch, c)).length;
    score += exclusiveCount * 2.5 + usableCount * 1.2 + zeroCostUsable * 1.0;

    // 만약 손패에 해당 캐릭터의 <변주 스킬>이 있다면 서포터(후열)에서 대기하다가 변주로 나오는 것도 유리하지만,
    // 1턴 배틀 주도권(Lv.0 리더 스킬)이 강한 캐릭터에 가산점 부여
    if (charName === '앙코') score += 2.2; // Lv.0 매 턴 첫 기본 공격 +2 데미지
    if (charName === '카멜리아') score += 2.0; // Lv.0 승리 시 트래시 일반 공격 회수
    if (charName === '방랑자' || charName.includes('방랑자')) {
      const greenCount = aiPlayer.hand.filter((c) => c.color === 'GREEN').length;
      score += 1.4 + greenCount * 1.2; // Lv.0 녹색 배틀 시 최대 2장 드로우
    }
    if (charName === '파수인') {
      const greenCount = aiPlayer.hand.filter((c) => c.color === 'GREEN').length;
      score += 1.5 + greenCount * 1.0; // Lv.0 녹색 배틀 드로우 + 녹색 승리 회복
    }
    if (charName === '양양' || charName === '산화') {
      const blueCount = aiPlayer.hand.filter((c) => c.color === 'BLUE').length;
      score += 1.3 + blueCount * 1.1; // Lv.0 청색 배틀 시 협주 1장 충전
    }
    if (charName === '치샤' || charName === '금희') {
      const redCount = aiPlayer.hand.filter((c) => c.color === 'RED').length;
      score += 1.5 + redCount * 0.6; // Lv.0 적색 배틀 시 1pt 번 데미지
    }

    if (score > bestScore) {
      bestScore = score;
      bestChar = ch;
    }
  }

  return bestChar.characterName;
}

/**
 * 시작 리더 카드 선택 (배틀 개시 준비 단계)
 */
export function selectStartingLeader(
  state: GameState,
  p0LeaderIdOrName: string,
  p1LeaderIdOrName?: string
): GameState {
  let newState = { ...state };

  // 1. P0 리더 재배치
  const p0 = { ...newState.players[0], slots: { ...newState.players[0].slots } };
  const p0Chars = [p0.slots.leader, p0.slots.leftSupport, p0.slots.rightSupport].filter(Boolean) as CharacterCard[];
  const p0Chosen = p0Chars.find((c) => c.id === p0LeaderIdOrName || c.characterName === p0LeaderIdOrName || c.nameKr === p0LeaderIdOrName) || p0.slots.leader;
  const p0Rest = p0Chars.filter((c) => c !== p0Chosen);

  p0.slots.leader = p0Chosen;
  p0.slots.leftSupport = p0Rest[0] || null;
  p0.slots.rightSupport = p0Rest[1] || null;
  newState.players[0] = p0;

  // 2. P1 리더 재배치
  const p1 = { ...newState.players[1], slots: { ...newState.players[1].slots } };
  const p1Chars = [p1.slots.leader, p1.slots.leftSupport, p1.slots.rightSupport].filter(Boolean) as CharacterCard[];
  let p1Chosen = p1.slots.leader;
  if (p1LeaderIdOrName) {
    p1Chosen = p1Chars.find((c) => c.id === p1LeaderIdOrName || c.characterName === p1LeaderIdOrName || c.nameKr === p1LeaderIdOrName) || p1.slots.leader;
  } else if (p1.isAi) {
    const aiPick = decideAiStartingLeader(p1);
    p1Chosen = p1Chars.find((c) => c.id === aiPick || c.characterName === aiPick || c.nameKr === aiPick) || p1.slots.leader;
  }
  const p1Rest = p1Chars.filter((c) => c !== p1Chosen);
  p1.slots.leader = p1Chosen;
  p1.slots.leftSupport = p1Rest[0] || null;
  p1.slots.rightSupport = p1Rest[1] || null;
  newState.players[1] = p1;

  newState = addLog(
    newState,
    `👑 [시작 리더 확정] ${p0.name}: [${p0Chosen.nameKr}] ⚔️ ${p1.name}: [${p1Chosen.nameKr}] 출격!`,
    'ACTION'
  );

  newState = addLog(
    newState,
    `양 플레이어가 초기 패 5장을 확인했습니다. 멀리건(패 교체)을 진행하세요.`,
    'SYSTEM'
  );

  newState.phase = 'MULLIGAN';
  return newState;
}

function createPlayerState(
  id: string,
  name: string,
  preset: StarterDeckPreset,
  deck: ActionCard[],
  hand: ActionCard[],
  isAi: boolean
): PlayerState {
  return {
    id,
    name,
    hp: 20,
    maxHp: 20,
    slots: {
      leader: { ...preset.leader },
      leftSupport: { ...preset.leftSupport },
      rightSupport: { ...preset.rightSupport },
    },
    characterDeck: [...preset.characterDeck],
    actionDeck: deck,
    hand,
    concertoZone: [],
    dropZone: [],
    clashCard: null,
    clashCardReady: false,
    actionFlags: {
      upgraded: false,
      switchedLeader: false,
      chargedConcerto: false,
    },
    comboCount: 0,
    comboUnlimited: false,
    actionArea: [],
    isAi,
  };
}

// 로그 헬퍼
export function addLog(
  state: GameState,
  text: string,
  type: LogItem['type'],
  playerIndex?: 0 | 1,
  meta?: {
    cardArt?: string;
    cardName?: string;
    amount?: number;
    effectTag?: string;
    drawnCards?: ActionCard[];
  }
): GameState {
  const newLog: LogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    turn: state.turn,
    playerIndex,
    text,
    type,
    timestamp: Date.now(),
    cardArt: meta?.cardArt,
    cardName: meta?.cardName,
    amount: meta?.amount,
    effectTag: meta?.effectTag,
    drawnCards: meta?.drawnCards,
  };
  return {
    ...state,
    logs: [newLog, ...state.logs].slice(0, 100), // 최대 100개 보관
  };
}

// ==========================================
// 2. 멀리건 (Mulligan)
// ==========================================

export function executeMulligan(
  state: GameState,
  p0DiscardIds: string[],
  p1DiscardIds: string[]
): GameState {
  let newState = { ...state };

  // P0 멀리건
  const p0 = { ...newState.players[0] };
  if (p0DiscardIds.length > 0) {
    const kept = p0.hand.filter((c) => !p0DiscardIds.includes(c.id));
    const discarded = p0.hand.filter((c) => p0DiscardIds.includes(c.id));
    // 덱 맨 아래로 넣고 새 카드 분산 드로우
    const deckAfter = shuffleActionDeck([...p0.actionDeck, ...discarded]);
    const newDrawn = deckAfter.splice(0, p0DiscardIds.length);
    p0.hand = [...kept, ...newDrawn];
    p0.actionDeck = deckAfter;
    newState = addLog(newState, `${p0.name}이(가) ${p0DiscardIds.length}장의 카드를 교체했습니다.`, 'ACTION', 0);
  } else {
    p0.actionDeck = shuffleActionDeck(p0.actionDeck);
    newState = addLog(newState, `${p0.name}이(가) 초기 패를 유지했습니다.`, 'ACTION', 0);
  }

  // P1 멀리건
  const p1 = { ...newState.players[1] };
  if (p1DiscardIds.length > 0) {
    const kept = p1.hand.filter((c) => !p1DiscardIds.includes(c.id));
    const discarded = p1.hand.filter((c) => p1DiscardIds.includes(c.id));
    const deckAfter = shuffleActionDeck([...p1.actionDeck, ...discarded]);
    const newDrawn = deckAfter.splice(0, p1DiscardIds.length);
    p1.hand = [...kept, ...newDrawn];
    p1.actionDeck = deckAfter;
    newState = addLog(newState, `${p1.name}이(가) ${p1DiscardIds.length}장의 카드를 교체했습니다.`, 'ACTION', 1);
  } else {
    p1.actionDeck = shuffleActionDeck(p1.actionDeck);
    newState = addLog(newState, `${p1.name}이(가) 초기 패를 유지했습니다.`, 'ACTION', 1);
  }

  newState.players = [p0, p1];

  // 1턴 시작 단계로 진입
  return executeStartPhase(newState);
}

// ==========================================
// 3. 턴 시작 단계 (START_PHASE)
// ==========================================

export function executeStartPhase(state: GameState): GameState {
  const p0 = clonePlayer(state.players[0]);
  const p1 = clonePlayer(state.players[1]);
  let newState: GameState = {
    ...state,
    phase: 'START_PHASE' as GamePhase,
    lastUpgrade: null,
    lastComboStrike: null,
    players: [p0, p1],
  };
  const activeIdx = newState.activePlayerIndex;
  const activePlayer = newState.players[activeIdx];

  newState = addLog(
    newState,
    `--- [턴 ${newState.turn}] ${activePlayer.name}의 턴 시작 ---`,
    'PHASE',
    activeIdx
  );

  // 캐릭터 패시브 확인
  // 1) SD01-001 방랑자(여) Lv.2: 【자신의 턴 시작 시】카드 1장을 뽑는다.
  //    ※ 공식 카드 텍스트에 【리더】 제한이 없으므로, 다른 카드가 리더이고 방랑자(여)가 백(서포터) 자리에 있어도 정상 발동
  const allActiveChars = getActiveCharacterCards(activePlayer);
  const roverFemaleTurnStartCard = allActiveChars.find(({ card }) => {
    if (card.code === 'SD01-001') return true;
    const isRoverFemale =
      card.nameKr.includes('방랑자(여)') ||
      card.characterName.includes('방랑자(여)') ||
      (card.characterName === '방랑자' && !card.nameKr.includes('방랑자(남)'));
    return (
      isRoverFemale &&
      card.level >= 2 &&
      (card.description?.includes('턴 시작 시') || card.description?.includes('턴 시작시'))
    );
  });

  if (roverFemaleTurnStartCard) {
    const card = drawSingleCardFromDeck(activePlayer);
    if (card) {
      addCardsToHand(activePlayer, [card]);
      const slotNameKr = roverFemaleTurnStartCard.isLeader
        ? '리더'
        : roverFemaleTurnStartCard.slotKey === 'leftSupport'
        ? '좌측 서포터(백)'
        : '우측 서포터(백)';
      newState = addLog(
        newState,
        `[방랑자(여) Lv.2 턴 시작 효과] ${slotNameKr} 자리에 있는 방랑자(여)의 효과로 덱에서 카드를 1장 드로우했습니다.`,
        'ACTION',
        activeIdx
      );
      newState.lastEffectEvent = {
        id: `effect-rover-female-draw-${Date.now()}`,
        effectType: 'DRAW',
        title: '방랑자(여) Lv.2 효과',
        description: `【자신의 턴 시작 시】${slotNameKr} 자리에 있는 방랑자(여)의 효과로 카드 1장을 드로우했습니다.`,
        sourceCardName: '방랑자(여) Lv.2 [SD01-001]',
        sourceCardArt: roverFemaleTurnStartCard.card.artUrl || '/cards/card_images/SD01-001_방랑자(여)_1139.webp',
        playerIndex: activeIdx,
        timestamp: Date.now(),
      };
    }
  }

  // 양 플레이어의 턴 단위 피격/초회 보너스 플래그 초기화 및 현재 턴 플레이어 행동 플래그 초기화
  for (const pl of [p0, p1]) {
    pl.actionFlags = {
      upgraded: false,
      switchedLeader: false,
      chargedConcerto: false,
      firstNormalAttackBonusUsed: false,
      firstDamageTakenReducedThisTurn: false,
      damageTakenThisTurn: false,
      shorekeeperLv2HealDrawCount: 0,
    };
  }
  activePlayer.comboCount = 0;
  activePlayer.introSkillBonusDrawCount = 0;

  // 드로우 단계(DRAW_PHASE)로 진입 (플레이어가 직접 덱을 클릭하거나 AI 턴 시 비동기 드로우 실행)
  newState.phase = 'DRAW_PHASE';
  return newState;
}

// ==========================================
// 4. 드로우 단계 (DRAW_PHASE)
// ==========================================

export function executeDrawPhase(state: GameState): GameState {
  const p0 = clonePlayer(state.players[0]);
  const p1 = clonePlayer(state.players[1]);
  let newState: GameState = {
    ...state,
    phase: 'DRAW_PHASE' as GamePhase,
    players: [p0, p1],
  };
  const activeIdx = newState.activePlayerIndex;
  const player = newState.players[activeIdx];

  // 선공(Turn 1)의 첫 턴 플레이어는 1장, 그 외에는 2장 드로우
  const drawCount = newState.turn === 1 && activeIdx === 0 ? 1 : 2;

  const drawnCards: ActionCard[] = [];
  for (let i = 0; i < drawCount; i++) {
    const card = drawSingleCardFromDeck(player);
    if (card) {
      drawnCards.push(card);
    }
  }

  addCardsToHand(player, drawnCards);

  // 행동 플래그 리셋 (턴 시작 시 초기화된 보너스 플래그는 유지)
  player.actionFlags = {
    ...player.actionFlags,
    upgraded: false,
    switchedLeader: false,
    chargedConcerto: false,
  };
  player.comboCount = 0;

  newState = addLog(
    newState,
    `${player.name}이(가) 카드 ${drawnCards.length}장을 드로우했습니다.`,
    'ACTION',
    activeIdx,
    {
      drawnCards: activeIdx === 0 || state.gameMode === 'SOLO_DUAL' ? [...drawnCards] : undefined,
      effectTag: '드로우',
    }
  );

  return newState;
}

// ==========================================
// 5. 액션 단계 (ACTION_PHASE) 행동들
// ==========================================

// 행동 1: 캐릭터 레벨업
export function upgradeCharacter(
  state: GameState,
  playerIndex: 0 | 1,
  targetSlot: 'leader' | 'leftSupport' | 'rightSupport',
  upgradeCardId: string,
  discardCardIds: string[]
): { success: boolean; newState: GameState; error?: string } {
  const p0 = clonePlayer(state.players[0]);
  const p1 = clonePlayer(state.players[1]);
  const player = playerIndex === 0 ? p0 : p1;

  if (player.actionFlags.upgraded) {
    return { success: false, newState: state, error: '이번 턴에는 이미 캐릭터를 레벨업했습니다 (턴당 1회).' };
  }

  const currentSlotCard = player.slots[targetSlot];
  if (!currentSlotCard) {
    return { success: false, newState: state, error: '해당 슬롯에 캐릭터가 없습니다.' };
  }

  const upgradeCard = player.characterDeck.find((c) => c.id === upgradeCardId);
  if (!upgradeCard) {
    return { success: false, newState: state, error: '캐릭터 덱에 해당 카드가 없습니다.' };
  }

  if (!isSameCharacter(upgradeCard, currentSlotCard)) {
    return {
      success: false,
      newState: state,
      error: `[${currentSlotCard.nameKr}]은(는) [${upgradeCard.nameKr}](으)로 레벨업할 수 없습니다. (동일 캐릭터만 진화 가능)`,
    };
  }

  const isValidLevel = upgradeCard.level === currentSlotCard.level + 1 || upgradeCard.level === currentSlotCard.level;
  if (!isValidLevel) {
    return { success: false, newState: state, error: `동일 레벨 또는 1단계 높은 레벨 캐릭터로만 레벨업할 수 있습니다.` };
  }

  // BP01-011 앙코 Lv.2는 카드 효과(그늘이의 대폭주 등)로만 등장 가능
  if (upgradeCard.code === 'BP01-011') {
    return {
      success: false,
      newState: state,
      error: `[앙코 BP01-011]은(는) 일반 레벨업이 불가능하며, 카드 효과로만 등장할 수 있습니다.`,
    };
  }

  // 공식 룰 603.1.2.1: 목표 캐릭터 레벨 수만큼 자신의 패를 버린다
  const requiredDiscard = upgradeCard.level;

  if (discardCardIds.length !== requiredDiscard) {
    return {
      success: false,
      newState: state,
      error: `Lv.${upgradeCard.level} 레벨업을 위해서는 패 ${requiredDiscard}장을 버려야 합니다.`,
    };
  }

  // 패에서 카드 버리기 (ID 중복 시에도 지정된 장수만큼 정확히 1:1로만 소모)
  const discarded: ActionCard[] = [];
  for (const id of discardCardIds) {
    const idx = player.hand.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const [c] = player.hand.splice(idx, 1);
      discarded.push(c);
    }
  }
  player.dropZone = [...player.dropZone, ...discarded];

  // 캐릭터 덱에서 제거하고 슬롯에 배치 (기존 카드는 묘지로 가지 않고 하위 스택으로 누적 보존!)
  player.characterDeck = player.characterDeck.filter((c) => c.id !== upgradeCardId);

  const previousStack = currentSlotCard.underlyingCards || [];
  const updatedUnderlyingCards = [
    ...previousStack,
    { ...currentSlotCard, underlyingCards: undefined },
  ];

  player.slots[targetSlot] = {
    ...upgradeCard,
    underlyingCards: updatedUnderlyingCards,
  };
  player.actionFlags.upgraded = true;

  let newState: GameState = { ...state, players: [p0, p1] };
  newState.lastUpgrade = {
    id: `upgrade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    playerIndex,
    playerName: player.name,
    character: { ...upgradeCard },
    previousLevel: currentSlotCard.level as 0 | 1 | 2,
    newLevel: upgradeCard.level as 1 | 2,
    slotName: targetSlot,
  };
  newState = addLog(
    newState,
    `[캐릭터 레벨업!] ${player.name}이(가) [${currentSlotCard.nameKr}]을(를) [${upgradeCard.nameKr}](Lv.${upgradeCard.level})(으)로 진화시켰습니다! (패 ${discarded.length}장 소비)`,
    'ACTION',
    playerIndex,
    {
      cardArt: upgradeCard.artUrl,
      cardName: upgradeCard.nameKr,
      effectTag: `Lv.${upgradeCard.level} 진화`,
    }
  );

  // ==========================================
  // 【등장】 및 【레벨업】 효과 발동 처리
  // ==========================================
  newState = applyCharacterEvolutionSkills(newState, playerIndex, targetSlot, upgradeCard, currentSlotCard, false);

  return { success: true, newState };
}

// 보류 선택 효과 큐잉 헬퍼 (중복 덮어쓰기 방지 및 순차 처리 보장)
export function queueChoice(state: GameState, choice: PendingChoice, isDeferred = false): GameState {
  let newState = { ...state };
  if (isDeferred) {
    if (!newState.deferredChoices) newState.deferredChoices = [];
    newState.deferredChoices.push(choice);
    newState.deferredChoice = choice;
  } else {
    if (!newState.pendingChoice) {
      newState.pendingChoice = choice;
    } else {
      if (!newState.pendingChoiceQueue) newState.pendingChoiceQueue = [];
      newState.pendingChoiceQueue.push(choice);
    }
  }
  return newState;
}

// 등장 및 레벨업 스킬 공통 발동 헬퍼 (공식 Q&A Q6 기준)
export function applyCharacterEvolutionSkills(
  state: GameState,
  playerIndex: 0 | 1,
  targetSlot: 'leader' | 'leftSupport' | 'rightSupport',
  upgradeCard: CharacterCard,
  currentSlotCard: CharacterCard,
  isDeferred = false
): GameState {
  let newState = { ...state };
  const player = { ...newState.players[playerIndex] };

  // ==========================================
  // 【등장】 및 【레벨업】 효과 발동 처리
  // 1) 0 -> 1 레벨업 시: 새로 필드에 올라온 1레벨 카드의 【등장】 효과 발동!
  // 2) 1 -> 2 레벨업 시: 그 위에 2레벨 카드가 겹쳐지면서 밑에 깔린 1레벨 카드의 【레벨업】 효과 발동!
  // ==========================================

  // 1. BP01-003 카멜리아 Lv.1: 【등장】/【레벨업】트래시에서 <일반 공격> 1장 패에 추가 가능
  const isCamellya1 = (c: CharacterCard | undefined) =>
    Boolean(c && c.code?.startsWith('BP01-003'));

  const cam1 = isCamellya1(upgradeCard) ? upgradeCard : isCamellya1(currentSlotCard) ? currentSlotCard : null;
  if (cam1) {
    const isEntry = isCamellya1(upgradeCard);
    const normalAttacks = player.dropZone.filter(isNormalAttackCard) as ActionCard[];
    if (normalAttacks.length > 0) {
      if (player.isAi) {
        const dropIdx = player.dropZone.findIndex(isNormalAttackCard);
        if (dropIdx !== -1) {
          const [reclaimed] = player.dropZone.splice(dropIdx, 1);
          addCardsToHand(player, [reclaimed as ActionCard]);
          newState.players[playerIndex] = player;
          newState = addLog(
            newState,
            `[카멜리아 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과] 트래시에서 [${reclaimed.nameKr}]을(를) 패에 추가했습니다.`,
            'ACTION',
            playerIndex,
            { cardArt: reclaimed.artUrl, cardName: reclaimed.nameKr, effectTag: '트래시 회수' }
          );
        }
      } else {
        const choice: PendingChoice = {
          id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          playerIndex,
          title: `카멜리아 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과 (트래시 회수)`,
          sourceCardName: '카멜리아 [BP01-003]',
          sourceCardArt: cam1.artUrl,
          description: `【${isEntry ? '등장' : '레벨업'}】 효과로 트래시 에리어에서 <일반 공격> 카드 1장을 패에 추가할 수 있습니다.`,
          revealedCards: normalAttacks,
          minSelect: 0,
          maxSelect: 1,
          onResolveType: 'RECOVER_FROM_DROP',
        };
        newState = queueChoice(newState, choice, isDeferred);
        newState.players[playerIndex] = player;
      }
    } else {
      // 트래시에 일반 공격 카드가 없음을 명확한 안내 로그로 유저에게 피드백
      newState = addLog(
        newState,
        `[카멜리아 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과] 트래시 에리어에 회수 가능한 <일반 공격> 카드가 없어 효과가 종료되었습니다.`,
        'ACTION',
        playerIndex,
        { cardArt: cam1.artUrl, cardName: cam1.nameKr, effectTag: '효과 대상 없음' }
      );
      newState.lastEffectEvent = {
        id: `eff-${Date.now()}-cam1-empty`,
        sourceCardName: '카멜리아 [BP01-003]',
        sourceCardArt: cam1.artUrl,
        effectType: 'DRAW',
        title: `카멜리아 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과`,
        description: '트래시 에리어에 회수할 수 있는 <일반 공격> 카드가 없습니다.',
        playerIndex,
        timestamp: Date.now(),
      };
    }
  }

  // 2. BP01-009 파수인 Lv.1: 트래시에서 <변주 스킬> 카드 1장 패에 추가 가능
  const sh1 = upgradeCard.code?.startsWith('BP01-009')
    ? upgradeCard
    : currentSlotCard.code?.startsWith('BP01-009')
    ? currentSlotCard
    : null;
  if (sh1) {
    const isEntry = sh1 === upgradeCard;
    const introSkills = player.dropZone.filter((c) => c.kind === 'ACTION' && isIntroSkillCard(c as ActionCard)) as ActionCard[];
    if (introSkills.length > 0) {
      if (player.isAi) {
        const dropIdx = player.dropZone.findIndex((c) => c.kind === 'ACTION' && isIntroSkillCard(c as ActionCard));
        if (dropIdx !== -1) {
          const [reclaimed] = player.dropZone.splice(dropIdx, 1);
          addCardsToHand(player, [reclaimed as ActionCard]);
          newState.players[playerIndex] = player;
          newState = addLog(
            newState,
            `[파수인 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과] 트래시에서 [${reclaimed.nameKr}]을(를) 패에 추가했습니다.`,
            'ACTION',
            playerIndex
          );
        }
      } else {
        const choice: PendingChoice = {
          id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          playerIndex,
          title: `파수인 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과 (트래시 회수)`,
          sourceCardName: '파수인 [BP01-009]',
          sourceCardArt: sh1.artUrl,
          description: `【${isEntry ? '등장' : '레벨업'}】 효과로 트래시 에리어에서 <변주 스킬> 카드 1장을 패에 추가할 수 있습니다.`,
          revealedCards: introSkills,
          minSelect: 0,
          maxSelect: 1,
          onResolveType: 'RECOVER_FROM_DROP',
        };
        newState = queueChoice(newState, choice, isDeferred);
        newState.players[playerIndex] = player;
      }
    }
  }

  // 3. BP01-013 앙코 Lv.1: 트래시에서 【앙코】의 적색 카드 1장 패에 추가 가능
  const anke1 = upgradeCard.code?.startsWith('BP01-013')
    ? upgradeCard
    : currentSlotCard.code?.startsWith('BP01-013')
    ? currentSlotCard
    : null;
  if (anke1) {
    const isEntry = anke1 === upgradeCard;
    const ankeRed = player.dropZone.filter(
      (c) => c.kind === 'ACTION' && (c as ActionCard).color === 'RED' && c.characterExclusive?.includes('앙코')
    ) as ActionCard[];
    if (ankeRed.length > 0) {
      if (player.isAi) {
        const dropIdx = player.dropZone.findIndex(
          (c) => c.kind === 'ACTION' && (c as ActionCard).color === 'RED' && c.characterExclusive?.includes('앙코')
        );
        if (dropIdx !== -1) {
          const [reclaimed] = player.dropZone.splice(dropIdx, 1);
          addCardsToHand(player, [reclaimed as ActionCard]);
          newState.players[playerIndex] = player;
          newState = addLog(
            newState,
            `[앙코 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과] 트래시에서 [${reclaimed.nameKr}]을(를) 패에 추가했습니다.`,
            'ACTION',
            playerIndex
          );
        }
      } else {
        const choice: PendingChoice = {
          id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          playerIndex,
          title: `앙코 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과 (트래시 회수)`,
          sourceCardName: '앙코 [BP01-013]',
          sourceCardArt: anke1.artUrl,
          description: `【${isEntry ? '등장' : '레벨업'}】 효과로 트래시 에리어에서 【앙코】의 적색 카드 1장을 패에 추가할 수 있습니다.`,
          revealedCards: ankeRed,
          minSelect: 0,
          maxSelect: 1,
          onResolveType: 'RECOVER_FROM_DROP',
        };
        newState = queueChoice(newState, choice, isDeferred);
        newState.players[playerIndex] = player;
      }
    }
  }

  // 4. BP01-026 치샤 Lv.1: 트래시에서 <기본 공격> 카드 1장 패에 추가 가능
  const chixia1 = upgradeCard.code?.startsWith('BP01-026')
    ? upgradeCard
    : currentSlotCard.code?.startsWith('BP01-026')
    ? currentSlotCard
    : null;
  if (chixia1) {
    const isEntry = chixia1 === upgradeCard;
    const normalAttacks = player.dropZone.filter(isNormalAttackCard) as ActionCard[];
    if (normalAttacks.length > 0) {
      if (player.isAi) {
        const dropIdx = player.dropZone.findIndex(isNormalAttackCard);
        if (dropIdx !== -1) {
          const [reclaimed] = player.dropZone.splice(dropIdx, 1);
          addCardsToHand(player, [reclaimed as ActionCard]);
          newState.players[playerIndex] = player;
          newState = addLog(
            newState,
            `[치샤 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과] 트래시에서 [${reclaimed.nameKr}]을(를) 패에 추가했습니다.`,
            'ACTION',
            playerIndex
          );
        }
      } else {
        const choice: PendingChoice = {
          id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          playerIndex,
          title: `치샤 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과 (트래시 회수)`,
          sourceCardName: '치샤 [BP01-026]',
          sourceCardArt: chixia1.artUrl,
          description: `【${isEntry ? '등장' : '레벨업'}】 효과로 트래시 에리어에서 <기본 공격> 카드 1장을 패에 추가할 수 있습니다.`,
          revealedCards: normalAttacks,
          minSelect: 0,
          maxSelect: 1,
          onResolveType: 'RECOVER_FROM_DROP',
        };
        newState = queueChoice(newState, choice, isDeferred);
        newState.players[playerIndex] = player;
      }
    }
  }

  // 5. BP01-032 산화 Lv.1: 트래시에서 카드 1장을 협주 에리어에 배치 가능
  const sanhua1 = upgradeCard.code?.startsWith('BP01-032')
    ? upgradeCard
    : currentSlotCard.code?.startsWith('BP01-032')
    ? currentSlotCard
    : null;
  if (sanhua1) {
    const isEntry = sanhua1 === upgradeCard;
    const dropCards = player.dropZone.filter((c) => c.kind === 'ACTION') as ActionCard[];
    if (dropCards.length > 0) {
      if (player.isAi) {
        const [chosen] = player.dropZone.splice(0, 1);
        player.concertoZone.push(chosen as ActionCard);
        newState.players[playerIndex] = player;
        newState = addLog(
          newState,
          `[산화 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과] 트래시에서 [${(chosen as ActionCard).nameKr}]을(를) 협주 에리어에 배치했습니다!`,
          'ACTION',
          playerIndex
        );
      } else {
        const choice: PendingChoice = {
          id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          playerIndex,
          title: `산화 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과 (협주 배치)`,
          sourceCardName: '산화 [BP01-032]',
          sourceCardArt: sanhua1.artUrl,
          description: `【${isEntry ? '등장' : '레벨업'}】 효과로 트래시 에리어에서 카드 1장을 협주 에리어에 배치할 수 있습니다.`,
          revealedCards: dropCards,
          minSelect: 0,
          maxSelect: 1,
          onResolveType: 'SET_CONCERTO',
        };
        newState = queueChoice(newState, choice, isDeferred);
        newState.players[playerIndex] = player;
      }
    }
  }

  // 6. BP01-017 / BP01-020 방랑자 Lv.1: 덱 위의 카드 1장을 공개하고 패에 추가 가능
  const rover1 = (upgradeCard.code?.startsWith('BP01-017') || upgradeCard.code?.startsWith('BP01-020'))
    ? upgradeCard
    : (currentSlotCard.code?.startsWith('BP01-017') || currentSlotCard.code?.startsWith('BP01-020'))
    ? currentSlotCard
    : null;
  if (rover1) {
    const isEntry = rover1 === upgradeCard;
    const topCard = drawSingleCardFromDeck(player);
    if (topCard) {
      if (player.isAi) {
        addCardsToHand(player, [topCard]);
        newState.players[playerIndex] = player;
        newState = addLog(
          newState,
          `[방랑자 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과] 덱 위에서 [${topCard.nameKr}]을(를) 패에 추가했습니다.`,
          'ACTION',
          playerIndex
        );
      } else {
        const choice: PendingChoice = {
          id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          playerIndex,
          title: `방랑자 Lv.1 ${isEntry ? '등장' : '레벨업'} 효과`,
          sourceCardName: `${rover1.nameKr} [${rover1.code}]`,
          sourceCardArt: rover1.artUrl,
          description: `【${isEntry ? '등장' : '레벨업'}】 효과로 덱 위의 카드 1장을 공개하고 패에 추가할 수 있습니다 (0장 선택 시 덱 유지).`,
          revealedCards: [topCard],
          minSelect: 0,
          maxSelect: 1,
          onResolveType: 'ADD_TO_HAND',
        };
        newState = queueChoice(newState, choice, isDeferred);
        newState.players[playerIndex] = player;
      }
    }
  }

  // 7. 양양 Lv.1 [BP01-023]: 【등장】/【레벨업】자신의 덱 위의 카드 1장을 협주 에리어에 배치한다.
  // (SD01-004 양양 Lv.1은 패배 드로우 카드이므로 BP01-023 코드만 정확히 판별!)
  const isYangyangBp023 = (c: CharacterCard | undefined | null) =>
    Boolean(c && c.code?.startsWith('BP01-023'));

  const isYangEntry = isYangyangBp023(upgradeCard);
  const isYangStack = isYangyangBp023(currentSlotCard);

  if (isYangEntry || isYangStack) {
    const yangCard = isYangEntry ? upgradeCard : currentSlotCard;
    const topCard = drawSingleCardFromDeck(player);
    if (topCard) {
      player.concertoZone.push(topCard);
      newState.players[playerIndex] = player;
      newState.lastEffectEvent = {
        id: `eff-${Date.now()}-yang1-${playerIndex}`,
        sourceCardName: `${yangCard.nameKr} [${yangCard.code}]`,
        sourceCardArt: yangCard.artUrl,
        effectType: 'CHARGE',
        title: `양양 Lv.1 ${isYangEntry ? '등장' : '레벨업'} 효과`,
        description: `【${isYangEntry ? '등장' : '레벨업'}】 효과로 덱 위의 카드 1장을 협주 에리어에 배치했습니다! (현재 협주: ${player.concertoZone.length})`,
        playerIndex,
        timestamp: Date.now(),
      };
      newState = addLog(
        newState,
        `[양양 Lv.1 ${isYangEntry ? '등장' : '레벨업'} 효과] ${player.name}이(가) 덱 위의 카드 [${topCard.nameKr}]을(를) 협주 에리어에 배치했습니다! (현재 협주: ${player.concertoZone.length})`,
        'ACTION',
        playerIndex,
        { cardArt: yangCard.artUrl, cardName: '양양 Lv.1', effectTag: '협주 충전' }
      );
    }
  }

  // 8. BP01-001 / BP01-002 카멜리아 Lv.2: 【레벨업】이 카드를 캐릭터 덱으로 되돌린다.
  if (currentSlotCard.code?.startsWith('BP01-001') || currentSlotCard.code?.startsWith('BP01-002')) {
    player.characterDeck.push({ ...currentSlotCard, underlyingCards: undefined });
    if (player.slots[targetSlot]?.underlyingCards) {
      player.slots[targetSlot]!.underlyingCards = player.slots[targetSlot]!.underlyingCards!.filter(
        (c) => c.id !== currentSlotCard.id
      );
    }
    newState.players[playerIndex] = player;
    newState = addLog(
      newState,
      `[카멜리아 Lv.2 레벨업 효과] [${currentSlotCard.nameKr}] 카드가 캐릭터 덱으로 되돌아갔습니다.`,
      'ACTION',
      playerIndex
    );
  }

  newState.players[playerIndex] = player;
  return newState;
}

// 파수인 Lv.1 [BP01-008] 【교체】 공통 발동 헬퍼
export function triggerShorekeeperSwitchSkill(
  state: GameState,
  playerIndex: 0 | 1,
  player: PlayerState,
  prevLeader: CharacterCard | null | undefined,
  nextLeader: CharacterCard | null | undefined
): GameState {
  const hasShorekeeperSwitch =
    getAllCardsInSlot(prevLeader).some((c) => c.code?.startsWith('BP01-008')) ||
    getAllCardsInSlot(nextLeader).some((c) => c.code?.startsWith('BP01-008'));
  if (!hasShorekeeperSwitch) return state;

  let newState = { ...state };
  const drawn = drawSingleCardFromDeck(player);
  if (drawn) {
    addCardsToHand(player, [drawn]);
    if (player.hand.length > 0) {
      // 가장 가치가 낮은 카드(전용 조건 미충족 또는 0코스트 방어/저데미지)를 버림
      let discardIdx = 0;
      let minVal = 999;
      player.hand.forEach((c, idx) => {
        const usable = canPlayerUseActionCard(player.slots, c).canUse;
        const val = (usable ? 10 : 0) + (c.damage || 0) + (c.pursuitCount || 0) * 2;
        if (val < minVal) {
          minVal = val;
          discardIdx = idx;
        }
      });
      const [discarded] = player.hand.splice(discardIdx, 1);
      if (discarded) player.dropZone.push(discarded);
    }
    newState.players[playerIndex] = player;
    newState = addLog(
      newState,
      `[파수인 Lv.1 BP01-008 교체 효과] 리더 교대로 카드 1장을 드로우하고 패 1장을 트래시로 버렸습니다.`,
      'ACTION',
      playerIndex
    );
  }
  return newState;
}

// 파수인 Lv.2 [BP01-006] 【상시】 생명력 회복 시 1장 드로우 (1턴 2회) 공통 헬퍼
export function triggerShorekeeperHealPassive(
  state: GameState,
  playerIndex: 0 | 1,
  player: PlayerState
): GameState {
  const hasShorekeeperLv2 = hasActiveCharacterSkill(player, (info) =>
    getAllCardsInSlot(info.card).some((c) => c.code?.startsWith('BP01-006'))
  );
  const currentCount = player.actionFlags.shorekeeperLv2HealDrawCount || 0;
  if (!hasShorekeeperLv2 || currentCount >= 2) return state;

  player.actionFlags.shorekeeperLv2HealDrawCount = currentCount + 1;
  const drawn = drawSingleCardFromDeck(player);
  let newState = { ...state };
  if (drawn) {
    addCardsToHand(player, [drawn]);
    newState.players[playerIndex] = player;
    newState = addLog(
      newState,
      `[파수인 Lv.2 BP01-006 상시 효과] 생명력이 회복되어 카드 1장을 드로우했습니다! (${player.actionFlags.shorekeeperLv2HealDrawCount}/2회)`,
      'ACTION',
      playerIndex
    );
  }
  return newState;
}

// 피격자 리더 데미지 보정 및 피격 플래그 기록 공통 헬퍼
// - BP01-001 카멜리아 Lv.2 리더: 받는 데미지 +1 (includeVulnerability=true일 때)
// - BP01-002 카멜리아 Lv.2 리더: 매 턴 처음 받는 데미지 -1
// - BP01-012 앙코 Lv.2 리더 조건용 damageTakenThisTurn 기록
export function applyDamageWithLeaderModifiers(
  targetPlayer: PlayerState,
  rawDmg: number,
  includeVulnerability: boolean = false
): number {
  if (rawDmg <= 0) return 0;
  let finalDmg = rawDmg;
  const targetLeaderCards = getAllCardsInSlot(targetPlayer.slots.leader);

  if (includeVulnerability && targetLeaderCards.some((c) => c.code?.startsWith('BP01-001'))) {
    finalDmg += 1;
  }

  if (
    targetLeaderCards.some((c) => c.code?.startsWith('BP01-002')) &&
    !targetPlayer.actionFlags.firstDamageTakenReducedThisTurn
  ) {
    finalDmg = Math.max(0, finalDmg - 1);
    targetPlayer.actionFlags.firstDamageTakenReducedThisTurn = true;
  }

  if (finalDmg > 0) {
    targetPlayer.hp = Math.max(0, targetPlayer.hp - finalDmg);
    targetPlayer.actionFlags.damageTakenThisTurn = true;
  }

  return finalDmg;
}

// 1코스트 보스 에코 5종 (BP01-035, BP01-037, BP01-039, BP01-041, BP01-043) 【우세】 데미지 적중 효과
export function applyBossEchoHitEffects(
  state: GameState,
  attackerIndex: 0 | 1,
  attacker: PlayerState,
  defender: PlayerState,
  card: ActionCard,
  dmgDealt: number
): GameState {
  if (dmgDealt <= 0 || !attacker.hasDominance) return state;
  let newState = { ...state };
  const baseCode = (card.code || '').split('_')[0];

  // BP01-035 지옥불 기사: 【우세】상대에게 데미지를 입힐 시 상대 패 4장당 상대의 패를 무작위로 1장 제거한다.
  if (baseCode === 'BP01-035' && defender.hand.length >= 4) {
    const removeCount = Math.floor(defender.hand.length / 4);
    const removedNames: string[] = [];
    for (let k = 0; k < removeCount && defender.hand.length > 0; k++) {
      const randIdx = Math.floor(Math.random() * defender.hand.length);
      const [discarded] = defender.hand.splice(randIdx, 1);
      if (discarded) {
        defender.dropZone.push(discarded);
        removedNames.push(discarded.nameKr);
      }
    }
    if (removedNames.length > 0) {
      newState = addLog(
        newState,
        `[지옥불 기사 BP01-035 우세 효과] 상대의 패 ${removedNames.length}장(${removedNames.join(', ')})을 무작위로 제거했습니다!`,
        'ACTION',
        attackerIndex
      );
    }
  }

  // BP01-037 반디의 군세: 【우세】상대에게 데미지를 입힐 시 상대 협주 에리어에 있는 카드 1장을 트래시 에리어에 놓는다.
  if (baseCode === 'BP01-037' && defender.concertoZone.length > 0) {
    const [discarded] = defender.concertoZone.splice(0, 1);
    defender.dropZone.push(discarded);
    newState = addLog(
      newState,
      `[반디의 군세 BP01-037 우세 효과] 상대의 협주 에너지 1장([${discarded.nameKr}])을 트래시로 버렸습니다!`,
      'ACTION',
      attackerIndex
    );
  }

  // BP01-039 폭주의 고릴라: 【우세】상대에게 데미지를 입힐 시 상대의 패를 무작위로 1장 상대 덱 맨 아래로 되돌린다.
  if (baseCode === 'BP01-039' && defender.hand.length > 0) {
    const randIdx = Math.floor(Math.random() * defender.hand.length);
    const [returnedCard] = defender.hand.splice(randIdx, 1);
    if (returnedCard) {
      defender.actionDeck.push(returnedCard);
      newState = addLog(
        newState,
        `[폭주의 고릴라 BP01-039 우세 효과] 상대의 패 1장을 상대 덱 맨 아래로 되돌렸습니다!`,
        'ACTION',
        attackerIndex
      );
    }
  }

  // BP01-041 크라운리스: 【우세】상대에게 데미지를 입힐 시 상대의 덱 위의 카드 3장을 트래시 에리어에 놓는다.
  if (baseCode === 'BP01-041' && defender.actionDeck.length > 0) {
    const milled = defender.actionDeck.splice(0, Math.min(3, defender.actionDeck.length));
    defender.dropZone.push(...milled);
    newState = addLog(
      newState,
      `[크라운리스 BP01-041 우세 효과] 상대의 덱 위에서 ${milled.length}장을 트래시로 버렸습니다!`,
      'ACTION',
      attackerIndex
    );
  }

  // BP01-043 애곡하는 아익스: 【우세】상대에게 데미지를 입힐 시 상대의 트래시 에리어에서 카드를 최대 2장까지 상대의 덱 맨 아래로 되돌린다.
  if (baseCode === 'BP01-043') {
    const actionDrops = defender.dropZone.filter((c) => c.kind === 'ACTION') as ActionCard[];
    if (actionDrops.length > 0) {
      const toReturn = actionDrops.slice(0, Math.min(2, actionDrops.length));
      for (const ret of toReturn) {
        const dIdx = defender.dropZone.findIndex((c) => c.id === ret.id);
        if (dIdx !== -1) {
          defender.dropZone.splice(dIdx, 1);
          defender.actionDeck.push(ret);
        }
      }
      newState = addLog(
        newState,
        `[애곡하는 아익스 BP01-043 우세 효과] 상대의 트래시 에리어에서 카드 ${toReturn.length}장을 상대 덱 맨 아래로 되돌렸습니다!`,
        'ACTION',
        attackerIndex
      );
    }
  }

  return newState;
}

// 행동 2: 리더 위치 변경 (교대)
export function switchLeader(
  state: GameState,
  playerIndex: 0 | 1,
  targetSlot: 'leftSupport' | 'rightSupport'
): { success: boolean; newState: GameState; error?: string } {
  const player = { ...state.players[playerIndex] };

  if (player.actionFlags.switchedLeader) {
    return { success: false, newState: state, error: '이번 턴에는 이미 위치를 교대했습니다 (턴당 1회).' };
  }

  const targetCharacter = player.slots[targetSlot];
  if (!targetCharacter) {
    return { success: false, newState: state, error: '교대할 서포터 캐릭터가 없습니다.' };
  }

  const prevLeader = player.slots.leader;
  player.slots.leader = targetCharacter;
  player.slots[targetSlot] = prevLeader;
  player.actionFlags.switchedLeader = true;

  let newState = { ...state };
  newState = triggerShorekeeperSwitchSkill(newState, playerIndex, player, prevLeader, targetCharacter);

  newState.players[playerIndex] = player;
  newState = addLog(
    newState,
    `${player.name}이(가) 리더를 [${prevLeader.nameKr}]에서 [${targetCharacter.nameKr}](으)로 교대했습니다!`,
    'ACTION',
    playerIndex
  );

  return { success: true, newState };
}

// 행동 3: 협주 충전
export function chargeConcerto(
  state: GameState,
  playerIndex: 0 | 1,
  cardId: string
): { success: boolean; newState: GameState; error?: string } {
  const player = { ...state.players[playerIndex] };

  if (player.actionFlags.chargedConcerto) {
    return { success: false, newState: state, error: '이번 턴에는 이미 협주를 충전했습니다 (턴당 1회).' };
  }

  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { success: false, newState: state, error: '패에 해당 카드가 없습니다.' };
  }

  const [chargedCard] = player.hand.splice(cardIndex, 1);
  player.concertoZone.push(chargedCard);
  player.actionFlags.chargedConcerto = true;

  let newState = { ...state };
  newState.players[playerIndex] = player;
  newState = addLog(
    newState,
    `[협주 충전] ${player.name}이(가) [${chargedCard.nameKr}]을(를) 협주 존에 충전했습니다. (현재 협주: ${player.concertoZone.length})`,
    'ACTION',
    playerIndex,
    {
      cardArt: chargedCard.artUrl,
      cardName: chargedCard.nameKr,
      effectTag: '협주 충전',
    }
  );

  return { success: true, newState };
}

// 대결 진행 여부 선택 (Clash vs Pass)
export function decideClash(state: GameState, startClash: boolean): GameState {
  if (state.pendingChoice) {
    return state; // 발동 중인 카드 효과 선택을 마칠 때까지 배틀 진입 차단
  }
  const activeIdx = state.activePlayerIndex;
  let newState = { ...state };

  if (startClash) {
    newState.phase = 'CLASH_SET';
    newState.clashResult = null;
    // 양측 대결 카드 초기화
    newState.players[0].clashCard = null;
    newState.players[0].clashCardReady = false;
    newState.players[1].clashCard = null;
    newState.players[1].clashCardReady = false;
    newState = addLog(newState, `${newState.players[activeIdx].name}이(가) 대결(배틀)을 선언했습니다!`, 'CLASH', activeIdx);

    // 파수인 Lv.2 [BP01-007]: 【리더】【자신의 배틀 페이즈 시작 시】자신의 패가 5장 미만인 경우 패가 5장이 될 때까지 카드를 뽑는다
    const activePlayer = newState.players[activeIdx];
    if (
      slotHasCharacterSkill(activePlayer.slots.leader, '파수인', 2) &&
      getAllCardsInSlot(activePlayer.slots.leader).some((c) => c.code === 'BP01-007') &&
      activePlayer.hand.length < 5
    ) {
      const needed = 5 - activePlayer.hand.length;
      const drawn: ActionCard[] = [];
      for (let k = 0; k < needed; k++) {
        const c = drawSingleCardFromDeck(activePlayer);
        if (c) drawn.push(c);
      }
      if (drawn.length > 0) {
        addCardsToHand(activePlayer, drawn);
        newState = addLog(
          newState,
          `[파수인 Lv.2 BP01-007 효과] 배틀 페이즈 개시 시 패가 5장 미만이어 카드 ${drawn.length}장을 드로우했습니다! (현재 패: ${activePlayer.hand.length}장)`,
          'ACTION',
          activeIdx
        );
      }
    }
  } else {
    // 상대가 배틀 페이즈를 패스할 경우, 상대방(비활성 플레이어)은 【우세】 획득! (공식 룰 규정)
    const oppIdx = (activeIdx === 0 ? 1 : 0) as 0 | 1;
    newState.players[oppIdx].hasDominance = true;
    newState.players[activeIdx].hasDominance = false;
    newState = addLog(
      newState,
      `${newState.players[activeIdx].name}이(가) 대결을 건너뛰었습니다. (${newState.players[oppIdx].name} 【우세】 획득!)`,
      'ACTION',
      activeIdx
    );
    return checkHandOverflowOrEndTurn(newState);
  }

  return newState;
}

// ==========================================
// 6. 대결 세트 및 판정 (CLASH_SET & RESOLVE)
// ==========================================

export function setClashCard(
  state: GameState,
  playerIndex: 0 | 1,
  cardId: string | null,
  spentConcertoIds?: string[]
): { success: boolean; newState: GameState; error?: string } {
  if (state.pendingChoice) {
    return { success: false, newState: state, error: '발동 중인 카드 효과 선택을 먼저 완료해야 합니다.' };
  }
  const player = { ...state.players[playerIndex] };

  if (cardId === null) {
    // 카드를 내지 않고 패스
    player.clashCard = null;
    player.clashCardReady = true;
  } else {
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) {
      return { success: false, newState: state, error: '패에 카드가 없습니다.' };
    }

    // 코스트 검증 (SD01-016 적색 코스트 페널티 반영)
    const effectiveCost = getEffectiveCardCost(player, card);
    if (player.concertoZone.length < effectiveCost) {
      return {
        success: false,
        newState: state,
        error: `비용(COST ${effectiveCost})이 부족합니다. 현재 협주: ${player.concertoZone.length}`,
      };
    }

    // 전용 카드 및 에코 중복 조건 검증
    const cardUsage = canPlayerUseActionCard(player.slots, card, player.actionArea);
    if (!cardUsage.canUse) {
      return {
        success: false,
        newState: state,
        error: cardUsage.reason || `이 카드는 사용할 수 없습니다.`,
      };
    }

    // 코스트 지불: 에코 카드 보존 우선 소모
    spendConcertoCost(player, effectiveCost, spentConcertoIds);

    // 패에서 세트 존으로
    player.hand = player.hand.filter((c) => c.id !== cardId);
    player.clashCard = card;
    player.clashCardReady = true;
  }

  let newState: GameState = {
    ...state,
    players: [
      playerIndex === 0 ? player : { ...state.players[0] },
      playerIndex === 1 ? player : { ...state.players[1] },
    ] as [PlayerState, PlayerState],
  };

  // 양 플레이어 모두 카드를 세트한 후에는 전장 대치 연출(900ms)을 거쳐 useGame에서 비동기로 resolveClash를 호출합니다.
  // 수동 즉시 판정은 forceResolveClash를 통해 지원됩니다.
  return { success: true, newState };
}

// 대결 즉시 강제 판정 (마스터듀얼식 수동 진행 지원 및 대기 멈춤 방지)
export function forceResolveClash(state: GameState): GameState {
  if (state.phase !== 'CLASH_SET') return state;

  let newState = { ...state };
  const p0 = { ...newState.players[0] };
  const p1 = { ...newState.players[1] };

  // AI가 아직 세트하지 않은 경우 AI 최선 카드 세트
  if (!p1.clashCardReady && p1.isAi) {
    const usable = p1.hand.find((c) => {
      const effCost = getEffectiveCardCost(p1, c);
      return p1.concertoZone.length >= effCost && canPlayerUseActionCard(p1.slots, c, p1.actionArea).canUse;
    });
    if (usable) {
      const effCost = getEffectiveCardCost(p1, usable);
      spendConcertoCost(p1, effCost);
      p1.hand = p1.hand.filter((c) => c.id !== usable.id);
      p1.clashCard = usable;
    }
  }

  p0.clashCardReady = true;
  p1.clashCardReady = true;
  newState.players = [p0, p1];

  return resolveClash(newState);
}

// ==========================================
// 배틀 스텝 (Battle Step 604.1.1) 캐릭터 & 카드 스킬 처리
// (카드가 동시에 오픈된 직후 배틀에 돌입하여 발동)
// ==========================================
export function applyBattleStepSkills(state: GameState): GameState {
  let newState = { ...state };
  const p0 = { ...newState.players[0] };
  const p1 = { ...newState.players[1] };
  const players = [p0, p1] as [PlayerState, PlayerState];

  // 양 플레이어 순회하며 공개된 대결 카드에 따른 배틀 스킬 처리
  for (const playerIndex of [0, 1] as const) {
    let player = players[playerIndex];
    const oppIdx = (playerIndex === 0 ? 1 : 0) as 0 | 1;
    const oppPlayer = players[oppIdx];
    const clashCard = player.clashCard;
    if (!clashCard) continue;

    const leaderCards = getAllCardsInSlot(player.slots.leader);

    // 1. 적색 배틀 시 스킬
    if (clashCard.color === 'RED') {
      // 1-A. 치샤 Lv.0 [BP01-027]: 적색 카드로 배틀 시 상대에게 1pt 피해
      const hasChixia0 = leaderCards.some(
        (c) => c.code?.startsWith('BP01-027') || (c.level === 0 && (c.characterName === '치샤' || c.nameKr.includes('치샤')))
      );
      if (hasChixia0) {
        const dealt = applyDamageWithLeaderModifiers(oppPlayer, 1, true);
        newState.lastEffectEvent = {
          id: `eff-${Date.now()}-chixia0-${playerIndex}`,
          sourceCardName: '치샤 Lv.0',
          sourceCardArt: player.slots.leader.artUrl,
          effectType: 'DAMAGE',
          title: '치샤 배틀 효과',
          description: `적색 카드로 배틀에 돌입하여 상대에게 ${dealt}pt 데미지를 입혔습니다!`,
          playerIndex,
          timestamp: Date.now(),
        };
        newState = addLog(
          newState,
          `[치샤 Lv.0 배틀 효과] 적색 카드로 배틀에 돌입하여 상대에게 ${dealt}pt 데미지를 입혔습니다!`,
          'DAMAGE',
          playerIndex,
          { amount: dealt, effectTag: '배틀 피해' }
        );
      }

      // 1-B. 금희 Lv.0 [BP01-030]: 적색 카드로 배틀 시 상대에게 1pt 피해
      const hasJinhsi0 = leaderCards.some(
        (c) => c.code?.startsWith('BP01-030') || (c.level === 0 && (c.characterName === '금희' || c.nameKr.includes('금희')))
      );
      if (hasJinhsi0) {
        const dealt = applyDamageWithLeaderModifiers(oppPlayer, 1, true);
        newState.lastEffectEvent = {
          id: `eff-${Date.now()}-jinhsi0-${playerIndex}`,
          sourceCardName: '금희 Lv.0',
          sourceCardArt: player.slots.leader.artUrl,
          effectType: 'DAMAGE',
          title: '금희 배틀 효과',
          description: `적색 카드로 배틀에 돌입하여 상대에게 ${dealt}pt 데미지를 입혔습니다!`,
          playerIndex,
          timestamp: Date.now(),
        };
        newState = addLog(
          newState,
          `[금희 Lv.0 배틀 효과] 적색 카드로 배틀에 돌입하여 상대에게 ${dealt}pt 데미지를 입혔습니다!`,
          'DAMAGE',
          playerIndex,
          { amount: dealt, effectTag: '배틀 피해' }
        );
      }

      // 1-C. 상대 양양 Lv.2 [SD01-003]: 상대가 적색 카드로 배틀 시 1 COST 지불 가능. 미지불 시 3pt 피해
      // (BP01-022 양양 Lv.2는 턴 종료 교체 스킬이므로 SD01-003 코드만 정확히 판별!)
      const oppLeaderCards = getAllCardsInSlot(oppPlayer.slots.leader);
      const oppHasYangyangSd01003 = oppLeaderCards.some((c) => c.code?.startsWith('SD01-003'));
      if (oppHasYangyangSd01003) {
        if (player.concertoZone.length >= 1) {
          spendConcertoCost(player, 1);
          newState = addLog(
            newState,
            `[상대 양양 Lv.2 SD01-003 배틀 효과] 상대 적색 배틀 견제로 1 COST를 지불했습니다.`,
            'ACTION',
            playerIndex
          );
        } else {
          const dealt = applyDamageWithLeaderModifiers(player, 3, true);
          newState = addLog(
            newState,
            `[상대 양양 Lv.2 SD01-003 배틀 효과] 1 COST를 지불할 수 없어 ${dealt}pt 데미지를 받았습니다!`,
            'DAMAGE',
            oppIdx,
            { amount: dealt, effectTag: '배틀 피해' }
          );
        }
      }
    }

    // 2. 녹색 배틀 시 스킬
    if (clashCard.color === 'GREEN') {
      // 2-A. 방랑자(여) [BP01-018] / 방랑자(남) [BP01-021] Lv.0 배틀 효과
      const hasRover0 = leaderCards.some(
        (c) =>
          c.code?.startsWith('BP01-018') ||
          c.code?.startsWith('BP01-021') ||
          (c.level === 0 && (c.characterName?.includes('방랑자') || c.nameKr?.includes('방랑자')))
      );
      if (hasRover0) {
        const revealed = player.actionDeck.splice(0, Math.min(2, player.actionDeck.length));
        if (revealed.length > 0) {
          if (player.isAi) {
            addCardsToHand(player, revealed);
            newState = addLog(
              newState,
              `[방랑자 Lv.0 배틀 효과] 녹색 카드 배틀 효과로 덱 위의 카드 ${revealed.length}장을 패에 추가했습니다.`,
              'ACTION',
              playerIndex
            );
          } else {
            const roverChoice: PendingChoice = {
              id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              playerIndex,
              title: '방랑자 배틀 효과',
              sourceCardName: '방랑자 Lv.0',
              sourceCardArt: player.slots.leader.artUrl,
              description: '녹색 카드로 배틀하여 덱 위의 카드를 최대 2장까지 패에 추가할 수 있습니다 (0장~2장 선택).',
              revealedCards: revealed,
              minSelect: 0,
              maxSelect: revealed.length,
              onResolveType: 'ADD_TO_HAND',
            };
            newState = queueChoice(newState, roverChoice, false);
            players[playerIndex] = player;
          }
        }
      }

      // 2-B. 파수인 Lv.0 [BP01-010]: 녹색 카드로 배틀 시 덱 위 1장 패 추가 가능
      const hasShorekeeper0 = leaderCards.some(
        (c) => c.code?.startsWith('BP01-010') || (c.level === 0 && (c.characterName === '파수인' || c.nameKr.includes('파수인')))
      );
      if (hasShorekeeper0) {
        const card = drawSingleCardFromDeck(player);
        if (card) {
          if (player.isAi) {
            addCardsToHand(player, [card]);
            newState = addLog(
              newState,
              `[파수인 Lv.0 배틀 효과] 녹색 카드 배틀 효과로 덱에서 1장을 패에 추가했습니다.`,
              'ACTION',
              playerIndex
            );
          } else {
            const shoreChoice: PendingChoice = {
              id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              playerIndex,
              title: '파수인 배틀 효과 (패 추가 선택)',
              sourceCardName: '파수인 [BP01-010]',
              sourceCardArt: player.slots.leader.artUrl,
              description: '녹색 카드로 배틀에 돌입했습니다. 덱 위의 카드 1장을 패에 추가하시겠습니까?',
              revealedCards: [card],
              minSelect: 0,
              maxSelect: 1,
              onResolveType: 'ADD_TO_HAND',
            };
            newState = queueChoice(newState, shoreChoice, false);
            players[playerIndex] = player;
          }
        }
      }
    }

    // 3. 청색 배틀 시 스킬
    if (clashCard.color === 'BLUE') {
      const hasYangyang0 = leaderCards.some(
        (c) => c.code?.startsWith('BP01-024') || (c.level === 0 && (c.characterName === '양양' || c.nameKr.includes('양양')))
      );
      const hasSanhua0 = leaderCards.some(
        (c) => c.code?.startsWith('BP01-033') || (c.level === 0 && (c.characterName === '산화' || c.nameKr.includes('산화')))
      );
      if (hasYangyang0 || hasSanhua0) {
        const card = drawSingleCardFromDeck(player);
        if (card) {
          if (player.isAi) {
            player.concertoZone.push(card);
            newState = addLog(
              newState,
              `[${hasYangyang0 ? '양양' : '산화'} Lv.0 배틀 효과] 청색 카드 배틀 효과로 덱 위 1장을 협주 에리어에 충전했습니다!`,
              'ACTION',
              playerIndex
            );
          } else {
            const charName = hasYangyang0 ? '양양' : '산화';
            const concertoChoice: PendingChoice = {
              id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              playerIndex,
              title: `${charName} 배틀 효과 (협주 배치 선택)`,
              sourceCardName: `${charName} Lv.0 [배틀 효과]`,
              sourceCardArt: player.slots.leader.artUrl,
              description: '청색 카드로 배틀에 돌입했습니다. 덱 위의 카드 1장을 협주 에리어에 배치하시겠습니까?',
              revealedCards: [card],
              minSelect: 0,
              maxSelect: 1,
              onResolveType: 'SET_CONCERTO',
            };
            newState = queueChoice(newState, concertoChoice, false);
            players[playerIndex] = player;
          }
        }
      }
    }

    // 4. 피어난 동백꽃 [BP01-048] 배틀 효과: 카멜리아 레벨업! (유저 수동 선택 지원)
    if (clashCard.code === 'BP01-048') {
      const camSlotKey = (['leader', 'leftSupport', 'rightSupport'] as const).find(
        (k) => player.slots[k]?.characterName === '카멜리아'
      );
      if (camSlotKey && player.slots[camSlotKey]) {
        const currentCam = player.slots[camSlotKey]!;
        const upgradableCams = findAllUpgradableCards(player.characterDeck, currentCam);
        if (upgradableCams.length > 0) {
          if (player.isAi) {
            const nextCam = findEvolutionCard(player.characterDeck, currentCam) || upgradableCams[0];
            player.characterDeck = player.characterDeck.filter((c) => c.id !== nextCam.id);
            const prevUnderlying = currentCam.underlyingCards || [];
            player.slots[camSlotKey] = {
              ...nextCam,
              underlyingCards: [...prevUnderlying, { ...currentCam, underlyingCards: undefined }],
            };
            newState.lastUpgrade = {
              id: `upgrade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              playerIndex,
              playerName: player.name,
              character: { ...nextCam },
              previousLevel: currentCam.level as 0 | 1 | 2,
              newLevel: nextCam.level as 1 | 2,
              slotName: camSlotKey,
            };
            newState = addLog(
              newState,
              `[피어난 동백꽃 BP01-048 배틀 효과] [카멜리아]가 [${nextCam.nameKr}](Lv.${nextCam.level})(으)로 각성 레벨업했습니다!`,
              'ACTION',
              playerIndex,
              { cardArt: nextCam.artUrl, cardName: nextCam.nameKr, effectTag: '배틀 레벨업' }
            );
            newState.players = players;
            newState = applyCharacterEvolutionSkills(newState, playerIndex, camSlotKey, nextCam, currentCam, false);
            player = { ...newState.players[playerIndex] };
            players[playerIndex] = player;
          } else {
            const upgradeChoice: PendingChoice = {
              id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              playerIndex,
              title: '피어난 동백꽃 — 카멜리아 레벨업 대상 선택',
              sourceCardName: '피어난 동백꽃 [BP01-048]',
              sourceCardArt: clashCard.artUrl,
              description: `캐릭터 덱에서 [카멜리아](현재 Lv.${currentCam.level}) 위에 겹쳐 레벨업할 카드를 직접 선택하세요.`,
              revealedCards: upgradableCams,
              minSelect: 1,
              maxSelect: 1,
              onResolveType: 'SELECT_EFFECT_UPGRADE',
              targetSlot: camSlotKey,
            };
            newState = queueChoice(newState, upgradeChoice, false);
            players[playerIndex] = player;
          }
        }
      }
    }

    // 5. 그늘이의 대폭주 [BP01-062] 배틀 효과: 앙코를 Lv.2로 진화(수동 카드 선택)시키고 리더를 앙코로 교체!
    if (clashCard.code === 'BP01-062') {
      const ankeSlotKey = (['leader', 'leftSupport', 'rightSupport'] as const).find(
        (k) => player.slots[k]?.characterName === '앙코'
      );
      if (ankeSlotKey && player.slots[ankeSlotKey]) {
        // 먼저 리더를 앙코로 교체
        if (ankeSlotKey !== 'leader') {
          const prevLeader = player.slots.leader;
          const nextLeader = player.slots[ankeSlotKey]!;
          player.slots.leader = nextLeader;
          player.slots[ankeSlotKey] = prevLeader;
          newState.players = players;
          newState = triggerShorekeeperSwitchSkill(newState, playerIndex, player, prevLeader, nextLeader);
        }
        const currentAnke = player.slots.leader;
        const lv2AnkeCards = findAllLv2Cards(player.characterDeck, currentAnke);

        if (lv2AnkeCards.length > 0) {
          if (player.isAi) {
            const lv2Anke = lv2AnkeCards.find((c) => c.code?.startsWith('BP01-011')) || lv2AnkeCards[0];
            player.characterDeck = player.characterDeck.filter((c) => c.id !== lv2Anke.id);
            const prevUnderlying = currentAnke.underlyingCards || [];
            player.slots.leader = {
              ...lv2Anke,
              underlyingCards: [...prevUnderlying, { ...currentAnke, underlyingCards: undefined }],
            };
            newState.lastUpgrade = {
              id: `upgrade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              playerIndex,
              playerName: player.name,
              character: { ...lv2Anke },
              previousLevel: currentAnke.level as 0 | 1 | 2,
              newLevel: 2,
              slotName: 'leader',
            };
            newState = addLog(
              newState,
              `[그늘이의 대폭주 BP01-062 배틀 효과] 앙코를 Lv.2 [${lv2Anke.code}]로 각성시키고 리더를 [앙코]로 교체했습니다!`,
              'ACTION',
              playerIndex,
              { cardArt: clashCard.artUrl, cardName: '그늘이의 대폭주', effectTag: '리더 교체&진화' }
            );
            newState.players = players;
            newState = applyCharacterEvolutionSkills(newState, playerIndex, 'leader', lv2Anke, currentAnke, false);
            player = { ...newState.players[playerIndex] };
            players[playerIndex] = player;
          } else {
            newState = addLog(
              newState,
              `[그늘이의 대폭주 BP01-062 배틀 효과] 리더를 [앙코]로 교체했습니다! 캐릭터 덱에서 배치할 Lv.2 [앙코]를 선택하세요.`,
              'ACTION',
              playerIndex,
              { cardArt: clashCard.artUrl, cardName: '그늘이의 대폭주', effectTag: '리더 교체&진화' }
            );
            const upgradeChoice: PendingChoice = {
              id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              playerIndex,
              title: '그늘이의 대폭주 — Lv.2 앙코 레벨업 카드 선택',
              sourceCardName: '그늘이의 대폭주 [BP01-062]',
              sourceCardArt: clashCard.artUrl,
              description: '캐릭터 덱에서 [앙코] 위에 배치하여 레벨업할 레벨 2 [앙코] 카드 1장을 직접 선택하세요.',
              revealedCards: lv2AnkeCards,
              minSelect: 1,
              maxSelect: 1,
              onResolveType: 'SELECT_EFFECT_UPGRADE',
              targetSlot: 'leader',
            };
            newState = queueChoice(newState, upgradeChoice, false);
            players[playerIndex] = player;
          }
        } else {
          newState = addLog(
            newState,
            `[그늘이의 대폭주 BP01-062 배틀 효과] 리더를 [앙코]로 교체했습니다! (캐릭터 덱에 남은 Lv.2 앙코 없음)`,
            'ACTION',
            playerIndex,
            { cardArt: clashCard.artUrl, cardName: '그늘이의 대폭주', effectTag: '리더 교체' }
          );
        }
      }
    }

    // 6. 매서운 가시 [BP01-076] 배틀 효과: 리더를 산화로 교체 가능
    if (clashCard.code === 'BP01-076') {
      const sanhuaSlotKey = (['leftSupport', 'rightSupport'] as const).find(
        (k) => player.slots[k]?.characterName === '산화'
      );
      if (sanhuaSlotKey && player.slots[sanhuaSlotKey]) {
        const prevLeader = player.slots.leader;
        const nextLeader = player.slots[sanhuaSlotKey]!;
        player.slots.leader = nextLeader;
        player.slots[sanhuaSlotKey] = prevLeader;
        newState.players = players;
        newState = triggerShorekeeperSwitchSkill(newState, playerIndex, player, prevLeader, nextLeader);
        newState = addLog(
          newState,
          `[매서운 가시 BP01-076 배틀 효과] 리더를 [${player.slots.leader.nameKr}](으)로 교체했습니다!`,
          'ACTION',
          playerIndex,
          { cardArt: clashCard.artUrl, cardName: '매서운 가시', effectTag: '리더 교체' }
        );
      }
    }

    // 7. 억압 [BP01-072] 배틀 효과: 【우세】트래시 에리어에서 <기본 공격> 혹은 <공명 해방> 카드 1장 패 추가
    if (clashCard.code === 'BP01-072' && player.hasDominance) {
      const eligibleCards = player.dropZone.filter(
        (c) =>
          c.kind === 'ACTION' &&
          (isNormalAttackCard(c) ||
            (c as ActionCard).feature?.includes('공명 해방') ||
            (c as ActionCard).nameKr.includes('공명 해방') ||
            c.code === 'BP01-062')
      ) as ActionCard[];
      if (eligibleCards.length > 0) {
        if (player.isAi) {
          const [reclaimed] = player.dropZone.splice(player.dropZone.indexOf(eligibleCards[0]), 1);
          addCardsToHand(player, [reclaimed as ActionCard]);
          newState = addLog(
            newState,
            `[억압 BP01-072 우세 효과] 트래시에서 [${reclaimed.nameKr}]을(를) 패에 회수했습니다!`,
            'ACTION',
            playerIndex,
            { cardArt: reclaimed.artUrl, cardName: reclaimed.nameKr, effectTag: '트래시 회수' }
          );
        } else {
          const recoverChoice: PendingChoice = {
            id: `choice-${Date.now()}-oppress-recover`,
            playerIndex,
            title: '억압 — 트래시 카드 회수',
            sourceCardName: '억압 [BP01-072]',
            sourceCardArt: clashCard.artUrl,
            description: '【우세】트래시 에리어에서 <기본 공격> 혹은 <공명 해방> 카드 1장을 패에 추가하세요.',
            revealedCards: eligibleCards,
            minSelect: 0,
            maxSelect: 1,
            onResolveType: 'RECOVER_FROM_DROP',
          };
          newState = queueChoice(newState, recoverChoice, false);
          players[playerIndex] = player;
        }
      }
    }
  }

  newState.players = players;
  return newState;
}

// 판정 계산 로직 (배틀 스텝 발동 -> 유저 선택 대기 -> 판정 스텝 순차 실행)
export function resolveClash(state: GameState): GameState {
  const p0 = clonePlayer(state.players[0]);
  const p1 = clonePlayer(state.players[1]);
  let newState: GameState = {
    ...state,
    phase: 'CLASH_REVEAL' as GamePhase,
    players: [p0, p1],
  };

  // 배틀 스텝 (Battle Step 604.1.1): 카드가 동시에 오픈된 직후 배틀에 돌입하여 배틀 스킬 발동!
  newState = applyBattleStepSkills(newState);

  // 배틀 스텝 발동 효과로 인해 유저 선택 팝업이 대기 중이면,
  // 판정(Clash Judgment)과 데미지 계산을 절대 백그라운드에서 진행하지 않고 유저 선택이 완료될 때까지 대기!
  if (newState.pendingChoice) {
    return newState;
  }

  return finishClashJudgment(newState);
}

// 판정 스텝 (Clash Judgment Step): 배틀 스텝 효과 해결 후 최종 상성/속도 비교 및 데미지 적용
export function finishClashJudgment(state: GameState): GameState {
  let newState: GameState = { ...state };
  const p0 = newState.players[0];
  const p1 = newState.players[1];
  const activeIdx = newState.activePlayerIndex;

  const c0 = p0.clashCard;
  const c1 = p1.clashCard;

  let winnerIndex: 0 | 1 | -1 = -1;
  let reason: ClashResult['reason'] = 'DRAW';
  let winnerColor: CardColor | undefined = undefined;
  let damageDealt = 0;
  let comboGranted = 0;
  let logText = '';

  // 1. 둘 다 카드를 안 낸 경우
  if (!c0 && !c1) {
    reason = 'DRAW';
    winnerIndex = -1;
    logText = '양측 모두 액션 카드를 내지 않아 무승부 처리되었습니다.';
  }
  // 2. 한쪽만 카드를 낸 경우
  else if (c0 && !c1) {
    winnerIndex = 0;
    reason = 'SOLO_CARD';
    winnerColor = c0.color;
    logText = `${p0.name}만 카드를 내어 자동 판정 승리했습니다!`;
  } else if (!c0 && c1) {
    winnerIndex = 1;
    reason = 'SOLO_CARD';
    winnerColor = c1.color;
    logText = `${p1.name}만 카드를 내어 자동 판정 승리했습니다!`;
  }
  // 3. 양측 모두 카드를 낸 경우 -> 삼각 상성 및 속도 판정
  else if (c0 && c1) {
    const color0 = c0.color;
    const color1 = c1.color;

    // 상성 판정: RED > GREEN > BLUE > RED
    const beats: Record<CardColor, CardColor> = {
      RED: 'GREEN',
      GREEN: 'BLUE',
      BLUE: 'RED',
    };

    if (beats[color0] === color1) {
      // P0 상성 승리
      winnerIndex = 0;
      reason = 'COLOR_ADVANTAGE';
      winnerColor = color0;
      logText = `${p0.name}의 [${color0}]이(가) ${p1.name}의 [${color1}]에 상성 우위로 승리했습니다!`;
    } else if (beats[color1] === color0) {
      // P1 상성 승리
      winnerIndex = 1;
      reason = 'COLOR_ADVANTAGE';
      winnerColor = color1;
      logText = `${p1.name}의 [${color1}]이(가) ${p0.name}의 [${color0}]에 상성 우위로 승리했습니다!`;
    } else {
      // 같은 색상!
      if (color0 === 'BLUE') {
        // BLUE vs BLUE는 둘 다 방어이므로 무승부!
        winnerIndex = -1;
        reason = 'DRAW';
        logText = `양측 모두 [BLUE] 방어 카드를 내어 무승부(대미지 없음)가 되었습니다.`;
      } else {
        // RED vs RED 또는 GREEN vs GREEN: 속도(Speed) 비교
        let speed0 = c0.speed ?? 0;
        let speed1 = c1.speed ?? 0;

        // BP01-059 그늘이와 구름이 출격: 앙코 리더 시 스피드 10으로 변함
        if (
          c0.code === 'BP01-059' &&
          getAllCardsInSlot(p0.slots.leader).some((c) => c.characterName === '앙코' || c.nameKr.includes('앙코'))
        ) {
          speed0 = 10;
        }
        if (
          c1.code === 'BP01-059' &&
          getAllCardsInSlot(p1.slots.leader).some((c) => c.characterName === '앙코' || c.nameKr.includes('앙코'))
        ) {
          speed1 = 10;
        }

        if (speed0 > speed1) {
          winnerIndex = 0;
          reason = 'SPEED_ADVANTAGE';
          winnerColor = color0;
          logText = `동색 [${color0}] 대결! ${p0.name}(속도 ${speed0})이(가) ${p1.name}(속도 ${speed1})보다 빨라 승리했습니다!`;
        } else if (speed1 > speed0) {
          winnerIndex = 1;
          reason = 'SPEED_ADVANTAGE';
          winnerColor = color1;
          logText = `동색 [${color1}] 대결! ${p1.name}(속도 ${speed1})이(가) ${p0.name}(속도 ${speed0})보다 빨라 승리했습니다!`;
        } else {
          // 속도까지 같으면 턴 플레이어 승리!
          winnerIndex = activeIdx;
          reason = 'TURN_PLAYER_TIE';
          winnerColor = activeIdx === 0 ? color0 : color1;
          logText = `속도 동률(${speed0})! 턴을 진행 중인 선공 ${newState.players[activeIdx].name}이(가) 우선권으로 승리했습니다!`;
        }
      }
    }
  }

  // 액션 에리어에 사용한 카드 배치 (공식 룰 604.1.2.1, 505)
  if (c0) p0.actionArea = [...(p0.actionArea || []), c0];
  if (c1) p1.actionArea = [...(p1.actionArea || []), c1];

  // 대결 중 발생한 효과 목록 수집
  const triggeredEffects: TriggeredEffectEvent[] = [];

  // 승리 시 효과 처리 및 대미지 적용
  if (winnerIndex !== -1) {
    let winnerPlayer = winnerIndex === 0 ? p0 : p1;
    const loserIndex = (winnerIndex === 0 ? 1 : 0) as 0 | 1;
    const loserPlayer = loserIndex === 0 ? p0 : p1;
    const winCard = winnerIndex === 0 ? c0! : c1!;
    const loserCard = loserIndex === 0 ? c0 : c1;

    const winnerLeaderCards = getAllCardsInSlot(winnerPlayer.slots.leader);

    // 1. 대미지 계산
    let baseDmg = winCard.damage;
    let extraDmg = 0;

    // 0코스트 프리즘/후슈슈 에코 【협주】 시너지 데미지 보너스
    extraDmg += getConcertoSonataBonusDamage(winnerPlayer, winCard);

    // 금희 Lv.1 [BP01-029] 리더 판정: 적색 승리 시 상대에게 데미지 2pt
    if (winnerLeaderCards.some((c) => c.code?.startsWith('BP01-029')) && winCard.color === 'RED') {
      extraDmg += 2;
    }

    // 치샤 Lv.2 [SD01-005]: 자신의 【리더 스킬】을 가진 【치샤】의 카드 데미지 +3 (필드 어디든 유효)
    const hasChixiaSd01005 = hasActiveCharacterSkill(winnerPlayer, (info) =>
      getAllCardsInSlot(info.card).some((c) => c.code?.startsWith('SD01-005'))
    );
    if (hasChixiaSd01005 && winCard.characterExclusive?.includes('치샤') && isLeaderSkillCard(winCard)) {
      extraDmg += 3;
    }

    // 앙코 Lv.0 [BP01-015] 리더: 매 턴 처음 사용한 앙코 기본 공격 데미지 +2
    const hasAnke0 = winnerLeaderCards.some((c) => c.code?.startsWith('BP01-015'));
    if (
      hasAnke0 &&
      winCard.characterExclusive?.includes('앙코') &&
      isNormalAttackCard(winCard) &&
      !winnerPlayer.actionFlags.firstNormalAttackBonusUsed
    ) {
      extraDmg += 2;
      winnerPlayer.actionFlags.firstNormalAttackBonusUsed = true;
    }
    if (loserCard && loserCard.characterExclusive?.includes('앙코') && isNormalAttackCard(loserCard)) {
      loserPlayer.actionFlags.firstNormalAttackBonusUsed = true;
    }

    // 앙코 Lv.2 [BP01-011]: 자신의 【앙코】 적색 카드 데미지 +1 (필드 어디든 유효)
    const hasAnkeBp01011 = hasActiveCharacterSkill(winnerPlayer, (info) =>
      getAllCardsInSlot(info.card).some((c) => c.code?.startsWith('BP01-011'))
    );
    if (hasAnkeBp01011 && winCard.characterExclusive?.includes('앙코') && winCard.color === 'RED') {
      extraDmg += 1;
    }

    // 카멜리아 Lv.2 [BP01-001] 리더: 자신의 【카멜리아】 적색 카드 데미지 +1
    if (
      winnerLeaderCards.some((c) => c.code?.startsWith('BP01-001')) &&
      winCard.characterExclusive?.includes('카멜리아') &&
      winCard.color === 'RED'
    ) {
      extraDmg += 1;
    }

    // 파수인 BP01-055 근원의 추구·강공격: 생명력이 상대보다 많을 경우 데미지 +1
    if (winCard.code === 'BP01-055' && winnerPlayer.hp > loserPlayer.hp) {
      extraDmg += 1;
    }

    // 금희 BP01-074 승천하는 용: 액션 에리어 카드 1장당 데미지 +1
    if (winCard.code === 'BP01-074') {
      extraDmg += winnerPlayer.actionArea?.length || 1;
    }

    if (extraDmg > 0) {
      baseDmg += extraDmg;
      triggeredEffects.push({
        id: `eff-${Date.now()}-dmg-boost`,
        sourceCardName: winCard.nameKr,
        sourceCardArt: winCard.artUrl,
        effectType: 'DAMAGE',
        title: '공격력 강화 효과',
        description: `판정 효과로 공격 피해가 +${extraDmg} 증가했습니다!`,
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
    }

    // 피격자 데미지 보정 및 피격 플래그 적용 (BP01-001 +1, BP01-002 초회 -1, damageTakenThisTurn)
    damageDealt = applyDamageWithLeaderModifiers(loserPlayer, baseDmg, true);

    // 1코스트 보스 에코 5종 (BP01-035, BP01-037, BP01-039, BP01-041, BP01-043) 【우세】 데미지 적중 효과
    newState = applyBossEchoHitEffects(newState, winnerIndex, winnerPlayer, loserPlayer, winCard, damageDealt);

    // 2. 카드/리더 승리 특수 효과 발동
    // 금희 Lv.2 [BP01-028] 리더 판정: 자신의 턴에 승리했을 경우 덱 위 5장 확인, 모든 금희 카드 패 추가
    if (winnerIndex === activeIdx && winnerLeaderCards.some((c) => c.code?.startsWith('BP01-028'))) {
      const top5 = winnerPlayer.actionDeck.splice(0, Math.min(5, winnerPlayer.actionDeck.length));
      const jinhsiCards = top5.filter((c) => c.characterExclusive?.includes('금희') || c.nameKr.includes('금희'));
      const others = top5.filter((c) => !jinhsiCards.includes(c));
      addCardsToHand(winnerPlayer, jinhsiCards);
      winnerPlayer.dropZone.push(...others);
      newState = addLog(
        newState,
        `[금희 Lv.2 판정 효과] 덱 위 5장을 확인하여 금희 카드 ${jinhsiCards.length}장을 패에 추가했습니다!`,
        'ACTION',
        winnerIndex
      );
    }

    // 방랑자(여) Lv.2 [BP01-016] 리더 판정: 녹색 카드가 청색 카드에 승리 시 패 8장까지 드로우
    if (
      winnerLeaderCards.some((c) => c.code?.startsWith('BP01-016')) &&
      winCard.color === 'GREEN' &&
      loserCard?.color === 'BLUE'
    ) {
      const needed = Math.max(0, 8 - winnerPlayer.hand.length);
      if (needed > 0) {
        const drawnList: ActionCard[] = [];
        for (let i = 0; i < needed; i++) {
          const d = drawSingleCardFromDeck(winnerPlayer);
          if (d) drawnList.push(d);
        }
        addCardsToHand(winnerPlayer, drawnList);
        newState = addLog(
          newState,
          `[방랑자(여) Lv.2 판정 효과] 녹색 카드로 청색 카드에 승리하여 패가 8장이 될 때까지 드로우했습니다!`,
          'ACTION',
          winnerIndex
        );
      }
    }

    // BP01-005 카멜리아 리더 승리: 트래시에서 일반 공격 1장 패에 추가 가능
    if (winnerLeaderCards.some((c) => c.code?.startsWith('BP01-005') || (c.level === 0 && (c.characterName === '카멜리아' || c.nameKr.includes('카멜리아'))))) {
      const normalAttacks = winnerPlayer.dropZone.filter(isNormalAttackCard) as ActionCard[];
      if (normalAttacks.length > 0) {
        if (winnerPlayer.isAi) {
          const reclaimed = normalAttacks[0];
          winnerPlayer.dropZone = winnerPlayer.dropZone.filter((c) => c.id !== reclaimed.id);
          addCardsToHand(winnerPlayer, [reclaimed]);
          newState = addLog(
            newState,
            `[카멜리아 BP01-005 리더 효과] 판정 승리로 트래시에서 [${reclaimed.nameKr}]을(를) 패에 회수했습니다!`,
            'ACTION',
            winnerIndex,
            { cardArt: reclaimed.artUrl, cardName: reclaimed.nameKr, effectTag: '트래시 회수' }
          );
        } else {
          const camChoice: PendingChoice = {
            id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            playerIndex: winnerIndex,
            title: '카멜리아 판정 효과 (트래시 회수)',
            sourceCardName: '카멜리아 [BP01-005]',
            sourceCardArt: winnerPlayer.slots.leader.artUrl,
            description: '판정 승리 효과로 트래시 에리어의 <일반 공격> 카드 1장을 패에 추가할 수 있습니다.',
            revealedCards: normalAttacks,
            minSelect: 0,
            maxSelect: 1,
            onResolveType: 'RECOVER_FROM_DROP',
          };
          newState = queueChoice(newState, camChoice, true);
        }
      } else {
        newState = addLog(
          newState,
          `[카멜리아 BP01-005 리더 효과] 판정 승리했으나 트래시 에리어에 회수 가능한 <일반 공격> 카드가 없습니다.`,
          'ACTION',
          winnerIndex
        );
      }
    }

    // BP01-010 파수인 리더 승리: 녹색 카드로 승리 시 HP 1pt 회복
    if (
      winnerLeaderCards.some((c) => c.code?.startsWith('BP01-010') || (c.level === 0 && (c.characterName === '파수인' || c.nameKr.includes('파수인')))) &&
      winCard.color === 'GREEN'
    ) {
      winnerPlayer.hp = Math.min(winnerPlayer.maxHp, winnerPlayer.hp + 1);
      newState = addLog(
        newState,
        `[파수인 BP01-010 리더 효과] 녹색 카드 판정 승리로 HP +1을 회복했습니다! (현재 HP: ${winnerPlayer.hp}/${winnerPlayer.maxHp})`,
        'HEAL',
        winnerIndex,
        { cardArt: winnerPlayer.slots.leader.artUrl, cardName: winnerPlayer.slots.leader.nameKr, amount: 1, effectTag: '리더 회복' }
      );
      newState = triggerShorekeeperHealPassive(newState, winnerIndex, winnerPlayer);
    }

    // 혼돈의 이론 [BP01-056] 승리 효과: 파수인 레벨업!
    if (winCard.code === 'BP01-056') {
      const shSlotKey = (['leader', 'leftSupport', 'rightSupport'] as const).find(
        (k) => winnerPlayer.slots[k]?.characterName === '파수인'
      );
      if (shSlotKey && winnerPlayer.slots[shSlotKey]) {
        const currentSh = winnerPlayer.slots[shSlotKey]!;
        const nextSh = findEvolutionCard(winnerPlayer.characterDeck, currentSh);
        if (nextSh) {
          winnerPlayer.characterDeck = winnerPlayer.characterDeck.filter((c) => c.id !== nextSh.id);
          const prevUnderlying = currentSh.underlyingCards || [];
          winnerPlayer.slots[shSlotKey] = {
            ...nextSh,
            underlyingCards: [...prevUnderlying, currentSh],
          };
          newState.deferredUpgrade = {
            id: `upgrade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            playerIndex: winnerIndex,
            playerName: winnerPlayer.name,
            character: { ...nextSh },
            previousLevel: currentSh.level as 0 | 1,
            newLevel: nextSh.level as 1 | 2,
            slotName: shSlotKey,
          };
          newState = addLog(
            newState,
            `[혼돈의 이론 BP01-056 효과] [파수인]이 [${nextSh.nameKr}](Lv.${nextSh.level})(으)로 각성 레벨업했습니다!`,
            'ACTION',
            winnerIndex,
            { cardArt: nextSh.artUrl, cardName: nextSh.nameKr, effectTag: '판정 레벨업' }
          );
          // 레벨업/등장 스킬 연계
          newState.players[winnerIndex] = winnerPlayer;
          newState = applyCharacterEvolutionSkills(newState, winnerIndex, shSlotKey, nextSh, currentSh, true);
          winnerPlayer = { ...newState.players[winnerIndex] };
        }
      }
    }

    // 매서운 가시 [BP01-076] 승리 효과: 산화 레벨업!
    if (winCard.code === 'BP01-076' && winnerPlayer.slots.leader.characterName === '산화') {
      const nextSanhua = findEvolutionCard(winnerPlayer.characterDeck, winnerPlayer.slots.leader);
      if (nextSanhua) {
        const currentSanhua = winnerPlayer.slots.leader;
        winnerPlayer.characterDeck = winnerPlayer.characterDeck.filter((c) => c.id !== nextSanhua.id);
        const prevUnderlying = currentSanhua.underlyingCards || [];
        winnerPlayer.slots.leader = {
          ...nextSanhua,
          underlyingCards: [...prevUnderlying, currentSanhua],
        };
        newState.deferredUpgrade = {
          id: `upgrade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          playerIndex: winnerIndex,
          playerName: winnerPlayer.name,
          character: { ...nextSanhua },
          previousLevel: currentSanhua.level as 0 | 1,
          newLevel: nextSanhua.level as 1 | 2,
          slotName: 'leader',
        };
        newState = addLog(
          newState,
          `[매서운 가시 BP01-076 효과] [산화]가 [${nextSanhua.nameKr}](Lv.${nextSanhua.level})(으)로 각성 레벨업했습니다!`,
          'ACTION',
          winnerIndex,
          { cardArt: nextSanhua.artUrl, cardName: nextSanhua.nameKr, effectTag: '판정 레벨업' }
        );
        // 레벨업/등장 스킬 연계
        newState.players[winnerIndex] = winnerPlayer;
        newState = applyCharacterEvolutionSkills(newState, winnerIndex, 'leader', nextSanhua, currentSanhua, true);
        winnerPlayer = { ...newState.players[winnerIndex] };
      }
    }

    // 바람의 영역 [BP01-070] 승리 효과: 트래시에서 청색(방어) 카드 1장 패로 회수
    if (winCard.code === 'BP01-070') {
      const blueIdx = winnerPlayer.dropZone.findIndex((c) => c.kind === 'ACTION' && (c as ActionCard).color === 'BLUE');
      if (blueIdx !== -1) {
        const [blueCard] = winnerPlayer.dropZone.splice(blueIdx, 1);
        winnerPlayer.hand.push(blueCard as ActionCard);
        newState = addLog(
          newState,
          `[바람의 영역 BP01-070 효과] 트래시 에리어에서 청색 카드 [${blueCard.nameKr}]을(를) 패에 회수했습니다!`,
          'ACTION',
          winnerIndex,
          { cardArt: blueCard.artUrl, cardName: blueCard.nameKr, effectTag: '트래시 회수' }
        );
      }
    }

    // 만년적설 [SD02-015] 승리 효과: 덱 위 2장 협주 에리어에 배치
    if (winCard.code === 'SD02-015') {
      for (let i = 0; i < 2; i++) {
        const c = drawSingleCardFromDeck(winnerPlayer);
        if (c) winnerPlayer.concertoZone.push(c);
      }
      newState = addLog(
        newState,
        `[만년적설 SD02-015 효과] 판정 승리로 덱 위의 카드 2장을 협주 에리어에 충전했습니다!`,
        'ACTION',
        winnerIndex,
        { cardArt: winCard.artUrl, cardName: winCard.nameKr, effectTag: '협주 2장 충전' }
      );
    }

    // 창공의 무지개 [BP01-073] 승리 효과: 덱에서 [용을 타고 하늘로 향해] 서치 후 셔플
    if (winCard.code === 'BP01-073') {
      const targetIdx = winnerPlayer.actionDeck.findIndex(
        (c) => c.code === 'SD02-010' || c.nameKr.includes('용을 타고 하늘로 향해')
      );
      if (targetIdx !== -1) {
        const [card] = winnerPlayer.actionDeck.splice(targetIdx, 1);
        winnerPlayer.actionDeck = shuffleActionDeck(winnerPlayer.actionDeck);
        addCardsToHand(winnerPlayer, [card]);
        triggeredEffects.push({
          id: `eff-${Date.now()}-rainbow`,
          sourceCardName: winCard.nameKr,
          sourceCardArt: winCard.artUrl,
          effectType: 'DRAW',
          title: '용을 타고 하늘로 향해 서치',
          description: '덱에서 [용을 타고 하늘로 향해]를 찾아 패에 추가하고 덱을 셔플했습니다.',
          playerIndex: winnerIndex,
          timestamp: Date.now(),
        });
        newState = addLog(
          newState,
          `[창공의 무지개 BP01-073 효과] 덱에서 [${card.nameKr}]을(를) 패에 추가하고 덱을 셔플했습니다!`,
          'ACTION',
          winnerIndex,
          { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '덱 서치' }
        );
      }
    }

    // 결말의 순환 [BP01-057] 배틀 효과: 이번 턴에 다음 사용한 2장의 <변주 스킬>은 『【콤보】카드 1장을 뽑는다.』 획득
    if (winCard.code === 'BP01-057') {
      winnerPlayer.introSkillBonusDrawCount = 2;
      newState = addLog(
        newState,
        `[결말의 순환 BP01-057 효과] 이번 턴에 다음 사용할 2장의 <변주 스킬>에 드로우 효과가 부여되었습니다!`,
        'ACTION',
        winnerIndex,
        { cardArt: winCard.artUrl, cardName: winCard.nameKr, effectTag: '변주 드로우 부여' }
      );
    }

    // G. 드로우 효과 카드 (SD02-010: 3장, BP01-058/WW-AC-G04: 2장, 기타 1장)
    let drawN = 0;
    if (winCard.code === 'SD02-010') {
      drawN = 3;
    } else if (winCard.code === 'BP01-058' || winCard.code === 'WW-AC-G04') {
      drawN = 2;
    } else if (
      winCard.code === 'BP01-051' ||
      winCard.code === 'BP01-047' ||
      winCard.code === 'BP01-066' ||
      winCard.code === 'BP01-068' ||
      winCard.code === 'BP01-075' ||
      winCard.code === 'SD01-015' ||
      winCard.code === 'SD01-020' ||
      winCard.code === 'SD01-021' ||
      winCard.code === 'SD02-020' ||
      winCard.code === 'SD02-021' ||
      winCard.effectType === 'DRAW'
    ) {
      drawN = 1;
    }
    // BP01-060: 데미지를 입힐 시 리더가 앙코면 1장 드로우
    if (winCard.code === 'BP01-060' && slotHasCharacterSkill(winnerPlayer.slots.leader, '앙코') && damageDealt > 0) {
      drawN += 1;
    }

    if (drawN > 0) {
      const drawnCards: ActionCard[] = [];
      for (let i = 0; i < drawN; i++) {
        const card = drawSingleCardFromDeck(winnerPlayer);
        if (card) drawnCards.push(card);
      }
      addCardsToHand(winnerPlayer, drawnCards);
      triggeredEffects.push({
        id: `eff-${Date.now()}-draw`,
        sourceCardName: winCard.nameKr,
        sourceCardArt: winCard.artUrl,
        effectType: 'DRAW',
        title: '카드 드로우 효과',
        description: `덱에서 카드 ${drawN}장을 뽑아 패에 추가했습니다.`,
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
      newState = addLog(
        newState,
        `[패 드로우 효과] [${winCard.nameKr}]의 효과로 카드 ${drawN}장을 뽑아 패에 보충했습니다.`,
        'ACTION',
        winnerIndex,
        {
          cardArt: winCard.artUrl,
          cardName: winCard.nameKr,
          effectTag: '카드 드로우',
        }
      );
    }

    // 스캔 [SD01-020 / SD02-020]: 1장 드로우 후 상대의 패 확인
    if (winCard.code === 'SD01-020' || winCard.code === 'SD02-020') {
      const loserIndex = (winnerIndex === 0 ? 1 : 0) as 0 | 1;
      const loserPlayer = loserIndex === 0 ? p0 : p1;
      if (!winnerPlayer.isAi) {
        const scanChoice: PendingChoice = {
          id: `choice-${Date.now()}-scan`,
          playerIndex: winnerIndex,
          title: `${winCard.nameKr} [상대의 패 확인]`,
          sourceCardName: winCard.nameKr,
          sourceCardArt: winCard.artUrl,
          description: `[${winCard.nameKr}] 효과로 상대방(${loserPlayer.name})의 패(${loserPlayer.hand.length}장)를 모두 확인합니다.`,
          revealedCards: [...loserPlayer.hand],
          minSelect: 0,
          maxSelect: 0,
          onResolveType: 'VIEW_ONLY',
        };
        newState = queueChoice(newState, scanChoice, true);
      } else {
        newState = addLog(
          newState,
          `[${winCard.nameKr} 효과] ${winnerPlayer.name}이(가) ${loserPlayer.name}의 패(${loserPlayer.hand.length}장)를 확인했습니다.`,
          'ACTION',
          winnerIndex,
          { cardArt: winCard.artUrl, cardName: winCard.nameKr, effectTag: '상대 패 확인' }
        );
      }
    }

    // 소리의 변화·회피 [SD01-018 / SD02-018]: 승리 시 1장 드로우 후 패 1장 버리기
    if (winCard.code === 'SD01-018' || winCard.code === 'SD02-018') {
      const drawn = drawSingleCardFromDeck(winnerPlayer);
      if (drawn) addCardsToHand(winnerPlayer, [drawn]);
      if (winnerPlayer.hand.length > 0) {
        let discardIdx = 0;
        let minVal = 999;
        winnerPlayer.hand.forEach((c, idx) => {
          const usable = canPlayerUseActionCard(winnerPlayer.slots, c).canUse;
          const val = (usable ? 10 : 0) + (c.damage || 0) + (c.pursuitCount || 0) * 2;
          if (val < minVal) {
            minVal = val;
            discardIdx = idx;
          }
        });
        const [discarded] = winnerPlayer.hand.splice(discardIdx, 1);
        if (discarded) winnerPlayer.dropZone.push(discarded);
      }
      newState = addLog(
        newState,
        `[${winCard.nameKr} 효과] 카드 1장을 뽑고 패 1장을 트래시로 버렸습니다.`,
        'ACTION',
        winnerIndex,
        { cardArt: winCard.artUrl, cardName: winCard.nameKr, effectTag: '드로우&디스카드' }
      );
    }

    // H. 회복 효과 카드 (SD01-023: 5pt, BP01-053/057: 1pt, 기본 HEAL: 2~3pt)
    let healAmount = 0;
    if (winCard.code === 'SD01-023') {
      healAmount = 5;
    } else if (winCard.code === 'BP01-053' || winCard.code === 'BP01-057') {
      healAmount = 1;
    } else if (winCard.effectType === 'HEAL') {
      healAmount = winCard.code === 'WW-AC-B04' ? 3 : 2;
    }

    if (healAmount > 0) {
      winnerPlayer.hp = Math.min(winnerPlayer.maxHp, winnerPlayer.hp + healAmount);
      triggeredEffects.push({
        id: `eff-${Date.now()}-heal`,
        sourceCardName: winCard.nameKr,
        sourceCardArt: winCard.artUrl,
        effectType: 'HEAL',
        title: '생명력 회복 효과',
        description: `생명력(HP)을 ${healAmount} 회복했습니다.`,
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
      newState = addLog(
        newState,
        `[생명력 회복 발동!] [${winCard.nameKr}]의 효과로 생명력을 +${healAmount} 회복했습니다! (현재 HP: ${winnerPlayer.hp}/${winnerPlayer.maxHp})`,
        'HEAL',
        winnerIndex,
        {
          cardArt: winCard.artUrl,
          cardName: winCard.nameKr,
          amount: healAmount,
          effectTag: 'HP 회복',
        }
      );
      newState = triggerShorekeeperHealPassive(newState, winnerIndex, winnerPlayer);
    }

    // I. CHARGE 기본 효과
    if (winCard.effectType === 'CHARGE') {
      const c1 = drawSingleCardFromDeck(winnerPlayer);
      if (c1) winnerPlayer.concertoZone.push(c1);
      const c2 = drawSingleCardFromDeck(winnerPlayer);
      if (c2) addCardsToHand(winnerPlayer, [c2]);
      triggeredEffects.push({
        id: `eff-${Date.now()}-charge`,
        sourceCardName: winCard.nameKr,
        sourceCardArt: winCard.artUrl,
        effectType: 'CHARGE',
        title: '협주 급속 충전',
        description: '협주 에너지를 1장 충전하고 카드 1장을 드로우했습니다.',
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
      newState = addLog(
        newState,
        `[협주 급속 충전!] [${winCard.nameKr}]의 효과로 협주 에너지 1장을 충전하고 카드 1장을 드로우했습니다.`,
        'ACTION',
        winnerIndex,
        {
          cardArt: winCard.artUrl,
          cardName: winCard.nameKr,
          effectTag: '협주 충전',
        }
      );
    }

    // 4. 연격권(Combo Count) 및 무제한 여부 계산 (공식 룰 604.1.2.7)
    // 604.1.2.7: 배틀에서 적색 카드로 승리한 경우, 이번 턴에서 콤보 횟수 제한이 없음!
    if (winCard.color === 'RED') {
      comboGranted = 99;
      winnerPlayer.comboUnlimited = true;
      triggeredEffects.push({
        id: `eff-${Date.now()}-red-combo`,
        sourceCardName: winCard.nameKr,
        sourceCardArt: winCard.artUrl,
        effectType: 'COMBO',
        title: '적색 승리 [연격 무제한]',
        description: '적색 카드로 승리하여 이번 턴 연속 연격 공격이 무제한으로 가능합니다!',
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
    } else {
      comboGranted = 0;
      winnerPlayer.comboUnlimited = false;
    }

    // 카드 자체 [추격 X] 및 캐릭터 추격 효과 가산 (winCard.pursuitCount 중복 가산 방지)
    let officialPursuit = winCard.pursuitCount ?? 0;
    if (officialPursuit === 0) {
      if (winCard.code === 'SD02-010' || winCard.code === 'BP01-057') officialPursuit = 8;
      else if (
        winCard.code === 'SD01-013' ||
        winCard.code === 'SD01-021' ||
        winCard.code === 'SD02-013' ||
        winCard.code === 'SD02-021'
      ) {
        officialPursuit = 2;
      } else if (winCard.code === 'BP01-069' || winCard.code === 'SD01-015') {
        officialPursuit = 1;
      }
    }

    // 방랑자(남) Lv.2 [BP01-019] 리더 판정: 자신이 녹색 카드로 승리했을 경우 【추격 3】
    if (winnerLeaderCards.some((c) => c.code?.startsWith('BP01-019')) && winCard.color === 'GREEN') {
      officialPursuit += 3;
    }
    // 산화 Lv.2 [BP01-031] 리더 판정: 자신이 청색 카드로 승리했을 경우 【추격 3】 및 리더 교체 가능
    const isSanhuaLv2Leader = winnerLeaderCards.some((c) => c.code?.startsWith('BP01-031'));
    if (isSanhuaLv2Leader && winCard.color === 'BLUE') {
      officialPursuit += 3;
    }

    // BP01-077 얼음 파편 판정: 자신이 승리하고 협주 에리어에 [산화]가 있을 경우 리더 교체 가능
    const isIceShardWin = winCard.code === 'BP01-077';
    const hasSanhuaInConcerto = winnerPlayer.concertoZone.some(
      (c) => c.characterExclusive?.includes('산화') || (c as any).characterName === '산화' || c.nameKr?.includes('산화')
    );

    const canSanhuaSwitchLeader =
      (isSanhuaLv2Leader && winCard.color === 'BLUE') ||
      (isIceShardWin && hasSanhuaInConcerto);

    if (canSanhuaSwitchLeader) {
      const availableSupports = [winnerPlayer.slots.leftSupport, winnerPlayer.slots.rightSupport].filter(
        Boolean
      ) as CharacterCard[];

      if (availableSupports.length > 0) {
        if (winnerPlayer.isAi) {
          const supportKey: 'leftSupport' | 'rightSupport' = winnerPlayer.slots.leftSupport
            ? 'leftSupport'
            : 'rightSupport';
          const prevLeader = winnerPlayer.slots.leader;
          const nextLeader = winnerPlayer.slots[supportKey]!;
          winnerPlayer.slots.leader = nextLeader;
          winnerPlayer.slots[supportKey] = prevLeader;
          newState.players[winnerIndex] = winnerPlayer;
          newState = triggerShorekeeperSwitchSkill(newState, winnerIndex, winnerPlayer, prevLeader, nextLeader);
          newState = addLog(
            newState,
            `[${isSanhuaLv2Leader ? '산화 Lv.2 BP01-031' : '얼음 파편 BP01-077'} 판정 효과] ${winnerPlayer.name}이(가) 리더를 [${prevLeader.nameKr}]에서 [${winnerPlayer.slots.leader.nameKr}](으)로 교체했습니다!`,
            'ACTION',
            winnerIndex,
            { cardName: winnerPlayer.slots.leader.nameKr, cardArt: winnerPlayer.slots.leader.artUrl, effectTag: '리더 교체' }
          );
        } else {
          const choice: PendingChoice = {
            id: `choice-${Date.now()}-sanhua-swap`,
            playerIndex: winnerIndex,
            title: `${isSanhuaLv2Leader ? '산화 Lv.2' : '얼음 파편'} — 리더 교체 선택`,
            sourceCardName: isSanhuaLv2Leader ? '산화 Lv.2 [BP01-031]' : '얼음 파편 [BP01-077]',
            sourceCardArt: winCard.artUrl,
            description: '【판정 효과】리더를 교체할 서포터 캐릭터를 1명 선택하세요 (교체를 원치 않으면 건너뛰기를 누르세요).',
            revealedCards: availableSupports,
            minSelect: 0,
            maxSelect: 1,
            onResolveType: 'SWAP_LEADER',
          };
          newState = queueChoice(newState, choice, true);
        }
      }
    }

    if (officialPursuit > 0) {
      if (!winnerPlayer.comboUnlimited) {
        comboGranted += officialPursuit;
      }
      triggeredEffects.push({
        id: `eff-${Date.now()}-pursuit`,
        sourceCardName: winCard.nameKr,
        sourceCardArt: winCard.artUrl,
        effectType: 'COMBO',
        title: `카드 특수 효과 [추격 +${officialPursuit}]`,
        description: `연격 연속 공격 횟수를 +${officialPursuit}회 획득했습니다!`,
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
    }

    // 북풍의 소용돌이 [SD01-016] 승리 효과: 다음 턴 상대 적색 카드 COST+1
    if (winCard.code === 'SD01-016') {
      loserPlayer.tempCostPenaltyRed = (loserPlayer.tempCostPenaltyRed || 0) + 1;
      loserPlayer.tempCostPenaltyRedTurns = activeIdx === loserIndex ? 2 : 1;
      newState = addLog(
        newState,
        `[북풍의 소용돌이 SD01-016 효과] 다음 턴에 상대방의 적색 카드 코스트가 +1 증가합니다!`,
        'ACTION',
        winnerIndex,
        { cardArt: winCard.artUrl, cardName: winCard.nameKr, effectTag: '코스트 증가' }
      );
    }

    // 죽음의 눈보라 [SD02-016] 승리 효과: 다음 턴 상대 콤보 발동 불가
    if (winCard.code === 'SD02-016') {
      loserPlayer.comboBlockedNextTurn = true;
      loserPlayer.comboBlockedTurns = activeIdx === loserIndex ? 2 : 1;
      newState = addLog(
        newState,
        `[죽음의 눈보라 SD02-016 효과] 다음 턴에 상대방은 콤보를 발동할 수 없습니다!`,
        'ACTION',
        winnerIndex,
        { cardArt: winCard.artUrl, cardName: winCard.nameKr, effectTag: '콤보 봉쇄' }
      );
    }

    // 콤보 금지/봉쇄 스킬 체크
    // SD02-016 죽음의 눈보라 디버프가 걸려있는 경우
    if (winnerPlayer.comboBlockedNextTurn) {
      comboGranted = 0;
      winnerPlayer.comboUnlimited = false;
      newState = addLog(newState, `[죽음의 눈보라 SD02-016 제약] 이번 턴에 콤보를 발동할 수 없습니다!`, 'SYSTEM', winnerIndex);
    }

    // BP01-074 승천하는 용 / BP01-061 그늘이와 구름이: 이번 턴에 자신은 콤보를 발동할 수 없다.
    if (winCard.code === 'BP01-074' || winCard.code === 'BP01-061') {
      comboGranted = 0;
      winnerPlayer.comboUnlimited = false;
      newState = addLog(newState, `[${winCard.nameKr} 제약] 이번 턴에 콤보를 발동할 수 없습니다.`, 'SYSTEM', winnerIndex);
    }

    // BP01-058 해금: 【판정】【우세】자신의 리더가 「파수인」인 경우, 이 카드가 배틀에 패배할 시 상대는 이번 턴에 <콤보> 발동 불가
    const loserLeaderCards = getAllCardsInSlot(loserPlayer.slots.leader);
    if (
      loserCard?.code === 'BP01-058' &&
      loserPlayer.hasDominance &&
      loserLeaderCards.some((c) => c.characterName?.includes('파수인') || c.nameKr?.includes('파수인'))
    ) {
      comboGranted = 0;
      winnerPlayer.comboUnlimited = false;
      newState = addLog(newState, `[해금 BP01-058 우세 효과] 상대 파수인의 효과로 연격이 봉쇄되었습니다!`, 'SYSTEM', winnerIndex);
    }

    winnerPlayer.comboCount = comboGranted;
  }

  // 5. 패배자 효과 처리 (SD01-010 패배 회수 및 캐릭터 Lv.1 패시브 효과)
  if (winnerIndex !== -1) {
    const loserIndex = (winnerIndex === 0 ? 1 : 0) as 0 | 1;
    const loserPlayer = loserIndex === 0 ? p0 : p1;
    const loserCard = loserIndex === 0 ? c0 : c1;
    const winnerCard = winnerIndex === 0 ? c0 : c1;
    const loserLeaderCards = getAllCardsInSlot(loserPlayer.slots.leader);

    // SD01-010 투쟁의 마음: 청색 카드에 패배 시 패로 회수 (actionArea & dropZone 정리)
    if (loserCard?.code === 'SD01-010' && winnerCard?.color === 'BLUE') {
      loserPlayer.dropZone = loserPlayer.dropZone.filter((c) => c.id !== loserCard.id);
      loserPlayer.actionArea = (loserPlayer.actionArea || []).filter((c) => c.id !== loserCard.id);
      addCardsToHand(loserPlayer, [loserCard]);
      newState = addLog(newState, `[투쟁의 마음 SD01-010 효과] 청색 카드에 패배하여 패로 회수했습니다!`, 'ACTION', loserIndex);
    }

    // 앙코 Lv.1 [BP01-014] 리더 효과: 앙코 <강공격>/<공명 회로>가 배틀에서 적색 카드에 패배한 경우 배틀 페이즈 종료 시 반격 데미지
    // (BP01-013 앙코 Lv.1은 등장/레벨업 카드이므로 BP01-014 코드만 정확히 판별!)
    const hasAnkeBp01014 = loserLeaderCards.some((c) => c.code?.startsWith('BP01-014'));
    if (
      hasAnkeBp01014 &&
      loserCard &&
      loserCard.characterExclusive?.includes('앙코') &&
      (loserCard.nameKr.includes('강공격') || (loserCard as any).feature?.includes('강공격') || (loserCard as any).feature?.includes('공명 회로')) &&
      winnerCard?.color === 'RED'
    ) {
      loserPlayer.ankePendingRetaliationDmg = loserCard.damage;
      newState = addLog(
        newState,
        `[앙코 Lv.1 BP01-014 리더 효과] 적색 카드에 패배하여 배틀 페이즈 종료 시 ${loserCard.damage} 반격 데미지가 예약되었습니다!`,
        'ACTION',
        loserIndex
      );
    }

    // 캐릭터 Lv.1 역경 패시브: 상성 패배 시 덱 위 1장 패 보충 (해당 스킬을 가진 정확한 카드 코드 확인!)
    const isRoverDefeat =
      loserLeaderCards.some((c) => c.code?.startsWith('SD01-002') || c.code?.startsWith('SD02-002')) &&
      loserCard?.color === 'GREEN' &&
      winnerCard?.color === 'RED';
    const isYangyangDefeat =
      loserLeaderCards.some((c) => c.code?.startsWith('SD01-004')) &&
      loserCard?.color === 'BLUE' &&
      winnerCard?.color === 'GREEN';
    const isChixiaDefeat =
      loserLeaderCards.some((c) => c.code?.startsWith('SD01-006')) &&
      loserCard?.color === 'RED' &&
      winnerCard?.color === 'BLUE';
    const isSanhuaDefeat =
      loserLeaderCards.some((c) => c.code?.startsWith('SD02-004')) &&
      loserCard?.color === 'BLUE' &&
      winnerCard?.color === 'GREEN';
    const isJinhsiDefeat =
      loserLeaderCards.some((c) => c.code?.startsWith('SD02-006')) &&
      loserCard?.color === 'RED' &&
      winnerCard?.color === 'BLUE';
    const isCamellyaDefeat =
      loserLeaderCards.some((c) => c.code?.startsWith('BP01-004')) &&
      loserCard?.color === 'RED' &&
      winnerCard?.color === 'BLUE';

    if (isRoverDefeat || isYangyangDefeat || isChixiaDefeat || isSanhuaDefeat || isJinhsiDefeat || isCamellyaDefeat) {
      const revealed = loserPlayer.actionDeck.splice(0, Math.min(1, loserPlayer.actionDeck.length));
      if (revealed.length > 0) {
        triggeredEffects.push({
          id: `eff-${Date.now()}-leader-defeat-draw`,
          sourceCardName: loserPlayer.slots.leader.nameKr,
          sourceCardArt: loserPlayer.slots.leader.artUrl,
          effectType: 'DRAW',
          title: `${loserPlayer.slots.leader.nameKr} [판정 패배 지원]`,
          description: '상성 패배 시 덱 위의 카드를 패에 추가하는 리더 효과가 발동했습니다!',
          playerIndex: loserIndex,
          timestamp: Date.now(),
        });
        if (loserPlayer.isAi) {
          addCardsToHand(loserPlayer, revealed);
          newState = addLog(
            newState,
            `[${loserPlayer.slots.leader.nameKr} 리더 효과] ${loserPlayer.name}이(가) 패배 시 덱 위 1장을 패에 추가했습니다.`,
            'ACTION',
            loserIndex
          );
        } else {
          const defeatChoice: PendingChoice = {
            id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            playerIndex: loserIndex,
            title: `${loserPlayer.slots.leader.nameKr} 판정 패배 효과`,
            sourceCardName: loserPlayer.slots.leader.nameKr,
            sourceCardArt: loserPlayer.slots.leader.artUrl,
            description: '상성 패배로 덱 위의 카드를 패에 추가할 수 있습니다 (0장 또는 1장 선택).',
            revealedCards: revealed,
            minSelect: 0,
            maxSelect: 1,
            onResolveType: 'ADD_TO_HAND',
          };
          newState = queueChoice(newState, defeatChoice, true);
        }
      }
    }
  }

  const clashResult: ClashResult = {
    p0Card: c0,
    p1Card: c1,
    winnerIndex,
    reason,
    winnerColor,
    damageDealt,
    comboGranted,
    logText,
    triggeredEffects,
  };

  newState.clashResult = clashResult;
  newState.players = [p0, p1];
  if (triggeredEffects.length > 0) {
    newState.deferredEffectEvent = triggeredEffects[0];
  }

  const winCard = winnerIndex === 0 ? c0 : c1;
  if (winnerIndex !== -1 && winCard) {
    newState = addLog(
      newState,
      `【대결 판정 승리】 ${logText}\n💥 [${winCard.nameKr}] 공격 적중! 상대에게 ${damageDealt} 피해를 입혔습니다!${comboGranted > 0 ? ` (연격 +${comboGranted}회 획득)` : ''}`,
      'DAMAGE',
      winnerIndex,
      {
        cardArt: winCard.artUrl,
        cardName: winCard.nameKr,
        amount: damageDealt,
        effectTag: '판정 피해',
      }
    );
  } else {
    newState = addLog(
      newState,
      `【대결 결과】 ${logText}`,
      'CLASH'
    );
  }

  // 승패 체크
  if (p0.hp <= 0 || p1.hp <= 0) {
    return checkGameOver(newState);
  }

  return newState;
}

// 특정 플레이어가 실제로 연격(COMBO_STEP) 공격을 실행할 수 있는지 검사 (공식 룰 604.1.3)
export function canPlayerExecuteCombo(player: PlayerState): boolean {
  if (player.comboBlockedNextTurn) return false;
  if (!player.comboUnlimited && player.comboCount <= 0) return false;
  return player.hand.some((c) => {
    if (c.color !== 'RED') return false;
    let effectiveCost = getAllCardsInSlot(player.slots.leader).some(
      (ch) => ch.characterName === '금희' && ch.level >= 1
    )
      ? Math.max(0, c.cost - 1)
      : c.cost;
    if (player.tempCostPenaltyRed && player.tempCostPenaltyRed > 0) {
      effectiveCost += player.tempCostPenaltyRed;
    }
    return player.concertoZone.length >= effectiveCost && canPlayerUseActionCard(player.slots, c).canUse;
  });
}

// 대결 공개 후 연격 단계 또는 턴 종료 단계로 이동
export function proceedAfterClashReveal(state: GameState): GameState {
  let newState: GameState = { ...state, lastComboStrike: null, clashResult: null };
  const p0 = { ...newState.players[0] };
  const p1 = { ...newState.players[1] };

  // 대결 카드 슬롯 정리 (단, 사용한 카드는 액션 에리어에 이미 보존되어 있음)
  p0.clashCard = null;
  p0.clashCardReady = false;
  p1.clashCard = null;
  p1.clashCardReady = false;

  newState.players = [p0, p1];

  // 전투 데미지 결과 후 보류(deferred)되었던 효과 발동 화면들을 활성화!
  if (newState.deferredChoices && newState.deferredChoices.length > 0) {
    const [first, ...rest] = newState.deferredChoices;
    newState.pendingChoice = first;
    newState.pendingChoiceQueue = rest;
    newState.deferredChoices = [];
    newState.deferredChoice = null;
  } else if (newState.deferredChoice) {
    newState.pendingChoice = newState.deferredChoice;
    newState.deferredChoice = null;
  }
  if (newState.deferredUpgrade) {
    newState.lastUpgrade = newState.deferredUpgrade;
    newState.deferredUpgrade = null;
  }
  if (newState.deferredEffectEvent) {
    newState.lastEffectEvent = newState.deferredEffectEvent;
    newState.deferredEffectEvent = null;
  }

  // ★ 중요: 플레이어가 효과 선택/확인(패 확인, 드로우, 버리기 등)을 마칠 때까지
  // 연격 단계나 턴 종료 단계로 절대 백그라운드 진행하지 않고 여기서 멈춥니다!
  // 선택 완료 시 resolvePendingChoice에서 다음 단계(COMBO_STEP 또는 checkHandOverflowOrEndTurn)로 안전하게 진행됩니다.
  if (newState.pendingChoice) {
    return newState;
  }

  // 연격 권한이 있는 플레이어 확인 (적색 승리 무제한 또는 추격 카운트 보유)
  const p0HasComboPerm = Boolean(p0.comboUnlimited) || (p0.comboCount ?? 0) > 0;
  const p1HasComboPerm = Boolean(p1.comboUnlimited) || (p1.comboCount ?? 0) > 0;

  if (p0HasComboPerm || p1HasComboPerm) {
    const comboPlayerIdx: 0 | 1 = p0HasComboPerm ? 0 : 1;
    const comboPlayer = newState.players[comboPlayerIdx];

    if (comboPlayer.isAi) {
      newState.phase = 'COMBO_STEP';
      newState = addLog(
        newState,
        `⚡ ${comboPlayer.name}의 [연격 단계(Combo Step)]! ${
          comboPlayer.comboUnlimited
            ? '적색 승리: 연속 연격 무제한 가동'
            : `남은 연격 횟수: ${comboPlayer.comboCount}회`
        }`,
        'ACTION',
        comboPlayerIdx
      );
    } else {
      // Human 유저 플레이어:
      // 손패에 사용 가능한 적색 카드가 있든 없든 반드시 COMBO_STEP에 진입하여
      // 상황을 확인하고 안내 팝업("연격 카드가 없습니다 턴을 넘깁니다")을 표시하도록 함
      newState.phase = 'COMBO_STEP';
      newState = addLog(
        newState,
        `⚡ ${comboPlayer.name}의 [연격 단계(Combo Step)] 돌입! ${
          comboPlayer.comboUnlimited
            ? '적색 승리: 연속 연격 무제한 가능!'
            : `남은 연격 횟수: ${comboPlayer.comboCount}회`
        }`,
        'ACTION',
        comboPlayerIdx
      );
    }
  } else {
    // 연격 권한 없음 -> 연격 플래그 리셋 후 배틀 페이즈 종료 스텝 실행
    p0.comboCount = 0;
    p0.comboUnlimited = false;
    p1.comboCount = 0;
    p1.comboUnlimited = false;
    newState.players = [p0, p1];
    return executeBattlePhaseEndStep(newState);
  }

  return newState;
}

// ==========================================
// 7. 연격 단계 (COMBO_STEP - 공식 룰 604.1.3)
// ==========================================

export function executeComboAttack(
  state: GameState,
  playerIndex: 0 | 1,
  cardId: string,
  spentConcertoIds?: string[],
  discardForBonusDmgId?: string,
  swapSupportSlot?: 'leftSupport' | 'rightSupport'
): { success: boolean; newState: GameState; error?: string } {
  let player = { ...state.players[playerIndex] };
  const opponent = { ...state.players[playerIndex === 0 ? 1 : 0] };

  if (!player.comboUnlimited && player.comboCount <= 0) {
    return { success: false, newState: state, error: '남은 연격 횟수가 없습니다.' };
  }

  const card = player.hand.find((c) => c.id === cardId);
  if (!card) {
    return { success: false, newState: state, error: '패에 카드가 없습니다.' };
  }

  if (card.color !== 'RED') {
    return { success: false, newState: state, error: '연격 단계에서는 빨간색(RED) 카드만 사용할 수 있습니다.' };
  }

  // 전용 카드 및 에코 중복 조건 검증
  const cardUsage = canPlayerUseActionCard(player.slots, card, player.actionArea);
  if (!cardUsage.canUse) {
    return {
      success: false,
      newState: state,
      error: cardUsage.reason || '이 카드는 사용할 수 없습니다.',
    };
  }

  // 유효 코스트 계산 (SD01-016 북풍의 소용돌이 적색 코스트 페널티 반영)
  const effectiveCost = getEffectiveCardCost(player, card);

  if (player.concertoZone.length < effectiveCost) {
    return {
      success: false,
      newState: state,
      error: `비용이 부족합니다 (필요 협주: ${effectiveCost}, 보유: ${player.concertoZone.length}).`,
    };
  }

  // 비용 지불: 에코 카드 보존 우선 소모
  spendConcertoCost(player, effectiveCost, spentConcertoIds);

  // 패에서 액션 에리어로 배치 (공식 룰 604.1.3.2)
  player.hand = player.hand.filter((c) => c.id !== cardId);
  player.actionArea = [...(player.actionArea || []), card];

  // 콤보 횟수 차감: 무제한이 아닐 때만 1회 차감
  if (!player.comboUnlimited) {
    player.comboCount -= 1;
  }

  let newState = { ...state };
  let introBonusDmg = 0;

  // ==========================================
  // <변주 스킬> 9종 공통 리더 교체 & 고유 변주 효과 처리
  // 공식 텍스트: "【콤보】자신의 리더를 교체한다. 「캐릭터명」이(가) 교체될 경우, [효과]."
  // ★ 대상 캐릭터가 이미 리더(Leader) 자리에 있는 경우에도 후열(백) 캐릭터와 정상 교체되며,
  //   리더에서 후열로 교체된 것 역시 「캐릭터명」이 교체된 것이므로 변주 추가 효과가 정상 발동됩니다!
  // ==========================================
  if (isIntroSkillCard(card)) {
    const introTargetName = getIntroSkillTargetChar(card);
    let chosenSupportKey: 'leftSupport' | 'rightSupport' | null = null;

    if (swapSupportSlot && player.slots[swapSupportSlot]) {
      chosenSupportKey = swapSupportSlot;
    } else {
      const matchedSupport = (['leftSupport', 'rightSupport'] as const).find((k) =>
        doesCharMatchIntroTarget(player.slots[k], introTargetName)
      );
      if (matchedSupport && player.slots[matchedSupport]) {
        chosenSupportKey = matchedSupport;
      } else {
        // 대상 캐릭터가 이미 리더 자리에 있는 경우: 백(후열 서포터) 캐릭터와 교체!
        chosenSupportKey = player.slots.leftSupport ? 'leftSupport' : player.slots.rightSupport ? 'rightSupport' : null;
      }
    }

    let wasTargetSwapped = false;
    let swappedSlotAfter: 'leader' | 'leftSupport' | 'rightSupport' = 'leader';

    if (chosenSupportKey && player.slots[chosenSupportKey]) {
      const prevLeader = player.slots.leader;
      const nextLeader = player.slots[chosenSupportKey]!;
      player.slots.leader = nextLeader;
      player.slots[chosenSupportKey] = prevLeader;

      const prevMatched = doesCharMatchIntroTarget(prevLeader, introTargetName);
      const nextMatched = doesCharMatchIntroTarget(nextLeader, introTargetName);
      wasTargetSwapped = prevMatched || nextMatched;
      swappedSlotAfter = nextMatched ? 'leader' : chosenSupportKey;

      newState.players[playerIndex] = player;
      newState = triggerShorekeeperSwitchSkill(newState, playerIndex, player, prevLeader, nextLeader);
    }

    const newLeaderName = player.slots.leader.characterName || player.slots.leader.nameKr;

    // 1. 도약의 불빛 [SD01-009] (치샤) / 2. 반룡의 빛 [SD02-009] (금희): 교체 시 데미지 +2
    if (card.code === 'SD01-009' || card.code === 'SD02-009') {
      if (wasTargetSwapped) {
        introBonusDmg += 2;
      }
      newState = addLog(
        newState,
        `[${card.nameKr} ${card.code} 변주 효과] 리더를 [${newLeaderName}](으)로 교체했습니다!${wasTargetSwapped ? ' (변주 효과: 데미지 +2)' : ''}`,
        'ACTION',
        playerIndex,
        { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체' }
      );
    }

    // 3. 팔천의 춘추 [BP01-046] (카멜리아): 카멜리아가 교체될 경우 카멜리아 레벨업! (유저 수동 선택 지원)
    if (card.code === 'BP01-046') {
      if (wasTargetSwapped) {
        const camSlotKey: 'leader' | 'leftSupport' | 'rightSupport' =
          doesCharMatchIntroTarget(player.slots.leader, '카멜리아')
            ? 'leader'
            : swappedSlotAfter;
        const curCam = player.slots[camSlotKey];
        if (curCam && doesCharMatchIntroTarget(curCam, '카멜리아')) {
          const upgradableCams = findAllUpgradableCards(player.characterDeck, curCam);
          if (upgradableCams.length > 0) {
            if (player.isAi) {
              const nextCam = findEvolutionCard(player.characterDeck, curCam) || upgradableCams[0];
              player.characterDeck = player.characterDeck.filter((c) => c.id !== nextCam.id);
              const prevUnder = curCam.underlyingCards || [];
              player.slots[camSlotKey] = {
                ...nextCam,
                underlyingCards: [...prevUnder, { ...curCam, underlyingCards: undefined }],
              };
              newState.lastUpgrade = {
                id: `upgrade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                playerIndex,
                playerName: player.name,
                character: { ...nextCam },
                previousLevel: curCam.level as 0 | 1 | 2,
                newLevel: nextCam.level as 1 | 2,
                slotName: camSlotKey,
              };
              newState.players[playerIndex] = player;
              newState = applyCharacterEvolutionSkills(newState, playerIndex, camSlotKey, nextCam, curCam, false);
              player = { ...newState.players[playerIndex] };
            } else {
              const upgradeChoice: PendingChoice = {
                id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                playerIndex,
                title: '팔천의 춘추 — 카멜리아 레벨업 대상 선택',
                sourceCardName: '팔천의 춘추 [BP01-046]',
                sourceCardArt: card.artUrl,
                description: `캐릭터 덱에서 [카멜리아](현재 Lv.${curCam.level}) 위에 겹쳐 레벨업할 카드를 직접 선택하세요.`,
                revealedCards: upgradableCams,
                minSelect: 1,
                maxSelect: 1,
                onResolveType: 'SELECT_EFFECT_UPGRADE',
                targetSlot: camSlotKey,
              };
              newState = queueChoice(newState, upgradeChoice, false);
            }
          }
        }
      }
      newState = addLog(
        newState,
        `[팔천의 춘추 BP01-046 변주 효과] 리더를 [${newLeaderName}](으)로 교체했습니다!${wasTargetSwapped ? ' (카멜리아 레벨업 발동)' : ''}`,
        'ACTION',
        playerIndex,
        { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체&진화' }
      );
    }

    // 4. 계발 [BP01-054] (파수인): 파수인이 교체될 경우 생명력 1pt 회복
    if (card.code === 'BP01-054') {
      if (wasTargetSwapped) {
        player.hp = Math.min(player.maxHp, player.hp + 1);
      }
      newState = addLog(
        newState,
        `[계발 BP01-054 변주 효과] 리더를 [${newLeaderName}](으)로 교체${wasTargetSwapped ? `하고 생명력을 +1 회복했습니다! (현재 HP: ${player.hp}/${player.maxHp})` : '했습니다!'}`,
        wasTargetSwapped ? 'HEAL' : 'ACTION',
        playerIndex,
        { cardArt: card.artUrl, cardName: card.nameKr, amount: wasTargetSwapped ? 1 : undefined, effectTag: '리더 교체&회복' }
      );
      if (wasTargetSwapped) {
        newState.players[playerIndex] = player;
        newState = triggerShorekeeperHealPassive(newState, playerIndex, player);
      }
    }

    // 5. 양들의 도움 [BP01-063] (앙코): 앙코가 교체될 경우 트래시에서 <변주 스킬> 외의 앙코 적색 카드 1장 패에 추가
    if (card.code === 'BP01-063') {
      if (wasTargetSwapped) {
        const eligibleRedAnke = player.dropZone.filter(
          (c) =>
            c.kind === 'ACTION' &&
            (c as ActionCard).characterExclusive?.includes('앙코') &&
            (c as ActionCard).color === 'RED' &&
            !isIntroSkillCard(c as ActionCard)
        ) as ActionCard[];

        if (eligibleRedAnke.length > 0) {
          if (player.isAi) {
            const redAnkeIdx = player.dropZone.findIndex(
              (c) =>
                c.kind === 'ACTION' &&
                (c as ActionCard).characterExclusive?.includes('앙코') &&
                (c as ActionCard).color === 'RED' &&
                !isIntroSkillCard(c as ActionCard)
            );
            if (redAnkeIdx !== -1) {
              const [reclaimed] = player.dropZone.splice(redAnkeIdx, 1);
              addCardsToHand(player, [reclaimed as ActionCard]);
            }
          } else {
            const recoverChoice: PendingChoice = {
              id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              playerIndex,
              title: '양들의 도움 — 앙코 적색 카드 회수',
              sourceCardName: '양들의 도움 [BP01-063]',
              sourceCardArt: card.artUrl,
              description: '트래시 에리어에서 <변주 스킬> 외의 [앙코] 적색 카드 1장을 선택하여 패에 추가하세요.',
              revealedCards: eligibleRedAnke,
              minSelect: 0,
              maxSelect: 1,
              onResolveType: 'RECOVER_FROM_DROP',
            };
            newState = queueChoice(newState, recoverChoice, false);
          }
        }
      }
      newState = addLog(
        newState,
        `[양들의 도움 BP01-063 변주 효과] 리더를 [${newLeaderName}](으)로 교체했습니다!${wasTargetSwapped ? ' (앙코 적색 카드 회수 발동)' : ''}`,
        'ACTION',
        playerIndex,
        { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체&회수' }
      );
    }

    // 6. 숨결 [SD01-014] (양양) / 7. 차가운 눈꽃 [SD02-014] (산화): 교체 시 덱 위 1장 협주 에리어에 배치
    if (card.code === 'SD01-014' || card.code === 'SD02-014') {
      if (wasTargetSwapped) {
        const charged = drawSingleCardFromDeck(player);
        if (charged) player.concertoZone.push(charged);
      }
      newState = addLog(
        newState,
        `[${card.nameKr} ${card.code} 변주 효과] 리더를 [${newLeaderName}](으)로 교체${wasTargetSwapped ? '하고 협주 에너지 1장을 충전했습니다!' : '했습니다!'}`,
        'ACTION',
        playerIndex,
        { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체&충전' }
      );
    }

    // 8. 진동 소리 [SD01-019 / SD02-019] (방랑자): 교체 시 카드 1장 드로우
    if (card.code === 'SD01-019' || card.code === 'SD02-019') {
      if (wasTargetSwapped) {
        const drawn = drawSingleCardFromDeck(player);
        if (drawn) addCardsToHand(player, [drawn]);
      }
      newState = addLog(
        newState,
        `[진동 소리 ${card.code} 변주 효과] 리더를 [${newLeaderName}](으)로 교체${wasTargetSwapped ? '하고 카드 1장을 드로우했습니다!' : '했습니다!'}`,
        'ACTION',
        playerIndex,
        { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체&드로우' }
      );
    }
  }

  // 9. 복성재우 [BP01-071]: 덱 위 1장 협주 에리어에 배치
  // 공식 텍스트: "【콤보】이번 턴에 자신이 방금 사용한 카드가 <체공>인 경우, 자신의 덱 위의 카드 1장을 협주 에리어에 배치한다."
  if (card.code === 'BP01-071') {
    const prevActionCard = (player.actionArea && player.actionArea.length >= 2)
      ? player.actionArea[player.actionArea.length - 2]
      : null;
    const isAerial = isAerialCard(prevActionCard);

    if (isAerial) {
      const charged = drawSingleCardFromDeck(player);
      if (charged) {
        player.concertoZone.push(charged);
        newState.lastEffectEvent = {
          id: `eff-combo-bp071-${Date.now()}`,
          sourceCardName: '복성재우 [BP01-071]',
          sourceCardArt: card.artUrl,
          effectType: 'CHARGE',
          title: '복성재우 콤보 효과 발동!',
          description: `방금 사용한 <체공> 카드([${prevActionCard?.nameKr || '체공'}])의 연계로 덱 맨 위에서 협주 에너지 1장을 충전했습니다!`,
          playerIndex,
          timestamp: Date.now(),
        };
        newState = addLog(
          newState,
          `⚡ [복성재우 BP01-071 연격 효과 발동!] 방금 사용한 카드가 <체공>(${prevActionCard?.nameKr || '체공'})이므로 덱 위에서 협주 에너지 1장을 충전했습니다! (현재 협주: ${player.concertoZone.length})`,
          'ACTION',
          playerIndex,
          { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '협주 충전' }
        );
      }
    } else if (prevActionCard) {
      newState = addLog(
        newState,
        `[복성재우 BP01-071 연격] 직전에 사용한 카드 [${prevActionCard.nameKr}]이(가) <체공> 카드가 아니므로 협주 충전이 발동하지 않았습니다. (체공 카드: 점프, 로프, 날개의 뜻·회피 등)`,
        'ACTION',
        playerIndex
      );
    }
  }

  // 10. 결말의 순환 [BP01-057] 변주 스킬 드로우 보너스
  if (isIntroSkillCard(card) && player.introSkillBonusDrawCount && player.introSkillBonusDrawCount > 0) {
    player.introSkillBonusDrawCount -= 1;
    const d = drawSingleCardFromDeck(player);
    if (d) addCardsToHand(player, [d]);
    newState = addLog(
      newState,
      `[결말의 순환 BP01-057 효과] <변주 스킬> 연격으로 덱에서 카드 1장을 드로우했습니다!`,
      'ACTION',
      playerIndex
    );
  }

  // 대미지 계산
  let dmg = card.damage + introBonusDmg;

  // 0코스트 프리즘/후슈슈 에코 【협주】 시너지 데미지 보너스
  dmg += getConcertoSonataBonusDamage(player, card);

  // SD02-011 만물의 정화: 액션 에리어에 카드가 3장 이상 있을 경우 데미지 +3
  if (card.code === 'SD02-011' && (player.actionArea?.length || 0) >= 3) {
    dmg += 3;
  }

  // BP01-050 넝쿨의 춤: 액션 에리어에 일반 공격 카드가 2장 이상 있을 경우 데미지 +1
  if (card.code === 'BP01-050') {
    const normalAttackCount = (player.actionArea || []).filter(isNormalAttackCard).length;
    if (normalAttackCount >= 2) {
      dmg += 1;
    }
  }

  // BP01-055 근원의 추구·강공격: 자신의 생명력이 상대보다 많을 경우 이 카드의 데미지 +1
  if (card.code === 'BP01-055' && player.hp > opponent.hp) {
    dmg += 1;
  }

  // BP01-074 승천하는 용: 액션 에리어에 있는 카드 1장당 데미지 +1 & 이번 턴 연격 종료
  if (card.code === 'BP01-074') {
    dmg += Math.max(0, (player.actionArea?.length || 1) - 1);
    player.comboCount = 0;
    player.comboUnlimited = false;
  }

  // BP01-061 그늘이와 구름이: 이번 턴 연격 종료
  if (card.code === 'BP01-061') {
    player.comboCount = 0;
    player.comboUnlimited = false;
  }

  // BP01-065 / BP01-067 소리의 변화·강공격: 패 1장 버리고 데미지 +1
  if (card.code === 'BP01-065' || card.code === 'BP01-067') {
    if (player.isAi && player.hand.length > 0) {
      // AI는 이번 연격에서 당장 쓸 수 없는 카드(비적색 또는 코스트 부족)가 있거나 킬각일 때만 버림
      const nonComboIdx = player.hand.findIndex(
        (c) => c.color !== 'RED' || !canPlayerUseActionCard(player.slots, c, player.actionArea).canUse
      );
      const shouldDiscardForLethal = opponent.hp <= dmg + 1 && opponent.hp > dmg;
      const targetDiscardIdx = nonComboIdx !== -1 ? nonComboIdx : shouldDiscardForLethal ? 0 : -1;
      if (targetDiscardIdx !== -1) {
        const [discarded] = player.hand.splice(targetDiscardIdx, 1);
        if (discarded) {
          player.dropZone.push(discarded);
          dmg += 1;
          newState = addLog(newState, `[${card.nameKr} 콤보 효과] 패 1장을 버리고 데미지가 +1 증가했습니다!`, 'ACTION', playerIndex);
        }
      }
    } else if (discardForBonusDmgId) {
      const idx = player.hand.findIndex((c) => c.id === discardForBonusDmgId);
      if (idx !== -1) {
        const [discarded] = player.hand.splice(idx, 1);
        player.dropZone.push(discarded);
        dmg += 1;
        newState = addLog(newState, `[${card.nameKr} 콤보 효과] [${discarded.nameKr}]을(를) 버리고 데미지가 +1 증가했습니다!`, 'ACTION', playerIndex);
      }
    }
  }

  const leaderCards = getAllCardsInSlot(player.slots.leader);

  // 금희 Lv.2 [SD02-005] 리더: 적색 카드가 『【콤보】이 카드의 데미지 +1.』 획득
  if (leaderCards.some((c) => c.code?.startsWith('SD02-005')) && card.color === 'RED') {
    dmg += 1;
  }

  // 치샤 Lv.2 [SD01-005]: 자신의 【리더 스킬】을 가진 【치샤】의 카드 데미지 +3 (필드 어디든 유효)
  const hasChixiaSd01005 = hasActiveCharacterSkill(player, (info) =>
    getAllCardsInSlot(info.card).some((c) => c.code?.startsWith('SD01-005'))
  );
  if (hasChixiaSd01005 && card.characterExclusive?.includes('치샤') && isLeaderSkillCard(card)) {
    dmg += 3;
  }

  // 앙코 Lv.0 [BP01-015] 리더: 매 턴 처음 사용한 앙코 기본 공격 데미지 +2 (【리더】 전용!)
  if (
    leaderCards.some((c) => c.code?.startsWith('BP01-015')) &&
    card.characterExclusive?.includes('앙코') &&
    isNormalAttackCard(card) &&
    !player.actionFlags.firstNormalAttackBonusUsed
  ) {
    dmg += 2;
    player.actionFlags.firstNormalAttackBonusUsed = true;
  } else if (card.characterExclusive?.includes('앙코') && isNormalAttackCard(card)) {
    player.actionFlags.firstNormalAttackBonusUsed = true;
  }

  // 앙코 Lv.2 [BP01-011]: 자신의 【앙코】 적색 카드 데미지 +1 (필드 어디든 유효)
  const hasAnkeBp01011 = hasActiveCharacterSkill(player, (info) =>
    getAllCardsInSlot(info.card).some((c) => c.code?.startsWith('BP01-011'))
  );
  if (hasAnkeBp01011 && card.characterExclusive?.includes('앙코') && card.color === 'RED') {
    dmg += 1;
  }

  // 카멜리아 Lv.2 [BP01-001] 리더: 자신의 【카멜리아】 적색 카드 데미지 +1
  if (leaderCards.some((c) => c.code?.startsWith('BP01-001')) && card.characterExclusive?.includes('카멜리아') && card.color === 'RED') {
    dmg += 1;
  }

  // 피격자 데미지 보정 및 피격 플래그 적용 (BP01-001 +1, BP01-002 초회 -1, damageTakenThisTurn)
  dmg = applyDamageWithLeaderModifiers(opponent, dmg, true);

  newState.players[playerIndex] = player;
  newState.players[playerIndex === 0 ? 1 : 0] = opponent;
  const currentComboCount = Math.max(1, (player.actionArea || []).length - 1);
  newState.lastComboStrike = {
    id: `combo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    attackerIndex: playerIndex,
    attackerName: player.slots.leader.characterName || player.name,
    card,
    damage: dmg,
    comboCount: currentComboCount,
  };

  newState = addLog(
    newState,
    `[연격 공격 성공!] ${player.name}이(가) [${card.nameKr}](으)로 ${dmg}의 연격 피해를 입혔습니다!${
      player.comboUnlimited ? ' (무제한 연격 진행 중)' : ` (남은 연격: ${player.comboCount}회)`
    }`,
    'DAMAGE',
    playerIndex,
    {
      cardArt: card.artUrl,
      cardName: card.nameKr,
      amount: dmg,
      effectTag: '연격 피해',
    }
  );

  // 1코스트 보스 에코 5종 (BP01-035, BP01-037, BP01-039, BP01-041, BP01-043) 【우세】 데미지 적중 효과
  newState = applyBossEchoHitEffects(newState, playerIndex, player, opponent, card, dmg);

  // BP01-060 양치기 소녀의 길·강공격: 상대에게 데미지를 입힐 시, 자신의 리더가 「앙코」인 경우 카드 1장을 뽑는다.
  if (card.code === 'BP01-060' && slotHasCharacterSkill(player.slots.leader, '앙코') && dmg > 0) {
    const drawn = drawSingleCardFromDeck(player);
    if (drawn) {
      addCardsToHand(player, [drawn]);
      newState = addLog(
        newState,
        `[양치기 소녀의 길·강공격 BP01-060 효과] 상대에게 연격 피해를 입혀 덱에서 카드 1장을 드로우했습니다!`,
        'ACTION',
        playerIndex,
        { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '카드 드로우' }
      );
    }
  }

  // 승패 확인
  if (opponent.hp <= 0) {
    return { success: true, newState: checkGameOver(newState) };
  }

  // 남은 콤보 가능 여부 확인
  // 연격 가능 횟수가 남아있거나(무제한 포함), 패에 비용을 지불하고 낼 수 있는 적색 카드가 남아있다면 연격 단계 유지!
  const canStillCombo =
    (player.comboUnlimited || player.comboCount > 0) &&
    player.hand.some((c) => {
      if (c.color !== 'RED') return false;
      const cCost = getEffectiveCardCost(player, c);
      return player.concertoZone.length >= cCost && canPlayerUseActionCard(player.slots, c, player.actionArea).canUse;
    });

  if (!canStillCombo) {
    if (player.isAi) {
      newState = addLog(
        newState,
        `[연격 단계 완료] ${player.name}이(가) 더 이상 사용할 수 있는 연격 카드가 없습니다.`,
        'ACTION',
        playerIndex
      );
    } else {
      // Human 유저:
      // 바로 checkHandOverflowOrEndTurn으로 턴을 넘겨버리지 않고 COMBO_STEP 상태를 유지하여
      // 화면에 [연격 카드 없음] 알림 팝업 모달이 떠서 유저가 확인 또는 즉시 턴 넘기기를 누를 수 있도록 함
      newState = addLog(
        newState,
        `[연격 단계 안내] ${player.name}의 패에 더 이상 사용할 수 있는 연격(적색) 카드가 없습니다.`,
        'ACTION',
        playerIndex
      );
    }
  }

  return { success: true, newState };
}

// ==========================================
// 7.5. 배틀 페이즈 종료 스텝 (Battle Phase End Step - 공식 룰 604.1.4)
// ==========================================
export function executeBattlePhaseEndStep(state: GameState): GameState {
  let newState: GameState = { ...state };

  // 1. 치샤 Lv.2 [BP01-025] 리더 배틀 종료 효과: 액션 에리어에 기본 공격 2장 이상 시 상대에게 3pt 피해
  for (let i = 0; i < 2; i++) {
    const pIdx = i as 0 | 1;
    const oppIdx = (i === 0 ? 1 : 0) as 0 | 1;
    const p = newState.players[pIdx];
    const opp = newState.players[oppIdx];

    const hasChixiaBp01025 = getAllCardsInSlot(p.slots.leader).some((c) => c.code?.startsWith('BP01-025'));
    const normalAttacksInAction = (p.actionArea || []).filter(isNormalAttackCard).length;

    if (hasChixiaBp01025 && normalAttacksInAction >= 2) {
      const dealt = applyDamageWithLeaderModifiers(opp, 3, true);
      newState.players[oppIdx] = opp;
      newState = addLog(
        newState,
        `[치샤 Lv.2 BP01-025 배틀 종료 효과] 액션 에리어에 기본 공격 카드가 ${normalAttacksInAction}장 있어 상대에게 ${dealt}pt 추가 피해를 입혔습니다!`,
        'DAMAGE',
        pIdx,
        { amount: dealt, effectTag: '배틀 종료 피해' }
      );
      if (opp.hp <= 0) {
        return checkGameOver(newState);
      }
    }
  }

  // 1.5. 앙코 Lv.1 [BP01-014] 배틀 페이즈 종료 효과: 적색 카드에 패배한 경우 예약된 반격 피해 적용
  for (let i = 0; i < 2; i++) {
    const pIdx = i as 0 | 1;
    const oppIdx = (i === 0 ? 1 : 0) as 0 | 1;
    const p = newState.players[pIdx];
    const opp = newState.players[oppIdx];

    if (p.ankePendingRetaliationDmg && p.ankePendingRetaliationDmg > 0) {
      const rawDmg = p.ankePendingRetaliationDmg;
      p.ankePendingRetaliationDmg = 0;
      const dealt = applyDamageWithLeaderModifiers(opp, rawDmg, true);
      newState.players[pIdx] = p;
      newState.players[oppIdx] = opp;
      newState = addLog(
        newState,
        `[앙코 Lv.1 BP01-014 반격] 배틀 페이즈 종료 시 적색 카드에 패배한 반격으로 상대에게 ${dealt}pt 피해를 입혔습니다!`,
        'DAMAGE',
        pIdx,
        { amount: dealt, effectTag: '반격 데미지' }
      );
      if (opp.hp <= 0) {
        return checkGameOver(newState);
      }
    }
  }

  // 2. 날개의 뜻·회피 [BP01-069] 배틀 페이즈 종료 효과:
  // 공식 텍스트: "【각 배틀 페이즈 종료 시】자신의 리더가 「양양」인 경우, 1 COST를 지불하여 이 카드를 패에 추가 가능."
  for (let i = 0; i < 2; i++) {
    const pIdx = i as 0 | 1;
    const p = newState.players[pIdx];
    const hasYangyangLeader = slotHasCharacterSkill(p.slots.leader, '양양');
    p.actionArea = p.actionArea || [];
    const wingCard =
      p.actionArea.find((c) => c.code === 'BP01-069') ||
      (p.dropZone.find((c) => c.code === 'BP01-069') as ActionCard | undefined);

    if (hasYangyangLeader && wingCard && p.concertoZone.length >= 1) {
      if (p.isAi) {
        if (p.hand.length < 8 && p.concertoZone.length >= 2) {
          spendConcertoCost(p, 1);
          const aIdx = p.actionArea.findIndex((c) => c.id === wingCard.id || c.code === 'BP01-069');
          if (aIdx !== -1) {
            p.actionArea.splice(aIdx, 1);
          } else {
            const dIdx = p.dropZone.findIndex((c) => c.id === wingCard.id || c.code === 'BP01-069');
            if (dIdx !== -1) p.dropZone.splice(dIdx, 1);
          }
          addCardsToHand(p, [wingCard as ActionCard]);
          newState = addLog(
            newState,
            `[날개의 뜻·회피 BP01-069 배틀 페이즈 종료 효과] 1 COST를 지불하고 [날개의 뜻·회피]를 패로 회수했습니다!`,
            'ACTION',
            pIdx,
            { cardName: wingCard.nameKr, cardArt: wingCard.artUrl, effectTag: '패 회수' }
          );
        }
      } else {
        // Human 유저: 선택 모달 띄우기
        const choice: PendingChoice = {
          id: `choice-${Date.now()}-wing-recover-${pIdx}`,
          playerIndex: pIdx,
          title: '날개의 뜻·회피 — 패 회수 선택',
          sourceCardName: '날개의 뜻·회피 [BP01-069]',
          sourceCardArt: wingCard.artUrl,
          description: '【배틀 페이즈 종료 효과】1 COST(협주 에너지 1장)를 지불하고 [날개의 뜻·회피]를 패로 회수하시겠습니까?',
          revealedCards: [wingCard],
          minSelect: 0,
          maxSelect: 1,
          onResolveType: 'RECOVER_BP01_069',
        };
        newState = queueChoice(newState, choice, false);
      }
    }
  }

  // 공식 룰 【우세】 갱신: 이번 턴 배틀 페이즈가 종료될 때 다음 턴을 위한 우세 상태를 판정 결과에 따라 갱신
  if (newState.clashResult) {
    const wIdx = newState.clashResult.winnerIndex;
    newState.players[0].hasDominance = wIdx === 0;
    newState.players[1].hasDominance = wIdx === 1;
  }

  // 만약 선택 효과(날개의 뜻 회수 등)가 대기 중이라면 해당 선택 완료 후 턴 종료로 넘어가도록 대기
  if (newState.pendingChoice) {
    return newState;
  }

  return checkHandOverflowOrEndTurn(newState);
}

export function finishComboStep(state: GameState, playerIndex: 0 | 1): GameState {
  let newState: GameState = { ...state, lastComboStrike: null };
  const p = { ...newState.players[playerIndex] };

  p.comboCount = 0;
  p.comboUnlimited = false;
  newState.players[playerIndex] = p;
  newState = addLog(newState, `${p.name}이(가) 연격 단계를 마쳤습니다.`, 'ACTION', playerIndex);

  return executeBattlePhaseEndStep(newState);
}

// ==========================================
// 8. 패 상한 및 턴 종료 (END_PHASE - 공식 룰 605.1)
// ==========================================

function checkHandOverflowOrEndTurn(state: GameState): GameState {
  return executeEndPhase(state);
}

export function discardOverflowCards(
  state: GameState,
  playerIndex: 0 | 1,
  discardIds: string[]
): { success: boolean; newState: GameState; error?: string } {
  const player = { ...state.players[playerIndex] };
  const neededDiscard = player.hand.length - 8;

  if (discardIds.length !== neededDiscard) {
    return {
      success: false,
      newState: state,
      error: `패 상한(8장)을 초과했습니다. ${neededDiscard}장을 버려야 합니다.`,
    };
  }

  const discarded: ActionCard[] = [];
  for (const id of discardIds) {
    const idx = player.hand.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const [c] = player.hand.splice(idx, 1);
      discarded.push(c);
    }
  }
  player.dropZone.push(...discarded);

  let newState = { ...state };
  newState.players[playerIndex] = player;
  newState = addLog(newState, `${player.name}이(가) 패 상한 초과로 ${discarded.length}장을 버렸습니다.`, 'ACTION', playerIndex);

  // 패 버리기 완료 후 턴 종료 마무리 처리 (더블 트리거 방지)
  return { success: true, newState: finalizeEndPhase(newState) };
}

export function executeEndPhase(state: GameState): GameState {
  let newState: GameState = {
    ...state,
    phase: 'END_PHASE' as GamePhase,
    lastUpgrade: null,
    lastComboStrike: null,
    lastEffectEvent: null,
  };

  const p0 = { ...newState.players[0] };
  const p1 = { ...newState.players[1] };

  // 605.1.1 턴 종료 스킬 발동 (중첩 스킬 지원)
  for (let i = 0; i < 2; i++) {
    const pl = i === 0 ? p0 : p1;
    const opp = i === 0 ? p1 : p0;
    const lCards = getAllCardsInSlot(pl.slots.leader);

    // 방랑자(남) Lv.2 [SD02-001] 리더: 각 턴 종료 시 카드 1장 드로우
    if (lCards.some((c) => c.code?.startsWith('SD02-001'))) {
      const drawn = drawSingleCardFromDeck(pl);
      if (drawn) {
        addCardsToHand(pl, [drawn]);
        newState = addLog(newState, `[방랑자(남) Lv.2 턴 종료 효과] 덱에서 카드 1장을 드로우했습니다.`, 'ACTION', i as 0 | 1);
      }
    }

    // 산화 Lv.2 [SD02-003] 리더: 각 턴 종료 시 덱 위 1장 협주 에리어에 배치
    if (lCards.some((c) => c.code?.startsWith('SD02-003'))) {
      const charged = drawSingleCardFromDeck(pl);
      if (charged) {
        pl.concertoZone.push(charged);
        newState = addLog(newState, `[산화 Lv.2 턴 종료 효과] 협주 에너지 1장을 충전했습니다.`, 'ACTION', i as 0 | 1);
      }
    }

    // 앙코 Lv.2 [BP01-012] 리더: 이번 턴에 상대가 데미지를 받은 경우 트래시에서 앙코 카드 1장 패 추가 가능
    if (lCards.some((c) => c.code?.startsWith('BP01-012')) && opp.actionFlags.damageTakenThisTurn) {
      const dropIdx = pl.dropZone.findIndex(
        (c) => c.kind === 'ACTION' && (c.characterExclusive?.includes('앙코') || c.nameKr.includes('앙코'))
      );
      if (dropIdx !== -1) {
        const [ankeCard] = pl.dropZone.splice(dropIdx, 1);
        const reclaimed = ankeCard as ActionCard;
        addCardsToHand(pl, [reclaimed]);
        newState = addLog(newState, `[앙코 Lv.2 BP01-012 턴 종료 효과] 이번 턴 상대가 데미지를 받아 트래시에서 [${reclaimed.nameKr}]을(를) 패에 추가했습니다.`, 'ACTION', i as 0 | 1);
      }
    }

    // 양양 Lv.2 [BP01-022] 턴 종료: 패 1장 버리고 리더를 양양으로 교체 가능
    if (i === newState.activePlayerIndex && pl.hand.length > 0) {
      const yangyangSupportKey = (['leftSupport', 'rightSupport'] as const).find((k) =>
        getAllCardsInSlot(pl.slots[k]).some((c) => c.code?.startsWith('BP01-022'))
      );
      if (yangyangSupportKey && pl.slots[yangyangSupportKey]) {
        const yangyangCard = pl.slots[yangyangSupportKey]!;
        if (pl.isAi) {
          // AI는 현재 리더가 Lv.2 주력이 아니며 패가 충분할 때만 선택적으로 교체
          const shouldAiSwapYangyang = pl.slots.leader.level < 2 && pl.hand.length >= 5;
          if (shouldAiSwapYangyang) {
            const discarded = pl.hand.pop();
            if (discarded) {
              pl.dropZone.push(discarded);
              const prevLeader = pl.slots.leader;
              pl.slots.leader = yangyangCard;
              pl.slots[yangyangSupportKey] = prevLeader;
              newState.players = [p0, p1];
              newState = triggerShorekeeperSwitchSkill(newState, i as 0 | 1, pl, prevLeader, yangyangCard);
              newState = addLog(
                newState,
                `[양양 Lv.2 BP01-022 턴 종료 효과] 패 [${discarded.nameKr}]을(를) 버리고 리더를 [양양]으로 교체했습니다!`,
                'ACTION',
                i as 0 | 1
              );
            }
          }
        } else {
          const choice: PendingChoice = {
            id: `choice-${Date.now()}-yangyang-swap-${i}`,
            playerIndex: i as 0 | 1,
            title: '양양 Lv.2 — 리더 교체 선택',
            sourceCardName: '양양 Lv.2 [BP01-022]',
            sourceCardArt: yangyangCard.artUrl,
            description: '【자신의 턴 종료 시】패 1장을 버리고 리더를 [양양]으로 교체하시겠습니까?',
            revealedCards: pl.hand,
            minSelect: 0,
            maxSelect: 1,
            onResolveType: 'BP01_022_YANGYANG_SWAP',
          };
          newState = queueChoice(newState, choice, false);
        }
      }
    }
  }

  newState.players = [p0, p1];

  if (newState.pendingChoice) {
    return newState;
  }

  // 605.1.2 패 상한 체크 (공식 Q&A Q1: 턴 종료 스킬 발동 후 패가 8장을 초과하면 반드시 버려야 함)
  const activeIdx = newState.activePlayerIndex;
  const activePlayer = newState.players[activeIdx];
  if (activePlayer.hand.length > 8) {
    return {
      ...newState,
      phase: 'DISCARD_OVERFLOW',
    };
  }

  return finalizeEndPhase(newState);
}

// 턴 종료 마무리 (605.1.3 & 605.1.4 및 다음 턴 전환)
export function finalizeEndPhase(state: GameState): GameState {
  let newState = { ...state };
  const p0 = { ...newState.players[0] };
  const p1 = { ...newState.players[1] };

  // 605.1.3 각 플레이어는 액션 에리어에 있는 모든 카드를 트래시 에리어로 이동
  if (p0.actionArea && p0.actionArea.length > 0) {
    p0.dropZone.push(...p0.actionArea);
    p0.actionArea = [];
  }
  if (p1.actionArea && p1.actionArea.length > 0) {
    p1.dropZone.push(...p1.actionArea);
    p1.actionArea = [];
  }

  // 턴을 마치는 플레이어의 지속 턴제 디버프(SD01-016 적색 코스트+1, SD02-016 콤보 불가) 차감 및 만료 처리
  const finishingPlayer = newState.activePlayerIndex === 0 ? p0 : p1;
  if (finishingPlayer.tempCostPenaltyRedTurns && finishingPlayer.tempCostPenaltyRedTurns > 0) {
    finishingPlayer.tempCostPenaltyRedTurns -= 1;
    if (finishingPlayer.tempCostPenaltyRedTurns <= 0) {
      finishingPlayer.tempCostPenaltyRed = 0;
    }
  } else {
    finishingPlayer.tempCostPenaltyRed = 0;
  }

  if (finishingPlayer.comboBlockedTurns && finishingPlayer.comboBlockedTurns > 0) {
    finishingPlayer.comboBlockedTurns -= 1;
    if (finishingPlayer.comboBlockedTurns <= 0) {
      finishingPlayer.comboBlockedNextTurn = false;
    }
  } else {
    finishingPlayer.comboBlockedNextTurn = false;
  }

  // 연격 카운트 및 대결 플래그 초기화
  p0.comboCount = 0;
  p0.comboUnlimited = false;
  p0.clashCardReady = false;

  p1.comboCount = 0;
  p1.comboUnlimited = false;
  p1.clashCardReady = false;

  newState.isOpponentHandScanned = false;
  newState.players = [p0, p1];

  // 턴 전환
  const nextPlayerIdx = newState.activePlayerIndex === 0 ? 1 : 0;
  newState.activePlayerIndex = nextPlayerIdx;

  // 1P로 돌아올 때 턴 수 증가
  if (nextPlayerIdx === 0) {
    newState.turn += 1;
  }

  // 다음 플레이어의 시작 단계로 바로 진행
  return executeStartPhase(newState);
}

// 승패 판정
function checkGameOver(state: GameState): GameState {
  const p0Hp = state.players[0].hp;
  const p1Hp = state.players[1].hp;

  if (p0Hp <= 0 || p1Hp <= 0) {
    const winnerIdx: 0 | 1 = p0Hp <= 0 ? 1 : 0;
    const winnerName = state.players[winnerIdx].name;
    const loserName = state.players[winnerIdx === 0 ? 1 : 0].name;

    const endState: GameState = {
      ...state,
      phase: 'GAME_OVER',
      winner: winnerIdx,
    };

    return addLog(
      endState,
      `🏆 [게임 종료] ${loserName}의 생명력이 0이 되어, ${winnerName}이(가) 최종 승리했습니다!`,
      'SYSTEM'
    );
  }
  return state;
}

// ==========================================
// 9. 선택 발동 효과 해결 (PendingChoice)
// ==========================================

export function resolvePendingChoice(
  state: GameState,
  chosenCardIds: string[]
): GameState {
  if (!state.pendingChoice) return state;

  const { playerIndex, revealedCards, sourceCardName, onResolveType } = state.pendingChoice;
  const p0 = clonePlayer(state.players[0]);
  const p1 = clonePlayer(state.players[1]);
  const player = playerIndex === 0 ? p0 : p1;

  let newState: GameState = {
    ...state,
    pendingChoice: null,
    players: [p0, p1],
  };

  const maxAllowed = state.pendingChoice.maxSelect ?? 1;
  const chosenCards: Array<ActionCard | CharacterCard> = [];
  const remainingRevealed = [...revealedCards];
  for (const id of chosenCardIds) {
    if (chosenCards.length >= maxAllowed) break;
    const idx = remainingRevealed.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const [card] = remainingRevealed.splice(idx, 1);
      chosenCards.push(card);
    }
  }
  const unchosenCards = remainingRevealed as ActionCard[];
  const chosenActionCards = chosenCards as ActionCard[];

  if (onResolveType === 'VIEW_ONLY') {
    // 0. 상대방 패 확인 효과 (스캔 등: 패와 덱을 변동시키지 않고, 턴 종료 시까지 상대 손패 전면 공개)
    newState.isOpponentHandScanned = true;
    newState = addLog(
      newState,
      `[${sourceCardName}] ${player.name}이(가) 상대방의 패(${revealedCards.length}장)를 모두 확인했습니다. (턴 종료 시까지 전장 공개)`,
      'ACTION',
      playerIndex,
      { effectTag: '상대 패 확인' }
    );
  } else if (onResolveType === 'SELECT_EFFECT_UPGRADE') {
    // 0-B. 효과에 의한 캐릭터 중첩 레벨업 대상 수동 선택 (그늘이의 대폭주, 피어난 동백꽃, 팔천의 춘추 등)
    const targetSlot = state.pendingChoice.targetSlot ?? 'leader';
    const prevSlotChar = player.slots[targetSlot];
    const chosenChar = (chosenCards[0] || revealedCards[0]) as CharacterCard | undefined;

    if (prevSlotChar && chosenChar) {
      let deckIdx = player.characterDeck.findIndex((c) => c.id === chosenChar.id);
      if (deckIdx === -1) {
        deckIdx = player.characterDeck.findIndex((c) => c.code === chosenChar.code);
      }
      const lv2Card = deckIdx !== -1 ? player.characterDeck.splice(deckIdx, 1)[0] : chosenChar;

      const previousStack = prevSlotChar.underlyingCards || [];
      const { underlyingCards: _, ...cleanCurrent } = prevSlotChar;
      const stackedCard: CharacterCard = {
        ...lv2Card,
        underlyingCards: [...previousStack, cleanCurrent],
      };
      player.slots[targetSlot] = stackedCard;

      const upgradeEff = {
        id: `upgrade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        playerIndex,
        playerName: player.name,
        character: { ...lv2Card },
        previousLevel: prevSlotChar.level as 0 | 1 | 2,
        newLevel: stackedCard.level as 1 | 2,
        slotName: targetSlot,
      };

      if (newState.phase === 'CLASH_REVEAL' && !newState.clashResult) {
        newState.deferredUpgrade = upgradeEff;
      } else {
        newState.lastUpgrade = upgradeEff;
      }

      newState.lastEffectEvent = {
        id: `eff-upg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sourceCardName,
        effectType: 'BUFF',
        title: `${stackedCard.nameKr} 즉시 각성!`,
        description: `[${sourceCardName}] 효과로 선택한 [${stackedCard.nameKr} (${stackedCard.code})] 카드로 중첩 레벨업했습니다!`,
        playerIndex,
        timestamp: Date.now(),
      };

      newState = addLog(
        newState,
        `✨ [${sourceCardName}] ${player.name}이(가) [${prevSlotChar.nameKr}] 위에 [${stackedCard.nameKr} (${stackedCard.code})]을(를) 직접 선택하여 중첩 레벨업했습니다!`,
        'ACTION',
        playerIndex,
        { cardName: stackedCard.nameKr, cardArt: stackedCard.artUrl, effectTag: '효과 레벨업 완료' }
      );

      newState = applyCharacterEvolutionSkills(
        newState,
        playerIndex,
        targetSlot,
        stackedCard,
        prevSlotChar,
        false
      );
      newState = checkGameOver(newState);
    }
  } else if (onResolveType === 'SET_CONCERTO') {
    // 1. 협주 에리어 배치 선택
    // 출처가 트래시(dropZone, 예: 산화 Lv.1)인지 덱(actionDeck, 예: 양양/산화 배틀 효과)인지 명확히 판별
    const isFromDropZone =
      sourceCardName.includes('산화') ||
      player.dropZone.some((c) => revealedCards.some((rc) => rc.id === c.id || rc.code === c.code));

    if (chosenActionCards.length > 0) {
      for (const chosen of chosenActionCards) {
        if (isFromDropZone) {
          // dropZone에서 선택된 카드를 1:1로 정확히 제거
          let dIdx = player.dropZone.findIndex((c) => c.id === chosen.id);
          if (dIdx === -1) {
            dIdx = player.dropZone.findIndex((c) => c.code === chosen.code);
          }
          if (dIdx !== -1) {
            player.dropZone.splice(dIdx, 1);
          }
        } else {
          // actionDeck에서 선택된 카드를 1:1로 정확히 제거
          let aIdx = player.actionDeck.findIndex((c) => c.id === chosen.id);
          if (aIdx === -1) {
            aIdx = player.actionDeck.findIndex((c) => c.code === chosen.code);
          }
          if (aIdx !== -1) {
            player.actionDeck.splice(aIdx, 1);
          }
        }
      }
      player.concertoZone = [...player.concertoZone, ...chosenActionCards];
    }

    if (!isFromDropZone) {
      // 덱에서 공개되었으나 미선택된 카드는 덱 맨 위에 유지 (덱 깎이지 않음!)
      if (unchosenCards.length > 0) {
        player.actionDeck = [...unchosenCards, ...player.actionDeck];
      }
    }
    // (트래시에서 공개된 미선택 카드는 dropZone에 그대로 유지되며, 덱에 절대 추가되지 않음!)

    if (chosenActionCards.length > 0) {
      newState.lastEffectEvent = {
        id: `eff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sourceCardName,
        effectType: 'CHARGE',
        title: '협주 에리어 배치 완료',
        description: `[${sourceCardName}] 효과로 카드 ${chosenActionCards.length}장을 협주 에리어에 배치했습니다!`,
        playerIndex,
        timestamp: Date.now(),
      };
      newState = addLog(
        newState,
        `[${sourceCardName}] ${player.name}이(가) [${chosenActionCards.map((c) => c.nameKr).join(', ')}]을(를) 협주 에리어에 배치했습니다. (현재 협주: ${player.concertoZone.length})`,
        'ACTION',
        playerIndex
      );
    } else {
      newState = addLog(
        newState,
        `[${sourceCardName}] ${player.name}이(가) 협주 에리어 배치를 건너뛰었습니다 (${isFromDropZone ? '트래시 유지' : '덱 맨 위 유지'}).`,
        'ACTION',
        playerIndex
      );
    }
  } else if (onResolveType === 'RECOVER_FROM_DROP') {
    // 2. 트래시 에리어 회수 선택 (dropZone에서 1:1로 정확히 실물 카드를 추출하여 패로 이동, 절대 복제 불가)
    const recoveredCards: ActionCard[] = [];
    for (const chosen of chosenActionCards) {
      if (recoveredCards.length >= maxAllowed) break;
      // 1순위: 카드 고유 ID로 dropZone에서 정확히 1:1 추출
      let dropIdx = player.dropZone.findIndex((c) => c.id === chosen.id);
      if (dropIdx === -1) {
        // 2순위: ID 불일치 시 동일 code 카드를 dropZone에서 1:1 추출
        dropIdx = player.dropZone.findIndex((c) => c.code === chosen.code);
      }
      if (dropIdx !== -1) {
        const [reclaimed] = player.dropZone.splice(dropIdx, 1);
        recoveredCards.push(reclaimed as ActionCard);
      } else {
        recoveredCards.push(chosen);
      }
    }

    if (recoveredCards.length > 0) {
      addCardsToHand(player, recoveredCards);
    }

    if (recoveredCards.length > 0) {
      newState.lastEffectEvent = {
        id: `eff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sourceCardName,
        effectType: 'DRAW',
        title: '트래시 카드 회수 완료',
        description: `[${sourceCardName}] 효과로 [${recoveredCards.map((c) => c.nameKr).join(', ')}]을(를) 패에 회수했습니다!`,
        playerIndex,
        timestamp: Date.now(),
      };
      newState = addLog(
        newState,
        `[${sourceCardName}] ${player.name}이(가) 트래시에서 [${recoveredCards.map((c) => c.nameKr).join(', ')}]을(를) 패에 회수했습니다.`,
        'ACTION',
        playerIndex
      );
    } else {
      newState = addLog(
        newState,
        `[${sourceCardName}] ${player.name}이(가) 트래시 회수를 건너뛰었습니다.`,
        'ACTION',
        playerIndex
      );
    }
  } else if (onResolveType === 'SWAP_LEADER') {
    // 3. 산화 Lv.2 (BP01-031) 또는 얼음 파편 (BP01-077)에 의한 리더 교체 선택
    const chosenChar = chosenCards[0] as CharacterCard | undefined;
    if (chosenChar) {
      let targetSlot: 'leftSupport' | 'rightSupport' | null = null;
      if (
        player.slots.leftSupport &&
        (player.slots.leftSupport.id === chosenChar.id || player.slots.leftSupport.code === chosenChar.code)
      ) {
        targetSlot = 'leftSupport';
      } else if (
        player.slots.rightSupport &&
        (player.slots.rightSupport.id === chosenChar.id || player.slots.rightSupport.code === chosenChar.code)
      ) {
        targetSlot = 'rightSupport';
      }

      if (targetSlot && player.slots[targetSlot]) {
        const prevLeader = player.slots.leader;
        player.slots.leader = player.slots[targetSlot]!;
        player.slots[targetSlot] = prevLeader;

        newState.lastEffectEvent = {
          id: `eff-swap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sourceCardName,
          effectType: 'BUFF',
          title: '리더 교체 완료',
          description: `[${sourceCardName}] 효과로 리더를 [${prevLeader.nameKr}]에서 [${player.slots.leader.nameKr}](으)로 교체했습니다!`,
          playerIndex,
          timestamp: Date.now(),
        };

        newState = addLog(
          newState,
          `[${sourceCardName}] ${player.name}이(가) 리더를 [${prevLeader.nameKr}]에서 [${player.slots.leader.nameKr}](으)로 교체했습니다!`,
          'ACTION',
          playerIndex,
          { cardName: player.slots.leader.nameKr, cardArt: player.slots.leader.artUrl, effectTag: '리더 교체' }
        );
      }
    } else {
      newState = addLog(
        newState,
        `[${sourceCardName}] ${player.name}이(가) 리더 교체를 건너뛰었습니다.`,
        'ACTION',
        playerIndex
      );
    }
  } else if (onResolveType === 'RECOVER_BP01_069') {
    // 4. 날개의 뜻·회피 [BP01-069] 배틀 페이즈 종료 효과: 1 COST 지불하고 패로 회수
    const chosenAction = chosenCards[0] as ActionCard | undefined;
    if (chosenAction && player.concertoZone.length >= 1) {
      const [spent] = player.concertoZone.splice(0, 1);
      player.dropZone.push(spent);

      player.actionArea = player.actionArea || [];
      const aIdx = player.actionArea.findIndex(
        (c) => c.id === chosenAction.id || c.code === 'BP01-069'
      );
      if (aIdx !== -1) {
        player.actionArea.splice(aIdx, 1);
      } else {
        const dIdx = player.dropZone.findIndex(
          (c) => c.id === chosenAction.id || c.code === 'BP01-069'
        );
        if (dIdx !== -1) player.dropZone.splice(dIdx, 1);
      }

      addCardsToHand(player, [chosenAction]);

      newState.lastEffectEvent = {
        id: `eff-recover-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sourceCardName: '날개의 뜻·회피 [BP01-069]',
        effectType: 'DRAW',
        title: '날개의 뜻 패 회수 완료',
        description: `1 COST를 지불하고 [날개의 뜻·회피]를 패로 회수했습니다!`,
        playerIndex,
        timestamp: Date.now(),
      };

      newState = addLog(
        newState,
        `[날개의 뜻·회피 BP01-069 배틀 페이즈 종료 효과] ${player.name}이(가) 1 COST를 지불하고 [날개의 뜻·회피]를 패로 회수했습니다!`,
        'ACTION',
        playerIndex,
        { cardName: chosenAction.nameKr, cardArt: chosenAction.artUrl, effectTag: '패 회수' }
      );
    } else {
      newState = addLog(
        newState,
        `[날개의 뜻·회피 BP01-069] ${player.name}이(가) 패 회수를 건너뛰었습니다.`,
        'ACTION',
        playerIndex
      );
    }
  } else if (onResolveType === 'BP01_022_YANGYANG_SWAP') {
    const chosenDiscard = chosenCards[0] as ActionCard | undefined;
    if (chosenDiscard) {
      const dIdx = player.hand.findIndex((c) => c.id === chosenDiscard.id);
      if (dIdx !== -1) {
        player.hand.splice(dIdx, 1);
        player.dropZone.push(chosenDiscard);
      }
      const yangyangSupportKey = (['leftSupport', 'rightSupport'] as const).find((k) =>
        getAllCardsInSlot(player.slots[k]).some((c) => c.code === 'BP01-022')
      );
      if (yangyangSupportKey && player.slots[yangyangSupportKey]) {
        const prevLeader = player.slots.leader;
        player.slots.leader = player.slots[yangyangSupportKey]!;
        player.slots[yangyangSupportKey] = prevLeader;
      }
      newState = addLog(
        newState,
        `[양양 Lv.2 BP01-022 턴 종료 효과] ${player.name}이(가) 패 [${chosenDiscard.nameKr}]을(를) 버리고 리더를 [양양]으로 교체했습니다!`,
        'ACTION',
        playerIndex
      );
    } else {
      newState = addLog(
        newState,
        `[양양 Lv.2 BP01-022] ${player.name}이(가) 리더 교체를 건너뛰었습니다.`,
        'ACTION',
        playerIndex
      );
    }
  } else {
    // 5. 패에 추가 (ADD_TO_HAND)
    // 선택된 카드를 actionDeck에서 완전히 제거 (중복 드로우 원천 차단)
    player.actionDeck = player.actionDeck.filter((c) => !chosenActionCards.some((ch) => ch.id === c.id));

    // 손패 고유 ID 중복 방지 가드로 패에 안전 추가
    addCardsToHand(player, chosenActionCards);

    // 단일 공개 카드(파수인 BP01-010 또는 판정 패배 드로우)인 경우 미선택 시 덱 맨 위에 유지!
    // 다중 공개(방랑자 BP01-018)인 경우 미선택 카드는 덱 맨 아래로
    if (revealedCards.length <= 1) {
      player.actionDeck = [...unchosenCards, ...player.actionDeck];
    } else {
      player.actionDeck = [...player.actionDeck, ...unchosenCards];
    }

    if (chosenActionCards.length > 0) {
      newState.lastEffectEvent = {
        id: `eff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sourceCardName,
        effectType: 'DRAW',
        title: '카드 패 추가 완료',
        description: `[${sourceCardName}] 효과로 카드 ${chosenActionCards.length}장을 패에 추가했습니다!`,
        playerIndex,
        timestamp: Date.now(),
      };
    }

    newState = addLog(
      newState,
      `${player.name}이(가) [${sourceCardName}] 효과로 카드 ${chosenActionCards.length}장을 선택하여 패에 추가했습니다.${
        unchosenCards.length > 0
          ? revealedCards.length <= 1
            ? ' (선택하지 않은 카드는 덱 맨 위 유지)'
            : ` (선택하지 않은 ${unchosenCards.length}장은 덱 맨 아래로)`
          : ''
      }`,
      'ACTION',
      playerIndex
    );
  }

  // 1. 효과 해결 중(예: 캐릭터 진화 스킬 발동) 새로운 pendingChoice가 생성되었다면 우선 반환
  if (newState.pendingChoice) {
    return newState;
  }

  // 1-B. 큐에 대기 중인 다음 선택 발동 효과가 있다면 순차적으로 표출
  if (newState.pendingChoiceQueue && newState.pendingChoiceQueue.length > 0) {
    const [nextChoice, ...rest] = newState.pendingChoiceQueue;
    newState.pendingChoice = nextChoice;
    newState.pendingChoiceQueue = rest;
    return newState;
  }

  // 배틀 페이즈 종료 시점의 회수 효과(RECOVER_BP01_069) 처리 완료 시 턴 종료로 직행
  if (onResolveType === 'RECOVER_BP01_069') {
    return checkHandOverflowOrEndTurn(newState);
  }

  // 양양 Lv.2 턴 종료 교체 효과 완료 시 패 상한 체크 및 턴 종료
  if (onResolveType === 'BP01_022_YANGYANG_SWAP') {
    if (player.hand.length > 8) {
      return { ...newState, phase: 'DISCARD_OVERFLOW' };
    }
    return finalizeEndPhase(newState);
  }

  // 2. 배틀 스텝(Battle Step) 선택 발동 효과(양 플레이어가 카드를 세트하고 판정을 앞둔 상태)를 완료한 경우:
  // 오직 양측 대결 카드가 세트되어 있을 때만 판정 스텝(finishClashJudgment)을 실행!
  if (
    newState.phase === 'CLASH_REVEAL' &&
    !newState.clashResult &&
    Boolean(newState.players[0].clashCard || newState.players[1].clashCard)
  ) {
    return finishClashJudgment(newState);
  }

  // 3. 전투 종료 후 보류되었던 효과(트래시 카드 회수, 패배 드로우 등)가 완료되었거나,
  // 이미 clashResult 판정이 끝난 상태에서 CLASH_REVEAL인 경우:
  // 절대로 finishClashJudgment를 다시 호출하지 않고, 연격 단계(COMBO_STEP) 또는 턴 종료 단계로 안전하게 진행!
  if (newState.phase === 'CLASH_REVEAL') {
    const p0State = newState.players[0];
    const p1State = newState.players[1];
    const p0HasComboPerm = Boolean(p0State.comboUnlimited) || (p0State.comboCount ?? 0) > 0;
    const p1HasComboPerm = Boolean(p1State.comboUnlimited) || (p1State.comboCount ?? 0) > 0;

    if (p0HasComboPerm || p1HasComboPerm) {
      const comboPlayerIdx: 0 | 1 = p0HasComboPerm ? 0 : 1;
      const comboPlayer = newState.players[comboPlayerIdx];

      newState.phase = 'COMBO_STEP';
      newState = addLog(
        newState,
        `⚡ ${comboPlayer.name}의 [연격 단계(Combo Step)] 돌입! ${
          comboPlayer.comboUnlimited
            ? '적색 승리: 연속 연격 무제한 가능!'
            : `남은 연격 횟수: ${comboPlayer.comboCount}회`
        }`,
        'ACTION',
        comboPlayerIdx
      );
      return newState;
    } else {
      p0State.comboCount = 0;
      p0State.comboUnlimited = false;
      p1State.comboCount = 0;
      p1State.comboUnlimited = false;
      newState.players = [p0State, p1State];
      return executeBattlePhaseEndStep(newState);
    }
  }

  return newState;
}
