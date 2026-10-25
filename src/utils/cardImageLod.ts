/**
 * 카드 이미지 LOD(밀맵) 자동 선택.
 *
 * 원본 카드 이미지(~1000px+)를 100px 안팎으로 줄여 그리면 브라우저의 단순 보간 때문에
 * 자글거리고 흐려진다. `scripts/make_card_lods.py` 가 만든 단계별 고품질 축소본 중
 * "실제 화면 크기(DPR 반영) 이상 중 가장 작은 것"을 골라 <img> 에 적용한다.
 * 화면 배율/창 크기가 바뀌면 ResizeObserver 로 다시 선택한다.
 * 해당 LOD 가 없으면(404) 자동으로 원본으로 되돌린다.
 */
const ORIG_PREFIX = '/cards/card_images/';
const LOD_PREFIX = '/cards/card_images_lod/';
const LOD_WIDTHS = [256, 512, 900];

interface LodImg extends HTMLImageElement {
  __lodOrig?: string;
  __lodCur?: string;
  __lodRO?: ResizeObserver;
}

function toLod(orig: string, width: number): string {
  const dot = orig.lastIndexOf('.');
  const base = dot > -1 ? orig.slice(0, dot) : orig;
  return base.replace(ORIG_PREFIX, `${LOD_PREFIX}${width}/`) + '.webp';
}

function pickWidth(renderedCssPx: number): number | null {
  const need = renderedCssPx * Math.max(1, window.devicePixelRatio || 1);
  for (const w of LOD_WIDTHS) {
    if (w >= need * 0.92) return w;
  }
  return null; // 원본 사용
}

function shouldSkipLod(img: HTMLElement): boolean {
  if (img.getAttribute('data-no-lod') === 'true') return true;
  if (img.closest?.('[data-no-lod="true"], .card-detail-view, .card-preview-panel, .card-large-preview, .modal-preview')) {
    return true;
  }
  return false;
}

function apply(img: LodImg) {
  const attr = img.getAttribute('src') || '';
  // React 등이 원본으로 src 를 바꾼 경우 새 원본 기록
  if (attr.includes(ORIG_PREFIX) && attr !== img.__lodCur) {
    img.__lodOrig = attr;
  }
  const orig = img.__lodOrig;
  if (!orig) return;

  // 상세 보기 패널이나 고해상도 표시가 필요한 영역은 LOD 적용 제외 (항상 최고 화질 원본 유지)
  if (shouldSkipLod(img)) {
    if (img.getAttribute('src') !== orig) {
      img.__lodCur = orig;
      img.setAttribute('src', orig);
    }
    return;
  }

  const rect = img.getBoundingClientRect();
  if (rect.width < 1) return;

  const w = pickWidth(rect.width);
  const target = w ? toLod(orig, w) : orig;
  if (target === img.__lodCur || (target === orig && attr === orig)) return;

  const probe = new Image();
  probe.decoding = 'async';
  probe.onload = () => {
    // 그 사이 원본이 바뀌었으면 무시
    if (img.__lodOrig !== orig) return;
    img.__lodCur = target;
    img.setAttribute('src', target);
  };
  probe.onerror = () => {
    if (img.__lodOrig !== orig) return;
    img.__lodCur = orig;
    if (img.getAttribute('src') !== orig) img.setAttribute('src', orig);
  };
  probe.src = target;
}

function watch(img: LodImg) {
  const attr = img.getAttribute('src') || '';
  if (!attr.includes(ORIG_PREFIX) && !img.__lodOrig) return;
  if (!img.__lodRO) {
    img.__lodRO = new ResizeObserver(() => apply(img));
    img.__lodRO.observe(img);
  }
  apply(img);
}

export function installCardImageLod() {
  if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;

  const scan = (root: ParentNode) => {
    root.querySelectorAll?.('img').forEach((el) => watch(el as LodImg));
  };

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.target instanceof HTMLImageElement) {
        const img = m.target as LodImg;
        if (img.getAttribute('src') === img.__lodCur) continue; // 우리가 바꾼 것
        watch(img);
      } else if (m.type === 'childList') {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLImageElement) watch(n as LodImg);
          else if (n instanceof HTMLElement) scan(n);
        });
      }
    }
  });

  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src'],
  });
  scan(document);
}
