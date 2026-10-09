const fs = require('fs');
const path = require('path');

const elemMap = {
  '회절': 'SPECTRO',
  '기류': 'AERO',
  '용융': 'FUSION',
  '응결': 'GLACIO',
  '인멸': 'HAVOC',
  '-': 'SPECTRO'
};

const colorMap = {
  '적색': 'RED',
  '청색': 'BLUE',
  '녹색': 'GREEN',
  '-': null
};

const rawCards = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/extracted_cards.json'), 'utf8'));
const existingContent = fs.readFileSync(path.join(__dirname, '../src/data/officialCards.ts'), 'utf8');
const match = existingContent.match(/export const OFFICIAL_CARDS: OfficialCardData\[\] = (\[[\s\S]*?\]);/);
if (!match) {
  console.error('Could not find existing OFFICIAL_CARDS array');
  process.exit(1);
}
const off123 = JSON.parse(match[1]);

// Map existing cards by ID from artUrl
const existingMap = new Map();
off123.forEach(c => {
  const matchId = c.artUrl.match(/_(\d+)\.(?:webp|png)$/);
  if (matchId) existingMap.set(Number(matchId[1]), c);
});

console.log('Existing cards mapped by ID:', existingMap.size);

const all192 = rawCards.map(rc => {
  if (existingMap.has(rc.ID)) {
    return existingMap.get(rc.ID);
  }

  const kind = rc.card_type === 'character' ? 'CHARACTER' : 'ACTION';
  const charName = kind === 'CHARACTER'
    ? rc['카드명'].replace(/\(.*\)/, '').trim()
    : (rc.character_name !== '-' ? rc.character_name : null);

  const charExclusive = kind === 'ACTION'
    ? (rc.character_name !== '-' ? rc.character_name : null)
    : null;

  const levelNum = rc.level !== null && rc.level !== undefined && rc.level !== '-' ? Number(rc.level) : null;
  const speedNum = rc.speed !== null && rc.speed !== undefined && rc.speed !== '-' ? Number(rc.speed) : null;
  const costNum = Number(rc.fee || 0);
  const dmgNum = Number(rc.damage || 0);

  let pursuit = null;
  if (rc.feature_name && rc.feature_name.includes('연격')) {
    const pMatch = rc.feature_name.match(/연격\s*(\d+)/);
    if (pMatch) pursuit = Number(pMatch[1]);
  }

  const desc = rc.info || (kind === 'ACTION' ? `공식 액션 카드 [${rc['카드명']}].` : '');
  const artUrl = '/cards/' + rc['로컬이미지경로'].replace(/\\/g, '/');

  return {
    id: `card-${rc['카드코드']}_${rc.ID}`,
    code: rc['카드코드'],
    nameKr: rc['카드명'],
    kind: kind,
    type_name: rc.type_name,
    characterName: charName || rc['카드명'],
    level: levelNum,
    element: elemMap[rc.attr_name] || 'SPECTRO',
    weaponType: rc.weapon_type_name !== '-' ? rc.weapon_type_name : '-',
    color: colorMap[rc.color_name] || null,
    cost: costNum,
    speed: speedNum,
    damage: dmgNum,
    pursuitCount: pursuit,
    characterExclusive: charExclusive,
    description: desc,
    artUrl: artUrl,
    feature: rc.feature_name || '-',
    rarity: rc.rarity_name,
    obtain: rc.obtain || (rc.rarity_name.includes('PR') ? 'PR' : 'BP01'),
    isOfficial: true
  };
});

console.log('Total cards in new pool:', all192.length);

const outTs = `// 鸣潮: 对决 (Wuthering Waves: Battle TCG)
// 공식 card_database.xlsx 기반 전체 192종 공식 카드 풀 (1성 ~ 5성, PR 전종 수록)

export interface OfficialCardData {
  id: string;
  code: string;
  nameKr: string;
  kind: 'CHARACTER' | 'ACTION';
  type_name: string;
  characterName: string;
  level?: 0 | 1 | 2 | null;
  element: 'GLACIO' | 'FUSION' | 'AERO' | 'SPECTRO' | 'HAVOC';
  weaponType?: string;
  color?: 'RED' | 'GREEN' | 'BLUE' | null;
  cost: number;
  speed?: number | null;
  damage: number;
  pursuitCount?: number | null;
  characterExclusive?: string | null;
  description: string;
  artUrl: string;
  feature?: string;
  rarity?: string;
  obtain?: string | null;
  isOfficial: boolean;
}

export const OFFICIAL_CARDS: OfficialCardData[] = ${JSON.stringify(all192, null, 2)};

export function getOfficialCardByCode(code: string): OfficialCardData | undefined {
  return OFFICIAL_CARDS.find((c) => c.code === code);
}
`;

fs.writeFileSync(path.join(__dirname, '../src/data/officialCards.ts'), outTs, 'utf8');
console.log('Successfully wrote src/data/officialCards.ts with', all192.length, 'cards!');

