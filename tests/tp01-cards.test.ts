// TP01 카드 5종 효과 테스트 (연역 / 타오르는 넝쿨의 춤 / 그늘이와 구름이 출격·공중 공격 / 공명 촉진제 / 심장의 선택)
import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  finishClashJudgment,
  executeBattlePhaseEndStep,
  resolvePendingChoice,
  findAllUpgradableCards,
} from '../src/engine/gameEngine';
import { getHighestRarityActionCard, ALL_CHARACTERS } from '../src/data/cards';
import { OFFICIAL_CARDS } from '../src/data/officialCards';
import type { ActionCard, GameState, PlayerState } from '../src/types/tcg';

let uid = 0;
const card = (code: string): ActionCard => {
  const t = getHighestRarityActionCard(code);
  if (!t) throw new Error(`card ${code} not found`);
  return { ...t, id: `${code}-test-${uid++}` };
};

const base = (): GameState => {
  const s = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', null, null, undefined, undefined, 7);
  return { ...s, activePlayerIndex: 0, phase: 'CLASH_REVEAL' };
};

/** p0 / p1 대결 카드와 상태를 세팅하고 판정 */
const judge = (
  c0: ActionCard | null,
  c1: ActionCard | null,
  tweak: (p0: PlayerState, p1: PlayerState) => void = () => {}
): GameState => {
  const s = base();
  const p0 = { ...s.players[0], clashCard: c0, hasDominance: false };
  const p1 = { ...s.players[1], clashCard: c1, hasDominance: false };
  tweak(p0, p1);
  return finishClashJudgment({ ...s, players: [p0, p1] });
};

const anko = ALL_CHARACTERS.find((c) => c.characterName === '앙코' && c.level === 0)!;

describe('카드 데이터', () => {
  it('TP01-001~005 다섯 장이 카드 풀에 있다', () => {
    const codes = ['TP01-001', 'TP01-002', 'TP01-003', 'TP01-004', 'TP01-005'];
    codes.forEach((c) => expect(getHighestRarityActionCard(c), c).toBeDefined());
    expect(getHighestRarityActionCard('TP01-004')!.characterExclusive).toBeUndefined(); // 아이템 = 누구나 사용
  });

  it('속성: 캐릭터는 모두 있고, 액션 카드는 특성(feature)에 적힌 속성 (없으면 null)', () => {
    const ELEMENTS = ['회절', '기류', '용융', '응결', '인멸', '전도'];
    const chars = OFFICIAL_CARDS.filter((c) => c.kind === 'CHARACTER');
    const actions = OFFICIAL_CARDS.filter((c) => c.kind === 'ACTION');
    expect(chars.length).toBeGreaterThan(0);
    expect(actions.length).toBeGreaterThan(0);
    chars.forEach((c) => expect(c.element, c.code).toBeTruthy());
    actions.forEach((c) => {
      const fromFeature = (c.feature || '').split(',').map((s) => s.trim()).find((s) => ELEMENTS.includes(s)) ?? null;
      expect(c.element, `${c.code} ${c.nameKr}`).toBe(fromFeature);
    });
    const el = (code: string) => OFFICIAL_CARDS.find((c) => c.code === code)!.element;
    expect(el('TP01-001')).toBe('회절');
    expect(el('TP01-002')).toBe('인멸');
    expect(el('TP01-003')).toBe('용융');
    expect(el('TP01-004')).toBeNull();
    expect(new Set(actions.map((c) => c.element)).size).toBeGreaterThan(2); // 전부 같은 값으로 뭉개지지 않았는지
  });
});

