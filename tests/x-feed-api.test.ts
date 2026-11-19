import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseLatestTweetFromSyndicationHtml, onRequest } from '../functions/api/x-feed';

describe('X feed API (/api/x-feed)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses the newest tweet from __NEXT_DATA__ and strips trailing t.co link', () => {
    const mockNextData = {
      props: {
        pageProps: {
          timeline: {
            entries: [
              {
                content: {
                  tweet: {
                    id_str: '111111111111',
                    created_at: 'Mon Nov 10 09:00:00 +0000 2026',
                    full_text: '이전 고정 트윗입니다 https://t.co/old123',
                    user: { name: '【공식】UCP 카드 게임', screen_name: 'ucp_cardgame' },
                  },
                },
              },
              {
                content: {
                  tweet: {
                    id_str: '222222222222',
                    created_at: 'Thu Nov 19 12:00:00 +0000 2026',
                    full_text: '신규 부스터 팩 카드 공개 안내! https://t.co/new456',
                    user: { name: '【공식】UCP 카드 게임', screen_name: 'ucp_cardgame' },
                    entities: {
                      media: [{ media_url_https: 'https://pbs.twimg.com/media/sample.jpg' }],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };
    const html = `<html><head></head><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(mockNextData)}</script></body></html>`;

    const post = parseLatestTweetFromSyndicationHtml(html);
    expect(post).not.toBeNull();
    expect(post!.id).toBe('222222222222');
    expect(post!.text).toBe('신규 부스터 팩 카드 공개 안내!');
    expect(post!.url).toBe('https://x.com/ucp_cardgame/status/222222222222');
    expect(post!.mediaUrl).toBe('https://pbs.twimg.com/media/sample.jpg');
  });

  it('returns fallback cleanly when syndication is rate-limited and no D1 cache exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Rate limit exceeded', { status: 429 }))
    );

    const res = await onRequest({
      request: new Request('https://example.com/api/x-feed'),
      env: {},
    } as unknown as Parameters<typeof onRequest>[0]);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; source: string; post: { id: string; handle: string; url: string } };
    expect(body.ok).toBe(true);
    expect(body.source).toBe('fallback');
    expect(body.post.handle).toBe('ucp_cardgame');
    expect(body.post.id).toBe('2122873482635776453');
    expect(body.post.url).toBe('https://x.com/ucp_cardgame/status/2122873482635776453');
  });
});
