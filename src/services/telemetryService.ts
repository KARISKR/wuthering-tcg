// src/services/telemetryService.ts
// 멀티플레이 실전 배틀 데이터 수집 및 AI 강화용 텔레메트리 클라이언트 서비스

import { GameState, LogItem, CustomDeckConfig } from '../types/tcg';

export interface BattleTelemetryPayload {
  id: string;
  timestamp: number;
  durationSec: number;
  winnerIndex: number;
  p0Leader: string;
  p1Leader: string;
  p0DeckSummary?: {
    name?: string;
    leaderName: string;
    leftSupportName?: string;
    rightSupportName?: string;
    actionCardCount: number;
    colorDistribution: { red: number; green: number; blue: number };
  };
  p1DeckSummary?: {
    name?: string;
    leaderName: string;
    leftSupportName?: string;
    rightSupportName?: string;
    actionCardCount: number;
    colorDistribution: { red: number; green: number; blue: number };
  };
  totalTurns: number;
  logs: Array<{
    turn?: number;
    text: string;
    type?: string;
    playerIndex?: number;
    timestamp?: number;
  }>;
}

class TelemetryService {
  private recordedMatchIds: Set<string> = new Set();

  /**
   * 경기 결과로부터 텔레메트리 패킷을 생성하여 백엔드 DB(Cloudflare D1)로 안전하게 비동기 전송
   */
  public async sendMatchTelemetry(
    matchId: string,
    gameState: GameState,
    winnerIndex: 0 | 1,
    durationSec: number,
    p0Deck?: CustomDeckConfig | null,
    p1Deck?: CustomDeckConfig | null
  ): Promise<boolean> {
    if (!matchId || this.recordedMatchIds.has(matchId)) {
      return false;
    }

    try {
      this.recordedMatchIds.add(matchId);

      const p0 = gameState.players[0];
      const p1 = gameState.players[1];

      const p0Leader = p0.slots.leader?.nameKr || p0Deck?.leader?.nameKr || '방랑자';
      const p1Leader = p1.slots.leader?.nameKr || p1Deck?.leader?.nameKr || '방랑자';

      // 덱 카드 색상 분포 요약
      const summarizeDeck = (deck?: CustomDeckConfig | null, player?: typeof p0) => {
        const cards = deck?.actionCards || [];
        const red = cards.filter((c) => c.color === 'RED').length;
        const green = cards.filter((c) => c.color === 'GREEN').length;
        const blue = cards.filter((c) => c.color === 'BLUE').length;

        return {
          name: deck?.name || '커스텀 덱',
          leaderName: deck?.leader?.nameKr || player?.slots.leader?.nameKr || '방랑자',
          leftSupportName: deck?.leftSupport?.nameKr || player?.slots.leftSupport?.nameKr,
          rightSupportName: deck?.rightSupport?.nameKr || player?.slots.rightSupport?.nameKr,
          actionCardCount: cards.length,
          colorDistribution: { red, green, blue },
        };
      };

      // 중요한 전술적 로그 필터링 (데미지, 레벨업, 연격, 드로우, 대결)
      const filteredLogs = (gameState.logs || [])
        .filter((l) => l.type === 'ACTION' || l.type === 'CLASH' || l.type === 'DAMAGE' || l.type === 'HEAL')
        .slice(-120)
        .map((l) => ({
          turn: l.turn,
          text: l.text,
          type: l.type,
          playerIndex: l.playerIndex,
          timestamp: l.timestamp,
        }));

      const payload: BattleTelemetryPayload = {
        id: matchId,
        timestamp: Date.now(),
        durationSec: Math.max(1, Math.round(durationSec)),
        winnerIndex,
        p0Leader,
        p1Leader,
        p0DeckSummary: summarizeDeck(p0Deck, p0),
        p1DeckSummary: summarizeDeck(p1Deck, p1),
        totalTurns: gameState.turn || 1,
        logs: filteredLogs,
      };

      const res = await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return res.ok;
    } catch {
      // 텔레메트리 전송 실패가 게임 플레이에 영향을 주지 않도록 무시
      return false;
    }
  }
}

export const telemetryService = new TelemetryService();
