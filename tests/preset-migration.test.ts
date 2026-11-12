/**
 * 프리셋 보관함 폐지 (2026-11-13): 예전에 저장한 사용자 프리셋은 처음 getUserDecks() 때 '내 덱'으로 한 번만 옮긴다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getUserDecks, getDefaultPresets } from '../src/utils/deckCode';
import { COMMUNITY_DECK_PRESETS } from '../src/data/communityDecks';

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
};

const base = COMMUNITY_DECK_PRESETS[0];
const userDeck = (name: string) => ({ id: `user-deck-${name}`, name, leader: {}, leftSupport: {}, rightSupport: {}, actionCards: [] });

beforeEach(() => store.clear());

describe('예전 프리셋 → 내 덱 이전', () => {
  it('moves only user-made presets, once, skipping built-ins and same-name decks', () => {
    store.set('wuthering_user_decks', JSON.stringify([userDeck('이미 있는 덱')]));
    store.set(
      'wuthering_deck_presets',
      JSON.stringify([
        ...getDefaultPresets(), // 기본 제공 덱은 옮기지 않음
        { ...base, id: 'preset-my-1', name: '내가 저장한 덱', isOfficial: false },
        { ...base, id: 'preset-imported-1', name: '이미 있는 덱', isOfficial: false }, // 같은 이름은 건너뜀
        { ...base, id: 'preset-sld-old', name: '예전 시드', isOfficial: false },
        { id: 'broken' }, // 리더 없음 → 건너뜀
      ])
    );

    const names = getUserDecks().map((d) => d.name);
    expect(names).toEqual(['이미 있는 덱', '내가 저장한 덱']);
    const moved = getUserDecks().find((d) => d.name === '내가 저장한 덱')!;
    expect(moved.id).toBe('user-deck-preset-preset-my-1');
    expect(moved.actionCards.length).toBe(40);

    // 두 번째 호출에서 다시 옮기지 않음 (내 덱에서 지워도 되살아나지 않음)
    store.set('wuthering_user_decks', JSON.stringify([userDeck('이미 있는 덱')]));
    expect(getUserDecks().map((d) => d.name)).toEqual(['이미 있는 덱']);
    // 원본 프리셋 저장값은 지우지 않음
    expect(store.get('wuthering_deck_presets')).toContain('내가 저장한 덱');
  });

  it('leaves my decks alone when the saved presets are unreadable', () => {
    store.set('wuthering_user_decks', JSON.stringify([userDeck('A')]));
    store.set('wuthering_deck_presets', '{not json');
    expect(getUserDecks().map((d) => d.name)).toEqual(['A']);
  });
});
