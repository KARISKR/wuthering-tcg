import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../src/engine/gameEngine';
import { LocalSource } from '../src/battle/LocalSource';
import { createBattleStore, shallowEqual } from '../src/battle/store';

describe('BattleStore (useSyncExternalStore based store)', () => {
  it('updates gameState when source dispatches and notifies subscribers', () => {
    const initialState = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI', null, null, undefined, undefined, 4321);
    const source = new LocalSource(initialState);
    const store = createBattleStore(source);

    let notifyCount = 0;
    const unsub = store.subscribe(() => {
      notifyCount++;
    });

    expect(store.getState().gameState.phase).toBe('LEADER_SELECT');

    // UI 상태 변경
    store.setState({ isRulesOpen: true });
    expect(store.getState().isRulesOpen).toBe(true);
    expect(notifyCount).toBe(1);

    // 동일한 값으로 setState 시 notify 발생하지 않음 (최적화)
    store.setState({ isRulesOpen: true });
    expect(notifyCount).toBe(1);

    // 액션 디스패치 시 gameState 동기화 및 notify 확인
    store.dispatch({
      type: 'SELECT_STARTING_LEADER',
      p0LeaderIdOrName: '방랑자',
      p1LeaderIdOrName: '치샤',
    });

    expect(store.getState().gameState.phase).toBe('MULLIGAN');
    expect(notifyCount).toBe(2);

    unsub();
  });

  it('shallowEqual properly compares objects', () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true);
    expect(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'y' })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
});
