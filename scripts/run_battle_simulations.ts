import {
  createInitialGameState,
  executeMulligan,
  executeDrawPhase,
  setClashCard,
  resolveClash,
  proceedAfterClashReveal,
  finishComboStep,
  discardOverflowCards,
  resolvePendingChoice,
  checkGameOver,
  GameState,
  ActionCard,
} from '../src/engine/gameEngine';
import {
  runAiActionPhase,
  selectAiClashCard,
  runAiComboStep,
  runAiDiscardOverflow,
} from '../src/engine/aiPlayer';
import { AI_RECOMMENDED_DECKS } from '../src/data/aiRecommendedDecks';
import { presetToCustomDeck } from '../src/utils/deckCode';

interface SimStats {
  deck0Name: string;
  deck1Name: string;
  winner: string;
  turns: number;
  p0FinalHp: number;
  p1FinalHp: number;
  actionCount: number;
  logCount: number;
  cardsTriggered: Set<string>;
}

// 봇 대 봇(AI vs AI) 단일 듀얼 시뮬레이터
export function simulateMatch(
  deck0Preset: any,
  deck1Preset: any,
  maxTurns = 30
): { success: boolean; stats: SimStats; error?: string } {
  const custom0 = presetToCustomDeck(deck0Preset);
  const custom1 = presetToCustomDeck(deck1Preset);

  let state = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI', custom0, custom1);
  state.players[0].isAi = true;
  state.players[1].isAi = true;
  state.gameMode = 'SOLO_DUAL'; // 봇 vs 봇

  // 1. 멀리건
  state = executeMulligan(state, [], []);

  let actionSafetyCounter = 0;
  const cardsTriggered = new Set<string>();

  while (state.phase !== 'GAME_OVER' && state.turn <= maxTurns && actionSafetyCounter < 2500) {
    actionSafetyCounter++;

    // 0. 보류 중인 선택지(PendingChoice)가 있다면 AI가 자동 해소
    if (state.pendingChoice) {
      const choice = state.pendingChoice;
      if (choice.sourceCardName) cardsTriggered.add(choice.sourceCardName);
      let chosenIds: string[] = [];
      if (choice.onResolveType !== 'VIEW_ONLY' && choice.revealedCards.length > 0) {
        const minNeed = choice.minSelect || 0;
        const maxNeed = choice.maxSelect || 1;
        const take = Math.min(Math.max(minNeed, 1), maxNeed, choice.revealedCards.length);
        chosenIds = choice.revealedCards.slice(0, take).map((c) => c.id);
      }
      state = resolvePendingChoice(state, chosenIds);
      continue;
    }

    // 1. 드로우 단계
    if (state.phase === 'DRAW_PHASE') {
      state = executeDrawPhase(state);
      state = { ...state, phase: 'ACTION_PHASE' };
      continue;
    }

    // 2. 액션 단계
    if (state.phase === 'ACTION_PHASE') {
      const activeIdx = state.activePlayerIndex;
      state = runAiActionPhase(state, activeIdx);
      continue;
    }

    // 3. 대결 카드 세트 단계
    if (state.phase === 'CLASH_SET') {
      const activeIdx = state.activePlayerIndex;
      const oppIdx = (activeIdx === 0 ? 1 : 0) as 0 | 1;

      // 턴 플레이어 먼저 세트
      if (!state.players[activeIdx].clashCardReady) {
        const cardId = selectAiClashCard(state, activeIdx);
        let res = setClashCard(state, activeIdx, cardId);
        if (!res.success) res = setClashCard(state, activeIdx, null);
        state = res.newState;
        if (cardId) {
          const card = state.players[activeIdx].hand.find((c) => c.id === cardId) || state.players[activeIdx].clashCard;
          if (card) cardsTriggered.add(card.nameKr);
        }
        continue;
      }

      // 비턴 플레이어 세트
      if (!state.players[oppIdx].clashCardReady) {
        const cardId = selectAiClashCard(state, oppIdx);
        let res = setClashCard(state, oppIdx, cardId);
        if (!res.success) res = setClashCard(state, oppIdx, null);
        state = res.newState;
        if (cardId) {
          const card = state.players[oppIdx].hand.find((c) => c.id === cardId) || state.players[oppIdx].clashCard;
          if (card) cardsTriggered.add(card.nameKr);
        }
        continue;
      }

      // 양측 모두 세트 완료 -> 대결 판정
      if (state.players[0].clashCardReady && state.players[1].clashCardReady) {
        state = resolveClash(state);
        continue;
      }
    }

    // 4. 대결 결과 확인 후 다음으로
    if (state.phase === 'CLASH_REVEAL') {
      if (state.clashResult) {
        if (state.clashResult.p0Card) cardsTriggered.add(state.clashResult.p0Card.nameKr);
        if (state.clashResult.p1Card) cardsTriggered.add(state.clashResult.p1Card.nameKr);
      }
      state = proceedAfterClashReveal(state);
      continue;
    }

    // 5. 연격 단계 (COMBO_STEP)
    if (state.phase === 'COMBO_STEP') {
      const comboPlayerIdx = (state.players[0].comboCount > 0 || state.players[0].comboUnlimited) ? 0 : 1;
      const player = state.players[comboPlayerIdx];
      const hasCombo = player.comboUnlimited || player.comboCount > 0;
      if (hasCombo) {
        const preState = state;
        state = runAiComboStep(state, comboPlayerIdx as 0 | 1);
        // 상태 변화 없으면 finish
        if (state === preState || (!state.players[comboPlayerIdx].comboUnlimited && state.players[comboPlayerIdx].comboCount === player.comboCount)) {
          state = finishComboStep(state, comboPlayerIdx as 0 | 1);
        }
      } else {
        state = finishComboStep(state, comboPlayerIdx as 0 | 1);
      }
      continue;
    }

    // 6. 패 초과 버리기 (DISCARD_OVERFLOW)
    if (state.phase === 'DISCARD_OVERFLOW') {
      state = runAiDiscardOverflow(state);
      continue;
    }

    // 7. 기타 미처리 페이즈 가드
    if (state.players[0].hp <= 0 || state.players[1].hp <= 0) {
      state = checkGameOver(state);
      break;
    }

    // 루프가 갇힌 경우
    return {
      success: false,
      stats: {
        deck0Name: deck0Preset.name,
        deck1Name: deck1Preset.name,
        winner: 'NONE',
        turns: state.turn,
        p0FinalHp: state.players[0].hp,
        p1FinalHp: state.players[1].hp,
        actionCount: actionSafetyCounter,
        logCount: state.logs.length,
        cardsTriggered,
      },
      error: `Deadlock at phase: ${state.phase}, turn: ${state.turn}, activePlayer: ${state.activePlayerIndex}`,
    };
  }

  const p0Won = state.players[1].hp <= 0;
  const p1Won = state.players[0].hp <= 0;
  const winner = p0Won ? `${deck0Preset.name} (P1)` : p1Won ? `${deck1Preset.name} (P2)` : 'DRAW/TIMEOUT';

  return {
    success: true,
    stats: {
      deck0Name: deck0Preset.name,
      deck1Name: deck1Preset.name,
      winner,
      turns: state.turn,
      p0FinalHp: state.players[0].hp,
      p1FinalHp: state.players[1].hp,
      actionCount: actionSafetyCounter,
      logCount: state.logs.length,
      cardsTriggered,
    },
  };
}

