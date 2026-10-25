/**
 * 실제 UI(useGame.ts / GameBoard.tsx) 흐름을 1:1로 재현하는 풀 배틀 시뮬레이터 + 리플레이 검증기
 *
 * 사용법: npx tsx scripts/simulate_full_battle.ts [games=40] [verbose=0]
 *  - 'AI' 모드로 실제 유저 대전과 동일하게 생성 (P0 = 사람 좌석, P1 = AI 봇)
 *  - P0 좌석은 AI 판단 함수로 조작하되 사람용 선택 모달(pendingChoice)도 그대로 처리
 *  - 매 스텝 불변식(HP 범위/카드 보존/캐릭터 카드 오염/AI 좌석 선택창 노출/멈춤) 검사
 *  - 경기 종료 후 리플레이 데이터 생성 → 타임라인 빌드 → 로그 스냅샷과 1:1 대조
 */
import {
  createInitialGameState,
  selectStartingLeader,
  executeMulligan,
  executeDrawPhase,
  setClashCard,
  resolveClash,
  finishClashJudgment,
  continuePostClashOrBattlePhase,
  resolvePendingChoice,
  proceedAfterClashReveal,
  finishComboStep,
  canPlayerExecuteCombo,
  checkGameOver,
  executeEndPhase,
  decideAiStartingLeader,
} from '../src/engine/gameEngine';
import {
  decideAiMulligan,
  runAiActionPhase,
  selectAiClashCard,
  runAiComboStep,
  runAiDiscardOverflow,
} from '../src/engine/aiPlayer';
import { COMMUNITY_DECK_PRESETS } from '../src/data/communityDecks';
import { presetToCustomDeck } from '../src/utils/deckCode';
import { CustomDeckConfig, GameState, PendingChoice, EffectDrawAnimation } from '../src/types/tcg';
import { createBattleReplayData } from '../src/utils/replayManager';
import { buildReplayTimeline } from '../src/utils/replayTimelineBuilder';
import { getOfficialCardByCode } from '../src/data/officialCards';

const GAMES = Number(process.argv[2] ?? 40);
const VERBOSE = process.argv[3] === '1';

export type DeckDef = { key: string; preset: 'STARTER_ROVER' | 'STARTER_CHIXIA'; cfg?: CustomDeckConfig };
export const DECKS: DeckDef[] = [
  { key: 'SD01', preset: 'STARTER_ROVER' },
  { key: 'SD02', preset: 'STARTER_CHIXIA' },
  ...COMMUNITY_DECK_PRESETS.map((p) => ({
    key: p.id.replace('preset-sld-', ''),
    preset: 'STARTER_ROVER' as const,
    cfg: presetToCustomDeck(p),
  })),
];

// ---- UI 동작 재현 헬퍼 (useGame.ts 로직 그대로) ----
function uiFinishEffectDraw(prev: GameState): GameState {
  if (!prev.lastEffectDraw) return prev;
  let nextChoice = prev.lastEffectDraw.nextPendingChoice || prev.pendingChoice || null;
  const nextQueue = prev.pendingChoiceQueue ? [...prev.pendingChoiceQueue] : [];
  if (!nextChoice && nextQueue.length > 0) nextChoice = nextQueue.shift() || null;
  let nextDraw: EffectDrawAnimation | null = null;
  const remainingDraws = prev.deferredEffectDraws ? [...prev.deferredEffectDraws] : [];
  if (remainingDraws.length > 0) nextDraw = remainingDraws.shift() || null;
  const newState: GameState = {
    ...prev,
    lastEffectDraw: nextDraw,
    deferredEffectDraws: remainingDraws,
    deferredEffectDraw: remainingDraws.length > 0 ? remainingDraws[0] : null,
    pendingChoice: nextDraw ? prev.pendingChoice : nextChoice,
    pendingChoiceQueue: nextQueue,
  };
  if (
    !nextDraw &&
    !newState.pendingChoice &&
    newState.phase === 'CLASH_REVEAL' &&
    !newState.clashResult &&
    Boolean(newState.players[0].clashCard || newState.players[1].clashCard)
  ) {
    return finishClashJudgment(newState);
  }
  if (!nextDraw && !newState.pendingChoice) return continuePostClashOrBattlePhase(newState);
  return newState;
}

