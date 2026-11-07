// src/engine/step.ts
// [WP7-1] 엔진 액션 실행 및 상태 변화 이벤트 감지(step 함수)
import { GameState, EffectDrawAnimation, PendingChoice } from '../types/tcg';
import { GameAction, GameEvent } from './events';
import { engineTick, engineTag, logTimestamp } from './rng';
import { resetEngineFx, drainEngineFx, type EngineFx } from './fxSink';
import {
  cloneGameState,
  executeMulligan,
  selectStartingLeader,
  executeDrawPhase,
  upgradeCharacter,
  switchLeader,
  chargeConcerto,
  decideClash,
  setClashCard,
  resolveClash,
  forceResolveClash,
  proceedAfterClashReveal,
  executeComboAttack,
  finishComboStep,
  resolvePendingChoice,
  discardOverflowCards,
  executeEndPhase,
  finalizeEndPhase,
  checkGameOver,
  finishClashJudgment,
  continuePostClashOrBattlePhase,
} from './gameEngine';
import {
  decideAiMulligan,
  runAiActionPhase,
  runAiComboStep,
  runAiDiscardOverflow,
} from './aiPlayer';

function nextEventId(): string {
  return `evt-${engineTick()}-${engineTag()}`;
}

/**
 * 액션 실행 전후의 GameState를 비교하여 발생한 GameEvent 목록을 추출.
 * engineFx: 이번 액션 동안 엔진이 fxSink로 내보낸 연출 신호(레벨업·효과 알림). 상태 비교만으로는 알 수 없는 것.
 * (멀티 게스트처럼 step을 돌리지 않는 쪽은 비워 두고, 호스트가 보낸 연출 이벤트를 따로 합친다)
 */
