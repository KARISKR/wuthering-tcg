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

// 공식 규칙에 따른 액션 카드 사용 가능 여부 판별
// 1. 일반 공용 카드: 누구나 사용 가능
// 2. 【리더 스킬】 카드: 해당 캐릭터가 '현재 리더(중앙)' 자리에 있어야만 발동 가능
// 3. 비(非) 리더 스킬 전용 카드: 해당 캐릭터가 '전장 3인 파티(리더 또는 좌/우 서포터)'에 존재하면 자유롭게 사용 가능!
export function canPlayerUseActionCard(
  slots: CharacterSlotsLike,
  card: ActionCard
): { canUse: boolean; reason?: string } {
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

// <일반 공격> 카드 판별 통합 헬퍼 (카멜리아 등 공식 룰 매칭)
export function isNormalAttackCard(card: any): boolean {
  if (!card || card.kind !== 'ACTION') return false;
  const name = card.nameKr || '';
  const feat = card.feature || '';
  const desc = card.description || '';
  const code = card.code || '';

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
    code === 'BP01-059'    // 그늘이와 구름이 출격·일반 공격
  );
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

// 공식 룰 603.1.2.2: 선택한 캐릭터와 레벨이 동일하거나 1단계 높은, 동명의 캐릭터 카드 전체 탐색
export function findAllUpgradableCards(characterDeck: CharacterCard[], slotChar: CharacterCard): CharacterCard[] {
  return characterDeck.filter(
    (c) =>
      isSameCharacter(c, slotChar) &&
      (c.level === slotChar.level + 1 || c.level === slotChar.level) &&
      c.code !== 'BP01-011'
  );
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
    score += exclusiveCount * 3.0 + usableCount * 1.5;

    if (charName === '양양') score += 2.5; // 시작 무료 협주 에너지 1충전 패시브
    if (charName === '금희') score += 1.8;
    if (charName === '치샤') score += 1.5;
    if (charName === '산화') score += 1.2;

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
  // 1) Lv.2 방랑자 패시브: 턴 시작 시 추가 드로우 1장 (방랑자 Lv.2 이상이거나 하위 스택 보유 시)
  const hasRoverLv2 = slotHasCharacterSkill(activePlayer.slots.leader, '방랑자', 2);
  if (hasRoverLv2) {
    const card = drawSingleCardFromDeck(activePlayer);
    if (card) {
      addCardsToHand(activePlayer, [card]);
      newState = addLog(newState, `[방랑자 Lv.2 패시브] ${activePlayer.name}이(가) 카드를 1장 추가 드로우했습니다.`, 'ACTION', activeIdx);
    }
  }

  // 2) Lv.1 양양 리더 효과: 턴 시작 시 협주 존 카드가 1장 이하라면 덱에서 1장 충전 (Lv.2 양양이어도 하위 Lv.1 스킬 보유!)
  const hasYangyangLv1 = slotHasCharacterSkill(activePlayer.slots.leader, '양양', 1);
  if (hasYangyangLv1 && activePlayer.concertoZone.length <= 1) {
    const card = drawSingleCardFromDeck(activePlayer);
    if (card) {
      activePlayer.concertoZone.push(card);
      newState = addLog(newState, `[양양 Lv.1 리더 효과] 협주 존에 카드를 1장 무료 충전했습니다.`, 'ACTION', activeIdx);
    }
  }

  // 행동 플래그 및 연격 카운트 초기화
  activePlayer.actionFlags = {
    upgraded: false,
    switchedLeader: false,
    chargedConcerto: false,
  };
  activePlayer.comboCount = 0;

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

  // 행동 플래그 리셋
  player.actionFlags = {
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

  // 레벨업 비용 계산: 기본 목표 레벨 수만큼 패 버림
  // 단, Lv.2 양양 지속 효과(코스트 1장 경감, 최소 1장) 적용
  let requiredDiscard = upgradeCard.level;
  const hasYangyangLv2 = playerHasCharacterSkill(player, '양양', 2);

  if (hasYangyangLv2 && requiredDiscard > 1) {
    requiredDiscard -= 1;
  }

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

  // 1. BP01-003 카멜리아 Lv.1: 트래시에서 <일반 공격> 1장 패에 추가 가능
  const isCamellya1 = (c: CharacterCard | undefined) =>
    Boolean(c && (c.code?.startsWith('BP01-003') || (c.level === 1 && (c.characterName === '카멜리아' || c.nameKr?.includes('카멜리아')))));

  const cam1 = isCamellya1(upgradeCard) ? upgradeCard : isCamellya1(currentSlotCard) ? currentSlotCard : null;
  if (cam1) {
    const isEntry = isCamellya1(upgradeCard);
    const normalAttacks = player.dropZone.filter(isNormalAttackCard) as ActionCard[];
    if (normalAttacks.length > 0) {
      if (player.isAi) {
        const dropIdx = player.dropZone.findIndex(isNormalAttackCard);
        if (dropIdx !== -1) {
          const [reclaimed] = player.dropZone.splice(dropIdx, 1);
          player.hand.push(reclaimed as ActionCard);
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
  const sh1 = upgradeCard.code === 'BP01-009' ? upgradeCard : currentSlotCard.code === 'BP01-009' ? currentSlotCard : null;
  if (sh1) {
    const isEntry = sh1 === upgradeCard;
    const introSkills = player.dropZone.filter((c) => c.kind === 'ACTION' && c.nameKr.includes('변주 스킬')) as ActionCard[];
    if (introSkills.length > 0) {
      if (player.isAi) {
        const dropIdx = player.dropZone.findIndex((c) => c.kind === 'ACTION' && c.nameKr.includes('변주 스킬'));
        if (dropIdx !== -1) {
          const [reclaimed] = player.dropZone.splice(dropIdx, 1);
          player.hand.push(reclaimed as ActionCard);
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
  const anke1 = upgradeCard.code === 'BP01-013' ? upgradeCard : currentSlotCard.code === 'BP01-013' ? currentSlotCard : null;
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
          player.hand.push(reclaimed as ActionCard);
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
  const chixia1 = upgradeCard.code === 'BP01-026' ? upgradeCard : currentSlotCard.code === 'BP01-026' ? currentSlotCard : null;
  if (chixia1) {
    const isEntry = chixia1 === upgradeCard;
    const normalAttacks = player.dropZone.filter(
      (c) => c.kind === 'ACTION' && (c.nameKr.includes('기본 공격') || c.nameKr.includes('일반 공격'))
    ) as ActionCard[];
    if (normalAttacks.length > 0) {
      if (player.isAi) {
        const dropIdx = player.dropZone.findIndex(
          (c) => c.kind === 'ACTION' && (c.nameKr.includes('기본 공격') || c.nameKr.includes('일반 공격'))
        );
        if (dropIdx !== -1) {
          const [reclaimed] = player.dropZone.splice(dropIdx, 1);
          player.hand.push(reclaimed as ActionCard);
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
  const sanhua1 = upgradeCard.code === 'BP01-032' ? upgradeCard : currentSlotCard.code === 'BP01-032' ? currentSlotCard : null;
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
  const rover1 = (upgradeCard.code === 'BP01-017' || upgradeCard.code === 'BP01-020') ? upgradeCard : (currentSlotCard.code === 'BP01-017' || currentSlotCard.code === 'BP01-020') ? currentSlotCard : null;
  if (rover1) {
    const isEntry = rover1 === upgradeCard;
    const topCard = drawSingleCardFromDeck(player);
    if (topCard) {
      if (player.isAi) {
        player.hand.push(topCard);
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

  // 7. 양양 Lv.1 (BP01-023 등): 【등장】/【레벨업】자신의 덱 위의 카드 1장을 협주 에리어에 배치한다.
  // 1) 0 -> 1 레벨업 시 (등장): upgradeCard가 양양 Lv.1일 때 덱 위 1장 즉시 협주 에리어에 자동 배치
  // 2) 1 -> 2 레벨업 시 (레벨업): 밑에 깔린 currentSlotCard가 양양 Lv.1일 때 덱 위 1장 즉시 협주 에리어에 자동 배치
  const isYangyangLv1 = (c: CharacterCard | undefined | null) =>
    Boolean(c && (c.code === 'BP01-023' || (c.level === 1 && (c.characterName === '양양' || c.nameKr?.includes('양양')))));

  const isYangEntry = isYangyangLv1(upgradeCard);
  const isYangStack = isYangyangLv1(currentSlotCard);

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
  if (currentSlotCard.code === 'BP01-001' || currentSlotCard.code === 'BP01-002') {
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
  } else {
    newState = addLog(newState, `${newState.players[activeIdx].name}이(가) 대결을 건너뛰었습니다.`, 'ACTION', activeIdx);
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

    // 코스트 검증
    if (player.concertoZone.length < card.cost) {
      return {
        success: false,
        newState: state,
        error: `비용(COST ${card.cost})이 부족합니다. 현재 협주: ${player.concertoZone.length}`,
      };
    }

    // 전용 카드 조건 검증
    const cardUsage = canPlayerUseActionCard(player.slots, card);
    if (!cardUsage.canUse) {
      return {
        success: false,
        newState: state,
        error: cardUsage.reason || `이 카드는 사용할 수 없습니다.`,
      };
    }

    // 코스트 지불: 전달받은 spentConcertoIds가 있으면 우선 소모, 없으면 앞에서부터 차감
    if (card.cost > 0) {
      let spentCards: ActionCard[] = [];
      if (spentConcertoIds && spentConcertoIds.length === card.cost) {
        const remaining: ActionCard[] = [];
        for (const c of player.concertoZone) {
          if (spentConcertoIds.includes(c.id) && spentCards.length < card.cost) {
            spentCards.push(c);
          } else {
            remaining.push(c);
          }
        }
        player.concertoZone = remaining;
      } else {
        spentCards = player.concertoZone.splice(0, card.cost);
      }
      player.dropZone.push(...spentCards);
    }

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
    const usable = p1.hand.find((c) => p1.concertoZone.length >= c.cost && canPlayerUseActionCard(p1.slots, c).canUse);
    if (usable) {
      if (usable.cost > 0) {
        const spent = p1.concertoZone.splice(0, usable.cost);
        p1.dropZone.push(...spent);
      }
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
        (c) => c.code === 'BP01-027' || (c.level === 0 && (c.characterName === '치샤' || c.nameKr.includes('치샤')))
      );
      if (hasChixia0) {
        oppPlayer.hp = Math.max(0, oppPlayer.hp - 1);
        newState.lastEffectEvent = {
          id: `eff-${Date.now()}-chixia0-${playerIndex}`,
          sourceCardName: '치샤 Lv.0',
          sourceCardArt: player.slots.leader.artUrl,
          effectType: 'DAMAGE',
          title: '치샤 배틀 효과',
          description: '적색 카드로 배틀에 돌입하여 상대에게 1pt 데미지를 입혔습니다!',
          playerIndex,
          timestamp: Date.now(),
        };
        newState = addLog(
          newState,
          `[치샤 Lv.0 배틀 효과] 적색 카드로 배틀에 돌입하여 상대에게 1pt 데미지를 입혔습니다!`,
          'DAMAGE',
          playerIndex,
          { amount: 1, effectTag: '배틀 피해' }
        );
      }

      // 1-B. 금희 Lv.0 [BP01-030]: 적색 카드로 배틀 시 상대에게 1pt 피해
      const hasJinhsi0 = leaderCards.some(
        (c) => c.code === 'BP01-030' || (c.level === 0 && (c.characterName === '금희' || c.nameKr.includes('금희')))
      );
      if (hasJinhsi0) {
        oppPlayer.hp = Math.max(0, oppPlayer.hp - 1);
        newState.lastEffectEvent = {
          id: `eff-${Date.now()}-jinhsi0-${playerIndex}`,
          sourceCardName: '금희 Lv.0',
          sourceCardArt: player.slots.leader.artUrl,
          effectType: 'DAMAGE',
          title: '금희 배틀 효과',
          description: '적색 카드로 배틀에 돌입하여 상대에게 1pt 데미지를 입혔습니다!',
          playerIndex,
          timestamp: Date.now(),
        };
        newState = addLog(
          newState,
          `[금희 Lv.0 배틀 효과] 적색 카드로 배틀에 돌입하여 상대에게 1pt 데미지를 입혔습니다!`,
          'DAMAGE',
          playerIndex,
          { amount: 1, effectTag: '배틀 피해' }
        );
      }

      // 1-C. 상대 양양 Lv.2 [SD01-003]: 상대가 적색 카드로 배틀 시 1 COST 지불 가능. 미지불 시 3pt 피해
      const oppLeaderCards = getAllCardsInSlot(oppPlayer.slots.leader);
      const oppHasYangyangLv2 = oppLeaderCards.some(
        (c) => c.code === 'SD01-003' || (c.characterName === '양양' && c.level === 2)
      );
      if (oppHasYangyangLv2) {
        if (player.concertoZone.length >= 1) {
          const [spent] = player.concertoZone.splice(0, 1);
          player.dropZone.push(spent);
          newState = addLog(
            newState,
            `[상대 양양 Lv.2 배틀 효과] 상대 적색 배틀 견제로 1 COST를 지불했습니다.`,
            'ACTION',
            playerIndex
          );
        } else {
          player.hp = Math.max(0, player.hp - 3);
          newState = addLog(
            newState,
            `[상대 양양 Lv.2 배틀 효과] 1 COST를 지불할 수 없어 3pt 데미지를 받았습니다!`,
            'DAMAGE',
            oppIdx,
            { amount: 3, effectTag: '배틀 피해' }
          );
        }
      }
    }

    // 2. 녹색 배틀 시 스킬
    if (clashCard.color === 'GREEN') {
      // 2-A. 방랑자(여) [BP01-018] / 방랑자(남) [BP01-021] Lv.0 배틀 효과
      const hasRover0 = leaderCards.some(
        (c) =>
          c.code === 'BP01-018' ||
          c.code === 'BP01-021' ||
          (c.level === 0 && (c.characterName?.includes('방랑자') || c.nameKr?.includes('방랑자')))
      );
      if (hasRover0) {
        const revealed = player.actionDeck.splice(0, Math.min(2, player.actionDeck.length));
        if (revealed.length > 0) {
          if (player.isAi) {
            player.hand.push(...revealed);
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
        (c) => c.code === 'BP01-010' || (c.level === 0 && (c.characterName === '파수인' || c.nameKr.includes('파수인')))
      );
      if (hasShorekeeper0) {
        const card = drawSingleCardFromDeck(player);
        if (card) {
          if (player.isAi) {
            player.hand.push(card);
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
        (c) => c.code === 'BP01-024' || (c.level === 0 && (c.characterName === '양양' || c.nameKr.includes('양양')))
      );
      const hasSanhua0 = leaderCards.some(
        (c) => c.code === 'BP01-033' || (c.level === 0 && (c.characterName === '산화' || c.nameKr.includes('산화')))
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

    // 4. 피어난 동백꽃 [BP01-048] 배틀 효과: 카멜리아 레벨업!
    if (clashCard.code === 'BP01-048') {
      const camSlotKey = (['leader', 'leftSupport', 'rightSupport'] as const).find(
        (k) => player.slots[k]?.characterName === '카멜리아'
      );
      if (camSlotKey && player.slots[camSlotKey]) {
        const currentCam = player.slots[camSlotKey]!;
        const nextCam = findEvolutionCard(player.characterDeck, currentCam);
        if (nextCam) {
          player.characterDeck = player.characterDeck.filter((c) => c.id !== nextCam.id);
          const prevUnderlying = currentCam.underlyingCards || [];
          player.slots[camSlotKey] = {
            ...nextCam,
            underlyingCards: [...prevUnderlying, currentCam],
          };
          newState.lastUpgrade = {
            id: `upgrade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            playerIndex,
            playerName: player.name,
            character: { ...nextCam },
            previousLevel: currentCam.level as 0 | 1,
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
          // 레벨업/등장 스킬 발동 연계
          newState.players = players;
          newState = applyCharacterEvolutionSkills(newState, playerIndex, camSlotKey, nextCam, currentCam, false);
          player = { ...newState.players[playerIndex] };
          players[playerIndex] = player;
        }
      }
    }

    // 5. 그늘이의 대폭주 [BP01-062] 배틀 효과: 앙코를 Lv.2로 진화시키고 리더를 앙코로 교체!
    if (clashCard.code === 'BP01-062') {
      const ankeSlotKey = (['leader', 'leftSupport', 'rightSupport'] as const).find(
        (k) => player.slots[k]?.characterName === '앙코'
      );
      if (ankeSlotKey && player.slots[ankeSlotKey]) {
        const currentAnke = player.slots[ankeSlotKey]!;
        const lv2Anke = findLv2Card(player.characterDeck, currentAnke);
        if (lv2Anke) {
          player.characterDeck = player.characterDeck.filter((c) => c.id !== lv2Anke.id);
          const prevUnderlying = currentAnke.underlyingCards || [];
          player.slots[ankeSlotKey] = {
            ...lv2Anke,
            underlyingCards: [...prevUnderlying, currentAnke],
          };
          newState.lastUpgrade = {
            id: `upgrade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            playerIndex,
            playerName: player.name,
            character: { ...lv2Anke },
            previousLevel: currentAnke.level as 0 | 1,
            newLevel: 2,
            slotName: ankeSlotKey,
          };
        }
        if (ankeSlotKey !== 'leader') {
          const prevLeader = player.slots.leader;
          player.slots.leader = player.slots[ankeSlotKey]!;
          player.slots[ankeSlotKey] = prevLeader;
        }
        newState = addLog(
          newState,
          `[그늘이의 대폭주 BP01-062 배틀 효과] 앙코를 Lv.2로 각성시키고 리더를 [앙코]로 교체했습니다!`,
          'ACTION',
          playerIndex,
          { cardArt: clashCard.artUrl, cardName: '그늘이의 대폭주', effectTag: '리더 교체&진화' }
        );
        if (lv2Anke) {
          // 레벨업/등장 스킬 발동 연계
          newState.players = players;
          newState = applyCharacterEvolutionSkills(newState, playerIndex, 'leader', lv2Anke, currentAnke, false);
          player = { ...newState.players[playerIndex] };
          players[playerIndex] = player;
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
        player.slots.leader = player.slots[sanhuaSlotKey]!;
        player.slots[sanhuaSlotKey] = prevLeader;
        newState = addLog(
          newState,
          `[매서운 가시 BP01-076 배틀 효과] 리더를 [${player.slots.leader.nameKr}](으)로 교체했습니다!`,
          'ACTION',
          playerIndex,
          { cardArt: clashCard.artUrl, cardName: '매서운 가시', effectTag: '리더 교체' }
        );
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
    const loserLeaderCards = getAllCardsInSlot(loserPlayer.slots.leader);

    // 1. 대미지 계산
    let baseDmg = winCard.damage;
    let extraDmg = 0;

    // 금희 Lv.1 [BP01-029] 리더 판정: 적색 승리 시 상대에게 데미지 2pt
    if (winnerLeaderCards.some((c) => c.code === 'BP01-029') && winCard.color === 'RED') {
      extraDmg += 2;
    }

    // 치샤 Lv.2 [SD01-005]: 자신의 【리더 스킬】을 가진 【치샤】의 카드 데미지 +3 (필드 어디든 유효)
    const hasChixiaSd01005 = hasActiveCharacterSkill(winnerPlayer, (info) =>
      getAllCardsInSlot(info.card).some((c) => c.code === 'SD01-005')
    );
    if (hasChixiaSd01005 && winCard.characterExclusive?.includes('치샤') && isLeaderSkillCard(winCard)) {
      extraDmg += 3;
    }

    // 앙코 Lv.0 [BP01-015] 리더: 매 턴 처음 사용한 앙코 기본 공격 데미지 +2
    const hasAnke0 = winnerLeaderCards.some((c) => c.code === 'BP01-015');
    if (
      hasAnke0 &&
      winCard.characterExclusive?.includes('앙코') &&
      (winCard.nameKr.includes('기본 공격') || winCard.nameKr.includes('일반 공격'))
    ) {
      extraDmg += 2;
    }

    // 앙코 Lv.2 [BP01-011]: 자신의 【앙코】 적색 카드 데미지 +1 (필드 어디든 유효)
    const hasAnkeBp01011 = hasActiveCharacterSkill(winnerPlayer, (info) =>
      getAllCardsInSlot(info.card).some((c) => c.code === 'BP01-011')
    );
    if (hasAnkeBp01011 && winCard.characterExclusive?.includes('앙코') && winCard.color === 'RED') {
      extraDmg += 1;
    }

    // 카멜리아 Lv.2 [BP01-001] 리더: 자신의 【카멜리아】 적색 카드 데미지 +1
    if (
      winnerLeaderCards.some((c) => c.code === 'BP01-001') &&
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

    // 피격자 데미지 보정
    // 카멜리아 Lv.2 [BP01-001] 리더: 자신이 받는 데미지 +1
    if (loserLeaderCards.some((c) => c.code === 'BP01-001')) {
      baseDmg += 1;
    }
    // 카멜리아 Lv.2 [BP01-002] 리더: 매 턴 처음 받는 데미지 -1
    if (loserLeaderCards.some((c) => c.code === 'BP01-002')) {
      baseDmg = Math.max(0, baseDmg - 1);
    }

    loserPlayer.hp = Math.max(0, loserPlayer.hp - baseDmg);
    damageDealt = baseDmg;

    // 에코 특수 효과 (데미지 적중 시)
    if (damageDealt > 0) {
      // BP01-035 지옥불 기사: 상대에게 데미지를 입힐 시 상대 패 4장당 상대 패 1장 제거
      if (winCard.code === 'BP01-035' && loserPlayer.hand.length >= 4) {
        const [discarded] = loserPlayer.hand.splice(0, 1);
        loserPlayer.dropZone.push(discarded);
        newState = addLog(newState, `[지옥불 기사 BP01-035 효과] 상대의 패 1장을 제거했습니다!`, 'ACTION', winnerIndex);
      }
      // BP01-037 반디의 군세: 상대에게 데미지를 입힐 시 상대 협주 존 카드 1장을 트래시로 버림
      if (winCard.code === 'BP01-037' && loserPlayer.concertoZone.length > 0) {
        const [discarded] = loserPlayer.concertoZone.splice(0, 1);
        loserPlayer.dropZone.push(discarded);
        newState = addLog(newState, `[반디의 군세 BP01-037 효과] 상대의 협주 에너지 1장을 파괴했습니다!`, 'ACTION', winnerIndex);
      }
      // BP01-039 폭주의 고릴라: 상대에게 데미지를 입힐 시 상대 패 1장을 덱 아래로
      if (winCard.code === 'BP01-039' && loserPlayer.hand.length > 0) {
        const [card] = loserPlayer.hand.splice(0, 1);
        loserPlayer.actionDeck.push(card);
        newState = addLog(newState, `[폭주의 고릴라 BP01-039 효과] 상대의 패 1장을 덱 아래로 되돌렸습니다!`, 'ACTION', winnerIndex);
      }
      // BP01-041 크라운리스: 상대에게 데미지를 입힐 시 상대 덱 위 3장 트래시로 버림
      if (winCard.code === 'BP01-041' && loserPlayer.actionDeck.length > 0) {
        const milled = loserPlayer.actionDeck.splice(0, Math.min(3, loserPlayer.actionDeck.length));
        loserPlayer.dropZone.push(...milled);
        newState = addLog(newState, `[크라운리스 BP01-041 효과] 상대의 덱 위에서 ${milled.length}장을 트래시로 버렸습니다!`, 'ACTION', winnerIndex);
      }
    }

    // 2. 카드/리더 승리 특수 효과 발동
    // 금희 Lv.2 [BP01-028] 리더 판정: 자신의 턴에 승리했을 경우 덱 위 5장 확인, 모든 금희 카드 패 추가
    if (winnerIndex === activeIdx && winnerLeaderCards.some((c) => c.code === 'BP01-028')) {
      const top5 = winnerPlayer.actionDeck.splice(0, Math.min(5, winnerPlayer.actionDeck.length));
      const jinhsiCards = top5.filter((c) => c.characterExclusive?.includes('금희') || c.nameKr.includes('금희'));
      const others = top5.filter((c) => !jinhsiCards.includes(c));
      winnerPlayer.hand.push(...jinhsiCards);
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
      winnerLeaderCards.some((c) => c.code === 'BP01-016') &&
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
    if (winnerLeaderCards.some((c) => c.code === 'BP01-005' || (c.level === 0 && (c.characterName === '카멜리아' || c.nameKr.includes('카멜리아'))))) {
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
      winnerLeaderCards.some((c) => c.code === 'BP01-010' || (c.level === 0 && (c.characterName === '파수인' || c.nameKr.includes('파수인')))) &&
      winCard.color === 'GREEN'
    ) {
      winnerPlayer.hp = Math.min(winnerPlayer.maxHp, winnerPlayer.hp + 1);
      // 파수인 Lv.2 [BP01-006]: HP 회복 시 1장 드로우 (1턴 2회)
      const hasShorekeeperLv2 = hasActiveCharacterSkill(winnerPlayer, (info) =>
        getAllCardsInSlot(info.card).some((c) => c.code === 'BP01-006' || (c.characterName === '파수인' && c.level === 2))
      );
      if (hasShorekeeperLv2) {
        const d = drawSingleCardFromDeck(winnerPlayer);
        if (d) winnerPlayer.hand.push(d);
      }
      newState = addLog(
        newState,
        `[파수인 BP01-010 리더 효과] 녹색 카드 판정 승리로 HP +1을 회복했습니다! (현재 HP: ${winnerPlayer.hp}/${winnerPlayer.maxHp})`,
        'HEAL',
        winnerIndex,
        { cardArt: winnerPlayer.slots.leader.artUrl, cardName: winnerPlayer.slots.leader.nameKr, amount: 1, effectTag: '리더 회복' }
      );
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
      if (drawn) winnerPlayer.hand.push(drawn);
      if (winnerPlayer.hand.length > 0) {
        const discarded = winnerPlayer.hand.shift();
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
    }

    // I. CHARGE 기본 효과
    if (winCard.effectType === 'CHARGE') {
      const c1 = drawSingleCardFromDeck(winnerPlayer);
      if (c1) winnerPlayer.concertoZone.push(c1);
      const c2 = drawSingleCardFromDeck(winnerPlayer);
      if (c2) winnerPlayer.hand.push(c2);
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

    // 카드 자체 [추격 X] 및 캐릭터 추격 효과 가산
    let officialPursuit = winCard.pursuitCount ?? 0;
    if (winCard.code === 'SD02-010') officialPursuit += 8; // 금희 용을 타고 하늘로 향해 [추격 8]
    if (winCard.code === 'BP01-057') officialPursuit += 8; // 결말의 순환 [추격 8]
    if (winCard.code === 'BP01-069') officialPursuit += 1; // 날개의 뜻 [추격 1]
    if (winCard.code === 'SD01-013') officialPursuit += 2; // 날카로운 바람·회피 [추격 2]
    if (winCard.code === 'SD01-015') officialPursuit += 1; // 점프 [추격 1]
    if (winCard.code === 'SD01-021') officialPursuit += 2; // 로프 [추격 2]
    if (winCard.code === 'SD02-013') officialPursuit += 2; // 차가운 빛·회피 [추격 2]
    if (winCard.code === 'SD02-021') officialPursuit += 2; // 로프 [추격 2]

    // 방랑자(남) Lv.2 [BP01-019] 리더 판정: 자신이 녹색 카드로 승리했을 경우 【추격 3】
    if (winnerLeaderCards.some((c) => c.code === 'BP01-019') && winCard.color === 'GREEN') {
      officialPursuit += 3;
    }
    // 산화 Lv.2 [BP01-031] 리더 판정: 자신이 청색 카드로 승리했을 경우 【추격 3】 및 리더 교체 가능
    if (winnerLeaderCards.some((c) => c.code === 'BP01-031') && winCard.color === 'BLUE') {
      officialPursuit += 3;
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

    // 콤보 금지/봉쇄 스킬 체크
    // BP01-074 승천하는 용 / BP01-061 그늘이와 구름이: 이번 턴에 자신은 콤보를 발동할 수 없다.
    if (winCard.code === 'BP01-074' || winCard.code === 'BP01-061') {
      comboGranted = 0;
      winnerPlayer.comboUnlimited = false;
      newState = addLog(newState, `[${winCard.nameKr} 제약] 이번 턴에 콤보를 발동할 수 없습니다.`, 'SYSTEM', winnerIndex);
    }

    // BP01-058 해금: 상대 패배 시 우세 상태이고 파수인 리더인 경우 상대 콤보 봉쇄
    if (
      loserCard?.code === 'BP01-058' &&
      loserLeaderCards.some((c) => c.characterName?.includes('파수인') || c.nameKr?.includes('파수인'))
    ) {
      comboGranted = 0;
      winnerPlayer.comboUnlimited = false;
      newState = addLog(newState, `[해금 BP01-058 우세 효과] 상대 파수인의 효과로 연격이 봉쇄되었습니다!`, 'SYSTEM', winnerIndex);
    }

    winnerPlayer.comboCount = comboGranted;

    winnerPlayer.comboCount = comboGranted;
  }

  // 5. 패배자 효과 처리 (SD01-010 패배 회수 및 캐릭터 Lv.1 패시브 효과)
  if (winnerIndex !== -1) {
    const loserIndex = (winnerIndex === 0 ? 1 : 0) as 0 | 1;
    const loserPlayer = loserIndex === 0 ? p0 : p1;
    const loserCard = loserIndex === 0 ? c0 : c1;
    const winnerCard = winnerIndex === 0 ? c0 : c1;

    // SD01-010 투쟁의 마음: 청색 카드에 패배 시 패로 회수
    if (loserCard?.code === 'SD01-010' && winnerCard?.color === 'BLUE') {
      loserPlayer.dropZone = loserPlayer.dropZone.filter((c) => c.id !== loserCard.id);
      loserPlayer.hand.push(loserCard);
      newState = addLog(newState, `[투쟁의 마음 SD01-010 효과] 청색 카드에 패배하여 패로 회수했습니다!`, 'ACTION', loserIndex);
    }

    // 캐릭터 Lv.1 역경 패시브: 상성 패배 시 덱 위 1장 패 보충
    const isRoverDefeat =
      slotHasCharacterSkill(loserPlayer.slots.leader, '방랑자', 1) &&
      loserCard?.color === 'GREEN' &&
      winnerCard?.color === 'RED';
    const isYangyangDefeat =
      slotHasCharacterSkill(loserPlayer.slots.leader, '양양', 1) &&
      loserCard?.color === 'BLUE' &&
      winnerCard?.color === 'GREEN';
    const isChixiaDefeat =
      slotHasCharacterSkill(loserPlayer.slots.leader, '치샤', 1) &&
      loserCard?.color === 'RED' &&
      winnerCard?.color === 'BLUE';
    const isSanhuaDefeat =
      slotHasCharacterSkill(loserPlayer.slots.leader, '산화', 1) &&
      loserCard?.color === 'BLUE' &&
      winnerCard?.color === 'GREEN';
    const isJinhsiDefeat =
      slotHasCharacterSkill(loserPlayer.slots.leader, '금희', 1) &&
      loserCard?.color === 'RED' &&
      winnerCard?.color === 'BLUE';
    const isCamellyaDefeat =
      slotHasCharacterSkill(loserPlayer.slots.leader, '카멜리아', 1) &&
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
          loserPlayer.hand.push(...revealed);
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
  if (!player.comboUnlimited && player.comboCount <= 0) return false;
  return player.hand.some((c) => {
    if (c.color !== 'RED') return false;
    const effectiveCost = getAllCardsInSlot(player.slots.leader).some(
      (ch) => ch.characterName === '금희' && ch.level >= 1
    )
      ? Math.max(0, c.cost - 1)
      : c.cost;
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
    // 연격 권한 없음 -> 연격 플래그 리셋 후 패 초과 체크 및 턴 종료
    p0.comboCount = 0;
    p0.comboUnlimited = false;
    p1.comboCount = 0;
    p1.comboUnlimited = false;
    newState.players = [p0, p1];
    return checkHandOverflowOrEndTurn(newState);
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
  discardForBonusDmgId?: string
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

  // 전용 카드 조건 검증
  const cardUsage = canPlayerUseActionCard(player.slots, card);
  if (!cardUsage.canUse) {
    return {
      success: false,
      newState: state,
      error: cardUsage.reason || '이 카드는 사용할 수 없습니다.',
    };
  }

  // 금희 Lv.1: 연격 단계 적색 카드 비용 1 감소 (최소 0)
  let effectiveCost = card.cost;
  if (getAllCardsInSlot(player.slots.leader).some((c) => c.characterName === '금희' && c.level >= 1)) {
    effectiveCost = Math.max(0, effectiveCost - 1);
  }

  if (player.concertoZone.length < effectiveCost) {
    return {
      success: false,
      newState: state,
      error: `비용이 부족합니다 (필요 협주: ${effectiveCost}, 보유: ${player.concertoZone.length}).`,
    };
  }

  // 비용 지불: spentConcertoIds 우선 소모
  if (effectiveCost > 0) {
    let spentCards: ActionCard[] = [];
    if (spentConcertoIds && spentConcertoIds.length === effectiveCost) {
      const remaining: ActionCard[] = [];
      for (const c of player.concertoZone) {
        if (spentConcertoIds.includes(c.id) && spentCards.length < effectiveCost) {
          spentCards.push(c);
        } else {
          remaining.push(c);
        }
      }
      player.concertoZone = remaining;
    } else {
      spentCards = player.concertoZone.splice(0, effectiveCost);
    }
    player.dropZone.push(...spentCards);
  }

  // 패에서 액션 에리어로 배치 (공식 룰 604.1.3.2)
  player.hand = player.hand.filter((c) => c.id !== cardId);
  player.actionArea = [...(player.actionArea || []), card];

  // 콤보 횟수 차감: 무제한이 아닐 때만 1회 차감
  if (!player.comboUnlimited) {
    player.comboCount -= 1;
  }

  let newState = { ...state };

  // 연격 카드 특수 효과 & 리더 교체 발동
  // 1. 도약의 불빛 [SD01-009]: 치샤로 교체 & 데미지 +2
  if (card.code === 'SD01-009') {
    const chixiaSlot = (['leftSupport', 'rightSupport'] as const).find(
      (k) => player.slots[k]?.characterName === '치샤'
    );
    if (chixiaSlot && player.slots[chixiaSlot]) {
      const prevLeader = player.slots.leader;
      player.slots.leader = player.slots[chixiaSlot]!;
      player.slots[chixiaSlot] = prevLeader;
      newState = addLog(
        newState,
        `[도약의 불빛 SD01-009 연격 효과] 리더를 [치샤]로 교체했습니다!`,
        'ACTION',
        playerIndex,
        { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체' }
      );
    }
  }

  // 2. 반룡의 빛 [SD02-009]: 금희로 교체 & 데미지 +2
  if (card.code === 'SD02-009') {
    const jinhsiSlot = (['leftSupport', 'rightSupport'] as const).find(
      (k) => player.slots[k]?.characterName === '금희'
    );
    if (jinhsiSlot && player.slots[jinhsiSlot]) {
      const prevLeader = player.slots.leader;
      player.slots.leader = player.slots[jinhsiSlot]!;
      player.slots[jinhsiSlot] = prevLeader;
      newState = addLog(
        newState,
        `[반룡의 빛 SD02-009 연격 효과] 리더를 [금희]로 교체했습니다!`,
        'ACTION',
        playerIndex,
        { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체' }
      );
    }
  }

  // 3. 팔천의 춘추 [BP01-046]: 리더를 카멜리아로 교체하고, 카멜리아 레벨업!
  if (card.code === 'BP01-046') {
    const camSlot = (['leftSupport', 'rightSupport'] as const).find(
      (k) => player.slots[k]?.characterName === '카멜리아'
    );
    if (camSlot && player.slots[camSlot]) {
      const prevLeader = player.slots.leader;
      player.slots.leader = player.slots[camSlot]!;
      player.slots[camSlot] = prevLeader;
    }
    const targetKey = player.slots.leader.characterName === '카멜리아' ? 'leader' : (camSlot || 'leader');
    const curCam = player.slots[targetKey];
    if (curCam && curCam.characterName === '카멜리아') {
      const nextCam = findEvolutionCard(player.characterDeck, curCam);
      if (nextCam) {
        player.characterDeck = player.characterDeck.filter((c) => c.id !== nextCam.id);
        const prevUnder = curCam.underlyingCards || [];
        player.slots[targetKey] = { ...nextCam, underlyingCards: [...prevUnder, curCam] };
        newState.lastUpgrade = {
          id: `upgrade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          playerIndex,
          playerName: player.name,
          character: { ...nextCam },
          previousLevel: curCam.level as 0 | 1,
          newLevel: nextCam.level as 1 | 2,
          slotName: targetKey,
        };
        // 레벨업/등장 스킬 연계
        newState.players[playerIndex] = player;
        newState = applyCharacterEvolutionSkills(newState, playerIndex, targetKey, nextCam, curCam, false);
        player = { ...newState.players[playerIndex] };
      }
    }
    newState = addLog(
      newState,
      `[팔천의 춘추 BP01-046 연격 효과] 리더를 [카멜리아]로 교체하고 카멜리아를 진화 레벨업시켰습니다!`,
      'ACTION',
      playerIndex,
      { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체&진화' }
    );
  }

  // 4. 계발 [BP01-054]: 리더를 파수인으로 교체하고 생명력 1pt 회복
  if (card.code === 'BP01-054') {
    const shSlot = (['leftSupport', 'rightSupport'] as const).find(
      (k) => player.slots[k]?.characterName === '파수인'
    );
    if (shSlot && player.slots[shSlot]) {
      const prevLeader = player.slots.leader;
      player.slots.leader = player.slots[shSlot]!;
      player.slots[shSlot] = prevLeader;
    }
    player.hp = Math.min(player.maxHp, player.hp + 1);
    newState = addLog(
      newState,
      `[계발 BP01-054 연격 효과] 리더를 [파수인]으로 교체하고 생명력을 +1 회복했습니다! (현재 HP: ${player.hp}/${player.maxHp})`,
      'HEAL',
      playerIndex,
      { cardArt: card.artUrl, cardName: card.nameKr, amount: 1, effectTag: '리더 교체&회복' }
    );
  }

  // 5. 양들의 도움 [BP01-063]: 리더를 앙코로 교체하고 트래시에서 앙코 적색 카드 1장 패에 추가
  if (card.code === 'BP01-063') {
    const ankeSlot = (['leftSupport', 'rightSupport'] as const).find(
      (k) => player.slots[k]?.characterName === '앙코'
    );
    if (ankeSlot && player.slots[ankeSlot]) {
      const prevLeader = player.slots.leader;
      player.slots.leader = player.slots[ankeSlot]!;
      player.slots[ankeSlot] = prevLeader;
    }
    const redAnkeIdx = player.dropZone.findIndex(
      (c) => c.kind === 'ACTION' && (c as ActionCard).characterExclusive === '앙코' && (c as ActionCard).color === 'RED'
    );
    if (redAnkeIdx !== -1) {
      const [reclaimed] = player.dropZone.splice(redAnkeIdx, 1);
      player.hand.push(reclaimed as ActionCard);
    }
    newState = addLog(
      newState,
      `[양들의 도움 BP01-063 연격 효과] 리더를 [앙코]로 교체하고 트래시에서 앙코 적색 카드를 패에 회수했습니다!`,
      'ACTION',
      playerIndex,
      { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체&회수' }
    );
  }

  // 6. 숨결 [SD01-014]: 리더를 양양으로 교체하고 덱 위 1장 협주 에리어에 배치
  if (card.code === 'SD01-014') {
    const yangSlot = (['leftSupport', 'rightSupport'] as const).find(
      (k) => player.slots[k]?.characterName === '양양'
    );
    if (yangSlot && player.slots[yangSlot]) {
      const prevLeader = player.slots.leader;
      player.slots.leader = player.slots[yangSlot]!;
      player.slots[yangSlot] = prevLeader;
    }
    const charged = drawSingleCardFromDeck(player);
    if (charged) player.concertoZone.push(charged);
    newState = addLog(
      newState,
      `[숨결 SD01-014 연격 효과] 리더를 [양양]으로 교체하고 협주 에너지 1장을 충전했습니다!`,
      'ACTION',
      playerIndex,
      { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체&충전' }
    );
  }

  // 7. 차가운 눈꽃 [SD02-014]: 리더를 산화로 교체하고 덱 위 1장 협주 에리어에 배치
  if (card.code === 'SD02-014') {
    const sanSlot = (['leftSupport', 'rightSupport'] as const).find(
      (k) => player.slots[k]?.characterName === '산화'
    );
    if (sanSlot && player.slots[sanSlot]) {
      const prevLeader = player.slots.leader;
      player.slots.leader = player.slots[sanSlot]!;
      player.slots[sanSlot] = prevLeader;
    }
    const charged = drawSingleCardFromDeck(player);
    if (charged) player.concertoZone.push(charged);
    newState = addLog(
      newState,
      `[차가운 눈꽃 SD02-014 연격 효과] 리더를 [산화]로 교체하고 협주 에너지 1장을 충전했습니다!`,
      'ACTION',
      playerIndex,
      { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체&충전' }
    );
  }

  // 8. 진동 소리 [SD01-019 / SD02-019]: 리더를 방랑자로 교체하고 카드 1장 드로우
  if (card.code === 'SD01-019' || card.code === 'SD02-019') {
    const isFemale = card.code === 'SD01-019';
    const roverSlot = (['leftSupport', 'rightSupport'] as const).find((k) => {
      const ch = player.slots[k];
      if (!ch) return false;
      return isFemale
        ? ch.nameKr.includes('방랑자(여)') || ch.characterName.includes('방랑자(여)')
        : ch.nameKr.includes('방랑자(남)') || ch.characterName.includes('방랑자(남)');
    });
    if (roverSlot && player.slots[roverSlot]) {
      const prevLeader = player.slots.leader;
      player.slots.leader = player.slots[roverSlot]!;
      player.slots[roverSlot] = prevLeader;
    }
    const drawn = drawSingleCardFromDeck(player);
    if (drawn) player.hand.push(drawn);
    newState = addLog(
      newState,
      `[진동 소리 연격 효과] 리더를 [방랑자]로 교체하고 카드 1장을 드로우했습니다!`,
      'ACTION',
      playerIndex,
      { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '리더 교체&드로우' }
    );
  }

  // 9. 복성재우 [BP01-071]: 덱 위 1장 협주 에리어에 배치
  if (card.code === 'BP01-071') {
    const charged = drawSingleCardFromDeck(player);
    if (charged) player.concertoZone.push(charged);
    newState = addLog(
      newState,
      `[복성재우 BP01-071 연격 효과] 협주 에너지 1장을 충전했습니다!`,
      'ACTION',
      playerIndex,
      { cardArt: card.artUrl, cardName: card.nameKr, effectTag: '협주 충전' }
    );
  }

  // 대미지 계산
  let dmg = card.damage;

  // 도약의 불빛 [SD01-009] / 반룡의 빛 [SD02-009]: 리더 교체 시 데미지 +2
  if (card.code === 'SD01-009' || card.code === 'SD02-009') {
    dmg += 2;
  }

  // SD02-011 만물의 정화: 액션 에리어에 카드가 3장 이상 있을 경우 데미지 +3
  if (card.code === 'SD02-011' && (player.actionArea?.length || 0) >= 3) {
    dmg += 3;
  }

  // BP01-050 넝쿨의 춤: 액션 에리어에 일반 공격 카드가 2장 이상 있을 경우 데미지 +1
  if (card.code === 'BP01-050') {
    const normalAttackCount = (player.actionArea || []).filter(
      (c) => c.nameKr.includes('일반 공격') || c.nameKr.includes('기본 공격')
    ).length;
    if (normalAttackCount >= 2) {
      dmg += 1;
    }
  }

  // BP01-065 / BP01-067 소리의 변화·강공격: 패 1장 버리고 데미지 +1
  if (card.code === 'BP01-065' || card.code === 'BP01-067') {
    if (player.isAi && player.hand.length > 0) {
      const discarded = player.hand.pop();
      if (discarded) {
        player.dropZone.push(discarded);
        dmg += 1;
        newState = addLog(newState, `[${card.nameKr} 콤보 효과] 패 1장을 버리고 데미지가 +1 증가했습니다!`, 'ACTION', playerIndex);
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
  const oppLeaderCards = getAllCardsInSlot(opponent.slots.leader);

  // 금희 Lv.2 [SD02-005] 리더: 적색 카드가 『【콤보】이 카드의 데미지 +1.』 획득
  if (leaderCards.some((c) => c.code === 'SD02-005') && card.color === 'RED') {
    dmg += 1;
  }

  // 치샤 Lv.2 [SD01-005]: 자신의 【리더 스킬】을 가진 【치샤】의 카드 데미지 +3 (필드 어디든 유효)
  const hasChixiaSd01005 = hasActiveCharacterSkill(player, (info) =>
    getAllCardsInSlot(info.card).some((c) => c.code === 'SD01-005')
  );
  if (hasChixiaSd01005 && card.characterExclusive?.includes('치샤') && isLeaderSkillCard(card)) {
    dmg += 3;
  }

  // 앙코 Lv.2 [BP01-011]: 자신의 【앙코】 적색 카드 데미지 +1 (필드 어디든 유효)
  const hasAnkeBp01011 = hasActiveCharacterSkill(player, (info) =>
    getAllCardsInSlot(info.card).some((c) => c.code === 'BP01-011')
  );
  if (hasAnkeBp01011 && card.characterExclusive?.includes('앙코') && card.color === 'RED') {
    dmg += 1;
  }

  // 카멜리아 Lv.2 [BP01-001] 리더: 자신의 【카멜리아】 적색 카드 데미지 +1
  if (leaderCards.some((c) => c.code === 'BP01-001') && card.characterExclusive?.includes('카멜리아') && card.color === 'RED') {
    dmg += 1;
  }

  // 피격자 데미지 보정 (상대 리더가 카멜리아 Lv.2 [BP01-001]인 경우 피격 데미지 +1)
  if (oppLeaderCards.some((c) => c.code === 'BP01-001')) {
    dmg += 1;
  }

  opponent.hp = Math.max(0, opponent.hp - dmg);

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
      const cCost = getAllCardsInSlot(player.slots.leader).some((ch) => ch.characterName === '금희' && ch.level >= 1)
        ? Math.max(0, c.cost - 1)
        : c.cost;
      return player.concertoZone.length >= cCost && canPlayerUseActionCard(player.slots, c).canUse;
    });

  if (!canStillCombo) {
    if (player.isAi) {
      newState = addLog(
        newState,
        `[연격 단계 완료] ${player.name}이(가) 더 이상 사용할 수 있는 연격 카드가 없어 연격 단계를 종료합니다.`,
        'ACTION',
        playerIndex
      );
      newState = checkHandOverflowOrEndTurn(newState);
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

export function finishComboStep(state: GameState, playerIndex: 0 | 1): GameState {
  let newState: GameState = { ...state, lastComboStrike: null };
  const p = { ...newState.players[playerIndex] };
  const oppIdx = (playerIndex === 0 ? 1 : 0) as 0 | 1;
  const opp = { ...newState.players[oppIdx] };

  // 치샤 Lv.2 [BP01-025] 리더 배틀 종료 효과: 액션 에리어에 기본 공격 2장 이상 시 상대에게 3pt 피해
  const hasChixiaBp01025 = getAllCardsInSlot(p.slots.leader).some((c) => c.code === 'BP01-025');
  const normalAttacksInAction = (p.actionArea || []).filter(
    (c) => c.nameKr.includes('기본 공격') || c.nameKr.includes('일반 공격')
  ).length;
  if (hasChixiaBp01025 && normalAttacksInAction >= 2) {
    opp.hp = Math.max(0, opp.hp - 3);
    newState.players[oppIdx] = opp;
    newState = addLog(
      newState,
      `[치샤 Lv.2 BP01-025 배틀 종료 효과] 액션 에리어에 기본 공격 카드가 ${normalAttacksInAction}장 있어 상대에게 3pt 추가 피해를 입혔습니다!`,
      'DAMAGE',
      playerIndex,
      { amount: 3, effectTag: '배틀 종료 피해' }
    );
  }

  p.comboCount = 0;
  p.comboUnlimited = false;
  newState.players[playerIndex] = p;
  newState = addLog(newState, `${p.name}이(가) 연격 단계를 마쳤습니다.`, 'ACTION', playerIndex);

  if (opp.hp <= 0) {
    return checkGameOver(newState);
  }

  return checkHandOverflowOrEndTurn(newState);
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
    const lCards = getAllCardsInSlot(pl.slots.leader);

    // 방랑자(남) Lv.2 [SD02-001] 리더: 각 턴 종료 시 카드 1장 드로우
    if (lCards.some((c) => c.code === 'SD02-001')) {
      const drawn = drawSingleCardFromDeck(pl);
      if (drawn) {
        pl.hand.push(drawn);
        newState = addLog(newState, `[방랑자(남) Lv.2 턴 종료 효과] 덱에서 카드 1장을 드로우했습니다.`, 'ACTION', i as 0 | 1);
      }
    }

    // 산화 Lv.2 [SD02-003] 리더: 각 턴 종료 시 덱 위 1장 협주 에리어에 배치
    if (lCards.some((c) => c.code === 'SD02-003')) {
      const charged = drawSingleCardFromDeck(pl);
      if (charged) {
        pl.concertoZone.push(charged);
        newState = addLog(newState, `[산화 Lv.2 턴 종료 효과] 협주 에너지 1장을 충전했습니다.`, 'ACTION', i as 0 | 1);
      }
    }

    // 앙코 Lv.2 [BP01-012] 리더: 이번 턴에 상대가 데미지를 받은 경우 트래시에서 앙코 카드 1장 패 추가
    if (lCards.some((c) => c.code === 'BP01-012')) {
      const dropIdx = pl.dropZone.findIndex(
        (c) => c.kind === 'ACTION' && (c.characterExclusive?.includes('앙코') || c.nameKr.includes('앙코'))
      );
      if (dropIdx !== -1) {
        const [ankeCard] = pl.dropZone.splice(dropIdx, 1);
        const reclaimed = ankeCard as ActionCard;
        if (!pl.hand.some((h) => h.id === reclaimed.id)) {
          pl.hand.push(reclaimed);
        }
        newState = addLog(newState, `[앙코 Lv.2 턴 종료 효과] 트래시에서 [${reclaimed.nameKr}]을(를) 패에 추가했습니다.`, 'ACTION', i as 0 | 1);
      }
    }
  }

  newState.players = [p0, p1];

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
  const chosenCards: ActionCard[] = [];
  const remainingRevealed = [...revealedCards];
  for (const id of chosenCardIds) {
    if (chosenCards.length >= maxAllowed) break;
    const idx = remainingRevealed.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const [card] = remainingRevealed.splice(idx, 1);
      chosenCards.push(card);
    }
  }
  const unchosenCards = remainingRevealed;

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
  } else if (onResolveType === 'SET_CONCERTO') {
    // 1. 협주 에리어 배치 선택
    // 출처가 트래시(dropZone, 예: 산화 Lv.1)인지 덱(actionDeck, 예: 양양/산화 배틀 효과)인지 명확히 판별
    const isFromDropZone =
      sourceCardName.includes('산화') ||
      player.dropZone.some((c) => revealedCards.some((rc) => rc.id === c.id || rc.code === c.code));

    if (chosenCards.length > 0) {
      for (const chosen of chosenCards) {
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
      player.concertoZone = [...player.concertoZone, ...chosenCards];
    }

    if (!isFromDropZone) {
      // 덱에서 공개되었으나 미선택된 카드는 덱 맨 위에 유지 (덱 깎이지 않음!)
      if (unchosenCards.length > 0) {
        player.actionDeck = [...unchosenCards, ...player.actionDeck];
      }
    }
    // (트래시에서 공개된 미선택 카드는 dropZone에 그대로 유지되며, 덱에 절대 추가되지 않음!)

    if (chosenCards.length > 0) {
      newState.lastEffectEvent = {
        id: `eff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sourceCardName,
        effectType: 'CHARGE',
        title: '협주 에리어 배치 완료',
        description: `[${sourceCardName}] 효과로 카드 ${chosenCards.length}장을 협주 에리어에 배치했습니다!`,
        playerIndex,
        timestamp: Date.now(),
      };
      newState = addLog(
        newState,
        `[${sourceCardName}] ${player.name}이(가) [${chosenCards.map((c) => c.nameKr).join(', ')}]을(를) 협주 에리어에 배치했습니다. (현재 협주: ${player.concertoZone.length})`,
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
    for (const chosen of chosenCards) {
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
  } else {
    // 3. 패에 추가 (ADD_TO_HAND)
    // 선택된 카드를 actionDeck에서 완전히 제거 (중복 드로우 원천 차단)
    player.actionDeck = player.actionDeck.filter((c) => !chosenCards.some((ch) => ch.id === c.id));

    // 손패 고유 ID 중복 방지 가드로 패에 안전 추가
    addCardsToHand(player, chosenCards);

    // 단일 공개 카드(파수인 BP01-010 또는 판정 패배 드로우)인 경우 미선택 시 덱 맨 위에 유지!
    // 다중 공개(방랑자 BP01-018)인 경우 미선택 카드는 덱 맨 아래로
    if (revealedCards.length <= 1) {
      player.actionDeck = [...unchosenCards, ...player.actionDeck];
    } else {
      player.actionDeck = [...player.actionDeck, ...unchosenCards];
    }

    if (chosenCards.length > 0) {
      newState.lastEffectEvent = {
        id: `eff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sourceCardName,
        effectType: 'DRAW',
        title: '카드 패 추가 완료',
        description: `[${sourceCardName}] 효과로 카드 ${chosenCards.length}장을 패에 추가했습니다!`,
        playerIndex,
        timestamp: Date.now(),
      };
    }

    newState = addLog(
      newState,
      `${player.name}이(가) [${sourceCardName}] 효과로 카드 ${chosenCards.length}장을 선택하여 패에 추가했습니다.${
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

  // 1. 큐에 대기 중인 다음 선택 발동 효과가 있다면 순차적으로 표출
  if (newState.pendingChoiceQueue && newState.pendingChoiceQueue.length > 0) {
    const [nextChoice, ...rest] = newState.pendingChoiceQueue;
    newState.pendingChoice = nextChoice;
    newState.pendingChoiceQueue = rest;
    return newState;
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
      return checkHandOverflowOrEndTurn(newState);
    }
  }

  return newState;
}
