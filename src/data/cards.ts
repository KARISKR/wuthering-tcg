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

// 공식 스타터 덱 SD01 액션 카드 40장 목록 (사진 실물 제품 매수 100% 일치)
// 17종: 2장씩 11종 = 22장 + 3장씩 6종 = 18장 -> 총 40장
export const OFFICIAL_SD01_ACTION_CARDS: { code: string; count: number }[] = [
  // 2장 투입 (11종)
  { code: 'SD01-017', count: 2 }, // 소리의 변화·일반 공격 (방랑자(여))
  { code: 'SD01-018', count: 2 }, // 소리의 변화·회피 (방랑자(여))
  { code: 'SD01-021', count: 2 }, // 로프 (방랑자(여))
  { code: 'SD01-022', count: 2 }, // 공명 참격 (방랑자(여))
  { code: 'SD01-012', count: 2 }, // 날카로운 바람·일반 공격 (양양)
  { code: 'SD01-013', count: 2 }, // 날카로운 바람·회피 (양양)
  { code: 'SD01-015', count: 2 }, // 점프 (양양)
  { code: 'SD01-007', count: 2 }, // 펑펑·일반 공격 (치샤)
  { code: 'SD01-008', count: 2 }, // 펑펑·회피 반격 (치샤)
  { code: 'SD01-010', count: 2 }, // 투쟁의 마음 (치샤)
  { code: 'SD01-009', count: 2 }, // 도약의 불빛 (치샤)
  // 3장 투입 (6종)
  { code: 'SD01-019', count: 3 }, // 진동 소리 (방랑자(여))
  { code: 'SD01-020', count: 3 }, // 스캔 (방랑자(여))
  { code: 'SD01-014', count: 3 }, // 숨결 (양양)
  { code: 'SD01-023', count: 3 }, // 울림의 연주 (방랑자(여))
  { code: 'SD01-016', count: 3 }, // 북풍의 소용돌이 (양양)
  { code: 'SD01-011', count: 3 }, // 뜨거운 불길 (치샤)
];

// 공식 스타터 덱 SD02 액션 카드 40장 목록 (사진 실물 제품 매수 100% 일치)
// 17종: 2장씩 11종 = 22장 + 3장씩 6종 = 18장 -> 총 40장
export const OFFICIAL_SD02_ACTION_CARDS: { code: string; count: number }[] = [
  // 2장 투입 (11종)
  { code: 'SD02-017', count: 2 }, // 소리의 변화·일반 공격 (방랑자(남))
  { code: 'SD02-018', count: 2 }, // 소리의 변화·회피 (방랑자(남))
  { code: 'SD02-021', count: 2 }, // 로프 (방랑자(남))
  { code: 'SD02-022', count: 2 }, // 공명 참격 (방랑자(남))
  { code: 'SD02-012', count: 2 }, // 차가운 빛·일반 공격 (산화)
  { code: 'SD02-013', count: 2 }, // 차가운 빛·회피 (산화)
  { code: 'SD02-015', count: 2 }, // 만년적설 (산화)
  { code: 'SD02-007', count: 2 }, // 달빛의 서리·일반 공격 (금희)
  { code: 'SD02-008', count: 2 }, // 달빛의 서리·회피 반격 (금희)
  { code: 'SD02-010', count: 2 }, // 용을 타고 하늘로 향해 (금희)
  { code: 'SD02-009', count: 2 }, // 반룡의 빛 (금희)
  // 3장 투입 (6종)
  { code: 'SD02-019', count: 3 }, // 진동 소리 (방랑자(남))
  { code: 'SD02-020', count: 3 }, // 스캔 (방랑자(남))
  { code: 'SD02-014', count: 3 }, // 차가운 눈꽃 (산화)
  { code: 'SD02-023', count: 3 }, // 울림의 연주 (방랑자(남))
  { code: 'SD02-016', count: 3 }, // 죽음의 눈보라 (산화)
  { code: 'SD02-011', count: 3 }, // 만물의 정화 (금희)
];

// 40장 액션 덱 생성 헬퍼 (공식 실물 덱 구성 100% 매칭)
export function generateStarterActionDeck(deckPresetId: 'STARTER_ROVER' | 'STARTER_CHIXIA'): ActionCard[] {
  const deck: ActionCard[] = [];
  const list = deckPresetId === 'STARTER_ROVER' ? OFFICIAL_SD01_ACTION_CARDS : OFFICIAL_SD02_ACTION_CARDS;
  let counter = 1;

  for (const item of list) {
    const template = ACTION_CARD_TEMPLATES.find((c) => c.code === item.code);
    if (template) {
      for (let i = 0; i < item.count; i++) {
        deck.push({
          ...template,
          id: `deck-${deckPresetId}-${template.code}-${counter++}`,
        });
      }
    }
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
    nameKr: '공식 스타터 덱 SD01 [빛과 그림자의 방랑자] (방랑자(여) / 양양 / 치샤)',
    leader: ALL_CHARACTERS.find((c) => c.code === 'BP01-018') || findChar('방랑자', 0),
    leftSupport: ALL_CHARACTERS.find((c) => c.code === 'BP01-024') || findChar('양양', 0),
    rightSupport: ALL_CHARACTERS.find((c) => c.code === 'BP01-027') || findChar('치샤', 0),
    characterDeck: [
      ALL_CHARACTERS.find((c) => c.code === 'SD01-002')!, // 방랑자(여) Lv.1
      ALL_CHARACTERS.find((c) => c.code === 'SD01-001')!, // 방랑자(여) Lv.2
      ALL_CHARACTERS.find((c) => c.code === 'SD01-004')!, // 양양 Lv.1
      ALL_CHARACTERS.find((c) => c.code === 'SD01-003')!, // 양양 Lv.2
      ALL_CHARACTERS.find((c) => c.code === 'SD01-006')!, // 치샤 Lv.1
      ALL_CHARACTERS.find((c) => c.code === 'SD01-005')!, // 치샤 Lv.2
    ].filter(Boolean),
  },
  STARTER_CHIXIA: {
    id: 'STARTER_CHIXIA',
    nameKr: '공식 스타터 덱 SD02 [하늘을 가르는 서리] (방랑자(남) / 산화 / 금희)',
    leader: ALL_CHARACTERS.find((c) => c.code === 'BP01-021') || findChar('방랑자(남)', 0),
    leftSupport: ALL_CHARACTERS.find((c) => c.code === 'BP01-033') || findChar('산화', 0),
    rightSupport: ALL_CHARACTERS.find((c) => c.code === 'BP01-030') || findChar('금희', 0),
    characterDeck: [
      ALL_CHARACTERS.find((c) => c.code === 'SD02-002')!, // 방랑자(남) Lv.1
      ALL_CHARACTERS.find((c) => c.code === 'SD02-001')!, // 방랑자(남) Lv.2
      ALL_CHARACTERS.find((c) => c.code === 'SD02-004')!, // 산화 Lv.1
      ALL_CHARACTERS.find((c) => c.code === 'SD02-003')!, // 산화 Lv.2
      ALL_CHARACTERS.find((c) => c.code === 'SD02-006')!, // 금희 Lv.1
      ALL_CHARACTERS.find((c) => c.code === 'SD02-005')!, // 금희 Lv.2
    ].filter(Boolean),
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
