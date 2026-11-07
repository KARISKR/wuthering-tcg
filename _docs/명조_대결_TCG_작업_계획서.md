# 명조: 대결 TCG 작업 계획서

2026-11-06 · Chloe

## 사용 방법과 작업 순서

이 문서는 9개 작업 패키지(WP)로 나뉘며, 각 WP는 다른 세션이나 도구에 통째로 넘겨도 작업할 수 있게 대상 파일, 단계, 완료 기준을 담았습니다. 하나의 세션에는 WP 하나만 맡기는 것을 권장합니다(토큰 절약, 변경 범위 통제). 파일·행 번호는 2026-11-06 업로드된 소스 기준입니다.

| WP | 내용 | 규모 | 선행 WP | 상태 |
| --- | --- | --- | --- | --- |
| WP1 | 서버 요청 절감 | 소 | 없음 | 완료 (2026-11-06) |
| WP2 | 오디오 미리 받기 개편 | 중 | 없음 | 완료 (2026-11-06) |
| WP3 | 카드 이미지 표시 개편 | 중 | 없음 | 완료 (2026-11-07 덱 선택 시점 미리 받기까지) |
| WP4 | 서비스 워커·라우팅·테스트 | 소 | 없음 | 완료 (2026-11-06) |
| WP5 | 캐릭터별 공격 모션 | 중 | WP2 권장(미리 받기 큐 재사용) | 완료 (격돌·연격·리플레이 적용) |
| WP6 | 시드 난수와 결정성 | 중 | WP4(테스트 실행기) | 완료 (2026-11-07, 리플레이 v2 `{시드, 시작 인자, 액션}` 기록·재생 포함) |
| WP7 | 엔진 이벤트화 | 대 | WP6 | 완료 (2026-11-07, Antigravity 작업 + END_TURN 중복 방지 마무리) |
| WP8 | GameBoard 분해 | 대 | WP7 | 완료 (2026-11-07, 단계 A~F, GameBoard 608줄. 검토에서 나온 연출 이벤트·리플레이 크기 버그 수정 완료 — CHANGES 13장) |
| WP9 | 커뮤니티 데이터 정규화 | 중 | 없음 | 완료 (2026-11-07 댓글 행 분리·작성 빈도 제한까지) |

**권장 순서:** WP1 → WP2 → WP3 → WP4 → WP5 → WP6 → WP7 → WP8 → WP9. WP1~WP5는 서로 독립적이라 순서를 바꿔도 됩니다.

**공통 규칙 (모든 WP)**

- 변경하기 전 `npm run build`가 통과하는 상태에서 시작하고, 끝낼 때도 통과해야 합니다.
- 게임 규칙(판정, 대미지, 카드 효과) 결과가 바뀌면 안 됩니다. WP6~WP8은 이를 테스트로 검증합니다.
- 멀티플레이는 PeerJS 방 만들기 방식을 유지합니다(서버 전환 보류). AI전·튜토리얼은 로컬 엔진 유지.
- iOS 전용 대응은 하지 않습니다. 오디오는 현재 ogg/mp3 그대로 씁니다.
- 한 WP가 끝나면 이 표의 상태를 갱신합니다.
- **모든 WP는 아래 「재발 방지 규칙」과 「제출 전 자가 점검」을 지켜야 완료로 인정합니다.** 점검 명령의 실제 출력을 보고서에 붙이지 않은 항목은 미완료로 봅니다.

## 진행 현황 (2026-11-06)

소·중 규모 7개(WP1~WP6, WP9)를 코드에 반영했습니다. `npm test` 32개와 `npm run build`가 통과했고, 브라우저 실행 확인은 남아 있습니다. 파일별 변경 전후는 `CHANGES_2026-11-06.md`에 있습니다(코드 안 변경 지점은 `[WP번호]` 주석).

**완료된 것**

- [x] WP1 서버 요청 절감: 하트비트 20초, 방 만료 60초, 방 목록 12초(탭 숨김 시 중단), 접속자 핑 5분(전투 중 중단)
- [x] WP2 오디오: 다운로드 큐(동시 2개·낮은 우선순위), 필드 캐릭터만 보이스 로드, 보이스 메모리 상한 6명, 로비에서 전투 BGM 미리 버퍼링
- [x] WP3 카드 이미지: 전투 화면 `<CardArt>`(srcSet + 재시도→원본→이름 표시), 축소본 목록 자동 생성, 미리 받기 크기 일치, BP01-074 PNG → webp
- [x] WP4: 서비스 워커 캐시 분리·HTML 오저장 방지·Range 통과, SPA 폴백 제거 + 404.html, 배포 후 청크 오류 자동 새로고침, Vitest + 기존 테스트 스크립트 19개 통합
- [x] WP5: 스프라이트 24장 적용(격돌·연격·리플레이), 타격음·결과 타이밍을 스프라이트에 맞춤, 실패 시 기존 검기
- [x] WP6(부분): `src/engine/rng.ts` 시드 난수, id 결정적 생성, AI 200판 결정성 테스트
- [x] WP9: 커뮤니티·방 목록을 한 건 = 한 행 테이블로, 기존 데이터 자동 이전(원본 유지), 응답 형식 동일

- [x] (2026-11-07) 로비 개편: 시안대로 레이아웃 교체, 멀티배틀 일러스트, 튜토리얼 배너 첫 방문만, 모바일 가로 전용 배치 (`CHANGES` 9장)
- [x] (2026-11-07) 메뉴 화면 정리: 카드 썸네일 축소본 36곳(추천 덱 화면 모바일 6.4MB → 1.05MB), 덱 화면 3개 공통 탭, 강조색 앰버로 통일, 중복 닫기 버튼 정리, 모바일 공유 덱 1열, 룰북 영상 가이드 탭 이동 (`CHANGES` 10장)
- [x] (2026-11-07) 스프라이트 생성기 GUI: `python gui.py`로 브라우저 편집 화면 (캐릭터·색·강도·빛 번짐·도장 편집, 3단계 실시간 미리보기, 내보내기). 설정은 `fx_settings.json`에 저장되어 명령줄과 공유 (`attack-fx-generator-gui.zip`)

**남은 작업**

- [ ] 브라우저 실행 확인: AI전 한 판, 격돌 3단계 연출과 타격음, 연격·리플레이, 멀티 방 목록, 게시판·덱 이전 확인 (`CHANGES` 문서 6장)
- [ ] 원본에서 이미 실패하던 엔진 테스트 5개 확인 (의도된 동작인지 버그인지)
- [x] WP6: 엔진 `Math.random`/`Date.now` 금지 lint + `tests/engine-purity.test.ts` (2026-11-07). 선공 주사위는 `SET_INITIATIVE` 액션에 값이 기록되어 재생 가능
- [x] WP6 잔여: 리플레이 v2 `{seed, 시작 인자, actions}` → `WP8_WP6_작업지시서_2026-11-07.md` 단계 A (2026-11-07 완료)
- [x] WP9 잔여: 댓글 `community_comments` 행 분리·묘비 삭제, IP별 작성 빈도 제한 `rate_limits` (2026-11-07)
- [x] WP3 잔여: 덱 선택 창·멀티 대기실에서 덱이 정해지면 카드 미리 받기 (2026-11-07)
- [x] WP7 엔진 이벤트화 (2026-11-07)
- [x] WP8 단계 B: GameBoard 분해 (`BattleOverlayHost`, `PlayerHandDock`, `TacticalConsoleSidebar` 추출 완료, 2026-11-07)
- [x] WP8 단계 C: BattleStore 분리 (Zustand 분리, `shallowEqual`, `useBattleStore` 연동 완료, 2026-11-07)
- [x] WP8 단계 D: 연출 큐 뼈대 (`FxQueue`, `FxQueueHost`, `fxRegistry`, `EFFECT_DRAW` 이벤트 및 단위테스트 5개 완료, 2026-11-07)
- [x] WP8 단계 E: 연출 하나씩 옮기기 & 필드 정리 (순수 연출 4개 필드 삭제, UI 직접 읽기 0줄, 5개 연출 fxQueue 통합, 2026-11-07)
- [x] WP8 단계 F: 화면 컴포넌트 정리 + 리플레이 통합 (2026-11-07 완료: BattleLayout, ReplaySource, BattleReplayV2Stage, GameBoard 588줄)

