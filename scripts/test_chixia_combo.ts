import { createInitialGameState, decideClash, setClashCard, resolveClash, executeComboAttack } from '../src/engine/gameEngine';
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

// Player hand has SD01-009 (도약의 불빛)
const leap = OFFICIAL_CARDS.find(c => c.code === 'SD01-009' && c.kind === 'ACTION') as ActionCard;
state.players[0].hand = [{ ...leap, id: 'leap-1' }];
state.players[0].comboCount = 1;
state.phase = 'COMBO_STEP';

console.log('Leader before combo:', state.players[0].slots.leader.nameKr);
console.log('Right support before combo:', state.players[0].slots.rightSupport?.nameKr);
console.log('AI HP before combo:', state.players[1].hp);

const res = executeComboAttack(state, 0, 'leap-1', undefined, undefined, 'rightSupport');
console.log('Success:', res.success);
console.log('Error:', res.error);
if (res.success) {
  const next = res.newState;
  console.log('Leader after combo:', next.players[0].slots.leader.nameKr);
  console.log('Right support after combo:', next.players[0].slots.rightSupport?.nameKr);
  console.log('AI HP after combo:', next.players[1].hp);
  console.log('Last combo strike damage:', next.lastComboStrike?.damage);
  console.log('Recent logs:');
  next.logs.slice(0, 5).forEach(l => console.log(`[${l.type}] ${l.text}`));
}
