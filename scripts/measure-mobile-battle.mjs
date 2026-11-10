// scripts/measure-mobile-battle.mjs
// 모바일 전투 UI 실측 스크립트 (설계서: _docs/모바일_전투UI_반응형_설계서_2026-11-11.md)
//
// 하는 일: 휴대폰처럼 꾸민 Chrome으로 전투 화면까지 자동 진행 → 배율·보드 폭·넘침·글씨 크기·버튼 크기 측정 → 스크린샷/JSON 저장
// 준비:   개발 서버를 먼저 띄운다 (npm run dev). PC에 설치된 Chrome(없으면 Edge)을 사용하므로 브라우저 다운로드 없음.
// 사용:   npm run measure:mobile -- [--url http://localhost:5173] [--sizes 844x390,932x430] [--flow battle|tutorial|replay]
//                                  [--desktop] [--out 폴더] [--headed] [--no-stub]
// 결과:   .measure/mobile-battle/<시각>/  (summary.json, <크기>.json, <크기>_<단계>.png)  ※ .gitignore 대상
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

// ---------- 인자 ----------
const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);

const BASE_URL = arg('url', 'http://localhost:5173');
// 검색어(?layout=phone 등)를 살린 채 해시만 바꾼 주소
const pageUrl = (hash) => {
  const u = new URL(BASE_URL);
  u.hash = hash;
  return u.toString();
};
const SIZES = arg('sizes', '667x375,740x360,844x390,915x412,932x430')
  .split(',')
  .map((s) => s.trim().split('x').map(Number))
  .filter(([w, h]) => w > 0 && h > 0);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.resolve(arg('out', path.join('.measure', 'mobile-battle', stamp)));
