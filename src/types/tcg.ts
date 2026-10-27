export type CardColor = 'RED' | 'GREEN' | 'BLUE';
export type CardKind = 'CHARACTER' | 'ACTION';

// 속성 타입 (명조 원작 설정: 회절, 기류, 용융, 응결, 인멸, 전도 및 영문 하위호환)
export type ElementType =
  | '회절'
  | '기류'
  | '용융'
  | '응결'
  | '인멸'
  | '전도'
  | 'SPECTRO'
  | 'AERO'
  | 'FUSION'
  | 'GLACIO'
  | 'HAVOC'
  | 'ELECTRO';

export const ELEMENT_KR_MAP: Record<string, string> = {
  AERO: '기류',
  SPECTRO: '회절',
  GLACIO: '응결',
  FUSION: '용융',
  HAVOC: '인멸',
  ELECTRO: '전도',
  CONDUCTO: '전도',
  기류: '기류',
  회절: '회절',
  응결: '응결',
  용융: '용융',
  인멸: '인멸',
  전도: '전도',
};

// 속성 한글명 변환 헬퍼 (AERO -> 기류, SPECTRO -> 회절 등)
export function getElementKr(elem?: string | null): string {
  if (!elem) return '-';
  const clean = elem.trim();
  const upper = clean.toUpperCase();
  return ELEMENT_KR_MAP[upper] || ELEMENT_KR_MAP[clean] || clean;
}

// 캐릭터 카드
export interface CharacterCard {
  id: string;
  kind: 'CHARACTER';
  code: string; // 예: WW-CH-01
  characterName: string; // "방랑자", "금희", "양양", "치샤", "산화"
  nameKr: string;
  level: 0 | 1 | 2;
  element: ElementType; // 속성 (한글: 회절, 기류, 용융, 응결, 인멸)
  artUrl: string;
  description: string;
  // 스킬 타이밍
  leaderSkill?: string; // 리더가 되었을 때 또는 리더 위치일 때 발동
  clashSkill?: string;  // 대결 중 발동
  judgmentSkill?: string; // 판정 중 발동
  passiveSkill?: string; // 지속 패시브
  rarity?: string; // 공식 희귀도 (★ ~ ★★★★★, PR★★)
  underlyingCards?: CharacterCard[]; // 진화/레벨업으로 하위에 겹쳐진 이전 레벨 카드 스택 (보유 스킬 상속용)
}

// 액션 카드 (메인 덱)
export interface ActionCard {
  id: string;
  kind: 'ACTION';
  code: string;
  nameKr: string;
  color: CardColor; // RED: 공격/연격, GREEN: 기동/추격/견제, BLUE: 방어/반격
  cost: number; // 협주 존에서 소모할 비용 (0~3)
  speed?: number; // 속도 (RED, GREEN은 1~6, BLUE는 undefined)
  damage: number; // 판정 승리 시 상대에게 주는 기본 피해량
  pursuitCount?: number; // 추격(X): 승리 시 획득하는 추가 연격 횟수
  characterExclusive?: string; // 특정 캐릭터 전용 (예: "방랑자")
  description: string;
  effectType?: 'DRAW' | 'HEAL' | 'CHARGE' | 'EXTRA_DAMAGE' | 'GUARD';
  artUrl?: string;
  rarity?: string; // 공식 희귀도 (★ ~ ★★★)
  rawOfficial?: any; // 연결된 공식 원본 카드 데이터
  feature?: string; // 카드 특징 (<체공>, <기본 공격>, <공명 해방> 등)
  isRevealed?: boolean; // 카드 효과(공개 후 패 추가 등)로 상대방에게 공개된 상태로 패에 들어간 카드 여부
}

export type AnyCard = CharacterCard | ActionCard;

// 캐릭터 필드 슬롯
export interface CharacterSlots {
  leftSupport: CharacterCard | null;
  leader: CharacterCard;
  rightSupport: CharacterCard | null;
}