export function diffEvents(prev: GameState, next: GameState, engineFx: EngineFx[] = []): GameEvent[] {
  const events: GameEvent[] = [];
  const turn = next.turn;

  // 1. 페이즈 전환 및 대결 오픈(CLASH_REVEAL)
  if (prev.phase !== next.phase) {
    events.push({
      id: nextEventId(),
      type: 'PHASE_CHANGED',
      turn,
      payload: { from: prev.phase, to: next.phase },
    });

    if (next.phase === 'CLASH_REVEAL') {
      events.push({
        id: nextEventId(),
        type: 'CLASH_REVEAL',
        turn,
        payload: {
          p0CardCode: next.players[0].clashCard?.code ?? null,
          p1CardCode: next.players[1].clashCard?.code ?? null,
        },
      });
    }
  }

  // 2. HP 변동 (대미지 / 회복)
  const prevHpCount = prev.hpHistory?.length || 0;
  const nextHpHistory = next.hpHistory || [];
  if (nextHpHistory.length > prevHpCount) {
    for (let i = prevHpCount; i < nextHpHistory.length; i++) {
      const entry = nextHpHistory[i];
      events.push({
        id: nextEventId(),
        type: entry.type === 'DAMAGE' ? 'DAMAGE' : 'HEAL',
        turn: entry.turn,
        playerIndex: entry.playerIndex,
        payload: {
          amount: entry.amount,
          prevHp: entry.prevHp,
          newHp: entry.newHp,
          reason: entry.reason,
          sourceCardName: entry.sourceCardName,
        },
      });
    }
  }

  // 3. 레벨업 — 엔진이 실제 레벨업 처리에서 내보낸 신호만 사용
  //    (이전 버그: 칸의 레벨 상승으로 추정 → 리더 교체를 레벨업으로 보여 주고, 레벨업+교체가 겹치면 다른 카드를 표시)
  const upgradeFx = engineFx.flatMap((f) => (f.kind === 'UPGRADE' ? [f.upgrade] : []));
  for (const up of upgradeFx) {
    events.push({
      id: nextEventId(),
      type: 'UPGRADE',
      turn,
      playerIndex: up.playerIndex,
      payload: {
        cardName: up.character?.nameKr,
        cardCode: up.character?.code,
        slotName: up.slotName,
        newLevel: up.newLevel,
        upgradeEffect: up,
      },
    });
  }

  // 3-B. 리더 교대 (레벨업으로 인한 리더 슬롯 갱신이 아닌 실제 리더 교대)
  for (const pIdx of [0, 1] as const) {
    const prevLeader = prev.players[pIdx].slots.leader;
    const nextLeader = next.players[pIdx].slots.leader;
    const upgradedLeader = upgradeFx.some((u) => u.playerIndex === pIdx && u.slotName === 'leader');
    if (
      prev.phase !== 'LEADER_SELECT' &&
      prevLeader?.id &&
      nextLeader?.id &&
      prevLeader.id !== nextLeader.id &&
      !upgradedLeader
    ) {
      events.push({
        id: nextEventId(),
        type: 'LEADER_SWITCH',
        turn,
        playerIndex: pIdx,
        payload: {
          prevLeaderName: prevLeader.nameKr,
          newLeaderName: nextLeader.nameKr,
          newLeaderCode: nextLeader.code,
        },
      });
    }
  }

  // 4. 연격 참격
  const isNewComboStrike = Boolean(
    next.lastComboStrike && next.lastComboStrike.id !== prev.lastComboStrike?.id
  );
  if (isNewComboStrike && next.lastComboStrike) {
    events.push({
      id: nextEventId(),
      type: 'COMBO_STRIKE',
      turn,
      playerIndex: next.lastComboStrike.attackerIndex,
      payload: {
        strike: next.lastComboStrike,
        cardName: next.lastComboStrike.card?.nameKr,
        damage: next.lastComboStrike.damage,
        comboCount: next.lastComboStrike.comboCount,
      },
    });
  }

  // 5. 드로우 (효과 드로우 및 일반 드로우/멀리건 드로우)
  let effectDrawPlayerIdx: 0 | 1 | null = null;
  if (next.lastEffectDraw && next.lastEffectDraw.id !== prev.lastEffectDraw?.id) {
    effectDrawPlayerIdx = next.lastEffectDraw.playerIndex;
    events.push({
      id: nextEventId(),
      type: 'CARD_DRAWN',
      turn,
      playerIndex: next.lastEffectDraw.playerIndex,
      payload: {
        source: 'EFFECT',
        sourceCardName: next.lastEffectDraw.sourceCardName,
        cardsCount: next.lastEffectDraw.cards?.length || 0,
      },
    });
    events.push({
      id: nextEventId(),
      type: 'EFFECT_DRAW',
      turn,
      playerIndex: next.lastEffectDraw.playerIndex,
      payload: {
        drawId: next.lastEffectDraw.id,
        playerIndex: next.lastEffectDraw.playerIndex,
        cards: next.lastEffectDraw.cards,
        sourceCardName: next.lastEffectDraw.sourceCardName,
        effectDraw: next.lastEffectDraw,
      },
    });
  }

  for (const pIdx of [0, 1] as const) {
    if (effectDrawPlayerIdx === pIdx) continue;
    const deckDelta = prev.players[pIdx].actionDeck.length - next.players[pIdx].actionDeck.length;
    const handDelta = next.players[pIdx].hand.length - prev.players[pIdx].hand.length;
    if (deckDelta > 0 && handDelta > 0) {
      events.push({
        id: nextEventId(),
        type: 'CARD_DRAWN',
        turn,
        playerIndex: pIdx,
        payload: {
          source: prev.phase === 'DRAW_PHASE' ? 'DRAW_PHASE' : 'DECK',
          cardsCount: handDelta,
        },
      });
    }
  }

  // 5-B. 카드 사용 / 세트 / 충전 (CARD_PLAYED)
  for (const pIdx of [0, 1] as const) {
    const prevPlayer = prev.players[pIdx];
    const nextPlayer = next.players[pIdx];

    if (!prevPlayer.clashCard && nextPlayer.clashCard) {
      events.push({
        id: nextEventId(),
        type: 'CARD_PLAYED',
        turn,
        playerIndex: pIdx,
        payload: {
          mode: 'CLASH_SET',
          cardId: nextPlayer.clashCard.id,
          cardCode: nextPlayer.clashCard.code,
          cardName: nextPlayer.clashCard.nameKr,
        },
      });
    }

    if (nextPlayer.concertoZone.length > prevPlayer.concertoZone.length) {
      const addedCard = nextPlayer.concertoZone[nextPlayer.concertoZone.length - 1];
      events.push({
        id: nextEventId(),
        type: 'CARD_PLAYED',
        turn,
        playerIndex: pIdx,
        payload: {
          mode: 'CONCERTO_CHARGE',
          cardId: addedCard?.id,
          cardCode: addedCard?.code,
          cardName: addedCard?.nameKr,
        },
      });
    }
  }

  if (isNewComboStrike && next.lastComboStrike) {
    events.push({
      id: nextEventId(),
      type: 'CARD_PLAYED',
      turn,
      playerIndex: next.lastComboStrike.attackerIndex,
      payload: {
        mode: 'COMBO_ATTACK',
        cardId: next.lastComboStrike.card?.id,
        cardCode: next.lastComboStrike.card?.code,
        cardName: next.lastComboStrike.card?.nameKr,
      },
    });
  }

  // 6. 효과 발동 알림 — 엔진이 내보낸 효과 알림 중 마지막 1개 (예전 lastEffectEvent와 같은 규칙: 한 액션에 알림 1개)
  //    (이전 버그: 최신 로그가 배열 앞에 쌓이는데 뒤쪽을 읽어서 알림이 0건)
  const effectFx = engineFx.flatMap((f) => (f.kind === 'EFFECT' ? [f.effect] : []));
  const latestEffect = effectFx[effectFx.length - 1];
  if (latestEffect) {
    events.push({
      id: nextEventId(),
      type: 'EFFECT_TRIGGERED',
      turn,
      playerIndex: latestEffect.playerIndex,
      payload: { ...latestEffect },
    });
  }

  // 7. 대결 결과
  if (next.clashResult && next.clashResult !== prev.clashResult) {
    events.push({
      id: nextEventId(),
      type: 'CLASH_RESULT',
      turn,
      payload: {
        winnerIndex: next.clashResult.winnerIndex,
        damageDealt: next.clashResult.damageDealt,
      },
    });
  }

  // 8. 선택지 요구
  if (next.pendingChoice && next.pendingChoice.id !== prev.pendingChoice?.id) {
    events.push({
      id: nextEventId(),
      type: 'CHOICE_REQUIRED',
      turn,
      playerIndex: next.pendingChoice.playerIndex,
      payload: {
        title: next.pendingChoice.title,
        onResolveType: next.pendingChoice.onResolveType,
      },
    });
  }

  // 9. 게임 종료
  if (prev.winner === null && next.winner !== null) {
    events.push({
      id: nextEventId(),
      type: 'GAME_OVER',
      turn,
      playerIndex: next.winner,
      payload: { winner: next.winner },
    });
  }

  return events;
}

