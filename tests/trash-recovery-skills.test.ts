// 2026-11-12 점검 14번: Lv.1 "트래시에서 1장 회수" 4종을 표 하나로 합친 뒤에도 옛 동작·문구가 같은지
// (기대값은 합치기 전 코드 gameEngine.ts applyCharacterEvolutionSkills 1~4번 블록에서 그대로 옮김)
import { describe, it, expect } from 'vitest';
import { createInitialGameState, applyCharacterEvolutionSkills, isNormalAttackCard, isIntroSkillCard } from '../src/engine/gameEngine';
import { OFFICIAL_CARDS } from '../src/data/officialCards';
import type { ActionCard, CharacterCard, GameState } from '../src/types/tcg';

const CASES = [
  { code: 'BP01-003', name: '카멜리아', what: '<일반 공격>', emptyWhat: '<일반 공격>', key: 'cam1', match: (c: ActionCard) => isNormalAttackCard(c) },
  { code: 'BP01-009', name: '파수인', what: '<변주 스킬>', emptyWhat: '<변주 스킬>', key: 'sh1', match: (c: ActionCard) => isIntroSkillCard(c) },
  { code: 'BP01-013', name: '앙코', what: '【앙코】의 적색', emptyWhat: '【앙코】 적색', key: 'anke1', match: (c: ActionCard) => c.color === 'RED' && Boolean(c.characterExclusive?.includes('앙코')) },
  { code: 'BP01-026', name: '치샤', what: '<기본 공격>', emptyWhat: '<기본 공격>', key: 'chixia1', match: (c: ActionCard) => isNormalAttackCard(c) },
];

const lv1 = (code: string): CharacterCard => {
  const c = OFFICIAL_CARDS.find((x) => x.code === code && x.kind === 'CHARACTER')!;
  return { ...(c as unknown as CharacterCard), id: `t-${code}`, underlyingCards: [] };
};
const matching = (match: (c: ActionCard) => boolean) =>
  ({ ...(OFFICIAL_CARDS.find((x) => x.kind === 'ACTION' && match(x as unknown as ActionCard)) as unknown as ActionCard), id: 'want' });
const other = () => ({ ...(OFFICIAL_CARDS.find((x) => x.code === 'SD01-022') as unknown as ActionCard), id: 'other' }); // 회수 대상 아닌 카드

function run(code: string, isAi: boolean, drop: ActionCard[]): GameState {
  const s = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', isAi ? 'AI' : 'SOLO_DUAL', null, null, undefined, undefined, 5);
  const idx = isAi ? 1 : 0;
  s.players[idx].dropZone = drop;
  const card = lv1(code);
  const prev = { ...s.players[idx].slots.leader };
  return applyCharacterEvolutionSkills(s, idx as 0 | 1, 'leader', card, prev, false);
}

describe.each(CASES)('$name Lv.1 ($code) trash recovery', (c) => {
  it('AI takes the matching card from the trash into its hand', () => {
    const after = run(c.code, true, [other(), matching(c.match)]);
    const p = after.players[1];
    expect(p.hand.some((h) => h.id === 'want')).toBe(true);
    expect(p.dropZone.map((d) => d.id)).toEqual(['other']);
    expect(after.logs[0].text).toContain(`[트래시 회수] [${c.name} Lv.1 등장 효과] 트래시에서 [`);
  });

  it('a human gets a choice with only the matching cards (same title/description as before)', () => {
    const after = run(c.code, false, [other(), matching(c.match)]);
    const ch = after.pendingChoice!;
    expect(ch).toMatchObject({
      title: `${c.name} Lv.1 등장 효과 발동 (트래시 회수)`,
      sourceCardName: `${c.name} [${c.code}]`,
      description: `【등장 효과 발동】 트래시 에리어에서 ${c.what} 카드 1장을 패에 추가할 수 있습니다.`,
      minSelect: 0,
      maxSelect: 1,
      onResolveType: 'RECOVER_FROM_DROP',
      sourceZone: 'DROP',
    });
    expect(ch.revealedCards.map((r) => r.id)).toEqual(['want']);
  });

  it('with nothing to recover a human sees a notice', () => {
    const after = run(c.code, false, [other()]);
    expect(after.pendingChoice).toMatchObject({
      id: expect.stringMatching(new RegExp(`-${c.key}-empty$`)),
      onResolveType: 'VIEW_ONLY',
      description: `【등장 효과 발동】 트래시 에리어에 회수 가능한 ${c.emptyWhat} 카드가 없어 효과가 종료되었습니다.`,
    });
  });
});