describe('TP01-001 연역', () => {
  it('【우세】면 스피드 14 → 스피드 12 상대(같은 적색)에게 승리, 우세가 아니면 8로 패배', () => {
    const win = judge(card('TP01-001'), card('SD01-011'), (p0) => (p0.hasDominance = true));
    expect(win.clashResult!.winnerIndex).toBe(0);
    const lose = judge(card('TP01-001'), card('SD01-011'));
    expect(lose.clashResult!.winnerIndex).toBe(1);
  });

  it('승리 시 트래시의 「연역」 이외 【파수인】 카드 1장을 패에 (AI 자동)', () => {
    const theory = card('BP01-056'); // 혼돈의 이론 (파수인)
    const otherDeduction = card('TP01-001');
    const s = judge(card('TP01-001'), card('SD01-011'), (p0) => {
      p0.hasDominance = true;
      p0.isAi = true;
      p0.dropZone = [otherDeduction, theory];
    });
    const p0 = s.players[0];
    expect(p0.hand.some((c) => c.id === theory.id)).toBe(true);
    expect(p0.dropZone.some((c) => c.id === otherDeduction.id)).toBe(true); // 연역은 대상 아님
  });

  it('후보가 여러 장이면 사람은 트래시 회수 선택창', () => {
    const s = judge(card('TP01-001'), card('SD01-011'), (p0) => {
      p0.hasDominance = true;
      p0.dropZone = [card('BP01-056'), card('BP01-055')];
    });
    const queued = [...(s.deferredChoices || []), s.pendingChoice].filter(Boolean);
    expect(queued.some((c) => c!.onResolveType === 'RECOVER_FROM_DROP' && c!.revealedCards.length === 2)).toBe(true);
  });
});

describe('TP01-003 그늘이와 구름이 출격·공중 공격', () => {
  it('우세 + 리더 앙코 + 상대 스피드 11 이상이면 스피드 20으로 승리', () => {
    const s = judge(card('TP01-003'), card('SD01-011'), (p0) => {
      p0.hasDominance = true;
      p0.slots = { ...p0.slots, leader: anko };
    });
    expect(s.clashResult!.winnerIndex).toBe(0);
  });

  it('조건 하나라도 빠지면 그대로 스피드 5', () => {
    const noDominance = judge(card('TP01-003'), card('SD01-011'), (p0) => (p0.slots = { ...p0.slots, leader: anko }));
    expect(noDominance.clashResult!.winnerIndex).toBe(1);
    const noAnko = judge(card('TP01-003'), card('SD01-011'), (p0) => (p0.hasDominance = true));
    expect(noAnko.clashResult!.winnerIndex).toBe(1);
    // 상대 스피드 8(우세 아닌 연역) < 11 → 5 그대로라 패배
    const slowOpp = judge(card('TP01-003'), card('TP01-001'), (p0) => {
      p0.hasDominance = true;
      p0.slots = { ...p0.slots, leader: anko };
    });
    expect(slowOpp.clashResult!.winnerIndex).toBe(1);
  });

  it('상대 연역이 우세로 14가 되면 그 값으로 조건을 본다', () => {
    const s = judge(card('TP01-003'), card('TP01-001'), (p0, p1) => {
      p0.hasDominance = true;
      p0.slots = { ...p0.slots, leader: anko };
      p1.hasDominance = true;
    });
    expect(s.clashResult!.winnerIndex).toBe(0); // 20 > 14
  });
});

describe('TP01-005 심장의 선택', () => {
  it('승리 시 덱 위 2장을 협주 에리어에', () => {
    const before = base().players[0];
    const s = judge(card('TP01-005'), card('SD01-013'), () => {}); // 녹색 vs 청색 → 녹색 승리
    expect(s.clashResult!.winnerIndex).toBe(0);
    expect(s.players[0].concertoZone.length).toBe(before.concertoZone.length + 2);
    expect(s.players[0].actionDeck.length).toBe(before.actionDeck.length - 2);
  });

  it('【우세】 상태로 패배하면 2장, 우세가 아니면 0장', () => {
    const before = base().players[0].concertoZone.length;
    const dominant = judge(card('TP01-005'), card('SD01-011'), (p0) => (p0.hasDominance = true)); // 적색에 패배
    expect(dominant.clashResult!.winnerIndex).toBe(1);
    expect(dominant.players[0].concertoZone.length).toBe(before + 2);
    const plain = judge(card('TP01-005'), card('SD01-011'));
    expect(plain.players[0].concertoZone.length).toBe(before);
  });
});

