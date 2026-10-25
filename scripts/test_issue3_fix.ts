import {
  createInitialGameState,
  finishClashJudgment,
  proceedAfterClashReveal,
  resolvePendingChoice,
  continuePostClashOrBattlePhase,
  CharacterCard,
  ActionCard,
} from '../src/engine/gameEngine';
import { getOfficialCardByCode } from '../src/data/officialCards';

console.log('=== TEST: Issue 3 Verification ===');

// --- TEST 1: Clash heal deferral test (Shorekeeper Lv.2 heal draw prompt) ---
let s1 = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA');
s1.phase = 'CLASH_REVEAL';

// P0 leader is Shorekeeper Lv.2
const shLv2 = getOfficialCardByCode('BP01-006') as CharacterCard;
s1.players[0].slots.leader = { ...shLv2, characterName: '파수인', level: 2 };
s1.players[0].hp = 18; // can heal 1
s1.players[0].clashCard = getOfficialCardByCode('BP01-057') as ActionCard; // 결말의 순환 (heals 1 HP on win)
s1.players[0].clashCardReady = true;

s1.players[1].clashCard = getOfficialCardByCode('BP01-069') as ActionCard; // Blue card (Green beats Blue)
s1.players[1].clashCardReady = true;

s1 = finishClashJudgment(s1);

console.log('1. Clash judgment finished:');
console.log('   clashResult exists:', Boolean(s1.clashResult));
console.log('   pendingChoice during clash overlay (SHOULD BE NULL):', s1.pendingChoice);
console.log('   deferredChoices count (SHOULD BE > 0):', s1.deferredChoices?.length);
console.log('   deferredChoice title:', s1.deferredChoice?.title);

if (s1.pendingChoice !== null && s1.pendingChoice !== undefined) {
  throw new Error('FAIL: pendingChoice popped up during clash result overlay!');
}
if (!s1.deferredChoice || !s1.deferredChoice.title.includes('파수인 Lv.2 상시 효과')) {
  throw new Error('FAIL: Shorekeeper Lv.2 heal choice was not deferred!');
}
console.log('   ==> SUCCESS: Heal choice successfully deferred during clash result overlay!');

// Dismiss clash result (like user clicking '다음 단계로 진행')
s1 = proceedAfterClashReveal(s1);

console.log('2. After proceedAfterClashReveal:');
console.log('   clashResult is null:', s1.clashResult === null);
console.log('   pendingChoice is now active:', s1.pendingChoice?.title);

if (!s1.pendingChoice || !s1.pendingChoice.title.includes('파수인 Lv.2 상시 효과')) {
  throw new Error('FAIL: pendingChoice was not activated after proceedAfterClashReveal!');
}
console.log('   ==> SUCCESS: Heal choice cleanly presented after battle result dismissed!');

// Resolve heal choice (player chooses to draw 1 card)
const p0HandBefore = s1.players[0].hand.length;
s1 = resolvePendingChoice(s1, ['ACCEPT']);
console.log('3. After resolvePendingChoice:');
console.log('   p0 hand increased by 1:', s1.players[0].hand.length === p0HandBefore + 1);
console.log('   effect draw animation queued:', Boolean(s1.lastEffectDraw));

// When user closes effect draw animation:
s1.lastEffectDraw = null;
s1 = continuePostClashOrBattlePhase(s1);
console.log('4. After effect draw dismissed:');
console.log('   phase is COMBO_STEP:', s1.phase === 'COMBO_STEP');
console.log('   p0 comboCount is 8 (from 결말의 순환):', s1.players[0].comboCount === 8);
if (s1.phase !== 'COMBO_STEP' || s1.players[0].comboCount !== 8) {
  throw new Error('FAIL: Did not transition to COMBO_STEP with 8 combo counts!');
}
console.log('   ==> SUCCESS: Normal 결말의 순환 pursuit is 8 and enters COMBO_STEP!');

// --- TEST 2: Haegeum combo blockade clarity test ---
let s2 = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA');
s2.phase = 'CLASH_REVEAL';
s2.players[0].slots.leader = { ...shLv2, characterName: '파수인', level: 2 };
s2.players[0].clashCard = getOfficialCardByCode('BP01-057') as ActionCard; // 결말의 순환 (Speed 11)
s2.players[0].clashCardReady = true;

// AI plays Haegeum (Speed 5), has dominance, leader is 파수인
s2.players[1].slots.leader = { ...shLv2, characterName: '파수인', level: 0 };
s2.players[1].hasDominance = true;
s2.players[1].clashCard = getOfficialCardByCode('BP01-058') as ActionCard; // 해금
s2.players[1].clashCardReady = true;

s2 = finishClashJudgment(s2);
console.log('\n5. Haegeum vs 결말의 순환:');
console.log('   winnerIndex:', s2.clashResult?.winnerIndex);
console.log('   comboGranted (SHOULD BE 0):', s2.clashResult?.comboGranted);
console.log('   comboBlockedReason:', s2.clashResult?.comboBlockedReason);

const hasPursuitInEffects = s2.clashResult?.triggeredEffects?.some(e => e.title.includes('추격') && e.description.includes('획득'));
const hasCancelInEffects = s2.clashResult?.triggeredEffects?.some(e => e.effectType === 'CANCEL');

console.log('   pursuit 8 removed from triggeredEffects:', !hasPursuitInEffects);
console.log('   CANCEL blockade event present in triggeredEffects:', hasCancelInEffects);

if (hasPursuitInEffects) {
  throw new Error('FAIL: triggeredEffects still contains false pursuit 8 grant when blocked!');
}
if (!hasCancelInEffects || !s2.clashResult?.comboBlockedReason) {
  throw new Error('FAIL: comboBlockedReason or CANCEL event was missing!');
}
console.log('   ==> SUCCESS: Haegeum blockage is clearly recorded and pursuit false-grant removed!');

console.log('\n=== ALL TESTS PASSED! ===');
