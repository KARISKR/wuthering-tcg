import {
  createInitialGameState,
  setClashCard,
  finishClashJudgment,
  proceedAfterClashReveal,
  continuePostClashOrBattlePhase,
  resolvePendingChoice,
  ActionCard,
  CharacterCard,
} from '../src/engine/gameEngine';

console.log('=== TEST: Shorekeeper Lv.2 Clash Heal & Effect Draw Continuation ===');

let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA');
state.phase = 'CLASH_REVEAL';

// P0 leader is Shorekeeper Lv.2 [BP01-006]
const shLv2: CharacterCard = {
  id: 'test-sh2',
  code: 'BP01-006',
  nameKr: '파수인',
  characterName: '파수인',
  level: 2,
  element: 'AERO',
  weapon: 'RECTIFIER',
  rarity: 'R',
  hp: 20,
  description: '[상시] 생명력 회복 시 1장 드로우 (1턴 2회)',
  artUrl: '/cards/card_images/BP01-006_파수인_1906.webp',
  kind: 'CHARACTER',
  role: 'LEADER',
};

state.players[0].slots.leader = shLv2;
state.players[0].hp = 18;
state.players[0].maxHp = 20;

// P0 plays heal card: 근원의 추구 · 회피 (Cost 0, Blue, Heal 1)
const p0Card: ActionCard = {
  id: 'test-heal-card',
  code: 'BP01-053',
  nameKr: '근원의 추구 · 회피',
  cost: 0,
  damage: 0,
  speed: 0,
  color: 'BLUE',
  description: '[배틀] 자신이 승리했을 경우, 자신의 생명력을 1pt 회복한다.',
  artUrl: '/cards/card_images/BP01-053.webp',
  kind: 'ACTION',
  cardType: 'ACTION',
  isEvasion: true,
  effectType: 'HEAL',
};

// P1 plays RED card
const p1Card: ActionCard = {
  id: 'test-red-card',
  code: 'BP01-001',
  nameKr: '만년적설',
  cost: 1,
  damage: 3,
  speed: 9,
  color: 'RED',
  description: '',
  artUrl: '/cards/card_images/BP01-001.webp',
  kind: 'ACTION',
  cardType: 'ACTION',
};

// Set clash cards directly
state.players[0].clashCard = p0Card;
state.players[0].clashCardReady = true;
state.players[1].clashCard = p1Card;
state.players[1].clashCardReady = true;

// 1. Finish clash judgment
state = finishClashJudgment(state);

console.log('1. Clash Judgment Done:');
console.log('   Winner:', state.clashResult?.winnerIndex);
console.log('   P0 HP (after heal):', state.players[0].hp);
console.log('   LastEffectDraw active?:', Boolean(state.lastEffectDraw));
console.log('   LastEffectDraw source:', state.lastEffectDraw?.sourceCardName);

if (state.players[0].hp !== 19) {
  throw new Error(`Expected P0 HP 19, got ${state.players[0].hp}`);
}

if (!state.lastEffectDraw || !state.lastEffectDraw.sourceCardName.includes('파수인 Lv.2')) {
  throw new Error('Expected lastEffectDraw to be set for Shorekeeper Lv.2 heal draw!');
}

// 2. User dismisses ClashAnimationOverlay -> proceedAfterClashReveal
state = proceedAfterClashReveal(state);

console.log('2. Proceed After Clash Reveal:');
console.log('   ClashResult is null?:', state.clashResult === null);
console.log('   Phase:', state.phase);

if (state.clashResult !== null) {
  throw new Error('Expected clashResult to be null!');
}

// 3. EffectDrawOverlay completes and handleFinishEffectDraw calls continuePostClashOrBattlePhase
console.log('3. Simulating handleFinishEffectDraw completion:');
state.lastEffectDraw = null;
state = continuePostClashOrBattlePhase(state);

console.log('   Phase after finish effect draw:', state.phase);
console.log('   Is game stuck in CLASH_REVEAL?:', state.phase === 'CLASH_REVEAL');

if (state.phase === 'CLASH_REVEAL') {
  throw new Error('CRITICAL BUG: Game is stuck in CLASH_REVEAL!');
}

console.log('SUCCESS! Shorekeeper Lv.2 Heal Draw flow tested 100%!');