describe('TP01-004 공명 촉진제', () => {
  const upgradableSlots = (p: PlayerState) =>
    (['leader', 'leftSupport', 'rightSupport'] as const).filter(
      (s) => p.slots[s] && findAllUpgradableCards(p.characterDeck, p.slots[s]!).length > 0
    );

  it('승리 시 AI는 레벨업 가능한 첫 캐릭터를 바로 레벨업', () => {
    const p0Before = base().players[0];
    const slots = upgradableSlots(p0Before);
    expect(slots.length).toBeGreaterThan(0);
    const s = judge(card('TP01-004'), card('SD01-013'), (p0) => (p0.isAi = true));
    expect(s.clashResult!.winnerIndex).toBe(0);
    const slot = slots[0];
    expect(s.players[0].slots[slot]!.level).toBeGreaterThan(p0Before.slots[slot]!.level ?? 0);
    expect(s.players[0].characterDeck.length).toBe(p0Before.characterDeck.length - 1);
  });

  it('【우세】 패배에도 발동, 우세가 아니면 발동하지 않음', () => {
    const p0Before = base().players[0];
    const slot = upgradableSlots(p0Before)[0];
    const dominant = judge(card('TP01-004'), card('SD01-011'), (p0) => {
      p0.isAi = true;
      p0.hasDominance = true;
    });
    expect(dominant.players[0].slots[slot]!.level).toBeGreaterThan(p0Before.slots[slot]!.level ?? 0);
    const plain = judge(card('TP01-004'), card('SD01-011'), (p0) => (p0.isAi = true));
    expect(plain.players[0].slots[slot]!.level).toBe(p0Before.slots[slot]!.level);
  });

  it('사람은 선택창, 슬롯 없는 선택은 고른 카드와 같은 캐릭터 슬롯을 레벨업', () => {
    const s = judge(card('TP01-004'), card('SD01-013'));
    const choice = (s.deferredChoices || []).find((c) => c.onResolveType === 'SELECT_EFFECT_UPGRADE');
    expect(choice).toBeDefined();

    // 리더가 아닌 캐릭터를 고른 경우에도 그 캐릭터 슬롯이 올라가야 한다
    const p0 = s.players[0];
    const supportSlot = (['leftSupport', 'rightSupport'] as const).find(
      (k) => p0.slots[k] && findAllUpgradableCards(p0.characterDeck, p0.slots[k]!).length > 0
    );
    expect(supportSlot).toBeDefined();
    const pick = findAllUpgradableCards(p0.characterDeck, p0.slots[supportSlot!]!)[0];
    const resolved = resolvePendingChoice(
      { ...s, clashResult: null, pendingChoice: { ...choice!, targetSlot: undefined, revealedCards: [pick] }, deferredChoices: [] },
      [pick.id]
    );
    expect(resolved.players[0].slots[supportSlot!]!.id).toBe(pick.id);
    expect(resolved.players[0].slots.leader!.id).toBe(p0.slots.leader!.id);
  });
});

describe('TP01-002 타오르는 넝쿨의 춤', () => {
  const endStep = (tweak: (p0: PlayerState) => void) => {
    const s = base();
    const p0 = { ...s.players[0], actionArea: [] as ActionCard[] };
    tweak(p0);
    return executeBattlePhaseEndStep({ ...s, phase: 'COMBO_STEP', players: [p0, s.players[1]] });
  };

  it('액션 에리어에 있으면 트래시의 「넝쿨의 춤」을 패에 (AI 자동)', () => {
    const vine = card('BP01-050');
    const s = endStep((p0) => {
      p0.isAi = true;
      p0.actionArea = [card('TP01-002')];
      p0.dropZone = [vine];
    });
    expect(s.players[0].hand.some((c) => c.id === vine.id)).toBe(true);
    expect(s.players[0].dropZone.some((c) => c.id === vine.id)).toBe(false);
  });

  it('액션 에리어에 없거나, 트래시에 「넝쿨의 춤」이 없으면 아무 일도 없음 (자기 자신은 대상 아님)', () => {
    const vine = card('BP01-050');
    const notInArea = endStep((p0) => {
      p0.isAi = true;
      p0.dropZone = [vine];
    });
    expect(notInArea.players[0].hand.some((c) => c.id === vine.id)).toBe(false);
    const self = card('TP01-002');
    const onlySelf = endStep((p0) => {
      p0.isAi = true;
      p0.actionArea = [card('TP01-002')];
      p0.dropZone = [self];
    });
    expect(onlySelf.players[0].hand.some((c) => c.id === self.id)).toBe(false);
  });

  it('사람은 0~1장 선택창', () => {
    const s = endStep((p0) => {
      p0.actionArea = [card('TP01-002')];
      p0.dropZone = [card('BP01-050')];
    });
    const queued = [s.pendingChoice, ...(s.pendingChoiceQueue || [])].filter(Boolean);
    const c = queued.find((q) => q!.sourceCardName.includes('TP01-002'));
    expect(c).toBeDefined();
    expect(c!.minSelect).toBe(0);
    expect(c!.onResolveType).toBe('RECOVER_FROM_DROP');
  });
});