**계획과 달라진 점**

- WP5: 등록표·무기별 CSS 기본 연출은 만들지 않음. 스프라이트가 9키 모두 있어 실패 시 기존 검기로 대체.
- WP6: 엔진 함수마다 시드를 넘기지 않고, 게임 시작 때 시드를 설정하는 엔진 전역 난수(`rng.ts`)로 구현. id용 값은 난수 시퀀스를 쓰지 않아 id를 몇 개 만들어도 결과가 바뀌지 않음.
- WP9: 테이블을 종류별로 나누지 않고 `community_items(kind, id)` 하나로, 방은 `mp_rooms`. 테이블 생성·데이터 이전은 API가 첫 요청 때 자동으로 함.

## WP1. 서버 요청 절감

**목표:** Pages Functions 요청과 D1 쓰기를 줄여 무료 한도(하루 요청 10만, D1 쓰기 10만 행) 안에서 처리 가능한 판수를 수천 판 수준으로 늘립니다.

**대상 파일:** `src/utils/visitorStats.ts`, `functions/api/stats.ts`, `src/services/roomDirectoryService.ts`, `src/components/MultiplayerLobbyModal.tsx`, `functions/api/rooms.ts`

**단계**

1. (완료, 파일 전달됨) 접속자 핑 60초 → 5분, 전투 화면(`#battle-stage`, `#m-battle-stage`, `#m-battle`)에서는 핑 중단, 탭 복귀 동기화는 2분 간격 제한. 서버 접속 판정 90초 → 10분, 만료 삭제는 요청 20회에 1회, 일일 방문자 SUM은 `visit` 요청에서만.
2. 방장 하트비트: `roomDirectoryService.ts`의 `setInterval` 7000ms → 20000ms.
3. 방 만료 시간: `rooms.ts`의 `ROOM_TTL_MS` 30000 → 60000 (하트비트 간격의 3배로 유지).
4. 방 목록 새로고침: `MultiplayerLobbyModal.tsx` 약 249행의 4500ms → 12000ms. 수동 새로고침 버튼은 그대로 둠.
5. 방 목록을 보는 모달이라도 탭이 숨겨지면(`document.hidden`) 폴링을 건너뜁니다.
6. (선택, WP9와 함께 해도 됨) `rooms.ts`가 방 목록 전체를 `community_data` 한 행에 덮어쓰는 방식을 `rooms` 테이블(방 1개 = 1행)로 바꿉니다. 하트비트는 `UPDATE rooms SET updated_at=? WHERE room_code=?` 한 줄이 됩니다.

**완료 기준**

- 방 생성 → 다른 브라우저에서 목록에 12초 안에 표시, 방장 탭을 닫으면 60초 안에 목록에서 사라짐.
- 접속자 수가 0으로 깜빡이지 않음.
- 배포 후 일주일, Cloudflare 대시보드의 Functions 요청 수와 D1 쓰기 행 수를 배포 전과 비교.

## WP2. 오디오 미리 받기 개편

**목표:** 전투 진입 직후 오디오 요청을 150개 이상에서 10개 안팎으로 줄여 BGM 끊김을 없앱니다.

**대상 파일:** `src/utils/soundEffects.ts`(548–633행 `preloadAllCustomSounds`·`preloadCharacters`, 755–1012행 `loadCustomServerFile`), `src/components/GameBoard.tsx`(787–802행 미리 받기 useEffect), `src/utils/bgmManager.ts`

**현재 문제**

- `GameBoard` 787행 useEffect가 양쪽 리더·서포터에 **캐릭터 덱 전체**의 캐릭터 보이스(캐릭터당 11개 카테고리 × 최대 3파일, 약 1.7MB)와 핵심 효과음 13개 카테고리를 동시 개수 제한 없이 `fetch`합니다.
- 의존 배열이 `[gameState.players]`라 상태가 바뀔 때마다 다시 실행됩니다(중복 요청은 막히지만 낭비).
- 같은 순간 `bgmManager.setMode('battle')`이 2~5MB ogg를 처음부터 받기 시작합니다.

**단계**

1. `soundEffects.ts`에 작은 다운로드 큐를 만듭니다: 동시 2개, `fetch(url, { priority: 'low' })`, 우선순위 2단계(high → 즉시, low → 큐). `loadCustomServerFile`의 `fetch`는 큐를 거치게 합니다.
2. `preloadAllCustomSounds`를 두 단계로 나눕니다.
    - 즉시(high): `clash_reveal`, `clash`, `card_deal`, `draw`, 양쪽 리더의 `char_opening_*`.
    - 큐(low): 나머지 시스템 효과음, 필드에 나온 캐릭터(리더·서포터)의 `attack_cost0~2`, `hurt`.
3. `preloadCharacters`에서 `characterDeck` 캐릭터는 제외합니다. 대신 캐릭터가 슬롯에 등장하거나 교체될 때(리더·서포터 변경 감지) 그 캐릭터만 큐에 넣습니다.
4. `victory`, `defeat`, `low_hp`, `idle`, `levelup`, `switch`는 첫 재생 요청 때 로드하거나 큐의 맨 뒤로 보냅니다. 로드 전 재생 요청은 기존 합성음 대체 로직을 그대로 씁니다.
5. `GameBoard` 787행 useEffect의 의존 배열을 필드 캐릭터 이름 목록을 문자열로 합친 값으로 바꿉니다(예: `fieldCharsKey`).
6. 전투 BGM: `bgmManager`에 `prepareBattleTrack()`을 추가해 덱 선택·방 대기 화면에서 다음 전투 트랙을 정하고 별도 `Audio` 객체로 `preload='auto'` 합니다. `setMode('battle')`은 그 트랙을 재생합니다.
7. 메모리 상한: `customAudioBuffers`에 캐릭터 보이스가 6명분을 넘으면 가장 오래 안 쓴 캐릭터부터 버립니다(전투 종료 시에도 정리).

**완료 기준**

- 개발자도구 Network, 전투 진입 후 3초: `/audio/` 요청 10개 이하, 동시 진행 2개 이하(BGM 제외).
- "Fast 4G" 제한에서 전투 진입 시 BGM 끊김 없음.
- 첫 격돌 때 격돌·카드 오픈 효과음이 합성음이 아닌 실제 음원으로 나옴.

## WP3. 카드 이미지 표시 개편

**목표:** 전투에서 검은 카드가 나오지 않게 하고, 카드 1장당 다운로드를 1번으로 줄입니다.

**대상 파일:** `src/components/CardView.tsx`(191–200행, 303–314행 이미지), `src/utils/cardImageLod.ts`, `src/main.tsx`(`installCardImageLod` 호출), `src/utils/cardImagePreloader.ts`, 카드 아트를 그리는 나머지 컴포넌트(`HandView`, `CharacterSlot`, `ZoneCardStack`, `MulliganModal` 등 `artUrl` 사용처)

**현재 문제**

