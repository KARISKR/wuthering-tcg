/**
 * Wuthering Waves TCG Service Worker
 * - 정적 리소스(폰트, 카드 이미지, 배경, 오디오): Cache-First (로컬 초고속 서빙)
 * - HTML 및 JS 번들, API: Network-First (최신 업데이트 보장)
 */

const CACHE_NAME = 'wuthering-tcg-v2.2.1';

// 캐시 우선 서빙 대상 정적 자산 경로 패턴
const STATIC_ASSET_PATTERNS = [
  /\/fonts\//,
  /\/images\//,
  /\/icons\//,
  /\/cards\//,
  /\/audio\//,
  /favicon\.svg/,
  /manifest\.webmanifest/,
];

self.addEventListener('install', (event) => {
  // 새 서비스 워커 설치 즉시 활성화 대기 건너뜀
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 이전 버전의 구형 캐시 자동 정리
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // GET 요청만 캐싱 처리 (POST, PUT, WebSocket 통신 등은 건너뜀)
  if (req.method !== 'GET') return;

  // Cloudflare API 및 외부 동적 API는 항상 네트워크 직접 통신
  if (url.pathname.startsWith('/api/')) return;

  // 1. 폰트, 카드 일러스트, 사운드, 배경 이미지: Cache-First 전략 (로컬 캐시에서 즉시 반환)
  const isStaticAsset = STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(url.pathname));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResp) => {
        if (cachedResp) {
          return cachedResp;
        }
        return fetch(req).then((netResp) => {
          if (netResp && netResp.status === 200) {
            const respClone = netResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
          }
          return netResp;
        }).catch(() => cachedResp);
      })
    );
    return;
  }

  // 2. HTML, JS 청크 등: Stale-While-Revalidate 또는 Network-First
  event.respondWith(
    fetch(req)
      .then((netResp) => {
        if (netResp && netResp.status === 200) {
          const respClone = netResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
        }
        return netResp;
      })
      .catch(() => caches.match(req))
  );
});
