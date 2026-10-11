import { DeckPreset, SharedDeck } from '../types/tcg';

// mc.sldark.com 실물 100% 동기화 커뮤니티 인기 실전 덱 프리셋 4종
export const COMMUNITY_DECK_PRESETS: DeckPreset[] = [
  {
    id: 'preset-sld-rin',
    name: '🔥 RIN (카멜리아 · 앙코 · 양양)',
    description: 'mc.sldark.com 공유 덱 [코드: SLD-TLL2EZT6] - 카멜리아 소멸 연격 & 앙코 용융 속공 콤보',
    isOfficial: false,
    createdAt: '2026-03-28',
    externalCode: 'SLD-TLL2EZT6',
    leaderCode: 'BP01-005', // 카멜리아 Lv.0
    leftSupportCode: 'BP01-015', // 앙코 Lv.0
    rightSupportCode: 'BP01-024', // 양양 Lv.0
    actionCards: [
      { code: 'BP01-044', count: 3 },
      { code: 'BP01-045', count: 3 },
      { code: 'BP01-046', count: 2 },
      { code: 'BP01-048', count: 2 },
      { code: 'BP01-049', count: 1 },
      { code: 'BP01-050', count: 3 },
      { code: 'BP01-059', count: 3 },
      { code: 'BP01-060', count: 3 },
      { code: 'BP01-062', count: 3 },
      { code: 'BP01-063', count: 2 },
      { code: 'BP01-064', count: 3 },
      { code: 'BP01-069', count: 3 },
      { code: 'BP01-070', count: 2 },
      { code: 'SD01-013', count: 3 },
      { code: 'SD01-014', count: 1 },
      { code: 'SD01-015', count: 3 },
    ],
  },
  {
    id: 'preset-sld-nv-yang-chun',
    name: '🌸 女秧椿 (카멜리아 · 여랑자 · 양양)',
    description: 'mc.sldark.com 공유 덱 [코드: SLD-7LKN8P9G] - 방랑자(여)·양양 기류 회전 & 카멜리아 소멸 연격',
    isOfficial: false,
    createdAt: '2026-03-28',
    externalCode: 'SLD-7LKN8P9G',
    leaderCode: 'BP01-005', // 카멜리아 Lv.0
    leftSupportCode: 'BP01-018', // 방랑자(여) Lv.0
    rightSupportCode: 'BP01-024', // 양양 Lv.0
    actionCards: [
      { code: 'BP01-044', count: 3 },
      { code: 'BP01-045', count: 2 },
      { code: 'BP01-046', count: 3 },
      { code: 'BP01-048', count: 3 },
      { code: 'BP01-049', count: 2 },
      { code: 'BP01-050', count: 3 },
      { code: 'BP01-051', count: 3 },
      { code: 'SD01-019', count: 2 },
      { code: 'SD01-020', count: 2 },
      { code: 'SD01-021', count: 3 },
      { code: 'SD01-022', count: 2 },
      { code: 'BP01-069', count: 2 },
      { code: 'BP01-070', count: 3 },
      { code: 'SD01-013', count: 2 },
      { code: 'SD01-014', count: 2 },
      { code: 'SD01-015', count: 3 },
    ],
  },
  {
    id: 'preset-sld-anke-loop',
    name: '🐑 安克loop (앙코 · 양양 · 산화)',
    description: 'mc.sldark.com 공유 덱 [코드: SLD-DVQMKQPG] - 앙코 폭주 & 산화 응결 방어 순환 루프',
    isOfficial: false,
    createdAt: '2026-03-28',
    externalCode: 'SLD-DVQMKQPG',
    leaderCode: 'BP01-015', // 앙코 Lv.0
    leftSupportCode: 'BP01-024', // 양양 Lv.0
    rightSupportCode: 'BP01-033', // 산화 Lv.0
    actionCards: [
      { code: 'BP01-059', count: 1 },
      { code: 'BP01-060', count: 3 },
      { code: 'BP01-062', count: 3 },
      { code: 'BP01-063', count: 3 },
      { code: 'BP01-064', count: 3 },
      { code: 'BP01-069', count: 3 },
      { code: 'BP01-071', count: 3 },
      { code: 'SD01-013', count: 3 },
      { code: 'SD01-014', count: 3 },
      { code: 'SD01-015', count: 3 },
      { code: 'BP01-076', count: 3 },
      { code: 'SD02-013', count: 3 },
      { code: 'SD02-014', count: 3 },
      { code: 'SD02-015', count: 3 },
    ],
  },
  {
    id: 'preset-sld-an-san-shou',
    name: '🌌 安散守 (파수인 · 앙코 · 양양)',
    description: 'mc.sldark.com 공유 덱 [코드: SLD-DV56VXTG] - 파수인 회절 서포트 & 앙코 용융 화력 제어',
    isOfficial: false,
    createdAt: '2026-03-28',
    externalCode: 'SLD-DV56VXTG',
    leaderCode: 'BP01-010', // 파수인 Lv.0
    leftSupportCode: 'BP01-015', // 앙코 Lv.0
    rightSupportCode: 'BP01-024', // 양양 Lv.0
    actionCards: [
      { code: 'BP01-053', count: 1 },
      { code: 'BP01-054', count: 3 },
      { code: 'BP01-056', count: 2 },
      { code: 'BP01-057', count: 3 },
      { code: 'BP01-058', count: 2 },
      { code: 'BP01-059', count: 2 },
      { code: 'BP01-060', count: 3 },
      { code: 'BP01-061', count: 2 },
      { code: 'BP01-062', count: 3 },
      { code: 'BP01-063', count: 2 },
      { code: 'BP01-064', count: 3 },
      { code: 'BP01-069', count: 2 },
      { code: 'BP01-070', count: 2 },
      { code: 'SD01-012', count: 3 },
      { code: 'SD01-013', count: 2 },
      { code: 'SD01-014', count: 3 },
      { code: 'SD01-015', count: 2 },
    ],
  },
];

