import { createInitialGameState, decideClash, setClashCard } from '../src/engine/gameEngine';
import { OFFICIAL_CARDS } from '../src/data/officialCards';
import { CharacterCard, ActionCard } from '../src/types/tcg';

const sh2 = OFFICIAL_CARDS.find((c) => c.code === 'BP01-007' && c.kind === 'CHARACTER') as CharacterCard;
let state = createInitialGameState();
state.players[0].slots.leader = { ...sh2, id: 'sh2-test' };
state.players[0].hand = [];
state.activePlayerIndex = 0;
state.phase = 'ACTION_PHASE';

console.log('Before decideClash, hand length:', state.players[0].hand.length);
state = decideClash(state, true);
console.log('After decideClash, phase:', state.phase);
console.log('After decideClash, hand length:', state.players[0].hand.length);
console.log('lastEffectDraw:', state.lastEffectDraw?.sourceCardName, state.lastEffectDraw?.cards.length);