- `CardView`의 `onError`가 `display: none`을 걸어 한 번 실패하면 검은 배경만 남습니다. 재시도 없음.
- 원본(장당 약 200KB)을 먼저 받기 시작한 뒤 `cardImageLod.ts`의 MutationObserver가 축소본을 별도로 받고 나서야 `src`를 바꿉니다.
- `preloadBattleCards`는 512px를 받지만 전투 카드 크기에서는 대부분 256px가 선택됩니다.
- 900px LOD는 192장 중 149장만 있어, 나머지 43장은 요청할 때마다 실패합니다.
- `BP01-074` 2장은 `artUrl`이 1.7MB PNG를 가리킵니다(같은 이름의 webp 존재).

**단계**

1. `src/utils/cardImageLod.ts`에 `lodSrcSet(artUrl)` 함수를 만듭니다. 빌드 때 생성한 LOD 목록(`scripts/make_card_lods.py` 결과)을 보고 존재하는 크기만 `.../256/x.webp 256w, .../512/x.webp 512w, .../900/x.webp 900w`로 돌려줍니다.
2. 공용 `<CardArt>` 컴포넌트를 만듭니다: `src`=256px LOD, `srcSet`=1번 결과, `sizes`=호출처가 넘기는 표시 크기(예: 손패 `120px`, 필드 `160px`, 확대 보기는 원본).
3. `<CardArt>`의 실패 처리: 1차 실패 → 500ms 후 같은 주소 재시도 → 2차 실패 → 원본 `artUrl` → 3차 실패 → 카드 이름·비용이 보이는 대체 화면. `display: none`은 쓰지 않습니다.
4. `CardView` 두 곳과 `artUrl`을 직접 `<img>`에 넣는 컴포넌트를 `<CardArt>`로 바꿉니다. 상세 보기(`.card-detail-view`, `.modal-preview` 등)는 원본 유지.
5. `main.tsx`에서 `installCardImageLod()` 호출을 제거합니다(모든 사용처 교체 후).
6. `cardImagePreloader.ts`: 미리 받기 크기를 실제 표시와 맞추고(256px, 고해상도 화면은 512px), 호출 시점을 덱 확정 시(덱 선택 완료, 멀티 방 입장 완료)로 앞당깁니다.
7. `officialCards.ts`의 `BP01-074` 2장 `artUrl`을 `.webp`로 바꾸고, PNG 원본은 배포 폴더에서 뺍니다.
8. 없는 900px LOD 43장은 `make_card_lods.py`로 생성하거나, 1번 목록에서 빠지도록 둡니다.

**완료 기준**

- 전투 진입 시 카드 1장당 이미지 요청 1회(원본 요청 0회).
- "Slow 4G" + 일부 요청 차단(개발자도구 Request blocking)에서도 검은 카드 없이 재시도 또는 대체 화면 표시.
- 모든 카드가 이전과 같은 화질로 보임(자글거림 없음).

## WP4. 서비스 워커·라우팅·테스트

**목표:** 배포해도 카드·오디오 캐시가 유지되고, 없는 파일은 404가 나며, 테스트를 한 번에 돌릴 수 있게 합니다.

**대상 파일:** `public/sw.js`, `public/_redirects`, `public/_headers`, `src/main.tsx`, `package.json`, `scripts/test_*.ts`

**단계: 서비스 워커 (`public/sw.js`)**

1. 캐시를 두 개로 나눕니다. `STATIC_CACHE = 'wtcg-static-v1'`(고정, `/cards/`·`/audio/`·`/images/`·`/fonts/`)과 `APP_CACHE = 'wtcg-app-<버전>'`. `activate`에서는 `APP_CACHE` 구버전만 지웁니다.
2. 저장 조건에 `content-type`이 `text/html`이 아닐 것을 추가합니다(에셋 경로에 HTML이 저장되는 것 방지).
3. 정적 에셋 경로의 `.catch(() => cachedResp)`를 제거하고 오류를 그대로 던집니다(지금은 `undefined`가 반환됨).
4. `Range` 헤더가 있는 요청(`<audio>`)은 `respondWith` 하지 않고 브라우저에 맡깁니다.

**단계: 라우팅**

5. 앱은 해시 라우팅만 씁니다. `public/_redirects`의 `/* /index.html 200`을 삭제하고 간단한 `public/404.html`을 추가합니다. (배포 전 외부에서 `도메인/경로` 형태 링크를 공유한 적이 없는지 확인)
6. `main.tsx`에 `window.addEventListener('vite:preloadError', () => location.reload())`를 추가합니다. 배포 후 구버전 화면이 없어진 JS 청크를 요청하면 한 번 새로고침합니다(무한 반복 방지용 sessionStorage 플래그 포함).

**단계: 테스트**

7. Vitest를 설치하고 `npm test`를 추가합니다.
8. `scripts/test_*.ts` 중 엔진 규칙을 검증하는 것들을 `tests/engine/*.test.ts`로 옮깁니다. `console.log` 확인을 `expect`로 바꿉니다.
9. `package.json`의 `deploy:cf`를 `npm test && npm run build && wrangler pages deploy dist`로 바꿉니다.
10. 루트의 PDF, `src/engine/gameEngine.ts.end.txt`·`.decide.txt`를 저장소에서 정리합니다.

**완료 기준**

- `도메인/cards/없는파일.webp` 요청이 404.
- 서비스 워커 버전을 올려 배포해도, 한 번 본 카드는 네트워크 요청 없이 표시(개발자도구에 `(ServiceWorker)`).
- `npm test` 통과, 테스트가 실패하면 배포 스크립트가 멈춤.

## WP5. 캐릭터별 공격 모션 + 스프라이트 제작 규격

**목표:** 격돌 승리 시 모두 같은 검기 한 줄이 나오던 것을, 승자 캐릭터별 고유 공격 연출로 바꿉니다. 엔진은 수정하지 않습니다.

**대상 파일:** `src/components/ClashAnimationOverlay.tsx`(125–175행 단계 타이머, 약 356행·529행 검기 `div`), `src/components/ComboStrikeOverlay.tsx`, `src/components/BattleReplayStage.tsx`, 신규 `src/components/attackMotions/`, 신규 `public/effects/attack/`

**현재 구조:** 격돌 연출은 SET_WAIT(0ms) → REVEAL(800ms) → COLLIDE(2400ms) → SLASH(3400ms) → RESULT(4400ms) 5단계입니다. SLASH 시작 시 승자 보이스(`playCharacterAttack`), 180ms 뒤 타격음(`playDamage`)이 나오고, 화면에는 `animate-blade-slash-left/right` 검기만 지나갑니다. 승자 리더는 `winnerLeader`, 캐릭터 키는 `getCharacterKey()`(`soundEffects.ts` 84행)로 구합니다.

**설계**

- 등록표 `src/components/attackMotions/registry.ts`: 캐릭터 키 → `{ component, durationMs, impactMs, sprite? }`. 찾는 순서는 카드 코드 → 캐릭터 키 → 무기(`getWeaponByCharacter`: 직검·대검·권총·증폭기) → 기본(현재 검기).
- 캐릭터 키(9개): `jinhsi` 금희, `camellya` 카멜리아, `sanhua` 산화, `yangyang` 양양, `chixia` 치샤, `encore` 앙코, `shorekeeper` 파수인, `rover_male`·`rover_female` 방랑자.
- 공용 컴포넌트 `<AttackMotion character side="left|right" />`: 등록표를 찾아 그립니다. 스프라이트가 아직 로드되지 않았으면 무기별 CSS 연출로 대체합니다.
- 스프라이트 재생은 `<SpriteEffect>`(canvas + `requestAnimationFrame`)가 담당합니다. 왼쪽 승자는 그대로, 오른쪽 승자는 `scaleX(-1)`로 뒤집습니다.

