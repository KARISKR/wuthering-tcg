import {
  createInitialGameState,
  executeMulligan,
  upgradeCharacter,
  switchLeader,
  chargeConcerto,
  decideClash,
  setClashCard,
  proceedAfterClashReveal,
  executeComboAttack,
  finishComboStep,
  discardOverflowCards,
  executeEndPhase,
  forceResolveClash,
} from '../src/engine/gameEngine';
import {
  decideAiMulligan,
  runAiActionPhase,
  selectAiClashCard,
  runAiComboStep,
  runAiDiscardOverflow,
} from '../src/engine/aiPlayer';
import { GameState, PlayerState } from '../src/types/tcg';

// Helper to run an AI decision for player idx (0 or 1)
function runPlayerAction(state: GameState, playerIdx: 0 | 1): GameState {
  const p = state.players[playerIdx];

  // 1. Upgrade if possible
  if (!p.actionFlags.upgraded && p.hand.length >= 3) {
    const slots: ('leader' | 'leftSupport' | 'rightSupport')[] = ['leader', 'leftSupport', 'rightSupport'];
    for (const slotKey of slots) {
      const cur = p.slots[slotKey];
      if (!cur) continue;
      const nextLevel = (cur.level + 1) as 1 | 2;
      const upCard = p.characterDeck.find(
        (c) => c.characterName === cur.characterName && c.level === nextLevel
      );
      if (upCard) {
        let reqDiscard = upCard.level;
        // check yangyang lv2
        const hasYangyangLv2 =
          (p.slots.leader.characterName === '양양' && p.slots.leader.level === 2) ||
          (p.slots.leftSupport?.characterName === '양양' && p.slots.leftSupport?.level === 2) ||
          (p.slots.rightSupport?.characterName === '양양' && p.slots.rightSupport?.level === 2);
        if (hasYangyangLv2 && reqDiscard > 1) reqDiscard -= 1;

        if (p.hand.length >= reqDiscard) {
          const disc = p.hand.slice(0, reqDiscard).map((c) => c.id);
          const res = upgradeCharacter(state, playerIdx, slotKey, upCard.id, disc);
          if (res.success) {
            state = res.newState;
            break;
          }
        }
      }
    }
  }

  // 2. Charge concerto if low
  const updatedP = state.players[playerIdx];
  if (!updatedP.actionFlags.chargedConcerto && updatedP.concertoZone.length < 3 && updatedP.hand.length >= 2) {
    const chargeCard = updatedP.hand.find((c) => c.cost === 0) || updatedP.hand[0];
    if (chargeCard) {
      const res = chargeConcerto(state, playerIdx, chargeCard.id);
      if (res.success) {
        state = res.newState;
      }
    }
  }

  // 3. Switch leader if supporter is higher level
  const afterChargeP = state.players[playerIdx];
  if (!afterChargeP.actionFlags.switchedLeader) {
    if (afterChargeP.slots.leftSupport && afterChargeP.slots.leftSupport.level > afterChargeP.slots.leader.level) {
      const res = switchLeader(state, playerIdx, 'leftSupport');
      if (res.success) state = res.newState;
    } else if (afterChargeP.slots.rightSupport && afterChargeP.slots.rightSupport.level > afterChargeP.slots.leader.level) {
      const res = switchLeader(state, playerIdx, 'rightSupport');
      if (res.success) state = res.newState;
    }
  }

  // 4. Decide clash (90% chance to attack if hand has cards)
  const finalP = state.players[playerIdx];
  const wantsClash = finalP.hand.length > 0;
  return decideClash(state, wantsClash);
}

import {
  canLeaderUseCard,
} from '../src/engine/gameEngine';

// Select card for clash
function pickClashCard(state: GameState, playerIdx: 0 | 1): string | null {
  const p = state.players[playerIdx];
  const usable = p.hand.filter((c) => p.concertoZone.length >= c.cost && canLeaderUseCard(p.slots.leader, c));
  if (usable.length === 0) return null;
  // Pick random usable card
  const picked = usable[Math.floor(Math.random() * usable.length)];
  return picked.id;
}

