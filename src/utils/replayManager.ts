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
  const safeTitle = `${replay.p0Leader.nameKr}_vs_${replay.p1Leader.nameKr}_${replay.totalTurns}T`.replace(/[^\w\uAC00-\uD7A3_-]/g, '_');
  downloadAnchor.setAttribute('download', `wuthering_replay_${safeTitle}_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * 외부 JSON 문자열을 파싱하여 리플레이 목록에 추가
 */
export function importReplayFromJson(jsonString: string): { success: boolean; replay?: BattleReplayData; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      return { success: false, error: '올바른 JSON 데이터 형식이 아닙니다.' };
    }
    if (!Array.isArray(data.logs) || data.totalTurns === undefined || !data.p0Leader || !data.p1Leader) {
      return { success: false, error: '명조 TCG 리플레이 규격에 필수적인 데이터(로그, 리더 정보 등)가 누락되었습니다.' };
    }

    // 새로운 고유 ID 부여
    const importedReplay: BattleReplayData = {
      ...data,
      id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: data.timestamp || Date.now(),
    };

    const existing = getSavedReplays();
    const updated = [importedReplay, ...existing.filter((r) => r.id !== importedReplay.id)].slice(0, MAX_REPLAYS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return { success: true, replay: importedReplay };
  } catch (err: any) {
    return { success: false, error: err?.message || 'JSON 파싱 중 오류가 발생했습니다.' };
  }
}

/**
 * File 객체로부터 리플레이 파일 불러오기
 */
export async function importReplayFromFile(file: File): Promise<{ success: boolean; replay?: BattleReplayData; error?: string }> {
  try {
    const text = await file.text();
    return importReplayFromJson(text);
  } catch (err: any) {
    return { success: false, error: '파일을 읽는 도중 오류가 발생했습니다.' };
  }
}

