// Cloudflare Pages Functions - mc.sldark.com API Edge Proxy
// 클라이언트의 /api/sldark/... 요청을 mc.sldark.com/api/... 로 프록시

interface Env {}

export const onRequest: PagesFunction<Env> = async (context) => {
  const request = context.request;
  const url = new URL(request.url);

  // /api/sldark/... -> https://mc.sldark.com/api/...
  const targetPath = url.pathname.replace(/^\/api\/sldark/, '/api');
  const targetUrl = `https://mc.sldark.com${targetPath}${url.search}`;

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const headers = new Headers(upstreamResponse.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    headers.set('Cache-Control', 'public, max-age=3600'); // 1시간 캐시

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Proxy request failed', details: String(error) }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
