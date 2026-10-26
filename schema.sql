-- Cloudflare D1 Database Schema for Wuthering TCG
-- stats_counters: 총 방문자 및 일일 방문자 카운터 저장
CREATE TABLE IF NOT EXISTS stats_counters (
  id TEXT PRIMARY KEY,
  val INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER
);

-- active_sessions: 실시간 접속자 세션 및 마지막 활동 시각 (90초 TTL)
CREATE TABLE IF NOT EXISTS active_sessions (
  client_id TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_last_seen ON active_sessions(last_seen);

-- community_data: 덱 공유 및 자유게시판 JSON 스토리지
CREATE TABLE IF NOT EXISTS community_data (
  type TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER
);