// 플레이어 필드 상태
export interface PlayerState {
  id: string;
  name: string;
  hp: number; // 시작 20
  maxHp: number;
  // 캐릭터 존
  slots: CharacterSlots;
  // 덱 & 존
  characterDeck: CharacterCard[]; // 진화용 Lv.1, Lv.2 카드 풀
  actionDeck: ActionCard[]; // 40장 메인 덱
  hand: ActionCard[]; // 최대 8장
  concertoZone: ActionCard[]; // 협주 존 (자원)
  dropZone: AnyCard[]; // 버린 카드 존 (묘지)
  // 대결 준비 카드
  clashCard: ActionCard | null;
  clashCardReady: boolean;
  pendingSpentConcertoIds?: string[]; // 대결 카드 공개 시 소모할 협주 카드 ID 목록
  // 이번 턴 실행한 행동 (각 1회 제한)
  actionFlags: {
    upgraded: boolean;
    switchedLeader: boolean;
    chargedConcerto: boolean;
    firstNormalAttackBonusUsed?: boolean;
    firstDamageTakenReducedThisTurn?: boolean;
    damageTakenThisTurn?: boolean;
    shorekeeperLv2HealDrawCount?: number;
    leaderSwapLockedThisTurn?: boolean;
  };
  // 연격 횟수 및 무제한 여부
  comboCount: number;
  comboUnlimited?: boolean; // 적색 승리로 인한 이번 턴 무제한 콤보 여부 (공식 룰 604.1.2.7)
  actionArea?: ActionCard[]; // 이번 턴 액션 에리어에 사용/배치된 카드 목록 (공식 룰 604.1.3.2)
  isAi: boolean;
  hasDominance?: boolean; // 지난 턴 배틀 승리 또는 상대 배틀 패스로 획득한 【우세】 보유 여부
  tempCostPenaltyRed?: number; // SD01-016 북풍의 소용돌이: 상대 적색 카드 COST+1 다음 턴
  tempCostPenaltyRedTurns?: number; // SD01-016 지속 턴 카운터
  comboBlockedNextTurn?: boolean; // SD02-016 죽음의 눈보라: 다음 턴 콤보 발동 불가
  comboBlockedTurns?: number; // SD02-016 지속 턴 카운터
  ankePendingRetaliationDmg?: number; // BP01-014 앙코 Lv.1: 적색 패배 시 배틀 페이즈 종료 반격 데미지
  introSkillBonusDrawCount?: number; // BP01-057 결말의 순환: 다음 2장의 변주 스킬 드로우 보너스
}

// 게임 페이즈
export type GamePhase =
  | 'LEADER_SELECT'    // 시작 리더 캐릭터 선택 페이즈
  | 'MULLIGAN'         // 시작 5장 교체 선택
  | 'START_PHASE'      // 턴 시작 처리
  | 'DRAW_PHASE'       // 2장 드로우 (선공 1턴 1장)
  | 'ACTION_PHASE'     // 레벨업 / 스왑 / 충전 (각 1회)
  | 'CLASH_SELECT'     // 대결 진행 여부 선택 (배틀 or 패스)
  | 'CLASH_SET'        // 액션 카드 뒷면 세트
  | 'CLASH_REVEAL'     // 동시 공개 및 판정 결과 표시
  | 'COMBO_STEP'       // 연격 단계 (빨간 카드 연속 사용)
  | 'DISCARD_OVERFLOW' // 8장 초과 시 버리기 단계
  | 'END_PHASE'        // 턴 종료 처리
  | 'GAME_OVER';

