import { GameState, CustomDeckConfig } from './tcg';
import type { GameEvent } from '../engine/events';

/** 대전 복구용 저장 키. 저장(multiplayerService)과 새로고침 복구(App)가 반드시 같은 값을 써야 한다
 *  (2026-11-12: App만 '_v1'을 읽어 새로고침하면 복구 대신 새 AI 게임이 시작되던 버그) */
export const MULTIPLAYER_SESSION_STORAGE_KEY = 'wuthering_multiplayer_session';

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
  | 'FINISH_EFFECT_DRAW'
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
      type: 'ROOM_CLOSED';
      reason?: string;
    }
  | {
      type: 'LOBBY_LEAVE';
      reason?: string;
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
      /** [WP8 버그 수정] 호스트 엔진이 낸 연출 이벤트(레벨업·효과 알림). 상태 비교로는 알 수 없어 함께 보냄. 구버전은 무시 */
      fxEvents?: GameEvent[];
      /** 있으면 gameState.logs는 이 id 앞의 새 로그만 담는다. 받는 쪽이 가진 로그에 이어 붙인다 (2026-11-12) */
      logsAnchorId?: string;
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
    }
  | {
      type: 'SPECTATOR_JOIN';
      spectatorName: string;
      spectatorSessionId: string;
    }
  | {
      type: 'SPECTATOR_INIT';
      gameState: GameState;
      hostProfile: MultiplayerPlayerProfile;
      guestProfile: MultiplayerPlayerProfile;
      timeLimitConfig?: TimeLimitConfig;
      p0TotalTime?: number;
      p1TotalTime?: number;
      currentTurnTime?: number;
    }
  | {
      type: 'SPECTATOR_REJECT';
      reason: string;
    }
  | {
      type: 'SPECTATOR_LEAVE';
      spectatorSessionId: string;
    }
  | {
      type: 'SPECTATOR_COUNT';
      count: number;
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