function uiClearLastComboStrike(prev: GameState): GameState {
  if (!prev.lastComboStrike) return prev;
  const next = { ...prev, lastComboStrike: null };
  if (next.players[0].hp <= 0 || next.players[1].hp <= 0) return checkGameOver(next);
  return next;
}

// 사람 좌석(P0)의 선택 모달 응답 (합리적 휴리스틱)
function humanPick(state: GameState, pc: PendingChoice): string[] {
  const max = pc.maxSelect ?? 1;
  const min = pc.minSelect ?? 0;
  if (pc.onResolveType === 'VIEW_ONLY' || max === 0) return [];
  const cards = [...pc.revealedCards];
  if (pc.onResolveType === 'DISCARD_FOR_DAMAGE' || pc.onResolveType === 'DISCARD_FROM_HAND' || pc.onResolveType === 'DRAW_THEN_DISCARD_CONFIRM') {
    cards.sort((a: any, b: any) => (a.damage ?? 0) - (b.damage ?? 0));
  }
  const n = Math.max(min, Math.min(max, cards.length));
  return cards.slice(0, n).map((c) => c.id);
}

interface Issue { game: number; step: number; kind: string; detail: string }

function allActionIds(state: GameState, idx: 0 | 1): string[] {
  const p = state.players[idx];
  const ids: string[] = [];
  p.actionDeck.forEach((c) => ids.push(c.id));
  p.hand.forEach((c) => ids.push(c.id));
  p.dropZone.forEach((c) => ids.push(c.id));
  p.concertoZone.forEach((c) => ids.push(c.id));
  (p.actionArea || []).forEach((c) => ids.push(c.id));
  if (p.clashCard && !(p.actionArea || []).some((c) => c.id === p.clashCard!.id)) ids.push(p.clashCard.id);

  // 진행 중인 팝업이나 애니메이션에 임시 보관된 카드 (덱에서 드로우되어 대기 중인 카드 등)
  const choices = [
    state.pendingChoice,
    ...(state.pendingChoiceQueue || []),
    state.deferredChoice,
    ...(state.deferredChoices || []),
  ].filter(Boolean) as PendingChoice[];
  for (const pc of choices) {
    if (pc.playerIndex === idx && pc.revealedCards) {
      for (const c of pc.revealedCards) {
        if ((c as any).kind === 'ACTION' && !ids.includes(c.id)) {
          ids.push(c.id);
        }
      }
    }
  }

  const effectDraws = [
    state.lastEffectDraw,
    state.deferredEffectDraw,
    ...(state.deferredEffectDraws || []),
  ].filter(Boolean) as EffectDrawAnimation[];
  for (const ed of effectDraws) {
    const drawCards = ed.cards || (ed as any).drawnCards || [];
    if (ed.playerIndex === idx && drawCards.length > 0) {
      for (const c of drawCards) {
        if (!ids.includes(c.id)) {
          ids.push(c.id);
        }
      }
    }
  }

  return ids;
}

