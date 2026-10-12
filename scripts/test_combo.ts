import {
  createInitialGameState,
  selectStartingLeader,
  executeMulligan,
  chargeConcerto,
  decideClash,
  setClashCard,
  proceedAfterClashReveal,
  executeComboAttack,
  finishComboStep,
  canPlayerExecuteCombo,
} from '../src/engine/gameEngine';
import { ACTION_CARD_TEMPLATES } from '../src/data/cards';

console.log('--- TEST 2: P0 wins with RED, BUT has a RED card with cost 1 and 0 concerto ---');
let state2 = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL');
state2 = selectStartingLeader(state2, 0, state2.players[0].slots.leader.id);
state2 = selectStartingLeader(state2, 1, state2.players[1].slots.leader.id);
state2 = executeMulligan(state2, [], []);

const clashRed = ACTION_CARD_TEMPLATES.find(c => c.code === 'SD01-007')!; // 치샤 일반 공격 Red cost 0
const cost1Red = ACTION_CARD_TEMPLATES.find(c => c.code === 'SD01-010')!; // 투쟁의 마음 Red cost 1
const oppGreen = ACTION_CARD_TEMPLATES.find(c => c.code === 'SD02-020')!; // 스캔 방랑자(남) Green cost 0

state2.players[0].hand = [
  { ...clashRed, id: 'clash-red-1' },
  { ...cost1Red, id: 'combo-red-cost-1' }
];
state2.players[0].concertoZone = []; // 0 concerto!
state2.players[1].hand = [
  { ...oppGreen, id: 'opp-green-1' }
];

state2 = decideClash(state2, true);
state2 = setClashCard(state2, 0, 'clash-red-1').newState;
state2 = setClashCard(state2, 1, 'opp-green-1').newState;

console.log('TEST 2 Phase before proceed:', state2.phase);
console.log('TEST 2 P0 comboUnlimited before proceed:', state2.players[0].comboUnlimited);
console.log('TEST 2 canPlayerExecuteCombo(p0):', canPlayerExecuteCombo(state2.players[0]));
state2 = proceedAfterClashReveal(state2);
console.log('TEST 2 Phase after proceed:', state2.phase);
console.log('TEST 2 P0 comboUnlimited after proceed:', state2.players[0].comboUnlimited);
console.log('TEST 2 logs around clash:', state2.logs.slice(-3).map(l => l.text));
