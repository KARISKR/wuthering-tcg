// 2026-11-12 점검 8번: 2인 대전 동기화에서 새 로그만 보내도 받는 쪽 로그가 보낸 쪽과 같아지는지, 메시지 크기 상한
import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../src/engine/gameEngine';
import { step } from '../src/engine/step';
import { selectAiClashCard, decideAiMulligan } from '../src/engine/aiPlayer';
import { logsSince, mergeSyncedLogs } from '../src/services/syncLogs';
import type { GameState, LogItem } from '../src/types/tcg';

/** AI끼리 한 판을 끝까지 돌리며 상태가 바뀔 때마다 콜백 */
function playGame(seed: number, onState: (s: GameState) => void) {
  let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', null, null, undefined, undefined, seed);
  const go = (a: Parameters<typeof step>[1]) => {
    state = step(state, a).state;
    onState(state);
  };
  onState(state);
  go({ type: 'SELECT_STARTING_LEADER', p0LeaderIdOrName: state.players[0].slots.leader.id, p1LeaderIdOrName: state.players[1].slots.leader.id });
  go({ type: 'MULLIGAN', p0DiscardIds: decideAiMulligan(state.players[0]), p1DiscardIds: decideAiMulligan(state.players[1]) });
  for (let loop = 0; state.phase !== 'GAME_OVER' && loop < 2500; loop++) {
    if (state.lastEffectDraw) { go({ type: 'FINISH_EFFECT_DRAW' }); continue; }
    if (state.pendingChoice) {
      const c = state.pendingChoice;
      go({ type: 'RESOLVE_PENDING_CHOICE', chosenCardIds: (c.revealedCards || []).slice(0, Math.max(c.minSelect ?? 0, c.maxSelect ?? 1)).map((x) => x.id) });
      continue;
    }
    const a = state.activePlayerIndex;
    switch (state.phase) {
      case 'START_PHASE':
      case 'DRAW_PHASE': go({ type: 'DRAW_CARDS', playerIndex: a }); break;
      case 'ACTION_PHASE':
        go({ type: 'AI_ACTION_PHASE', playerIndex: a });
        if (state.phase === 'ACTION_PHASE') go({ type: 'DECIDE_CLASH', startClash: true });
        break;
      case 'CLASH_SET':
        go({ type: 'SET_CLASH_CARD', playerIndex: a, cardId: selectAiClashCard(state, a) });
        go({ type: 'SET_CLASH_CARD', playerIndex: (1 - a) as 0 | 1, cardId: selectAiClashCard(state, (1 - a) as 0 | 1) });
        go({ type: 'RESOLVE_CLASH' });
        break;
      case 'CLASH_REVEAL': go({ type: 'PROCEED_AFTER_CLASH' }); break;
      case 'COMBO_STEP': {
        const i: 0 | 1 = state.players[0].comboUnlimited || state.players[0].comboCount > 0 ? 0 : 1;
        go({ type: 'AI_COMBO_STEP', playerIndex: i });
        if (state.phase === 'COMBO_STEP') go({ type: 'FINISH_COMBO', playerIndex: i });
        break;
      }
      case 'DISCARD_OVERFLOW': go({ type: 'AI_DISCARD_OVERFLOW', playerIndex: state.players[0].hand.length > 8 ? 0 : 1 }); break;
      case 'END_PHASE': go({ type: 'FINALIZE_END_PHASE' }); break;
      default: break;
    }
  }
  return state;
}

describe('multiplayer state sync sends only new logs', () => {
  it('guest logs end up identical to host logs, and each message stays small', () => {
    for (const seed of [101, 202, 303]) {
      let anchor: string | null = null; // 호스트: 마지막으로 보낸 맨 앞 로그
      let guestLogs: LogItem[] = [];
      let maxMsg = 0;
      let maxFull = 0;
      const final = playGame(seed, (s) => {
        const newLogs = logsSince(s.logs, anchor);
        const msg = { gameState: newLogs ? { ...s, logs: newLogs } : s, logsAnchorId: newLogs && anchor ? anchor : undefined };
        maxMsg = Math.max(maxMsg, JSON.stringify(msg).length);
        maxFull = Math.max(maxFull, JSON.stringify(s).length);
        anchor = s.logs[0]?.id ?? null;
        guestLogs = mergeSyncedLogs(msg.gameState.logs, guestLogs, msg.logsAnchorId);
      });
      expect(final.phase).toBe('GAME_OVER');
      expect(guestLogs.map((l) => l.id)).toEqual(final.logs.map((l) => l.id));
      // 예전에는 매 메시지가 상태 전체(게임 끝 기준 수백 KB). 이제 로그 몇 개 + 로그 뺀 상태
      expect(maxMsg).toBeLessThan(120_000);
      expect(maxMsg).toBeLessThan(maxFull / 3);
    }
  });

  it('falls back to the received logs when the anchor does not match (lost message)', () => {
    const l = (id: string) => ({ id }) as LogItem;
    expect(mergeSyncedLogs([l('c')], [l('a')], 'b').map((x) => x.id)).toEqual(['c']);
    expect(mergeSyncedLogs([l('c'), l('b')], [l('b'), l('a')], 'b').map((x) => x.id)).toEqual(['c', 'b', 'a']);
    expect(logsSince([l('c'), l('b'), l('a')], 'b')!.map((x) => x.id)).toEqual(['c']);
    expect(logsSince([l('c')], 'zzz')).toBeNull();
  });
});
