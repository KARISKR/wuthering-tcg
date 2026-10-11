import {
  createInitialGameState,
  upgradeCharacter,
  setClashCard,
  proceedAfterClashReveal,
  executeComboAttack,
  finishComboStep,
  executeEndPhase,
  getAllCardsInSlot,
  resolveClash,
} from '../src/engine/gameEngine';
import { ActionCard, CharacterCard } from '../src/types/tcg';

console.log('=== TEST 1: RED VICTORY UNLIMITED COMBO ===');
let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL');
state.phase = 'ACTION_PHASE';
state.activePlayerIndex = 0;

const p0 = state.players[0];
const p1 = state.players[1];

const redCard: ActionCard = {
  id: 'test-red-card',
  code: 'TEST-RED',
  nameKr: '테스트 적색 타격',
  kind: 'ACTION',
  color: 'RED',
  cost: 0,
  damage: 3,
  speed: 5,
  description: '테스트 적색 카드',
  artUrl: '',
};

const greenCard: ActionCard = {
  id: 'test-green-card',
  code: 'TEST-GREEN',
  nameKr: '테스트 녹색 방어',
  kind: 'ACTION',
  color: 'GREEN',
  cost: 0,
  damage: 2,
  speed: 2,
  description: '테스트 녹색 카드',
  artUrl: '',
};

p0.clashCard = redCard;
p0.clashCardReady = true;
p1.clashCard = greenCard;
p1.clashCardReady = true;

const comboRed1: ActionCard = { ...redCard, id: 'combo-1', nameKr: '연격 1' };
const comboRed2: ActionCard = { ...redCard, id: 'combo-2', nameKr: '연격 2' };
const comboRed3: ActionCard = { ...redCard, id: 'combo-3', nameKr: '연격 3' };
p0.hand = [comboRed1, comboRed2, comboRed3];
p0.concertoZone = [{ ...redCard, id: 'c1' }, { ...redCard, id: 'c2' }, { ...redCard, id: 'c3' }];

state = resolveClash(state);
state = proceedAfterClashReveal(state);

const res1 = executeComboAttack(state, 0, 'combo-1');
console.log('Combo 1 success:', res1.success, 'P0 comboCount:', res1.newState.players[0].comboCount, 'Phase:', res1.newState.phase);
state = res1.newState;

const res2 = executeComboAttack(state, 0, 'combo-2');
console.log('Combo 2 success:', res2.success, 'P0 comboCount:', res2.newState.players[0].comboCount, 'Phase:', res2.newState.phase);
state = res2.newState;

const res3 = executeComboAttack(state, 0, 'combo-3');
console.log('Combo 3 success:', res3.success, 'P0 comboCount:', res3.newState.players[0].comboCount);
state = res3.newState;

console.log('After all 3 combos, ActionArea length:', state.players[0].actionArea?.length);

console.log('\n=== TEST 2: JINHSI CHARACTER SKILL STACKING (Lv.0 -> Lv.1 -> Lv.2) ===');
// Jinhsi Lv.0 (BP01-030): 적색 배틀 시 상대에게 1 피해
// Jinhsi Lv.1 (BP01-029): 적색 승리 시 상대에게 +2 추가 피해
// Jinhsi Lv.2 (SD02-005): 콤보 적색 카드 데미지 +1
let jinhsiState = createInitialGameState('STARTER_CHIXIA', 'STARTER_ROVER', 'SOLO_DUAL');
jinhsiState.phase = 'ACTION_PHASE';
jinhsiState.activePlayerIndex = 0;

const jp0 = jinhsiState.players[0];
const jp1 = jinhsiState.players[1];

// Set Jinhsi Lv.0 as Leader
const jinhsiLv0: CharacterCard = {
  id: 'jinhsi-lv0',
  code: 'BP01-030',
  characterName: '금희',
  nameKr: '금희',
  level: 0,
  element: '회절',
  artUrl: '',
  description: '【리더】【배틀】자신이 적색 카드로 배틀 시, 상대에게 데미지를 1pt 입힌다.',
};

