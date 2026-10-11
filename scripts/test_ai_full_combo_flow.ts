import {
  createInitialGameState,
  resolveClash,
  proceedAfterClashReveal,
  canPlayerUseActionCard,
  getAllCardsInSlot,
} from '../src/engine/gameEngine';
import { runAiComboStep } from '../src/engine/aiPlayer';

export function canPlayerExecuteCombo(player: any): boolean {
  if (!player.comboUnlimited && player.comboCount <= 0) return false;
  return player.hand.some((c: any) => {
    if (c.color !== 'RED') return false;
    const effectiveCost = getAllCardsInSlot(player.slots.leader).some(
      (ch: any) => ch.characterName === '금희' && ch.level >= 1
    )
      ? Math.max(0, c.cost - 1)
      : c.cost;
    return player.concertoZone.length >= effectiveCost && canPlayerUseActionCard(player.slots, c).canUse;
  });
}

console.log('=== TEST 1: AI wins with RED but has 0 concerto & all red cards cost > 0 ===');
let state1 = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI');
// Set P1 to have 0 concerto and only high cost red cards
state1.players[1].concertoZone = [];
state1.players[1].hand = [
  { id: 'c1', code: 'C1', nameKr: '비싼 적색', kind: 'ACTION', color: 'RED', cost: 2, damage: 3 },
  { id: 'c2', code: 'C2', nameKr: '청색 방어', kind: 'ACTION', color: 'BLUE', cost: 0, damage: 0 },
] as any;
const p1Can = canPlayerExecuteCombo(state1.players[1]);
console.log('Can P1 combo?:', p1Can); // Should be false!

console.log('\n=== TEST 2: AI wins with RED, has 2 playable red cards ===');
let state2 = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI');
const p1LeaderName = state2.players[1].slots.leader.characterName;
state2.players[1].hand = [
  { id: 'r1', code: 'R1', nameKr: '무료 적색 1', kind: 'ACTION', color: 'RED', cost: 0, damage: 2, characterExclusive: p1LeaderName },
  { id: 'r2', code: 'R2', nameKr: '무료 적색 2', kind: 'ACTION', color: 'RED', cost: 0, damage: 2, characterExclusive: p1LeaderName },
  { id: 'b1', code: 'B1', nameKr: '청색 방어', kind: 'ACTION', color: 'BLUE', cost: 0, damage: 0 },
] as any;
state2.players[1].comboUnlimited = true;
state2.players[1].comboCount = 99;
state2.phase = 'COMBO_STEP';

console.log('P1 hand before combo:', state2.players[1].hand.map(c => c.nameKr));
console.log('Phase before:', state2.phase);

// 1st combo step
let s2_after1 = runAiComboStep(state2, 1);
console.log('After 1st combo: Phase =', s2_after1.phase, 'Hand =', s2_after1.players[1].hand.map(c => c.nameKr));

// 2nd combo step
let s2_after2 = runAiComboStep(s2_after1, 1);
console.log('After 2nd combo: Phase =', s2_after2.phase, 'Hand =', s2_after2.players[1].hand.map(c => c.nameKr));

// 3rd combo step (no more playable red cards)
let s2_after3 = runAiComboStep(s2_after2, 1);
console.log('After 3rd combo: Phase =', s2_after3.phase, 'P1 comboCount =', s2_after3.players[1].comboCount, 'P1 comboUnlimited =', s2_after3.players[1].comboUnlimited);
