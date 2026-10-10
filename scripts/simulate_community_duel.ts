/**
 * 커뮤니티 덱 4종 라운드로빈 AI 대전 시뮬레이터
 *
 * 사용법: npx tsx scripts/simulate_community_duel.ts [gamesPerPairing=40] [levelA=SMART] [levelB=BASIC]
 *   - 4개 덱 x 4개 덱(미러 포함) x 양쪽 좌석을 균등 배분.
 *   - A레벨 AI는 항상 덱 X, B레벨 AI는 덱 Y를 사용하고 좌석을 번갈아 앉는다.
 *   - 환경변수 SMART_PARAMS / ALT_PARAMS 로 파라미터 오버라이드 가능.
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
import { COMMUNITY_DECK_PRESETS } from '../src/data/communityDecks';
import { presetToCustomDeck } from '../src/utils/deckCode';
import { CustomDeckConfig, GameState } from '../src/types/tcg';

const perPairing = Number(process.argv[2] ?? 40);
const levelA = (process.argv[3] ?? 'SMART') as AiLevel;
const levelB = (process.argv[4] ?? 'BASIC') as AiLevel;
if (process.env.SMART_PARAMS) Object.assign(SMART_PARAMS, JSON.parse(process.env.SMART_PARAMS));
if (process.env.ALT_PARAMS) Object.assign(SMART_ALT_PARAMS, JSON.parse(process.env.ALT_PARAMS));

const DECKS: { key: string; cfg: CustomDeckConfig }[] = COMMUNITY_DECK_PRESETS.map((p) => ({
  key: p.id.replace('preset-sld-', ''),
  cfg: presetToCustomDeck(p),
}));

interface MatchResult {
  winner: 0 | 1 | -1;
  turns: number;
  errors: string[];
}

function playMatch(d0: CustomDeckConfig, d1: CustomDeckConfig, lv0: AiLevel, lv1: AiLevel): MatchResult {
  const errors: string[] = [];
  const levels = [lv0, lv1];
  let state: GameState = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', d0, d1);
  // 선공은 주사위로 결정 (UI와 동일하게 랜덤)
  state = { ...state, activePlayerIndex: Math.random() < 0.5 ? 0 : 1 };

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
  if (state.phase !== 'GAME_OVER') {
    errors.push(`timeout (phase=${state.phase}, turn=${state.turn})`);
    if (process.env.DUMP_TIMEOUT) {
      state.players.forEach((p, i) =>
        console.log(
          `  P${i} hp=${p.hp} hand=${p.hand.length} deck=${p.actionDeck.length} drop=${p.dropZone.length} concerto=${p.concertoZone.length} leader=${p.slots.leader.nameKr} L${p.slots.leader.level}`
        )
      );
      console.log(state.logs.slice(0, 14).map((l) => '   ' + l.text).join('\n'));
    }
  }
  return { winner: (state.winner ?? -1) as 0 | 1 | -1, turns: state.turn, errors };
}

let aWins = 0, bWins = 0, draws = 0, totalErrors = 0, totalTurns = 0, played = 0;
const errorSamples = new Set<string>();
// 덱별 승률 (A/B 레벨 무관, 해당 덱을 쓴 쪽의 승리)
const deckStat: Record<string, { w: number; n: number }> = {};
DECKS.forEach((d) => (deckStat[d.key] = { w: 0, n: 0 }));
// A레벨 덱별 승률
const aDeckStat: Record<string, { w: number; n: number }> = {};
DECKS.forEach((d) => (aDeckStat[d.key] = { w: 0, n: 0 }));
let firstWins = 0, firstN = 0;

for (const dx of DECKS) {
  for (const dy of DECKS) {
    for (let g = 0; g < perPairing; g++) {
      const aSeat: 0 | 1 = g % 2 === 0 ? 0 : 1;
      const d0 = aSeat === 0 ? dx : dy;
      const d1 = aSeat === 0 ? dy : dx;
      const lv0 = aSeat === 0 ? levelA : levelB;
      const lv1 = aSeat === 0 ? levelB : levelA;
      const res = playMatch(d0.cfg, d1.cfg, lv0, lv1);
      played++;
      if (res.errors.length) {
        totalErrors += res.errors.length;
        res.errors.slice(0, 2).forEach((e) => errorSamples.add(`${dx.key} vs ${dy.key}: ${e}`));
        continue;
      }
      totalTurns += res.turns;
      deckStat[dx.key].n++;
      deckStat[dy.key].n++;
      aDeckStat[dx.key].n++;
      if (res.winner === -1) {
        draws++;
        continue;
      }
      const aWon = res.winner === aSeat;
      if (aWon) {
        aWins++;
        aDeckStat[dx.key].w++;
        deckStat[dx.key].w++;
      } else {
        bWins++;
        deckStat[dy.key].w++;
      }
    }
  }
}

const decided = aWins + bWins;
console.log(`\n=== COMMUNITY DUEL: ${levelA} (A) vs ${levelB} (B) | ${played} games (${perPairing}/pairing) ===`);
console.log(`A wins ${aWins} / B wins ${bWins} / draws ${draws} / errors ${totalErrors}  -> A winrate ${(100 * aWins / Math.max(1, decided)).toFixed(1)}%`);
console.log('A winrate by deck:', DECKS.map((d) => `${d.key} ${(100 * aDeckStat[d.key].w / Math.max(1, aDeckStat[d.key].n)).toFixed(0)}%`).join(' | '));
console.log('Deck strength (any AI):', DECKS.map((d) => `${d.key} ${(100 * deckStat[d.key].w / Math.max(1, deckStat[d.key].n)).toFixed(0)}%`).join(' | '));
console.log(`Avg turns: ${(totalTurns / Math.max(1, decided + draws)).toFixed(1)}`);
if (errorSamples.size) {
  console.log('Error samples:');
  [...errorSamples].slice(0, 10).forEach((e) => console.log('  ' + e));
}
if (totalErrors > 0) process.exit(1);
