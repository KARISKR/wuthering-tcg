import {
  createInitialGameState,
  switchLeader,
  resolvePendingChoice,
  CharacterCard,
  ActionCard,
} from '../src/engine/gameEngine';

console.log('=== TEST: Shorekeeper Lv.1 [BP01-008] Switch Skill Test ===');

let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI');
state.phase = 'ACTION_PHASE';
state.activePlayerIndex = 0;

// P0 리더: 방랑자 Lv.0, 서포터: 파수인 Lv.1 [BP01-008]
const shLv1_008: CharacterCard = {
  id: 'sh-008-test',
  code: 'BP01-008',
  nameKr: '파수인',
  characterName: '파수인',
  kind: 'CHARACTER',
  level: 1,
  artUrl: '/cards/card_images/BP01-008.webp',
} as any;
state.players[0].slots.leftSupport = shLv1_008;

const initialHandCount = state.players[0].hand.length;
console.log('Initial hand count:', initialHandCount);

// 리더를 파수인으로 교체 (switchLeader)
const res = switchLeader(state, 0, 'leftSupport');

console.log('1. After switchLeader:');
console.log('   New leader:', res.newState.players[0].slots.leader.characterName);
console.log('   Hand count after draw:', res.newState.players[0].hand.length);
console.log('   lastEffectDraw exists:', Boolean(res.newState.lastEffectDraw));
console.log('   lastEffectDraw cards count:', res.newState.lastEffectDraw?.cards.length);
console.log('   lastEffectDraw source:', res.newState.lastEffectDraw?.sourceCardName);
console.log('   pendingChoice exists:', Boolean(res.newState.pendingChoice));
console.log('   pendingChoice title:', res.newState.pendingChoice?.title);
console.log('   pendingChoice onResolveType:', res.newState.pendingChoice?.onResolveType);
console.log('   pendingChoice revealedCards count:', res.newState.pendingChoice?.revealedCards.length);

if (!res.newState.lastEffectDraw) {
  throw new Error('FAIL: lastEffectDraw was not created on BP01-008 switch!');
}
if (!res.newState.pendingChoice || res.newState.pendingChoice.onResolveType !== 'DISCARD_FROM_HAND') {
  throw new Error('FAIL: DISCARD_FROM_HAND pendingChoice was not created for human player!');
}
console.log('==> SUCCESS 1: Shorekeeper Lv.1 switch created draw overlay + discard choice modal!');

// 2. 유저가 패에서 1장을 선택하여 버리는 동작 검증
const cardToDiscard = res.newState.players[0].hand[0];
console.log('\n2. User chooses to discard:', cardToDiscard.nameKr, cardToDiscard.id);
const resolved = resolvePendingChoice(res.newState, [cardToDiscard.id]);

console.log('   Hand count after discard:', resolved.players[0].hand.length);
console.log('   DropZone count:', resolved.players[0].dropZone.length);
console.log('   DropZone last card:', resolved.players[0].dropZone[resolved.players[0].dropZone.length - 1]?.nameKr);

if (resolved.players[0].hand.length !== initialHandCount) {
  throw new Error(`FAIL: Hand count should be ${initialHandCount} (draw 1 then discard 1) but got ${resolved.players[0].hand.length}`);
}
if (!resolved.players[0].dropZone.some(c => c.id === cardToDiscard.id)) {
  throw new Error('FAIL: Discarded card not found in dropZone!');
}
console.log('==> SUCCESS 2: User-selected discard cleanly moved to dropZone!');
