import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  selectStartingLeader,
  decideAiStartingLeader,
  executeMulligan,
  executeDrawPhase,
  setClashCard,
  resolveClash,
  resolvePendingChoice,
  proceedAfterClashReveal,
  executeEndPhase,
  finalizeEndPhase,
} from '../src/engine/gameEngine';
import {
  decideAiMulligan,
  runAiActionPhase,
  selectAiClashCard,
  runAiComboStep,
  runAiDiscardOverflow,
  AiLevel,
} from '../src/engine/aiPlayer';
import { ALL_CHARACTERS, ACTION_CARD_TEMPLATES } from '../src/data/cards';
import { COMMUNITY_DECK_PRESETS } from '../src/data/communityDecks';
import type { CustomDeckConfig, CharacterCard, ActionCard, GameState, DeckPreset } from '../src/types/tcg';

function buildDeck(
  id: string,
  name: string,
  leaderCode: string,
  leftCode: string,
  rightCode: string,
  charEvolutionCodes: string[],
  actionCounts: Record<string, number>
): CustomDeckConfig & { id: string; name: string } {
  const findChar = (code: string): CharacterCard => {
    const found = ALL_CHARACTERS.find((c) => c.code === code);
    if (!found) throw new Error(`Unknown character card code: ${code}`);
    return { ...found };
  };
  const findAction = (code: string): ActionCard => {
    const found = ACTION_CARD_TEMPLATES.find((c) => c.code === code);
    if (!found) throw new Error(`Unknown action card code: ${code}`);
    return { ...found };
  };

  const leader = { ...findChar(leaderCode), id: `${id}-leader-${leaderCode}` };
  const leftSupport = { ...findChar(leftCode), id: `${id}-left-${leftCode}` };
  const rightSupport = { ...findChar(rightCode), id: `${id}-right-${rightCode}` };
  const characterDeck: CharacterCard[] = [
    leader,
    leftSupport,
    rightSupport,
    ...charEvolutionCodes.map((code, idx) => ({ ...findChar(code), id: `${id}-evo-${idx}-${code}` })),
  ];
  const actionCards: ActionCard[] = [];
  for (const [code, count] of Object.entries(actionCounts)) {
    const base = findAction(code);
    for (let i = 0; i < count; i++) {
      actionCards.push({ ...base, id: `${id}-act-${code}-${i}` });
    }
  }
  if (actionCards.length !== 40) {
    throw new Error(`Deck ${name} has ${actionCards.length} action cards (expected 40)`);
  }

  return {
    id,
    name,
    leader,
    leftSupport,
    rightSupport,
    characterDeck,
    actionCards,
  };
}

// ============================================================================
// 서버 공유 입상 덱 4종 (원본 vs 신카드 TP01 튜닝 버전) + 커뮤니티 입상덱 SLD
// ============================================================================

// 1. 공유덱 1: 방랑자(여) / 파수인 / 양양
const SHARED_1_BASE_CHARS = [
  'SD01-001', 'SD01-001', 'SD01-002', 'SD01-002', 'BP01-016', 'BP01-017',
  'BP01-006', 'BP01-007', 'BP01-008', 'BP01-008', 'BP01-009',
  'BP01-022', 'BP01-023', 'BP01-023',
];
const SHARED_1_ORIG_ACTIONS: Record<string, number> = {
  'BP01-053': 2, 'BP01-054': 3, 'BP01-055': 1, 'BP01-056': 2, 'BP01-057': 3, 'BP01-058': 1,
  'BP01-065': 1, 'BP01-066': 1, 'BP01-069': 2, 'BP01-070': 2,
  'SD01-013': 2, 'SD01-014': 2, 'SD01-015': 2, 'SD01-016': 1, 'SD01-017': 3,
  'SD01-018': 2, 'SD01-019': 3, 'SD01-020': 3, 'SD01-021': 1, 'SD01-022': 1, 'SD01-023': 2,
};
// 신카드 튜닝: 0코스트 주력 연격기(BP01-055, BP01-065)와 청색 카운터(SD01-021/022)를 모두 보존하고,
// 복성재우 없이 들어가 있던 점프(SD01-015×1) 및 저속 북풍(SD01-016×1) 2장만 빼고 TP01-001(연역)×1, TP01-004(공명 촉진제)×1 투입
const SHARED_1_TP01_ACTIONS: Record<string, number> = {
  'BP01-053': 2, 'BP01-054': 3, 'BP01-055': 1, 'BP01-056': 2, 'BP01-057': 3, 'BP01-058': 1,
  'BP01-065': 1, 'BP01-066': 1, 'BP01-069': 2, 'BP01-070': 2,
  'SD01-013': 2, 'SD01-014': 2, 'SD01-015': 1, 'SD01-017': 3,
  'SD01-018': 2, 'SD01-019': 3, 'SD01-020': 3, 'SD01-021': 1, 'SD01-022': 1, 'SD01-023': 2,
  'TP01-001': 1, 'TP01-004': 1,
};

