with open('src/engine/gameEngine.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. import
assert '  ClashResult,\n  LogItem,\n  ActionCard,' in text, 'import not found'
text = text.replace('  ClashResult,\n  LogItem,\n  ActionCard,', '  ClashResult,\n  LogItem,\n  LogBoardSnapshot,\n  ActionCard,', 1)

# 2. getEffectiveCardCost
old_cost = '''// 액션 카드 유효 코스트 계산 헬퍼 (SD01-016 북풍의 소용돌이 적색 코스트 페널티 반영)
export function getEffectiveCardCost(player: PlayerState, card: ActionCard): number {
  let effectiveCost = card.cost;
  if (card.color === 'RED' && player.tempCostPenaltyRed && player.tempCostPenaltyRed > 0) {
    effectiveCost += player.tempCostPenaltyRed;
  }
  return effectiveCost;
}'''

new_cost = '''// 액션 카드 유효 코스트 계산 헬퍼 (BP01-062 우세 코스트 감면 및 SD01-016 북풍의 소용돌이 적색 코스트 페널티 반영)
export function getEffectiveCardCost(player: PlayerState, card: ActionCard): number {
  let effectiveCost = card.cost;
  const baseCode = (card.code || '').split('_')[0];
  if (baseCode === 'BP01-062' && player.hasDominance) {
    effectiveCost = Math.max(0, effectiveCost - 1);
  }
  if (card.color === 'RED' && player.tempCostPenaltyRed && player.tempCostPenaltyRed > 0) {
    effectiveCost += player.tempCostPenaltyRed;
  }
  return effectiveCost;
}'''
assert old_cost in text, 'old_cost not found'
text = text.replace(old_cost, new_cost, 1)

# 3. createBoardSnapshot
snapshot_func = '''export function createBoardSnapshot(state: {
  turn: number;
  phase: GamePhase;
  activePlayerIndex: 0 | 1;
  players: [PlayerState, PlayerState];
}): LogBoardSnapshot | undefined {
  if (!state.players || !state.players[0] || !state.players[1]) return undefined;
  const p0 = state.players[0];
  const p1 = state.players[1];
  return {
    turn: state.turn,
    phase: state.phase,
    activePlayerIndex: state.activePlayerIndex,
    p0: {
      hp: p0.hp,
      maxHp: p0.maxHp,
      concerto: p0.concertoZone.length,
      leader: {
        nameKr: p0.slots.leader.nameKr,
        characterName: p0.slots.leader.characterName,
        level: p0.slots.leader.level ?? 0,
        artUrl: p0.slots.leader.artUrl,
        element: p0.slots.leader.element,
      },
      leftSupport: p0.slots.leftSupport
        ? {
            nameKr: p0.slots.leftSupport.nameKr,
            characterName: p0.slots.leftSupport.characterName,
            level: p0.slots.leftSupport.level ?? 0,
            artUrl: p0.slots.leftSupport.artUrl,
            element: p0.slots.leftSupport.element,
          }
        : undefined,
      rightSupport: p0.slots.rightSupport
        ? {
            nameKr: p0.slots.rightSupport.nameKr,
            characterName: p0.slots.rightSupport.characterName,
            level: p0.slots.rightSupport.level ?? 0,
            artUrl: p0.slots.rightSupport.artUrl,
            element: p0.slots.rightSupport.element,
          }
        : undefined,
      handCount: p0.hand.length,
      deckCount: p0.actionDeck.length,
      dropCount: p0.dropZone.length,
      handCards: p0.hand.map((c) => ({
        code: c.code,
        nameKr: c.nameKr,
        cost: c.cost,
        color: c.color,
        speed: c.speed,
        damage: c.damage,
        artUrl: c.artUrl,
        description: c.description,
      })),
    },
    p1: {
      hp: p1.hp,
      maxHp: p1.maxHp,
      concerto: p1.concertoZone.length,
      leader: {
        nameKr: p1.slots.leader.nameKr,
        characterName: p1.slots.leader.characterName,
        level: p1.slots.leader.level ?? 0,
        artUrl: p1.slots.leader.artUrl,
        element: p1.slots.leader.element,
      },
      leftSupport: p1.slots.leftSupport
        ? {
            nameKr: p1.slots.leftSupport.nameKr,
            characterName: p1.slots.leftSupport.characterName,
            level: p1.slots.leftSupport.level ?? 0,
            artUrl: p1.slots.leftSupport.artUrl,
            element: p1.slots.leftSupport.element,
          }
        : undefined,
      rightSupport: p1.slots.rightSupport
        ? {
            nameKr: p1.slots.rightSupport.nameKr,
            characterName: p1.slots.rightSupport.characterName,
            level: p1.slots.rightSupport.level ?? 0,
            artUrl: p1.slots.rightSupport.artUrl,
            element: p1.slots.rightSupport.element,
          }
        : undefined,
      handCount: p1.hand.length,
      deckCount: p1.actionDeck.length,
      dropCount: p1.dropZone.length,
      handCards: p1.hand.map((c) => ({
        code: c.code,
        nameKr: c.nameKr,
        cost: c.cost,
        color: c.color,
        speed: c.speed,
        damage: c.damage,
        artUrl: c.artUrl,
        description: c.description,
      })),
    },
    p0ClashCard: p0.clashCard
      ? {
          nameKr: p0.clashCard.nameKr,
          artUrl: p0.clashCard.artUrl,
          color: p0.clashCard.color,
          cost: p0.clashCard.cost,
          speed: p0.clashCard.speed,
          damage: p0.clashCard.damage,
        }
      : undefined,
    p1ClashCard: p1.clashCard
      ? {
          nameKr: p1.clashCard.nameKr,
          artUrl: p1.clashCard.artUrl,
          color: p1.clashCard.color,
          cost: p1.clashCard.cost,
          speed: p1.clashCard.speed,
          damage: p1.clashCard.damage,
        }
      : undefined,
    p0ActionCards: (p0.actionArea && p0.actionArea.length > 0)
      ? p0.actionArea.map((c) => ({
          code: c.code,
          nameKr: c.nameKr,
          cost: c.cost,
          color: c.color,
          speed: c.speed,
          damage: c.damage,
          artUrl: c.artUrl,
        }))
      : p0.clashCard
      ? [{
          code: p0.clashCard.code,
          nameKr: p0.clashCard.nameKr,
          cost: p0.clashCard.cost,
          color: p0.clashCard.color,
          speed: p0.clashCard.speed,
          damage: p0.clashCard.damage,
          artUrl: p0.clashCard.artUrl,
        }]
      : [],
    p1ActionCards: (p1.actionArea && p1.actionArea.length > 0)
      ? p1.actionArea.map((c) => ({
          code: c.code,
          nameKr: c.nameKr,
          cost: c.cost,
          color: c.color,
          speed: c.speed,
          damage: c.damage,
          artUrl: c.artUrl,
        }))
      : p1.clashCard
      ? [{
          code: p1.clashCard.code,
          nameKr: p1.clashCard.nameKr,
          cost: p1.clashCard.cost,
          color: p1.clashCard.color,
          speed: p1.clashCard.speed,
          damage: p1.clashCard.damage,
          artUrl: p1.clashCard.artUrl,
        }]
      : [],
  };
}

export function createInitialGameState('''
assert 'export function createInitialGameState(' in text, 'createInitialGameState not found'
text = text.replace('export function createInitialGameState(', snapshot_func, 1)

# 4. initialLogs snapshot
old_init_logs = '''  const initialLogs: LogItem[] = [
    {
      id: `log-init-1`,
      turn: 1,
      text: `《명조: 대결 (Wuthering Waves TCG)》 배틀이 시작되었습니다!`,
      type: 'SYSTEM',
      timestamp: Date.now(),
    },
    {
      id: `log-init-2`,
      turn: 1,
      text: `출격할 시작 리더(LEADER) 카드를 선택하세요.`,
      type: 'SYSTEM',
      timestamp: Date.now(),
    },
  ];'''

new_init_logs = '''  const initSnapshot = createBoardSnapshot({
    turn: 1,
    phase: 'LEADER_SELECT',
    activePlayerIndex: 0,
    players: [player0, player1],
  });

  const initialLogs: LogItem[] = [
    {
      id: `log-init-1`,
      turn: 1,
      text: `《명조: 대결 (Wuthering Waves TCG)》 배틀이 시작되었습니다!`,
      type: 'SYSTEM',
      timestamp: Date.now(),
      snapshot: initSnapshot,
    },
    {
      id: `log-init-2`,
      turn: 1,
      text: `출격할 시작 리더(LEADER) 카드를 선택하세요.`,
      type: 'SYSTEM',
      timestamp: Date.now(),
      snapshot: initSnapshot,
    },
  ];'''
assert old_init_logs in text, 'old_init_logs not found'
text = text.replace(old_init_logs, new_init_logs, 1)

# 5. addLog
old_add_log = '''// 로그 헬퍼
export function addLog(
  state: GameState,
  text: string,
  type: LogItem['type'],
  playerIndex?: 0 | 1,
  meta?: {
    cardArt?: string;
    cardName?: string;
    amount?: number;
    effectTag?: string;
    drawnCards?: ActionCard[];
  }
): GameState {
  const newLog: LogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    turn: state.turn,
    playerIndex,
    text,
    type,
    timestamp: Date.now(),
    cardArt: meta?.cardArt,
    cardName: meta?.cardName,
    amount: meta?.amount,
    effectTag: meta?.effectTag,
    drawnCards: meta?.drawnCards,
  };
  return {
    ...state,
    logs: [newLog, ...state.logs].slice(0, 100), // 최대 100개 보관
  };
}'''

new_add_log = '''// 로그 헬퍼
export function addLog(
  state: GameState,
  text: string,
  type: LogItem['type'],
  playerIndex?: 0 | 1,
  meta?: {
    cardArt?: string;
    cardName?: string;
    amount?: number;
    effectTag?: string;
    drawnCards?: ActionCard[];
  }
): GameState {
  const snapshot = createBoardSnapshot(state);
  const newLog: LogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    turn: state.turn,
    playerIndex,
    text,
    type,
    timestamp: Date.now(),
    cardArt: meta?.cardArt,
    cardName: meta?.cardName,
    amount: meta?.amount,
    effectTag: meta?.effectTag,
    drawnCards: meta?.drawnCards,
    snapshot,
  };
  return {
    ...state,
    logs: [newLog, ...state.logs].slice(0, 1000), // 최대 1000개 보관 (리플레이 무손실 보존)
  };
}'''
assert old_add_log in text, 'old_add_log not found'
text = text.replace(old_add_log, new_add_log, 1)

# 6. SD01-010 clear clashCard
old_sd010 = '''    // SD01-010 투쟁의 마음: 청색 카드에 패배 시 패로 회수 (actionArea & dropZone 정리)
    if (loserCard?.code === 'SD01-010' && winnerCard?.color === 'BLUE') {
      loserPlayer.dropZone = loserPlayer.dropZone.filter((c) => c.id !== loserCard.id);
      loserPlayer.actionArea = (loserPlayer.actionArea || []).filter((c) => c.id !== loserCard.id);
      addCardsToHand(loserPlayer, [loserCard]);
      newState = addLog(newState, `[투쟁의 마음 SD01-010 효과] 청색 카드에 패배하여 패로 회수했습니다!`, 'ACTION', loserIndex);
    }'''

new_sd010 = '''    // SD01-010 투쟁의 마음: 청색 카드에 패배 시 패로 회수 (actionArea & dropZone & clashCard 정리)
    if (loserCard?.code === 'SD01-010' && winnerCard?.color === 'BLUE') {
      loserPlayer.dropZone = loserPlayer.dropZone.filter((c) => c.id !== loserCard.id);
      loserPlayer.actionArea = (loserPlayer.actionArea || []).filter((c) => c.id !== loserCard.id);
      addCardsToHand(loserPlayer, [loserCard]);
      loserPlayer.clashCard = null;
      newState = addLog(newState, `[투쟁의 마음 SD01-010 효과] 청색 카드에 패배하여 패로 회수했습니다!`, 'ACTION', loserIndex);
    }'''
assert old_sd010 in text, 'old_sd010 not found'
text = text.replace(old_sd010, new_sd010, 1)

# 7. winnerPlayer sync
old_evo1 = '''          // 레벨업/등장 스킬 연계
          newState.players[winnerIndex] = winnerPlayer;
          newState = applyCharacterEvolutionSkills(newState, winnerIndex, shSlotKey, nextSh, currentSh, true);
          winnerPlayer = { ...newState.players[winnerIndex] };'''

new_evo1 = '''          // 레벨업/등장 스킬 연계
          newState.players[winnerIndex] = winnerPlayer;
          newState = applyCharacterEvolutionSkills(newState, winnerIndex, shSlotKey, nextSh, currentSh, true);
          winnerPlayer = { ...newState.players[winnerIndex] };
          if (winnerIndex === 0) p0 = winnerPlayer;
          else p1 = winnerPlayer;'''
assert old_evo1 in text, 'old_evo1 not found'
text = text.replace(old_evo1, new_evo1, 1)

old_evo2 = '''        // 레벨업/등장 스킬 연계
        newState.players[winnerIndex] = winnerPlayer;
        newState = applyCharacterEvolutionSkills(newState, winnerIndex, 'leader', nextSanhua, currentSanhua, true);
        winnerPlayer = { ...newState.players[winnerIndex] };'''

new_evo2 = '''        // 레벨업/등장 스킬 연계
        newState.players[winnerIndex] = winnerPlayer;
        newState = applyCharacterEvolutionSkills(newState, winnerIndex, 'leader', nextSanhua, currentSanhua, true);
        winnerPlayer = { ...newState.players[winnerIndex] };
        if (winnerIndex === 0) p0 = winnerPlayer;
        else p1 = winnerPlayer;'''
assert old_evo2 in text, 'old_evo2 not found'
text = text.replace(old_evo2, new_evo2, 1)

old_clash_sync = '''  newState.clashResult = clashResult;
  newState.players = [p0, p1];
  if (triggeredEffects.length > 0) {
    newState.deferredEffectEvent = triggeredEffects[0];
  }'''

new_clash_sync = '''  newState.clashResult = clashResult;
  if (winnerIndex !== -1) {
    if (winnerIndex === 0) p0 = winnerPlayer;
    else p1 = winnerPlayer;
  }
  newState.players = [p0, p1];
  if (triggeredEffects.length > 0) {
    newState.deferredEffectEvent = triggeredEffects[0];
  }'''
assert old_clash_sync in text, 'old_clash_sync not found'
text = text.replace(old_clash_sync, new_clash_sync, 1)

# 8. continuePostClashOrBattlePhase
old_proceed = '''    p0.comboUnlimited = false;
    p1.comboCount = 0;
    p1.comboUnlimited = false;
    newState.players = [p0, p1];
    return executeBattlePhaseEndStep(newState);
  }

  return newState;
}

// ==========================================
// 7. 연격 단계 (COMBO_STEP - 공식 룰 604.1.3)'''

new_proceed = '''    p0.comboUnlimited = false;
    p1.comboCount = 0;
    p1.comboUnlimited = false;
    newState.players = [p0, p1];
    return executeBattlePhaseEndStep(newState);
  }

  return newState;
}

export function continuePostClashOrBattlePhase(state: GameState): GameState {
  const p0 = state.players[0];
  const p1 = state.players[1];
  const p0HasComboPerm = Boolean(p0.comboUnlimited) || (p0.comboCount ?? 0) > 0;
  const p1HasComboPerm = Boolean(p1.comboUnlimited) || (p1.comboCount ?? 0) > 0;

  if (p0HasComboPerm || p1HasComboPerm) {
    const comboPlayerIdx: 0 | 1 = p0HasComboPerm ? 0 : 1;
    const comboPlayer = state.players[comboPlayerIdx];
    let newState: GameState = { ...state, phase: 'COMBO_STEP' };
    newState = addLog(
      newState,
      `⚡ ${comboPlayer.name}의 [연격 단계(Combo Step)] 돌입! ${
        comboPlayer.comboUnlimited
          ? '적색 승리: 연속 연격 무제한 가능!'
          : `남은 연격 횟수: ${comboPlayer.comboCount}회`
      }`,
      'ACTION',
      comboPlayerIdx
    );
    return newState;
  } else {
    const p0State = { ...p0, comboCount: 0, comboUnlimited: false };
    const p1State = { ...p1, comboCount: 0, comboUnlimited: false };
    const newState: GameState = { ...state, players: [p0State, p1State] };
    return executeBattlePhaseEndStep(newState);
  }
}

// ==========================================
// 7. 연격 단계 (COMBO_STEP - 공식 룰 604.1.3)'''
assert old_proceed in text, 'old_proceed not found'
text = text.replace(old_proceed, new_proceed, 1)

# 9. export checkGameOver
assert '// 승패 판정\nfunction checkGameOver(state: GameState): GameState {' in text, 'checkGameOver not found'
text = text.replace('// 승패 판정\nfunction checkGameOver(state: GameState): GameState {', '// 승패 판정\nexport function checkGameOver(state: GameState): GameState {', 1)

with open('src/engine/gameEngine.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('All 9 updates applied successfully to gameEngine.ts!')
