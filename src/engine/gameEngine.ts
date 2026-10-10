import {
  GameState,
  PlayerState,
  GamePhase,
  ClashResult,
  LogItem,
  ActionCard,
  CharacterCard,
  CardColor,
  TriggeredEffectEvent,
} from '../types/tcg';
import {
  generateStarterActionDeck,
  STARTER_PRESETS,
  StarterDeckPreset,
  shuffleArray,
  ALL_CHARACTERS,
} from '../data/cards';
import { OFFICIAL_CARDS } from '../data/officialCards';

export interface CustomDeckConfig {
  id: string;
  name: string;
  leader: CharacterCard;
  leftSupport: CharacterCard;
  rightSupport: CharacterCard;
  actionCards: ActionCard[];
}

// 전용 카드 사용 가능 여부 판별 헬퍼 (공식 규칙: '일반'은 누구나 사용 가능, 캐릭터 전용은 해당 캐릭터가 리더일 때 사용 가능)
export function canLeaderUseCard(leader: CharacterCard | undefined, card: ActionCard): boolean {
  if (!card.characterExclusive || card.characterExclusive === '일반' || card.characterExclusive === '-') {
    return true;
  }
  if (!leader) return true;
  const leaderName = leader.characterName || leader.nameKr || '';
  if (card.characterExclusive.includes('방랑자') && leaderName.includes('방랑자')) {
    return true;
  }
  return card.characterExclusive.includes(leaderName) || leaderName.includes(card.characterExclusive);
}

// 덱에서 카드 1장 추출 헬퍼 (덱 소진 시 드롭 존의 액션 카드를 자동으로 리셔플)
export function drawSingleCardFromDeck(player: PlayerState): ActionCard | null {
  if (player.actionDeck.length === 0 && player.dropZone.length > 0) {
    const actionDrops = player.dropZone.filter((c): c is ActionCard => c.kind === 'ACTION');
    player.actionDeck = shuffleArray(actionDrops);
    player.dropZone = player.dropZone.filter((c) => c.kind === 'CHARACTER');
  }
  if (player.actionDeck.length > 0) {
    return player.actionDeck.shift()!;
  }
  return null;
}

// ==========================================
// 1. 초기 상태 생성
// ==========================================

