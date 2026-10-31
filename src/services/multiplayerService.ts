import { Peer, DataConnection } from 'peerjs';
import {
  MultiplayerRole,
  MultiplayerConnectionStatus,
  MultiplayerMessage,
  MultiplayerPlayerProfile,
  MultiplayerSessionData,
  MultiplayerActionType,
  TimeLimitConfig,
} from '../types/multiplayer';
import { GameState } from '../types/tcg';

const SESSION_STORAGE_KEY = 'wuthering_multiplayer_session';
const PEER_ID_PREFIX = 'wuthering-tcg-room';
const HEARTBEAT_INTERVAL_MS = 3000;
const HEARTBEAT_TIMEOUT_MS = 8000;
export const DISCONNECT_TIMEOUT_SEC = 60;

// 혼동을 줄 수 있는 문자(0, O, 1, I, l)를 제외한 6자리 난수 방 코드 생성 문자셋
const ROOM_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARSET[Math.floor(Math.random() * ROOM_CODE_CHARSET.length)];
  }
  return code;
}

export function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

class MultiplayerService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  public spectatorConnections: Map<string, DataConnection> = new Map();
  public spectatorCount: number = 0;

  public role: MultiplayerRole = 'HOST';
  public roomCode: string = '';
  public sessionId: string = '';
  public status: MultiplayerConnectionStatus = 'IDLE';
  public pingMs: number = 0;

  public myProfile: MultiplayerPlayerProfile | null = null;
  public opponentProfile: MultiplayerPlayerProfile | null = null;
  public latestGameState: GameState | null = null;

  public timeLimitConfig: TimeLimitConfig = {
    hasTimeLimit: true,
    totalTimeSec: 300,
    turnTimeSec: 90,
    clashTimeSec: 30,
  };
  public allowSpectating: boolean = true;
  public p0TotalTime: number = 300;
  public p1TotalTime: number = 300;
  public currentTurnTime: number = 90;

  private messageHandlers: Set<(msg: MultiplayerMessage) => void> = new Set();
  private statusHandlers: Set<(status: MultiplayerConnectionStatus) => void> = new Set();

  private heartbeatTimer: number | null = null;
  private lastPingSentTime: number = 0;
  private lastPongReceivedTime: number = 0;

  // 상대방 접속 끊김 카운트다운 타이머
  public disconnectCountdown: number = DISCONNECT_TIMEOUT_SEC;
  private disconnectTimer: number | null = null;
  public isReconnecting: boolean = false;

  constructor() {
    this.sessionId = this.getOrInitSessionId();
    if (typeof window !== 'undefined') {
      const handleUnload = () => {
        if (this.peer) {
          try {
            this.peer.destroy();
          } catch {}
        }
      };
      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);
    }
  }

  private getOrInitSessionId(): string {
    try {
      let id = localStorage.getItem('wuthering_player_session_id');
      if (!id) {
        id = generateSessionId();
        localStorage.setItem('wuthering_player_session_id', id);
      }
      return id;
    } catch {
      return generateSessionId();
    }
  }

  public getSavedSession(): MultiplayerSessionData | null {
    try {
      const data = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!data) return null;
      const parsed: MultiplayerSessionData = JSON.parse(data);
      // 세션 유효 기간: 15분
      if (Date.now() - parsed.timestamp > 15 * 60 * 1000) {
        this.clearSavedSession();
        return null;
      }
      if (parsed.timeLimitConfig) {
        this.timeLimitConfig = parsed.timeLimitConfig;
      }
      if (parsed.allowSpectating !== undefined) {
        this.allowSpectating = parsed.allowSpectating;
      }
      if (parsed.p0TotalTime !== undefined) this.p0TotalTime = parsed.p0TotalTime;
      if (parsed.p1TotalTime !== undefined) this.p1TotalTime = parsed.p1TotalTime;
      if (parsed.currentTurnTime !== undefined) this.currentTurnTime = parsed.currentTurnTime;
      return parsed;
    } catch {
      return null;
    }
  }

  public saveSession(lastGameState?: GameState | null) {
    if (!this.roomCode || !this.myProfile) return;
    try {
      if (lastGameState) {
        this.latestGameState = lastGameState;
      }
      let existing: MultiplayerSessionData | null = null;
      try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) existing = JSON.parse(raw);
      } catch {}

      const sessionData: MultiplayerSessionData = {
        role: this.role,
        roomCode: this.roomCode,
        sessionId: this.sessionId,
        playerName: this.myProfile.name,
        myProfile: this.myProfile,
        opponentProfile: this.opponentProfile || existing?.opponentProfile || undefined,
        lastGameState: lastGameState || this.latestGameState || existing?.lastGameState || undefined,
        timeLimitConfig: this.timeLimitConfig || existing?.timeLimitConfig,
        allowSpectating: this.allowSpectating !== undefined ? this.allowSpectating : existing?.allowSpectating,
        p0TotalTime: this.p0TotalTime,
        p1TotalTime: this.p1TotalTime,
        currentTurnTime: this.currentTurnTime,
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.warn('[Multiplayer] Failed to save session:', e);
    }
  }

  public clearSavedSession() {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    this.latestGameState = null;
  }

  public clearSession() {
    this.clearSavedSession();
  }

  public onDisconnectCountdown(callback: (seconds: number) => void): () => void {
    const handler = (msg: MultiplayerMessage) => {
      if (msg.type === 'DISCONNECT_WARNING') {
        callback(msg.countdownSec);
      } else if (msg.type === 'DISCONNECT_RESOLVED') {
        callback(0);
      }
    };
    return this.onMessage(handler);
  }

  private setStatus(status: MultiplayerConnectionStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusHandlers.forEach((handler) => {
      try {
        handler(status);
      } catch (err) {
        console.error('[Multiplayer] Status handler error:', err);
      }
    });
  }

  public onStatusChange(handler: (status: MultiplayerConnectionStatus) => void): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  public onMessage(handler: (msg: MultiplayerMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private emitMessage(msg: MultiplayerMessage) {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(msg);
      } catch (err) {
        console.error('[Multiplayer] Message handler error:', err);
      }
    });
  }

  // --------------------------------------------------------------------------
  // 1. 방 만들기 (Host)
  // --------------------------------------------------------------------------
  public async createRoom(
    roomCode: string,
    profile: MultiplayerPlayerProfile
  ): Promise<string> {
    this.cleanUp();
    this.role = 'HOST';
    this.roomCode = roomCode.toUpperCase().trim();
    this.myProfile = profile;
    this.opponentProfile = null;
    this.setStatus('INITIALIZING');

    const hostPeerId = `${PEER_ID_PREFIX}-${this.roomCode}-host`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(hostPeerId, {
          debug: 1,
        });

        this.peer.on('open', () => {
          this.setStatus('WAITING_FOR_GUEST');
          this.saveSession();
          resolve(this.roomCode);
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err: any) => {
          console.error('[Multiplayer] Host Peer error:', err);
          if (err.type === 'unavailable-id') {
            // 이미 열려있는 방 코드인 경우
            this.setStatus('ERROR');
            reject(new Error('이미 존재하는 방 코드입니다. 다른 코드로 시도해 주세요.'));
          } else {
            this.setStatus('ERROR');
            reject(err);
          }
        });
      } catch (err) {
        this.setStatus('ERROR');
        reject(err);
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. 방 참가하기 (Guest)
  // --------------------------------------------------------------------------
  public async joinRoom(
    roomCode: string,
    profile: MultiplayerPlayerProfile
  ): Promise<void> {
    this.cleanUp();
    this.role = 'GUEST';
    this.roomCode = roomCode.toUpperCase().trim();
    this.myProfile = profile;
    this.setStatus('CONNECTING_TO_HOST');

    const guestPeerId = `${PEER_ID_PREFIX}-${this.roomCode}-guest-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const hostPeerId = `${PEER_ID_PREFIX}-${this.roomCode}-host`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(guestPeerId, {
          debug: 1,
        });

        const connectTimeout = setTimeout(() => {
          this.setStatus('ERROR');
          reject(new Error('방장(호스트)을 찾을 수 없거나 응답이 없습니다. 방 코드를 확인해 주세요.'));
        }, 12000);

        this.peer.on('open', () => {
          const conn = this.peer!.connect(hostPeerId, {
            reliable: true,
          });

          this.setupConnectionListeners(conn, () => {
            clearTimeout(connectTimeout);
            // 호스트에 로비 참가 메시지 전송
            this.send({
              type: 'LOBBY_JOIN',
              profile: this.myProfile!,
            });
            this.saveSession();
            resolve();
          });
        });

        this.peer.on('error', (err) => {
          clearTimeout(connectTimeout);
          console.error('[Multiplayer] Guest Peer error:', err);
          this.setStatus('ERROR');
          reject(err);
        });
      } catch (err) {
        this.setStatus('ERROR');
        reject(err);
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2-B. 배틀 실시간 관전하기 (Spectator)
  // --------------------------------------------------------------------------
  public async spectateRoom(
    roomCode: string,
    spectatorName: string
  ): Promise<MultiplayerSessionData> {
    this.cleanUp();
    this.role = 'SPECTATOR';
    this.roomCode = roomCode.toUpperCase().trim();
    this.myProfile = {
      name: spectatorName.trim() || '관전자',
      sessionId: this.sessionId,
      customDeck: null,
    };
    this.setStatus('CONNECTING_TO_HOST');

    const spectatorPeerId = `${PEER_ID_PREFIX}-${this.roomCode}-spectator-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const hostPeerId = `${PEER_ID_PREFIX}-${this.roomCode}-host`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(spectatorPeerId, {
          debug: 1,
        });

        const connectTimeout = setTimeout(() => {
          this.setStatus('ERROR');
          reject(new Error('방장(호스트)을 찾을 수 없거나 응답이 없습니다. 배틀이 종료되었는지 확인해 주세요.'));
        }, 12000);

        this.peer.on('open', () => {
          const conn = this.peer!.connect(hostPeerId, {
            reliable: true,
          });

          this.connection = conn;

          conn.on('open', () => {
            this.setStatus('CONNECTED');
            // 호스트에 관전 참여 메시지 전송
            try {
              conn.send({
                type: 'SPECTATOR_JOIN',
                spectatorName: this.myProfile!.name,
                spectatorSessionId: this.sessionId,
              });
            } catch (e) {
              console.warn('[Multiplayer] Failed to send SPECTATOR_JOIN:', e);
            }
          });

          conn.on('data', (data) => {
            const msg = data as MultiplayerMessage;
            if (!msg || !msg.type) return;

            if (msg.type === 'SPECTATOR_REJECT') {
              clearTimeout(connectTimeout);
              this.cleanUp();
              reject(new Error(msg.reason || '관전이 비허용(비공개)된 방입니다.'));
              return;
            }

            if (msg.type === 'SPECTATOR_INIT') {
              clearTimeout(connectTimeout);
              this.latestGameState = msg.gameState;
              this.opponentProfile = msg.guestProfile;
              if (msg.timeLimitConfig) this.timeLimitConfig = msg.timeLimitConfig;
              if (msg.p0TotalTime !== undefined) this.p0TotalTime = msg.p0TotalTime;
              if (msg.p1TotalTime !== undefined) this.p1TotalTime = msg.p1TotalTime;
              if (msg.currentTurnTime !== undefined) this.currentTurnTime = msg.currentTurnTime;

              const sessionData: MultiplayerSessionData = {
                role: 'SPECTATOR',
                roomCode: this.roomCode,
                sessionId: this.sessionId,
                playerName: this.myProfile!.name,
                myProfile: msg.hostProfile,
                opponentProfile: msg.guestProfile,
                lastGameState: msg.gameState,
                timeLimitConfig: msg.timeLimitConfig,
                p0TotalTime: msg.p0TotalTime,
                p1TotalTime: msg.p1TotalTime,
                currentTurnTime: msg.currentTurnTime,
                timestamp: Date.now(),
              };

              this.saveSession(msg.gameState);
              this.emitMessage(msg);
              resolve(sessionData);
              return;
            }

            this.handleReceivedData(msg);
          });

          conn.on('close', () => {
            clearTimeout(connectTimeout);
            console.warn('[Multiplayer] Spectator connection closed');
            this.setStatus('DISCONNECTED');
          });

          conn.on('error', (err) => {
            clearTimeout(connectTimeout);
            console.error('[Multiplayer] Spectator connection error:', err);
            this.setStatus('ERROR');
            reject(err);
          });
        });

        this.peer.on('error', (err) => {
          clearTimeout(connectTimeout);
          console.error('[Multiplayer] Spectator Peer error:', err);
          this.setStatus('ERROR');
          reject(err);
        });
      } catch (err) {
        this.setStatus('ERROR');
        reject(err);
      }
    });
  }

  public resetPeerOnly() {
    this.stopHeartbeat();
    if (this.connection) {
      try {
        this.connection.close();
      } catch {}
      this.connection = null;
    }
    this.spectatorConnections.forEach((conn) => {
      try { conn.close(); } catch {}
    });
    this.spectatorConnections.clear();
    this.spectatorCount = 0;
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
  }

  // --------------------------------------------------------------------------
  // 3. 재접속 복구 로직 (Reconnection)
  // --------------------------------------------------------------------------
  public async attemptReconnect(): Promise<boolean> {
    if (this.isReconnecting) {
      return false;
    }
    const saved = this.getSavedSession();
    if (!saved) return false;

    this.isReconnecting = true;
    this.resetPeerOnly();
    this.role = saved.role;
    this.roomCode = saved.roomCode;
    this.myProfile = saved.myProfile;
    this.opponentProfile = saved.opponentProfile || null;
    this.setStatus('RECONNECTING');

    if (this.role === 'HOST') {
      const hostPeerId = `${PEER_ID_PREFIX}-${this.roomCode}-host`;
      return new Promise((resolve) => {
        let settled = false;
        const finish = (result: boolean) => {
          if (settled) return;
          settled = true;
          this.isReconnecting = false;
          resolve(result);
        };

        const tryCreateHost = (retryCount = 0) => {
          try {
            if (this.peer) {
              try { this.peer.destroy(); } catch {}
            }
            this.peer = new Peer(hostPeerId, { debug: 1 });
            this.peer.on('open', () => {
              this.setStatus('WAITING_FOR_GUEST');
              finish(true);
            });
            this.peer.on('connection', (conn) => {
              this.handleIncomingConnection(conn);
            });
            this.peer.on('error', (err: any) => {
              console.warn('[Multiplayer] Host reconnect peer error:', err);
              if (err?.type === 'unavailable-id' && retryCount < 15) {
                console.log(`[Multiplayer] Retrying host peer in 1.5s (attempt ${retryCount + 1}/15)...`);
                setTimeout(() => tryCreateHost(retryCount + 1), 1500);
              } else {
                this.setStatus('DISCONNECTED');
                finish(false);
              }
            });
          } catch {
            this.setStatus('DISCONNECTED');
            finish(false);
          }
        };
        tryCreateHost();
      });
    } else {
      const guestPeerId = `${PEER_ID_PREFIX}-${this.roomCode}-guest-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const hostPeerId = `${PEER_ID_PREFIX}-${this.roomCode}-host`;
      return new Promise((resolve) => {
        let settled = false;
        const timeoutId = setTimeout(() => {
          console.warn('[Multiplayer] Guest reconnect attempt timed out (8s)');
          this.setStatus('DISCONNECTED');
          finish(false);
        }, 8000);

        const finish = (result: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          this.isReconnecting = false;
          resolve(result);
        };

        try {
          this.peer = new Peer(guestPeerId, { debug: 1 });
          this.peer.on('open', () => {
            const conn = this.peer!.connect(hostPeerId, { reliable: true });
            this.setupConnectionListeners(conn, () => {
              this.send({
                type: 'RECONNECT_REQUEST',
                sessionId: this.sessionId,
                role: 'GUEST',
                playerName: this.myProfile?.name || '도전자',
              });
              this.emitMessage({ type: 'DISCONNECT_RESOLVED' });
              finish(true);
            });
          });
          this.peer.on('error', (err) => {
            console.warn('[Multiplayer] Guest reconnect peer error:', err);
            this.setStatus('DISCONNECTED');
            finish(false);
          });
        } catch {
          this.setStatus('DISCONNECTED');
          finish(false);
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // 공통 연결 및 데이터 처리
  // --------------------------------------------------------------------------
  private handleIncomingConnection(conn: DataConnection) {
    const isSpectatorConn = conn.peer?.includes('-spectator-');
    if (isSpectatorConn) {
      this.setupSpectatorConnection(conn);
      return;
    }

    // 이미 다른 게스트와 연결되어 있는 경우 (단, 재접속 요청은 허용)
    if (this.connection && this.connection.open && this.connection.peer !== conn.peer) {
      const tempListener = (data: any) => {
        const msg = data as MultiplayerMessage;
        if (msg?.type === 'RECONNECT_REQUEST') {
          console.log('[Multiplayer] Authorized guest reconnection accepted');
          try { this.connection?.close(); } catch {}
          this.setupConnectionListeners(conn);
        } else {
          console.warn('[Multiplayer] Rejected duplicate guest connection while battle in progress');
          try {
            conn.send({
              type: 'DISCONNECT_WARNING',
              reason: '이미 다른 도전자와 대결이 진행 중인 방입니다.',
              countdownSec: 0,
            });
            setTimeout(() => { try { conn.close(); } catch {} }, 500);
          } catch {}
        }
      };
      conn.once('data', tempListener);
      return;
    }

    this.setupConnectionListeners(conn);
  }

  private setupSpectatorConnection(conn: DataConnection) {
    conn.on('open', () => {
      if (!this.allowSpectating) {
        try {
          conn.send({
            type: 'SPECTATOR_REJECT',
            reason: '현재 방은 관전이 비허용(비공개)되어 있습니다.',
          });
          setTimeout(() => { try { conn.close(); } catch {} }, 500);
        } catch {}
        return;
      }

      this.spectatorConnections.set(conn.peer, conn);
      this.spectatorCount = this.spectatorConnections.size;
      this.emitSpectatorCount();

      // 현재 진행 중인 게임판 상태가 있다면 즉시 전송
      const saved = this.getSavedSession();
      const stateToSend = this.latestGameState || saved?.lastGameState;
      if (stateToSend && this.myProfile) {
        try {
          conn.send({
            type: 'SPECTATOR_INIT',
            gameState: stateToSend,
            hostProfile: this.myProfile,
            guestProfile: this.opponentProfile || {
              name: '도전자',
              sessionId: 'unknown',
              customDeck: null,
            },
            timeLimitConfig: this.timeLimitConfig,
            p0TotalTime: this.p0TotalTime,
            p1TotalTime: this.p1TotalTime,
            currentTurnTime: this.currentTurnTime,
          });
        } catch (e) {
          console.warn('[Multiplayer] Failed to send SPECTATOR_INIT on open:', e);
        }
      }
    });

    conn.on('data', (data) => {
      const msg = data as MultiplayerMessage;
      if (!msg || !msg.type) return;

      if (msg.type === 'PING') {
        try { conn.send({ type: 'PONG', clientTimestamp: msg.timestamp }); } catch {}
        return;
      }

      if (msg.type === 'SPECTATOR_JOIN') {
        if (!this.allowSpectating) {
          try {
            conn.send({
              type: 'SPECTATOR_REJECT',
              reason: '현재 방은 관전이 비허용(비공개)되어 있습니다.',
            });
            setTimeout(() => { try { conn.close(); } catch {} }, 500);
          } catch {}
          return;
        }

        const saved = this.getSavedSession();
        const stateToSend = this.latestGameState || saved?.lastGameState;
        if (stateToSend && this.myProfile) {
          try {
            conn.send({
              type: 'SPECTATOR_INIT',
              gameState: stateToSend,
              hostProfile: this.myProfile,
              guestProfile: this.opponentProfile || {
                name: '도전자',
                sessionId: 'unknown',
                customDeck: null,
              },
              timeLimitConfig: this.timeLimitConfig,
              p0TotalTime: this.p0TotalTime,
              p1TotalTime: this.p1TotalTime,
              currentTurnTime: this.currentTurnTime,
            });
          } catch (e) {
            console.warn('[Multiplayer] Failed to send SPECTATOR_INIT on SPECTATOR_JOIN:', e);
          }
        }
      }
    });

    conn.on('close', () => {
      this.spectatorConnections.delete(conn.peer);
      this.spectatorCount = this.spectatorConnections.size;
      this.emitSpectatorCount();
    });

    conn.on('error', (err) => {
      console.warn('[Multiplayer] Spectator connection error:', err);
      this.spectatorConnections.delete(conn.peer);
      this.spectatorCount = this.spectatorConnections.size;
      this.emitSpectatorCount();
    });
  }

  public broadcastToSpectators(msg: MultiplayerMessage) {
    if (this.spectatorConnections.size === 0) return;
    const deadPeers: string[] = [];
    this.spectatorConnections.forEach((conn, peerId) => {
      if (conn && conn.open) {
        try {
          conn.send(msg);
        } catch {
          deadPeers.push(peerId);
        }
      } else {
        deadPeers.push(peerId);
      }
    });
    if (deadPeers.length > 0) {
      deadPeers.forEach((p) => this.spectatorConnections.delete(p));
      this.spectatorCount = this.spectatorConnections.size;
    }
  }

  private emitSpectatorCount() {
    const msg: MultiplayerMessage = {
      type: 'SPECTATOR_COUNT',
      count: this.spectatorCount,
    };
    this.emitMessage(msg);
    if (this.role === 'HOST') {
      this.send(msg);
      this.broadcastToSpectators(msg);
    }
  }

  private setupConnectionListeners(conn: DataConnection, onReady?: () => void) {
    this.connection = conn;

    conn.on('open', () => {
      this.setStatus('CONNECTED');
      this.stopDisconnectTimer();
      this.startHeartbeat();
      this.emitMessage({ type: 'DISCONNECT_RESOLVED' });
      if (onReady) onReady();
    });

    conn.on('data', (data) => {
      this.handleReceivedData(data as MultiplayerMessage);
    });

    conn.on('close', () => {
      console.warn('[Multiplayer] Connection closed');
      this.handleConnectionLost('상대방과의 연결이 끊어졌습니다.');
    });

    conn.on('error', (err) => {
      console.error('[Multiplayer] Connection error:', err);
      this.handleConnectionLost('네트워크 오류가 발생했습니다.');
    });
  }

  private handleReceivedData(msg: MultiplayerMessage) {
    if (!msg || !msg.type) return;

    // 상대방으로부터 수신된 모든 유효 데이터 패킷은 연결 생존 증명으로 간주하여 하트비트 타이머 갱신
    this.lastPongReceivedTime = Date.now();

    // Heartbeat 처리
    if (msg.type === 'PING') {
      this.send({ type: 'PONG', clientTimestamp: msg.timestamp });
      return;
    }
    if (msg.type === 'PONG') {
      this.pingMs = Math.max(0, Date.now() - msg.clientTimestamp);
      this.emitMessage(msg);
      return;
    }

    // 로비 참가 및 수락
    if (msg.type === 'LOBBY_JOIN') {
      this.opponentProfile = msg.profile;
      this.saveSession();
      // 호스트 프로필 및 설정 전송
      this.send({
        type: 'LOBBY_ACCEPT',
        hostProfile: this.myProfile!,
        timeLimitConfig: this.timeLimitConfig,
        allowSpectating: this.allowSpectating,
      });
    } else if (msg.type === 'LOBBY_ACCEPT') {
      this.opponentProfile = msg.hostProfile;
      if (msg.timeLimitConfig) {
        this.timeLimitConfig = msg.timeLimitConfig;
      }
      if (msg.allowSpectating !== undefined) {
        this.allowSpectating = msg.allowSpectating;
      }
      this.saveSession();
    } else if (msg.type === 'ROOM_CONFIG_UPDATE') {
      if (msg.timeLimitConfig) {
        this.timeLimitConfig = msg.timeLimitConfig;
      }
      if (msg.allowSpectating !== undefined) {
        this.allowSpectating = msg.allowSpectating;
      }
    } else if (msg.type === 'GAME_START') {
      if (msg.timeLimitConfig) {
        this.timeLimitConfig = msg.timeLimitConfig;
      }
    } else if (msg.type === 'TIME_SYNC') {
      this.p0TotalTime = msg.p0TotalTime;
      this.p1TotalTime = msg.p1TotalTime;
      this.currentTurnTime = msg.currentTurnTime;
    }

    // 재접속 핸드셰이크
    if (msg.type === 'RECONNECT_REQUEST' && this.role === 'HOST') {
      this.stopDisconnectTimer();
      this.setStatus('CONNECTED');
      this.emitMessage({ type: 'DISCONNECT_RESOLVED' });
      const saved = this.getSavedSession();
      const stateToSend = this.latestGameState || saved?.lastGameState;
      if (stateToSend) {
        this.send({
          type: 'RECONNECT_ACCEPT',
          gameState: stateToSend,
          hostProfile: this.myProfile!,
          guestProfile: this.opponentProfile || {
            name: msg.playerName,
            sessionId: msg.sessionId,
            customDeck: null,
          },
          timeLimitConfig: this.timeLimitConfig,
          p0TotalTime: this.p0TotalTime,
          p1TotalTime: this.p1TotalTime,
          currentTurnTime: this.currentTurnTime,
        });
      }
    } else if (msg.type === 'RECONNECT_ACCEPT') {
      this.stopDisconnectTimer();
      this.setStatus('CONNECTED');
      this.emitMessage({ type: 'DISCONNECT_RESOLVED' });
      this.opponentProfile = msg.hostProfile;
      if (msg.timeLimitConfig) {
        this.timeLimitConfig = msg.timeLimitConfig;
      }
      if (msg.p0TotalTime !== undefined) this.p0TotalTime = msg.p0TotalTime;
      if (msg.p1TotalTime !== undefined) this.p1TotalTime = msg.p1TotalTime;
      if (msg.currentTurnTime !== undefined) this.currentTurnTime = msg.currentTurnTime;
      this.saveSession(msg.gameState);
    }

    this.emitMessage(msg);
  }

  // --------------------------------------------------------------------------
  // 메시지 송신 유틸
  // --------------------------------------------------------------------------
  public send(msg: MultiplayerMessage): boolean {
    if (this.role === 'HOST') {
      if (
        msg.type === 'TIME_SYNC' ||
        msg.type === 'TIME_OUT' ||
        msg.type === 'SURRENDER' ||
        msg.type === 'DISPATCH_ACTION' ||
        msg.type === 'ROOM_CONFIG_UPDATE'
      ) {
        this.broadcastToSpectators(msg);
      }
    }
    if (!this.connection || !this.connection.open) {
      console.warn('[Multiplayer] Cannot send, connection not open:', msg.type);
      return false;
    }
    try {
      this.connection.send(msg);
      return true;
    } catch (err) {
      console.error('[Multiplayer] Failed to send message:', err);
      return false;
    }
  }

  public sendAction(actionType: MultiplayerActionType, playerIndex: 0 | 1, payload: any = {}) {
    this.send({
      type: 'DISPATCH_ACTION',
      actionType,
      playerIndex,
      payload,
    });
  }

  public sendGameState(gameState: GameState, actionDesc?: string) {
    this.latestGameState = gameState;
    this.saveSession(gameState);
    const msg: MultiplayerMessage = {
      type: 'SYNC_GAME_STATE',
      gameState,
      actionDesc,
    };
    this.send(msg);
    this.broadcastToSpectators(msg);
  }

  public sendSurrender(playerIndex: 0 | 1) {
    this.send({
      type: 'SURRENDER',
      playerIndex,
    });
  }

  public sendEmote(playerIndex: 0 | 1, emote: string) {
    this.send({
      type: 'EMOTE',
      playerIndex,
      emote,
    });
  }

  // --------------------------------------------------------------------------
  // 헬스체크 및 연결 끊김 카운트다운 (Heartbeat & Disconnection Guard)
  // --------------------------------------------------------------------------
  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastPongReceivedTime = Date.now();
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.connection || !this.connection.open) return;
      this.lastPingSentTime = Date.now();
      this.send({ type: 'PING', timestamp: this.lastPingSentTime });

      // 8초 이상 PONG 응답이 없으면 연결 단절로 간주
      if (Date.now() - this.lastPongReceivedTime > HEARTBEAT_TIMEOUT_MS) {
        console.warn('[Multiplayer] Heartbeat timeout!');
        this.handleConnectionLost('상대방과의 통신 응답이 지연되고 있습니다.');
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleConnectionLost(reason: string) {
    if (this.status === 'DISCONNECTED') return;
    this.stopHeartbeat();
    this.setStatus('DISCONNECTED');
    this.startDisconnectTimer(reason);
  }

  private startDisconnectTimer(reason: string) {
    this.stopDisconnectTimer();
    this.disconnectCountdown = DISCONNECT_TIMEOUT_SEC;
    this.emitMessage({
      type: 'DISCONNECT_WARNING',
      reason,
      countdownSec: this.disconnectCountdown,
    });

    this.disconnectTimer = window.setInterval(() => {
      this.disconnectCountdown -= 1;
      this.emitMessage({
        type: 'DISCONNECT_WARNING',
        reason,
        countdownSec: this.disconnectCountdown,
      });

      if (this.disconnectCountdown <= 0) {
        this.stopDisconnectTimer();
        // 60초 초과 시 자동 몰수패/몰수승 처리 안내
      }
    }, 1000);
  }

  private stopDisconnectTimer() {
    if (this.disconnectTimer !== null) {
      clearInterval(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    this.disconnectCountdown = DISCONNECT_TIMEOUT_SEC;
  }

  public cleanUp() {
    this.stopHeartbeat();
    this.stopDisconnectTimer();
    this.spectatorConnections.forEach((conn) => {
      try { conn.close(); } catch {}
    });
    this.spectatorConnections.clear();
    this.spectatorCount = 0;
    if (this.connection) {
      try {
        this.connection.close();
      } catch {}
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    this.status = 'IDLE';
    this.pingMs = 0;
  }

  public leaveRoom() {
    this.cleanUp();
    this.clearSavedSession();
    this.myProfile = null;
    this.opponentProfile = null;
    this.setStatus('IDLE');
  }
}

export const multiplayerService = new MultiplayerService();