**단계**

1. `registry.ts`, `AttackMotion.tsx`, `SpriteEffect.tsx`와 무기별 기본 CSS 연출 4종을 만듭니다(예: 대검 = 내리찍기 + 화면 흔들림, 권총 = 총구 섬광 3연사, 증폭기 = 마법진 + 빛줄기, 직검 = 교차 참격). 파티클이 필요하면 이미 설치된 `canvas-confetti`나 직접 만든 작은 canvas 파티클을 씁니다.
2. `ClashAnimationOverlay` 356행·529행 검기 `div`를 `<AttackMotion>`으로 바꿉니다.
3. 타이머를 등록표 값으로: SLASH → RESULT 간격 = `max(1000, durationMs)`, 타격음(현재 180ms) = `impactMs`.
4. `ComboStrikeOverlay`(연격)에도 같은 `<AttackMotion>`을 씁니다.
5. `BattleReplayStage`의 격돌 연출에도 같은 컴포넌트를 씁니다.
6. 스프라이트 미리 받기: 덱 확정 시 양쪽 덱 캐릭터의 스프라이트를 WP2의 low 큐에 넣습니다.
7. 캐릭터를 하나씩 추가합니다. 등록하지 않은 캐릭터는 무기별 기본 연출이 나오므로 언제 멈춰도 깨지지 않습니다.

**스프라이트 제작 규격**

| 항목 | 규격 |
| --- | --- |
| 파일 | `public/effects/attack/<캐릭터키>.webp` + 같은 이름의 `.json` |
| 프레임 크기 | 384 × 384px (화면 표시 약 300px, 고해상도 화면 대비) |
| 프레임 수·속도 | 12~24프레임, 24fps (0.5~1.0초) |
| 배치 | 격자, 한 줄 최대 6칸, 왼쪽 위부터 오른쪽→아래 순 |
| 배경·방향 | 투명 배경, 왼쪽에서 오른쪽으로 공격하는 방향 |
| 포맷·용량 | WebP(알파), 품질 82. 완성본 64~597KB (생성기 --scale·--quality로 조절) |
| JSON | `{ frameWidth, frameHeight, frames, columns, fps, impactFrame }` (`impactFrame` = 타격음을 낼 프레임) |

영상으로 만든 연출을 스프라이트로 바꾸는 예 (ffmpeg, ImageMagick, cwebp):

```bash
ffmpeg -i jinhsi.mov -vf "fps=24,scale=384:384" frames/%03d.png
magick montage frames/*.png -tile 6x -geometry +0+0 -background none sheet.png
cwebp -q 80 -alpha_q 80 sheet.png -o public/effects/attack/jinhsi.webp
```

**완료 기준**

- 등록된 캐릭터는 고유 연출, 미등록 캐릭터는 무기별 기본 연출이 나옴. 승자가 오른쪽이면 좌우 반전.
- 스프라이트 파일을 지워도(로드 실패) 격돌이 멈추지 않고 기본 연출로 진행.
- 타격음이 스프라이트의 타격 프레임과 맞음. 리플레이에서도 같은 연출.

### 완성된 스프라이트 적용 방법

스프라이트 24장(8종 × 3단계, 방랑자 남·여는 복사본 포함 30장)은 `attack-fx.zip`의 `sprites/`에 있고, 아래 순서로 붙이면 됩니다. 위 "단계"의 무기별 CSS 연출은 스프라이트 로드 실패 시 대체용입니다(없으면 기존 검기 유지).

1. **파일 배치:** `sprites/`의 `.webp`, `.json`, `attack_fx_manifest.json`을 모두 `public/effects/attack/`에 복사합니다. `public/_headers`에 `/effects/*` 1년 캐시 규칙을, `public/sw.js`의 정적 에셋 패턴에 `/effects/`를 추가합니다.
2. **단계 선택:** 격돌은 `clashResult.damageDealt`, 연격은 `ComboStrikeEffect.comboCount`로 고릅니다.
3. **캐릭터 키:** `getCharacterKey(winnerLeader.characterName || winnerLeader.nameKr)`. `null`(일반 카드 등)이면 기존 검기를 씁니다.
4. **재생 컴포넌트:** 아래 `SpriteEffect`를 `src/components/attackMotions/SpriteEffect.tsx`로 추가합니다.
5. **배치:** 패자 카드 컨테이너(`ClashAnimationOverlay` 약 356행·529행 검기 `div`가 있는 relative 영역) 안에 둡니다. 스프라이트 프레임 안의 대상 중심은 (276, 176) / 384이므로 이 점을 카드 중심에 맞춥니다. 오른쪽 플레이어(P1)가 이기면 `flip`(좌우 반전)하고 x 기준점이 108/384로 바뀝니다.
6. **타이밍:** SLASH 단계 시작과 동시에 재생합니다. 타격음 `playDamage`의 고정 지연 180ms를 `impactFrame / fps × 1000`ms로 바꾸고(예: 금희 T3 = 11/24초 ≈ 458ms), SLASH → RESULT 간격(현재 1000ms)을 `max(1000, frames / fps × 1000 + 100)`으로 계산합니다.
7. **미리 받기:** 덱 확정 시 양쪽 리더 캐릭터의 `t1~t3`를 `loadSheet()`로 미리 불러둡니다(WP2 완료 후에는 low 큐로). 제때 못 불러오면 `onError`에서 대체 연출로 넘어갑니다.
8. **연격:** `ComboStrikeOverlay`에서 `attackerName` → 캐릭터 키, `comboCount` → 단계로 같은 컴포넌트를 재생합니다. 연격 전용 이펙트가 생기면 파일명만 `키_c1~c3`처럼 바꿉니다.
9. **리플레이:** `BattleReplayStage`의 격돌 연출에도 같은 배치 코드를 씁니다.
10. **다시 뽑았을 때:** 파일명이 같아서 1년 캐시와 서비스 워커 때문에 사용자가 옛 파일을 볼 수 있습니다. 교체할 때마다 `SpriteEffect.tsx`의 `FX_VERSION`을 올립니다.

| 상황 | 사용할 파일 |
| --- | --- |
| 격돌 대미지 1~2 / 연격 1단계 | `<키>_t1` |
| 격돌 대미지 3~4 / 연격 2단계 | `<키>_t2` |
| 격돌 대미지 5 이상 / 연격 3단계 이상 | `<키>_t3` |
| 대미지 0(무승부·패스) | 재생하지 않음 |

`SpriteEffect.tsx` (재생기 + 단계 계산):