const HEADED = flag('headed');
// battle: AI 대전 1턴 보드까지 진행 / tutorial: #tutorial-battle 진입 / replay: #replay-stage 진입
const FLOW = arg('flow', 'battle');
// --desktop: 휴대폰 흉내 없이(마우스·PC UA) 측정 — PC 회귀 확인용
const DESKTOP = flag('desktop');
fs.mkdirSync(OUT, { recursive: true });

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// ---------- 브라우저 내부에서 실행되는 측정 함수 ----------
// 주의: page.evaluate로 직렬화되므로 바깥 변수를 참조하지 않는다.
function measureInPage() {
  const vw = innerWidth;
  const vh = innerHeight;
  const zoomOf = (el) => {
    let z = 1;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const v = parseFloat(getComputedStyle(e).zoom);
      if (v && !isNaN(v)) z *= v;
    }
    return z;
  };
  const transformScaleOf = (el) => {
    let s = 1;
    for (let e = el; e; e = e.parentElement) {
      const m = getComputedStyle(e).transform.match(/matrix\(([^,]+),([^,]+)/);
      if (m) s *= Math.hypot(parseFloat(m[1]), parseFloat(m[2]));
    }
    return s;
  };
  const isHidden = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return true;
    }
    return false;
  };
  const inViewport = (r) => r.width >= 1 && r.height >= 1 && r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;

  // 1) zoom이 걸린 컨테이너 (현재 구조: 중앙 아레나)
  const zoomHost = [...document.querySelectorAll('body *')].find((e) => {
    const z = parseFloat(getComputedStyle(e).zoom);
    return z && Math.abs(z - 1) > 0.001 && e.getBoundingClientRect().width > 0;
  });
  const arenaZoom = zoomHost ? +parseFloat(getComputedStyle(zoomHost).zoom).toFixed(4) : 1;

  // 2) 보드 카드 이미지 영역 (손패 포함) — 폭 비율, 하단 넘침
  const boardRoot = zoomHost || document.body;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, imgCount = 0, minImgW = Infinity;
  boardRoot.querySelectorAll('img').forEach((img) => {
    const r = img.getBoundingClientRect();
    if (r.width < 2 || isHidden(img)) return;
    imgCount++;
    minImgW = Math.min(minImgW, r.width);
    x0 = Math.min(x0, r.left); x1 = Math.max(x1, r.right);
    y0 = Math.min(y0, r.top); y1 = Math.max(y1, r.bottom);
  });
  // 넘침은 이미지 + 글씨 요소 기준 (손패 카드 이름 등 이미지 아래 글씨까지 포함 — 1단계 측정과 같은 기준)
  let contentBottom = y1;
  boardRoot.querySelectorAll('span,p,h1,h2,h3,h4,div,button').forEach((e) => {
    if (![...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) return;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || isHidden(e)) return;
    contentBottom = Math.max(contentBottom, r.bottom);
  });
  const cardArea = imgCount
    ? {
        imgCount,
        left: Math.round(x0),
        right: Math.round(x1),
        width: Math.round(x1 - x0),
        widthRatio: +((x1 - x0) / vw).toFixed(3),
        bottom: Math.round(y1),
        imgBottomOverflowPx: Math.round(Math.max(0, y1 - vh)),
        bottomOverflowPx: Math.round(Math.max(0, contentBottom - vh)),
        smallestImgW: Math.round(minImgW),
      }
    : null;

  // 3) 글씨 크기 (화면에 보이는 텍스트 노드, 글자 수 가중)
  //    effective px = computed font-size × 조상 zoom 곱 × 조상 transform scale
  //    readable = aria-hidden="true" 조상이 없는 글자 (장식 예외 규칙, 설계서 2-3)
  const BUCKETS = ['<6', '6-8', '8-10', '10-11', '11-12', '12-14', '>=14'];
  const bucketOf = (px) => (px < 6 ? '<6' : px < 8 ? '6-8' : px < 10 ? '8-10' : px < 11 ? '10-11' : px < 12 ? '11-12' : px < 14 ? '12-14' : '>=14');
  const newStat = () => ({ chars: 0, under10: 0, min: null, buckets: Object.fromEntries(BUCKETS.map((b) => [b, 0])) });
  const all = newStat();
  const readable = newStat();
  const smallSamples = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const txt = node.textContent.trim();
    const el = node.parentElement;
    if (!txt || !el) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    if (!inViewport(range.getBoundingClientRect()) || isHidden(el)) continue;
    const cssPx = parseFloat(getComputedStyle(el).fontSize);
    const z = zoomOf(el);
    const t = transformScaleOf(el);
    const eff = +(cssPx * z * t).toFixed(2);
    const decorative = !!el.closest('[aria-hidden="true"]');
    for (const s of decorative ? [all] : [all, readable]) {
      s.chars += txt.length;
      s.buckets[bucketOf(eff)] += txt.length;
      if (eff < 10) s.under10 += txt.length;
      if (!s.min || eff < s.min.px) s.min = { px: eff, text: txt.slice(0, 24), cssPx, zoom: +z.toFixed(4) };
    }
    if (!decorative && eff < 10 && smallSamples.length < 15 && !seen.has(txt.slice(0, 20))) {
      seen.add(txt.slice(0, 20));
      smallSamples.push(`${eff}px (css ${cssPx} × zoom ${z.toFixed(3)}${t !== 1 ? ' × t ' + t.toFixed(2) : ''}) "${txt.slice(0, 24)}"`);
    }
  }
  const pct = (s) => (s.chars ? +((100 * s.under10) / s.chars).toFixed(1) : 0);

  // 4) 버튼 터치 영역
  const btnRects = [...document.querySelectorAll('button, [role="button"]')]
    .filter((b) => !isHidden(b))
    .map((b) => b.getBoundingClientRect())
    .filter(inViewport);
  const buttonsUnder44 = btnRects.filter((r) => r.width < 44 || r.height < 44).length;

  // 5) 화면을 덮는 고정 요소 (2%~95% 면적)
  const fixedEls = [...document.querySelectorAll('body *')]
    .filter((e) => getComputedStyle(e).position === 'fixed' && !isHidden(e))
    .map((e) => {
      const r = e.getBoundingClientRect();
      return {
        cls: (typeof e.className === 'string' ? e.className : '').slice(0, 50),
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        areaPct: +((100 * r.width * r.height) / (vw * vh)).toFixed(1),
      };
    })
    .filter((f) => f.areaPct >= 2 && f.areaPct < 95);

  // 6) 세로 차단 안내 표시 여부
  const GUARD_RE = /가로 모드|가로로 회전|가로로 돌려/;
  const guardEl =
    document.querySelector('[data-testid="orientation-guard"]') ||
    [...document.querySelectorAll('body *')].find(
      (e) => getComputedStyle(e).position === 'fixed' && !isHidden(e) && GUARD_RE.test(e.innerText || '')
    );
  const orientationGuardVisible = !!guardEl && !isHidden(guardEl);
  const orientationGuardButtons = orientationGuardVisible
    ? [...guardEl.querySelectorAll('button')].filter((b) => !isHidden(b)).map((b) => b.innerText.replace(/\s+/g, ' ').trim())
    : [];

  return {
    viewport: { w: vw, h: vh, dpr: devicePixelRatio },
    hash: location.hash,
    arenaZoom,
    // 전투 레이아웃 모드 (GameBoard의 data-battle-layout, 3단계부터) / 기존 모바일 모드 클래스
    layoutMode: document.querySelector('[data-battle-layout]')?.getAttribute('data-battle-layout') ?? null,
    mobileBattleClass: !!document.querySelector('.mobile-battle-mode'),
    modalZoom: getComputedStyle(document.documentElement).getPropertyValue('--modal-zoom').trim() || null,
    cardArea,
    text: {
      all: { ...all, under10Pct: pct(all) },
      readable: { ...readable, under10Pct: pct(readable) },
      smallSamples,
    },
    buttons: { visible: btnRects.length, under44: buttonsUnder44 },
    fixedEls,
    orientationGuardVisible,
    orientationGuardButtons,
    docScroll: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
  };
}