// 2. 공유덱 2: 카멜리아 / 방랑자(남) / 산화
const SHARED_2_BASE_CHARS = [
  'BP01-001', 'BP01-001', 'BP01-002', 'BP01-003', 'BP01-003', 'BP01-004',
  'BP01-019', 'BP01-020', 'BP01-020',
  'BP01-031', 'BP01-031', 'BP01-032', 'BP01-032', 'SD02-003',
];
const SHARED_2_ORIG_ACTIONS: Record<string, number> = {
  'BP01-044': 3, 'BP01-045': 3, 'BP01-049': 3, 'BP01-051': 1, 'BP01-076': 3,
  'SD02-013': 3, 'SD02-014': 3, 'SD02-015': 3, 'SD02-016': 3, 'SD02-019': 3,
  'SD02-020': 3, 'SD02-021': 3, 'SD02-022': 3, 'SD02-023': 3,
};
// 신카드 튜닝: SD02-021/022/023 및 BP01-045 핵심 카드 보존, 바닐라 일반공격(BP01-049×2) 및 중복 유틸(SD02-016×1, SD02-020×1) 4장 빼고
// TP01-002(타오르는 넝쿨의 춤)×1 + BP01-050(넝쿨의 춤)×1 + BP01-048(피어난 동백꽃)×1 + TP01-004(공명 촉진제)×1 투입
const SHARED_2_TP01_ACTIONS: Record<string, number> = {
  'BP01-044': 3, 'BP01-045': 3, 'BP01-048': 1, 'BP01-049': 1, 'BP01-050': 1, 'BP01-051': 1, 'BP01-076': 3,
  'SD02-013': 3, 'SD02-014': 3, 'SD02-015': 3, 'SD02-016': 2, 'SD02-019': 3,
  'SD02-020': 2, 'SD02-021': 3, 'SD02-022': 3, 'SD02-023': 3,
  'TP01-002': 1, 'TP01-004': 1,
};

// 3. 공유덱 3: 방랑자(남) / 금희 / 산화
const SHARED_3_BASE_CHARS = [
  'BP01-019', 'BP01-019', 'BP01-020', 'BP01-020',
  'BP01-028', 'BP01-029', 'BP01-029', 'SD02-005', 'SD02-005', 'SD02-006',
  'BP01-031', 'BP01-031', 'BP01-032', 'BP01-032',
];
const SHARED_3_ORIG_ACTIONS: Record<string, number> = {
  'BP01-067': 2, 'BP01-073': 2, 'BP01-074': 2, 'BP01-075': 1, 'BP01-076': 3,
  'SD02-008': 3, 'SD02-009': 2, 'SD02-010': 2, 'SD02-011': 2, 'SD02-013': 3,
  'SD02-014': 2, 'SD02-016': 2, 'SD02-017': 2, 'SD02-019': 2, 'SD02-020': 3,
  'SD02-021': 3, 'SD02-022': 2, 'SD02-023': 2,
};
// 신카드 튜닝: 핵심 방어/힐(SD02-016×2, SD02-023×2) 보존, 저효율 단발(BP01-075×1)만 빼고 TP01-004(공명 촉진제)×1 투입
const SHARED_3_TP01_ACTIONS: Record<string, number> = {
  'BP01-067': 2, 'BP01-073': 2, 'BP01-074': 2, 'BP01-076': 3,
  'SD02-008': 3, 'SD02-009': 2, 'SD02-010': 2, 'SD02-011': 2, 'SD02-013': 3,
  'SD02-014': 2, 'SD02-016': 2, 'SD02-017': 2, 'SD02-019': 2, 'SD02-020': 3,
  'SD02-021': 3, 'SD02-022': 2, 'SD02-023': 2,
  'TP01-004': 1,
};

