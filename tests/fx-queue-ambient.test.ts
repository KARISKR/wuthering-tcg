/**
 * [WP8 버그 수정] lane: 'ambient' 알림(효과 토스트·회복 숫자)은 순서 큐를 막지 않는다.
 * 이전에는 4초짜리 토스트 뒤에 효과 드로우(엔진이 FINISH_EFFECT_DRAW를 기다리는 관문)가 줄을 서서 게임이 멈췄다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { FxQueue } from '../src/battle/fxQueue';
import type { FxEntry } from '../src/battle/fxRegistry';
import type { GameEvent, GameEventType, GameAction } from '../src/engine/events';
import type { GameState } from '../src/types/tcg';

const Dummy: React.FC<{ event: GameEvent; onDone: () => void }> = () => null;

describe('[WP8 버그 수정] FxQueue ambient lane', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const registry: Partial<Record<GameEventType, FxEntry>> = {
    EFFECT_TRIGGERED: { component: Dummy, blocking: false, lane: 'ambient', durationMs: 4000, waitFor: (s) => !s.clashResult },
    EFFECT_DRAW: { component: Dummy, blocking: true, durationMs: 3500, onDoneAction: () => ({ type: 'FINISH_EFFECT_DRAW' }) },
  };

  it('a blocking effect draw starts immediately even while a toast is showing', () => {
    const state = { clashResult: null } as unknown as GameState;
    const dispatched: GameAction[] = [];
    const q = new FxQueue({ registry, getGameState: () => state, dispatch: (a) => dispatched.push(a) });
    q.enqueue([
      { id: 'toast-1', type: 'EFFECT_TRIGGERED', turn: 1 },
      { id: 'draw-1', type: 'EFFECT_DRAW', turn: 1 },
    ]);
    expect(q.getAmbientFx()?.id).toBe('toast-1');
    expect(q.getActiveFx()?.id).toBe('draw-1');
    expect(q.getIsBlocking()).toBe(true);
    q.getActiveFx()!.onDone();
    expect(dispatched).toEqual([{ type: 'FINISH_EFFECT_DRAW' }]);
    expect(q.getAmbientFx()?.id).toBe('toast-1'); // 토스트는 계속 표시
    vi.advanceTimersByTime(4000);
    expect(q.getAmbientFx()).toBeNull();
  });

  it('a newer toast replaces the current one', () => {
    const q = new FxQueue({ registry, getGameState: () => ({ clashResult: null }) as unknown as GameState });
    q.enqueue([{ id: 't1', type: 'EFFECT_TRIGGERED', turn: 1 }]);
    vi.advanceTimersByTime(1000);
    q.enqueue([{ id: 't2', type: 'EFFECT_TRIGGERED', turn: 1 }]);
    expect(q.getAmbientFx()?.id).toBe('t2');
    vi.advanceTimersByTime(3999);
    expect(q.getAmbientFx()?.id).toBe('t2');
    vi.advanceTimersByTime(1);
    expect(q.getAmbientFx()).toBeNull();
  });

  it('a toast waits while the clash result is open, then shows', () => {
    let state = { clashResult: { winnerIndex: 0 } } as unknown as GameState;
    const q = new FxQueue({ registry, getGameState: () => state });
    q.enqueue([{ id: 't1', type: 'EFFECT_TRIGGERED', turn: 1 }]);
    expect(q.getAmbientFx()).toBeNull();
    state = { clashResult: null } as unknown as GameState;
    q.updateState();
    expect(q.getAmbientFx()?.id).toBe('t1');
  });
});
