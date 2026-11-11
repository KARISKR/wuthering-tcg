/**
 * [WP9] 커뮤니티 API(functions/api/community.ts) 행 단위 저장소 테스트.
 * Cloudflare D1 대신 Node 내장 SQLite(node:sqlite)로 같은 인터페이스를 흉내 내어 실제 SQL까지 실행한다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';

function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE community_data (type TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER)`);
  const stmt = (sql: string, args: unknown[] = []): any => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    first: async () => (db.prepare(sql).get(...(args as any[])) as any) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...(args as any[])), success: true }),
    run: async () => {
      db.prepare(sql).run(...(args as any[]));
      return { success: true };
    },
    _exec: () => db.prepare(sql).run(...(args as any[])),
  });
  return {
    raw: db,
    prepare: (sql: string) => stmt(sql),
    batch: async (stmts: any[]) => stmts.map((s) => (s._exec(), { success: true })),
  };
}

let DB: ReturnType<typeof fakeD1>;
const ADMIN_KEY = 'test-admin-key';
let mod: typeof import('../functions/api/community');

async function call(method: string, query: string, body?: unknown, headers: Record<string, string> = {}) {
  const request = new Request(`https://x.test/api/community?${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res: Response = await (mod.onRequest as any)({ request, env: { DB, ADMIN_KEY } });
  const text = await res.text();
  return { status: res.status, etag: res.headers.get('ETag'), json: text ? JSON.parse(text) : null };
}

beforeEach(async () => {
  DB = fakeD1();
  // 모듈 상태(스키마 준비·이전 완료 플래그)를 테스트마다 초기화
  const { vi } = await import('vitest');
  vi.resetModules();
  mod = await import('../functions/api/community');
});

describe('community API row storage', () => {
  it('migrates legacy board JSON on first request and keeps response shape/order', async () => {
    const legacy = {
      posts: [
        { id: 'p3', title: 'newest', content: 'c3', createdAt: '2026-11-03T00:00:00Z', comments: [] },
        { id: 'p2', title: 'notice', content: '공지 본문', isNotice: true, createdAt: '2026-11-02T00:00:00Z' },
        { id: 'p1', title: 'oldest', content: 'c1', createdAt: '2026-11-01T00:00:00Z' },
      ],
    };
    DB.raw.prepare('INSERT INTO community_data VALUES (?,?,?)').run('board', JSON.stringify(legacy), 1);

    const full = await call('GET', 'type=board');
    expect(full.json.posts.map((p: any) => p.id)).toEqual(['p3', 'p2', 'p1']);

    const sum = await call('GET', 'type=board&summary=1');
    expect(sum.json.posts[0].isSummaryOnly).toBe(true);
    expect(sum.json.posts.find((p: any) => p.id === 'p2').content).toContain('공지');

    const lobby = await call('GET', 'type=board&lobby=1');
    expect(lobby.json.latestNotice.id).toBe('p2');

    const one = await call('GET', 'type=board&postId=p1');
    expect(one.json.post).toMatchObject({ id: 'p1', content: 'c1', isSummaryOnly: false });

    // 기존 행은 백업으로 남아 있음
    expect(DB.raw.prepare("SELECT COUNT(*) AS n FROM community_data WHERE type='board'").get()).toMatchObject({ n: 1 });
  });

  it('two people posting at the same time both survive; delete removes one row', async () => {
    await Promise.all([
      call('POST', 'type=board', { action: 'upsertPost', post: { id: 'a', title: 'A', content: 'x', createdAt: '2026-11-05T00:00:00Z' } }),
      call('POST', 'type=board', { action: 'upsertPost', post: { id: 'b', title: 'B', content: 'y', createdAt: '2026-11-06T00:00:00Z' } }),
    ]);
    let all = await call('GET', 'type=board');
    expect(all.json.posts.map((p: any) => p.id).sort()).toEqual(['a', 'b']);

    await call('POST', 'type=board', { action: 'deletePost', postId: 'a' });
    all = await call('GET', 'type=board');
    expect(all.json.posts.map((p: any) => p.id)).toEqual(['b']);
  });

  it('summary-only upsert (e.g. like/comment from list view) keeps the full body', async () => {
    await call('POST', 'type=board', { action: 'upsertPost', post: { id: 'a', title: 'A', content: '본문', images: ['i'], createdAt: '2026-11-05T00:00:00Z' } });
    await call('POST', 'type=board', { action: 'upsertPost', post: { id: 'a', title: 'A', content: '', likes: 3, isSummaryOnly: true } });
    const one = await call('GET', 'type=board&postId=a');
    expect(one.json.post).toMatchObject({ content: '본문', images: ['i'], likes: 3 });
  });

  it('legacy full-list board save upserts without deleting others', async () => {
    await call('POST', 'type=board', { action: 'upsertPost', post: { id: 'keep', content: 'k', createdAt: '2026-11-01T00:00:00Z' } });
    await call('POST', 'type=board', { posts: [{ id: 'new', content: 'n', createdAt: '2026-11-02T00:00:00Z' }] });
    const all = await call('GET', 'type=board');
    expect(all.json.posts.map((p: any) => p.id).sort()).toEqual(['keep', 'new']);
  });

  it('ETag changes on write and returns 304 when unchanged', async () => {
    await call('POST', 'type=board', { action: 'upsertPost', post: { id: 'a', content: 'x' } });
    const r1 = await call('GET', 'type=board&summary=1');
    const r2 = await call('GET', 'type=board&summary=1', undefined, { 'If-None-Match': r1.etag! });
    expect(r2.status).toBe(304);
    await call('POST', 'type=board', { action: 'deletePost', postId: 'a' });
    const r3 = await call('GET', 'type=board&summary=1', undefined, { 'If-None-Match': r1.etag! });
    expect(r3.status).toBe(200);
  });

  it('decks: migrate legacy; a stale full list never deletes or overwrites other decks', async () => {
    const legacy = { decks: [{ id: 'd1', name: 'old1', createdAt: 1, likes: 4 }, { id: 'd2', name: 'old2', createdAt: 2 }] };
    DB.raw.prepare('INSERT INTO community_data VALUES (?,?,?)').run('decks', JSON.stringify(legacy), 1);
    let r = await call('GET', 'type=decks');
    expect(r.json.decks.map((d: any) => d.id).sort()).toEqual(['d1', 'd2']);

    // 예전 클라이언트가 d1만 든 목록(좋아요 999로 조작)을 보냄 → d2 유지, d1 덮어쓰기 없음
    await call('POST', 'type=decks', { decks: [{ id: 'd1', name: 'hacked', likes: 999 }] });
    r = await call('GET', 'type=decks');
    expect(r.json.decks.map((d: any) => d.id).sort()).toEqual(['d1', 'd2']);
    expect(r.json.decks.find((d: any) => d.id === 'd1')).toMatchObject({ name: 'old1', likes: 4 });
  });

  it('decks: share, like/unlike by one, delete only with the admin key', async () => {
    await call('POST', 'type=decks', { action: 'upsertDeck', deck: { id: 'n1', deckName: 'mine', likes: 50 } });
    let deck = (await call('GET', 'type=decks')).json.decks.find((d: any) => d.id === 'n1');
    expect(deck.likes).toBe(0);
    await call('POST', 'type=decks', { action: 'likeDeck', id: 'n1', delta: 1 });
    await call('POST', 'type=decks', { action: 'likeDeck', id: 'n1', delta: 1 });
    await call('POST', 'type=decks', { action: 'likeDeck', id: 'n1', delta: -1 });
    deck = (await call('GET', 'type=decks')).json.decks.find((d: any) => d.id === 'n1');
    expect(deck.likes).toBe(1);

    expect((await call('POST', 'type=decks', { action: 'deleteDeck', id: 'n1' })).status).toBe(403);
    expect((await call('POST', 'type=decks', { action: 'deleteDeck', id: 'n1', auth: { adminKey: ADMIN_KEY } })).status).toBe(200);
    expect((await call('GET', 'type=decks')).json.decks.some((d: any) => d.id === 'n1')).toBe(false);
  });

  it('replays: keep latest 40 summaries, details fetchable, legacy detail fallback', async () => {
    DB.raw.prepare('INSERT INTO community_data VALUES (?,?,?)').run('replay_detail:old', JSON.stringify({ id: 'old', logs: [1] }), 1);
    for (let i = 0; i < 45; i++) {
      await call('POST', 'type=replays', { id: `r${i}`, timestamp: 1000 + i, logs: [{ t: i }], p0Leader: 'a', p1Leader: 'b' }, { 'CF-Connecting-IP': `10.0.0.${i}` });
    }
    const list = await call('GET', 'type=replays&summary=1');
    expect(list.json.replays.length).toBe(40);
    expect(list.json.replays[0].id).toBe('r44');
    expect(list.json.replays[0].logs).toBeUndefined();
    const det = await call('GET', 'type=replays&id=r3');
    expect(det.json.logs).toEqual([{ t: 3 }]);
    const old = await call('GET', 'type=replays&id=old');
    expect(old.json.id).toBe('old');
  });

  it('new deck uploads are rate limited per IP', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await call('POST', 'type=decks', { action: 'upsertDeck', deck: { id: 'r' + i } })).status).toBe(200);
    }
    const r = await call('POST', 'type=decks', { action: 'upsertDeck', deck: { id: 'r5' } });
    expect(r.status).toBe(429);
    expect(r.json.bucket).toBe('deck');
  });

  it('[WP9 잔여] comments: concurrent comments both survive, edit/delete, legacy array cannot resurrect', async () => {
    await call('POST', 'type=board', { action: 'upsertPost', post: { id: 'p', title: 'T', content: 'c', createdAt: '2026-11-05T00:00:00Z' } });
    const [a, b] = await Promise.all([
      call('POST', 'type=board', { action: 'addComment', postId: 'p', comment: { id: 'c1', author: 'A', text: 'hi', createdAt: '2026-11-05T01:00:00Z' } }, { 'CF-Connecting-IP': '1.1.1.1' }),
      call('POST', 'type=board', { action: 'addComment', postId: 'p', comment: { id: 'c2', author: 'B', text: 'yo', createdAt: '2026-11-05T01:00:01Z' } }, { 'CF-Connecting-IP': '2.2.2.2' }),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    let one = await call('GET', 'type=board&postId=p');
    expect(one.json.post.comments.map((c: any) => c.id)).toEqual(['c1', 'c2']);

    // 요약 목록·로비에도 같은 댓글이 붙는다
    const sum = await call('GET', 'type=board&summary=1');
    expect(sum.json.posts[0].commentCount).toBe(2); // 목록에는 개수만 (2026-11-12)
    expect(sum.json.posts[0].comments).toEqual([]);

    // 수정
    await call('POST', 'type=board', { action: 'updateComment', postId: 'p', commentId: 'c1', text: 'edited' });
    one = await call('GET', 'type=board&postId=p');
    expect(one.json.post.comments[0].text).toBe('edited');

    // 삭제 후, 예전 클라이언트가 c2가 들어 있는 댓글 배열로 글을 다시 저장해도 되살아나지 않는다
    await call('POST', 'type=board', { action: 'deleteComment', postId: 'p', commentId: 'c2' });
    await call('POST', 'type=board', {
      action: 'upsertPost',
      post: { id: 'p', title: 'T', content: 'c', createdAt: '2026-11-05T00:00:00Z', likes: 3,
        comments: [{ id: 'c2', author: 'B', text: 'yo' }, { id: 'c3', author: 'C', text: 'new from old client' }] },
    });
    one = await call('GET', 'type=board&postId=p');
    expect(one.json.post.comments.map((c: any) => c.id)).toEqual(['c1', 'c3']);
    expect(one.json.post.likes).toBe(3);

    // 게시글 JSON 자체에는 댓글을 저장하지 않는다
    const row = DB.raw.prepare("SELECT data FROM community_items WHERE kind='post' AND id='p'").get() as any;
    expect(JSON.parse(row.data).comments).toBeUndefined();

    // 없는 글에 댓글 → 404
    const nf = await call('POST', 'type=board', { action: 'addComment', postId: 'nope', comment: { text: 'x' } });
    expect(nf.status).toBe(404);
  });

  it('[WP9 잔여] legacy comments inside post JSON are migrated once', async () => {
    const legacy = { posts: [{ id: 'old', title: 'o', content: 'x', createdAt: '2026-11-01T00:00:00Z',
      comments: [{ id: 'k1', author: 'A', text: 'first', createdAt: '2026-11-01T01:00:00Z' }] }] };
    DB.raw.prepare('INSERT INTO community_data VALUES (?,?,?)').run('board', JSON.stringify(legacy), 1);
    const one = await call('GET', 'type=board&postId=old');
    expect(one.json.post.comments.map((c: any) => c.id)).toEqual(['k1']);
    const n = DB.raw.prepare('SELECT COUNT(*) AS n FROM community_comments').get() as any;
    expect(n.n).toBe(1);
  });

  it('[WP9 잔여] ETag changes when only a comment changes', async () => {
    await call('POST', 'type=board', { action: 'upsertPost', post: { id: 'p', title: 'T', content: 'c', createdAt: '2026-11-05T00:00:00Z' } });
    const first = await call('GET', 'type=board&summary=1');
    await call('POST', 'type=board', { action: 'addComment', postId: 'p', comment: { text: 'hi' } });
    const second = await call('GET', 'type=board&summary=1', undefined, { 'If-None-Match': first.etag! });
    expect(second.status).toBe(200);
    expect(second.etag).not.toBe(first.etag);
  });

  it('[WP9 잔여] rate limit: 6th new post / 21st comment in 10 min from one IP → 429', async () => {
    const ip = { 'CF-Connecting-IP': '9.9.9.9' };
    for (let i = 0; i < 5; i++) {
      const r = await call('POST', 'type=board', { action: 'upsertPost', post: { id: `n${i}`, title: 't', content: 'c' } }, ip);
      expect(r.status).toBe(200);
    }
    const blocked = await call('POST', 'type=board', { action: 'upsertPost', post: { id: 'n5', title: 't', content: 'c' } }, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.json).toMatchObject({ ok: false, error: 'rate_limited', bucket: 'post' });
    // 기존 글을 다시 저장(조회수·추천)하는 건 새 글 한도에 걸리지 않는다
    const resave = await call('POST', 'type=board', { action: 'upsertPost', post: { id: 'n0', title: 't', content: 'c', views: 9 } }, ip);
    expect(resave.status).toBe(200);
    // 다른 IP는 영향 없음
    const other = await call('POST', 'type=board', { action: 'upsertPost', post: { id: 'z', title: 't', content: 'c' } }, { 'CF-Connecting-IP': '8.8.8.8' });
    expect(other.status).toBe(200);

    for (let i = 0; i < 20; i++) {
      const r = await call('POST', 'type=board', { action: 'addComment', postId: 'n0', comment: { text: `c${i}` } }, ip);
      expect(r.status).toBe(200);
    }
    const c21 = await call('POST', 'type=board', { action: 'addComment', postId: 'n0', comment: { text: 'x' } }, ip);
    expect(c21.status).toBe(429);
    // 저장된 키에 IP 원문이 남지 않는다
    const keys = (DB.raw.prepare('SELECT key FROM rate_limits').all() as any[]).map((r) => r.key).join(' ');
    expect(keys).not.toContain('9.9.9.9');
  });

  it('[Step A] saves v2 in replay_detail, omits from summary list, and strips if > 512KB', async () => {
    const fakeV2 = {
      format: 2,
      engineVersion: '2.0.0',
      start: {
        p0PresetKey: 'STARTER_ROVER',
        p1PresetKey: 'STARTER_CHIXIA',
        gameMode: 'MULTIPLAYER',
        p0Deck: null,
        p1Deck: null,
        seed: 12345,
      },
      actions: [{ type: 'ROLL_INITIATIVE' }],
      finalFingerprint: 'abc123fp',
    };

    const replayData = {
      id: 'rep-v2-test',
      timestamp: Date.now(),
      gameMode: 'MULTIPLAYER',
      totalTurns: 3,
      winner: 0,
      p0Leader: { nameKr: '방랑자', artUrl: '', level: 1, element: 'Spectro' },
      p1Leader: { nameKr: '치샤', artUrl: '', level: 1, element: 'Fusion' },
      p0Hp: 15,
      p1Hp: 0,
      p0Name: 'Player1',
      p1Name: 'Player2',
      logs: [{ id: '1', turn: 1, text: 'Battle start' }],
      v2: fakeV2,
    };

    // 1. 정상 크기 저장
    const saveRes = await call('POST', 'type=replays', replayData);
    expect(saveRes.status).toBe(200);
    expect(saveRes.json.ok).toBe(true);

    // 2. 목록 조회 시 v2가 없어야 함 (요약본)
    const listRes = await call('GET', 'type=replays');
    expect(listRes.status).toBe(200);
    const itemInList = listRes.json.replays.find((r: any) => r.id === 'rep-v2-test');
    expect(itemInList).toBeDefined();
    expect(itemInList.v2).toBeUndefined();

    // 3. 상세 조회 시 v2가 포함되어야 함
    const detailRes = await call('GET', 'type=replays&id=rep-v2-test');
    expect(detailRes.status).toBe(200);
    expect(detailRes.json.id).toBe('rep-v2-test');
    expect(detailRes.json.v2).toEqual(fakeV2);

    // 4. 512KB 초과 시 v2 탈락 테스트
    const largeDummy = 'x'.repeat(520 * 1024);
    const largeReplayData = {
      ...replayData,
      id: 'rep-v2-large',
      v2: { ...fakeV2, padding: largeDummy },
    };
    const largeSaveRes = await call('POST', 'type=replays', largeReplayData);
    expect(largeSaveRes.status).toBe(200);

    const largeDetailRes = await call('GET', 'type=replays&id=rep-v2-large');
    expect(largeDetailRes.status).toBe(200);
    expect(largeDetailRes.json.id).toBe('rep-v2-large');
    expect(largeDetailRes.json.v2).toBeUndefined();
  });

  it('[WP8 버그 수정] keeps a small v2 even when the logs make the request larger than 512KB', async () => {
    // 실제 한 판: 로그(보드 스냅샷 포함) 약 0.4~0.5MB + v2 수 KB
    const bigLogs = Array.from({ length: 400 }, (_, i) => ({ id: `l${i}`, turn: 1, text: 'x'.repeat(1500) }));
    const v2 = {
      format: 2,
      engineVersion: 'v2.2',
      start: { p0PresetKey: 'STARTER_ROVER', p1PresetKey: 'STARTER_CHIXIA', gameMode: 'MULTIPLAYER', p0Deck: null, p1Deck: null, seed: 1 },
      actions: Array.from({ length: 120 }, () => ({ type: 'DRAW_CARDS', playerIndex: 0 })),
      finalFingerprint: 'fp1-abc-def-1',
    };
    const body = { id: 'rep-big-logs', timestamp: Date.now(), gameMode: 'MULTIPLAYER', totalTurns: 6, winner: 0, logs: bigLogs, v2 };
    expect(JSON.stringify(body).length).toBeGreaterThan(512 * 1024);
    const res = await call('POST', 'type=replays', body, { 'CF-Connecting-IP': '5.5.5.5' });
    expect(res.status).toBe(200);
    const detail = await call('GET', 'type=replays&id=rep-big-logs');
    expect(detail.json.v2).toEqual(v2);
  });
});

// 2026-11-12 게시판 권한: 비밀번호는 응답에 싣지 않고, 수정·삭제·공지는 서버가 확인한다
describe('community API board permissions', () => {
  const owned = { id: 'own', title: 'T', content: '본문', password: 'pw1', createdAt: '2026-11-05T00:00:00Z' };

  it('never returns post or comment passwords (list, summary, single)', async () => {
    await call('POST', 'type=board', { action: 'upsertPost', post: owned });
    await call('POST', 'type=board', { action: 'addComment', postId: 'own', comment: { id: 'c1', text: 'hi', password: 'cpw' } });
    for (const q of ['type=board', 'type=board&summary=1', 'type=board&postId=own']) {
      const r = await call('GET', q);
      const text = JSON.stringify(r.json);
      expect(text).not.toContain('pw1');
      expect(text).not.toContain('cpw');
    }
    const one = await call('GET', 'type=board&postId=own');
    expect(one.json.post.hasPassword).toBe(true);
    expect(one.json.post.comments[0].hasPassword).toBe(true);
  });

  it('secret post body is sent only with the right password header', async () => {
    await call('POST', 'type=board', { action: 'upsertPost', post: { ...owned, isSecret: true, deckCode: 'D' } });
    const list = await call('GET', 'type=board');
    expect(list.json.posts[0]).toMatchObject({ content: '', locked: true });
    expect(list.json.posts[0].deckCode).toBeUndefined();
    const wrong = await call('GET', 'type=board&postId=own', undefined, { 'X-Board-Password': 'nope' });
    expect(wrong.json.post.locked).toBe(true);
    const right = await call('GET', 'type=board&postId=own', undefined, { 'X-Board-Password': 'pw1' });
    expect(right.json.post).toMatchObject({ content: '본문', deckCode: 'D' });
    expect(right.json.post.locked).toBeUndefined();
  });

  it('edit/delete need the password or the admin key', async () => {
    await call('POST', 'type=board', { action: 'upsertPost', post: owned });

    // 다른 사람: 본문을 바꾸려 해도 그대로, 삭제는 403
    await call('POST', 'type=board', { action: 'upsertPost', post: { ...owned, password: undefined, content: '변조' } });
    expect((await call('GET', 'type=board&postId=own')).json.post.content).toBe('본문');
    expect((await call('POST', 'type=board', { action: 'deletePost', postId: 'own' })).status).toBe(403);
    expect((await call('POST', 'type=board', { action: 'deletePost', postId: 'own', auth: { password: 'x' } })).status).toBe(403);

    // 주인: 비밀번호를 보내면 수정되고, 비밀번호 필드를 안 보내도 기존 비밀번호가 유지된다
    await call('POST', 'type=board', { action: 'upsertPost', post: { ...owned, password: undefined, content: '수정' }, auth: { password: 'pw1' } });
    expect((await call('GET', 'type=board&postId=own')).json.post).toMatchObject({ content: '수정', hasPassword: true });

    // 관리자 키로 삭제
    expect((await call('POST', 'type=board', { action: 'deletePost', postId: 'own', auth: { adminKey: ADMIN_KEY } })).status).toBe(200);
    expect((await call('GET', 'type=board&postId=own')).json.post).toBeNull();
  });

  it('only the admin key can publish a notice', async () => {
    await call('POST', 'type=board', { action: 'upsertPost', post: { id: 'fake', title: '가짜 공지', content: 'x', isNotice: true, category: 'NOTICE' } });
    expect((await call('GET', 'type=board&postId=fake')).json.post).toMatchObject({ isNotice: false, category: 'GENERAL' });
    expect((await call('GET', 'type=board&lobby=1')).json.latestNotice).toBeNull();

    await call('POST', 'type=board', {
      action: 'upsertPost',
      post: { id: 'real', title: '공지', content: 'y', isNotice: true, category: 'NOTICE' },
      auth: { adminKey: ADMIN_KEY },
    });
    expect((await call('GET', 'type=board&lobby=1')).json.latestNotice.id).toBe('real');
  });

  it('without permission only likes/views move, by at most +1', async () => {
    await call('POST', 'type=board', { action: 'upsertPost', post: { ...owned, likes: 2, views: 5 } });
    await call('POST', 'type=board', { action: 'upsertPost', post: { ...owned, password: undefined, likes: 999, views: 0, title: '변조' } });
    expect((await call('GET', 'type=board&postId=own')).json.post).toMatchObject({ likes: 3, views: 5, title: 'T' });
  });

  it('comment edit/delete need the comment password; verify answers without leaking it', async () => {
    await call('POST', 'type=board', { action: 'upsertPost', post: { id: 'p', content: 'x' } });
    await call('POST', 'type=board', { action: 'addComment', postId: 'p', comment: { id: 'c1', text: 'hi', password: 'cpw' } });

    expect((await call('POST', 'type=board', { action: 'updateComment', postId: 'p', commentId: 'c1', text: '변조' })).status).toBe(403);
    expect((await call('POST', 'type=board', { action: 'deleteComment', postId: 'p', commentId: 'c1' })).status).toBe(403);
    const upd = await call('POST', 'type=board', { action: 'updateComment', postId: 'p', commentId: 'c1', text: '수정', auth: { password: 'cpw' } });
    expect(upd.json.comment).toMatchObject({ text: '수정', hasPassword: true });
    expect(upd.json.comment.password).toBeUndefined();

    expect((await call('POST', 'type=board', { action: 'verify', postId: 'p', commentId: 'c1', auth: { password: 'no' } })).json.ok).toBe(false);
    expect((await call('POST', 'type=board', { action: 'verify', postId: 'p', commentId: 'c1', auth: { password: 'cpw' } })).json.ok).toBe(true);
    expect((await call('POST', 'type=board', { action: 'verify', auth: { adminKey: 'wrong' } })).json.ok).toBe(false);
    expect((await call('POST', 'type=board', { action: 'verify', auth: { adminKey: ADMIN_KEY } })).json.isAdmin).toBe(true);

    await call('POST', 'type=board', { action: 'deleteComment', postId: 'p', commentId: 'c1', auth: { password: 'cpw' } });
    expect((await call('GET', 'type=board&postId=p')).json.post.comments).toEqual([]);
  });
});

// 2026-11-12 점검 11번: 텔레메트리 기록은 빈도 제한, 같은 id 덮어쓰기 금지, 큰 덱 요약은 저장하지 않음
describe('telemetry API limits', () => {
  async function postTelemetry(body: unknown, ip = '1.1.1.1') {
    const tele = await import('../functions/api/telemetry');
    const request = new Request('https://x.test/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
      body: JSON.stringify(body),
    });
    const res: Response = await (tele.onRequest as any)({ request, env: { DB } });
    return res.status;
  }
  const rec = (id: string, extra: object = {}) => ({ id, winnerIndex: 0, p0Leader: 'a', p1Leader: 'b', totalTurns: 3, ...extra });

  it('keeps the first record for an id and drops oversized deck summaries', async () => {
    expect(await postTelemetry(rec('m1', { p0Leader: 'first' }))).toBe(200);
    expect(await postTelemetry(rec('m1', { p0Leader: 'forged' }))).toBe(200);
    await postTelemetry(rec('m2', { p0DeckSummary: { big: 'x'.repeat(5000) } }));
    const rows = DB.raw.prepare('SELECT id, p0_leader, p0_deck_summary FROM battle_telemetry ORDER BY id').all() as any[];
    expect(rows.find((r) => r.id === 'm1').p0_leader).toBe('first');
    expect(rows.find((r) => r.id === 'm2').p0_deck_summary).toBeNull();
  });

  it('rate limits one IP after 30 records per 10 minutes', async () => {
    for (let i = 0; i < 30; i++) expect(await postTelemetry(rec('r' + i), '9.9.9.9')).toBe(200);
    expect(await postTelemetry(rec('r30'), '9.9.9.9')).toBe(429);
    expect(await postTelemetry(rec('other'), '8.8.8.8')).toBe(200);
  });
});
