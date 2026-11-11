/**
 * Wuthering Waves TCG Service Worker
 * - 정적 리소스(폰트, 카드 이미지, 배경, 오디오, 이펙트): Cache-First (로컬 초고속 서빙)
 * - HTML 및 JS 번들: Network-First (최신 업데이트 보장)
 * - API: 서비스 워커를 거치지 않음
 *
 * [WP4] 변경 사항
 * - 캐시를 둘로 분리: STATIC_CACHE(이름 고정, 배포해도 유지) / APP_CACHE(버전마다 교체)
 *   → 앱 버전을 올려도 카드·오디오를 사용자가 다시 받지 않음
 * - text/html 응답은 정적 에셋 경로에 저장하지 않음 (없는 파일에 index.html이 캐시되던 문제 방지)
 * - 네트워크 실패 시 undefined를 반환하지 않고 원래 오류를 그대로 전달
 * - Range 요청(<audio> 스트리밍, 206 응답)은 가로채지 않음
 */

// 앱 코드 캐시 버전: 배포 때 올려도 STATIC_CACHE는 지워지지 않음
const APP_CACHE = 'wtcg-app-v2.3.1';
// 정적 에셋 캐시: 파일명이 같은 에셋을 강제로 교체해야 할 때만 이름을 바꿈
const STATIC_CACHE = 'wtcg-static-v2';

// 캐시 우선 서빙 대상 정적 자산 경로 패턴
const STATIC_ASSET_PATTERNS = [
  /\/fonts\//,
  /\/images\//,
  /\/icons\//,
  /\/cards\//,
  /\/audio\//,
  /\/effects\//,
  /favicon\.svg/,
  /manifest\.webmanifest/,
];

const isCacheable = (resp) => {
  if (!resp || resp.status !== 200) return false;
  const type = resp.headers.get('content-type') || '';
  return !type.includes('text/html');
};

self.addEventListener('install', () => {
  // 새 서비스 워커 설치 즉시 활성화 대기 건너뜀
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 이전 버전의 앱 캐시만 정리 (정적 에셋 캐시는 유지)
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== APP_CACHE && key !== STATIC_CACHE).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // GET 요청만 캐싱 처리 (POST, PUT, WebSocket 통신 등은 건너뜀)
  if (req.method !== 'GET') return;

  // 같은 출처가 아닌 요청, API는 항상 네트워크 직접 통신
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // <audio>/<video>의 Range 요청은 브라우저 HTTP 캐시에 맡김 (206 부분 응답은 Cache Storage에 맞지 않음)
  if (req.headers.has('range')) return;

  // 1. 폰트, 카드 일러스트, 사운드, 배경 이미지, 이펙트: Cache-First
  const isStaticAsset = STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(url.pathname));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResp) => {
        if (cachedResp && isCacheable(cachedResp)) return cachedResp;
        // 네트워크 오류는 그대로 전달 → <img onError>가 정상적으로 재시도/대체 처리
        return fetch(req).then((netResp) => {
          if (isCacheable(netResp)) {
            const respClone = netResp.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, respClone));
          }
          return netResp;
        });
      })
    );
    return;
  }

  // 2. HTML, JS 청크 등: Network-First (오프라인일 때만 캐시)
  event.respondWith(
    fetch(req)
      .then((netResp) => {
        // HTML 문서는 탐색 요청일 때만 저장 (JS 청크 경로에 HTML이 저장되는 것 방지)
        const type = (netResp && netResp.headers.get('content-type')) || '';
        const okToStore = netResp && netResp.status === 200 &&
          (req.mode === 'navigate' || !type.includes('text/html'));
        if (okToStore) {
          const respClone = netResp.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(req, respClone));
        }
        return netResp;
      })
      .catch(() => caches.match(req).then((cached) => cached || Response.error()))
  );
});
