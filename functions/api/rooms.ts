// functions/api/rooms.ts
// 멀티플레이어 공개 대전 방 리스트 및 실시간 하트비트 동기화 API (Cloudflare Pages Function & D1)

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface Env {
  DB?: D1Database;
}

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
  status: 'WAITING' | 'PLAYING';
  playerCount: number;
  createdAt: number;
  updatedAt: number;
}

const ROOM_TTL_MS = 30000; // 30초 이상 하트비트가 없으면 자동 제거
const D1_ROOMS_TYPE_KEY = 'multiplayer_rooms';

// 메모리 백업 (D1 미바인딩 또는 로컬 환경용)
let inMemoryRooms: MultiplayerRoomInfo[] = [];

function cleanStaleRooms(rooms: MultiplayerRoomInfo[], now: number): MultiplayerRoomInfo[] {
  return rooms.filter((r) => now - r.updatedAt <= ROOM_TTL_MS && r.status !== 'CLOSED' as any);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const now = Date.now();

  try {
    // -------------------------------------------------------------
    // 1. GET: 활성화된 공개 방 목록 조회
    // -------------------------------------------------------------
    if (request.method === 'GET') {
      let activeRooms: MultiplayerRoomInfo[] = [];

      if (env.DB) {
        try {
          const row = await env.DB.prepare('SELECT data FROM community_data WHERE type = ?')
            .bind(D1_ROOMS_TYPE_KEY)
            .first<{ data: string }>();

          if (row?.data) {
            const parsed = JSON.parse(row.data);
            if (Array.isArray(parsed)) {
              activeRooms = cleanStaleRooms(parsed, now);
            }
          }
        } catch (d1Err) {
          console.warn('[Rooms D1 GET Error]:', d1Err);
          activeRooms = cleanStaleRooms(inMemoryRooms, now);
        }
      } else {
        activeRooms = cleanStaleRooms(inMemoryRooms, now);
      }

      // 최신 생성순 정렬
      activeRooms.sort((a, b) => b.createdAt - a.createdAt);

      return new Response(JSON.stringify({ rooms: activeRooms }), { headers });
    }

    // -------------------------------------------------------------
    // 2. POST: 방 생성, 하트비트 갱신, 배틀 시작, 방 종료
    // -------------------------------------------------------------
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as {
        action: 'create' | 'heartbeat' | 'start' | 'close';
        roomCode?: string;
        hostName?: string;
        hostLeader?: string;
        hostLeaderArt?: string;
        deckName?: string;
        hasTimeLimit?: boolean;
        totalTimeSec?: number;
        turnTimeSec?: number;
        clashTimeSec?: number;
      };

      const { action, roomCode } = body;
      if (!roomCode || typeof roomCode !== 'string') {
        return new Response(JSON.stringify({ error: 'roomCode is required' }), {
          status: 400,
          headers,
        });
      }

      const upperCode = roomCode.toUpperCase().trim();
      let currentRooms: MultiplayerRoomInfo[] = [];

      // D1에서 기존 목록 조회
      if (env.DB) {
        try {
          const row = await env.DB.prepare('SELECT data FROM community_data WHERE type = ?')
            .bind(D1_ROOMS_TYPE_KEY)
            .first<{ data: string }>();
          if (row?.data) {
            const parsed = JSON.parse(row.data);
            if (Array.isArray(parsed)) {
              currentRooms = cleanStaleRooms(parsed, now);
            }
          }
        } catch (d1ReadErr) {
          console.warn('[Rooms D1 Read on POST Error]:', d1ReadErr);
          currentRooms = cleanStaleRooms(inMemoryRooms, now);
        }
      } else {
        currentRooms = cleanStaleRooms(inMemoryRooms, now);
      }

      // 액션에 따른 방 목록 갱신
      if (action === 'create') {
        // 기존 동일 코드 방이 있으면 제거 후 신규 등록
        currentRooms = currentRooms.filter((r) => r.roomCode !== upperCode);
        currentRooms.unshift({
          roomCode: upperCode,
          hostName: body.hostName || '방랑자',
          hostLeader: body.hostLeader,
          hostLeaderArt: body.hostLeaderArt,
          deckName: body.deckName,
          hasTimeLimit: body.hasTimeLimit !== false,
          totalTimeSec: body.totalTimeSec ?? 300,
          turnTimeSec: body.turnTimeSec ?? 90,
          clashTimeSec: body.clashTimeSec ?? 30,
          status: 'WAITING',
          playerCount: 1,
          createdAt: now,
          updatedAt: now,
        });
      } else if (action === 'heartbeat') {
        const target = currentRooms.find((r) => r.roomCode === upperCode);
        if (target) {
          target.updatedAt = now;
          if (body.hasTimeLimit !== undefined) target.hasTimeLimit = body.hasTimeLimit;
          if (body.totalTimeSec !== undefined) target.totalTimeSec = body.totalTimeSec;
          if (body.turnTimeSec !== undefined) target.turnTimeSec = body.turnTimeSec;
          if (body.clashTimeSec !== undefined) target.clashTimeSec = body.clashTimeSec;
        } else {
          // 혹시 만료되었거나 누락된 방 복구
          currentRooms.unshift({
            roomCode: upperCode,
            hostName: body.hostName || '방랑자',
            hostLeader: body.hostLeader,
            hostLeaderArt: body.hostLeaderArt,
            deckName: body.deckName,
            hasTimeLimit: body.hasTimeLimit !== false,
            totalTimeSec: body.totalTimeSec ?? 300,
            turnTimeSec: body.turnTimeSec ?? 90,
            clashTimeSec: body.clashTimeSec ?? 30,
            status: 'WAITING',
            playerCount: 1,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else if (action === 'start') {
        const target = currentRooms.find((r) => r.roomCode === upperCode);
        if (target) {
          target.status = 'PLAYING';
          target.playerCount = 2;
          target.updatedAt = now;
        }
      } else if (action === 'close') {
        currentRooms = currentRooms.filter((r) => r.roomCode !== upperCode);
      }

      // 최대 50개 유지 및 정리
      currentRooms = cleanStaleRooms(currentRooms, now).slice(0, 50);
      inMemoryRooms = currentRooms;

      // D1에 저장
      if (env.DB) {
        try {
          const jsonText = JSON.stringify(currentRooms);
          await env.DB.prepare(
            'INSERT INTO community_data (type, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(type) DO UPDATE SET data = ?, updated_at = ?'
          )
            .bind(D1_ROOMS_TYPE_KEY, jsonText, now, jsonText, now)
            .run();
        } catch (d1SaveErr) {
          console.warn('[Rooms D1 Save Error]:', d1SaveErr);
        }
      }

      return new Response(JSON.stringify({ success: true, rooms: currentRooms }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
};
