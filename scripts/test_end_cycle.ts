import {
  createInitialGameState,
  finishClashJudgment,
  proceedAfterClashReveal,
  canPlayerExecuteCombo,
} from '../src/engine/gameEngine';
import { getOfficialCardByCode } from '../src/data/officialCards';

let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA');
state.phase = 'CLASH_REVEAL';

const endCycle = getOfficialCardByCode('BP01-057')!; // Green, spd 11
const blueCard = getOfficialCardByCode('BP01-069')!; // Blue, spd 11 (Green beats Blue!)
state.players[0].clashCard = endCycle;
state.players[0].clashCardReady = true;
state.players[1].clashCard = blueCard;
state.players[1].clashCardReady = true;

const redAction = getOfficialCardByCode('SD01-009')!; // Red
state.players[0].hand = [redAction];
state.players[0].concertoZone = [redAction, redAction];

state = finishClashJudgment(state);
console.log('winner:', state.clashResult?.winnerIndex);
console.log('comboGranted:', state.clashResult?.comboGranted);
console.log('p0 comboCount before proceed:', state.players[0].comboCount);
console.log('canPlayerExecuteCombo before proceed:', canPlayerExecuteCombo(state.players[0]));
state = proceedAfterClashReveal(state);
console.log('phase after proceed:', state.phase);
console.log('p0 comboCount after proceed:', state.players[0].comboCount);