// ---------- 한 해상도 측정 ----------
async function launch() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel, headless: !HEADED });
    } catch {
      /* 다음 채널 시도 */
    }
  }
  throw new Error('Chrome/Edge를 찾지 못했습니다. PC에 Chrome 또는 Edge가 설치되어 있어야 합니다.');
}

async function measureSize(browser, W, H) {
  const tag = `${W}x${H}`;
  const ctx = await browser.newContext(
    DESKTOP
      ? { viewport: { width: W, height: H }, deviceScaleFactor: 1 }
      : { viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IPHONE_UA }
  );
  // 로컬 Vite는 Cloudflare Pages Functions(/api/stats, /api/community)를 실행하지 않아 404가 나고,
  // 방문자 통계는 그때 외부 카운터(countapi)로 폴백한다. 측정과 무관한 잡음 + 외부 요청이므로 브라우저 단계에서 빈 응답으로 대체한다.
  // (--no-stub 으로 끄기)
  if (!flag('no-stub')) {
    const json = (body) => (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    // /api/stats는 today·total·online 숫자가 없으면 방문자 위젯이 예외를 던져 화면 전체가 멈추므로 같은 모양으로 응답한다.
    await ctx.route(/\/api\/stats(\?|$)/, json({ today: 1, total: 1, online: 1 }));
    await ctx.route(/\/api\/community(\?|$)/, json({}));
    await ctx.route(/countapi\.mileshilliard\.com/, json({ value: 0 }));
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 160)}`));

  const result = { size: tag, stages: {}, reached: [] };
  const snap = async (name) => {
    await page.screenshot({ path: path.join(OUT, `${tag}_${name}.png`) });
    result.stages[name] = await page.evaluate(measureInPage);
    result.reached.push(name);
  };
  const visible = (text) => page.locator('button', { hasText: text }).first().isVisible().catch(() => false);
  const click = async (text) => {
    const l = page.locator('button', { hasText: text }).first();
    if (await l.isVisible().catch(() => false)) {
      await l.click({ force: true, timeout: 3000 }).catch(() => {});
      return true;
    }
    return false;
  };

  const finish = async () => {
    result.consoleErrorCount = errors.length;
    result.consoleErrors = errors.slice(0, 20);
    fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify(result, null, 1));
    await ctx.close();
    return result;
  };

  if (FLOW === 'tutorial' || FLOW === 'replay') {
    const hash = FLOW === 'tutorial' ? '#tutorial-battle' : '#replay-stage';
    await page.goto(pageUrl(hash), { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(4000);
    await snap(FLOW);
    return finish();
  }

  await page.goto(pageUrl('#battle'), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  await click('AI 봇 대전');
  await page.waitForTimeout(1200);
  await click('대전 시작');
  await page.waitForTimeout(3000);

  // 세로 차단 안내가 떠 있으면 여기서 멈춘다.
  // (강제 클릭을 계속하면 안내 위 버튼이 대신 눌려 안내가 닫히므로 측정이 왜곡됨)
  const guardShown = await page
    .evaluate(() => /가로 모드|가로로 회전|가로로 돌려/.test(document.body.innerText))
    .catch(() => false);
  if (guardShown) {
    await snap('0_orientation_guard');
    result.stoppedAt = 'orientation_guard';
    return finish();
  }

  // 선후공 선택 → 리더 선택 → 멀리건 (순서는 주사위 결과에 따라 다름)
  let leaderDone = false;
  let mulliganDone = false;
  for (let i = 0; i < 40 && !mulliganDone; i++) {
    if (await visible('선공 (FIRST)')) {
      await click('선공 (FIRST)');
      await page.waitForTimeout(1500);
    } else if (!leaderDone && (await visible('출격 확정'))) {
      await snap('1_leader');
      leaderDone = true;
      await click('출격 확정');
      await page.waitForTimeout(2500);
    } else if (await visible('패 유지')) {
      await page.waitForTimeout(1500);
      await snap('2_mulligan');
      await click('패 유지');
      mulliganDone = true;
      await page.waitForTimeout(6000);
    } else {
      await page.waitForTimeout(1000);
    }
  }

  // 드로우 안내가 보드를 가리면 덱을 눌러 닫는다
  await page.waitForTimeout(4000);
  for (let k = 0; k < 3; k++) {
    const deck = page.getByText('클릭하여').first();
    if (await deck.isVisible().catch(() => false)) {
      await deck.click({ force: true }).catch(() => {});
      await page.waitForTimeout(3500);
    }
  }
  await snap('3_board');
  return finish();
}

// ---------- 실행 ----------
const browser = await launch();
const summary = [];
for (const [W, H] of SIZES) {
  try {
    const r = await measureSize(browser, W, H);
    const b = r.stages['3_board'] || r.stages['0_orientation_guard'] || r.stages[FLOW];
    summary.push({
      size: r.size,
      reached: r.reached.join(','),
      layoutMode: b.layoutMode ?? '-',
      mobileClass: b.mobileBattleClass,
      arenaZoom: b.arenaZoom,
      modalZoom: b.modalZoom ? +(+b.modalZoom).toFixed(4) : null,
      cardWidthPct: b.cardArea ? +(b.cardArea.widthRatio * 100).toFixed(1) : null,
      bottomOverflowPx: b.cardArea ? b.cardArea.bottomOverflowPx : null,
      readableUnder10Pct: b.text.readable.under10Pct,
      readableMinPx: b.text.readable.min ? b.text.readable.min.px : null,
      allUnder10Pct: b.text.all.under10Pct,
      buttonsUnder44: `${b.buttons.under44}/${b.buttons.visible}`,
      fixedOverlays: b.fixedEls.length,
      orientationGuard: b.orientationGuardVisible,
      guardButtons: b.orientationGuardButtons.join(' / ') || '-',
      consoleErrors: r.consoleErrorCount,
    });
  } catch (e) {
    summary.push({ size: `${W}x${H}`, error: String(e.message || e).split('\n')[0] });
  }
}
await browser.close();

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ url: BASE_URL, at: new Date().toISOString(), summary }, null, 1));

// 보고서에 그대로 붙일 수 있는 마크다운 표
const cols = ['size', 'layoutMode', 'mobileClass', 'arenaZoom', 'modalZoom', 'cardWidthPct', 'bottomOverflowPx', 'readableUnder10Pct', 'readableMinPx', 'buttonsUnder44', 'fixedOverlays', 'orientationGuard', 'guardButtons', 'consoleErrors'];
console.log(`\n측정 대상: ${BASE_URL} (flow: ${FLOW}${DESKTOP ? ', desktop' : ''})\n결과 폴더: ${OUT}\n`);
console.log(`| ${cols.join(' | ')} |`);
console.log(`|${cols.map(() => '---').join('|')}|`);
for (const s of summary) {
  console.log(s.error ? `| ${s.size} | 오류: ${s.error} |` : `| ${cols.map((c) => s[c]).join(' | ')} |`);
}