// 판정 결과
export interface ClashResult {
  p0Card: ActionCard | null;
  p1Card: ActionCard | null;
  winnerIndex: 0 | 1 | -1; // -1: 무승부 (예: BLUE vs BLUE, 또는 양측 카드 없음)
  reason: 'COLOR_ADVANTAGE' | 'SPEED_ADVANTAGE' | 'TURN_PLAYER_TIE' | 'SOLO_CARD' | 'DRAW';
  winnerColor?: CardColor;
  damageDealt: number;
  comboGranted: number; // 빨강 승리(1) + 추격(X)
  comboBlockedReason?: string; // 상대 해금 [BP01-058] 우세 효과, 승천하는 용 제약 등으로 연격 봉쇄 시 사유
  logText: string;
  triggeredEffects?: TriggeredEffectEvent[]; // 대결 중 발동된 효과 및 사건 목록
}

// 카드 효과 발동 이벤트 상세
export interface TriggeredEffectEvent {
  id: string;
  sourceCardName: string; // 효과를 일으킨 카드명 (예: "방랑자(여) [BP01-018]", "진동 소리", "산화 Lv.1", "양양")
  sourceCardArt?: string; // 카드 일러스트 URL
  effectType: 'BUFF' | 'DRAW' | 'HEAL' | 'CHARGE' | 'COMBO' | 'CANCEL' | 'DAMAGE' | 'DISCARD';
  title: string;          // 효과 타이틀 (예: "녹색 배틀 개시", "생명력 회복", "협주 급속 충전", "빙결 결계")
  description: string;    // 어떤 사건이 일어났는지 설명 (예: "덱 위의 카드를 2장 공개하여 패에 추가했습니다.", "HP를 2 회복했습니다.")
  playerIndex: 0 | 1;
  timestamp: number;
}

// 전투 로그 시점 전장 스냅샷 (리플레이 100% 동기화용)
export interface LogBoardSnapshot {
  turn: number;
  phase: GamePhase;
  activePlayerIndex: 0 | 1;
  p0: {
    hp: number;
    maxHp: number;
    concerto: number;
    leader: { nameKr: string; characterName?: string; level: number; artUrl: string; element: string };
    leftSupport?: { nameKr: string; characterName?: string; level: number; artUrl: string; element: string };
    rightSupport?: { nameKr: string; characterName?: string; level: number; artUrl: string; element: string };
    handCount: number;
    deckCount: number;
    dropCount: number;
    handCards?: { code: string; nameKr: string; cost: number; color?: string; speed?: number | null; damage?: number; artUrl?: string; description?: string }[];
  };
  p1: {
    hp: number;
    maxHp: number;
    concerto: number;
    leader: { nameKr: string; characterName?: string; level: number; artUrl: string; element: string };
    leftSupport?: { nameKr: string; characterName?: string; level: number; artUrl: string; element: string };
    rightSupport?: { nameKr: string; characterName?: string; level: number; artUrl: string; element: string };
    handCount: number;
    deckCount: number;
    dropCount: number;
    handCards?: { code: string; nameKr: string; cost: number; color?: string; speed?: number | null; damage?: number; artUrl?: string; description?: string }[];
  };
  p0ClashCard?: { nameKr: string; artUrl?: string; color?: string; cost?: number; speed?: number | null; damage?: number };
  p1ClashCard?: { nameKr: string; artUrl?: string; color?: string; cost?: number; speed?: number | null; damage?: number };
  p0ActionCards?: { nameKr: string; code?: string; artUrl?: string; color?: string; cost?: number; speed?: number | null; damage?: number }[];
  p1ActionCards?: { nameKr: string; code?: string; artUrl?: string; color?: string; cost?: number; speed?: number | null; damage?: number }[];
}

// 전투 로그 항목
export interface LogItem {
  id: string;
  turn: number;
  playerIndex?: 0 | 1;
  text: string;
  type: 'PHASE' | 'ACTION' | 'CLASH' | 'DAMAGE' | 'HEAL' | 'SYSTEM';
  timestamp: number;
  cardArt?: string; // 카드 일러스트 썸네일
  cardName?: string; // 카드 이름
  amount?: number; // 데미지량 또는 회복 수치
  effectTag?: string; // '연격', '가드', '드로우', '회복', '충전' 등
  drawnCards?: ActionCard[]; // 드로우된 카드 목록 (호버 시 공개 및 툴팁용)
  snapshot?: LogBoardSnapshot; // 리플레이 정확도 100% 보장을 위한 실시간 전장 스냅샷
}

