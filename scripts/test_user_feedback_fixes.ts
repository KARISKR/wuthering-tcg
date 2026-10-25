import {
  createInitialGameState,
  finishClashJudgment,
  proceedAfterClashReveal,
  executeComboAttack,
  executeDrawPhase,
  CharacterCard,
  ActionCard,
} from '../src/engine/gameEngine';
import { getOfficialCardByCode } from '../src/data/officialCards';

console.log('=== TEST: User Feedback Fixes ===');

// --- 1. 혼돈의 이론 [BP01-056] 승리 시 레벨업 모달 선택창 노출 검증 ---
let s1 = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI');
s1.phase = 'CLASH_REVEAL';

// P0 (사람): 리더 파수인 Lv.1
const shLv1: CharacterCard = {
  id: 'sh-lv1-test',
  code: 'BP01-009',
  nameKr: '파수인',
  characterName: '파수인',
  kind: 'CHARACTER',
  level: 1,
} as any;
s1.players[0].slots.leader = shLv1;

// 캐릭터 덱에 파수인 Lv.2 카드 2종 추가 (BP01-006, BP01-007)
const shLv2A: CharacterCard = {
  id: 'sh-lv2-a',
  code: 'BP01-006',
  nameKr: '파수인 (치유형)',
  characterName: '파수인',
  kind: 'CHARACTER',
  level: 2,
} as any;
const shLv2B: CharacterCard = {
  id: 'sh-lv2-b',
  code: 'BP01-007',
  nameKr: '파수인 (드로우형)',
  characterName: '파수인',
  kind: 'CHARACTER',
  level: 2,
} as any;
s1.players[0].characterDeck.push(shLv2A, shLv2B);

// P0가 혼돈의 이론 [BP01-056] 세트 (적색, 속도 11, 데미지 2)
s1.players[0].clashCard = getOfficialCardByCode('BP01-056') as ActionCard;
s1.players[0].clashCardReady = true;

// P1은 파란색 카드 (적색이 청색에 패배하면 안되므로 동색 적색 속도 낮은 카드로 대결)
s1.players[1].clashCard = {
  id: 'opp-c',
  code: 'SD01-011',
  nameKr: '뜨거운 불길',
  kind: 'ACTION',
  color: 'RED',
  speed: 5,
  damage: 0,
} as any;
s1.players[1].clashCardReady = true;

s1 = finishClashJudgment(s1);
console.log('1. Clash finished. Winner:', s1.clashResult?.winnerIndex);
console.log('   Deferred choices count:', s1.deferredChoices?.length);
console.log('   Deferred choice title:', s1.deferredChoice?.title);
console.log('   Revealed cards for upgrade:', s1.deferredChoice?.revealedCards.map(c => `${c.nameKr} (${c.code})`));

if (!s1.deferredChoice || s1.deferredChoice.onResolveType !== 'SELECT_EFFECT_UPGRADE') {
  throw new Error('FAIL: SELECT_EFFECT_UPGRADE was not queued on 혼돈의 이론 win!');
}
if (s1.deferredChoice.revealedCards.length !== 2) {
  throw new Error('FAIL: Both Lv.2 Shorekeeper cards should be presented for choice!');
}
console.log('==> SUCCESS 1: User choice modal correctly deferred for 혼돈의 이론 upgrade!');

// 1B. 모달에서 카드 확정 후 뒤늦은 lastUpgrade 전체화면 팝업이 뜨지 않는지 검증
const choice = s1.deferredChoice!;
s1.pendingChoice = choice;
s1.deferredChoice = null;
const { resolvePendingChoice, getTurnDrawCount } = await import('../src/engine/gameEngine');
const resolvedS1 = resolvePendingChoice(s1, [choice.revealedCards[0]]);
if (resolvedS1.lastUpgrade || resolvedS1.deferredUpgrade) {
  throw new Error('FAIL: lastUpgrade / deferredUpgrade should NOT be set on SELECT_EFFECT_UPGRADE!');
}
if (!resolvedS1.lastEffectEvent || !resolvedS1.lastEffectEvent.title.includes('각성')) {
  throw new Error('FAIL: lastEffectEvent notification toast should be set on SELECT_EFFECT_UPGRADE!');
}
console.log('==> SUCCESS 1B: SELECT_EFFECT_UPGRADE resolved without delayed full-screen lastUpgrade modal!');

// 1C. getTurnDrawCount 검증 (선공의 1턴만 1장, 후공의 1턴 및 2턴 이후는 2장)
if (getTurnDrawCount({ turn: 1, activePlayerIndex: 0, firstPlayerIndex: 0, firstTurnDrawCompleted: false } as any) !== 1) {
  throw new Error('FAIL: First player turn 1 must draw 1');
}
if (getTurnDrawCount({ turn: 1, activePlayerIndex: 1, firstPlayerIndex: 0, firstTurnDrawCompleted: true } as any) !== 2) {
  throw new Error('FAIL: Second player turn 1 must draw 2');
}
if (getTurnDrawCount({ turn: 1, activePlayerIndex: 0, firstPlayerIndex: 1, firstTurnDrawCompleted: true } as any) !== 2) {
  throw new Error('FAIL: Second player (P0) when AI goes first must draw 2');
}
if (getTurnDrawCount({ turn: 2, activePlayerIndex: 0, firstPlayerIndex: 0, firstTurnDrawCompleted: true } as any) !== 2) {
  throw new Error('FAIL: Turn 2 must draw 2');
}
console.log('==> SUCCESS 1C: getTurnDrawCount passes all official 602.1.3 turn draw rules!');

