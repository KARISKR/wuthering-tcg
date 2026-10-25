import { createInitialGameState, upgradeCharacter, addCardsToDropZone, resolvePendingChoice } from '../src/engine/gameEngine';
import { CharacterCard, ActionCard } from '../src/types/tcg';

let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI');
const p0 = state.players[0];

// 파수인 Lv.1(BP01-009)을 리더 슬롯에 배치
const sh1: CharacterCard = {
  id: 'test-sh1',
  code: 'BP01-009',
  nameKr: '파수인',
  kind: 'CHARACTER',
  level: 1,
  characterName: '파수인',
} as any;
p0.slots.leader = sh1;

// 파수인 Lv.2(BP01-006)를 characterDeck에 추가
const sh2: CharacterCard = {
  id: 'test-sh2',
  code: 'BP01-006',
  nameKr: '파수인',
  kind: 'CHARACTER',
  level: 2,
  characterName: '파수인',
} as any;
p0.characterDeck.push(sh2);

// 트래시에 이미 [숨결] 1장이 있다고 가정
const breath1: ActionCard = {
  id: 'breath-1',
  code: 'SD01-014',
  nameKr: '숨결',
  kind: 'ACTION',
  feature: '변주 스킬',
  color: 'RED',
  cost: 0,
  speed: 0,
  damage: 0,
} as any;
p0.dropZone.push(breath1);

// 테스트 1: addCardsToDropZone에 동일한 breath1 카드를 다시 넣으려 할 때 중복 차단 확인
addCardsToDropZone(p0, [breath1]);
console.log('Test 1 - dropZone length after duplicate add:', p0.dropZone.length);
if (p0.dropZone.length !== 1) throw new Error('addCardsToDropZone duplicate protection failed!');

// 테스트 2: 만약 강제로 dropZone에 동일 ID 카드가 2개 있었더라도 모달(revealedCards)에는 1개만 노출되는지 확인
p0.dropZone.push({ ...breath1 }); // 강제 중복 주입
console.log('Force injected duplicate. Dropzone length:', p0.dropZone.length);

// 손패에서 2장 버릴 카드
const discard1: ActionCard = {
  id: 'discard-1',
  code: 'SD01-010',
  nameKr: '투쟁의 마음',
  kind: 'ACTION',
  color: 'BLUE',
  cost: 0,
  speed: 0,
  damage: 0,
} as any;
const discard2: ActionCard = {
  id: 'discard-2',
  code: 'SD01-011',
  nameKr: '뜨거운 불길',
  kind: 'ACTION',
  color: 'RED',
  cost: 0,
  speed: 0,
  damage: 0,
} as any;
p0.hand.push(discard1, discard2);

const res = upgradeCharacter(state, 0, 'leader', 'test-sh2', ['discard-1', 'discard-2']);
console.log('PendingChoice title:', res.newState.pendingChoice?.title);
console.log('revealedCards count:', res.newState.pendingChoice?.revealedCards.length);
console.log('revealedCards:', res.newState.pendingChoice?.revealedCards.map(c => `${c.nameKr} (${c.id})`));

if (res.newState.pendingChoice?.revealedCards.length !== 1) {
  throw new Error('revealedCards duplicate de-duplication failed!');
}
console.log('Test 2 PASS: revealedCards is de-duplicated to exactly 1 card!');

// 테스트 3: RECOVER_FROM_DROP 실행 시 트래시에서 1개만 빠지고 패에 1개만 추가되는지 확인
const beforeHand = res.newState.players[0].hand.length;
const resolvedState = resolvePendingChoice(res.newState, ['breath-1']);
console.log('Hand length after recovery:', resolvedState.players[0].hand.length);
console.log('Hand cards:', resolvedState.players[0].hand.map(c => `${c.nameKr} (${c.id})`));
if (resolvedState.players[0].hand.length !== beforeHand + 1) {
  throw new Error('Hand count mismatch after recovery!');
}
console.log('Test 3 PASS: Clean 1:1 recovery from drop zone confirmed!');
