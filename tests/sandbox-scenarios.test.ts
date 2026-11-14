// 카드 테스트 모드(샌드박스) 시나리오 테스트 — buildSandboxState로 장면을 몇 줄에 만들고 실제 step으로 진행한다.
// 새 카드 버그를 재현할 때 이 파일처럼: 설정 → step → 기대값.
import { describe, it, expect } from 'vitest';
import { buildSandboxState } from '../src/engine/sandbox';
import { step } from '../src/engine/step';
import type { GameState } from '../src/types/tcg';

const ROVER_F_LV0 = 'BP01-018'; // 방랑자(여) Lv.0: 【리더】【배틀】 녹색 배틀 시 덱 위 최대 2장 공개·패 추가
const SCAN = 'SD01-020'; // 스캔 (녹색, 속도 5)
const PUNG = 'SD01-007'; // 펑펑·일반 공격 (적색)
const STRONG_F = 'BP01-065'; // 소리의 변화·강공격 (방랑자(여)): 【콤보】 패 1장 버리면 데미지 +1
const CHIXIA_LV0 = 'BP01-027';

const handId = (s: GameState, p: 0 | 1, code: string) => s.players[p].hand.find((c) => c.code === code)!.id;

describe('sandbox: buildSandboxState', () => {
  it('builds the requested scene (leader stack, hand, deck top, trash, concerto, hp, dominance)', () => {
    const s = buildSandboxState({
      p0: { leader: [ROVER_F_LV0, 'BP01-017'], hand: [SCAN, PUNG], deckTop: [STRONG_F], trash: [PUNG], concerto: 3, hp: 7, dominance: true },
      p1: { leader: [CHIXIA_LV0] },
      startPhase: 'ACTION_PHASE',
    });
    const p = s.players[0];
    expect(s.phase).toBe('ACTION_PHASE');
    expect(s.gameMode).toBe('SOLO_DUAL');
    expect(p.slots.leader.code).toBe('BP01-017');
    expect(p.slots.leader.underlyingCards!.map((c) => c.code)).toEqual([ROVER_F_LV0]);
    expect(p.hand.map((c) => c.code)).toEqual([SCAN, PUNG]);
    expect(p.actionDeck[0].code).toBe(STRONG_F);
    expect(p.dropZone.map((c) => c.code)).toEqual([PUNG]);
    expect(p.concertoZone.length).toBe(3);
    expect(p).toMatchObject({ hp: 7, hasDominance: true, isAi: false });
    // 레벨업용 캐릭터 덱에 방랑자(여) Lv.2가 들어 있다 (이미 쓴 Lv.1 BP01-017은 제외)
    expect(p.characterDeck.some((c) => c.level === 2)).toBe(true);
    expect(p.characterDeck.some((c) => c.code === 'BP01-017')).toBe(false);
    // 카드 id가 겹치지 않는다
    const ids = [...p.hand, ...p.actionDeck, ...p.concertoZone, ...p.dropZone].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rejects unknown card codes with a readable message', () => {
    expect(() => buildSandboxState({ p0: { leader: ['NOPE-000'] }, p1: { leader: [CHIXIA_LV0] }, startPhase: 'ACTION_PHASE' })).toThrow(/NOPE-000/);
  });
});

describe('sandbox scenarios', () => {
  it('방랑자 Lv.0 + 스캔(녹색): 배틀 효과 장수 선택이 판정 전에 뜨고, 그때 양쪽 대결 카드가 공개돼 있다', () => {
    let s = buildSandboxState({
      p0: { leader: [ROVER_F_LV0], hand: [SCAN] },
      p1: { leader: [CHIXIA_LV0], hand: [PUNG] },
      startPhase: 'CLASH_SET',
    });
    s = step(s, { type: 'SET_CLASH_CARD', playerIndex: 0, cardId: handId(s, 0, SCAN) }).state;
    s = step(s, { type: 'SET_CLASH_CARD', playerIndex: 1, cardId: handId(s, 1, PUNG) }).state;
    s = step(s, { type: 'RESOLVE_CLASH' }).state;

    expect(s.phase).toBe('CLASH_REVEAL');
    expect(s.clashResult).toBeNull(); // 아직 판정 전
    expect(s.pendingChoice).toMatchObject({ playerIndex: 0, onResolveType: 'ROVER_0_DRAW_PROMPT' });
    // 선택 창의 대결 카드 띠(BattleOverlayHost → EffectChoiceModal clashCards)가 쓰는 값
    expect(s.players[0].clashCard?.code).toBe(SCAN);
    expect(s.players[1].clashCard?.code).toBe(PUNG);

    const hand = s.players[0].hand.length;
    s = step(s, { type: 'RESOLVE_PENDING_CHOICE', chosenCardIds: ['2'] }).state;
    expect(s.players[0].hand.length).toBe(hand + 2);
  });

  it('소리의 변화·강공격 연격: 패 1장을 버리면 데미지 +1, 버리지 않으면 기본 데미지', () => {
    const scene = () =>
      buildSandboxState({
        p0: { leader: [ROVER_F_LV0], hand: [STRONG_F, SCAN] },
        p1: { leader: [CHIXIA_LV0], hp: 20 },
        startPhase: 'COMBO_STEP',
      });
    const base = scene();
    const dmg = base.players[0].hand.find((c) => c.code === STRONG_F)!.damage;

    const plain = step(base, { type: 'COMBO_ATTACK', playerIndex: 0, cardId: handId(base, 0, STRONG_F) }).state;
    expect(20 - plain.players[1].hp).toBe(dmg);

    const s = scene();
    const withDiscard = step(s, {
      type: 'COMBO_ATTACK',
      playerIndex: 0,
      cardId: handId(s, 0, STRONG_F),
      discardForBonusDmgId: handId(s, 0, SCAN),
    }).state;
    expect(20 - withDiscard.players[1].hp).toBe(dmg + 1);
    expect(withDiscard.players[0].dropZone.some((c) => c.code === SCAN)).toBe(true);
  });
});
