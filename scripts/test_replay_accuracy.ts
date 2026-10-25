const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, val: string) => store.set(key, val),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
};

import {
  createInitialGameState,
  addLog,
  CharacterCard,
} from '../src/engine/gameEngine';
import {
  createBattleReplayData,
  encodeReplayToShareCode,
  importReplayFromCodeOrJson,
  saveReplayObject,
} from '../src/utils/replayManager';
import { buildReplayTimeline } from '../src/utils/replayTimelineBuilder';

console.log('=== TEST: Replay Accuracy & Code Verification ===');

let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA');

// Upgrade leader to Lv.2
const roverLv2: CharacterCard = {
  ...state.players[0].slots.leader,
  level: 2,
  nameKr: '방랑자(남) Lv.2',
};
state.players[0].slots.leader = roverLv2;
state.players[0].hp = 14;

// Add logs across multiple turns
for (let t = 1; t <= 8; t++) {
  state.turn = t;
  state = addLog(state, `--- [턴 ${t}] 플레이어의 턴 시작 ---`, 'PHASE', 0);
  state = addLog(state, `[공격] 플레이어가 2 피해를 입혔습니다.`, 'DAMAGE', 0, { amount: 2 });
  if (t === 6) {
    state = addLog(state, `[효과 드로우] [파수인 Lv.2 상시 효과] 1장 드로우`, 'ACTION', 0);
  }
}

console.log(`1. Total Logs recorded: ${state.logs.length}`);
if (state.logs.length < 16) {
  throw new Error(`Expected at least 16 logs, got ${state.logs.length}`);
}

const oldestLog = state.logs[state.logs.length - 1];
console.log(`   Oldest log: [Turn ${oldestLog.turn}] ${oldestLog.text}`);
if (oldestLog.turn !== 1) {
  throw new Error(`Expected oldest log turn 1, got ${oldestLog.turn}`);
}

// Check snapshot attached to newest log
const newestLog = state.logs[0];
console.log(`   Newest log leader level in snapshot: ${newestLog.snapshot?.p0.leader.level}`);
if (newestLog.snapshot?.p0.leader.level !== 2) {
  throw new Error(`Expected leader level 2, got ${newestLog.snapshot?.p0.leader.level}`);
}

// 2. Create Replay
const replay = createBattleReplayData(0, state.players, state.logs, 8, 'AI');
console.log(`2. Generated Replay ID: ${replay.id}`);
if (!replay.id.startsWith('RP-')) {
  throw new Error(`Expected clean RP- format, got ${replay.id}`);
}
console.log(`   Replay p0Leader level: ${replay.p0Leader.level}`);
if (replay.p0Leader.level !== 2) {
  throw new Error(`Expected p0Leader level 2, got ${replay.p0Leader.level}`);
}

// 3. Replay Code Copy
const shareCode = encodeReplayToShareCode(replay);
console.log(`3. Replay Share Code: "${shareCode}"`);
if (shareCode.length > 50) {
  throw new Error(`Share code should be concise, but got length ${shareCode.length}`);
}
if (shareCode !== replay.id) {
  throw new Error(`Share code should match replay.id, got ${shareCode}`);
}

// 4. Build Timeline
const timeline = buildReplayTimeline(replay);
console.log(`4. Replay Timeline steps count: ${timeline.length}`);
const midStep = timeline.find((s) => s.logText.includes('턴 6'));
console.log(`   Step at Turn 6 leader level: ${midStep?.p0.leader.level}`);
if (midStep?.p0.leader.level !== 2) {
  throw new Error(`Expected leader level 2 at turn 6, got ${midStep?.p0.leader.level}`);
}

// 5. Test Import by ID
saveReplayObject(replay);
const importRes = importReplayFromCodeOrJson(shareCode);
console.log(`5. Import by Code success: ${importRes.success}`);
if (!importRes.success || !importRes.replay) {
  throw new Error(`Failed to import replay by code: ${importRes.error}`);
}
if (importRes.replay.id !== replay.id) {
  throw new Error(`Imported wrong replay ID: ${importRes.replay.id}`);
}

console.log('ALL REPLAY ACCURACY TESTS PASSED 100%!');