// 4. 공유덱 4: 앙코 / 산화 / 파수인 (서버 공유본은 이미 TP01 7장 포함 -> 구버전(TP01 제외) vs 서버본(7장) vs TP01 강화본(9장) 비교)
const SHARED_4_BASE_CHARS = [
  'BP01-031', 'BP01-032', 'BP01-032', 'SD02-003',
  'BP01-011', 'BP01-011', 'BP01-012', 'BP01-013', 'BP01-013', 'BP01-014',
  'BP01-006', 'BP01-007', 'BP01-008', 'BP01-009',
];
const SHARED_4_NO_TP01_ACTIONS: Record<string, number> = {
  'BP01-034': 3, 'BP01-035': 3, 'BP01-053': 2, 'BP01-054': 2, 'BP01-055': 2, 'BP01-056': 1,
  'BP01-057': 3, 'BP01-058': 3, 'BP01-059': 3, 'BP01-060': 3, 'BP01-061': 2, 'BP01-062': 2,
  'BP01-063': 2, 'BP01-064': 2, 'BP01-076': 2, 'SD02-013': 3, 'SD02-021': 2,
};
const SHARED_4_TP01_ACTIONS: Record<string, number> = {
  'BP01-034': 3, 'BP01-035': 3, 'BP01-053': 2, 'BP01-054': 2, 'BP01-056': 1,
  'BP01-057': 3, 'BP01-058': 3, 'BP01-059': 1, 'BP01-060': 3, 'BP01-061': 2, 'BP01-062': 2,
  'BP01-063': 2, 'BP01-064': 2, 'BP01-076': 2, 'SD02-013': 3, 'SD02-021': 1,
  'TP01-001': 2, 'TP01-003': 2, 'TP01-004': 1,
};

// 5. 입상덱 SLD-1 (RIN: 카멜리아 / 앙코 / 양양) - 원본 vs TP01 튜닝
function buildFromPreset(
  preset: DeckPreset,
  overrideActions?: Record<string, number>,
  suffix = ''
): CustomDeckConfig & { id: string; name: string } {
  const charCodes: string[] = [];
  for (const item of preset.characterDeckCards) {
    const ch = ALL_CHARACTERS.find((c) => c.code === item.code);
    if (ch && ch.level >= 1) {
      for (let i = 0; i < item.count; i++) charCodes.push(item.code);
    }
  }
  const actMap: Record<string, number> = {};
  if (overrideActions) {
    Object.assign(actMap, overrideActions);
  } else {
    for (const item of preset.actionCards) {
      actMap[item.code] = (actMap[item.code] || 0) + item.count;
    }
  }
  return buildDeck(
    preset.id + suffix,
    preset.name + suffix,
    preset.leaderCode,
    preset.leftSupportCode,
    preset.rightSupportCode,
    charCodes,
    actMap
  );
}

const SLD1_RIN_ORIG = buildFromPreset(COMMUNITY_DECK_PRESETS[0], undefined, ' 원본');
// RIN(카멜리아/앙코/양양, 이미 BP01-050 넝쿨의 춤×3 보유)에서 효과가 없는 바닐라 일반공격 2장(BP01-049×1, SD01-013×1)을 빼고
// 고유 효과를 가진 카멜리아/앙코 0코스트 일반공격 신카드 TP01-002(타오르는 넝쿨의 춤)×1, TP01-003(그늘이와 구름이 출격·공중 공격)×1 투입
const SLD1_RIN_TP01_ACTIONS: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const item of COMMUNITY_DECK_PRESETS[0].actionCards) {
    m[item.code] = (m[item.code] || 0) + item.count;
  }
  delete m['BP01-049']; // 바닐라 일반공격 1장 제거
  m['SD01-013'] = (m['SD01-013'] || 3) - 1; // 바닐라 일반공격 1장 제거
  m['TP01-002'] = 1;
  m['TP01-003'] = 1;
  return m;
})();
const SLD1_RIN_TP01 = buildFromPreset(COMMUNITY_DECK_PRESETS[0], SLD1_RIN_TP01_ACTIONS, ' +TP01');