/**
 * 단일 액션을 받아 다음 게임 상태와 발생한 이벤트 목록을 반환하는 순수 step 함수
 */
/** END_TURN을 받아들이지 않는 단계 */
const END_TURN_BLOCKED_PHASES: ReadonlySet<GameState['phase']> = new Set<GameState['phase']>([
  'LEADER_SELECT',
  'MULLIGAN',
  'DISCARD_OVERFLOW',
  'END_PHASE',
  'GAME_OVER',
]);

export function step(prevState: GameState, action: GameAction): { state: GameState; events: GameEvent[] } {
  resetEngineFx(); // step 밖에서 쌓인 연출 신호는 버림 (액션 단위로만 이벤트화)
  let nextState = cloneGameState(prevState);

  switch (action.type) {
    case 'SET_INITIATIVE': {
      if (nextState.phase !== 'LEADER_SELECT' && nextState.phase !== 'MULLIGAN') break;
      if (nextState.logs.some((l) => l.id.startsWith('log-dice-'))) break;

      const firstPlayerName = nextState.players[action.firstPlayerIndex].name;
      const diceWinnerIndex = action.choiceDetail?.winnerIndex ?? (action.roll0 > action.roll1 ? 0 : 1);
      const diceWinnerName = nextState.players[diceWinnerIndex].name;
      const orderText = action.choiceDetail?.chosenOrder === 'SECOND' ? '후공' : '선공';

      const rollLog = {
        id: `log-dice-${engineTick()}`,
        turn: nextState.turn,
        playerIndex: action.firstPlayerIndex,
        type: 'SYSTEM' as const,
        text: `🎲 [선/후공 결정] ${nextState.players[0].name}: ${action.roll0} vs ${nextState.players[1].name}: ${action.roll1} ➔ [${diceWinnerName}] 주사위 승리! [${orderText}]을(를) 선택하여 [${firstPlayerName}] 1턴 선공 확정!`,
        timestamp: logTimestamp(),
      };

      nextState.activePlayerIndex = action.firstPlayerIndex;
      nextState.firstPlayerIndex = action.firstPlayerIndex;
      nextState.firstTurnDrawCompleted = false;
      nextState.logs = [rollLog, ...nextState.logs];
      break;
    }

    case 'SELECT_STARTING_LEADER': {
      nextState = selectStartingLeader(nextState, action.p0LeaderIdOrName, action.p1LeaderIdOrName);
      break;
    }

    case 'MULLIGAN': {
      let finalP1DiscardIds: string[] = [];
      if (action.p1DiscardIds !== undefined) {
        finalP1DiscardIds = action.p1DiscardIds;
      } else if (nextState.players[1].isAi) {
        finalP1DiscardIds = decideAiMulligan(nextState.players[1]);
      }
      nextState = executeMulligan(nextState, action.p0DiscardIds, finalP1DiscardIds);
      break;
    }

    case 'DRAW_CARDS': {
      if (nextState.phase === 'DRAW_PHASE') {
        const targetIdx = action.playerIndex ?? (nextState.activePlayerIndex as 0 | 1);
        if (nextState.activePlayerIndex === targetIdx) {
          const afterDraw = executeDrawPhase(nextState);
          nextState = {
            ...afterDraw,
            phase: 'ACTION_PHASE',
          };
        }
      }
      break;
    }

    case 'UPGRADE': {
      const res = upgradeCharacter(
        nextState,
        action.playerIndex,
        action.targetSlot,
        action.upgradeCardId,
        action.discardIds
      );
      if (res.success) {
        nextState = res.newState;
      }
      break;
    }

    case 'SWITCH_LEADER': {
      const res = switchLeader(nextState, action.playerIndex, action.targetSlot);
      if (res.success) {
        nextState = res.newState;
      }
      break;
    }

    case 'CHARGE_CONCERTO': {
      const res = chargeConcerto(nextState, action.playerIndex, action.cardId);
      if (res.success) {
        nextState = res.newState;
      }
      break;
    }

    case 'DECIDE_CLASH': {
      nextState = decideClash(nextState, action.startClash);
      break;
    }

    case 'SET_CLASH_CARD': {
      const res = setClashCard(nextState, action.playerIndex, action.cardId, action.spentConcertoIds);
      if (res.success) {
        nextState = res.newState;
      }
      break;
    }

    case 'RESOLVE_CLASH': {
      nextState = resolveClash(nextState);
      break;
    }

    case 'FORCE_RESOLVE_CLASH': {
      nextState = forceResolveClash(nextState);
      break;
    }

    case 'PROCEED_AFTER_CLASH': {
      nextState = proceedAfterClashReveal(nextState);
      break;
    }

    case 'COMBO_ATTACK': {
      const res = executeComboAttack(
        nextState,
        action.playerIndex,
        action.cardId,
        action.spentConcertoIds,
        action.discardForBonusDmgId,
        action.swapSupportSlot
      );
      if (res.success) {
        nextState = res.newState;
      }
      break;
    }

    case 'FINISH_COMBO': {
      nextState = finishComboStep(nextState, action.playerIndex);
      break;
    }

    case 'RESOLVE_PENDING_CHOICE': {
      nextState = resolvePendingChoice(nextState, action.chosenCardIds);
      break;
    }

    case 'DISCARD_OVERFLOW': {
      const res = discardOverflowCards(nextState, action.playerIndex, action.discardIds);
      if (res.success) {
        nextState = res.newState;
      }
      break;
    }

    case 'END_TURN': {
      // 이미 턴 종료 처리 중(END_PHASE)이거나 패 버리기/게임 종료/게임 준비 단계면 무시.
      // 중복 END_TURN(멀티 중복 메시지·리플레이)이 턴 종료 스킬(예: SD02-001 드로우)을 재발동하지 않도록 막는다.
      if (!END_TURN_BLOCKED_PHASES.has(nextState.phase)) {
        nextState = executeEndPhase(nextState);
      }
      break;
    }

    case 'FINALIZE_END_PHASE': {
      if (
        nextState.phase === 'END_PHASE' &&
        !nextState.pendingChoice &&
        !nextState.lastEffectDraw &&
        (!nextState.deferredEffectDraws || nextState.deferredEffectDraws.length === 0)
      ) {
        nextState = finalizeEndPhase(nextState);
      }
      break;
    }

    case 'SURRENDER': {
      if (nextState.phase === 'GAME_OVER' || nextState.winner !== null) break;
      const surrenderIdx = action.playerIndex;
      const winnerIdx: 0 | 1 = surrenderIdx === 0 ? 1 : 0;
      const surrenderName = nextState.players[surrenderIdx].name;
      const winnerName = nextState.players[winnerIdx].name;
      nextState = {
        ...nextState,
        phase: 'GAME_OVER',
        winner: winnerIdx,
        clashResult: null,
        pendingChoice: null,
        pendingChoiceQueue: [],
        lastEffectDraw: null,
        deferredEffectDraws: [],
        deferredEffectDraw: null,
        lastComboStrike: null,
        logs: [
          ...nextState.logs,
          {
            id: `log-surrender-${engineTick()}`,
            turn: nextState.turn,
            text: `🏳️ [항복 선언] ${surrenderName}이(가) 항복을 선언하여 ${winnerName}이(가) 승리했습니다!`,
            type: 'SYSTEM',
            playerIndex: surrenderIdx,
            timestamp: logTimestamp(),
          },
        ],
      };
      break;
    }

    case 'TIME_OUT': {
      if (nextState.phase === 'GAME_OVER' || nextState.winner !== null) break;
      const loserIdx = action.loserIndex;
      const winnerIdx: 0 | 1 = loserIdx === 0 ? 1 : 0;
      nextState = {
        ...nextState,
        phase: 'GAME_OVER',
        winner: winnerIdx,
        logs: [
          ...nextState.logs,
          {
            id: `log-timeout-${engineTick()}`,
            turn: nextState.turn,
            text: `⏰ [시간 초과] ${nextState.players[loserIdx].name}의 제한 시간이 초과되어 ${nextState.players[winnerIdx].name}이(가) 승리했습니다!`,
            type: 'SYSTEM',
            playerIndex: loserIdx,
            timestamp: logTimestamp(),
          },
        ],
      };
      break;
    }

    case 'CLEAR_LAST_UPGRADE': {
      // 순수 연출 필드(lastUpgrade)가 제거되었으므로 기존 v2 리플레이 호환을 위한 no-op 처리
      break;
    }

    case 'CLEAR_LAST_COMBO_STRIKE': {
      if (nextState.lastComboStrike) {
        nextState.lastComboStrike = null;
        if (nextState.players[0].hp <= 0 || nextState.players[1].hp <= 0) {
          nextState = checkGameOver(nextState);
        }
      }
      break;
    }

    case 'CLEAR_LAST_EFFECT_EVENT': {
      // 순수 연출 필드(lastEffectEvent)가 제거되었으므로 기존 v2 리플레이 호환을 위한 no-op 처리
      break;
    }

    case 'FINISH_EFFECT_DRAW': {
      if (!nextState.lastEffectDraw) break;
      if (action.completedDrawId && nextState.lastEffectDraw.id !== action.completedDrawId) {
        break;
      }
      if (
        !nextState.clashResult &&
        !nextState.lastComboStrike &&
        (nextState.phase === 'GAME_OVER' || nextState.players[0].hp <= 0 || nextState.players[1].hp <= 0)
      ) {
        nextState = checkGameOver({ ...nextState, lastEffectDraw: null });
        break;
      }

      const chainedChoice = nextState.lastEffectDraw.nextPendingChoice || null;
      const mergedChoices: PendingChoice[] = [];
      const pushUniqueChoice = (ch: PendingChoice | null | undefined) => {
        if (!ch) return;
        if (!mergedChoices.some((existing) => existing.id === ch.id)) {
          mergedChoices.push(ch);
        }
      };

      pushUniqueChoice(chainedChoice);
      pushUniqueChoice(nextState.pendingChoice);
      for (const qItem of nextState.pendingChoiceQueue || []) {
        pushUniqueChoice(qItem);
      }

      const remainingDraws = nextState.deferredEffectDraws ? [...nextState.deferredEffectDraws] : [];
      let nextDraw: EffectDrawAnimation | null = null;
      if (!chainedChoice && remainingDraws.length > 0) {
        nextDraw = remainingDraws.shift() || null;
      }

      const nextChoice = mergedChoices.length > 0 ? mergedChoices[0] : null;
      const nextQueue = mergedChoices.length > 1 ? mergedChoices.slice(1) : [];

      nextState.lastEffectDraw = nextDraw;
      nextState.deferredEffectDraws = remainingDraws;
      nextState.deferredEffectDraw = remainingDraws.length > 0 ? remainingDraws[0] : null;
      nextState.pendingChoice = nextChoice;
      nextState.pendingChoiceQueue = nextQueue;

      if (
        !nextDraw &&
        !nextState.pendingChoice &&
        nextState.phase === 'CLASH_REVEAL' &&
        !nextState.clashResult &&
        Boolean(nextState.players[0].clashCard || nextState.players[1].clashCard)
      ) {
        nextState = finishClashJudgment(nextState);
        break;
      }

      if (!nextDraw && !nextState.pendingChoice) {
        if (nextState.phase === 'START_PHASE') {
          nextState.phase = 'DRAW_PHASE';
        } else if (nextState.phase === 'CLASH_REVEAL' || (nextState.phase as string) === 'CLASH_JUDGING') {
          nextState = continuePostClashOrBattlePhase(nextState);
        }
      }
      break;
    }

    case 'AI_ACTION_PHASE': {
      if (nextState.phase === 'ACTION_PHASE') {
        const targetIdx = action.playerIndex ?? (nextState.activePlayerIndex as 0 | 1);
        if (nextState.activePlayerIndex === targetIdx) {
          nextState = runAiActionPhase(nextState, targetIdx);
        }
      }
      break;
    }

    case 'AI_COMBO_STEP': {
      nextState = runAiComboStep(nextState, action.playerIndex);
      break;
    }

    case 'AI_DISCARD_OVERFLOW': {
      if (nextState.phase === 'DISCARD_OVERFLOW') {
        const targetIdx =
          action.playerIndex ??
          (nextState.players[0].hand.length > 8
            ? 0
            : nextState.players[1].hand.length > 8
            ? 1
            : (nextState.activePlayerIndex as 0 | 1));
        nextState = runAiDiscardOverflow(nextState, targetIdx);
      }
      break;
    }
  }

  const events = diffEvents(prevState, nextState, drainEngineFx());
  return { state: nextState, events };
}
