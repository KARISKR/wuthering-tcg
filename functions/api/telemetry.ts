// functions/api/telemetry.ts
// 멀티플레이 실전 배틀 데이터 수집 및 AI 학습용 텔레메트리 API (Cloudflare D1)

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

export interface BattleTelemetryRecord {
  id: string;
  timestamp: number;
  durationSec: number;
  winnerIndex: number;
  p0Leader: string;
  p1Leader: string;
  p0DeckSummary?: string;
  p1DeckSummary?: string;
  totalTurns: number;
  logsJson?: string;
  createdAt: number;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

async function ensureTelemetryTable(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS battle_telemetry (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      duration_sec INTEGER NOT NULL,
      winner_index INTEGER NOT NULL,
      p0_leader TEXT NOT NULL,
      p1_leader TEXT NOT NULL,
      p0_deck_summary TEXT,
      p1_deck_summary TEXT,
      total_turns INTEGER NOT NULL,
      logs_json TEXT,
      created_at INTEGER NOT NULL
    );
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON battle_telemetry(timestamp);
  `).run();
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const db = env.DB;
  if (!db) {
    return new Response(
      JSON.stringify({ success: false, error: 'Database binding (DB) is not available.' }),
      { status: 503, headers: CORS_HEADERS }
    );
  }

  try {
    await ensureTelemetryTable(db);

    // ==========================================
    // 1. POST: 배틀 텔레메트리 데이터 저장
    // ==========================================
    if (request.method === 'POST') {
      const body: any = await request.json();

      if (!body.id || body.winnerIndex === undefined || !body.p0Leader || !body.p1Leader) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid telemetry payload structure.' }),
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const id = String(body.id).trim();
      const timestamp = Number(body.timestamp) || Date.now();
      const durationSec = Math.max(0, Math.round(Number(body.durationSec) || 0));
      const winnerIndex = body.winnerIndex === 0 ? 0 : 1;
      const p0Leader = String(body.p0Leader).slice(0, 50);
      const p1Leader = String(body.p1Leader).slice(0, 50);
      const p0DeckSummary = body.p0DeckSummary ? JSON.stringify(body.p0DeckSummary) : null;
      const p1DeckSummary = body.p1DeckSummary ? JSON.stringify(body.p1DeckSummary) : null;
      const totalTurns = Math.max(1, Math.round(Number(body.totalTurns) || 1));
      
      // 로그 데이터는 유의미한 행동 로그 위주로 보존 (최대 100KB 제한)
      let logsJson: string | null = null;
      if (body.logs && Array.isArray(body.logs)) {
        const compactLogs = body.logs.slice(-150);
        logsJson = JSON.stringify(compactLogs).slice(0, 102400);
      }

      const createdAt = Date.now();

      // INSERT OR REPLACE로 동일 matchId 중복 방어
      await db
        .prepare(`
          INSERT OR REPLACE INTO battle_telemetry (
            id, timestamp, duration_sec, winner_index,
            p0_leader, p1_leader, p0_deck_summary, p1_deck_summary,
            total_turns, logs_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          id,
          timestamp,
          durationSec,
          winnerIndex,
          p0Leader,
          p1Leader,
          p0DeckSummary,
          p1DeckSummary,
          totalTurns,
          logsJson,
          createdAt
        )
        .run();

      return new Response(
        JSON.stringify({ success: true, id, message: 'Battle telemetry successfully recorded.' }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // ==========================================
    // 2. GET: 텔레메트리 통계 및 AI 훈련용 데이터 조회
    // ==========================================
    if (request.method === 'GET') {
      const action = url.searchParams.get('action') || 'summary';

      if (action === 'summary') {
        // 리더별 승률 및 픽률 통계 요약
        const totalMatchesRes = await db
          .prepare('SELECT COUNT(*) as totalCount FROM battle_telemetry')
          .first<{ totalCount: number }>();
        const totalMatches = totalMatchesRes?.totalCount || 0;

        const leaderStatsRes = await db
          .prepare(`
            SELECT 
              p0_leader as leader,
              COUNT(*) as pickCount,
              SUM(CASE WHEN winner_index = 0 THEN 1 ELSE 0 END) as winCount
            FROM battle_telemetry
            GROUP BY p0_leader
            ORDER BY pickCount DESC
            LIMIT 20
          `)
          .all<{ leader: string; pickCount: number; winCount: number }>();

        return new Response(
          JSON.stringify({
            success: true,
            totalMatches,
            leaderStats: leaderStatsRes.results || [],
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      } else if (action === 'export') {
        // AI 학습/시뮬레이션용 원본 데이터 반환 (최신 100건)
        const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 100));
        const records = await db
          .prepare(`
            SELECT id, timestamp, duration_sec, winner_index, p0_leader, p1_leader,
                   p0_deck_summary, p1_deck_summary, total_turns, logs_json, created_at
            FROM battle_telemetry
            ORDER BY timestamp DESC
            LIMIT ?
          `)
          .bind(limit)
          .all<BattleTelemetryRecord>();

        return new Response(
          JSON.stringify({
            success: true,
            count: records.results?.length || 0,
            records: records.results || [],
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Telemetry API Error' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