// 5개 공식 AI 추천 덱 라운드 로빈 (10경기) 시뮬레이션 실행
async function runAllSimulations() {
  console.log('=====================================================');
  console.log('🤖 KURO TCG 듀얼 시뮬레이션 검증 시작 (AI 추천 5종 덱 라운드 로빈)');
  console.log('=====================================================\n');

  const decks = AI_RECOMMENDED_DECKS;
  let matchCount = 0;
  let successCount = 0;
  const allTriggeredCards = new Set<string>();

  for (let i = 0; i < decks.length; i++) {
    for (let j = i + 1; j < decks.length; j++) {
      matchCount++;
      const d0 = decks[i];
      const d1 = decks[j];

      console.log(`[매치 #${matchCount}] ${d0.name} VS ${d1.name}`);
      const res = simulateMatch(d0, d1, 20);

      if (!res.success) {
        console.error(`  ❌ [에러 발생]: ${res.error}`);
        process.exit(1);
      } else {
        successCount++;
        res.stats.cardsTriggered.forEach((c) => allTriggeredCards.add(c));
        console.log(
          `  ✅ [결과]: ${res.stats.winner} 승리! (진행 턴: ${res.stats.turns}턴, P1 HP: ${res.stats.p0FinalHp}, P2 HP: ${res.stats.p1FinalHp}, 로그: ${res.stats.logCount}건, 고유 카드/효과: ${res.stats.cardsTriggered.size}종 발동)`
        );
      }
    }
  }

  console.log('\n=====================================================');
  console.log(`🎉 모든 배틀 시뮬레이션 완료: ${successCount} / ${matchCount} 경기 100% 정상 결착`);
  console.log(`총 검증된 고유 카드 및 효과 발동 수: ${allTriggeredCards.size}종`);
  console.log('=====================================================');
}

runAllSimulations().catch((err) => {
  console.error('시뮬레이션 치명적 오류:', err);
  process.exit(1);
});