export function getBenchmarkDeckPairs() {
  const s1Orig = buildDeck('s1-orig', '공유1(방/파/양) 원본', 'BP01-018', 'BP01-010', 'BP01-024', SHARED_1_BASE_CHARS, SHARED_1_ORIG_ACTIONS);
  const s1Tp01 = buildDeck('s1-tp01', '공유1(방/파/양) +TP01', 'BP01-018', 'BP01-010', 'BP01-024', SHARED_1_BASE_CHARS, SHARED_1_TP01_ACTIONS);

  const s2Orig = buildDeck('s2-orig', '공유2(카/방/산) 원본', 'BP01-005', 'BP01-021', 'BP01-033', SHARED_2_BASE_CHARS, SHARED_2_ORIG_ACTIONS);
  const s2Tp01 = buildDeck('s2-tp01', '공유2(카/방/산) +TP01', 'BP01-005', 'BP01-021', 'BP01-033', SHARED_2_BASE_CHARS, SHARED_2_TP01_ACTIONS);

  const s3Orig = buildDeck('s3-orig', '공유3(방/금/산) 원본', 'BP01-021', 'BP01-030', 'BP01-033', SHARED_3_BASE_CHARS, SHARED_3_ORIG_ACTIONS);
  const s3Tp01 = buildDeck('s3-tp01', '공유3(방/금/산) +TP01', 'BP01-021', 'BP01-030', 'BP01-033', SHARED_3_BASE_CHARS, SHARED_3_TP01_ACTIONS);

  const s4Orig = buildDeck('s4-orig', '공유4(앙/산/파) 구버전(No-TP01)', 'BP01-033', 'BP01-015', 'BP01-010', SHARED_4_BASE_CHARS, SHARED_4_NO_TP01_ACTIONS);
  const s4Tp01 = buildDeck('s4-tp01', '공유4(앙/산/파) +TP01(서버공유)', 'BP01-033', 'BP01-015', 'BP01-010', SHARED_4_BASE_CHARS, SHARED_4_TP01_ACTIONS);

  const s5Orig = SLD1_RIN_ORIG;
  const s5Tp01 = SLD1_RIN_TP01;

  return [
    { label: '공유덱1 (방랑자여/파수인/양양)', orig: s1Orig, tp01: s1Tp01 },
    { label: '공유덱2 (카멜리아/방랑자남/산화)', orig: s2Orig, tp01: s2Tp01 },
    { label: '공유덱3 (방랑자남/금희/산화)', orig: s3Orig, tp01: s3Tp01 },
    { label: '공유덱4 (앙코/산화/파수인)', orig: s4Orig, tp01: s4Tp01 },
    { label: '입상덱SLD1 (카멜리아/앙코/양양)', orig: s5Orig, tp01: s5Tp01 },
  ];
}

