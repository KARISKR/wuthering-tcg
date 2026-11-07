/**
 * [WP1·WP9] 방 목록 API(functions/api/rooms.ts): 방 하나 = 한 행, 하트비트는 해당 행만 갱신.
 * D1 대신 Node 내장 SQLite로 실제 SQL을 실행한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';

function fakeD1() {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql: string, args: unknown[] = []): any => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    first: async () => (db.prepare(sql).get(...(args as any[])) as any) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...(args as any[])), success: true }),
    run: async () => (db.prepare(sql).run(...(args as any[])), { success: true }),
    _exec: () => db.prepare(sql).run(...(args as any[])),
  });
  return { raw: db, prepare: (sql: string) => stmt(sql), batch: async (s: any[]) => s.map((x) => (x._exec(), { success: true })) };
}

let DB: ReturnType<typeof fakeD1>;
let mod: typeof import('../functions/api/rooms');

async function call(method: string, body?: unknown) {
  const request = new Request('https://x.test/api/rooms', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res: Response = await (mod.onRequest as any)({ request, env: { DB } });
  return res.json() as Promise<any>;
}

beforeEach(async () => {
  DB = fakeD1();
  vi.resetModules();
  vi.useRealTimers();
  mod = await import('../functions/api/rooms');
});

describe('rooms API', () => {
  it('create → list → start → close', async () => {
    await call('POST', { action: 'create', roomCode: 'abcd', hostName: 'h1' });
    await call('POST', { action: 'create', roomCode: 'efgh', hostName: 'h2' });
    let r = await call('GET');
    expect(r.rooms.map((x: any) => x.roomCode).sort()).toEqual(['ABCD', 'EFGH']);
    await call('POST', { action: 'start', roomCode: 'ABCD' });
    r = await call('GET');
    expect(r.rooms.find((x: any) => x.roomCode === 'ABCD').status).toBe('PLAYING');
    await call('POST', { action: 'close', roomCode: 'ABCD' });
    r = await call('GET');
    expect(r.rooms.map((x: any) => x.roomCode)).toEqual(['EFGH']);
  });

  it('heartbeats of different rooms do not overwrite each other', async () => {
    await call('POST', { action: 'create', roomCode: 'A1', hostName: 'a' });
    await call('POST', { action: 'create', roomCode: 'B1', hostName: 'b' });
    await Promise.all([
      call('POST', { action: 'heartbeat', roomCode: 'A1', turnTimeSec: 60 }),
      call('POST', { action: 'heartbeat', roomCode: 'B1', turnTimeSec: 45 }),
    ]);
    const r = await call('GET');
    const by = Object.fromEntries(r.rooms.map((x: any) => [x.roomCode, x]));
    expect(by.A1.turnTimeSec).toBe(60);
    expect(by.B1.turnTimeSec).toBe(45);
  });

  it('rooms expire after 60s without heartbeat; heartbeat restores a missing room', async () => {
    await call('POST', { action: 'create', roomCode: 'OLD' });
    DB.raw.prepare("UPDATE mp_rooms SET updated_at = updated_at - 61000 WHERE room_code='OLD'").run();
    let r = await call('GET');
    expect(r.rooms.length).toBe(0);
    await call('POST', { action: 'heartbeat', roomCode: 'OLD', hostName: 'back' });
    r = await call('GET');
    expect(r.rooms[0]).toMatchObject({ roomCode: 'OLD', hostName: 'back', status: 'WAITING' });
  });
});