// 커스텀 덱(프리셋 포함) 기반으로 한쪽 플레이어의 액션 덱과 캐릭터 덱 구성
function buildSideFromCustomDeck(custom: CustomDeckConfig): { deck: ActionCard[]; preset: StarterDeckPreset } {
  const charNames = [custom.leader.characterName, custom.leftSupport.characterName, custom.rightSupport.characterName];
  // 동일 카드(코드+레벨)의 희귀도 중복 버전은 1장만 남겨 레벨업 카드 풀이 부풀지 않도록 한다
  const seen = new Set<string>();
  const evolutionCards = OFFICIAL_CARDS.filter(
    (c) =>
      c.kind === 'CHARACTER' &&
      (c.level === 1 || c.level === 2) &&
      charNames.some((n) => c.nameKr.includes(n) || c.characterName?.includes(n))
  )
    .filter((c) => {
      const key = `${c.characterName || c.nameKr}-${c.level}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((c) => ({
      id: c.id,
      kind: 'CHARACTER' as const,
      code: c.code,
      characterName: c.characterName || c.nameKr,
      nameKr: c.nameKr,
      level: (c.level ?? 1) as 1 | 2,
      element: c.element,
      artUrl: c.artUrl,
      description: c.description,
      leaderSkill: c.description,
      clashSkill: c.description,
    }));

  return {
    deck: shuffleArray([...custom.actionCards]),
    preset: {
      id: 'STARTER_ROVER',
      nameKr: custom.name,
      leader: custom.leader,
      leftSupport: custom.leftSupport,
      rightSupport: custom.rightSupport,
      characterDeck: evolutionCards,
    },
  };
}

export function createInitialGameState(
  p0PresetKey: 'STARTER_ROVER' | 'STARTER_CHIXIA' = 'STARTER_ROVER',
  p1PresetKey: 'STARTER_ROVER' | 'STARTER_CHIXIA' = 'STARTER_CHIXIA',
  gameMode: 'AI' | 'SOLO_DUAL' = 'AI',
  p0CustomDeck?: CustomDeckConfig | null,
  p1CustomDeck?: CustomDeckConfig | null
): GameState {
  let p0Deck = generateStarterActionDeck(p0PresetKey);
  let p1Deck = generateStarterActionDeck(p1PresetKey);
  let p0PresetObj = STARTER_PRESETS[p0PresetKey];
  let p1PresetObj = STARTER_PRESETS[p1PresetKey];

  // 커스텀 덱이 주어진 경우 해당 플레이어 세팅 교체 (양쪽 모두 지원)
  if (p0CustomDeck && p0CustomDeck.actionCards.length >= 40) {
    const built = buildSideFromCustomDeck(p0CustomDeck);
    p0Deck = built.deck;
    p0PresetObj = built.preset;
  }
  if (p1CustomDeck && p1CustomDeck.actionCards.length >= 40) {
    const built = buildSideFromCustomDeck(p1CustomDeck);
    p1Deck = built.deck;
    p1PresetObj = built.preset;
  }

  // 초기 5장 드로우
  const p0Hand = p0Deck.splice(0, 5);
  const p1Hand = p1Deck.splice(0, 5);

  const player0: PlayerState = createPlayerState(
    'p0',
    '플레이어 (당신)',
    p0PresetObj,
    p0Deck,
    p0Hand,
    false
  );

  const player1: PlayerState = createPlayerState(
    'p1',
    gameMode === 'AI' ? '상대 (AI 봇)' : '상대 (플레이어 2)',
    p1PresetObj,
    p1Deck,
    p1Hand,
    gameMode === 'AI'
  );

  const initialLogs: LogItem[] = [
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
      text: `양 플레이어가 초기 패 5장을 뽑았습니다. 멀리건(패 교체)을 진행하세요.`,
      type: 'SYSTEM',
      timestamp: Date.now(),
    },
  ];

  return {
    turn: 1,
    activePlayerIndex: 0, // 플레이어 선공
    phase: 'MULLIGAN',
    players: [player0, player1],
    clashResult: null,
    lastComboStrike: null,
    winner: null,
    logs: initialLogs,
    gameMode,
  };
}

function createPlayerState(
  id: string,
  name: string,
  preset: StarterDeckPreset,
  deck: ActionCard[],
  hand: ActionCard[],
  isAi: boolean
): PlayerState {
  return {
    id,
    name,
    hp: 20,
    maxHp: 20,
    slots: {
      leader: { ...preset.leader },
      leftSupport: { ...preset.leftSupport },
      rightSupport: { ...preset.rightSupport },
    },
    characterDeck: [...preset.characterDeck],
    actionDeck: deck,
    hand,
    concertoZone: [],
    dropZone: [],
    clashCard: null,
    clashCardReady: false,
    actionFlags: {
      upgraded: false,
      switchedLeader: false,
      chargedConcerto: false,
    },
    comboCount: 0,
    isAi,
  };
}

// 로그 헬퍼
function addLog(state: GameState, text: string, type: LogItem['type'], playerIndex?: 0 | 1): GameState {
  const newLog: LogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    turn: state.turn,
    playerIndex,
    text,
    type,
    timestamp: Date.now(),
  };
  return {
    ...state,
    logs: [newLog, ...state.logs].slice(0, 100), // 최대 100개 보관
  };
}

// ==========================================
// 2. 멀리건 (Mulligan)
// ==========================================

export function executeMulligan(
  state: GameState,
  p0DiscardIds: string[],
  p1DiscardIds: string[]
): GameState {
  let newState = { ...state };

  // P0 멀리건
  const p0 = { ...newState.players[0] };
  if (p0DiscardIds.length > 0) {
    const kept = p0.hand.filter((c) => !p0DiscardIds.includes(c.id));
    const discarded = p0.hand.filter((c) => p0DiscardIds.includes(c.id));
    // 덱 맨 아래로 넣고 새 카드 드로우
    const deckAfter = [...p0.actionDeck, ...discarded];
    const newDrawn = deckAfter.splice(0, p0DiscardIds.length);
    p0.hand = [...kept, ...newDrawn];
    p0.actionDeck = shuffleArray(deckAfter);
    newState = addLog(newState, `${p0.name}이(가) ${p0DiscardIds.length}장의 카드를 교체했습니다.`, 'ACTION', 0);
  } else {
    newState = addLog(newState, `${p0.name}이(가) 초기 패를 유지했습니다.`, 'ACTION', 0);
  }

  // P1 멀리건
  const p1 = { ...newState.players[1] };
  if (p1DiscardIds.length > 0) {
    const kept = p1.hand.filter((c) => !p1DiscardIds.includes(c.id));
    const discarded = p1.hand.filter((c) => p1DiscardIds.includes(c.id));
    const deckAfter = [...p1.actionDeck, ...discarded];
    const newDrawn = deckAfter.splice(0, p1DiscardIds.length);
    p1.hand = [...kept, ...newDrawn];
    p1.actionDeck = shuffleArray(deckAfter);
    newState = addLog(newState, `${p1.name}이(가) ${p1DiscardIds.length}장의 카드를 교체했습니다.`, 'ACTION', 1);
  } else {
    newState = addLog(newState, `${p1.name}이(가) 초기 패를 유지했습니다.`, 'ACTION', 1);
  }

  newState.players = [p0, p1];

  // 1턴 시작 단계로 진입
  return executeStartPhase(newState);
}

// ==========================================
// 3. 턴 시작 단계 (START_PHASE)
// ==========================================

export function executeStartPhase(state: GameState): GameState {
  let newState = { ...state, phase: 'START_PHASE' as GamePhase };
  const activeIdx = newState.activePlayerIndex;
  const activePlayer = { ...newState.players[activeIdx] };

  newState = addLog(
    newState,
    `--- [턴 ${newState.turn}] ${activePlayer.name}의 턴 시작 ---`,
    'PHASE',
    activeIdx
  );

  // 캐릭터 패시브 확인
  // 1) Lv.2 방랑자 패시브: 턴 시작 시 추가 드로우 1장
  const hasRoverLv2 =
    activePlayer.slots.leader.characterName === '방랑자' && activePlayer.slots.leader.level === 2;
  if (hasRoverLv2) {
    const card = drawSingleCardFromDeck(activePlayer);
    if (card) {
      activePlayer.hand = [...activePlayer.hand, card];
      newState = addLog(newState, `[방랑자 Lv.2 패시브] ${activePlayer.name}이(가) 카드를 1장 추가 드로우했습니다.`, 'ACTION', activeIdx);
    }
  }

  // 2) Lv.1 양양 리더 효과: 턴 시작 시 협주 존 카드가 1장 이하라면 덱에서 1장 충전
  const hasYangyangLv1 =
    activePlayer.slots.leader.characterName === '양양' && activePlayer.slots.leader.level >= 1;
  if (hasYangyangLv1 && activePlayer.concertoZone.length <= 1) {
    const card = drawSingleCardFromDeck(activePlayer);
    if (card) {
      activePlayer.concertoZone = [...activePlayer.concertoZone, card];
      newState = addLog(newState, `[양양 Lv.1 리더 효과] 협주 존에 카드를 1장 무료 충전했습니다.`, 'ACTION', activeIdx);
    }
  }

  newState.players[activeIdx] = activePlayer;

  // 바로 드로우 단계로 진행
  return executeDrawPhase(newState);
}

// ==========================================
// 4. 드로우 단계 (DRAW_PHASE)
// ==========================================

export function executeDrawPhase(state: GameState): GameState {
  let newState = { ...state, phase: 'DRAW_PHASE' as GamePhase };
  const activeIdx = newState.activePlayerIndex;
  const player = { ...newState.players[activeIdx] };

  // 선공(Turn 1)의 첫 턴 플레이어는 1장, 그 외에는 2장 드로우
  const drawCount = newState.turn === 1 && activeIdx === 0 ? 1 : 2;

  let drawnCards: ActionCard[] = [];
  for (let i = 0; i < drawCount; i++) {
    const card = drawSingleCardFromDeck(player);
    if (card) {
      drawnCards.push(card);
    }
  }

  player.hand = [...player.hand, ...drawnCards];

  // 행동 플래그 리셋
  player.actionFlags = {
    upgraded: false,
    switchedLeader: false,
    chargedConcerto: false,
  };
  player.comboCount = 0;

  newState.players[activeIdx] = player;
  newState = addLog(newState, `${player.name}이(가) 카드 ${drawnCards.length}장을 드로우했습니다.`, 'ACTION', activeIdx);

  // 액션 페이즈로 전환
  newState.phase = 'ACTION_PHASE';
  return newState;
}

// ==========================================
// 5. 액션 단계 (ACTION_PHASE) 행동들
// ==========================================

// 행동 1: 캐릭터 레벨업
export function upgradeCharacter(
  state: GameState,
  playerIndex: 0 | 1,
  targetSlot: 'leader' | 'leftSupport' | 'rightSupport',
  upgradeCardId: string,
  discardCardIds: string[]
): { success: boolean; newState: GameState; error?: string } {
  const player = { ...state.players[playerIndex] };

  if (player.actionFlags.upgraded) {
    return { success: false, newState: state, error: '이번 턴에는 이미 캐릭터를 레벨업했습니다 (턴당 1회).' };
  }

  const currentSlotCard = player.slots[targetSlot];
  if (!currentSlotCard) {
    return { success: false, newState: state, error: '해당 슬롯에 캐릭터가 없습니다.' };
  }

  const upgradeCard = player.characterDeck.find((c) => c.id === upgradeCardId);
  if (!upgradeCard) {
    return { success: false, newState: state, error: '캐릭터 덱에 해당 카드가 없습니다.' };
  }

  if (upgradeCard.characterName !== currentSlotCard.characterName) {
    return { success: false, newState: state, error: '동일한 캐릭터만 레벨업할 수 있습니다.' };
  }

  if (upgradeCard.level !== currentSlotCard.level + 1) {
    return { success: false, newState: state, error: `레벨 ${currentSlotCard.level + 1} 캐릭터로만 레벨업할 수 있습니다.` };
  }

  // 레벨업 비용 계산: 기본 목표 레벨 수만큼 패 버림
  // 단, Lv.2 양양 지속 효과(코스트 1장 경감, 최소 1장) 적용
  let requiredDiscard = upgradeCard.level;
  const hasYangyangLv2 =
    (player.slots.leader.characterName === '양양' && player.slots.leader.level === 2) ||
    (player.slots.leftSupport?.characterName === '양양' && player.slots.leftSupport?.level === 2) ||
    (player.slots.rightSupport?.characterName === '양양' && player.slots.rightSupport?.level === 2);

  if (hasYangyangLv2 && requiredDiscard > 1) {
    requiredDiscard -= 1;
  }

  if (discardCardIds.length !== requiredDiscard) {
    return {
      success: false,
      newState: state,
      error: `Lv.${upgradeCard.level} 레벨업을 위해서는 패 ${requiredDiscard}장을 버려야 합니다.`,
    };
  }

  // 패에서 카드 버리기
  const discarded = player.hand.filter((c) => discardCardIds.includes(c.id));
  player.hand = player.hand.filter((c) => !discardCardIds.includes(c.id));
  player.dropZone = [...player.dropZone, ...discarded];

  // 캐릭터 덱에서 제거하고 슬롯에 배치 (기존 카드는 묘지로 가지 않고 겹침/보관)
  player.characterDeck = player.characterDeck.filter((c) => c.id !== upgradeCardId);
  player.slots[targetSlot] = { ...upgradeCard };
  player.actionFlags.upgraded = true;

  let newState = { ...state };
  newState.players[playerIndex] = player;
  newState.lastUpgrade = {
    id: `upgrade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    playerIndex,
    playerName: player.name,
    character: { ...upgradeCard },
    previousLevel: currentSlotCard.level as 0 | 1,
    newLevel: upgradeCard.level as 1 | 2,
    slotName: targetSlot,
  };
  newState = addLog(
    newState,
    `${player.name}이(가) [${currentSlotCard.nameKr}]을(를) [${upgradeCard.nameKr}](으)로 레벨업했습니다! (패 ${discarded.length}장 소비)`,
    'ACTION',
    playerIndex
  );

  return { success: true, newState };
}

// 행동 2: 리더 위치 변경 (교대)
export function switchLeader(
  state: GameState,
  playerIndex: 0 | 1,
  targetSlot: 'leftSupport' | 'rightSupport'
): { success: boolean; newState: GameState; error?: string } {
  const player = { ...state.players[playerIndex] };

  if (player.actionFlags.switchedLeader) {
    return { success: false, newState: state, error: '이번 턴에는 이미 위치를 교대했습니다 (턴당 1회).' };
  }

  const targetCharacter = player.slots[targetSlot];
  if (!targetCharacter) {
    return { success: false, newState: state, error: '교대할 서포터 캐릭터가 없습니다.' };
  }

  const prevLeader = player.slots.leader;
  player.slots.leader = targetCharacter;
  player.slots[targetSlot] = prevLeader;
  player.actionFlags.switchedLeader = true;

  let newState = { ...state };
  newState.players[playerIndex] = player;
  newState = addLog(
    newState,
    `${player.name}이(가) 리더를 [${prevLeader.nameKr}]에서 [${targetCharacter.nameKr}](으)로 교대했습니다!`,
    'ACTION',
    playerIndex
  );

  return { success: true, newState };
}

// 행동 3: 협주 충전
export function chargeConcerto(
  state: GameState,
  playerIndex: 0 | 1,
  cardId: string
): { success: boolean; newState: GameState; error?: string } {
  const player = { ...state.players[playerIndex] };

  if (player.actionFlags.chargedConcerto) {
    return { success: false, newState: state, error: '이번 턴에는 이미 협주를 충전했습니다 (턴당 1회).' };
  }

  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { success: false, newState: state, error: '패에 해당 카드가 없습니다.' };
  }

  const [chargedCard] = player.hand.splice(cardIndex, 1);
  player.concertoZone.push(chargedCard);
  player.actionFlags.chargedConcerto = true;

  let newState = { ...state };
  newState.players[playerIndex] = player;
  newState = addLog(
    newState,
    `${player.name}이(가) [${chargedCard.nameKr}]을(를) 협주 존에 충전했습니다. (현재 협주: ${player.concertoZone.length})`,
    'ACTION',
    playerIndex
  );

  return { success: true, newState };
}

