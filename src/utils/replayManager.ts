import { LogItem, PlayerState, CharacterCard } from '../types/tcg';

export interface BattleReplaySummary {
  id: string;
  timestamp: number;
  gameMode: 'AI' | 'SOLO_DUAL';
  totalTurns: number;
  winner: 0 | 1;
  p0Leader: {
    nameKr: string;
    artUrl: string;
    level: number;
    element: string;
  };
  p1Leader: {
    nameKr: string;
    artUrl: string;
    level: number;
    element: string;
  };
  p0Hp: number;
  p1Hp: number;
  p0Name: string;
  p1Name: string;
  totalLogCount: number;
}

export interface BattleReplayData extends BattleReplaySummary {
  logs: LogItem[];
  // 각 플레이어 시작/최종 덱 정보 요약
  p0DeckSummary?: {
    leaderName: string;
    leftSupportName?: string;
    rightSupportName?: string;
    actionCardCount: number;
  };
  p1DeckSummary?: {
    leaderName: string;
    leftSupportName?: string;
    rightSupportName?: string;
    actionCardCount: number;
  };
}

const STORAGE_KEY = 'wuthering_tcg_replays_v1';
const MAX_REPLAYS = 20;

/**
 * 저장된 리플레이 전체 목록 조회 (최신순)
 */
export function getSavedReplays(): BattleReplayData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: BattleReplayData[] = JSON.parse(raw);
    return Array.isArray(list) ? list.sort((a, b) => b.timestamp - a.timestamp) : [];
  } catch (e) {
    console.error('Failed to parse saved replays:', e);
    return [];
  }
}

/**
 * 게임 종료 시 리플레이 자동/수동 저장
 */
export function saveBattleReplay(
  winner: 0 | 1,
  players: [PlayerState, PlayerState],
  logs: LogItem[],
  totalTurns: number,
  gameMode: 'AI' | 'SOLO_DUAL'
): BattleReplayData {
  const p0Leader = players[0].slots.leader;
  const p1Leader = players[1].slots.leader;

  const replay: BattleReplayData = {
    id: `replay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    gameMode,
    totalTurns,
    winner,
    p0Leader: {
      nameKr: p0Leader.nameKr || p0Leader.characterName,
      artUrl: p0Leader.artUrl,
      level: p0Leader.level ?? 0,
      element: p0Leader.element,
    },
    p1Leader: {
      nameKr: p1Leader.nameKr || p1Leader.characterName,
      artUrl: p1Leader.artUrl,
      level: p1Leader.level ?? 0,
      element: p1Leader.element,
    },
    p0Hp: players[0].hp,
    p1Hp: players[1].hp,
    p0Name: players[0].name,
    p1Name: players[1].name,
    totalLogCount: logs.length,
    logs: [...logs],
    p0DeckSummary: {
      leaderName: p0Leader.nameKr,
      leftSupportName: players[0].slots.leftSupport?.nameKr,
      rightSupportName: players[0].slots.rightSupport?.nameKr,
      actionCardCount: players[0].actionDeck.length + players[0].hand.length + players[0].dropZone.length,
    },
    p1DeckSummary: {
      leaderName: p1Leader.nameKr,
      leftSupportName: players[1].slots.leftSupport?.nameKr,
      rightSupportName: players[1].slots.rightSupport?.nameKr,
      actionCardCount: players[1].actionDeck.length + players[1].hand.length + players[1].dropZone.length,
    },
  };

  try {
    const existing = getSavedReplays();
    // 중복 방지 (동일 id) 및 최대 개수 제한(20개)
    const updated = [replay, ...existing.filter((r) => r.id !== replay.id)].slice(0, MAX_REPLAYS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save battle replay:', e);
  }

  return replay;
}

/**
 * 특정 리플레이 단건 삭제
 */
export function deleteBattleReplay(replayId: string): boolean {
  try {
    const existing = getSavedReplays();
    const updated = existing.filter((r) => r.id !== replayId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.error('Failed to delete battle replay:', e);
    return false;
  }
}

/**
 * 전체 리플레이 초기화
 */
export function clearAllBattleReplays(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('Failed to clear battle replays:', e);
    return false;
  }
}

/**
 * 리플레이 JSON 내보내기/다운로드
 */
export function exportReplayToJson(replay: BattleReplayData) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(replay, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `wuthering_replay_${replay.id}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
