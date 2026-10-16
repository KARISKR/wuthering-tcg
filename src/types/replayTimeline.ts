export interface ReplaySlotSnapshot {
  nameKr: string;
  artUrl: string;
  level: number;
  element: string;
}

export interface ReplayPlayerSnapshot {
  name: string;
  hp: number;
  maxHp: number;
  concerto: number; // 0 ~ 10
  leader: ReplaySlotSnapshot;
  leftSupport?: ReplaySlotSnapshot;
  rightSupport?: ReplaySlotSnapshot;
  handCount: number;
  deckCount: number;
  dropCount: number;
  handCards?: ReplayActionCardVisual[]; // 해당 시점 플레이어 손패 카드 전체 (리플레이에서 상호 확인 가능)
}

export interface ReplayActionCardVisual {
  nameKr: string;
  artUrl?: string;
  code?: string;
  cost?: number;
  color?: string;
  speed?: number | null;
  damage?: number;
  description?: string;
  characterExclusive?: string | null;
}

export interface ReplayClashVisual {
  p0CardName?: string;
  p0CardArt?: string;
  p0Color?: string;
  p1CardName?: string;
  p1CardArt?: string;
  p1Color?: string;
  winner: 0 | 1 | 'DRAW';
  resultText: string;
}

export interface ReplaySnapshot {
  stepIndex: number;
  turn: number;
  phaseText: string;
  activePlayerIndex: 0 | 1;
  p0: ReplayPlayerSnapshot;
  p1: ReplayPlayerSnapshot;
  actionCard?: ReplayActionCardVisual;
  p0ActionCard?: ReplayActionCardVisual;
  p1ActionCard?: ReplayActionCardVisual;
  clash?: ReplayClashVisual;
  damageEvent?: {
    targetIndex: 0 | 1;
    amount: number;
    attackerName: string;
    weapon?: string;
  };
  healEvent?: {
    targetIndex: 0 | 1;
    amount: number;
  };
  upgradeEvent?: {
    playerIndex: 0 | 1;
    characterName: string;
    newLevel: number;
  };
  logText: string;
  logType: 'PHASE' | 'ACTION' | 'CLASH' | 'DAMAGE' | 'HEAL' | 'SYSTEM';
  soundTrigger?: 'damage' | 'clash' | 'upgrade' | 'combo' | 'phase' | 'card';
}
