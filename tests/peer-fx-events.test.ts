/**
 * [WP8 버그 수정] 멀티 게스트·관전자: 레벨업·효과 알림은 상태 비교로 알 수 없으므로
 * 호스트가 SYNC_GAME_STATE.fxEvents로 보낸 이벤트를 합친다. 같은 이벤트가 다시 와도 1번만 나와야 한다.
 */
import { describe, it, expect } from 'vitest';
import { PeerSource } from '../src/battle/PeerSource';
import { createInitialGameState } from '../src/engine/gameEngine';
import type { GameEvent } from '../src/engine/events';
import type { GameState } from '../src/types/tcg';

describe('[WP8 버그 수정] PeerSource host fx events', () => {
  it('guest merges host fx events once and ignores duplicates', () => {
    const s0 = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'MULTIPLAYER', null, null, undefined, undefined, 7);
    const guest = new PeerSource('peer-guest', s0, {});
    const received: GameEvent[][] = [];
    guest.subscribe((_s, events) => received.push(events));

    const up: GameEvent = { id: 'evt-up-1', type: 'UPGRADE', turn: 1, playerIndex: 0, payload: { cardName: 'X' } };
    const fx: GameEvent = { id: 'evt-fx-1', type: 'EFFECT_TRIGGERED', turn: 1, playerIndex: 1, payload: { title: 'T' } };

    const s1: GameState = JSON.parse(JSON.stringify({ ...s0, turn: 2 }));
    guest.receiveState(s1, [up, fx]);
    // 같은 상태 재전송 + 같은 연출 이벤트 재전송 (재연결 등)
    const s2: GameState = JSON.parse(JSON.stringify(s1));
    guest.receiveState(s2, [up, fx]);

    const allFx = received.flat().filter((e) => e.type === 'UPGRADE' || e.type === 'EFFECT_TRIGGERED');
    expect(allFx.map((e) => e.id)).toEqual(['evt-up-1', 'evt-fx-1']);
  });

  it('guest without host fx events still works (older host)', () => {
    const s0 = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'MULTIPLAYER', null, null, undefined, undefined, 8);
    const guest = new PeerSource('peer-guest', s0, {});
    let calls = 0;
    guest.subscribe(() => calls++);
    guest.receiveState(JSON.parse(JSON.stringify({ ...s0, turn: 3 })));
    expect(calls).toBe(1);
  });
});
