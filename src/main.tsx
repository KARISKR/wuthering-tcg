import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installCardImageLod } from './utils/cardImageLod'

// [WP4] 배포 후 예전 화면을 열어둔 사용자가 사라진 JS 청크(예: 이전 해시의 GameBoard)를 요청해
// 동적 import가 실패하면 한 번만 새로고침해서 최신 버전을 받는다. (무한 반복 방지: 30초 안에 재발하면 무시)
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'wtcg-chunk-reload-at';
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last < 30_000) return;
  sessionStorage.setItem(KEY, String(Date.now()));
  event.preventDefault();
  window.location.reload();
});

// [WP3] 전투 화면 카드(CardView·손패·슬롯·존·멀리건)는 <CardArt>가 처음부터 srcSet으로 축소본을 요청하고
// data-no-lod로 아래 관찰자에서 빠진다. 덱 빌더·도감 등 나머지 화면의 <img>만 기존 방식(사후 교체)으로 남겨둔다.
installCardImageLod()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
