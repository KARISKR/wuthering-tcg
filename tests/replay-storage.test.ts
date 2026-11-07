/**
 * [WP8 버그 수정] 리플레이 저장: 저장 공간이 차면 오래된 것부터 정리하고 새 리플레이는 반드시 저장한다.
 * 그리고 v2 지문이 짧은 해시라 리플레이 1개 크기가 v2 때문에 크게 늘지 않는다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { saveReplayObject, getSavedReplays, type BattleReplayData } from '../src/utils/replayManager';
import { stateFingerprint, fingerprintMatches } from '../src/engine/replay';
import { createInitialGameState } from '../src/engine/gameEngine';

class QuotaStorage {
  private data = new Map<string, string>();
  constructor(private limit: number) {}
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null; }
  setItem(k: string, v: string) {
    if (v.length > this.limit) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
    this.data.set(k, v);
  }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
  key() { return null; }
  get length() { return this.data.size; }
}

const makeReplay = (id: string, ts: number, kb: number): BattleReplayData =>
  ({ id, timestamp: ts, totalTurns: 5, winner: 0, gameMode: 'AI', logs: [{ id: 'l', turn: 1, text: 'x'.repeat(kb * 1024) }] }) as unknown as BattleReplayData;

describe('[WP8 버그 수정] replay storage', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = new QuotaStorage(1000 * 1024); // 약 1MB
  });

  it('when storage is full, the newest replay is still saved and the oldest are dropped', () => {
    for (let i = 0; i < 4; i++) saveReplayObject(makeReplay(`r${i}`, 1000 + i, 300));
    const ids = getSavedReplays().map((r) => r.id);
    expect(ids[0]).toBe('r3'); // 방금 저장한 것
    expect(ids).not.toContain('r0'); // 가장 오래된 것이 정리됨
    expect(ids.length).toBeLessThan(4);
  });

  it('state fingerprint is a short hash, and legacy full-JSON fingerprints still compare', () => {
    const st = createInitialGameState('STARTER_ROVER', 'STARTER_CHIXIA', 'AI', null, null, undefined, undefined, 99);
    const fp = stateFingerprint(st);
    expect(fp.length).toBeLessThan(64);
    expect(fingerprintMatches(st, fp)).toBe(true);
    const legacy = JSON.stringify(st, (k, v) => (k === 'timestamp' ? undefined : v));
    expect(fingerprintMatches(st, legacy)).toBe(true);
    expect(fingerprintMatches(st, 'fp1-wrong')).toBe(false);
  });
});