```tsx
import { useEffect, useRef } from 'react';

export type SheetMeta = {
  frameWidth: number; frameHeight: number; frames: number;
  columns: number; fps: number; impactFrame: number;
};

const FX_VERSION = '1'; // 스프라이트를 다시 뽑으면 올림
const BASE = '/effects/attack/';
const cache = new Map<string, Promise<{ img: HTMLImageElement; meta: SheetMeta }>>();

export const tierForDamage = (d: number) => (d >= 5 ? 3 : d >= 3 ? 2 : d >= 1 ? 1 : 0);
export const tierForCombo = (n = 1) => Math.min(3, Math.max(1, n));

export function loadSheet(name: string) {
  let p = cache.get(name);
  if (!p) {
    p = (async () => {
      const meta: SheetMeta = await fetch(`${BASE}${name}.json?v=${FX_VERSION}`).then((r) => r.json());
      const img = new Image();
      img.src = `${BASE}${name}.webp?v=${FX_VERSION}`;
      await img.decode();
      return { img, meta };
    })();
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p;
}

export function SpriteEffect(props: {
  name: string; size: number; flip?: boolean;
  onImpact?: () => void; onEnd?: () => void; onError?: () => void;
}) {
  const { name, size, flip = false } = props;
  const ref = useRef<HTMLCanvasElement>(null);
  const cb = useRef(props);
  cb.current = props;

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    loadSheet(name)
      .then(({ img, meta }) => {
        const cv = ref.current;
        if (cancelled || !cv) return;
        cv.width = cv.height = Math.round(size * dpr);
        const ctx = cv.getContext('2d')!;
        const t0 = performance.now();
        let impacted = false;
        const tick = (now: number) => {
          const f = Math.floor(((now - t0) / 1000) * meta.fps);
          ctx.clearRect(0, 0, cv.width, cv.height);
          if (f >= meta.frames) { cb.current.onEnd?.(); return; }
          if (!impacted && f >= meta.impactFrame) { impacted = true; cb.current.onImpact?.(); }
          const sx = (f % meta.columns) * meta.frameWidth;
          const sy = Math.floor(f / meta.columns) * meta.frameHeight;
          ctx.drawImage(img, sx, sy, meta.frameWidth, meta.frameHeight, 0, 0, cv.width, cv.height);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      })
      .catch(() => cb.current.onError?.());
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [name, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, transform: flip ? 'scaleX(-1)' : undefined, pointerEvents: 'none' }}
    />
  );
}
```

`ClashAnimationOverlay` 패자 카드 영역에 넣는 배치 예 (기존 검기 `div` 자리):

```tsx
const S = 360; // 표시 크기(px). 카드 크기에 맞춰 조절
const flip = isP1Winner;                 // 오른쪽 승자면 좌우 반전
const ix = (flip ? 384 - 276 : 276) / 384, iy = 176 / 384;
const tier = tierForDamage(clashResult.damageDealt);
const key = getCharacterKey(winnerLeader?.characterName || winnerLeader?.nameKr);

{tier > 0 && key && !fxFailed ? (
  <div className="absolute pointer-events-none z-30"
       style={{ left: `calc(50% - ${S * ix}px)`, top: `calc(50% - ${S * iy}px)` }}>
    <SpriteEffect name={`${key}_t${tier}`} size={S} flip={flip} onError={() => setFxFailed(true)} />
  </div>
) : (
  /* 기존 검기 div */
)}
```

### 생성기와 도장 (다시 만들 때)

스프라이트는 `attack-fx.zip`의 `generator/`로 언제든 다시 만들 수 있습니다. 자세한 내용은 `generator/README.md`에 있습니다.

- **준비:** Python 3.9 이상, `pip install -r requirements.txt`(Pillow, numpy, scipy). Windows·macOS·Linux 모두 동작.
- **실행:** `python generate.py --preview --out ../../public/effects/attack` (전체 약 1분). 일부만: `--chars jinhsi,chixia --tiers 3`. 용량 줄이기: `--scale 0.75 --quality 75`.
- **같은 설정이면 항상 같은 결과**가 나옵니다(시드 고정).

| 바꾸고 싶은 것 | 파일 |
| --- | --- |
| 캐릭터의 무기·속성, 새 캐릭터 | `characters.py` |
| 속성 색 | `characters.py`의 `PALETTES` |
| 단계별 절제 정도 (T1 0.55, T2 0.72, T3 1.0) | `common.py`의 `TONE` |
| 속성 장식 모양 | `common.py`의 `flourish()` |
| 무기별 동작·프레임 수·타격 시점 | `broadblade.py`, `sword.py`, `pistol.py`, `rectifier.py` |
| 직접 그린 모양 섞기 | `stamps.py` + `stamps/` 폴더 |

**도장 사용법**

1. 흰색 모양을 투명(또는 검은) 배경에 그려 `stamps/`에 PNG로 저장합니다. 색은 속성 색으로 자동으로 물들고 빛 번짐도 자동으로 입혀집니다.
2. `stamps.py`의 `STAMPS`에 추가합니다. 키는 캐릭터 키 또는 `'*'`(전체).
3. `python generate.py --chars <키> --preview`로 다시 뽑아 미리보기 GIF로 확인합니다.

```python
STAMPS = {
    'camellya': [
        dict(file='stamps/slash_brush.png', tiers=[3], start=10, frames=9,
             scale=[0.8, 1.15], rotate=[-20, -8], color='main', intensity=1.8, fade='out'),
    ],
    '*': [
        dict(file='stamps/sigil.png', tiers=[3], start=9, frames=12, pos=[276, 200],
             scale=[0.4, 0.9], rotate=[0, 90], color='hot', intensity=1.2, fade='in-out'),
    ],
}
```

항목: `file`(필수), `tiers`, `start`·`frames`(시작·지속 프레임), `pos`·`to`(`[x, y]` 또는 `'impact'`, `to`를 주면 이동), `scale`·`rotate`(숫자 또는 `[시작, 끝]`), `color`(`'main'`·`'hot'`·`'accent'`·`[r, g, b]`), `intensity`, `fade`(`'out'`·`'in-out'`·`'in'`·`'none'`), `flip`. 예시 이미지 2개와 적용 결과(`previews/stamp_demo.gif`)가 함께 들어 있고, `stamps.py`의 예시는 기본으로 꺼져 있습니다.

## WP6. 시드 난수와 결정성

**목표:** 같은 시드와 같은 액션 목록이면 항상 같은 결과가 나오게 합니다. 리플레이를 `{ seed, decks, actions }`만으로 저장·재현할 수 있게 되고, 실전 리플레이를 AI 개선에 그대로 쓸 수 있습니다.

**조사 결과 (생각보다 작음):** 엔진의 `Math.random` 39곳과 `Date.now` 177곳은 대부분 id·로그 시각용입니다. 게임 결과에 영향을 주는 난수는 아래 4곳뿐입니다.

| 위치 | 용도 |
| --- | --- |
| `src/data/cards.ts` 258–268행 `shuffleArray`·`shuffleActionDeck` | 덱 셔플 |
| `src/engine/gameEngine.ts` 2381행, 2439행 | 상대 손패 무작위 선택 |
| `src/components/InitiativeDiceModal.tsx` 196–274행 | 선공 주사위 (멀티는 `INITIATIVE_ROLL`로 결과 전송) |
| `src/engine/aiPlayer.ts` 1569행 | AI 판단 노이즈 (AI 전용, 별도 난수 유지 가능) |

**단계**

1. `src/engine/rng.ts`를 만듭니다: mulberry32 같은 작은 시드 난수 생성기, `next(state) → { value, state }` 형태(순수 함수).
2. `GameState`에 `rng: { seed: number; cursor: number }`과 `idCounter: number`를 추가합니다. `createInitialGameState`(941행)가 시드를 인자로 받게 합니다(없으면 무작위 생성).
3. 셔플·무작위 선택 3곳이 `state.rng`를 쓰고 커서를 올리게 합니다.
4. 주사위: 화면 연출의 굴러가는 숫자는 그대로 두고, 최종값만 `state.rng`에서 뽑아 액션으로 기록합니다.
5. 카드·로그·선택지 id를 `${종류}-${state.idCounter++}` 형태로 바꿉니다. `id`를 비교하는 코드(`seenUpgradeIdRef` 등)가 문자열 형식에 의존하지 않는지 확인합니다.
6. 로그의 `timestamp`는 게임 결과에 영향이 없으므로 남겨도 되지만, 비교 테스트에서는 제외합니다.
7. 멀티: 호스트가 시드를 만들어 게임 시작 상태에 담습니다. 현재는 상태 전체를 보내므로 프로토콜 변경은 없습니다.
8. 대전 기록: `replayManager.ts`에 `{ version, seed, decks, actions[] }` 형식을 추가하고, 재생 시 엔진을 다시 돌려 상태를 만듭니다. 기존 로그 기반 리플레이는 읽기 호환 유지.
9. 결정성 테스트를 `tests/determinism.test.ts`로 추가합니다: AI 대 AI 1,000판을 시드와 함께 기록 → 같은 시드·액션으로 재실행 → 최종 상태(로그 시각 제외) 비교. AI 노이즈는 기록된 액션을 재생하므로 영향 없습니다.
10. 엔진 폴더에서 `Math.random` 사용을 막는 린트 규칙을 `.oxlintrc.json`에 추가합니다(가능한 경우).