// --- 2. 연격 단계에서 변주 스킬 [숨결], [계발] 시각적 피드백 검증 ---
let s2 = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI');
s2.phase = 'COMBO_STEP';
s2.players[0].comboUnlimited = true;
s2.players[0].hp = 15;

// 서포터에 양양, 파수인 배치
const yangyang: CharacterCard = {
  id: 'yang-test',
  code: 'BP01-021',
  nameKr: '양양',
  characterName: '양양',
  kind: 'CHARACTER',
  level: 0,
} as any;
s2.players[0].slots.leftSupport = yangyang;

const shSupport: CharacterCard = {
  id: 'sh-support-test',
  code: 'BP01-008',
  nameKr: '파수인',
  characterName: '파수인',
  kind: 'CHARACTER',
  level: 0,
} as any;
s2.players[0].slots.rightSupport = shSupport;

// 패에 [숨결] (SD01-014), [계발] (BP01-054) 추가
const breathCard: ActionCard = {
  ...getOfficialCardByCode('SD01-014') as ActionCard,
  id: 'test-breath-card',
};
const gaebalCard: ActionCard = {
  ...getOfficialCardByCode('BP01-054') as ActionCard,
  id: 'test-gaebal-card',
};
s2.players[0].hand.push(breathCard, gaebalCard);

// [숨결] 연격 발동 (양양과 교체)
const resBreath = executeComboAttack(s2, 0, 'test-breath-card', undefined, undefined, 'leftSupport');
console.log('\n2. [숨결] combo executed:');
console.log('   success:', resBreath.success);
console.log('   lastEffectEvent title:', resBreath.newState.lastEffectEvent?.title);
console.log('   lastEffectEvent desc:', resBreath.newState.lastEffectEvent?.description);
console.log('   recent log:', resBreath.newState.logs[0]?.text);

if (!resBreath.newState.lastEffectEvent || !resBreath.newState.lastEffectEvent.title.includes('숨결')) {
  throw new Error('FAIL: lastEffectEvent not created for 숨결 concerto charge!');
}
console.log('==> SUCCESS 2A: [숨결] concerto charge event and toast generated cleanly!');

// [계발] 연격 발동 (파수인과 교체)
const resGaebal = executeComboAttack(resBreath.newState, 0, 'test-gaebal-card', undefined, undefined, 'rightSupport');
console.log('\n3. [계발] combo executed:');
console.log('   success:', resGaebal.success);
console.log('   p0 hp after heal:', resGaebal.newState.players[0].hp);
console.log('   lastEffectEvent title:', resGaebal.newState.lastEffectEvent?.title);
console.log('   lastEffectEvent desc:', resGaebal.newState.lastEffectEvent?.description);

if (!resGaebal.newState.lastEffectEvent || !resGaebal.newState.lastEffectEvent.title.includes('계발')) {
  throw new Error('FAIL: lastEffectEvent not created for 계발 heal!');
}
console.log('==> SUCCESS 2B: [계발] heal event and toast generated cleanly!');

// --- 3. 파수인 Lv.2 [BP01-007] 배틀 시작 시 5장 드로우 연출 검증 ---
let s3 = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI');
s3.phase = 'ACTION_PHASE';
s3.activePlayerIndex = 0;

// P0 리더를 BP01-007 파수인 Lv.2로 설정
const shBp007: CharacterCard = {
  id: 'sh-bp007',
  code: 'BP01-007',
  nameKr: '파수인',
  characterName: '파수인',
  kind: 'CHARACTER',
  level: 2,
} as any;
s3.players[0].slots.leader = shBp007;

// 패를 2장만 남김 (3장 드로우 필요)
s3.players[0].hand = s3.players[0].hand.slice(0, 2);
console.log('\n4. Before battle declare, p0 hand count:', s3.players[0].hand.length);

// P0가 대결(배틀) 선언 -> CLASH_SET으로 전환
const { setClashCard } = await import('../src/engine/gameEngine');
// executeDrawPhase나 setClashCard 대신 phase transition 확인
// setClashCard(s3, 0, null)
// s3는 executeBattlePhaseStart와 유사하게 CLASH_SET 전환 로직 호출
const { decideClash } = await import('../src/engine/gameEngine');
const resClash = decideClash(s3, true);
console.log('   After startClashPhase:');
console.log('   p0 hand count (SHOULD BE 5):', resClash.players[0].hand.length);
console.log('   lastEffectDraw exists:', Boolean(resClash.lastEffectDraw));
console.log('   lastEffectDraw cards count:', resClash.lastEffectDraw?.cards.length);
console.log('   lastEffectDraw source:', resClash.lastEffectDraw?.sourceCardName);
console.log('   recent log:', resClash.logs[0]?.text);

if (!resClash.lastEffectDraw || resClash.lastEffectDraw.cards.length !== 3) {
  throw new Error('FAIL: lastEffectDraw not created for Shorekeeper Lv.2 BP01-007!');
}
console.log('==> SUCCESS 3: Shorekeeper Lv.2 5-card draw overlay event successfully queued!');
