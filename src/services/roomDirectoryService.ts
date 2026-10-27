import { MultiplayerRoomInfo } from '../types/multiplayer';

class RoomDirectoryService {
  private heartbeatIntervalId: number | null = null;
  private currentRoomCode: string | null = null;

  public async fetchRooms(): Promise<MultiplayerRoomInfo[]> {
    try {
      const res = await fetch(`/api/rooms?t=${Date.now()}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.rooms)) {
          return data.rooms;
        }
      }
      return [];
    } catch (err) {
      console.warn('[RoomDirectory] Failed to fetch rooms:', err);
      return [];
    }
  }

  public async registerRoom(info: {
    roomCode: string;
    hostName: string;
    hostLeader?: string;
    hostLeaderArt?: string;
    deckName?: string;
  }): Promise<void> {
    this.currentRoomCode = info.roomCode;
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...info,
        }),
      });
    } catch (err) {
      console.warn('[RoomDirectory] Failed to register room:', err);
    }

    // 하트비트 시작 (7초마다 갱신)
    this.startHeartbeat(info);
  }

  public startHeartbeat(info: {
    roomCode: string;
    hostName: string;
    hostLeader?: string;
    hostLeaderArt?: string;
    deckName?: string;
  }) {
    this.stopHeartbeat();
    this.currentRoomCode = info.roomCode;
    this.heartbeatIntervalId = window.setInterval(async () => {
      try {
        await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'heartbeat',
            ...info,
          }),
        });
      } catch {}
    }, 7000);
  }

  public stopHeartbeat() {
    if (this.heartbeatIntervalId !== null) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  public async updateRoomToPlaying(roomCode: string): Promise<void> {
    this.stopHeartbeat();
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          roomCode,
        }),
      });
    } catch {}
  }

  public async closeRoom(roomCode?: string): Promise<void> {
    const code = roomCode || this.currentRoomCode;
    this.stopHeartbeat();
    this.currentRoomCode = null;
    if (!code) return;

    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          roomCode: code,
        }),
      });
    } catch {}
  }
}

export const roomDirectoryService = new RoomDirectoryService();