**완료 기준**

- 결정성 테스트 1,000판 모두 일치.
- 기존 엔진 테스트 전부 통과(규칙 변경 없음).
- 한 판 대전 기록 크기 10KB 이하.

## WP7. 엔진 이벤트화

**목표:** 모든 게임 조작을 `step(state, action) → { state, events }` 하나로 모으고, 연출은 `events`를 보고 재생하게 합니다. 새 연출을 넣을 때 "엔진에 이벤트 한 줄 + 연출 등록" 두 곳만 고치면 되는 구조가 목표입니다.

**대상 파일:** `src/engine/gameEngine.ts`, 신규 `src/engine/step.ts`·`src/engine/events.ts`, `src/types/tcg.ts`(320–333행 연출용 필드), `src/hooks/useGame.ts`, `src/engine/aiPlayer.ts`(호출부)

**현재 구조:** `useGame.ts`가 엔진 함수 20여 개(`executeMulligan`, `executeDrawPhase`, `upgradeCharacter`, `switchLeader`, `chargeConcerto`, `decideClash`, `setClashCard`, `proceedAfterClashReveal`, `executeComboAttack`, `finishComboStep`, `discardOverflowCards`, `executeEndPhase`, `resolvePendingChoice` 등)를 각각 `setGameState`로 부릅니다. 연출 신호는 `GameState`의 11개 필드(`lastUpgrade`, `lastComboStrike`, `lastEffectDraw`, `deferredEffectDraw(s)`, `lastEffectEvent`, `deferredChoice(s)`, `deferredUpgrade`, `deferredEffectEvent`, `lastClashWinnerIndex`)로 전달되고 화면이 `clear*`로 지웁니다.

**단계**

1. `events.ts`에 이벤트 타입을 정의합니다: `CARD_DRAWN`, `CLASH_REVEAL`, `CLASH_RESULT`, `DAMAGE`, `HEAL`, `UPGRADE`, `LEADER_SWITCH`, `COMBO_STRIKE`, `EFFECT_TRIGGERED`, `CHOICE_REQUIRED`, `PHASE_CHANGED`, `GAME_OVER`. 각 이벤트는 `id`(WP6의 `idCounter`), `playerIndex`, 필요한 데이터를 가집니다.
2. `Action` 타입을 정의합니다. 기존 엔진 함수 하나당 액션 하나(예: `{ type: 'UPGRADE', playerIndex, slotName, cardId, discardIds }`).
3. `step.ts`: 액션을 기존 함수로 연결하고, 처음에는 호출 전후 상태를 비교해 이벤트를 만듭니다(`lastUpgrade` id가 바뀌면 `UPGRADE` 이벤트 등). 엔진 내부는 아직 건드리지 않습니다.
4. `useGame.ts`의 핸들러들이 모두 `dispatch(action)` 하나를 거치게 합니다. `dispatch`는 상태를 갱신하고 이벤트를 구독자에게 넘깁니다. WP6의 대전 기록은 여기서 액션을 쌓습니다.
5. 엔진 내부에서 직접 이벤트를 발행하도록 한 종류씩 옮깁니다. 순서: `HEAL` → `DAMAGE` → `UPGRADE` → `COMBO_STRIKE` → 나머지. 하나를 옮길 때마다 3번의 비교 방식에서 그 종류를 제거합니다.
6. 멀티: 호스트는 `SYNC_GAME_STATE`에 `events`를 함께 보냅니다. 게스트는 받은 이벤트로 연출을 재생합니다(상태 전체 전송은 유지).
7. `last*`·`deferred*` 필드는 WP8에서 화면이 이벤트로 옮겨간 뒤 삭제합니다(이 WP에서는 유지).

**완료 기준**

- `useGame.ts`에서 엔진 함수를 직접 부르는 곳이 `dispatch` 한 곳뿐.
- WP6 결정성 테스트와 기존 엔진 테스트 모두 통과.
- 테스트에서 판마다 이벤트 목록을 기록해, 승리·패배·대미지 합계가 최종 상태와 일치하는지 검증.

## WP8. GameBoard 분해

**상세 작업지시서:** `WP8_WP6_작업지시서_2026-11-07.md` (단계 A~F, 실측 행 번호 포함). 아래 원안보다 지시서가 우선합니다.

**목표:** `GameBoard.tsx`(5,422줄, useState 60개, useEffect 40개)를 상태 저장소, 연출 큐, 연결 어댑터, 화면 컴포넌트로 나눠 800줄 이하로 줄입니다. 싱글·멀티·리플레이가 같은 연출 코드를 씁니다.

**선행 조건:** WP7 완료(이벤트 사용 가능).

**대상 파일:** `src/components/GameBoard.tsx`, `src/hooks/useGame.ts`, 각종 `*Overlay.tsx`, `src/components/BattleReplayStage.tsx`, 신규 `src/battle/`(store, fxQueue, adapters, view)

**단계**

1. **연결 어댑터:** `BattleSource` 인터페이스(`getState()`, `subscribe(onState, onEvents)`, `dispatch(action)`)를 만들고 구현 3개를 둡니다: `LocalSource`(싱글·AI), `PeerSource`(멀티 호스트/게스트, 현재 1490–1580행 로직 이전), `ReplaySource`(WP6 대전 기록 재생).
2. **상태 저장소:** `useSyncExternalStore` 기반 작은 저장소(또는 zustand). 타이머·연결 상태도 여기로. 컴포넌트는 `useBattle(selector)`로 필요한 조각만 구독합니다.
3. **연출 큐:** `fxQueue`가 이벤트를 받아 순서대로 재생합니다. 등록표 `fxRegistry: Record<이벤트타입, { component, blocking, durationMs }>`. `blocking` 연출이 끝날 때까지 다음 입력을 막습니다. 현재 흩어진 순서 조건(1349, 1404, 1846, 1886, 4521, 4534행 등)을 여기로 모읍니다.
4. **연출 옮기기:** 오버레이를 하나씩 `fxRegistry`로 옮기고, 그때마다 해당 `last*`/`deferred*` 필드, 감지 useEffect, `clear*` 함수를 삭제합니다. 순서: 격돌 → 연격 → 레벨업 → 효과 드로우 → 효과 알림 → 나머지.
5. **화면 컴포넌트:** `BattleLayout`, `PlayerArea`(슬롯·덱·묘지), `HandArea`, `ActionBar`, `TimerBar`, `OverlayHost`(연출 큐 출력), `ModalHost`(선택·멀리건·업그레이드 모달)로 나누고 `React.memo`를 적용합니다.
6. **리플레이 통합:** `BattleReplayStage`가 `ReplaySource` + 같은 화면 컴포넌트를 쓰도록 바꿉니다(별도 연출 구현 제거).
7. 각 단계마다 `sampleReplays.ts`의 리플레이로 연출 순서를 눈으로 비교하고, AI전·멀티를 한 판씩 해봅니다.

