import { DeckPreset } from '../types/tcg';

// AI 시뮬레이션 기반 최적화 추천 덱 5종
export const AI_RECOMMENDED_DECKS: DeckPreset[] = [
  {
    id: 'preset-ai-rec-1-camellya-anke-otk',
    name: '🤖 [AI 추천] 카멜리아·앙코 홍련의 폭주 OTK',
    description:
      '최고 원턴 폭딜 17pt & 최대 연격 9연타! 양양의 협주 가속과 카멜리아·앙코의 0코스트 일반 공격 연타로 [그늘이의 대폭주]와 [넝쿨의 춤]을 폭발시키는 극공 어그로 콤보 덱',
    isOfficial: false,
    authorName: 'AI 추천덱!',
    createdAt: '2026-10-16',
    leaderCode: 'BP01-005', // 카멜리아 Lv.0
    leftSupportCode: 'BP01-015', // 앙코 Lv.0
    rightSupportCode: 'BP01-024', // 양양 Lv.0
    characterDeckCards: [
      { code: 'BP01-005', count: 1 },
      { code: 'BP01-003', count: 2 },
      { code: 'BP01-001', count: 2 },
      { code: 'BP01-015', count: 1 },
      { code: 'BP01-013', count: 2 },
      { code: 'BP01-011', count: 1 },
      { code: 'BP01-012', count: 1 },
      { code: 'BP01-024', count: 1 },
      { code: 'BP01-023', count: 2 },
      { code: 'SD01-003', count: 1 },
      { code: 'BP01-022', count: 1 },
    ],
    actionCards: [
      { code: 'BP01-044', count: 3 }, // 육성·일반 공격 (0코 적색 속8 뎀1)
      { code: 'BP01-046', count: 3 }, // 팔천의 춘추 (0코 변주 카멜리아 레벨업)
      { code: 'BP01-047', count: 3 }, // 육성·강공격 (0코 적색 승리 시 1드로우)
      { code: 'BP01-048', count: 3 }, // 피어난 동백꽃 (1코 속14 카멜리아 즉시 레벨업)
      { code: 'BP01-050', count: 3 }, // 넝쿨의 춤 (0코 일반공격 2장 시 2뎀)
      { code: 'BP01-051', count: 3 }, // 회전의 춤 (0코 승리 시 1드로우)
      { code: 'BP01-059', count: 3 }, // 그늘이와 구름이 출격·일반 공격 (0코 우세 시 속10)
      { code: 'BP01-060', count: 3 }, // 그늘이와 구름이 출격·강공격 (0코 데미지 시 1드로우)
      { code: 'BP01-062', count: 3 }, // 그늘이의 대폭주 (우세 시 1코 앙코 Lv.2 직행 + 3뎀)
      { code: 'BP01-063', count: 2 }, // 양들의 도움 (0코 변주 트래시 앙코 적색 회수)
      { code: 'BP01-064', count: 2 }, // 앙코 회피 반격 (0코 청색 3뎀)
      { code: 'SD01-014', count: 3 }, // 숨결 (0코 변주 협주 +1 충전)
      { code: 'SD01-015', count: 3 }, // 점프 (0코 체공)
      { code: 'BP01-071', count: 3 }, // 복성재우 (0코 체공 연계 협주 +1 충전)
    ],
  },
  {
    id: 'preset-ai-rec-3-chixia-anke-burn',
    name: '🤖 [AI 추천] 치샤·앙코 더블 용융 기관총 러시',
    description:
      'AI 시뮬레이션 승률 1위(43.8%)! 방랑자(여) Lv.2의 매 턴 자동 드로우 엔진을 백업으로 두고, 치샤 Lv.2(SD01-005 리더스킬 +3뎀 / BP01-025 턴종료 3뎀)와 앙코 폭주를 결합한 초화력 용융 덱',
    isOfficial: false,
    authorName: 'AI 추천덱!',
    createdAt: '2026-10-16',
    leaderCode: 'BP01-027', // 치샤 Lv.0
    leftSupportCode: 'BP01-015', // 앙코 Lv.0
    rightSupportCode: 'BP01-018', // 방랑자(여) Lv.0
    characterDeckCards: [
      { code: 'BP01-027', count: 1 },
      { code: 'BP01-026', count: 1 },
      { code: 'SD01-006', count: 1 },
      { code: 'SD01-005', count: 1 },
      { code: 'BP01-025', count: 1 },
      { code: 'BP01-015', count: 1 },
      { code: 'BP01-013', count: 2 },
      { code: 'BP01-011', count: 1 },
      { code: 'BP01-012', count: 1 },
      { code: 'BP01-018', count: 1 },
      { code: 'BP01-017', count: 2 },
      { code: 'SD01-001', count: 2 },
    ],
    actionCards: [
      { code: 'SD01-007', count: 3 }, // 펑펑·일반 공격 (0코 속9 뎀1)
      { code: 'SD01-009', count: 3 }, // 도약의 불빛 (0코 변주 치샤 +2뎀)
      { code: 'SD01-010', count: 3 }, // 열혈의 불꽃 (1코 속10 3뎀 리더스킬)
      { code: 'BP01-072', count: 3 }, // 억압 (1코 속12 2뎀 + 우세 시 기본공격/해방 회수)
      { code: 'SD01-011', count: 2 }, // 뜨거운 불길 (3코 속12 7뎀 + 치샤 SD01-005 시 10뎀!)
      { code: 'BP01-059', count: 3 }, // 그늘이와 구름이 출격·일반 공격
      { code: 'BP01-060', count: 3 }, // 그늘이와 구름이 출격·강공격
      { code: 'BP01-062', count: 3 }, // 그늘이의 대폭주
      { code: 'BP01-063', count: 2 }, // 양들의 도움
      { code: 'SD01-017', count: 3 }, // 소리의 변화·일반 공격 (0코 속8 뎀1)
      { code: 'BP01-065', count: 3 }, // 소리의 변화·강공격 (0코 패 1장 버리고 2뎀)
      { code: 'BP01-066', count: 3 }, // 소리의 변화·공중 공격 (0코 승리 시 1드로우)
      { code: 'SD01-019', count: 3 }, // 진동 소리 (0코 변주 1드로우)
      { code: 'BP01-034', count: 3 }, // 신호등 로봇 (0코 용융 프리즘 에코)
    ],
  },
  {
    id: 'preset-ai-rec-2-jinhsi-dragon-otk',
    name: '🤖 [AI 추천] 금희·파수인 용의 승천 원턴킬',
    description:
      '[창공의 무지개]로 [용을 타고 하늘로 향해]를 확정 서치해 3드로우 + 추격 8을 켜고, 0코스트 연격 후 [승천하는 용] & [만물의 정화]로 한 턴에 15+ 데미지를 꽂는 회절·응결 원턴킬 덱',
    isOfficial: false,
    authorName: 'AI 추천덱!',
    createdAt: '2026-10-16',
    leaderCode: 'BP01-030', // 금희 Lv.0
    leftSupportCode: 'BP01-010', // 파수인 Lv.0
    rightSupportCode: 'BP01-033', // 산화 Lv.0
    characterDeckCards: [
      { code: 'BP01-030', count: 1 },
      { code: 'BP01-029', count: 2 },
      { code: 'SD02-005', count: 2 },
      { code: 'BP01-010', count: 1 },
      { code: 'BP01-008', count: 2 },
      { code: 'BP01-006', count: 1 },
      { code: 'BP01-007', count: 1 },
      { code: 'BP01-033', count: 1 },
      { code: 'BP01-032', count: 2 },
      { code: 'SD02-003', count: 1 },
      { code: 'BP01-031', count: 1 },
    ],
    actionCards: [
      { code: 'SD02-007', count: 3 }, // 달빛의 서리·일반 공격 (0코 속7 뎀1)
      { code: 'BP01-075', count: 3 }, // 달빛의 서리·강공격 (0코 승리 시 1드로우)
      { code: 'SD02-009', count: 3 }, // 반룡의 빛 (0코 변주 금희 +2뎀)
      { code: 'BP01-073', count: 3 }, // 창공의 무지개 (1코 속13 용을 타고 하늘로 향해 서치)
      { code: 'SD02-010', count: 3 }, // 용을 타고 하늘로 향해 (1코 속13 3드로우 + 추격 8)
      { code: 'BP01-074', count: 3 }, // 승천하는 용 (1코 액션에리어 장수 비례 피니셔)
      { code: 'SD02-011', count: 2 }, // 만물의 정화 (3코 5+3=8뎀 피니셔)
      { code: 'SD02-012', count: 3 }, // 차가운 빛·일반 공격 (0코 속8 뎀1)
      { code: 'SD02-014', count: 3 }, // 차가운 눈꽃 (0코 변주 협주 +1 충전)
      { code: 'SD02-015', count: 3 }, // 만년적설 (1코 속9 3뎀 + 승리 시 협주 +2)
      { code: 'BP01-052', count: 3 }, // 근원의 추구·일반 공격 (0코 적색)
      { code: 'BP01-054', count: 2 }, // 계발 (0코 변주 1힐 + 파수인 드로우)
      { code: 'BP01-055', count: 3 }, // 근원의 추구·강공격 (0코 체력 우위 시 2뎀)
      { code: 'BP01-058', count: 3 }, // 해금 (0코 녹색 2드로우 / 우세 패배 시 상대 콤보 봉쇄)
    ],
  },
  {
    id: 'preset-ai-rec-4-camellya-rover-shorekeeper',
    name: '🤖 [AI 추천] 카멜리아·여랑자·파수인 불멸의 정원',
    description:
      '여랑자 Lv.2 턴 시작 드로우 + 파수인 Lv.2 회복 드로우로 매 턴 패를 7~8장 유지하고, [피어난 동백꽃]과 [결말의 순환](추격 8)으로 끊임없이 몰아치는 무결점 안정형 덱',
    isOfficial: false,
    authorName: 'AI 추천덱!',
    createdAt: '2026-10-16',
    leaderCode: 'BP01-005', // 카멜리아 Lv.0
    leftSupportCode: 'BP01-018', // 방랑자(여) Lv.0
    rightSupportCode: 'BP01-010', // 파수인 Lv.0
    characterDeckCards: [
      { code: 'BP01-005', count: 1 },
      { code: 'BP01-003', count: 2 },
      { code: 'BP01-001', count: 2 },
      { code: 'BP01-018', count: 1 },
      { code: 'BP01-017', count: 2 },
      { code: 'SD01-001', count: 2 },
      { code: 'BP01-010', count: 1 },
      { code: 'BP01-008', count: 2 },
      { code: 'BP01-006', count: 2 },
    ],
    actionCards: [
      { code: 'BP01-044', count: 3 }, // 육성·일반 공격
      { code: 'BP01-046', count: 3 }, // 팔천의 춘추
      { code: 'BP01-047', count: 3 }, // 육성·강공격
      { code: 'BP01-048', count: 3 }, // 피어난 동백꽃
      { code: 'BP01-049', count: 2 }, // 아름다운 결말 (2코 속13 5뎀)
      { code: 'BP01-050', count: 3 }, // 넝쿨의 춤
      { code: 'BP01-051', count: 3 }, // 회전의 춤
      { code: 'SD01-017', count: 3 }, // 소리의 변화·일반 공격
      { code: 'BP01-065', count: 3 }, // 소리의 변화·강공격
      { code: 'BP01-066', count: 3 }, // 소리의 변화·공중 공격
      { code: 'SD01-019', count: 3 }, // 진동 소리 (0코 변주 1드로우)
      { code: 'BP01-054', count: 3 }, // 계발 (0코 변주 1힐 + 파수인 Lv.2 드로우)
      { code: 'BP01-057', count: 2 }, // 결말의 순환 (1코 추격 8 + 1힐 + 변주 드로우)
      { code: 'BP01-058', count: 3 }, // 해금 (0코 2드로우 / 우세 콤보 봉쇄)
    ],
  },
  {
    id: 'preset-ai-rec-5-jinhsi-yangyang-aerial',
    name: '🤖 [AI 추천] 금희·양양·남랑자 창공의 질풍 연격',
    description:
      '<체공>(점프·로프) 직후 [복성재우]와 [숨결]을 연계해 협주 에너지를 턴 도중 즉석 충전하고, 금희의 고코스트 공명 해방과 승천하는 용을 연속 난사하는 기류·회절 공중 콤보 덱',
    isOfficial: false,
    authorName: 'AI 추천덱!',
    createdAt: '2026-10-16',
    leaderCode: 'BP01-030', // 금희 Lv.0
    leftSupportCode: 'BP01-024', // 양양 Lv.0
    rightSupportCode: 'BP01-021', // 방랑자(남) Lv.0
    characterDeckCards: [
      { code: 'BP01-030', count: 1 },
      { code: 'BP01-029', count: 2 },
      { code: 'SD02-005', count: 2 },
      { code: 'BP01-024', count: 1 },
      { code: 'BP01-023', count: 2 },
      { code: 'SD01-003', count: 1 },
      { code: 'BP01-022', count: 1 },
      { code: 'BP01-021', count: 1 },
      { code: 'BP01-020', count: 2 },
      { code: 'SD02-001', count: 2 },
    ],
    actionCards: [
      { code: 'SD02-007', count: 3 }, // 달빛의 서리·일반 공격
      { code: 'BP01-075', count: 3 }, // 달빛의 서리·강공격
      { code: 'SD02-009', count: 3 }, // 반룡의 빛 (0코 변주 금희 +2뎀)
      { code: 'BP01-073', count: 3 }, // 창공의 무지개
      { code: 'SD02-010', count: 3 }, // 용을 타고 하늘로 향해
      { code: 'BP01-074', count: 3 }, // 승천하는 용
      { code: 'SD02-011', count: 2 }, // 만물의 정화
      { code: 'SD01-012', count: 3 }, // 날카로운 바람·일반 공격
      { code: 'SD01-014', count: 3 }, // 숨결 (0코 변주 협주 +1)
      { code: 'SD01-015', count: 3 }, // 점프 (0코 적색 체공)
      { code: 'BP01-071', count: 3 }, // 복성재우 (0코 적색 체공 연계 협주 +1)
      { code: 'SD02-017', count: 3 }, // 소리의 변화·일반 공격
      { code: 'BP01-067', count: 2 }, // 소리의 변화·강공격
      { code: 'SD02-019', count: 3 }, // 진동 소리 (0코 변주 1드로우)
    ],
  },
];
