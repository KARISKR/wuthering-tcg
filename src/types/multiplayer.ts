import { GameState, CustomDeckConfig } from './tcg';

export type MultiplayerRole = 'HOST' | 'GUEST' | 'SPECTATOR';

export type MultiplayerConnectionStatus =
  | 'IDLE'
  | 'INITIALIZING'
  | 'WAITING_FOR_GUEST'
  | 'CONNECTING_TO_HOST'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'ERROR';

export interface TimeLimitConfig {
  hasTimeLimit: boolean;
  totalTimeSec: number; // default 300
  turnTimeSec: number;  // default 90
  clashTimeSec: number; // default 30
}

export interface MultiplayerPlayerProfile {
  name: string;
  presetKey?: 'STARTER_ROVER' | 'STARTER_CHIXIA';
  customDeck?: CustomDeckConfig | null;
  sessionId: string;
}

export interface MultiplayerSessionData {
  role: MultiplayerRole;
  roomCode: string;
  sessionId: string;
  playerName: string;
  myProfile: MultiplayerPlayerProfile;
  opponentProfile?: MultiplayerPlayerProfile;
  lastGameState?: GameState | null;
  timeLimitConfig?: TimeLimitConfig;
  allowSpectating?: boolean;
  p0TotalTime?: number;
  p1TotalTime?: number;
  currentTurnTime?: number;
  timestamp: number;
}

export type MultiplayerActionType =
  | 'DRAW_CARDS'
  | 'SELECT_LEADER'
  | 'MULLIGAN'
  | 'UPGRADE'
  | 'SWITCH_LEADER'
  | 'CHARGE_CONCERTO'
  | 'SET_CLASH_CARD'
  | 'DECIDE_CLASH'
  | 'PROCEED_AFTER_CLASH'
  | 'COMBO_ATTACK'
  | 'FINISH_COMBO'
  | 'DISCARD_OVERFLOW'
  | 'END_PHASE'
  | 'PENDING_CHOICE'
  | 'INITIATIVE_ROLL'
  | 'CHOOSE_ORDER';

export type MultiplayerMessage =
  | {
      type: 'LOBBY_JOIN';
      profile: MultiplayerPlayerProfile;
    }
  | {
      type: 'LOBBY_ACCEPT';
      hostProfile: MultiplayerPlayerProfile;
      timeLimitConfig?: TimeLimitConfig;
      allowSpectating?: boolean;
    }
  | {
      type: 'ROOM_CONFIG_UPDATE';
      timeLimitConfig?: TimeLimitConfig;
      allowSpectating?: boolean;
    }
  | {
      type: 'LOBBY_READY';
      isReady: boolean;
      profile: MultiplayerPlayerProfile;
    }
  | {
      type: 'GAME_START';
      initialState: GameState;
      hostProfile: MultiplayerPlayerProfile;
      guestProfile: MultiplayerPlayerProfile;
      timeLimitConfig?: TimeLimitConfig;
    }
  | {
      type: 'DISPATCH_ACTION';
      actionType: MultiplayerActionType;
      playerIndex: 0 | 1;
      payload: any;
    }
  | {
      type: 'SYNC_GAME_STATE';
      gameState: GameState;
      actionDesc?: string;
    }
  | {
      type: 'TIME_SYNC';
      p0TotalTime: number;
      p1TotalTime: number;
      currentTurnTime: number;
      activePlayerIndex: 0 | 1;
    }
  | {
      type: 'TIME_OUT';
      loserIndex: 0 | 1;
      reason: string;
    }
  | {
      type: 'PING';
      timestamp: number;
    }
  | {
      type: 'PONG';
      clientTimestamp: number;
    }
  | {
      type: 'RECONNECT_REQUEST';
      sessionId: string;
      role: MultiplayerRole;
      playerName: string;
    }
  | {
      type: 'RECONNECT_ACCEPT';
      gameState: GameState;
      hostProfile: MultiplayerPlayerProfile;
      guestProfile: MultiplayerPlayerProfile;
      timeLimitConfig?: TimeLimitConfig;
      p0TotalTime?: number;
      p1TotalTime?: number;
      currentTurnTime?: number;
    }
  | {
      type: 'DISCONNECT_WARNING';
      reason: string;
      countdownSec: number;
    }
  | {
      type: 'DISCONNECT_RESOLVED';
    }
  | {
      type: 'SURRENDER';
      playerIndex: 0 | 1;
    }
  | {
      type: 'EMOTE';
      playerIndex: 0 | 1;
      emote: string;
    };

export interface MultiplayerRoomInfo {
  roomCode: string;
  hostName: string;
  hostLeader?: string;
  hostLeaderArt?: string;
  deckName?: string;
  hasTimeLimit?: boolean;
  totalTimeSec?: number;
  turnTimeSec?: number;
  clashTimeSec?: number;
  allowSpectating?: boolean;
  status: 'WAITING' | 'PLAYING';
  playerCount: number;
  createdAt: number;
  updatedAt: number;
}
