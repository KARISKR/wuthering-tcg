// 2026-11-12 점검 9번: 조작된 요청이 엔진에서 막히는지 (대결 카드 중복 세트, 필수 선택 미달)
import { describe, it, expect } from 'vitest';
import { createInitialGameState, setClashCard, resolvePendingChoice } from '../src/engine/gameEngine';
import type { GameState, PendingChoice } from '../src/types/tcg';

function clashState(): GameState {
  const s = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', null, null, undefined, undefined, 11);
  s.players[0].concertoZone = s.players[0].actionDeck.splice(0, 5);
  return { ...s, phase: 'CLASH_SET', activePlayerIndex: 0 };
}

describe('engine rejects forged actions', () => {
  it('a second clash card cannot replace (and lose) the first one', () => {
    const s = clashState();
    const hand = s.players[0].hand.filter((c) => c.color && (c.cost ?? 0) <= 5);
    const first = setClashCard(s, 0, hand[0].id);
    expect(first.success).toBe(true);
    const second = setClashCard(first.newState, 0, hand[1].id);
    expect(second.success).toBe(false);
    const p = second.newState.players[0];
    expect(p.clashCard?.id).toBe(hand[0].id);
    expect(p.hand.some((c) => c.id === hand[1].id)).toBe(true);
  });

  it('clash cards cannot be set outside the clash set phase', () => {
    const s = { ...clashState(), phase: 'ACTION_PHASE' as const };
    expect(setClashCard(s, 0, s.players[0].hand[0].id).success).toBe(false);
  });

  it('a required discard (minSelect 1) cannot be skipped with an empty choice', () => {
    const s = clashState();
    const choice: PendingChoice = {
      id: 'ch-discard',
      playerIndex: 0,
      title: 't',
      sourceCardName: 's',
      description: 'd',
      revealedCards: [...s.players[0].hand],
      minSelect: 1,
      maxSelect: 1,
      onResolveType: 'DISCARD_FROM_HAND',
      sourceZone: 'HAND',
    };
    const st: GameState = { ...s, pendingChoice: choice };
    const skipped = resolvePendingChoice(st, []);
    expect(skipped.pendingChoice?.id).toBe('ch-discard');
    expect(skipped.players[0].hand.length).toBe(s.players[0].hand.length);

    const done = resolvePendingChoice(st, [s.players[0].hand[0].id]);
    expect(done.players[0].hand.length).toBe(s.players[0].hand.length - 1);
  });
});