// 전체 게임 상태
export interface ComboStrikeEffect {
  id: string;
  attackerIndex: 0 | 1;
  attackerName: string;
  card: ActionCard;
  damage: number;
  comboCount?: number; // 1, 2, 3, 4, 5, 6... 콤보 단계
  swappedFromLeader?: CharacterCard; // 변주 스킬 등으로 교체되기 전 리더
  swappedToLeader?: CharacterCard; // 변주 스킬 등으로 새로 교체된 리더
  comboEffectTitle?: string; // 콤보 스킬/효과 요약 타이틀
  comboEffectDesc?: string; // 콤보 스킬/효과 상세 설명
  isLethal?: boolean; // 이번 연격 타격으로 상대의 HP가 0이 되어 피니시로 연결되는 치명타 여부
}

// 효과 드로우 애니메이션 연출 데이터
export interface EffectDrawAnimation {
  id: string;
  playerIndex: 0 | 1;
  cards: ActionCard[];
  sourceCardName?: string;
  sourceCardArt?: string;
  nextPendingChoice?: PendingChoice | null;
}

export interface UpgradeEffect {
  id: string;
  playerIndex: 0 | 1;
  playerName: string;
  character: CharacterCard;
  previousLevel: 0 | 1 | 2;
  newLevel: 1 | 2;
  slotName: 'leader' | 'leftSupport' | 'rightSupport';
}

// 효과 발동/패 드로우/효과 레벨업 등 유저 선택 이벤트 (선택 발동 모달)
export interface PendingChoice {
  id: string;
  playerIndex: 0 | 1;
  title: string;
  sourceCardName: string;
  sourceCardArt?: string;
  description: string;
  revealedCards: Array<ActionCard | CharacterCard>; // 공개된 덱 위 카드들 또는 캐릭터 덱 진화 후보들
  minSelect: number; // 예: 0장 또는 1장 필수 선택
  maxSelect: number; // 예: 최대 1~2장 선택 가능
  onResolveType:
    | 'ADD_TO_HAND'
    | 'SET_CONCERTO'
    | 'RECOVER_FROM_DROP'
    | 'DISCARD_FOR_DAMAGE'
    | 'DISCARD_FROM_HAND'
    | 'VIEW_ONLY'
    | 'SELECT_EFFECT_UPGRADE'
    | 'SWAP_LEADER'
    | 'RECOVER_BP01_069'
    | 'BP01_022_YANGYANG_SWAP'
    | 'SHOREKEEPER_SWITCH_PROMPT'
    | 'SHOREKEEPER_0_DRAW_PROMPT'
    | 'SHOREKEEPER_LV2_HEAL_DRAW_PROMPT'
    | 'SHOREKEEPER_SWITCH_DRAW'
    | 'DRAW_THEN_DISCARD_CONFIRM'
    | 'PAY_CLASH_CONCERTO_COST';
  targetSlot?: 'leader' | 'leftSupport' | 'rightSupport';
  sourceZone?: 'DECK' | 'DROP' | 'HAND' | 'CONCERTO';
  isPublicReveal?: boolean; // 양측 플레이어(상대 포함)에게 공개된 카드인지 여부
  endTurnAfterResolve?: boolean; // 확인 후 엔드 페이즈로 진행 (배틀 없이 턴 종료 시 패 전체 공개 팝업용)
}

export interface HpHistoryEntry {
  id: string;
  turn: number;
  playerIndex: 0 | 1;
  type: 'DAMAGE' | 'HEAL';
  amount: number;
  prevHp: number;
  newHp: number;
  reason: string;
  sourceCardName?: string;
  sourceCardArt?: string;
  timestamp: number;
}