export function playOne(gameNo: number, d0: DeckDef, d1: DeckDef) {
  const issues: Issue[] = [];
  const push = (step: number, kind: string, detail: string) => issues.push({ game: gameNo, step, kind, detail });

  let state = createInitialGameState(d0.preset, d1.preset, 'AI', d0.cfg ?? null, d1.cfg ?? null);
  const initialIds: [Set<string>, Set<string>] = [new Set(allActionIds(state, 0)), new Set(allActionIds(state, 1))];

  // 선공 주사위 (useGame.handleSetInitiative 재현)
  const first: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
  state = { ...state, activePlayerIndex: first, firstPlayerIndex: first, firstTurnDrawCompleted: false };
  state = selectStartingLeader(state, decideAiStartingLeader(state.players[0]));
  state = executeMulligan(state, decideAiMulligan(state.players[0]), decideAiMulligan(state.players[1]));

  let step = 0;
  let stuck = 0;
  let lastSig = '';
  let combos = 0;
  let upgrades = 0;
  let clashes = 0;
  const LIMIT = 4000;
  const cardLocs = new Map<string, string>();

  while (state.phase !== 'GAME_OVER' && step < LIMIT) {
    step++;

    if (gameNo === 3 && step >= 8 && step <= 13) {
      const p0 = state.players[0];
      console.log(`[G3 s${step} ${state.phase}] dropCount=${p0.dropZone.length} deckCount=${p0.actionDeck.length} handCount=${p0.hand.length} log=${state.logs[0]?.text?.slice(0, 60)}`);
    }
    for (const i of [0, 1] as const) {
      const p = state.players[i];
      if (Number.isNaN(p.hp) || p.hp < 0 || p.hp > p.maxHp) push(step, 'HP_RANGE', `p${i} hp=${p.hp}/${p.maxHp}`);
      const ids = allActionIds(state, i);
      const set = new Set(ids);
      if (set.size !== ids.length) push(step, 'DUP_CARD', `p${i} 같은 카드가 두 존에 동시에 존재 (${ids.length - set.size}장) phase=${state.phase}`);
      for (const id of initialIds[i]) {
        if (!set.has(id)) {
          const inOther = allActionIds(state, (i === 0 ? 1 : 0) as 0 | 1).includes(id);
          const rawState = JSON.stringify(state);
          const inState = rawState.includes(id);
          const prevLoc = cardLocs.get(id) || 'unknown';
          push(step, 'LOST_CARD', `p${i} 카드 소실 ${id.split('-').slice(1, 3).join('-')} (prevLoc=${prevLoc}) inOther=${inOther} inState=${inState} phase=${state.phase} log=${state.logs[0]?.text?.slice(0, 45)}`);
          break;
        }
      }
      for (const c of [...p.hand, ...(p.actionArea || []), ...p.concertoZone, ...p.dropZone]) {
        if ((c as any).kind === 'CHARACTER') { push(step, 'CHAR_IN_ACTION_ZONE', `p${i} ${c.nameKr}`); break; }
      }
    }

    // 위치 추적 기록
    for (const i of [0, 1] as const) {
      const p = state.players[i];
      p.hand.forEach((c) => cardLocs.set(c.id, `p${i}.hand`));
      p.actionDeck.forEach((c) => cardLocs.set(c.id, `p${i}.deck`));
      p.dropZone.forEach((c) => cardLocs.set(c.id, `p${i}.drop`));
      p.concertoZone.forEach((c) => cardLocs.set(c.id, `p${i}.concerto`));
      (p.actionArea || []).forEach((c) => cardLocs.set(c.id, `p${i}.actionArea`));
      if (p.clashCard) cardLocs.set(p.clashCard.id, `p${i}.clashCard`);
      const choices = [
        state.pendingChoice,
        ...(state.pendingChoiceQueue || []),
        state.deferredChoice,
        ...(state.deferredChoices || []),
      ].filter(Boolean) as PendingChoice[];
      for (const pc of choices) {
        if (pc.playerIndex === i && pc.revealedCards) {
          for (const c of pc.revealedCards) {
            if ((c as any).kind === 'ACTION') cardLocs.set(c.id, `p${i}.choice(${pc.onResolveType})`);
          }
        }
      }
    }
    if (state.pendingChoice) {
      const pc = state.pendingChoice;
      if (state.players[pc.playerIndex].isAi && pc.onResolveType !== 'VIEW_ONLY') {
        push(step, 'AI_CHOICE_SHOWN_TO_USER', `${pc.title} (${pc.onResolveType})`);
      }
      if ((pc.minSelect ?? 0) > pc.revealedCards.length) push(step, 'UNRESOLVABLE_CHOICE', `${pc.title} min=${pc.minSelect} cards=${pc.revealedCards.length}`);
    }

    const sig = JSON.stringify([state.phase, state.activePlayerIndex, state.turn, state.logs.length, !!state.pendingChoice, !!state.lastEffectDraw, !!state.lastComboStrike, !!state.clashResult]);
    if (sig === lastSig) {
      stuck++;
      if (stuck > 6) { push(step, 'STUCK', `phase=${state.phase} pending=${state.pendingChoice?.onResolveType} draw=${!!state.lastEffectDraw}`); break; }
    } else { stuck = 0; lastSig = sig; }

    // ---------- 오버레이/모달 단계 (UI 우선순위대로) ----------
    if (state.lastUpgrade) { state = { ...state, lastUpgrade: null }; continue; }
    if (state.lastComboStrike) { state = uiClearLastComboStrike(state); continue; }
    if (state.clashResult) { state = proceedAfterClashReveal(state); continue; } // 대결 결과창 닫기
    if (state.lastEffectDraw) { state = uiFinishEffectDraw(state); continue; }
    if (state.pendingChoice) {
      const pc = state.pendingChoice;
      const pick = state.players[pc.playerIndex].isAi ? pc.revealedCards.slice(0, pc.minSelect ?? 0).map((c) => c.id) : humanPick(state, pc);
      if (pc.onResolveType === 'SELECT_EFFECT_UPGRADE' && pick.length) upgrades++;
      state = resolvePendingChoice(state, pick);
      continue;
    }

    const active = state.activePlayerIndex;
    switch (state.phase) {
      case 'START_PHASE':
        push(step, 'STUCK_START', 'START_PHASE에 머무름');
        step = LIMIT;
        break;
      case 'DRAW_PHASE':
        state = { ...executeDrawPhase(state), phase: 'ACTION_PHASE' };
        break;
      case 'ACTION_PHASE': {
        const before = state.players[active].slots;
        state = runAiActionPhase(state, active);
        const after = state.players[active].slots;
        if ((after.leader.level + (after.leftSupport?.level ?? 0) + (after.rightSupport?.level ?? 0)) >
            (before.leader.level + (before.leftSupport?.level ?? 0) + (before.rightSupport?.level ?? 0))) upgrades++;
        break;
      }
      case 'CLASH_SET': {
        clashes++;
        const order: (0 | 1)[] = [active, active === 0 ? 1 : 0];
        for (const i of order) {
          if (state.players[i].clashCardReady) continue;
          const id = selectAiClashCard(state, i);
          let r = setClashCard(state, i, id);
          if (!r.success) { push(step, 'SET_FAIL', `p${i} ${r.error}`); r = setClashCard(state, i, null); }
          state = r.newState;
          if (state.pendingChoice) break;
        }
        if (!state.pendingChoice && state.players[0].clashCardReady && state.players[1].clashCardReady) state = resolveClash(state);
        break;
      }
      case 'CLASH_REVEAL':
        // 결과창 없이 대기 중 (배틀 스텝 선택 후) → UI는 handleFinishEffectDraw/선택 해결 경로로 판정 진행
        state = finishClashJudgment(state);
        break;
      case 'COMBO_STEP': {
        const idx: 0 | 1 = (state.players[0].comboUnlimited || state.players[0].comboCount > 0) ? 0 : 1;
        if (canPlayerExecuteCombo(state.players[idx])) {
          const before = state.logs.length;
          state = runAiComboStep(state, idx);
          if (state.lastComboStrike) combos++;
          if (state.logs.length === before && state.phase === 'COMBO_STEP') state = finishComboStep(state, idx);
        } else {
          state = finishComboStep(state, idx);
        }
        break;
      }
      case 'DISCARD_OVERFLOW':
        state = runAiDiscardOverflow(state, active);
        break;
      case 'END_PHASE':
        state = executeEndPhase(state);
        break;
      default:
        push(step, 'UNEXPECTED_PHASE', state.phase);
        step = LIMIT;
    }
  }

  if (state.phase !== 'GAME_OVER') push(step, 'TIMEOUT', `phase=${state.phase} turn=${state.turn}`);

  // ---------- 리플레이 검증 ----------
  let replayIssues = 0;
  if (state.phase === 'GAME_OVER' && state.winner !== null) {
    const replay = createBattleReplayData(state.winner as 0 | 1, state.players, state.logs, state.turn, 'AI');
    const timeline = buildReplayTimeline(replay);
    const ordered = [...replay.logs].reverse();
    if (ordered.length >= 1000) { push(-1, 'REPLAY_LOG_TRUNCATED', `로그 ${ordered.length}개 (1000개 상한 도달 → 초반 기록 유실)`); replayIssues++; }
    // 타임라인 step i+1 은 ordered[i] 에 대응
    ordered.forEach((log, i) => {
      const snap = timeline[i + 1];
      if (!snap) return;
      if (log.snapshot) {
        if (snap.p0.hp !== log.snapshot.p0.hp || snap.p1.hp !== log.snapshot.p1.hp) {
          push(-1, 'REPLAY_HP_MISMATCH', `#${i + 1} timeline(${snap.p0.hp},${snap.p1.hp}) != log(${log.snapshot.p0.hp},${log.snapshot.p1.hp})`); replayIssues++;
        }
        if (snap.p0.leader.nameKr !== log.snapshot.p0.leader.nameKr || snap.p0.leader.level !== log.snapshot.p0.leader.level ||
            snap.p1.leader.nameKr !== log.snapshot.p1.leader.nameKr || snap.p1.leader.level !== log.snapshot.p1.leader.level) {
          push(-1, 'REPLAY_LEADER_MISMATCH', `#${i + 1}`); replayIssues++;
        }
        const expA0 = (log.snapshot.p0ActionCards || []).map((c) => c.nameKr).join('|');
        const gotA0 = (snap.p0ActionCards || []).map((c) => c.nameKr).join('|');
        const expA1 = (log.snapshot.p1ActionCards || []).map((c) => c.nameKr).join('|');
        const gotA1 = (snap.p1ActionCards || []).map((c) => c.nameKr).join('|');
        if (expA0 !== gotA0 || expA1 !== gotA1) { push(-1, 'REPLAY_ACTION_SLOT_MISMATCH', `#${i + 1} p0[${gotA0}] vs [${expA0}]`); replayIssues++; }
      } else {
        push(-1, 'REPLAY_LOG_NO_SNAPSHOT', `#${i + 1} ${log.text.slice(0, 40)}`); replayIssues++;
      }
      for (const c of [...(snap.p0ActionCards || []), ...(snap.p1ActionCards || [])]) {
        const off = c.code ? getOfficialCardByCode(c.code.split('_')[0]) : undefined;
        if (off && off.kind === 'CHARACTER') { push(-1, 'REPLAY_CHAR_IN_SLOT', `#${i + 1} ${c.nameKr}`); replayIssues++; }
      }
      if (log.turn !== undefined && snap.turn !== (log.snapshot?.turn ?? log.turn)) { push(-1, 'REPLAY_TURN_MISMATCH', `#${i + 1}`); replayIssues++; }
    });
    const last = timeline[timeline.length - 1];
    if (last.p0.hp !== state.players[0].hp || last.p1.hp !== state.players[1].hp) {
      push(-1, 'REPLAY_FINAL_HP', `timeline(${last.p0.hp},${last.p1.hp}) state(${state.players[0].hp},${state.players[1].hp})`); replayIssues++;
    }
    // 리플레이 타임라인 비정상 HP 요동(힐 없는 체력 급상승) 검증
    for (let i = 1; i < timeline.length; i++) {
      const prev = timeline[i - 1];
      const curr = timeline[i];
      const logText = ordered[i - 1]?.text || '';
      const isHealLog = logText.includes('회복') || logText.includes('치유') || logText.includes('HEAL') || logText.includes('체력');
      if (curr.p0.hp > prev.p0.hp && !isHealLog) {
        push(-1, 'REPLAY_HP_YOYO', `#${i} P0 HP 상승 (${prev.p0.hp} -> ${curr.p0.hp}) 비회복 로그: ${logText.slice(0, 40)}`);
        replayIssues++;
      }
      if (curr.p1.hp > prev.p1.hp && !isHealLog) {
        push(-1, 'REPLAY_HP_YOYO', `#${i} P1 HP 상승 (${prev.p1.hp} -> ${curr.p1.hp}) 비회복 로그: ${logText.slice(0, 40)}`);
        replayIssues++;
      }
    }
  }

  return { issues, winner: state.winner, turns: state.turn, combos, upgrades, clashes, logs: state.logs.length, replayIssues, first, final: state };
}

