-- Cloudflare D1 Database Schema for Wuthering TCG
-- stats_counters: 총 방문자 및 일일 방문자 카운터 저장
CREATE TABLE IF NOT EXISTS stats_counters (
  id TEXT PRIMARY KEY,
  val INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER
);

-- active_sessions: 실시간 접속자 세션 및 마지막 활동 시각 ([WP1] 10분 TTL, 클라이언트 핑 5분)
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

-- battle_telemetry: 멀티플레이 실전 대결 텔레메트리 (AI 학습 및 승률/메타 분석용)
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

CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON battle_telemetry(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_leaders ON battle_telemetry(p0_leader, p1_leader);

-- ─────────────────────────────────────────────────────────────────────────────
-- [WP9] 행 단위 저장소 (API가 첫 요청 때 CREATE TABLE IF NOT EXISTS로 자동 생성하므로 수동 실행은 선택)
-- community_items: 게시글(post)·공유 덱(deck)·리플레이 요약(replay)·리플레이 상세(replay_detail) 한 건 = 한 행
-- 기존 community_data의 board/decks/replays JSON은 첫 요청 때 자동으로 옮겨지고, 원본 행은 백업으로 남음
CREATE TABLE IF NOT EXISTS community_items (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS idx_community_items_kind_created ON community_items(kind, created_at);
CREATE INDEX IF NOT EXISTS idx_community_items_kind_updated ON community_items(kind, updated_at);

-- mp_rooms: 멀티플레이 공개 방 한 개 = 한 행 (이전: community_data 'multiplayer_rooms' 한 행에 목록 전체)
CREATE TABLE IF NOT EXISTS mp_rooms (
  room_code TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mp_rooms_updated ON mp_rooms(updated_at);

-- [WP9 잔여] community_comments: 댓글 한 건 = 한 행 (이전: 게시글 JSON 안 comments 배열)
-- 삭제는 deleted=1 묘비로 남김(예전 클라이언트가 보낸 댓글 배열로 되살아나지 않게). API가 첫 요청 때 자동 생성·이전함
CREATE TABLE IF NOT EXISTS community_comments (
  post_id TEXT NOT NULL,
  id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  PRIMARY KEY (post_id, id)
);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_created ON community_comments(post_id, created_at);

-- [WP9 잔여] rate_limits: 작성 빈도 제한 카운터 (키 = 구분:SHA-256(IP) 앞 16자리, 10분 고정 창)
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