// Simulate one full game
function simulateMatch(
  gameId: number,
  p0Preset: 'STARTER_ROVER' | 'STARTER_CHIXIA',
  p1Preset: 'STARTER_ROVER' | 'STARTER_CHIXIA'
): { turns: number; winner: number; logCount: number; errors: string[] } {
  const errors: string[] = [];
  let state = createInitialGameState(p0Preset, p1Preset, 'SOLO_DUAL');

  // Mulligan phase
  const p0Mull = state.players[0].hand.filter((c) => c.cost >= 2).slice(0, 2).map((c) => c.id);
  const p1Mull = state.players[1].hand.filter((c) => c.cost >= 2).slice(0, 2).map((c) => c.id);
  state = executeMulligan(state, p0Mull, p1Mull);

  let stepLimit = 500;
  let steps = 0;

  while (state.phase !== 'GAME_OVER' && steps < stepLimit) {
    steps++;

    // Invariant checks
    for (let i = 0; i < 2; i++) {
      const p = state.players[i];
      if (isNaN(p.hp)) errors.push(`Step ${steps}: Player ${i} HP is NaN!`);
      if (p.hp < 0) errors.push(`Step ${steps}: Player ${i} HP is negative: ${p.hp}`);
      if (!p.slots.leader) errors.push(`Step ${steps}: Player ${i} leader is null!`);
    }

    if (state.phase === 'START_PHASE' || state.phase === 'DRAW_PHASE') {
      // These should auto-transition, but if called manually:
      errors.push(`Step ${steps}: Game stayed in ${state.phase}`);
      break;
    }

    if (state.phase === 'ACTION_PHASE') {
      const active = state.activePlayerIndex;
      state = runPlayerAction(state, active);
      continue;
    }

    if (state.phase === 'CLASH_SET') {
      // Both players set card
      const c0 = pickClashCard(state, 0);
      const c1 = pickClashCard(state, 1);
      const r0 = setClashCard(state, 0, c0);
      if (!r0.success) errors.push(`Step ${steps}: P0 setClashCard failed: ${r0.error}`);
      state = r0.newState;

      const r1 = setClashCard(state, 1, c1);
      if (!r1.success) errors.push(`Step ${steps}: P1 setClashCard failed: ${r1.error}`);
      state = r1.newState;
      continue;
    }

    if (state.phase === 'CLASH_REVEAL') {
      state = proceedAfterClashReveal(state);
      continue;
    }

    if (state.phase === 'COMBO_STEP') {
      const p0 = state.players[0];
      const p1 = state.players[1];
      const comboIdx: 0 | 1 = p0.comboCount > 0 ? 0 : 1;
      const cp = state.players[comboIdx];

      const redCard = cp.hand.find((c) => c.color === 'RED' && cp.concertoZone.length >= c.cost);
      if (redCard && cp.comboCount > 0) {
        const res = executeComboAttack(state, comboIdx, redCard.id);
        if (res.success) {
          state = res.newState;
        } else {
          state = finishComboStep(state, comboIdx);
        }
      } else {
        state = finishComboStep(state, comboIdx);
      }
      continue;
    }

    if (state.phase === 'DISCARD_OVERFLOW') {
      const pIdx = state.activePlayerIndex;
      const p = state.players[pIdx];
      const excess = p.hand.length - 8;
      if (excess > 0) {
        const disc = p.hand.slice(0, excess).map((c) => c.id);
        const res = discardOverflowCards(state, pIdx, disc);
        if (res.success) {
          state = res.newState;
        } else {
          errors.push(`Step ${steps}: Discard overflow failed: ${res.error}`);
          break;
        }
      }
      continue;
    }

    if (state.phase === 'END_PHASE') {
      state = executeEndPhase(state);
      continue;
    }
  }

  if (steps >= stepLimit && state.phase !== 'GAME_OVER') {
    errors.push(`Match ${gameId} timed out after ${stepLimit} steps without finishing!`);
  }

  return {
    turns: state.turn,
    winner: state.winner ?? -1,
    logCount: state.logs.length,
    errors,
  };
}

// Run test suite
console.log('=== RUNNING AUTONOMOUS BATTLE SIMULATIONS ===');
const matchups: ['STARTER_ROVER' | 'STARTER_CHIXIA', 'STARTER_ROVER' | 'STARTER_CHIXIA'][] = [
  ['STARTER_ROVER', 'STARTER_CHIXIA'],
  ['STARTER_CHIXIA', 'STARTER_ROVER'],
  ['STARTER_ROVER', 'STARTER_ROVER'],
  ['STARTER_CHIXIA', 'STARTER_CHIXIA'],
];

let totalGames = 100;
let completedGames = 0;
let errorsFound = 0;
let p0Wins = 0;
let p1Wins = 0;
let totalTurns = 0;

for (let i = 0; i < totalGames; i++) {
  const matchup = matchups[i % matchups.length];
  const res = simulateMatch(i + 1, matchup[0], matchup[1]);
  if (res.errors.length > 0) {
    console.error(`Game #${i + 1} ERRORS:`, res.errors);
    errorsFound += res.errors.length;
  } else {
    completedGames++;
    if (res.winner === 0) p0Wins++;
    else if (res.winner === 1) p1Wins++;
    totalTurns += res.turns;
  }
}

console.log(`\n=== SIMULATION RESULTS ===`);
console.log(`Total Games Simulated: ${totalGames}`);
console.log(`Successfully Completed to GAME_OVER: ${completedGames}/${totalGames}`);
console.log(`Errors: ${errorsFound}`);
console.log(`P0 Wins: ${p0Wins}, P1 Wins: ${p1Wins}`);
console.log(`Average Turns per Match: ${(totalTurns / completedGames).toFixed(1)}`);

if (errorsFound === 0 && completedGames === totalGames) {
  console.log('✅ ALL 50 SIMULATED GAMES COMPLETED PERFECTLY WITH ZERO ERRORS!');
} else {
  console.error('❌ ISSUES FOUND DURING SIMULATION!');
  process.exit(1);
}
