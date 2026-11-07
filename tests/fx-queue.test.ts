import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { FxQueue } from '../src/battle/fxQueue';
import type { FxEntry } from '../src/battle/fxRegistry';
import type { GameEvent, GameAction, GameEventType } from '../src/engine/events';
import type { GameState } from '../types/tcg';

const DummyComponent: React.FC<{ event: GameEvent; onDone: () => void }> = () => null;

describe('WP8 Step D: FxQueue unit tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. runs 2 blocking FX in sequence, maintaining isBlocking=true until queue finishes', () => {
    const blockingChanges: boolean[] = [];

    const registry: Partial<Record<GameEventType, FxEntry>> = {
      DAMAGE: {
        component: DummyComponent,
        blocking: true,
      },
      HEAL: {
        component: DummyComponent,
        blocking: true,
      },
    };

    const queue = new FxQueue({
      registry,
      onBlockingChange: (isBlocking) => blockingChanges.push(isBlocking),
    });

    const event1: GameEvent = { id: 'evt-1', type: 'DAMAGE', turn: 1, payload: { amount: 3 } };
    const event2: GameEvent = { id: 'evt-2', type: 'HEAL', turn: 1, payload: { amount: 2 } };

    queue.enqueue([event1, event2]);

    // First event is immediately active
    expect(queue.getIsBlocking()).toBe(true);
    expect(blockingChanges).toEqual([true]);
    expect(queue.getActiveFx()?.id).toBe('evt-1');

    // Finish event1
    queue.getActiveFx()?.onDone();

    // Second event becomes active; isBlocking remains true
    expect(queue.getIsBlocking()).toBe(true);
    expect(queue.getActiveFx()?.id).toBe('evt-2');

    // Finish event2
    queue.getActiveFx()?.onDone();

    // Queue empty, blocking released
    expect(queue.getActiveFx()).toBeNull();
    expect(queue.getIsBlocking()).toBe(false);
    expect(blockingChanges).toEqual([true, false]);
  });

  it('2. advances to next FX after durationMs timeout even if onDone is never called (safety mechanism)', () => {
    const registry: Partial<Record<GameEventType, FxEntry>> = {
      UPGRADE: {
        component: DummyComponent,
        blocking: true,
        durationMs: 500,
      },
      COMBO_STRIKE: {
        component: DummyComponent,
        blocking: false,
        durationMs: 300,
      },
    };

    const queue = new FxQueue({ registry });

    const event1: GameEvent = { id: 'evt-upgrade', type: 'UPGRADE', turn: 1 };
    const event2: GameEvent = { id: 'evt-combo', type: 'COMBO_STRIKE', turn: 1 };

    queue.enqueue([event1, event2]);

    expect(queue.getActiveFx()?.id).toBe('evt-upgrade');
    expect(queue.getIsBlocking()).toBe(true);

    // Fast-forward 499ms: still running
    vi.advanceTimersByTime(499);
    expect(queue.getActiveFx()?.id).toBe('evt-upgrade');

    // Fast-forward 1ms more (500ms reached): auto-finishes event1, advances to event2
    vi.advanceTimersByTime(1);
    expect(queue.getActiveFx()?.id).toBe('evt-combo');
    expect(queue.getIsBlocking()).toBe(false);

    // Advance 300ms more: auto-finishes event2
    vi.advanceTimersByTime(300);
    expect(queue.getActiveFx()).toBeNull();
    expect(queue.getIsBlocking()).toBe(false);
  });

  it('3. does not start FX while waitFor returns false, and starts when waitFor condition is met', () => {
    let mockPhase = 'CLASH_REVEAL';
    const mockState = { phase: mockPhase } as GameState;

    const registry: Partial<Record<GameEventType, FxEntry>> = {
      EFFECT_DRAW: {
        component: DummyComponent,
        blocking: true,
        waitFor: (state) => state.phase === 'ACTION_PHASE',
      },
    };

    const queue = new FxQueue({
      registry,
      getGameState: () => ({ ...mockState, phase: mockPhase }),
    });

    const event: GameEvent = { id: 'evt-draw', type: 'EFFECT_DRAW', turn: 2 };
    queue.enqueue([event]);

    // waitFor is false, so it must not start yet
    expect(queue.getActiveFx()).toBeNull();
    expect(queue.getQueueLength()).toBe(1);
    expect(queue.getIsBlocking()).toBe(false);

    // Phase changes to ACTION_PHASE and updateState is called
    mockPhase = 'ACTION_PHASE';
    queue.updateState({ ...mockState, phase: 'ACTION_PHASE' });

    // Now it should start
    expect(queue.getActiveFx()?.id).toBe('evt-draw');
    expect(queue.getIsBlocking()).toBe(true);
  });

  it('4. dispatches onDoneAction exactly once, even if onDone is called and timeout triggers', () => {
    const dispatchedActions: GameAction[] = [];
    const registry: Partial<Record<GameEventType, FxEntry>> = {
      EFFECT_DRAW: {
        component: DummyComponent,
        blocking: true,
        durationMs: 600,
        onDoneAction: (e) => ({
          type: 'FINISH_EFFECT_DRAW',
          completedDrawId: (e.payload?.drawId as string) || undefined,
        }),
      },
    };

    const queue = new FxQueue({
      registry,
      dispatch: (action) => dispatchedActions.push(action),
    });

    const event: GameEvent = {
      id: 'evt-draw-1',
      type: 'EFFECT_DRAW',
      turn: 3,
      payload: { drawId: 'draw-999' },
    };

    queue.enqueue([event]);

    expect(dispatchedActions.length).toBe(0);

    // Manually trigger onDone at 200ms
    vi.advanceTimersByTime(200);
    queue.getActiveFx()?.onDone();

    // Verify dispatched exactly once
    expect(dispatchedActions).toEqual([
      {
        type: 'FINISH_EFFECT_DRAW',
        completedDrawId: 'draw-999',
      },
    ]);

    // Advance time past the 600ms safety timeout to ensure it doesn't dispatch a second time
    vi.advanceTimersByTime(1000);
    expect(dispatchedActions.length).toBe(1);
  });

  it('5. ignores events that are not registered in fxRegistry', () => {
    const registry: Partial<Record<GameEventType, FxEntry>> = {}; // Empty registry
    const queue = new FxQueue({ registry });

    const event: GameEvent = { id: 'evt-ignored', type: 'CARD_PLAYED', turn: 1 };
    queue.enqueue([event]);

    expect(queue.getActiveFx()).toBeNull();
    expect(queue.getQueueLength()).toBe(0);
    expect(queue.getIsBlocking()).toBe(false);
  });
});