**완료 기준**

- `GameBoard.tsx` 800줄 이하. `GameState`에서 **순수 연출 필드 4개**(`lastUpgrade`, `lastEffectEvent`, `deferredUpgrade`, `deferredEffectEvent`) 삭제, 화면은 나머지 7개를 직접 읽지 않음 (2026-11-07 수정: 3개는 규칙 상태, 4개는 엔진 진행 관문이라 삭제하면 규칙이 바뀜. `WP8_WP6_작업지시서` 1-1 참고).
- 새 연출 추가 = 엔진 이벤트 1줄 + `fxRegistry` 1항목으로 동작(예시로 `HEAL` 연출 추가해 확인).
- React Profiler에서 카드 1장을 낼 때 다시 그려지는 컴포넌트가 해당 영역으로 한정.
- 리플레이 화면이 실전과 같은 연출을 보여줌.

## WP9. 커뮤니티 데이터 정규화

**목표:** 게시판·공유 덱·리플레이·방 목록을 한 건당 한 행으로 저장해, 동시에 쓸 때 글이 사라지는 문제와 D1 행 크기 한도(2MB) 문제를 없앱니다.

**대상 파일:** `schema.sql`, `functions/api/community.ts`, `functions/api/rooms.ts`, `src/utils/feedbackManager.ts`, `src/utils/sharedDecks.ts`, `src/utils/replayManager.ts`, `src/services/roomDirectoryService.ts`

**현재 구조:** `community_data` 테이블에 `type`(board, decks, replays, rooms)마다 JSON 한 행. 글 하나를 쓸 때도 전체를 읽고 → 고치고 → 통째로 다시 씁니다.

**단계**

1. `schema.sql`에 테이블을 추가합니다: `posts`, `comments`(post_id 외래키), `shared_decks`, `replays`(WP6 이후에는 `seed`·`actions_json` 포함), `rooms`. 각각 `id`, `created_at`, `updated_at`과 조회에 쓰는 컬럼 인덱스.
2. 일회성 이전 스크립트 `scripts/migrate_community.ts`: 기존 JSON을 읽어 새 테이블에 행 단위로 넣습니다. 기존 행은 백업으로 남깁니다(`wrangler d1 export`로 사전 백업).
3. `community.ts` API를 행 단위로 바꿉니다: 목록은 `LIMIT/OFFSET`(또는 커서) 페이지, 단건 조회·작성·수정·삭제는 해당 행만. 요청·응답 형식은 기존 클라이언트가 깨지지 않게 유지하거나, 클라이언트 3개 파일을 함께 고칩니다.
4. 조회수·추천수는 `UPDATE ... SET views = views + 1` 한 줄로(읽기-수정-쓰기 금지).
5. `rooms.ts`는 `rooms` 테이블을 씁니다(WP1 6번과 동일). 목록 조회는 `WHERE updated_at > ? AND status != 'CLOSED' ORDER BY created_at DESC LIMIT 50`.
6. 작성 요청에 클라이언트·IP 단위 빈도 제한(예: 1분 3건)을 추가합니다.
7. 이전 확인 후 `community_data`의 board·decks·replays·rooms 행을 삭제합니다.

**완료 기준**

- 두 브라우저에서 동시에 글을 써도 둘 다 남음.
- 게시판 목록 응답 크기가 글 수와 관계없이 한 페이지 분량.
- 기존 글·덱·리플레이가 빠짐없이 보임.

## 재발 방지 규칙 (2026-11-07 WP7·WP8 검토 결과)

WP7·WP8은 1차 제출에서 7가지, 2차 제출에서 3가지 문제가 나왔습니다. 아래 규칙은 그 원인을 하나씩 막기 위한 것입니다. 각 규칙 끝에 막으려는 문제를 적었습니다.

