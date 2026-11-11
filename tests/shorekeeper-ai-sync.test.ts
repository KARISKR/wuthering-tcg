// 2026-11-12 점검 7번: AI 쪽 파수인 효과가 로그만 남고 손패·덱에 반영되지 않던 버그 재현
// (triggerShorekeeper* 가 플레이어를 복제해 newState에 넣는데, 부른 함수가 끝에서 옛 지역 변수로 덮어썼다)
import { describe, it, expect } from 'vitest';
import { createInitialGameState, finishClashJudgment, applyBattleStepSkills } from '../src/engine/gameEngine';
import { OFFICIAL_CARDS } from '../src/data/officialCards';
import type { ActionCard, CharacterCard, GameState } from '../src/types/tcg';

function charCard(code: string, characterName: string, extra: Partial<CharacterCard> = {}): CharacterCard {
  const c = OFFICIAL_CARDS.find((x) => x.code === code && x.kind === 'CHARACTER')!;
  return { ...(c as unknown as CharacterCard), id: `t-${code}`, characterName, underlyingCards: [], ...extra };
}
function action(color: 'RED' | 'GREEN' | 'BLUE', code: string, base?: string): ActionCard {
  const src = (base
    ? OFFICIAL_CARDS.find((x) => x.code === base)
    : OFFICIAL_CARDS.find((x) => x.kind === 'ACTION' && (x as ActionCard).color === color))! as unknown as ActionCard;
  return { ...src, id: `t-${code}`, code, color, damage: 1, effectType: undefined, pursuitCount: 0, characterExclusive: '일반' } as ActionCard;
}
function aiState(): GameState {
  const s = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI', null, null, undefined, undefined, 4242);
  expect(s.players[1].isAi).toBe(true);
  return s;
}

describe('AI shorekeeper effects are kept in the state', () => {
  it('BP01-006 heal draw: green win heal adds a card to the AI hand', () => {
    let s = aiState();
    const p1 = s.players[1];
    p1.slots.leader = charCard('BP01-010', '파수인');
    p1.slots.leftSupport = charCard('BP01-006', '파수인');
    p1.clashCard = action('GREEN', 'TEST-G');
    s.players[0].clashCard = action('BLUE', 'TEST-B');
    s = { ...s, phase: 'CLASH_REVEAL', activePlayerIndex: 1 };
    const hand = p1.hand.length;
    const deck = p1.actionDeck.length;

    const after = finishClashJudgment(s);
    expect(after.players[1].hp).toBe(21);
    expect(after.players[1].hand.length).toBe(hand + 1);
    expect(after.players[1].actionDeck.length).toBe(deck - 1);
  });

  it('BP01-008 switch draw/discard: battle-step leader swap (BP01-076) moves a deck card to the trash', () => {
    let s = aiState();
    const p1 = s.players[1];
    p1.slots.leader = charCard('BP01-008', '파수인');
    p1.slots.leftSupport = charCard('BP01-033', '산화');
    p1.clashCard = action('BLUE', 'BP01-076', 'BP01-076');
    s = { ...s, phase: 'CLASH_REVEAL', activePlayerIndex: 1 };
    const hand = p1.hand.length;
    const deck = p1.actionDeck.length;
    const drop = p1.dropZone.length;

    const after = applyBattleStepSkills(s);
    const q = after.players[1];
    expect(q.slots.leader.characterName).toBe('산화');
    expect(q.actionDeck.length).toBe(deck - 1); // 1장 뽑고
    expect(q.hand.length).toBe(hand); // 1장 버림
    expect(q.dropZone.length).toBe(drop + 1);
  });
});
