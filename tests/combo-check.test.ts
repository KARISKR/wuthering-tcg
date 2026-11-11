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