const jinhsiLv1: CharacterCard = {
  id: 'jinhsi-lv1',
  code: 'BP01-029',
  characterName: '금희',
  nameKr: '금희',
  level: 1,
  element: '회절',
  artUrl: '',
  description: '【리더】【판정】자신이 적색 카드로 승리했을 경우, 상대에게 데미지를 2pt 입힌다.',
};

const jinhsiLv2: CharacterCard = {
  id: 'jinhsi-lv2',
  code: 'SD02-005',
  characterName: '금희',
  nameKr: '금희',
  level: 2,
  element: '회절',
  artUrl: '',
  description: '【리더】자신의 적색 카드가 『【콤보】이 카드의 데미지 +1.』 효과를 획득한다.',
};

jp0.slots.leader = jinhsiLv0;
jp0.characterDeck = [jinhsiLv1, jinhsiLv2];
jp0.hand = [
  { ...redCard, id: 'h1' },
  { ...redCard, id: 'h2' },
  { ...redCard, id: 'h3' },
];

// Level up to Lv.1
const up1 = upgradeCharacter(jinhsiState, 0, 'leader', jinhsiLv1.id, ['h1']);
console.log('Upgrade to Lv.1 success:', up1.success);
jinhsiState = up1.newState;

// Simulate next turn for Lv.2 upgrade
jinhsiState.players[0].actionFlags.upgraded = false;

// Level up to Lv.2
const up2 = upgradeCharacter(jinhsiState, 0, 'leader', jinhsiLv2.id, ['h2', 'h3']);
console.log('Upgrade to Lv.2 success:', up2.success);
jinhsiState = up2.newState;

const cardsInLeaderSlot = getAllCardsInSlot(jinhsiState.players[0].slots.leader);
console.log('Leader slot stacked cards:', cardsInLeaderSlot.map(c => `${c.nameKr} Lv.${c.level} [${c.code}]`));

// Now test battle with stacked Jinhsi:
// 1. Battle Step: Jinhsi Lv.0 skill (1 damage to opp)
// 2. Judgment Step: base dmg (3) + Jinhsi Lv.1 skill (2 damage) = 5 damage
// 3. Combo Step: base dmg (2) + Jinhsi Lv.2 skill (1 damage) = 3 damage
const jP0 = jinhsiState.players[0];
const jP1 = jinhsiState.players[1];
jP1.hp = 20;

jP0.hand = [{ ...redCard, id: 'j-clash', cost: 0, damage: 3 }, { ...redCard, id: 'j-combo', cost: 0, damage: 2 }];
jP0.concertoZone = [{ ...redCard, id: 'jc1' }];
jP1.hand = [{ ...greenCard, id: 'j-opp-clash', cost: 0, damage: 2 }];

jinhsiState.phase = 'CLASH_SET';
jinhsiState = setClashCard(jinhsiState, 0, 'j-clash').newState;
console.log('After P0 set RED card, P1 HP (should take 1 dmg from Lv.0 battle skill):', jinhsiState.players[1].hp);

jinhsiState = setClashCard(jinhsiState, 1, 'j-opp-clash').newState;
console.log('After Clash Judgment, P1 HP (should take 3 base + 2 from Lv.1 judgment skill = 5 dmg):', jinhsiState.players[1].hp);

jinhsiState = proceedAfterClashReveal(jinhsiState);
console.log('Phase after clash:', jinhsiState.phase);

const comboRes = executeComboAttack(jinhsiState, 0, 'j-combo');
console.log('Combo success:', comboRes.success);
console.log('After Combo, P1 HP (should take 2 base + 1 from Lv.2 combo skill = 3 dmg):', comboRes.newState.players[1].hp);

// Now finish combo and check actionArea moved to dropZone at endPhase
let endState = finishComboStep(comboRes.newState, 0);
console.log('After finishComboStep, Phase:', endState.phase);
console.log('ActionArea length before endPhase:', endState.players[0].actionArea?.length);
endState = executeEndPhase(endState);
console.log('After executeEndPhase, ActionArea length (should be 0):', endState.players[0].actionArea?.length);
console.log('DropZone has clash & combo cards:', endState.players[0].dropZone.length > 0);
