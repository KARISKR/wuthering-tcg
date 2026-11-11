// 2인 대전 상태 동기화에서 로그를 새로 생긴 것만 보내고 받는 쪽에서 이어 붙이는 도우미 (2026-11-12)
// 게임 끝 상태 JSON의 약 90%가 로그였고, 호스트는 상태가 바뀔 때마다 전체를 보냈다.
import type { LogItem } from '../types/tcg';

/**
 * logs(최신이 앞)에서 지난번에 보낸 맨 앞 로그(anchorId) 앞쪽 = 새로 생긴 로그만 돌려준다.
 * anchorId가 없거나 목록에서 사라졌으면 null (= 전체를 보내야 함).
 */
export function logsSince(logs: LogItem[], anchorId: string | null): LogItem[] | null {
  if (!anchorId) return null;
  const i = logs.findIndex((l) => l.id === anchorId);
  return i === -1 ? null : logs.slice(0, i);
}

/**
 * 받은 쪽: 내가 가진 로그의 맨 앞이 보낸 쪽의 기준(anchorId)과 같을 때만 이어 붙인다.
 * 다르면(중간 메시지 유실 등) 받은 로그만 쓴다 — 로그 표시만 짧아질 뿐 게임 상태는 항상 전체가 온다.
 */
export function mergeSyncedLogs(incoming: LogItem[], prev: LogItem[], anchorId: string | undefined, max = 1000): LogItem[] {
  if (!anchorId || prev[0]?.id !== anchorId) return incoming;
  const ids = new Set(incoming.map((l) => l.id));
  return [...incoming, ...prev.filter((l) => !ids.has(l.id))].slice(0, max);
}
