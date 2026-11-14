// src/engine/sandbox.ts
// 카드 효과 테스트 모드(샌드박스): 원하는 장면의 게임 상태를 바로 만든다 (2026-11-14)
// - 화면(SandboxSetup)과 테스트가 같은 함수를 쓴다: "리더 X + 내 카드 Y + 상대 카드 Z" 시나리오를 몇 줄로.
// - 순수 함수: 같은 설정·시드면 항상 같은 상태 (실제 시간·전역 난수 없음, tests/engine-purity.test.ts)
import type { ActionCard, CharacterCard, GameState, PlayerState } from '../types/tcg';
import { ALL_CHARACTERS, getHighestRarityActionCard } from '../data/cards';
import { createInitialGameState, isSameCharacter } from './gameEngine';
import { logTimestamp } from './rng';

export interface SandboxSideConfig {
  /** 리더 캐릭터 카드 코드: 아래(Lv.0)부터 위로 쌓은 순서. 예) ['BP01-018'] 또는 ['BP01-018', 'BP01-017'] */
  leader: string[];
  leftSupport?: string[] | null;
  rightSupport?: string[] | null;
  /** 손패 액션 카드 코드. 생략하면 스타터 덱의 첫 패 5장 */
  hand?: string[];
  /** 덱 맨 위부터 놓을 카드 코드 (덱 위 공개·드로우 효과 시험용) */
  deckTop?: string[];
  /** 트래시 카드 코드 (회수 효과 시험용) */
  trash?: string[];
  /** 협주 에리어 장수 (덱 맨 아래 카드로 채움) */
  concerto?: number;
  hp?: number;
  dominance?: boolean;
}

export type SandboxStartPhase = 'ACTION_PHASE' | 'CLASH_SET' | 'COMBO_STEP';

export interface SandboxConfig {
  p0: SandboxSideConfig;
  p1: SandboxSideConfig;
  /** 지금 턴을 진행하는 플레이어 (기본 0) */
  activePlayer?: 0 | 1;
  startPhase: SandboxStartPhase;
  /** 연격 단계로 시작할 때 턴 플레이어의 남은 연격 횟수. 생략하면 무제한(적색 승리처럼) */
  comboCount?: number;
  seed?: number;
}

function characterByCode(code: string): CharacterCard {
  const c = ALL_CHARACTERS.find((x) => x.code === code);
  if (!c) throw new Error(`샌드박스: 캐릭터 카드 코드를 찾을 수 없습니다: ${code}`);
  return c;
}

function actionByCode(code: string, id: string): ActionCard {
  const c = getHighestRarityActionCard(code);
  if (!c) throw new Error(`샌드박스: 액션 카드 코드를 찾을 수 없습니다: ${code}`);
  return { ...c, id };
}

/** 아래부터 위로 쌓은 캐릭터 카드 코드 → 슬롯 카드 (위 카드 + underlyingCards) */
function buildSlot(codes: string[], idPrefix: string): CharacterCard {
  if (codes.length === 0) throw new Error('샌드박스: 캐릭터 카드를 1장 이상 골라야 합니다.');
  const cards = codes.map((code, i) => ({ ...characterByCode(code), id: `${idPrefix}-${i}-${code}`, underlyingCards: undefined }));
  const top = cards[cards.length - 1];
  return { ...top, underlyingCards: cards.slice(0, -1) };
}

function applySide(base: PlayerState, cfg: SandboxSideConfig, pIdx: 0 | 1): PlayerState {
  const pre = `sbx-p${pIdx}`;
  const slots = {
    leader: buildSlot(cfg.leader, `${pre}-leader`),
    leftSupport: cfg.leftSupport?.length ? buildSlot(cfg.leftSupport, `${pre}-left`) : null,
    rightSupport: cfg.rightSupport?.length ? buildSlot(cfg.rightSupport, `${pre}-right`) : null,
  };

  // 레벨업용 캐릭터 덱: 필드 캐릭터들의 Lv.1·2 카드 중 아직 쓰지 않은 것 (코드별 1장)
  const fieldCards = [slots.leader, slots.leftSupport, slots.rightSupport].filter(Boolean) as CharacterCard[];
  const usedCodes = new Set(fieldCards.flatMap((c) => [c.code, ...(c.underlyingCards || []).map((u) => u.code)]));
  const seenCodes = new Set<string>();
  const characterDeck = ALL_CHARACTERS.filter(
    (c) => c.level >= 1 && !usedCodes.has(c.code) && fieldCards.some((f) => isSameCharacter(c, f)) && !seenCodes.has(c.code) && seenCodes.add(c.code)
  ).map((c, i) => ({ ...c, id: `${pre}-cdeck-${i}-${c.code}` }));

  // 액션 카드: 스타터 덱 40장을 바탕으로 손패·덱 위·협주를 맞춘다
  let pool = [...base.hand, ...base.actionDeck];
  const hand = cfg.hand ? cfg.hand.map((code, i) => actionByCode(code, `${pre}-hand-${i}-${code}`)) : pool.splice(0, 5);
  const deckTop = (cfg.deckTop || []).map((code, i) => actionByCode(code, `${pre}-top-${i}-${code}`));
  const concertoCount = Math.max(0, Math.min(cfg.concerto ?? 0, pool.length));
  const concertoZone = pool.splice(pool.length - concertoCount, concertoCount);
  pool = [...deckTop, ...pool];

  return {
    ...base,
    hp: cfg.hp ?? base.hp,
    hasDominance: Boolean(cfg.dominance),
    slots,
    characterDeck,
    hand,
    actionDeck: pool,
    concertoZone,
    dropZone: (cfg.trash || []).map((code, i) => actionByCode(code, `${pre}-trash-${i}-${code}`)),
    actionArea: [],
    clashCard: null,
    clashCardReady: false,
    comboCount: 0,
    comboUnlimited: false,
    isAi: false,
  };
}

/** 설정대로 장면을 만든 1인 2역(SOLO_DUAL) 게임 상태 */
export function buildSandboxState(config: SandboxConfig): GameState {
  const base = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'SOLO_DUAL', null, null, '플레이어 1', '플레이어 2', config.seed ?? 1);
  const active = config.activePlayer ?? 0;
  const p0 = applySide(base.players[0], config.p0, 0);
  const p1 = applySide(base.players[1], config.p1, 1);
  if (config.startPhase === 'COMBO_STEP') {
    const ap = active === 0 ? p0 : p1;
    ap.comboUnlimited = config.comboCount === undefined;
    ap.comboCount = config.comboCount ?? 0;
  }
  const phaseLabel = { ACTION_PHASE: '액션 단계', CLASH_SET: '대결 세트', COMBO_STEP: '연격 단계' }[config.startPhase];
  return {
    ...base,
    turn: 2, // 첫 턴 드로우 예외(선공 1장) 없이 일반 턴처럼
    activePlayerIndex: active,
    firstPlayerIndex: active,
    firstTurnDrawCompleted: true,
    phase: config.startPhase,
    players: [p0, p1],
    clashResult: null,
    winner: null,
    logs: [
      {
        id: 'log-sandbox-start',
        turn: 2,
        text: `🧪 [카드 테스트 모드] ${phaseLabel}부터 시작합니다.`,
        type: 'SYSTEM',
        timestamp: logTimestamp(),
      },
      ...base.logs,
    ],
  };
}
