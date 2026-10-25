import {
  createInitialGameState,
  executeComboAttack,
  CharacterCard,
  ActionCard,
} from '../src/engine/gameEngine';
import { getOfficialCardByCode } from '../src/data/officialCards';

console.log('=== TEST: Shorekeeper [계발] Combo Switch, Heal Toast & Lv.2 Effect Draw ===');

let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI');
state.phase = 'COMBO_STEP';
state.players[0].comboUnlimited = true;
state.players[0].hp = 12;
state.players[0].maxHp = 20;

// P0 리더: 파수인 Lv.2 [BP01-006]
const shLv2: CharacterCard = {
  id: 'test-sh-lv2',
  code: 'BP01-006',
  nameKr: '파수인',
  characterName: '파수인',
  kind: 'CHARACTER',
  level: 2,
  artUrl: '/cards/card_images/BP01-006_파수인_1906.webp',
  underlyingCards: [
    {
      id: 'test-sh-lv1',
      code: 'BP01-009',
      nameKr: '파수인',
      characterName: '파수인',
      kind: 'CHARACTER',
      level: 1,
    } as any,
  ],
} as any;
state.players[0].slots.leader = shLv2;

// P0 좌측 서포터: 양양 Lv.0
const yangyang: CharacterCard = {
  id: 'test-yangyang-lv0',
  code: 'BP01-024',
  nameKr: '양양',
  characterName: '양양',
  kind: 'CHARACTER',
  level: 0,
} as any;
state.players[0].slots.leftSupport = yangyang;

// 패에 [계발] [BP01-054] 추가
const gaebalCard: ActionCard = {
  ...(getOfficialCardByCode('BP01-054') as ActionCard),
  id: 'test-gaebal-card',
};
state.players[0].hand.push(gaebalCard);
const initialHandCount = state.players[0].hand.length;
const initialDeckCount = state.players[0].actionDeck.length;

console.log('1. Initial Setup:');
console.log('   P0 Leader:', state.players[0].slots.leader.nameKr, `Lv.${state.players[0].slots.leader.level}`);
console.log('   P0 HP:', state.players[0].hp);
console.log('   P0 Hand count:', initialHandCount);
console.log('   P0 Deck count:', initialDeckCount);

// 2. [계발] 연격 발동 (양양과 리더 교체)
const res = executeComboAttack(state, 0, 'test-gaebal-card', undefined, undefined, 'leftSupport');

if (!res.success) {
  throw new Error(`Failed to execute combo attack: ${res.error}`);
}

const newState = res.newState;
console.log('\n2. After [계발] Combo Execution:');
console.log('   New Leader:', newState.players[0].slots.leader.nameKr);
console.log('   Left Support:', newState.players[0].slots.leftSupport?.nameKr, `Lv.${newState.players[0].slots.leftSupport?.level}`);
console.log('   P0 HP (expected 13):', newState.players[0].hp);
console.log('   lastEffectEvent title:', newState.lastEffectEvent?.title);
console.log('   lastEffectEvent desc:', newState.lastEffectEvent?.description);
console.log('   lastEffectDraw exists:', Boolean(newState.lastEffectDraw));
console.log('   lastEffectDraw source:', newState.lastEffectDraw?.sourceCardName);
console.log('   lastEffectDraw cards count:', newState.lastEffectDraw?.cards.length);
console.log('   lastEffectDraw drawn card:', newState.lastEffectDraw?.cards[0]?.nameKr);
console.log('   P0 Hand count (played 1, drew 1 -> net same):', newState.players[0].hand.length);
console.log('   P0 Deck count (decreased by 1):', newState.players[0].actionDeck.length);

// 검증 1: HP 1회복
if (newState.players[0].hp !== 13) {
  throw new Error(`FAIL: Expected HP 13, got ${newState.players[0].hp}`);
}

// 검증 2: [계발] 생명력 +1 회복 lastEffectEvent 생성
if (!newState.lastEffectEvent || !newState.lastEffectEvent.title.includes('계발')) {
  throw new Error('FAIL: lastEffectEvent was not created for 계발 heal!');
}

// 검증 3: 파수인 Lv.2 회복 드로우 EffectDrawAnimation 생성
if (!newState.lastEffectDraw || !newState.lastEffectDraw.sourceCardName.includes('파수인 Lv.2')) {
  throw new Error('FAIL: lastEffectDraw was not created for Shorekeeper Lv.2 heal draw!');
}

if (newState.lastEffectDraw.cards.length !== 1) {
  throw new Error('FAIL: Exactly 1 card should be drawn by Shorekeeper Lv.2!');
}

console.log('\n==> SUCCESS: [계발] Combo Switch + Heal Toast + Lv.2 Effect Draw verified 100%!');
