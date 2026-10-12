import { createInitialGameState, upgradeCharacter, findAllUpgradableCards } from '../src/engine/gameEngine';
import { CharacterCard } from '../src/types/tcg';

console.log('--- Testing Same-Level Character Upgrade (Lv.2 -> Lv.2) ---');

let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA');
const p0 = state.players[0];

// Case A: 일반 Lv.2 -> 다른 Lv.2 레벨업 (스택 유지 검증)
const generalLv2_A: CharacterCard = {
  id: 'gen-lv2-a',
  kind: 'CHARACTER',
  code: 'BP01-GEN-A',
  characterName: '방랑자(남)',
  nameKr: '방랑자(남) A',
  level: 2,
  element: '회절',
  artUrl: '',
  description: '테스트 방랑자 A',
};

const generalLv2_B: CharacterCard = {
  id: 'gen-lv2-b',
  kind: 'CHARACTER',
  code: 'BP01-GEN-B',
  characterName: '방랑자(남)',
  nameKr: '방랑자(남) B',
  level: 2,
  element: '회절',
  artUrl: '',
  description: '테스트 방랑자 B',
};

p0.slots.leader = { ...generalLv2_A };
p0.characterDeck.push({ ...generalLv2_B });
p0.hand = [
  { id: 'act-1', kind: 'ACTION', code: 'A1', nameKr: '카드 1', color: 'RED', cost: 0, damage: 2, artUrl: '', description: '' },
  { id: 'act-2', kind: 'ACTION', code: 'A2', nameKr: '카드 2', color: 'BLUE', cost: 0, damage: 1, artUrl: '', description: '' },
];
p0.actionFlags.upgraded = false;
state.phase = 'ACTION_PHASE';

// 1. findAllUpgradableCards 테스트
const upgradables = findAllUpgradableCards(p0.characterDeck, p0.slots.leader);
console.log('1. Upgradable cards found for Rover Lv.2:', upgradables.map(c => `${c.nameKr} (Lv.${c.level})`));
if (!upgradables.some(c => c.id === 'gen-lv2-b')) {
  console.error('FAIL: gen-lv2-b should be found in upgradables!');
  process.exit(1);
}

// 2. upgradeCharacter 테스트
const resA = upgradeCharacter(state, 0, 'leader', 'gen-lv2-b', ['act-1', 'act-2']);
console.log('2. Upgrade result success:', resA.success, resA.error || '');
if (!resA.success) {
  console.error('FAIL: Upgrade should succeed for Lv.2 -> Lv.2!');
  process.exit(1);
}

const updatedLeaderA = resA.newState.players[0].slots.leader;
console.log('3. Updated Leader:', updatedLeaderA.nameKr, 'Lv.' + updatedLeaderA.level);
console.log('4. Underlying cards stack length:', updatedLeaderA.underlyingCards?.length);

if (updatedLeaderA.id !== 'gen-lv2-b' || updatedLeaderA.level !== 2) {
  console.error('FAIL: Leader was not properly upgraded to Lv.2 B!');
  process.exit(1);
}
if (!updatedLeaderA.underlyingCards || updatedLeaderA.underlyingCards.length !== 1 || updatedLeaderA.underlyingCards[0].id !== 'gen-lv2-a') {
  console.error('FAIL: Previous Lv.2 A was not preserved in underlyingCards stack!');
  process.exit(1);
}

console.log('Case A PASSED: General Lv.2 -> Lv.2 upgrade stacks card correctly.');

// Case B: 공식 Q&A Q6 카멜리아 BP01-001 Lv.2 -> BP01-002 Lv.2 레벨업 시 덱 회수 효과 검증
const camellyaLv2_001: CharacterCard = {
  id: 'cam-001',
  kind: 'CHARACTER',
  code: 'BP01-001',
  characterName: '카멜리아',
  nameKr: '카멜리아 [BP01-001]',
  level: 2,
  element: '인멸',
  artUrl: '',
  description: '카멜리아 001',
};
const camellyaLv2_002: CharacterCard = {
  id: 'cam-002',
  kind: 'CHARACTER',
  code: 'BP01-002',
  characterName: '카멜리아',
  nameKr: '카멜리아 [BP01-002]',
  level: 2,
  element: '인멸',
  artUrl: '',
  description: '카멜리아 002',
};

let stateB = resA.newState;
const p0B = stateB.players[0];
p0B.slots.leader = { ...camellyaLv2_001 };
p0B.characterDeck.push({ ...camellyaLv2_002 });
p0B.hand = [
  { id: 'act-3', kind: 'ACTION', code: 'A3', nameKr: '카드 3', color: 'RED', cost: 0, damage: 2, artUrl: '', description: '' },
  { id: 'act-4', kind: 'ACTION', code: 'A4', nameKr: '카드 4', color: 'BLUE', cost: 0, damage: 1, artUrl: '', description: '' },
];
p0B.actionFlags.upgraded = false;

const resB = upgradeCharacter(stateB, 0, 'leader', 'cam-002', ['act-3', 'act-4']);
if (!resB.success) {
  console.error('FAIL: Camellya Lv.2 -> Lv.2 upgrade failed!');
  process.exit(1);
}

const updatedCamLeader = resB.newState.players[0].slots.leader;
console.log('5. Camellya Updated Leader:', updatedCamLeader.nameKr, 'Lv.' + updatedCamLeader.level);
const returnedToDeck = resB.newState.players[0].characterDeck.some(c => c.id === 'cam-001');
console.log('6. Camellya [BP01-001] returned to characterDeck (Q&A Q6):', returnedToDeck);

if (!returnedToDeck) {
  console.error('FAIL: Camellya [BP01-001] should be returned to characterDeck!');
  process.exit(1);
}

console.log('Case B PASSED: Camellya Q&A Q6 level-up skill returned to deck correctly.');
console.log('ALL SAME-LEVEL UPGRADE TESTS PASSED PERFECTLY!');