export interface GameState {
  turn: number;
  activePlayerIndex: 0 | 1; // 턴 플레이어 (0: 플레이어1, 1: 플레이어2/AI)
  firstPlayerIndex?: 0 | 1; // 게임 시작 시 주사위로 결정된 1턴 선공 플레이어 (0: 플레이어1, 1: 플레이어2/AI)
  firstTurnDrawCompleted?: boolean; // 공식 룰 602.1.3: 선공 플레이어의 게임 첫 번째 턴(1장 드로우) 완료 여부
  phase: GamePhase;
  players: [PlayerState, PlayerState];
  clashResult: ClashResult | null;
  lastClashWinnerIndex?: 0 | 1 | -1 | null; // 최근 대결 승자 (우세 판정 보존용)
  battleStepEffects?: TriggeredEffectEvent[]; // 배틀 스텝(604.1.1)에서 발생한 효과 목록 (치샤/금희 배틀 데미지 등)
  lastComboStrike?: ComboStrikeEffect | null;
  lastUpgrade?: UpgradeEffect | null;
  lastEffectDraw?: EffectDrawAnimation | null; // 효과 드로우 및 손패 비행 연출
  deferredEffectDraw?: EffectDrawAnimation | null; // 전투 판정 결과창 종료 후 발동할 보류 드로우 연출
  deferredEffectDraws?: EffectDrawAnimation[]; // 전투 중 발생한 보류 드로우 연출 큐
  lastEffectEvent?: TriggeredEffectEvent | null; // 최근 발동된 효과 이벤트 (화면 토스트 연출용)
  pendingChoice?: PendingChoice | null;
  pendingChoiceQueue?: PendingChoice[]; // 여러 효과 동시 발동 시 순차 처리 큐
  deferredChoice?: PendingChoice | null; // 전투 데미지 결과 후 발동할 보류 선택 효과
  deferredChoices?: PendingChoice[]; // 전투 중 발생한 보류 선택 효과 큐
  deferredUpgrade?: UpgradeEffect | null; // 전투 데미지 결과 후 발동할 보류 레벨업 연출
  deferredEffectEvent?: TriggeredEffectEvent | null; // 전투 데미지 결과 후 발동할 보류 알림 이벤트
  winner: 0 | 1 | null;
  logs: LogItem[];
  hpHistory?: HpHistoryEntry[]; // 체력 변동 상세 기록 (대미지/회복 원인 및 카드 정보)
  gameMode: 'AI' | 'SOLO_DUAL' | 'MULTIPLAYER'; // AI 대전 vs 1인 2역 듀얼 vs 온라인 P2P 대전
  isOpponentHandScanned?: boolean; // 스캔 효과 등으로 상대의 손패가 필드에 공개된 상태
}

// 덱 구성 인터페이스
export interface CustomDeckConfig {
  id: string;
  name: string;
  leader: CharacterCard;
  leftSupport: CharacterCard;
  rightSupport: CharacterCard;
  characterDeck?: CharacterCard[]; // 공식 룰 캐릭터 덱 3~15장 (Lv.0, Lv.1, Lv.2 자유 편성)
  actionCards: ActionCard[];
}

// 덱 프리셋 데이터 구조 (저장 및 직렬화용)
export interface DeckPreset {
  id: string;
  name: string;
  isOfficial?: boolean;
  createdAt: string;
  leaderCode: string;
  leftSupportCode: string;
  rightSupportCode: string;
  characterDeckCards?: { code: string; count: number }[]; // 캐릭터 덱 카드 목록
  actionCards: { code: string; count: number }[];
  description?: string;
  externalCode?: string;
  authorName?: string;
}

// 커뮤니티 공유 덱 데이터 구조
export interface SharedDeck {
  id: string;
  deckName: string;
  authorName: string;
  isAnonymous: boolean;
  description: string;
  deckCode: string;
  deckPreset: DeckPreset;
  likes: number;
  likedByMe?: boolean;
  createdAt: number; // 타임스탬프
  tags: string[]; // ['스타터', '속공', '제어', '회절', '용융' 등]
}



