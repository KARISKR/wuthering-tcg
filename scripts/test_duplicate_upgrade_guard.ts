import { createInitialGameState, decideClash, queueChoice, applyCharacterEvolutionSkills } from '../src/engine/gameEngine';
import { OFFICIAL_CARDS } from '../src/data/officialCards';
import { CharacterCard, PendingChoice } from '../src/types/tcg';

console.log('=== TEST 1: queueChoice Idempotency Guard ===');
let state = createInitialGameState();
const choice1: PendingChoice = {
  id: 'choice-1',
  playerIndex: 0,
  title: '매서운 가시 — 산화 레벨업 대상 선택',
  sourceCardName: '매서운 가시 [BP01-076]',
  revealedCards: [],
  minSelect: 1,
  maxSelect: 1,
  onResolveType: 'SELECT_EFFECT_UPGRADE',
  targetSlot: 'leader',
};
const choice2: PendingChoice = {
  id: 'choice-2',
  playerIndex: 0,
  title: '매서운 가시 — 산화 레벨업 대상 선택',
  sourceCardName: '매서운 가시 [BP01-076]',
  revealedCards: [],
  minSelect: 1,
  maxSelect: 1,
  onResolveType: 'SELECT_EFFECT_UPGRADE',
  targetSlot: 'leader',
};

state = queueChoice(state, choice1, true);
console.log('Deferred choices count after 1st push:', state.deferredChoices?.length);
if (state.deferredChoices?.length !== 1) throw new Error('Expected 1 deferred choice');

state = queueChoice(state, choice2, true);
console.log('Deferred choices count after 2nd duplicate push:', state.deferredChoices?.length);
if (state.deferredChoices?.length !== 1) throw new Error('Duplicate choice was not blocked!');

console.log('=== TEST 2: Sanhua Lv.0 -> Lv.1 Evolution Skill ===');
const sanhua0 = OFFICIAL_CARDS.find(c => c.code === 'BP01-033') as CharacterCard;
const sanhua1 = OFFICIAL_CARDS.find(c => c.code === 'BP01-032') as CharacterCard;
const sanhua2 = OFFICIAL_CARDS.find(c => c.code === 'BP01-031') as CharacterCard;

state = createInitialGameState();
state.players[0].dropZone = [OFFICIAL_CARDS.find(c => c.kind === 'ACTION')!];
// Evolve 0 -> 1:
state = applyCharacterEvolutionSkills(state, 0, 'leader', sanhua1, sanhua0, false);
console.log('PendingChoice after 0 -> 1 evolve:', state.pendingChoice?.title);
if (!state.pendingChoice?.title.includes('산화 Lv.1')) {
  throw new Error('Sanhua Lv.1 entry skill should have triggered');
}

console.log('=== TEST 3: Sanhua Lv.1 -> Lv.2 Evolution Skill ===');
state = createInitialGameState();
state.players[0].dropZone = [OFFICIAL_CARDS.find(c => c.kind === 'ACTION')!];
// Evolve 1 -> 2:
state = applyCharacterEvolutionSkills(state, 0, 'leader', sanhua2, sanhua1, false);
console.log('PendingChoice after 1 -> 2 evolve:', state.pendingChoice?.title);
if (!state.pendingChoice?.title.includes('산화 Lv.1')) {
  throw new Error('Underlying Sanhua Lv.1 level-up skill should have triggered upon Lv.2 evolution');
}

console.log('=== TEST 4: Shorekeeper BP01-007 Battle Declaration ===');
const sh2 = OFFICIAL_CARDS.find(c => c.code === 'BP01-007') as CharacterCard;
state = createInitialGameState();
state.players[0].slots.leader = { ...sh2 };
state.players[0].hand = [];
state.activePlayerIndex = 0;
state.phase = 'ACTION_PHASE';

state = decideClash(state, true);
console.log('Phase after decideClash:', state.phase);
console.log('Hand length after decideClash:', state.players[0].hand.length);
console.log('LastEffectDraw source:', state.lastEffectDraw?.sourceCardName);

if (state.phase !== 'CLASH_SET') throw new Error('Phase must be CLASH_SET');
if (state.players[0].hand.length !== 5) throw new Error('Hand must be 5');
if (state.lastEffectDraw?.sourceCardName !== '파수인 Lv.2 [BP01-007]') throw new Error('Draw animation must be queued');

console.log('All tests passed successfully!');