### 1. 패키징
- 제외 대상(`node_modules`, `dist`, `.wrangler`)만 빼고 **루트부터 전체**를 압축합니다. 폴더 목록을 골라 담는 방식은 금지합니다.
- 압축 후 zip 목록을 다시 열어 아래 파일이 모두 있는지 확인하고 출력을 보고서에 붙입니다.
  `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `wrangler.toml`, `schema.sql`, `index.html`, `src/`, `public/`, `functions/`, `tests/`
- 최종 확인: zip을 **빈 폴더에 새로 풀어** `npm ci && npm test && npm run build`가 통과해야 합니다. 작업 폴더에서만 통과하는 것은 인정하지 않습니다.
- (막으려는 문제: 1차 zip에서 루트 파일 20개 누락)

### 2. 상태 전이를 옮길 때
- `step()`으로 옮기기 전에 상태를 바꾸는 코드를 **소스 전체에서** 찾습니다. `useGame.ts`만 보면 안 됩니다.
  `grep -rn "setGameState(" src` 결과를 보고서에 붙이고, 남는 호출은 하나씩 "남는 이유"를 적습니다(현재 허용: 멀티 저장 상태 불러오기, 게스트 동기화).
- `setTimeout` / `setInterval` 안에서 상태를 바꾸는 코드도 찾습니다: `grep -rn -A3 "setTimeout\|setInterval" src/components src/hooks | grep -n "setGameState\|finalize\|execute"`
- 화면 타이머가 하던 진행(예: END_PHASE → 다음 턴)은 **액션 하나로** 만들고, 화면은 그 액션을 `dispatch`만 합니다.
- 액션마다 **허용 단계**를 정합니다. 허용되지 않은 단계에서 들어온 액션은 상태를 바꾸지 않고 무시합니다(같은 액션이 두 번 와도 효과가 두 번 나지 않게). 새 액션을 추가하면 "잘못된 단계에서 보내면 상태가 바뀌지 않는다"는 테스트를 같이 넣습니다.
- (막으려는 문제: GameBoard 타이머 안의 `finalizeEndPhase`, 항복·시간 초과 누락, 2차의 END_TURN 중복 발동)

### 3. 엔진 순수성
- `src/engine/` 안에서는 `Math.random`, `Date.now`, `new Date`, `performance.now`를 쓰지 않습니다. 난수는 `engineRandom()`(규칙)·`aiRandom()`(AI 판단), id는 `engineTick()`·`engineTag()`를 씁니다. 허용 예외는 `rng.ts`의 `newEngineSeed`와 로그 `timestamp`뿐입니다.
- 점검: `grep -rn "Math.random\|Date.now\|new Date\|performance.now" src/engine` → 예외 외 0건이어야 합니다.
- 다른 파일에서 코드를 옮겨 올 때 이 grep을 다시 돌립니다. 복사·붙여넣기로 들어오는 경우가 가장 많습니다.
- (막으려는 문제: `aiPlayer.ts`의 `Math.random()*6` 누락, `step.ts`의 `Date.now()` 복사)

### 4. 테스트
- **결정성 테스트에서 `Math.random`·`Date.now`를 가짜 함수로 덮어씌우지 않습니다.** 덮어씌우면 시드를 안 쓰는 코드를 잡지 못합니다.
- "끝까지 진행" 테스트는 **종료 상태**를 확인합니다.
  - `expect(state.phase).toBe('GAME_OVER')`
  - `expect(loop).toBeLessThan(상한)`: 상한에 걸려 멈춘 것을 실패로 처리합니다.
  - `turn > N`, `length > 0` 같은 최소 조건은 보조로만 씁니다. 그것만으로는 멈춘 게임도 통과합니다.
- 비교 테스트(`A.length === B.length`)에는 **양쪽이 0이 아님**을 같이 확인합니다(0 === 0 거짓 통과 방지).
- 시드 하나로 끝내지 않습니다. 커밋할 테스트는 시드 1개여도 되지만, 제출 전에 **시드 50개 이상**을 같은 진행 코드로 돌려 모두 GAME_OVER에 도달하는지 확인하고 결과(통과 수/전체 수)를 보고서에 적습니다.
- 테스트의 진행 코드(드라이버)는 실제 화면 흐름과 같은 순서로 액션을 보냅니다. 예: END_PHASE에서는 `FINALIZE_END_PHASE`만, 패 버리기는 패가 8장을 넘는 쪽에.
- (막으려는 문제: 1차 1턴 500회 헛돌기 통과, AI 노이즈 미검출, 2차 시드 7777 정지 통과)

### 5. 타입
- `any`, `[key: string]: any`, `as any`, `@ts-ignore`, `@ts-expect-error`로 오류를 우회하지 않습니다. 컴포넌트를 떼어낼 때 Props 타입을 먼저 정의하고 옮깁니다.
- 점검: `grep -rnE ":\s*any\b|as any|\[key: string\]: any|@ts-ignore|@ts-expect-error" src` → 새로 생긴 것 0건. 2026-11-07 기준 `src` 전체 85건(전투 화면·hooks·step은 0건). 작업 전후 개수를 같이 적어 늘지 않았음을 보입니다.
- (막으려는 문제: BattleOverlayHost의 `[key: string]: any`로 타입 불일치가 숨음)

### 6. 보고서
- 보고서는 **계획서가 아니라 실제 코드**를 기준으로 씁니다. 각 완료 항목 옆에 근거를 붙입니다: 파일:행, 또는 명령과 그 실제 출력.
- 숫자(줄 수, 개수, 테스트 수)는 직접 세지 말고 명령 출력을 그대로 붙입니다.
  - 줄 수: `wc -l src/components/GameBoard.tsx`
  - 훅 수: `grep -cE "useState|useEffect" src/components/GameBoard.tsx`
  - 테스트: `npm test` 마지막 5줄
- 이벤트·액션 목록은 "정의함"과 "실제로 발생함"을 따로 적습니다. 실제로 발생하는지는 테스트에서 종류별 개수로 확인합니다.
- 목표를 일부만 달성했으면 **"부분 완료"**라고 쓰고 남은 일을 목록으로 적습니다. "격리 완료", "100% 일치" 같은 단정은 근거 출력이 있을 때만 씁니다.
- (막으려는 문제: 1차 이벤트 목록이 설계 기준, "훅으로 격리 완료" 과장, 2차 "1,549줄"이 실제 1,563줄)

### 제출 전 자가 점검 (보고서 맨 끝에 출력과 함께 붙임)

```bash
# 1) 깨끗한 폴더에서 재현
mkdir /tmp/verify && cd /tmp/verify && unzip -q <제출.zip> && npm ci && npm test && npm run build
# 2) 루트 파일 확인
unzip -l <제출.zip> | grep -E "package(-lock)?\.json|tsconfig(\.app|\.node)?\.json|vite(st)?\.config\.ts|wrangler\.toml|schema\.sql|index\.html"
# 3) 엔진 순수성 (예외 외 0건)
grep -rn "Math.random\|Date.now\|new Date\|performance.now" src/engine
# 4) 직접 상태 쓰기 (남는 것은 이유 기재)
grep -rn "setGameState(" src
# 5) 타입 우회 (기준 85건에서 늘면 안 됨)
grep -rnE ":\s*any\b|as any|\[key: string\]: any|@ts-ignore|@ts-expect-error" src
# 6) 숫자 근거
wc -l src/components/GameBoard.tsx; grep -cE "useState|useEffect" src/components/GameBoard.tsx
```

추가로 게임 흐름을 건드린 WP는:
- 시드 50개 이상 GAME_OVER 도달 결과(통과/전체)
- 브라우저에서 AI전 한 판 끝까지 진행 + 콘솔 오류 0건 (스크린샷 또는 로그)

### 7. 런타임 동등성 (2026-11-07 WP8 검토 결과 추가)
- 정적 검사(줄 수·grep·빌드)만으로는 동작 변화를 잡지 못합니다. WP8에서 효과 알림이 718건에서 0건, 레벨업이 212건에서 545건이 되었는데도 모든 정적 검사를 통과했습니다.
- 기존 필드·함수·형식을 지우거나 바꿀 때는 **바꾸기 전에** 같은 시드 50판 이상으로 옛/새 비교 테스트를 만들고, 차이 0건을 확인한 뒤에만 옛 것을 지웁니다. 화면이 하던 동작(예: CLEAR 액션)도 흉내 냅니다.
- 저장·전송 데이터는 실제 JSON 크기를 측정하고 상한을 테스트로 고정합니다.
- 상세 방법과 요청문: `안티그라비티_작업지시_표준문구.md`

## 다른 세션에 넘길 때 쓰는 요청문 템플릿

새 세션을 열고 최신 소스(zip 또는 저장소)와 함께 아래 문장을 보내세요. `<재발 방지 규칙 섹션>`에는 위 「재발 방지 규칙」 섹션을, `<WP 본문>`에는 해당 WP 섹션을 통째로 붙여넣습니다. 파일 전체를 읽지 말고 적힌 행 주변부터 보라고 하면 토큰이 크게 줄어듭니다.

```markdown
첨부한 것은 내가 만든 웹 TCG(React + Vite, Cloudflare Pages 호스팅) 소스야.
아래 작업 패키지 하나만 수행해줘. 다른 부분은 고치지 마.

규칙:
- 파일을 통째로 읽지 말고, 적힌 파일·행 번호 주변부터 필요한 만큼만 읽어. (행 번호는 약간 달라졌을 수 있음)
- 게임 규칙(판정·대미지·카드 효과) 결과는 바꾸지 마.
- 멀티는 PeerJS 방 만들기 방식 유지, iOS 전용 대응 불필요.
- 작업 전후로 npm run build 통과 확인. 테스트가 있으면 npm test도.
- 아래 「재발 방지 규칙」을 지켜. 특히:
  - 엔진(src/engine)에 Math.random/Date.now 금지, any·ts-ignore로 오류 우회 금지
  - 상태를 바꾸는 코드는 useGame뿐 아니라 src 전체(setTimeout 안 포함)에서 찾아
  - 액션마다 허용 단계를 두고, 잘못된 단계에서 오면 무시
  - 테스트는 Math.random을 가짜로 덮지 말고, 끝까지 진행 테스트는 phase === 'GAME_OVER'와 루프 상한 미도달을 확인
  - 제출 전 시드 50개 이상으로 돌려 전부 끝나는지 확인
- 압축은 node_modules·dist만 빼고 루트 전체. 빈 폴더에 다시 풀어 npm ci && npm test && npm run build까지 확인.
- 끝나면 보고서에 이렇게 정리해줘:
  - 바뀐 파일 목록
  - 완료 기준별 결과 + 근거(파일:행 또는 명령과 실제 출력)
  - 숫자는 직접 세지 말고 명령 출력을 붙일 것
  - 「제출 전 자가 점검」 명령 6개의 실제 출력
  - 못 한 부분은 "부분 완료"로 표시하고 남은 일 목록

<재발 방지 규칙 섹션>

<WP 본문>
```

**세션을 아끼는 팁**

- WP 하나가 끝나면 그 세션은 닫고, 결과 소스로 다음 WP 세션을 새로 엽니다.
- WP7·WP8처럼 큰 작업은 단계 번호 단위로 더 쪼개서 맡깁니다(예: "WP7 1~3번만").
- 끝난 WP는 맨 위 표의 상태를 갱신해 두면 다음 세션에서도 진행 상황을 알 수 있습니다.