// 대결 진행 여부 선택 (Clash vs Pass)
export function decideClash(state: GameState, startClash: boolean): GameState {
  const activeIdx = state.activePlayerIndex;
  let newState = { ...state };

  if (startClash) {
    newState.phase = 'CLASH_SET';
    newState.clashResult = null;
    // 양측 대결 카드 초기화
    newState.players[0].clashCard = null;
    newState.players[0].clashCardReady = false;
    newState.players[1].clashCard = null;
    newState.players[1].clashCardReady = false;
    newState = addLog(newState, `${newState.players[activeIdx].name}이(가) 대결(배틀)을 선언했습니다!`, 'CLASH', activeIdx);
  } else {
    newState = addLog(newState, `${newState.players[activeIdx].name}이(가) 대결을 건너뛰었습니다.`, 'ACTION', activeIdx);
    return checkHandOverflowOrEndTurn(newState);
  }

  return newState;
}

// ==========================================
// 6. 대결 세트 및 판정 (CLASH_SET & RESOLVE)
// ==========================================

export function setClashCard(
  state: GameState,
  playerIndex: 0 | 1,
  cardId: string | null,
  spentConcertoIds?: string[]
): { success: boolean; newState: GameState; error?: string } {
  const player = { ...state.players[playerIndex] };

  if (cardId === null) {
    // 카드를 내지 않고 패스
    player.clashCard = null;
    player.clashCardReady = true;
  } else {
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) {
      return { success: false, newState: state, error: '패에 카드가 없습니다.' };
    }

    // 코스트 검증
    if (player.concertoZone.length < card.cost) {
      return {
        success: false,
        newState: state,
        error: `비용(COST ${card.cost})이 부족합니다. 현재 협주: ${player.concertoZone.length}`,
      };
    }

    // 전용 카드 조건 검증
    if (!canLeaderUseCard(player.slots.leader, card)) {
      return {
        success: false,
        newState: state,
        error: `이 카드는 리더가 [${card.characterExclusive}]일 때만 사용할 수 있습니다.`,
      };
    }

    // 코스트 지불: 전달받은 spentConcertoIds가 있으면 우선 소모, 없으면 앞에서부터 차감
    if (card.cost > 0) {
      let spentCards: ActionCard[] = [];
      if (spentConcertoIds && spentConcertoIds.length === card.cost) {
        const remaining: ActionCard[] = [];
        for (const c of player.concertoZone) {
          if (spentConcertoIds.includes(c.id) && spentCards.length < card.cost) {
            spentCards.push(c);
          } else {
            remaining.push(c);
          }
        }
        player.concertoZone = remaining;
      } else {
        spentCards = player.concertoZone.splice(0, card.cost);
      }
      player.dropZone.push(...spentCards);
    }

    // 패에서 세트 존으로
    player.hand = player.hand.filter((c) => c.id !== cardId);
    player.clashCard = card;
    player.clashCardReady = true;
  }

  let newState: GameState = {
    ...state,
    players: [
      playerIndex === 0 ? player : { ...state.players[0] },
      playerIndex === 1 ? player : { ...state.players[1] },
    ] as [PlayerState, PlayerState],
  };

  // 방랑자(여) [BP01-018] 리더 배틀 효과 체크:
  // "자신이 녹색 카드로 배틀 시, 자신의 덱 위의 카드를 최대 2장 공개하고 패에 추가한다."
  if (
    player.clashCard &&
    player.clashCard.color === 'GREEN' &&
    (player.slots.leader.code === 'BP01-018' ||
      (player.slots.leader.characterName === '방랑자' && player.slots.leader.nameKr.includes('방랑자(여)')))
  ) {
    const revealed = player.actionDeck.splice(0, Math.min(2, player.actionDeck.length));
    if (revealed.length > 0) {
      const effectEv: TriggeredEffectEvent = {
        id: `eff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sourceCardName: '방랑자(여) [BP01-018]',
        sourceCardArt: player.slots.leader.artUrl,
        effectType: 'DRAW',
        title: '방랑자(여) [녹색 배틀 효과]',
        description: '녹색 카드로 배틀에 돌입하여 덱 위의 카드를 패에 추가하는 효과가 발동했습니다!',
        playerIndex,
        timestamp: Date.now(),
      };
      newState.lastEffectEvent = effectEv;

      if (player.isAi) {
        // AI는 2장 모두 패로 자동 추가
        player.hand.push(...revealed);
        newState = addLog(
          newState,
          `[방랑자(여) BP01-018 효과] ${player.name}이(가) 녹색 카드 배틀 효과로 카드 ${revealed.length}장을 패에 추가했습니다.`,
          'ACTION',
          playerIndex
        );
      } else {
        // 유저는 선택 모달(PendingChoice)을 띄워 0장, 1장, 2장 직접 선택
        newState.pendingChoice = {
          id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          playerIndex,
          title: '방랑자(여) 배틀 효과',
          sourceCardName: '방랑자(여) [BP01-018]',
          sourceCardArt: player.slots.leader.artUrl,
          description: '녹색 카드로 배틀하여 덱 위의 카드를 최대 2장까지 패에 추가할 수 있습니다. 패에 넣을 카드를 선택하세요 (0장~2장 선택 가능).',
          revealedCards: revealed,
          minSelect: 0,
          maxSelect: revealed.length,
          onResolveType: 'ADD_TO_HAND',
        };
      }
    }
  }

  // 양 플레이어 모두 카드를 세트했다면 자동 공개 및 판정!
  if (newState.players[0].clashCardReady && newState.players[1].clashCardReady) {
    newState = resolveClash(newState);
  }

  return { success: true, newState };
}

// 대결 즉시 강제 판정 (마스터듀얼식 수동 진행 지원 및 대기 멈춤 방지)
export function forceResolveClash(state: GameState): GameState {
  if (state.phase !== 'CLASH_SET') return state;

  let newState = { ...state };
  const p0 = { ...newState.players[0] };
  const p1 = { ...newState.players[1] };

  // AI가 아직 세트하지 않은 경우 AI 최선 카드 세트
  if (!p1.clashCardReady && p1.isAi) {
    const usable = p1.hand.find((c) => p1.concertoZone.length >= c.cost && canLeaderUseCard(p1.slots.leader, c));
    if (usable) {
      if (usable.cost > 0) {
        const spent = p1.concertoZone.splice(0, usable.cost);
        p1.dropZone.push(...spent);
      }
      p1.hand = p1.hand.filter((c) => c.id !== usable.id);
      p1.clashCard = usable;
    }
  }

  p0.clashCardReady = true;
  p1.clashCardReady = true;
  newState.players = [p0, p1];

  return resolveClash(newState);
}

// 판정 계산 로직
export function resolveClash(state: GameState): GameState {
  let newState = { ...state, phase: 'CLASH_REVEAL' as GamePhase };
  const p0 = { ...newState.players[0] };
  const p1 = { ...newState.players[1] };
  const activeIdx = newState.activePlayerIndex;

  const c0 = p0.clashCard;
  const c1 = p1.clashCard;

  let winnerIndex: 0 | 1 | -1 = -1;
  let reason: ClashResult['reason'] = 'DRAW';
  let winnerColor: CardColor | undefined = undefined;
  let damageDealt = 0;
  let comboGranted = 0;
  let logText = '';

  // 1. 둘 다 카드를 안 낸 경우
  if (!c0 && !c1) {
    reason = 'DRAW';
    winnerIndex = -1;
    logText = '양측 모두 액션 카드를 내지 않아 무승부 처리되었습니다.';
  }
  // 2. 한쪽만 카드를 낸 경우
  else if (c0 && !c1) {
    winnerIndex = 0;
    reason = 'SOLO_CARD';
    winnerColor = c0.color;
    logText = `${p0.name}만 카드를 내어 자동 판정 승리했습니다!`;
  } else if (!c0 && c1) {
    winnerIndex = 1;
    reason = 'SOLO_CARD';
    winnerColor = c1.color;
    logText = `${p1.name}만 카드를 내어 자동 판정 승리했습니다!`;
  }
  // 3. 양측 모두 카드를 낸 경우 -> 삼각 상성 및 속도 판정
  else if (c0 && c1) {
    const color0 = c0.color;
    const color1 = c1.color;

    // 상성 판정: RED > GREEN > BLUE > RED
    const beats: Record<CardColor, CardColor> = {
      RED: 'GREEN',
      GREEN: 'BLUE',
      BLUE: 'RED',
    };

    if (beats[color0] === color1) {
      // P0 상성 승리
      winnerIndex = 0;
      reason = 'COLOR_ADVANTAGE';
      winnerColor = color0;
      logText = `${p0.name}의 [${color0}]이(가) ${p1.name}의 [${color1}]에 상성 우위로 승리했습니다!`;
    } else if (beats[color1] === color0) {
      // P1 상성 승리
      winnerIndex = 1;
      reason = 'COLOR_ADVANTAGE';
      winnerColor = color1;
      logText = `${p1.name}의 [${color1}]이(가) ${p0.name}의 [${color0}]에 상성 우위로 승리했습니다!`;
    } else {
      // 같은 색상!
      if (color0 === 'BLUE') {
        // BLUE vs BLUE는 둘 다 방어이므로 무승부!
        winnerIndex = -1;
        reason = 'DRAW';
        logText = `양측 모두 [BLUE] 방어 카드를 내어 무승부(대미지 없음)가 되었습니다.`;
      } else {
        // RED vs RED 또는 GREEN vs GREEN: 속도(Speed) 비교!
        // 속도 보정 계산 (치샤 Lv.0, 금희 Lv.2 등)
        let speed0 = c0.speed ?? 0;
        let speed1 = c1.speed ?? 0;

        // P0 버프
        if (p0.slots.leader.characterName === '치샤' && color0 === 'RED') speed0 += 1;
        if (p0.slots.leader.characterName === '금희' && p0.slots.leader.level === 2 && color0 === 'RED') speed0 += 1;
        // P1 리더가 산화 Lv.0이고 P1이 BLUE였을 때 상대 속도-2지만 여기선 동색이므로 제외

        // P1 버프
        if (p1.slots.leader.characterName === '치샤' && color1 === 'RED') speed1 += 1;
        if (p1.slots.leader.characterName === '금희' && p1.slots.leader.level === 2 && color1 === 'RED') speed1 += 1;

        if (speed0 > speed1) {
          winnerIndex = 0;
          reason = 'SPEED_ADVANTAGE';
          winnerColor = color0;
          logText = `동색 [${color0}] 대결! ${p0.name}(속도 ${speed0})이(가) ${p1.name}(속도 ${speed1})보다 빨라 승리했습니다!`;
        } else if (speed1 > speed0) {
          winnerIndex = 1;
          reason = 'SPEED_ADVANTAGE';
          winnerColor = color1;
          logText = `동색 [${color1}] 대결! ${p1.name}(속도 ${speed1})이(가) ${p0.name}(속도 ${speed0})보다 빨라 승리했습니다!`;
        } else {
          // 속도까지 같으면 턴 플레이어 승리!
          winnerIndex = activeIdx;
          reason = 'TURN_PLAYER_TIE';
          winnerColor = activeIdx === 0 ? color0 : color1;
          logText = `속도 동률(${speed0})! 턴을 진행 중인 선공 ${newState.players[activeIdx].name}이(가) 우선권으로 승리했습니다!`;
        }
      }
    }
  }

  // 대결 중 발생한 효과 목록 수집
  const triggeredEffects: TriggeredEffectEvent[] = [];

  // 승리 시 효과 처리 및 대미지 적용
  if (winnerIndex !== -1) {
    const winnerPlayer = winnerIndex === 0 ? p0 : p1;
    const loserIndex = (winnerIndex === 0 ? 1 : 0) as 0 | 1;
    const loserPlayer = loserIndex === 0 ? p0 : p1;
    const winCard = winnerIndex === 0 ? c0! : c1!;

    // 1. 대미지 계산
    let baseDmg = winCard.damage;
    let extraDmg = 0;
    // 금희 Lv.0 리더: 빨강 승리 피해 +1
    if (winnerPlayer.slots.leader.characterName === '금희' && winCard.color === 'RED') {
      extraDmg += 1;
    }
    // 금희 Lv.2 패시브: 빨강 피해 +1
    if (winnerPlayer.slots.leader.characterName === '금희' && winnerPlayer.slots.leader.level === 2 && winCard.color === 'RED') {
      extraDmg += 1;
    }

    if (extraDmg > 0) {
      baseDmg += extraDmg;
      triggeredEffects.push({
        id: `eff-${Date.now()}-jinshi`,
        sourceCardName: winnerPlayer.slots.leader.nameKr,
        sourceCardArt: winnerPlayer.slots.leader.artUrl,
        effectType: 'DAMAGE',
        title: '금희 [용의 서리 강타]',
        description: `적색 카드 판정 승리로 공격 피해가 +${extraDmg} 증가했습니다!`,
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
    }

    loserPlayer.hp = Math.max(0, loserPlayer.hp - baseDmg);
    damageDealt = baseDmg;

    // 2. 카드 특수 효과 발동
    if (winCard.effectType === 'DRAW') {
      const drawN = winCard.code === 'WW-AC-G04' ? 2 : 1;
      for (let i = 0; i < drawN; i++) {
        const card = drawSingleCardFromDeck(winnerPlayer);
        if (card) winnerPlayer.hand.push(card);
      }
      triggeredEffects.push({
        id: `eff-${Date.now()}-draw`,
        sourceCardName: winCard.nameKr,
        sourceCardArt: winCard.artUrl,
        effectType: 'DRAW',
        title: '카드 드로우 효과',
        description: `덱에서 카드 ${drawN}장을 뽑아 패에 추가했습니다.`,
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
    } else if (winCard.effectType === 'HEAL') {
      const healAmount = winCard.code === 'WW-AC-B04' ? 3 : 2;
      winnerPlayer.hp = Math.min(winnerPlayer.maxHp, winnerPlayer.hp + healAmount);
      triggeredEffects.push({
        id: `eff-${Date.now()}-heal`,
        sourceCardName: winCard.nameKr,
        sourceCardArt: winCard.artUrl,
        effectType: 'HEAL',
        title: '생명력 회복 효과',
        description: `생명력(HP)을 ${healAmount} 회복했습니다.`,
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
    } else if (winCard.effectType === 'CHARGE') {
      const c1 = drawSingleCardFromDeck(winnerPlayer);
      if (c1) winnerPlayer.concertoZone.push(c1);
      const c2 = drawSingleCardFromDeck(winnerPlayer);
      if (c2) winnerPlayer.hand.push(c2);
      triggeredEffects.push({
        id: `eff-${Date.now()}-charge`,
        sourceCardName: winCard.nameKr,
        sourceCardArt: winCard.artUrl,
        effectType: 'CHARGE',
        title: '협주 급속 충전',
        description: '협주 에너지를 1장 충전하고 카드 1장을 드로우했습니다.',
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
    }

    // 3. 캐릭터 스킬 발동
    // 산화 Lv.1: 파랑 판정 승리 시 HP 2 회복
    if (winnerPlayer.slots.leader.characterName === '산화' && winnerPlayer.slots.leader.level >= 1 && winCard.color === 'BLUE') {
      winnerPlayer.hp = Math.min(winnerPlayer.maxHp, winnerPlayer.hp + 2);
      triggeredEffects.push({
        id: `eff-${Date.now()}-sanhua-heal`,
        sourceCardName: winnerPlayer.slots.leader.nameKr,
        sourceCardArt: winnerPlayer.slots.leader.artUrl,
        effectType: 'HEAL',
        title: '산화 [냉기의 가호]',
        description: '청색(방어) 카드 판정 승리로 HP 2를 회복했습니다!',
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
    }
    // 양양 Lv.0: 판정 승리 시 협주 1장 충전
    if (winnerPlayer.slots.leader.characterName === '양양') {
      const card = drawSingleCardFromDeck(winnerPlayer);
      if (card) {
        winnerPlayer.concertoZone.push(card);
        triggeredEffects.push({
          id: `eff-${Date.now()}-yangyang`,
          sourceCardName: winnerPlayer.slots.leader.nameKr,
          sourceCardArt: winnerPlayer.slots.leader.artUrl,
          effectType: 'CHARGE',
          title: '양양 [바람의 조율]',
          description: '판정 승리로 협주 에너지를 1장 추가 충전했습니다!',
          playerIndex: winnerIndex,
          timestamp: Date.now(),
        });
      }
    }

    // 4. 연격권(Combo Count) 계산
    // RED 승리 시 기본 1회 연격권
    if (winCard.color === 'RED') {
      comboGranted += 1;
    }
    // 카드 자체 [추격 X]
    if (winCard.pursuitCount) {
      comboGranted += winCard.pursuitCount;
      triggeredEffects.push({
        id: `eff-${Date.now()}-pursuit`,
        sourceCardName: winCard.nameKr,
        sourceCardArt: winCard.artUrl,
        effectType: 'COMBO',
        title: `카드 특수 효과 [추격 +${winCard.pursuitCount}]`,
        description: `연격 연속 공격 횟수를 +${winCard.pursuitCount}회 획득했습니다!`,
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
    }
    // 치샤 Lv.1 리더: 판정 승리 시 추격+1
    if (winnerPlayer.slots.leader.characterName === '치샤' && winnerPlayer.slots.leader.level >= 1) {
      comboGranted += 1;
      triggeredEffects.push({
        id: `eff-${Date.now()}-chixia`,
        sourceCardName: winnerPlayer.slots.leader.nameKr,
        sourceCardArt: winnerPlayer.slots.leader.artUrl,
        effectType: 'COMBO',
        title: '치샤 [연속 사격의 열기]',
        description: '판정 승리로 연격(추격) 횟수를 +1 추가 획득했습니다!',
        playerIndex: winnerIndex,
        timestamp: Date.now(),
      });
    }

    // 상대에게 산화 Lv.2가 있다면 상대 연격 단계 완전 봉쇄!
    const opponentHasSanhuaLv2 =
      loserPlayer.slots.leader.characterName === '산화' && loserPlayer.slots.leader.level === 2;
    if (opponentHasSanhuaLv2 && comboGranted > 0) {
      comboGranted = 0;
      triggeredEffects.push({
        id: `eff-${Date.now()}-sanhua-cancel`,
        sourceCardName: loserPlayer.slots.leader.nameKr,
        sourceCardArt: loserPlayer.slots.leader.artUrl,
        effectType: 'CANCEL',
        title: '산화 Lv.2 [빙결 결계]',
        description: '상대의 연격(Combo Step)을 완전히 봉쇄하여 무효화했습니다!',
        playerIndex: loserIndex,
        timestamp: Date.now(),
      });
      newState = addLog(newState, `[산화 Lv.2 패시브] 상대의 냉기 결계로 인해 연격(콤보)이 무효화되었습니다!`, 'SYSTEM', winnerIndex);
    }

    winnerPlayer.comboCount = comboGranted;
  }

  // 패배자 방랑자 Lv.1 효과: 초록 카드가 빨강에 졌어도 1장 드로우 (선택 가능)
  if (winnerIndex !== -1) {
    const loserIndex = (winnerIndex === 0 ? 1 : 0) as 0 | 1;
    const loserPlayer = loserIndex === 0 ? p0 : p1;
    const loserCard = loserIndex === 0 ? c0 : c1;
    const winnerCard = winnerIndex === 0 ? c0 : c1;

    if (
      loserPlayer.slots.leader.characterName === '방랑자' &&
      loserPlayer.slots.leader.level >= 1 &&
      loserCard?.color === 'GREEN' &&
      winnerCard?.color === 'RED'
    ) {
      const revealed = loserPlayer.actionDeck.splice(0, Math.min(1, loserPlayer.actionDeck.length));
      if (revealed.length > 0) {
        triggeredEffects.push({
          id: `eff-${Date.now()}-rover-defeat`,
          sourceCardName: '방랑자 Lv.1 [SD01-002]',
          sourceCardArt: loserPlayer.slots.leader.artUrl,
          effectType: 'DRAW',
          title: '방랑자 [역경의 재기]',
          description: '적색 카드에 패배하여 덱 위의 카드를 패에 추가할 수 있는 효과가 발동했습니다!',
          playerIndex: loserIndex,
          timestamp: Date.now(),
        });
        if (loserPlayer.isAi) {
          loserPlayer.hand.push(...revealed);
          newState = addLog(
            newState,
            `[방랑자 Lv.1 효과] ${loserPlayer.name}이(가) 패배 시 덱 위 1장을 패에 추가했습니다.`,
            'ACTION',
            loserIndex
          );
        } else {
          newState.pendingChoice = {
            id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            playerIndex: loserIndex,
            title: '방랑자 Lv.1 판정 효과',
            sourceCardName: '방랑자 Lv.1 [SD01-002]',
            sourceCardArt: loserPlayer.slots.leader.artUrl,
            description: '자신의 녹색 카드가 적색 카드에 패배하여 덱 위의 카드를 패에 추가할 수 있습니다 (0장 또는 1장 선택).',
            revealedCards: revealed,
            minSelect: 0,
            maxSelect: 1,
            onResolveType: 'ADD_TO_HAND',
          };
        }
      }
    }
  }

  const clashResult: ClashResult = {
    p0Card: c0,
    p1Card: c1,
    winnerIndex,
    reason,
    winnerColor,
    damageDealt,
    comboGranted,
    logText,
    triggeredEffects,
  };

  newState.clashResult = clashResult;
  newState.players = [p0, p1];
  if (triggeredEffects.length > 0) {
    newState.lastEffectEvent = triggeredEffects[0];
  }

  newState = addLog(newState, `【대결 결과】 ${logText} (피해: ${damageDealt}, 부여된 연격: ${comboGranted})`, 'CLASH');

  // 승패 체크
  if (p0.hp <= 0 || p1.hp <= 0) {
    return checkGameOver(newState);
  }

  return newState;
}

// 대결 공개 후 연격 단계 또는 턴 종료 단계로 이동
export function proceedAfterClashReveal(state: GameState): GameState {
  let newState: GameState = { ...state, lastComboStrike: null };
  const p0 = { ...newState.players[0] };
  const p1 = { ...newState.players[1] };

  // 사용한 대결 카드들은 묘지로
  if (p0.clashCard) {
    p0.dropZone.push(p0.clashCard);
    p0.clashCard = null;
    p0.clashCardReady = false;
  }
  if (p1.clashCard) {
    p1.dropZone.push(p1.clashCard);
    p1.clashCard = null;
    p1.clashCardReady = false;
  }

  newState.players = [p0, p1];

  // 연격권이 남아있고 패에 빨간색 카드가 있는 플레이어가 있는지 확인
  const p0HasCombo = p0.comboCount > 0 && p0.hand.some((c) => c.color === 'RED');
  const p1HasCombo = p1.comboCount > 0 && p1.hand.some((c) => c.color === 'RED');

  if (p0HasCombo || p1HasCombo) {
    newState.phase = 'COMBO_STEP';
    const comboPlayerIdx = p0HasCombo ? 0 : 1;
    newState = addLog(
      newState,
      `${newState.players[comboPlayerIdx].name}의 [연격 단계(Combo Step)]! 남은 연격 횟수: ${newState.players[comboPlayerIdx].comboCount}`,
      'ACTION',
      comboPlayerIdx as 0 | 1
    );
  } else {
    // 연격 없음 -> 패 초과 체크 및 턴 종료
    return checkHandOverflowOrEndTurn(newState);
  }

  return newState;
}

// ==========================================
// 7. 연격 단계 (COMBO_STEP)
// ==========================================

export function executeComboAttack(
  state: GameState,
  playerIndex: 0 | 1,
  cardId: string,
  spentConcertoIds?: string[]
): { success: boolean; newState: GameState; error?: string } {
  const player = { ...state.players[playerIndex] };
  const opponent = { ...state.players[playerIndex === 0 ? 1 : 0] };

  if (player.comboCount <= 0) {
    return { success: false, newState: state, error: '남은 연격 횟수가 없습니다.' };
  }

  const card = player.hand.find((c) => c.id === cardId);
  if (!card) {
    return { success: false, newState: state, error: '패에 카드가 없습니다.' };
  }

  if (card.color !== 'RED') {
    return { success: false, newState: state, error: '연격 단계에서는 빨간색(RED) 카드만 사용할 수 있습니다.' };
  }

  // 금희 Lv.1: 연격 단계 빨간 카드 비용 1 감소 (최소 0)
  let effectiveCost = card.cost;
  if (player.slots.leader.characterName === '금희' && player.slots.leader.level >= 1) {
    effectiveCost = Math.max(0, effectiveCost - 1);
  }

  if (player.concertoZone.length < effectiveCost) {
    return {
      success: false,
      newState: state,
      error: `비용이 부족합니다 (필요 협주: ${effectiveCost}, 보유: ${player.concertoZone.length}).`,
    };
  }

  // 비용 지불: spentConcertoIds 우선 소모
  if (effectiveCost > 0) {
    let spentCards: ActionCard[] = [];
    if (spentConcertoIds && spentConcertoIds.length === effectiveCost) {
      const remaining: ActionCard[] = [];
      for (const c of player.concertoZone) {
        if (spentConcertoIds.includes(c.id) && spentCards.length < effectiveCost) {
          spentCards.push(c);
        } else {
          remaining.push(c);
        }
      }
      player.concertoZone = remaining;
    } else {
      spentCards = player.concertoZone.splice(0, effectiveCost);
    }
    player.dropZone.push(...spentCards);
  }

  // 패에서 묘지로
  player.hand = player.hand.filter((c) => c.id !== cardId);
  player.dropZone.push(card);
  player.comboCount -= 1;

  // 대미지 계산
  let dmg = card.damage;
  // 치샤 Lv.2: 연격 단계 대미지 추가 +1
  if (player.slots.leader.characterName === '치샤' && player.slots.leader.level === 2) {
    dmg += 1;
  }

  opponent.hp = Math.max(0, opponent.hp - dmg);

  let newState = { ...state };
  newState.players[playerIndex] = player;
  newState.players[playerIndex === 0 ? 1 : 0] = opponent;
  newState.lastComboStrike = {
    id: `combo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    attackerIndex: playerIndex,
    attackerName: player.slots.leader.characterName || player.name,
    card,
    damage: dmg,
  };

  newState = addLog(
    newState,
    `[연격 성공!] ${player.name}이(가) [${card.nameKr}](으)로 ${dmg}의 추가 피해를 입혔습니다! (남은 연격: ${player.comboCount})`,
    'DAMAGE',
    playerIndex
  );

  // 승패 확인
  if (opponent.hp <= 0) {
    return { success: true, newState: checkGameOver(newState) };
  }

  // 연격 소진 시 자동 종료
  if (player.comboCount <= 0 || !player.hand.some((c) => c.color === 'RED')) {
    newState = checkHandOverflowOrEndTurn(newState);
  }

  return { success: true, newState };
}

export function finishComboStep(state: GameState, playerIndex: 0 | 1): GameState {
  let newState: GameState = { ...state, lastComboStrike: null };
  newState.players[playerIndex].comboCount = 0;
  newState = addLog(newState, `${newState.players[playerIndex].name}이(가) 연격 단계를 마쳤습니다.`, 'ACTION', playerIndex);
  return checkHandOverflowOrEndTurn(newState);
}

// ==========================================
// 8. 패 상한 및 턴 종료 (END_PHASE)
// ==========================================

function checkHandOverflowOrEndTurn(state: GameState): GameState {
  const activeIdx = state.activePlayerIndex;
  const activePlayer = state.players[activeIdx];

  if (activePlayer.hand.length > 8) {
    return {
      ...state,
      phase: 'DISCARD_OVERFLOW',
    };
  }

  return executeEndPhase(state);
}

export function discardOverflowCards(
  state: GameState,
  playerIndex: 0 | 1,
  discardIds: string[]
): { success: boolean; newState: GameState; error?: string } {
  const player = { ...state.players[playerIndex] };
  const neededDiscard = player.hand.length - 8;

  if (discardIds.length !== neededDiscard) {
    return {
      success: false,
      newState: state,
      error: `패 상한(8장)을 초과했습니다. ${neededDiscard}장을 버려야 합니다.`,
    };
  }

  const discarded = player.hand.filter((c) => discardIds.includes(c.id));
  player.hand = player.hand.filter((c) => !discardIds.includes(c.id));
  player.dropZone.push(...discarded);

  let newState = { ...state };
  newState.players[playerIndex] = player;
  newState = addLog(newState, `${player.name}이(가) 패 상한 초과로 ${discarded.length}장을 버렸습니다.`, 'ACTION', playerIndex);

  return { success: true, newState: executeEndPhase(newState) };
}

export function executeEndPhase(state: GameState): GameState {
  let newState = { ...state, phase: 'END_PHASE' as GamePhase };

  // 연격 카운트 및 대결 플래그 초기화
  newState.players[0].comboCount = 0;
  newState.players[1].comboCount = 0;
  newState.players[0].clashCardReady = false;
  newState.players[1].clashCardReady = false;

  // 턴 전환
  const nextPlayerIdx = newState.activePlayerIndex === 0 ? 1 : 0;
  newState.activePlayerIndex = nextPlayerIdx;

  // 1P로 돌아올 때 턴 수 증가
  if (nextPlayerIdx === 0) {
    newState.turn += 1;
  }

  // 다음 플레이어의 시작 단계로 바로 진행
  return executeStartPhase(newState);
}

// 승패 판정
function checkGameOver(state: GameState): GameState {
  const p0Hp = state.players[0].hp;
  const p1Hp = state.players[1].hp;

  if (p0Hp <= 0 || p1Hp <= 0) {
    const winnerIdx: 0 | 1 = p0Hp <= 0 ? 1 : 0;
    const winnerName = state.players[winnerIdx].name;
    const loserName = state.players[winnerIdx === 0 ? 1 : 0].name;

    const endState: GameState = {
      ...state,
      phase: 'GAME_OVER',
      winner: winnerIdx,
    };

    return addLog(
      endState,
      `🏆 [게임 종료] ${loserName}의 생명력이 0이 되어, ${winnerName}이(가) 최종 승리했습니다!`,
      'SYSTEM'
    );
  }
  return state;
}

// ==========================================
// 9. 선택 발동 효과 해결 (PendingChoice)
// ==========================================

export function resolvePendingChoice(
  state: GameState,
  chosenCardIds: string[]
): GameState {
  if (!state.pendingChoice) return state;

  const { playerIndex, revealedCards, sourceCardName } = state.pendingChoice;
  const player = { ...state.players[playerIndex] };

  // 선택된 카드는 패로
  const chosenCards = revealedCards.filter((c) => chosenCardIds.includes(c.id));
  player.hand = [...player.hand, ...chosenCards];

  // 선택되지 않은 카드는 덱 맨 아래로
  const unchosenCards = revealedCards.filter((c) => !chosenCardIds.includes(c.id));
  player.actionDeck = [...player.actionDeck, ...unchosenCards];

  let newState: GameState = {
    ...state,
    pendingChoice: null,
  };
  newState.players[playerIndex] = player;

  if (chosenCards.length > 0) {
    newState.lastEffectEvent = {
      id: `eff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceCardName,
      effectType: 'DRAW',
      title: '카드 패 추가 완료',
      description: `[${sourceCardName}] 효과로 카드 ${chosenCards.length}장을 패에 추가했습니다!`,
      playerIndex,
      timestamp: Date.now(),
    };
  }

  newState = addLog(
    newState,
    `${player.name}이(가) [${sourceCardName}] 효과로 카드 ${chosenCards.length}장을 선택하여 패에 추가했습니다.${
      unchosenCards.length > 0 ? ` (선택하지 않은 ${unchosenCards.length}장은 덱 맨 아래로)` : ''
    }`,
    'ACTION',
    playerIndex
  );

  return newState;
}
