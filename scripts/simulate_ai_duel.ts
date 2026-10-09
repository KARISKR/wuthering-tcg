/**
 * AI 대전 시뮬레이터: 공식 스타터덱 1번(SD01 = STARTER_ROVER) vs 2번(SD02 = STARTER_CHIXIA)
 *
 * 사용법: npx tsx scripts/simulate_ai_duel.ts [games=100] [levelA=SMART] [levelB=BASIC]
 *   - 양쪽 좌석(선공/후공) x 양쪽 덱을 균등 배분하여 A레벨 AI와 B레벨 AI를 겨룬다.
 *   - 환경변수 SMART_PARAMS='{"costPenalty":0.4}' 로 파라미터 오버라이드 가능.
 *   ※ 사용자가 전투 로직 검증을 명시적으로 요청했을 때만 실행할 것.
 */
import {
  createInitialGameState,
  executeMulligan,
  setClashCard,
  proceedAfterClashReveal,
  executeEndPhase,
} from '../src/engine/gameEngine';
import {
  decideAiMulligan,
  runAiActionPhase,
  selectAiClashCard,
  runAiComboStep,
  runAiDiscardOverflow,
  SMART_PARAMS,
  SMART_ALT_PARAMS,
  AiLevel,
} from '../src/engine/aiPlayer';
import { GameState } from '../src/types/tcg';

type Preset = 'STARTER_ROVER' | 'STARTER_CHIXIA';

const games = Number(process.argv[2] ?? 100);
const levelA = (process.argv[3] ?? 'SMART') as AiLevel;
const levelB = (process.argv[4] ?? 'BASIC') as AiLevel;
if (process.env.SMART_PARAMS) Object.assign(SMART_PARAMS, JSON.parse(process.env.SMART_PARAMS));
if (process.env.ALT_PARAMS) Object.assign(SMART_ALT_PARAMS, JSON.parse(process.env.ALT_PARAMS));

interface MatchResult {
  winner: 0 | 1 | -1;
  turns: number;
  errors: string[];
}

function playMatch(p0Preset: Preset, p1Preset: Preset, lv0: AiLevel, lv1: AiLevel): MatchResult {
  const errors: string[] = [];
  const levels = [lv0, lv1];
  let state: GameState = createInitialGameState(p0Preset, p1Preset, 'SOLO_DUAL');

  state = executeMulligan(
    state,
    decideAiMulligan(state.players[0], lv0),
    decideAiMulligan(state.players[1], lv1)
  );

  let steps = 0;
  const LIMIT = 3000;
  while (state.phase !== 'GAME_OVER' && steps < LIMIT) {
    steps++;
    const active = state.activePlayerIndex;
    for (let i = 0; i < 2; i++) {
      const p = state.players[i];
      if (Number.isNaN(p.hp) || p.hp < 0) errors.push(`invalid hp p${i}: ${p.hp}`);
    }
    switch (state.phase) {
      case 'ACTION_PHASE':
        state = runAiActionPhase(state, active, levels[active]);
        break;
      case 'CLASH_SET': {
        const c0 = selectAiClashCard(state, 0, levels[0]);
        const c1 = selectAiClashCard(state, 1, levels[1]);
        const r0 = setClashCard(state, 0, c0);
        if (!r0.success) errors.push(`p0 set failed: ${r0.error}`);
        state = r0.newState;
        const r1 = setClashCard(state, 1, c1);
        if (!r1.success) errors.push(`p1 set failed: ${r1.error}`);
        state = r1.newState;
        break;
      }
      case 'CLASH_REVEAL':
        state = proceedAfterClashReveal(state);
        break;
      case 'COMBO_STEP': {
        const idx: 0 | 1 = state.players[0].comboCount > 0 ? 0 : 1;
        state = runAiComboStep(state, idx, levels[idx]);
        break;
      }
      case 'DISCARD_OVERFLOW':
        state = runAiDiscardOverflow(state, active, levels[active]);
        break;
      case 'END_PHASE':
        state = executeEndPhase(state);
        break;
      default:
        errors.push(`unexpected phase ${state.phase}`);
        steps = LIMIT;
    }
    if (errors.length > 5) break;
  }
  if (state.phase !== 'GAME_OVER') errors.push(`timeout (phase=${state.phase}, turn=${state.turn})`);
  return { winner: (state.winner ?? -1) as 0 | 1 | -1, turns: state.turn, errors };
}

// A/B 레벨 AI를 4개 시나리오(좌석 x 덱)에 균등 배분
const scenarios: { aSeat: 0 | 1; aDeck: Preset }[] = [
  { aSeat: 0, aDeck: 'STARTER_ROVER' },
  { aSeat: 0, aDeck: 'STARTER_CHIXIA' },
  { aSeat: 1, aDeck: 'STARTER_ROVER' },
  { aSeat: 1, aDeck: 'STARTER_CHIXIA' },
];

let aWins = 0;
let bWins = 0;
let draws = 0;
let totalErrors = 0;
let totalTurns = 0;
const bySc = scenarios.map(() => ({ a: 0, n: 0 }));
// 덱 승률 (레벨 무관): SD01 vs SD02
let sd01Wins = 0;
let sd02Wins = 0;
// 선공/후공 승률
let seat0Wins = 0;
let seat1Wins = 0;

for (let g = 0; g < games; g++) {
  const si = g % scenarios.length;
  const sc = scenarios[si];
  const bDeck: Preset = sc.aDeck === 'STARTER_ROVER' ? 'STARTER_CHIXIA' : 'STARTER_ROVER';
  const p0Preset = sc.aSeat === 0 ? sc.aDeck : bDeck;
  const p1Preset = sc.aSeat === 1 ? sc.aDeck : bDeck;
  const lv0 = sc.aSeat === 0 ? levelA : levelB;
  const lv1 = sc.aSeat === 1 ? levelA : levelB;

  const res = playMatch(p0Preset, p1Preset, lv0, lv1);
  bySc[si].n++;
  if (res.errors.length) {
    totalErrors += res.errors.length;
    console.error(`Game ${g + 1} errors:`, res.errors.slice(0, 3));
    continue;
  }
  totalTurns += res.turns;
  if (res.winner === -1) draws++;
  else {
    const aWon = res.winner === sc.aSeat;
    if (aWon) {
      aWins++;
      bySc[si].a++;
    } else bWins++;
    const winDeck = res.winner === 0 ? p0Preset : p1Preset;
    if (winDeck === 'STARTER_ROVER') sd01Wins++;
    else sd02Wins++;
    if (res.winner === 0) seat0Wins++;
    else seat1Wins++;
  }
}

const decided = aWins + bWins;
console.log(`\n=== AI DUEL: ${levelA} (A) vs ${levelB} (B) | ${games} games | SD01 vs SD02 ===`);
console.log(`A wins ${aWins} / B wins ${bWins} / draws ${draws} / errors ${totalErrors}  -> A winrate ${(100 * aWins / Math.max(1, decided)).toFixed(1)}%`);
scenarios.forEach((sc, i) =>
  console.log(`  A as P${sc.aSeat} with ${sc.aDeck === 'STARTER_ROVER' ? 'SD01' : 'SD02'}: ${bySc[i].a}/${bySc[i].n}`)
);
console.log(`Deck winrate -> SD01 ${sd01Wins} : SD02 ${sd02Wins}   |  Seat winrate -> first(P0) ${seat0Wins} : second(P1) ${seat1Wins}`);
console.log(`Avg turns: ${(totalTurns / Math.max(1, decided + draws)).toFixed(1)}`);
if (totalErrors > 0) process.exit(1);

