import { GameState, CustomDeckConfig } from './tcg';

export type MultiplayerRole = 'HOST' | 'GUEST';

export type MultiplayerConnectionStatus =
  | 'IDLE'
  | 'INITIALIZING'
  | 'WAITING_FOR_GUEST'
  | 'CONNECTING_TO_HOST'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'ERROR';

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
  | 'INITIATIVE_ROLL';

export type MultiplayerMessage =
  | {
      type: 'LOBBY_JOIN';
      profile: MultiplayerPlayerProfile;
    }
  | {
      type: 'LOBBY_ACCEPT';
      hostProfile: MultiplayerPlayerProfile;
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
