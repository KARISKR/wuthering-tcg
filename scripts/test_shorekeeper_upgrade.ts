import { createInitialGameState, upgradeCharacter } from '../src/engine/gameEngine';
import { CharacterCard, ActionCard } from '../src/types/tcg';

// SD01 덱으로 게임 생성
let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI');

// P0의 characterDeck에서 파수인 Lv.1(BP01-009) 찾기
const p0 = state.players[0];
console.log('P0 dropZone at start:', p0.dropZone.length);

// 파수인 Lv.0을 리더로 설정
p0.slots.leader = {
  id: 'test-sh0',
  code: 'BP01-010',
  nameKr: '파수인',
  kind: 'CHARACTER',
  level: 0,
  characterName: '파수인',
} as any;

// 파수인 Lv.1(BP01-009)를 characterDeck에 추가
p0.characterDeck.push({
  id: 'test-sh1',
  code: 'BP01-009',
  nameKr: '파수인',
  kind: 'CHARACTER',
  level: 1,
  characterName: '파수인',
} as any);

// 손패에 숨결(SD01-014) 카드 추가
const breathCard: ActionCard = {
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
p0.hand.push(breathCard);

console.log('Before upgrade: hand has breath-1. dropZone:', p0.dropZone.length);

// 레벨업 실행 (숨결 버리기)
const res = upgradeCharacter(state, 0, 'leader', 'test-sh1', ['breath-1']);
console.log('Upgrade success:', res.success);
console.log('PendingChoice:', res.newState.pendingChoice?.title);
console.log('revealedCards count:', res.newState.pendingChoice?.revealedCards.length);
console.log('revealedCards:', res.newState.pendingChoice?.revealedCards.map(c => `${c.nameKr} (${c.id})`));
console.log('After upgrade dropZone count:', res.newState.players[0].dropZone.length);
console.log('dropZone cards:', res.newState.players[0].dropZone.map(c => `${c.nameKr} (${c.id})`));
