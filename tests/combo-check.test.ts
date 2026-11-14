// 2026-11-12 점검 10번: 화면의 "연격 가능" 판정(canPlayerExecuteCombo)과 엔진(executeComboAttack)이 같은 답을 내는지
import { describe, it, expect } from 'vitest';
import { createInitialGameState, canPlayerExecuteCombo, executeComboAttack } from '../src/engine/gameEngine';
import { OFFICIAL_CARDS } from '../src/data/officialCards';
import type { ActionCard, CharacterCard, GameState } from '../src/types/tcg';

function setup(leaderCode: string, leaderName: string, card: Partial<ActionCard>, concerto: number, dominance = false): GameState {
  const s = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI', null, null, undefined, undefined, 7);
  const p = s.players[0];
  const lead = OFFICIAL_CARDS.find((x) => x.code === leaderCode && x.kind === 'CHARACTER')!;
  p.slots.leader = { ...(lead as unknown as CharacterCard), id: 't-lead', characterName: leaderName, underlyingCards: [] };
  const base = OFFICIAL_CARDS.find((x) => x.kind === 'ACTION')! as unknown as ActionCard;
  p.hand = [{ ...base, id: 't-card', color: 'RED', characterExclusive: '일반', feature: '', description: '', ...card } as ActionCard];
  p.concertoZone = p.actionDeck.splice(0, concerto);
  p.comboUnlimited = true;
  p.hasDominance = dominance;
  p.actionArea = [];
  return { ...s, phase: 'COMBO_STEP', activePlayerIndex: 0 };
}

const both = (s: GameState) => ({
  ui: canPlayerExecuteCombo(s.players[0]),
  engine: executeComboAttack(s, 0, 't-card').success,
});

describe('combo availability matches the engine', () => {
  it('금희 Lv.1 리더라도 코스트 할인은 없다 (협주 1, 2코스트 적색)', () => {
    expect(both(setup('SD02-006', '금희', { code: 'TEST-R2', cost: 2 }, 1))).toEqual({ ui: false, engine: false });
  });

  it('BP01-062 우세 할인(-1)은 둘 다 반영한다 (협주 1, 2코스트)', () => {
    expect(both(setup('BP01-015', '앙코', { code: 'BP01-062', cost: 2, characterExclusive: '일반' }, 1, true))).toEqual({ ui: true, engine: true });
  });
});

// 2026-11-14 버그 제보: 소리의 변화·강공격(BP01-065/067)을 사람이 연격으로 쓰면 "패 1장 버리고 +1" 효과를 못 썼다
// (화면이 버릴 카드를 넘기지 않았음). 엔진 쪽 규칙을 고정한다.
describe('BP01-065 discard bonus in the combo step', () => {
  function withDiscardCard() {
    const s = setup('BP01-018', '방랑자(여)', { code: 'BP01-065', cost: 0, damage: 2, nameKr: '소리의 변화·강공격' }, 0);
    const extra = { ...s.players[0].actionDeck[0], id: 't-extra' } as ActionCard;
    s.players[0].hand.push(extra);
    s.players[0].actionDeck = s.players[0].actionDeck.slice(1);
    return s;
  }
  const oppHp = (s: GameState) => s.players[1].hp;

  it('discarding a card adds +1 damage and sends the card to the trash', () => {
    const s = withDiscardCard();
    const before = oppHp(s);
    const res = executeComboAttack(s, 0, 't-card', undefined, 't-extra');
    expect(res.success).toBe(true);
    expect(before - oppHp(res.newState)).toBe(3);
    expect(res.newState.players[0].dropZone.some((c) => c.id === 't-extra')).toBe(true);
  });

  it('attacking without a discard keeps the base damage and the hand card', () => {
    const s = withDiscardCard();
    const before = oppHp(s);
    const res = executeComboAttack(s, 0, 't-card');
    expect(before - oppHp(res.newState)).toBe(2);
    expect(res.newState.players[0].hand.some((c) => c.id === 't-extra')).toBe(true);
  });
});
