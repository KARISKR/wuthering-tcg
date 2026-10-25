
import { createInitialGameState, executeComboAttack } from '../src/engine/gameEngine';
import { OFFICIAL_CARDS } from '../src/data/officialCards';
import { CharacterCard, ActionCard } from '../src/types/tcg';

let state = createInitialGameState();
const sh0 = OFFICIAL_CARDS.find(c => c.code === 'BP01-010') as CharacterCard; // 파수인 Lv.0
const chixia0 = OFFICIAL_CARDS.find(c => c.code === 'SD01-006') as CharacterCard; // 치샤 Lv.0
const yang0 = OFFICIAL_CARDS.find(c => c.code === 'SD01-003') as CharacterCard; // 양양 Lv.0

state.players[0].slots = {
  leader: { ...sh0, id: 'sh0' },
  leftSupport: { ...yang0, id: 'yang0' },
  rightSupport: { ...chixia0, id: 'chixia0' },
};

const leap = OFFICIAL_CARDS.find(c => c.code === 'SD01-009' && c.kind === 'ACTION') as ActionCard;
const dodge = OFFICIAL_CARDS.find(c => c.code === 'BP01-069' && c.kind === 'ACTION') as ActionCard;

state.players[0].hand = [{ ...leap, id: 'leap-1' }];
state.players[0].actionArea = [{ ...dodge, id: 'dodge-1' }];
state.players[0].comboCount = 1;
state.players[0].concertoZone = [];
state.phase = 'COMBO_STEP';

console.log('Testing executeComboAttack...');
const res = executeComboAttack(state, 0, 'leap-1', undefined, undefined, 'rightSupport');
console.log('res.success:', res.success);
console.log('res.error:', res.error);
