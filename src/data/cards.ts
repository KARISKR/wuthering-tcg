import { CharacterCard, ActionCard } from '../types/tcg';
import { OFFICIAL_CARDS, OfficialCardData } from './officialCards';

export function getRarityScore(rarity?: string): number {
  if (!rarity) return 0;
  if (rarity === '★★★★★') return 50;
  if (rarity === '★★★★') return 40;
  if (rarity.includes('PR')) return 35;
  if (rarity === '★★★') return 30;
  if (rarity === '★★') return 20;
  if (rarity === '★') return 10;
  return 0;
}

// 공식 데이터베이스에서 캐릭터 카드 추출
export const ALL_CHARACTERS: CharacterCard[] = OFFICIAL_CARDS.filter(
  (c) => c.kind === 'CHARACTER'
).map((c) => ({
  id: c.id,
  kind: 'CHARACTER',
  code: c.code,
  characterName: c.characterName || c.nameKr,
  nameKr: c.nameKr,
  level: (c.level ?? 0) as 0 | 1 | 2,
  element: c.element,
  artUrl: c.artUrl,
  description: c.description,
  leaderSkill: c.description,
  clashSkill: c.description,
  rarity: c.rarity,
}));

// 출전 캐릭터 (Lv.0): 같은 캐릭터 중에서 가장 높은 성급 1장만 추출하여 중복 제거
export const DEDUPED_LV0_CHARACTERS: CharacterCard[] = (() => {
  const lv0s = ALL_CHARACTERS.filter((c) => c.level === 0);
  const map = new Map<string, CharacterCard>();
  lv0s.forEach((c) => {
    const key = c.nameKr;
    const existing = map.get(key);
    if (!existing || getRarityScore(c.rarity) > getRarityScore(existing.rarity)) {
      map.set(key, c);
    }
  });

  // 선호 정렬 순서 (방랑자 -> 양양 -> 치샤 -> 산화 -> 금희 -> 카멜리아 -> 파수인 -> 앙코 등)
  const order = ['방랑자(여)', '방랑자(남)', '양양', '치샤', '산화', '금희', '카멜리아', '파수인', '앙코'];
  return Array.from(map.values()).sort((a, b) => {
    const idxA = order.indexOf(a.nameKr);
    const idxB = order.indexOf(b.nameKr);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.nameKr.localeCompare(b.nameKr);
  });
})();

// 공식 데이터베이스에서 액션 카드 템플릿 추출 (동일 코드 중 가장 높은 성급 1장씩 선별하여 중복 제거: 총 78종)
export const ACTION_CARD_TEMPLATES: ActionCard[] = (() => {
  const actCards = OFFICIAL_CARDS.filter((c) => c.kind === 'ACTION');
  const map = new Map<string, OfficialCardData>();
  actCards.forEach((c) => {
    const existing = map.get(c.code);
    if (!existing || getRarityScore(c.rarity) > getRarityScore(existing.rarity)) {
      map.set(c.code, c);
    }
  });

  return Array.from(map.values()).map((c) => ({
    id: c.id,
    kind: 'ACTION' as const,
    code: c.code,
    nameKr: c.nameKr,
    color: c.color || 'RED',
    cost: c.cost,
    speed: c.speed ?? undefined,
    damage: c.damage,
    pursuitCount: c.pursuitCount ?? undefined,
    characterExclusive: c.characterExclusive ?? undefined,
    description: c.description,
    artUrl: c.artUrl,
    rarity: c.rarity,
  }));
})();

export function getHighestRarityActionCard(code: string): ActionCard | undefined {
  return ACTION_CARD_TEMPLATES.find((c) => c.code === code);
}

