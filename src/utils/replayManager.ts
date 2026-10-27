import { LogItem, PlayerState, CharacterCard } from '../types/tcg';

export interface BattleReplaySummary {
  id: string;
  timestamp: number;
  gameMode: 'AI' | 'SOLO_DUAL' | 'MULTIPLAYER';
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

import { SAMPLE_BATTLE_REPLAYS } from '../data/sampleReplays';

const STORAGE_KEY = 'wuthering_tcg_replays_v1';
const MAX_REPLAYS = 20;

/**
 * 저장된 리플레이 전체 목록 조회 (최신순)
 * 데이터가 없으면 기본 명경기 샘플 리플레이 2종을 자동 시딩합니다.
 */
export function getSavedReplays(): BattleReplayData[] {
  try {
    if (typeof localStorage === 'undefined') {
      return [...SAMPLE_BATTLE_REPLAYS];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // 초기 기본 샘플 리플레이 자동 시딩
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_BATTLE_REPLAYS));
      return [...SAMPLE_BATTLE_REPLAYS];
    }
    const list: BattleReplayData[] = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) {
      return [...SAMPLE_BATTLE_REPLAYS];
    }
    // 샘플 리플레이는 최신 수정 데이터로 항상 갱신하고, 사용자가 저장한 리플레이와 합병
    const sampleIds = new Set(SAMPLE_BATTLE_REPLAYS.map((s) => s.id));
    const userReplays = list.filter((r) => !sampleIds.has(r.id));
    const merged = [...SAMPLE_BATTLE_REPLAYS, ...userReplays];
    return merged.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error('Failed to parse saved replays:', e);
    return [...SAMPLE_BATTLE_REPLAYS];
  }
}

/**
 * 기본 명경기 샘플 리플레이 복원
 */
export function restoreSampleReplays(): BattleReplayData[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_BATTLE_REPLAYS));
  } catch (e) {
    console.error('Failed to restore sample replays:', e);
  }
  return [...SAMPLE_BATTLE_REPLAYS];
}

/**
 * 현재 경기 데이터로부터 BattleReplayData 객체 생성 (저장은 별도)
 */
export function createBattleReplayData(
  winner: 0 | 1,
  players: [PlayerState, PlayerState],
  logs: LogItem[],
  totalTurns: number,
  gameMode: 'AI' | 'SOLO_DUAL' | 'MULTIPLAYER'
): BattleReplayData {
  const p0Leader = players[0].slots.leader;
  const p1Leader = players[1].slots.leader;

  // 깔끔하고 직관적인 단축 리플레이 ID 생성 (예: RP-261022-X0LOU)
  const d = new Date();
  const dateStr = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const randTag = Math.random().toString(36).substring(2, 7).toUpperCase();
  const replayId = `RP-${dateStr}-${randTag}`;

  return {
    id: replayId,
    timestamp: Date.now(),
    gameMode,
    totalTurns,
    winner,
    p0Leader: {
      nameKr: p0Leader.nameKr || p0Leader.characterName,
      artUrl: p0Leader.artUrl || p0Leader.underlyingCards?.[0]?.artUrl || '/cards/card_images/BP01-001_방랑자(남)_1985.webp',
      level: p0Leader.level ?? 0,
      element: p0Leader.element,
    },
    p1Leader: {
      nameKr: p1Leader.nameKr || p1Leader.characterName,
      artUrl: p1Leader.artUrl || p1Leader.underlyingCards?.[0]?.artUrl || '/cards/card_images/BP01-001_방랑자(남)_1985.webp',
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
}

/**
 * 생성된 BattleReplayData 객체를 로컬스토리지에 저장
 */
export function saveReplayObject(replay: BattleReplayData): BattleReplayData {
  try {
    if (typeof localStorage !== 'undefined') {
      const existing = getSavedReplays();
      // 중복 방지 (동일 id) 및 최대 개수 제한(20개)
      const updated = [replay, ...existing.filter((r) => r.id !== replay.id)].slice(0, MAX_REPLAYS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to save battle replay:', e);
  }
  return replay;
}

/**
 * 게임 종료 시 리플레이 자동/수동 저장
 */
export function saveBattleReplay(
  winner: 0 | 1,
  players: [PlayerState, PlayerState],
  logs: LogItem[],
  totalTurns: number,
  gameMode: 'AI' | 'SOLO_DUAL' | 'MULTIPLAYER'
): BattleReplayData {
  const replay = createBattleReplayData(winner, players, logs, totalTurns, gameMode);
  return saveReplayObject(replay);
}

/**
 * 특정 리플레이 단건 삭제
 */
export function deleteBattleReplay(replayId: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
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
    if (typeof localStorage === 'undefined') return true;
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
 * 리플레이 데이터를 공유용 깔끔한 리플레이 코드(ID)로 반환
 */
export function encodeReplayToShareCode(replay: BattleReplayData): string {
  return replay.id;
}

/**
 * 리플레이 코드(ID) 또는 파일/JSON 데이터로부터 리플레이 검색 및 불러오기
 */
export function importReplayFromCodeOrJson(input: string): { success: boolean; replay?: BattleReplayData; error?: string } {
  try {
    const clean = input.trim();
    if (!clean) {
      return { success: false, error: '리플레이 코드 또는 JSON 데이터를 입력해주세요.' };
    }

    // 1. 저장된 리플레이 ID로 검색 (예: RP-261022-X0LOU 또는 replay-...)
    const existing = getSavedReplays();
    const foundById = existing.find(
      (r) => r.id.toLowerCase() === clean.toLowerCase() || r.id.toLowerCase().includes(clean.toLowerCase())
    );
    if (foundById) {
      return { success: true, replay: foundById };
    }

    // 2. 단축/레거시 Base64 공유 코드 (WTRP-...) 파싱 지원
    if (clean.startsWith('WTRP-')) {
      const rawBase64 = clean.replace(/^WTRP-/, '');
      const decodedJson = decodeURIComponent(
        Array.from(atob(rawBase64))
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return importReplayFromJson(decodedJson);
    }

    // 3. 일반 JSON 데이터인 경우
    if (clean.startsWith('{') && clean.endsWith('}')) {
      return importReplayFromJson(clean);
    }

    return {
      success: false,
      error: `입력하신 코드 [${clean}]에 해당하는 리플레이를 현재 브라우저 저장소에서 찾을 수 없습니다. 다른 기기의 리플레이인 경우 [파일 불러오기]를 이용해주세요.`,
    };
  } catch (e: any) {
    return { success: false, error: '유효한 리플레이 코드 또는 JSON 데이터가 아닙니다.' };
  }
}

/**
 * File 객체로부터 리플레이 파일 불러오기
 */
export async function importReplayFromFile(file: File): Promise<{ success: boolean; replay?: BattleReplayData; error?: string }> {
  try {
    const text = await file.text();
    return importReplayFromCodeOrJson(text);
  } catch {
    return { success: false, error: '파일을 읽는 도중 오류가 발생했습니다.' };
  }
}