// ---------- 실행 ----------
const allIssues: Issue[] = [];
const kindCount: Record<string, number> = {};
let p0w = 0, p1w = 0, done = 0, totalTurns = 0, totalCombos = 0, totalUp = 0, totalClash = 0, firstWins = 0;
const deckStats: Record<string, { w: number; n: number }> = {};

for (let g = 0; g < GAMES; g++) {
  const d0 = DECKS[g % DECKS.length];
  const d1 = DECKS[Math.floor(g / DECKS.length) % DECKS.length];
  const r = playOne(g + 1, d0, d1);
  r.issues.forEach((i) => { allIssues.push(i); kindCount[i.kind] = (kindCount[i.kind] || 0) + 1; });
  if (r.winner === 0 || r.winner === 1) {
    done++;
    if (r.winner === 0) p0w++; else p1w++;
    if (r.winner === r.first) firstWins++;
    totalTurns += r.turns; totalCombos += r.combos; totalUp += r.upgrades; totalClash += r.clashes;
    for (const [d, idx] of [[d0, 0], [d1, 1]] as const) {
      deckStats[d.key] = deckStats[d.key] || { w: 0, n: 0 };
      deckStats[d.key].n++;
      if (r.winner === idx) deckStats[d.key].w++;
    }
  }
  if (VERBOSE) console.log(`G${g + 1} ${d0.key} vs ${d1.key}: winner=${r.winner} turns=${r.turns} logs=${r.logs} issues=${r.issues.length}`);
}

console.log(`\n=== FULL BATTLE SIM (${GAMES} games, UI-faithful flow, AI mode) ===`);
console.log(`Completed: ${done}/${GAMES} | P0(human seat) ${p0w} : P1(AI) ${p1w} | first-player wins ${firstWins}`);
console.log(`Avg turns ${(totalTurns / Math.max(1, done)).toFixed(1)} | Avg clashes ${(totalClash / Math.max(1, done)).toFixed(1)} | Avg combos ${(totalCombos / Math.max(1, done)).toFixed(1)} | Avg upgrades ${(totalUp / Math.max(1, done)).toFixed(1)}`);
console.log('Deck winrates:', Object.entries(deckStats).map(([k, v]) => `${k} ${v.w}/${v.n}`).join(', '));
console.log('Issue counts:', kindCount);
const seen = new Set<string>();
for (const i of allIssues) {
  const key = i.kind + i.detail.replace(/\d+/g, '#');
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`  [G${i.game} s${i.step}] ${i.kind}: ${i.detail}`);
  if (seen.size > 40) break;
}