export function playAiVsAiCustomMatch(
  engineSeed: number,
  deck0: CustomDeckConfig,
  deck1: CustomDeckConfig,
  level0: AiLevel,
  level1: AiLevel
): { state: GameState; steps: number } {
  const levels: [AiLevel, AiLevel] = [level0, level1];
  let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', deck0, deck1, undefined, undefined, engineSeed);
  // 양쪽 모두 AI 모드로 설정하되, SMART_ALT(구버전 레거시 AI)는 LEGACY_AI 이름으로 구분하여 gameEngine 내부 구버전 분기와 대조
  state.players[0].isAi = true;
  state.players[1].isAi = true;
  state.players[0].name = level0 === 'SMART_ALT' ? 'LEGACY_AI' : 'SMART_AI';
  state.players[1].name = level1 === 'SMART_ALT' ? 'LEGACY_AI' : 'SMART_AI';

  if (state.phase === 'LEADER_SELECT') {
    const l0 = decideAiStartingLeader(state.players[0]);
    const l1 = decideAiStartingLeader(state.players[1]);
    state = selectStartingLeader(state, l0, l1);
  }

  state = executeMulligan(
    state,
    decideAiMulligan(state.players[0], levels[0]),
    decideAiMulligan(state.players[1], levels[1])
  );

  let steps = 0;
  while (state.phase !== 'GAME_OVER' && steps < 2500) {
    steps++;
    const active = state.activePlayerIndex;

    if (state.lastEffectDraw) {
      const chained = state.lastEffectDraw.nextPendingChoice || null;
      const rest = [...(state.deferredEffectDraws || [])];
      const next = !chained && rest.length > 0 ? rest.shift()! : null;
      state = {
        ...state,
        lastEffectDraw: next,
        deferredEffectDraws: rest,
        deferredEffectDraw: rest[0] ?? null,
        pendingChoice: chained || state.pendingChoice,
      };
      if (!next && !state.pendingChoice && state.phase === 'START_PHASE') {
        state = { ...state, phase: 'DRAW_PHASE' };
      }
      continue;
    }

    if (state.pendingChoice) {
      const pc = state.pendingChoice;
      state = resolvePendingChoice(
        state,
        pc.revealedCards.slice(0, pc.maxSelect ?? 1).map((c) => c.id)
      );
      continue;
    }

    switch (state.phase) {
      case 'DRAW_PHASE':
        state = { ...executeDrawPhase(state), phase: 'ACTION_PHASE' };
        break;
      case 'ACTION_PHASE':
        state = runAiActionPhase(state, active, levels[active]);
        break;
      case 'CLASH_SET': {
        const turnIdx = state.activePlayerIndex;
        const defIdx: 0 | 1 = turnIdx === 0 ? 1 : 0;
        const cTurn = selectAiClashCard(state, turnIdx, levels[turnIdx]);
        state = setClashCard(state, turnIdx, cTurn).newState;
        if (state.pendingChoice) {
          state = resolvePendingChoice(state, []);
        }
        const cDef = selectAiClashCard(state, defIdx, levels[defIdx]);
        state = setClashCard(state, defIdx, cDef).newState;
        state = resolveClash(state);
        break;
      }
      case 'CLASH_REVEAL':
        state = proceedAfterClashReveal(state);
        break;
      case 'COMBO_STEP': {
        const idx: 0 | 1 =
          state.players[0].comboUnlimited || state.players[0].comboCount > 0 ? 0 : 1;
        state = runAiComboStep(state, idx, levels[idx]);
        break;
      }
      case 'DISCARD_OVERFLOW':
        state = runAiDiscardOverflow(state, active, levels[active]);
        break;
      case 'END_PHASE': {
        const before = state;
        state = executeEndPhase(state);
        if (state.phase === 'END_PHASE' && !state.pendingChoice && !state.lastEffectDraw) {
          state = finalizeEndPhase(state);
        }
        if (state === before) steps = 2500;
        break;
      }
      case 'START_PHASE':
        state = { ...state, phase: 'DRAW_PHASE' };
        break;
      default:
        steps = 2500;
    }
  }

  return { state, steps };
}

