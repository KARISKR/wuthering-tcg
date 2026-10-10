export type CardColor = 'RED' | 'GREEN' | 'BLUE';
export type CardKind = 'CHARACTER' | 'ACTION';

// 캐릭터 카드
export interface CharacterCard {
  id: string;
  kind: 'CHARACTER';
  code: string; // 예: WW-CH-01
  characterName: string; // "방랑자", "금희", "양양", "치샤", "산화"
  nameKr: string;
  level: 0 | 1 | 2;
  element: 'GLACIO' | 'FUSION' | 'AERO' | 'SPECTRO' | 'HAVOC'; // 속성 (명조 원작 설정)
  artUrl: string;
  description: string;
  // 스킬 타이밍
  leaderSkill?: string; // 리더가 되었을 때 또는 리더 위치일 때 발동
  clashSkill?: string;  // 대결 중 발동
  judgmentSkill?: string; // 판정 중 발동
  passiveSkill?: string; // 지속 패시브
  rarity?: string; // 공식 희귀도 (★ ~ ★★★★★, PR★★)
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
  // 이번 턴 실행한 행동 (각 1회 제한)
  actionFlags: {
    upgraded: boolean;
    switchedLeader: boolean;
    chargedConcerto: boolean;
  };
  // 연격 횟수
  comboCount: number;
  isAi: boolean;
}

// 게임 페이즈
export type GamePhase =
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
  logText: string;
  triggeredEffects?: TriggeredEffectEvent[]; // 대결 중 발동된 효과 및 사건 목록
}

// 카드 효과 발동 이벤트 상세
export interface TriggeredEffectEvent {
  id: string;
  sourceCardName: string; // 효과를 일으킨 카드명 (예: "방랑자(여) [BP01-018]", "진동 소리", "산화 Lv.1", "양양")
  sourceCardArt?: string; // 카드 일러스트 URL
  effectType: 'BUFF' | 'DRAW' | 'HEAL' | 'CHARGE' | 'COMBO' | 'CANCEL' | 'DAMAGE';
  title: string;          // 효과 타이틀 (예: "녹색 배틀 개시", "생명력 회복", "협주 급속 충전", "빙결 결계")
  description: string;    // 어떤 사건이 일어났는지 설명 (예: "덱 위의 카드를 2장 공개하여 패에 추가했습니다.", "HP를 2 회복했습니다.")
  playerIndex: 0 | 1;
  timestamp: number;
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
}

// 전체 게임 상태
export interface ComboStrikeEffect {
  id: string;
  attackerIndex: 0 | 1;
  attackerName: string;
  card: ActionCard;
  damage: number;
}

export interface UpgradeEffect {
  id: string;
  playerIndex: 0 | 1;
  playerName: string;
  character: CharacterCard;
  previousLevel: 0 | 1;
  newLevel: 1 | 2;
  slotName: 'leader' | 'leftSupport' | 'rightSupport';
}

// 효과 발동/패 드로우 등 유저 선택 이벤트 (선택 발동 모달)
export interface PendingChoice {
  id: string;
  playerIndex: 0 | 1;
  title: string;
  sourceCardName: string;
  sourceCardArt?: string;
  description: string;
  revealedCards: ActionCard[]; // 공개된 덱 위 카드들
  minSelect: number; // 예: 0장 선택 가능
  maxSelect: number; // 예: 최대 2장 선택 가능
  onResolveType: 'ADD_TO_HAND' | 'SET_CONCERTO';
}

export interface GameState {
  turn: number;
  activePlayerIndex: 0 | 1; // 턴 플레이어 (0: 플레이어1, 1: 플레이어2/AI)
  phase: GamePhase;
  players: [PlayerState, PlayerState];
  clashResult: ClashResult | null;
  lastComboStrike?: ComboStrikeEffect | null;
  lastUpgrade?: UpgradeEffect | null;
  lastEffectEvent?: TriggeredEffectEvent | null; // 최근 발동된 효과 이벤트 (화면 토스트 연출용)
  pendingChoice?: PendingChoice | null;
  winner: 0 | 1 | null;
  logs: LogItem[];
  gameMode: 'AI' | 'SOLO_DUAL'; // AI 대전 vs 1인 2역 듀얼
}

// 덱 구성 인터페이스
export interface CustomDeckConfig {
  id: string;
  name: string;
  leader: CharacterCard;
  leftSupport: CharacterCard;
  rightSupport: CharacterCard;
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
  actionCards: { code: string; count: number }[];
  description?: string;
  externalCode?: string;
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



