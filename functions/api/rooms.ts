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
  allowSpectating?: boolean;
  status: 'WAITING' | 'PLAYING';
  playerCount: number;
  createdAt: number;
  updatedAt: number;
}

const ROOM_TTL_MS = 60000; // [WP1] 60초 이상 하트비트가 없으면 자동 제거 (클라이언트 하트비트 20초 간격의 3배)

// [WP9] 이전: community_data의 'multiplayer_rooms' 한 행에 방 목록 전체 JSON을 저장하고,
//       하트비트(방마다 7초)마다 목록 전체를 읽고 → 고치고 → 다시 썼다. 방 두 개가 동시에 갱신되면 한쪽이 덮어써짐.
// 지금: mp_rooms 테이블에 방 하나 = 한 행. 하트비트는 해당 방 행만 갱신. 응답 형식은 이전과 동일.
let schemaReady = false;

async function ensureSchema(db: D1Database) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS mp_rooms (
        room_code TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        data TEXT NOT NULL
      )`
    ),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_mp_rooms_updated ON mp_rooms(updated_at)'),
  ]);
  schemaReady = true;
}

// 메모리 백업 (D1 미바인딩 또는 로컬 환경용)
let inMemoryRooms: MultiplayerRoomInfo[] = [];

function cleanStaleRooms(rooms: MultiplayerRoomInfo[], now: number): MultiplayerRoomInfo[] {
  return rooms.filter((r) => now - r.updatedAt <= ROOM_TTL_MS && r.status !== 'CLOSED' as any);
}

async function listActiveRooms(db: D1Database, now: number): Promise<MultiplayerRoomInfo[]> {
  const res = await db
    .prepare(`SELECT data FROM mp_rooms WHERE updated_at >= ? AND status != 'CLOSED' ORDER BY created_at DESC LIMIT 50`)
    .bind(now - ROOM_TTL_MS)
    .all<{ data: string }>();
  return (res.results || [])
    .map((r) => {
      try {
        return JSON.parse(r.data) as MultiplayerRoomInfo;
      } catch {
        return null;
      }
    })
    .filter((r): r is MultiplayerRoomInfo => Boolean(r));
}

function saveRoomStmt(db: D1Database, room: MultiplayerRoomInfo) {
  return db
    .prepare(
      `INSERT INTO mp_rooms (room_code, created_at, updated_at, status, data) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(room_code) DO UPDATE SET updated_at = excluded.updated_at, status = excluded.status, data = excluded.data`
    )
    .bind(room.roomCode, room.createdAt, room.updatedAt, room.status, JSON.stringify(room));
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
          await ensureSchema(env.DB);
          activeRooms = await listActiveRooms(env.DB, now);
          // 만료된 방 행 정리는 가끔만 (요청 20회 중 1회, D1 쓰기 절감)
          if (Math.random() < 0.05) {
            await env.DB.prepare('DELETE FROM mp_rooms WHERE updated_at < ?').bind(now - ROOM_TTL_MS * 5).run();
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
        allowSpectating?: boolean;
      };

      const { action, roomCode } = body;
      if (!roomCode || typeof roomCode !== 'string') {
        return new Response(JSON.stringify({ error: 'roomCode is required' }), {
          status: 400,
          headers,
        });
      }

      const upperCode = roomCode.toUpperCase().trim();
      const freshRoom = (): MultiplayerRoomInfo => ({
        roomCode: upperCode,
        hostName: body.hostName || '방랑자',
        hostLeader: body.hostLeader,
        hostLeaderArt: body.hostLeaderArt,
        deckName: body.deckName,
        hasTimeLimit: body.hasTimeLimit !== false,
        totalTimeSec: body.totalTimeSec ?? 300,
        turnTimeSec: body.turnTimeSec ?? 90,
        clashTimeSec: body.clashTimeSec ?? 30,
        allowSpectating: body.allowSpectating !== false,
        status: 'WAITING',
        playerCount: 1,
        createdAt: now,
        updatedAt: now,
      });
      const applyHeartbeat = (target: MultiplayerRoomInfo) => {
        target.updatedAt = now;
        if (body.hasTimeLimit !== undefined) target.hasTimeLimit = body.hasTimeLimit;
        if (body.totalTimeSec !== undefined) target.totalTimeSec = body.totalTimeSec;
        if (body.turnTimeSec !== undefined) target.turnTimeSec = body.turnTimeSec;
        if (body.clashTimeSec !== undefined) target.clashTimeSec = body.clashTimeSec;
        if (body.allowSpectating !== undefined) target.allowSpectating = body.allowSpectating;
      };

      // (A) D1: 해당 방 행만 읽고 씀
      if (env.DB) {
        try {
          await ensureSchema(env.DB);
          const row = await env.DB.prepare('SELECT data, updated_at FROM mp_rooms WHERE room_code = ?')
            .bind(upperCode)
            .first<{ data: string; updated_at: number }>();
          const existing: MultiplayerRoomInfo | null =
            row && now - row.updated_at <= ROOM_TTL_MS ? (JSON.parse(row.data) as MultiplayerRoomInfo) : null;

          if (action === 'create') {
            await saveRoomStmt(env.DB, freshRoom()).run();
          } else if (action === 'heartbeat') {
            const target = existing ?? freshRoom(); // 만료되었거나 누락된 방 복구
            applyHeartbeat(target);
            await saveRoomStmt(env.DB, target).run();
          } else if (action === 'start') {
            if (existing) {
              existing.status = 'PLAYING';
              existing.playerCount = 2;
              existing.updatedAt = now;
              await saveRoomStmt(env.DB, existing).run();
            }
          } else if (action === 'close') {
            await env.DB.prepare('DELETE FROM mp_rooms WHERE room_code = ?').bind(upperCode).run();
          }

          const rooms = await listActiveRooms(env.DB, now);
          return new Response(JSON.stringify({ success: true, rooms }), { headers });
        } catch (d1Err) {
          console.warn('[Rooms D1 POST Error]:', d1Err);
        }
      }

      // (B) 메모리 폴백 (D1 미바인딩 로컬 환경)
      let currentRooms = cleanStaleRooms(inMemoryRooms, now);
      if (action === 'create') {
        currentRooms = currentRooms.filter((r) => r.roomCode !== upperCode);
        currentRooms.unshift(freshRoom());
      } else if (action === 'heartbeat') {
        const target = currentRooms.find((r) => r.roomCode === upperCode);
        if (target) applyHeartbeat(target);
        else currentRooms.unshift(freshRoom());
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
      currentRooms = cleanStaleRooms(currentRooms, now).slice(0, 50);
      inMemoryRooms = currentRooms;
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
