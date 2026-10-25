import { createInitialGameState, decideClash, setClashCard, resolveClash, proceedAfterClashReveal, resolvePendingChoice } from '../src/engine/gameEngine';
import { ActionCard, CharacterCard } from '../src/types/tcg';
import { OFFICIAL_CARDS } from '../src/data/officialCards';

function getCard(code: string): ActionCard {
  const c = OFFICIAL_CARDS.find((x) => x.code === code && x.kind === 'ACTION');
  if (!c) throw new Error(`Card not found: ${code}`);
  return { ...c, id: `test-${code}-${Math.random()}` } as ActionCard;
}

function getChar(code: string): CharacterCard {
  const c = OFFICIAL_CARDS.find((x) => x.code === code && x.kind === 'CHARACTER');
  if (!c) throw new Error(`Char not found: ${code}`);
  return { ...c, id: `test-${code}-${Math.random()}` } as CharacterCard;
}

let state = createInitialGameState();
// Set player leader to Sanhua Lv.0 (BP01-033)
const sanhua0 = getChar('BP01-033');
state.players[0].slots.leader = sanhua0;
// Character deck has BP01-032 (Sanhua Lv.1) and SD02-004 (Sanhua Lv.1) and BP01-031 (Sanhua Lv.2)
state.players[0].characterDeck = [getChar('BP01-032'), getChar('SD02-004'), getChar('BP01-031')];
// DropZone has some cards so Sanhua Lv.1 can pick from dropZone
state.players[0].dropZone = [getCard('BP01-076'), getCard('SD02-010')];

// Player hand has BP01-076 (매서운 가시)
const thorn = getCard('BP01-076');
state.players[0].hand = [thorn];
state.players[0].concertoZone = [getCard('SD02-010')]; // for cost 1

// AI hand has RED card
const vine = getCard('SD01-011'); // 덩굴의 춤 or something
state.players[1].hand = [vine];
state.players[1].concertoZone = [];

console.log('--- Step 1: Decide Clash ---');
state = decideClash(state, true);

console.log('--- Step 2: Set Clash Cards ---');
let res0 = setClashCard(state, 0, thorn.id);
state = res0.newState;
let res1 = setClashCard(state, 1, vine.id);
state = res1.newState;

console.log('--- Step 3: Resolve Clash ---');
state = resolveClash(state);
console.log('Phase after resolveClash:', state.phase);
console.log('PendingChoice after resolveClash:', state.pendingChoice?.title);
console.log('DeferredChoices after resolveClash:', state.deferredChoices?.map(c => c.title));

// If pendingChoice is Sanhua Lv.0 battle step:
if (state.pendingChoice) {
  console.log('--- Step 4: Resolving Battle Step Choice ---');
  state = resolvePendingChoice(state, [state.pendingChoice.revealedCards[0].id]);
  console.log('Phase after battle step resolve:', state.phase);
  console.log('ClashResult exists?:', Boolean(state.clashResult));
  console.log('PendingChoice after battle step resolve:', state.pendingChoice?.title);
  console.log('DeferredChoices after battle step resolve:', state.deferredChoices?.map(c => c.title));
}

// Next, ClashAnimationOverlay calls proceedAfterClashReveal
console.log('--- Step 5: Proceed After Clash Reveal ---');
state = proceedAfterClashReveal(state);
console.log('Phase after proceed:', state.phase);
console.log('PendingChoice after proceed:', state.pendingChoice?.title);
console.log('PendingChoiceQueue after proceed:', state.pendingChoiceQueue?.map(c => c.title));
console.log('DeferredChoices after proceed:', state.deferredChoices?.map(c => c.title));

// Player resolves the upgrade choice (e.g. chooses BP01-032)
if (state.pendingChoice && state.pendingChoice.onResolveType === 'SELECT_EFFECT_UPGRADE') {
  console.log('--- Step 6: Resolving SELECT_EFFECT_UPGRADE ---');
  const chosen = state.pendingChoice.revealedCards.find(c => c.code?.startsWith('BP01-032'))!;
  state = resolvePendingChoice(state, [chosen.id]);
  console.log('Phase after upgrade resolve:', state.phase);
  console.log('PendingChoice after upgrade resolve:', state.pendingChoice?.title);
  console.log('PendingChoiceQueue after upgrade resolve:', state.pendingChoiceQueue?.map(c => c.title));
}

// Next: Sanhua Lv.1 SET_CONCERTO
if (state.pendingChoice && state.pendingChoice.onResolveType === 'SET_CONCERTO') {
  console.log('--- Step 7: Resolving Sanhua Lv.1 SET_CONCERTO ---');
  state = resolvePendingChoice(state, [state.pendingChoice.revealedCards[0].id]);
  console.log('Phase after Sanhua Lv.1 resolve:', state.phase);
  console.log('PendingChoice after Sanhua Lv.1 resolve:', state.pendingChoice?.title);
  console.log('PendingChoiceQueue after Sanhua Lv.1 resolve:', state.pendingChoiceQueue?.map(c => c.title));
}
