import {
  createInitialGameState,
  executeComboAttack,
  checkGameOver,
  ActionCard,
} from '../src/engine/gameEngine';

console.log('=== TEST: Lethal Combo Strike & Finisher Delay ===');

let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA');
state.phase = 'COMBO_STEP';
state.activePlayerIndex = 0;
state.players[0].comboCount = 2;
state.players[0].concertoZone = [{ id: 'c1', nameKr: '협주1' } as any];

// Opponent HP is 3
state.players[1].hp = 3;

// P0 plays a 4-damage combo card (Lethal!)
const comboCard: ActionCard = {
  id: 'test-combo-lethal',
  code: 'SD01-011',
  nameKr: '뤄거용 부적',
  cost: 1,
  damage: 4,
  speed: 12,
  color: 'RED',
  description: '',
  artUrl: '/cards/card_images/SD01-011.webp',
  kind: 'ACTION',
  cardType: 'ACTION',
};
state.players[0].hand = [comboCard];

// Execute combo attack
const res = executeComboAttack(state, 0, comboCard.id);
if (!res.success) {
  throw new Error(`executeComboAttack failed: ${res.error}`);
}

state = res.newState;

console.log('1. Post-attack state:');
console.log('   Opponent HP:', state.players[1].hp);
console.log('   Game Phase:', state.phase);
console.log('   LastComboStrike exists?:', Boolean(state.lastComboStrike));
console.log('   Is lethal flag set?:', state.lastComboStrike?.isLethal);

if (state.players[1].hp !== 0) {
  throw new Error(`Expected opponent HP 0, got ${state.players[1].hp}`);
}

// Phase MUST NOT be GAME_OVER yet! It must remain COMBO_STEP while combo strike is displayed!
if (state.phase === 'GAME_OVER') {
  throw new Error('CRITICAL BUG: Phase became GAME_OVER prematurely before user dismissed combo strike!');
}

if (!state.lastComboStrike?.isLethal) {
  throw new Error('Expected isLethal to be true on lastComboStrike!');
}

// 2. User confirms/clicks combo overlay -> clearLastComboStrike triggers checkGameOver
console.log('2. Simulating user click on ComboStrikeOverlay (clearLastComboStrike):');
state.lastComboStrike = null;
state = checkGameOver(state);

console.log('   Phase after user dismissed combo strike:', state.phase);
console.log('   Winner:', state.winner);

if (state.phase !== 'GAME_OVER') {
  throw new Error(`Expected GAME_OVER after dismiss, got ${state.phase}`);
}
if (state.winner !== 0) {
  throw new Error(`Expected winner 0, got ${state.winner}`);
}

console.log('LETHAL COMBO FINISHER TEST PASSED 100%!');
