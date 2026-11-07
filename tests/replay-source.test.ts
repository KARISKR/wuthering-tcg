import { describe, it, expect } from 'vitest';
import { ReplaySource } from '../src/battle/ReplaySource';
import { createInitialGameState } from '../src/engine/gameEngine';
import { step } from '../src/engine/step';
import { stateFingerprint } from '../src/engine/replay';
import type { ReplayV2 } from '../src/utils/replayManager';
import { CURRENT_GAME_VERSION } from '../src/data/gameVersion';
import type { GameAction } from '../src/engine/events';

describe('ReplaySource unit tests', () => {
  function makeSampleV2(): ReplayV2 {
    const seed = 12345;
    let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI', null, null, 'P0', 'P1', seed);
    const actions: GameAction[] = [
      { type: 'SET_INITIATIVE', firstPlayerIndex: 0, roll0: 6, roll1: 2 },
      { type: 'SELECT_STARTING_LEADER', p0LeaderIdOrName: '방랑자', p1LeaderIdOrName: '치샤' },
      { type: 'MULLIGAN', p0DiscardIds: [], p1DiscardIds: [] },
      { type: 'DRAW_CARDS', playerIndex: 0 },
      { type: 'END_TURN' },
    ];

    for (const a of actions) {
      state = step(state, a).state;
    }

    return {
      format: 2,
      engineVersion: CURRENT_GAME_VERSION,
      start: {
        p0PresetKey: 'STARTER_ROVER',
        p1PresetKey: 'STARTER_CHIXIA',
        gameMode: 'AI',
        p0Deck: null,
        p1Deck: null,
        p0Name: 'P0',
        p1Name: 'P1',
        seed,
      },
      actions,
      finalFingerprint: stateFingerprint(state),
    };
  }

  it('initializes ReplaySource and matches fingerprint & version', () => {
    const v2 = makeSampleV2();
    const source = new ReplaySource(v2);

    expect(source.kind).toBe('replay');
    expect(source.isVersionMatched).toBe(true);
    expect(source.isFingerprintMatched).toBe(true);
    expect(source.getTotalFrames()).toBe(v2.actions.length);
    expect(source.getCurrentIndex()).toBe(0);
    expect(source.getState().phase).toBe('LEADER_SELECT');
  });

  it('steps forward and backward correctly notifying listeners', () => {
    const v2 = makeSampleV2();
    const source = new ReplaySource(v2);

    let notifyCount = 0;
    source.subscribe((state, events) => {
      notifyCount++;
    });

    // Step forward 1
    const ok1 = source.stepForward();
    expect(ok1).toBe(true);
    expect(source.getCurrentIndex()).toBe(1);
    expect(notifyCount).toBe(1);

    // Step forward 2
    source.stepForward();
    expect(source.getCurrentIndex()).toBe(2);
    expect(notifyCount).toBe(2);

    // Step backward
    const okBack = source.stepBackward();
    expect(okBack).toBe(true);
    expect(source.getCurrentIndex()).toBe(1);
    expect(notifyCount).toBe(3);

    // Jump to turn
    source.jumpToTurn(1);
    expect(source.getState().turn).toBe(1);

    source.destroy();
  });

  it('handles play and pause interval lifecycle', async () => {
    const v2 = makeSampleV2();
    const source = new ReplaySource(v2);

    source.setSpeed(4);
    expect(source.getSpeed()).toBe(4);

    source.play();
    expect(source.getIsPlaying()).toBe(true);

    source.pause();
    expect(source.getIsPlaying()).toBe(false);

    source.destroy();
  });
});