// 40장 액션 덱 생성 헬퍼
export function generateStarterActionDeck(deckPresetId: 'STARTER_ROVER' | 'STARTER_CHIXIA'): ActionCard[] {
  const deck: ActionCard[] = [];
  let cardIdCounter = 1;

  // 공식 액션 카드 풀에서 관련 캐릭터 카드 우선 선별
  const targetCharName = deckPresetId === 'STARTER_ROVER' ? '방랑자' : '치샤';

  const relevantActions = ACTION_CARD_TEMPLATES.filter(
    (c) => !c.characterExclusive || c.characterExclusive.includes(targetCharName)
  );

  const fallbackActions = ACTION_CARD_TEMPLATES;

  // 관련 카드 2~3장씩 투입 (총 40장)
  for (const card of relevantActions) {
    const copies = card.cost === 0 ? 3 : 2;
    for (let i = 0; i < copies; i++) {
      if (deck.length >= 40) break;
      deck.push({
        ...card,
        id: `deck-${deckPresetId}-${card.code}-${cardIdCounter++}`,
      });
    }
    if (deck.length >= 40) break;
  }

  // 40장이 채워질 때까지 풀에서 추가
  let fallbackIdx = 0;
  while (deck.length < 40 && fallbackActions.length > 0) {
    const card = fallbackActions[fallbackIdx % fallbackActions.length];
    const currentCount = deck.filter((c) => c.code === card.code).length;
    if (currentCount < 3) {
      deck.push({
        ...card,
        id: `deck-${deckPresetId}-${card.code}-${cardIdCounter++}`,
      });
    }
    fallbackIdx++;
  }

  return shuffleArray(deck);
}

// 덱/캐릭터 프리셋 정의
export interface StarterDeckPreset {
  id: 'STARTER_ROVER' | 'STARTER_CHIXIA';
  nameKr: string;
  leader: CharacterCard;
  leftSupport: CharacterCard;
  rightSupport: CharacterCard;
  characterDeck: CharacterCard[]; // 진화용 Lv.1, Lv.2
}

// 기본 프리셋 캐릭터 찾기 헬퍼 (항상 최고 성급 우선 매칭)
const findChar = (name: string, lvl: number): CharacterCard => {
  if (lvl === 0) {
    const deduped = DEDUPED_LV0_CHARACTERS.find((c) => c.characterName.includes(name) || c.nameKr.includes(name));
    if (deduped) return deduped;
  }
  const matched = ALL_CHARACTERS.filter((c) => (c.characterName.includes(name) || c.nameKr.includes(name)) && c.level === lvl);
  if (matched.length > 0) {
    return matched.reduce((best, curr) => (getRarityScore(curr.rarity) > getRarityScore(best.rarity) ? curr : best));
  }
  return ALL_CHARACTERS[0];
};

export const STARTER_PRESETS: Record<'STARTER_ROVER' | 'STARTER_CHIXIA', StarterDeckPreset> = {
  STARTER_ROVER: {
    id: 'STARTER_ROVER',
    nameKr: '스타터 덱 SD01 [빛과 그림자의 방랑자] (방랑자 / 양양 / 치샤)',
    leader: findChar('방랑자', 0),
    leftSupport: findChar('양양', 0),
    rightSupport: findChar('치샤', 0),
    characterDeck: ALL_CHARACTERS.filter(
      (c) =>
        (c.characterName.includes('방랑자') || c.characterName.includes('양양') || c.characterName.includes('치샤')) &&
        (c.level === 1 || c.level === 2)
    ),
  },
  STARTER_CHIXIA: {
    id: 'STARTER_CHIXIA',
    nameKr: '스타터 덱 SD02 [타오르는 기류의 선율] (치샤 / 금희 / 산화)',
    leader: findChar('치샤', 0),
    leftSupport: findChar('금희', 0),
    rightSupport: findChar('산화', 0),
    characterDeck: ALL_CHARACTERS.filter(
      (c) =>
        (c.characterName.includes('치샤') || c.characterName.includes('금희') || c.characterName.includes('산화')) &&
        (c.level === 1 || c.level === 2)
    ),
  },
};

export function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}