describe('TP01 New Cards AI Decisions & 2000-Game Benchmark', () => {
  it('1) [TP01-004 공명 촉진제] 우세(hasDominance) 상태에서 SMART AI가 패배 시에도 발동하는 무료 레벨업 가치를 인식하고 Lv.2 진화를 우선 선택한다', () => {
    const pairs = getBenchmarkDeckPairs();
    const deck = pairs[0].tp01;
    const state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', deck, deck, undefined, undefined, 777);
    state.players[0].isAi = true;
    state.players[1].isAi = true;
    state.phase = 'CLASH_SET';
    state.activePlayerIndex = 0;

    // P0에게 우세 부여 & 협주 1장 준비
    state.players[0].hasDominance = true;
    state.players[0].concertoZone = [{ ...ACTION_CARD_TEMPLATES[0], id: 'conc-1' }];
    // 리더 방랑자(여)를 Lv.1(SD01-002)로 두어 Lv.2(SD01-001) 진화가 가능하게 설정
    const roverLv1 = ALL_CHARACTERS.find((c) => c.code === 'SD01-002')!;
    state.players[0].slots.leader = { ...roverLv1, id: 'leader-rover-lv1' };

    const tp004 = { ...ACTION_CARD_TEMPLATES.find((c) => c.code === 'TP01-004')!, id: 'hand-tp004' };
    const weakRed = { ...ACTION_CARD_TEMPLATES.find((c) => c.code === 'SD01-021')!, id: 'hand-weak-red' };
    state.players[0].hand = [weakRed, tp004];

    // SMART AI는 우세 상태에서 100% 무료 Lv.2 진화를 보장하는 TP01-004를 선택해야 함
    const smartPick = selectAiClashCard(state, 0, 'SMART');
    const legacyPick = selectAiClashCard(state, 0, 'SMART_ALT');
    expect(smartPick).toBe('hand-tp004');
    expect(legacyPick).toBe('hand-weak-red');

    // 실제로 대결 패배(상대 적색 카드에 상성 패배)하더라도 우세 효과로 방랑자(여) Lv.2 진화가 이루어지는지 검증
    const oppRed = { ...ACTION_CARD_TEMPLATES.find((c) => c.code === 'SD01-017')!, id: 'opp-red' };
    state.players[1].hand = [oppRed];
    let s = setClashCard(state, 0, smartPick).newState;
    s = setClashCard(s, 1, 'opp-red').newState;
    s = resolveClash(s);
    expect(s.players[0].slots.leader.level).toBe(2);
    expect(s.players[0].slots.leader.code).toBe('SD01-001');
  });

  it('2) [TP01-001 연역] 파수인 리더 & 우세 상태에서 스피드 14 및 트래시 최고 가치 카드(결말의 순환 BP01-057) 우선 회수를 수행한다', () => {
    const pairs = getBenchmarkDeckPairs();
    const deck = pairs[0].tp01;
    const state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', deck, deck, undefined, undefined, 888);
    state.players[0].isAi = true;
    state.players[1].isAi = true;
    state.phase = 'CLASH_SET';
    state.activePlayerIndex = 0;

    // 리더를 파수인으로 설정 & 우세 부여
    const skLv0 = ALL_CHARACTERS.find((c) => c.code === 'BP01-010')!;
    state.players[0].slots.leader = { ...skLv0, id: 'leader-sk' };
    state.players[0].hasDominance = true;
    state.players[0].concertoZone = [{ ...ACTION_CARD_TEMPLATES[0], id: 'conc-1' }];

    // 트래시에 저가치 계발(BP01-054)을 먼저 넣고, 뒤에 고가치 결말의 순환(BP01-057)을 배치
    const bp054 = { ...ACTION_CARD_TEMPLATES.find((c) => c.code === 'BP01-054')!, id: 'drop-054' };
    const bp057 = { ...ACTION_CARD_TEMPLATES.find((c) => c.code === 'BP01-057')!, id: 'drop-057' };
    state.players[0].dropZone = [bp054, bp057];

    const tp001 = { ...ACTION_CARD_TEMPLATES.find((c) => c.code === 'TP01-001')!, id: 'hand-tp001' };
    const oppGreen = { ...ACTION_CARD_TEMPLATES.find((c) => c.code === 'SD01-020')!, id: 'opp-green' };
    state.players[0].hand = [tp001];
    state.players[1].hand = [oppGreen];

    let s = setClashCard(state, 0, 'hand-tp001').newState;
    s = setClashCard(s, 1, 'opp-green').newState;
    s = resolveClash(s);

    // 무지성 dropZone[0](계발)이 아니라 최고 가치인 결말의 순환(BP01-057)을 회수해야 함!
    expect(s.players[0].hand.some((c) => c.id === 'drop-057')).toBe(true);
    expect(s.players[0].hand.some((c) => c.id === 'drop-054')).toBe(false);
  });

  it('3) [TP01-002 타오르는 넝쿨의 춤] 연격(COMBO_STEP)에서 넝쿨의 춤(BP01-050)보다 먼저 시전하여 일반 공격 조건을 채우고 배틀 종료 시 회수한다', () => {
    const pairs = getBenchmarkDeckPairs();
    const deck = pairs[1].tp01;
    const state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', deck, deck, undefined, undefined, 999);
    state.players[0].isAi = true;
    state.players[1].isAi = true;
    state.phase = 'COMBO_STEP';
    state.activePlayerIndex = 0;

    state.players[0].comboUnlimited = true;
    state.players[0].concertoZone = [
      { ...ACTION_CARD_TEMPLATES[0], id: 'c1' },
      { ...ACTION_CARD_TEMPLATES[0], id: 'c2' },
    ];
    // 액션 에리어에 이미 일반 공격 1장이 놓여 있는 상황
    const openerNormal = { ...ACTION_CARD_TEMPLATES.find((c) => c.code === 'BP01-049')!, id: 'opener-normal' };
    state.players[0].actionArea = [openerNormal];

    // 손패에 BP01-050(넝쿨의 춤)과 TP01-002(타오르는 넝쿨의 춤) 보유
    const bp050 = { ...ACTION_CARD_TEMPLATES.find((c) => c.code === 'BP01-050')!, id: 'hand-bp050' };
    const tp002 = { ...ACTION_CARD_TEMPLATES.find((c) => c.code === 'TP01-002')!, id: 'hand-tp002' };
    state.players[0].hand = [bp050, tp002];

    // 첫 연격 스텝에서 TP01-002를 먼저 내고, 두 번째 스텝에서 BP01-050을 내야 함
    const afterStep1 = runAiComboStep(state, 0, 'SMART');
    expect(afterStep1.players[0].actionArea.some((c) => c.id === 'hand-tp002')).toBe(true);
    const afterStep2 = runAiComboStep(afterStep1, 0, 'SMART');
    expect(afterStep2.players[0].actionArea.some((c) => c.id === 'hand-bp050')).toBe(true);
  });

  it('4) 공유 입상 덱 + 신카드(TP01) 교차 검증 (기본 100판 / BENCHMARK_GAMES=2000 시 2000판 완주 및 승률 검증)', async () => {
    const pairs = getBenchmarkDeckPairs();
    const totalGames = Number(process.env.BENCHMARK_GAMES ?? 100);
    const gamesPerPair = Math.max(2, Math.floor(totalGames / pairs.length));

    let newSmartWins = 0;
    let legacySmartWins = 0;
    let finishedGames = 0;
    let maxStepsObserved = 0;
    let totalTurns = 0;

    const perDeckAiStats: Array<{
      deck: string;
      games: number;
      newSmartWins: number;
      legacyWins: number;
      winRate: string;
    }> = [];

    for (let pIdx = 0; pIdx < pairs.length; pIdx++) {
      const { label, tp01 } = pairs[pIdx];
      let dNewWins = 0;
      let dLegWins = 0;
      for (let g = 0; g < gamesPerPair; g++) {
        if (g > 0 && g % 50 === 0) {
          await new Promise((r) => setImmediate(r));
        }
        const seed = 10000 + pIdx * 2000 + Math.floor(g / 2);
        const newIsP0 = g % 2 === 0;
        const { state, steps } = playAiVsAiCustomMatch(
          seed,
          tp01,
          tp01,
          newIsP0 ? 'SMART' : 'SMART_ALT',
          newIsP0 ? 'SMART_ALT' : 'SMART'
        );
        expect(state.phase).toBe('GAME_OVER');
        expect(steps).toBeLessThan(2500);
        finishedGames++;
        totalTurns += state.turn;
        if (steps > maxStepsObserved) maxStepsObserved = steps;

        if (state.winner === 0) {
          if (newIsP0) {
            newSmartWins++;
            dNewWins++;
          } else {
            legacySmartWins++;
            dLegWins++;
          }
        } else if (state.winner === 1) {
          if (!newIsP0) {
            newSmartWins++;
            dNewWins++;
          } else {
            legacySmartWins++;
            dLegWins++;
          }
        }
      }
      perDeckAiStats.push({
        deck: label,
        games: gamesPerPair,
        newSmartWins: dNewWins,
        legacyWins: dLegWins,
        winRate: `${((dNewWins / gamesPerPair) * 100).toFixed(1)}%`,
      });
    }

    if (totalGames >= 50) {
      console.log(`\n=== [실험 B] 신규 SMART AI vs 구버전 SMART_ALT AI (${finishedGames}판, 평균 ${(totalTurns / finishedGames).toFixed(1)}턴) ===`);
      console.table(perDeckAiStats);
      console.log(
        `총합: 신규 SMART ${newSmartWins}승 vs 구버전 SMART_ALT ${legacySmartWins}승 (승률 ${((newSmartWins / finishedGames) * 100).toFixed(2)}%, 최대 스텝 ${maxStepsObserved})\n`
      );
    }

    expect(finishedGames).toBe(pairs.length * gamesPerPair);
    expect(newSmartWins + legacySmartWins).toBeGreaterThan(0);
    // 신규 SMART AI가 구버전 SMART_ALT 대비 우위(승률 >= 50%)여야 함
    expect(newSmartWins).toBeGreaterThanOrEqual(legacySmartWins);
  }, 180000);

  it('5) 공유 입상 덱 원본 vs 신카드(TP01-001~005) 투입 튜닝 덱 맞대결 검증 (기본 100판 / BENCHMARK_GAMES=2000 시 2000판)', async () => {
    const pairs = getBenchmarkDeckPairs();
    const totalGames = Number(process.env.BENCHMARK_GAMES ?? 100);
    const gamesPerPair = Math.max(2, Math.floor(totalGames / pairs.length));

    let tp01DeckWins = 0;
    let origDeckWins = 0;
    let finishedGames = 0;
    let totalTurns = 0;

    const perDeckTuneStats: Array<{
      deck: string;
      games: number;
      tp01Wins: number;
      origWins: number;
      tp01WinRate: string;
    }> = [];

    for (let pIdx = 0; pIdx < pairs.length; pIdx++) {
      const { label, orig, tp01 } = pairs[pIdx];
      let dTp01Wins = 0;
      let dOrigWins = 0;
      for (let g = 0; g < gamesPerPair; g++) {
        if (g > 0 && g % 50 === 0) {
          await new Promise((r) => setImmediate(r));
        }
        const seed = 50200 + pIdx * 2000 + Math.floor(g / 2);
        const tp01IsP0 = g % 2 === 0;
        const { state, steps } = playAiVsAiCustomMatch(
          seed,
          tp01IsP0 ? tp01 : orig,
          tp01IsP0 ? orig : tp01,
          'SMART',
          'SMART'
        );
        expect(state.phase).toBe('GAME_OVER');
        expect(steps).toBeLessThan(2500);
        finishedGames++;
        totalTurns += state.turn;

        if (state.winner === 0) {
          if (tp01IsP0) {
            tp01DeckWins++;
            dTp01Wins++;
          } else {
            origDeckWins++;
            dOrigWins++;
          }
        } else if (state.winner === 1) {
          if (!tp01IsP0) {
            tp01DeckWins++;
            dTp01Wins++;
          } else {
            origDeckWins++;
            dOrigWins++;
          }
        }
      }
      perDeckTuneStats.push({
        deck: label,
        games: gamesPerPair,
        tp01Wins: dTp01Wins,
        origWins: dOrigWins,
        tp01WinRate: `${((dTp01Wins / gamesPerPair) * 100).toFixed(1)}%`,
      });
    }

    if (totalGames >= 50) {
      console.log(`\n=== [실험 A] 신카드(TP01) 투입 튜닝 덱 vs 기존 공유 입상 덱 원본 (${finishedGames}판, 평균 ${(totalTurns / finishedGames).toFixed(1)}턴) ===`);
      console.table(perDeckTuneStats);
      console.log(
        `총합: TP01 튜닝 덱 ${tp01DeckWins}승 vs 기존 원본 덱 ${origDeckWins}승 (TP01 덱 승률 ${((tp01DeckWins / finishedGames) * 100).toFixed(2)}%)\n`
      );
    }

    expect(finishedGames).toBe(pairs.length * gamesPerPair);
    expect(tp01DeckWins + origDeckWins).toBeGreaterThan(0);
    // TP01 신카드를 시너지에 맞게 투입한 튜닝 덱이 원본 덱 대비 우위(승률 > 50%)여야 함
    expect(tp01DeckWins).toBeGreaterThan(origDeckWins);
  }, 180000);
});