// 기본 제공 커뮤니티 공유 덱 4종
export const INITIAL_COMMUNITY_SHARED_DECKS: SharedDeck[] = [
  {
    id: 'shared-deck-sld-rin',
    deckName: '🔥 RIN (카멜리아 · 앙코 · 양양)',
    authorName: 'RIN',
    isAnonymous: false,
    description:
      'mc.sldark.com 커뮤니티 공유 덱 [코드: SLD-TLL2EZT6] - 카멜리아 소멸 연격과 앙코 용융 속공, 양양 기류 서포트 콤보 덱',
    deckCode: 'SLD-TLL2EZT6',
    deckPreset: COMMUNITY_DECK_PRESETS[0],
    likes: 0,
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    tags: ['카멜리아', '앙코', '양양', '용융', '소멸', '기류', '속공', 'sldark'],
  },
  {
    id: 'shared-deck-sld-nv-yang-chun',
    deckName: '🌸 女秧椿 (카멜리아 · 여랑자 · 양양)',
    authorName: 'sldark 유저',
    isAnonymous: false,
    description:
      'mc.sldark.com 커뮤니티 공유 덱 [코드: SLD-7LKN8P9G] - 방랑자(여)와 양양의 기류 순환으로 카멜리아의 소멸 연격을 몰아치는 연계 덱',
    deckCode: 'SLD-7LKN8P9G',
    deckPreset: COMMUNITY_DECK_PRESETS[1],
    likes: 0,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    tags: ['카멜리아', '방랑자(여)', '양양', '소멸', '기류', '회절', '콤보', 'sldark'],
  },
  {
    id: 'shared-deck-sld-anke-loop',
    deckName: '🐑 安克loop (앙코 · 양양 · 산화)',
    authorName: 'sldark 유저',
    isAnonymous: false,
    description:
      'mc.sldark.com 커뮤니티 공유 덱 [코드: SLD-DVQMKQPG] - 앙코 대폭주 화력과 산화 응결 방어, 양양 서포트로 매 턴 회피 및 연격을 이어가는 루프 덱',
    deckCode: 'SLD-DVQMKQPG',
    deckPreset: COMMUNITY_DECK_PRESETS[2],
    likes: 0,
    createdAt: Date.now() - 1000 * 60 * 60 * 36,
    tags: ['앙코', '양양', '산화', '용융', '응결', '기류', '콤보', 'sldark'],
  },
  {
    id: 'shared-deck-sld-an-san-shou',
    deckName: '🌌 安散守 (파수인 · 앙코 · 양양)',
    authorName: 'sldark 유저',
    isAnonymous: false,
    description:
      'mc.sldark.com 커뮤니티 공유 덱 [코드: SLD-DV56VXTG] - 파수인의 회절 드로우 및 결말 순환과 앙코 용융 화력을 조합한 안정적인 컨트롤 제어 덱',
    deckCode: 'SLD-DV56VXTG',
    deckPreset: COMMUNITY_DECK_PRESETS[3],
    likes: 0,
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    tags: ['파수인', '앙코', '양양', '회절', '용융', '기류', '컨트롤', 'sldark'],
  },
];
