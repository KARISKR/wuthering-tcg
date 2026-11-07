# 🤖 WP7 · WP8 Flash 모델 전용 단계별 작업 지시서 (프롬프트 가이드)

> **작성일**: 2026-11-07  
> **대상 코드베이스**: `C:\Users\dpal4\Desktop\TCG\TCG main` (2026-11-07 업데이트 병합본 기준)  
> **핵심 목적**: 규모가 가장 큰 **WP7(엔진 이벤트화)**과 **WP8(`GameBoard.tsx` 5,428줄 분해)**을 **Flash 모델**에게 맡길 때, 컨텍스트 초과·타입 불일치·기존 기능 파손 없이 한 단계씩 안전하게 완수하도록 설계된 **복사-붙여넣기용 지시문**입니다.

---

## ⚠️ Flash 모델에게 일 시킬 때 반드시 지켜야 할 3대 원칙

1. **절대 WP7이나 WP8 전체를 한 번에 시키지 마세요.**
   - `GameBoard.tsx`는 **5,428줄**, `gameEngine.ts`는 **3,000줄 이상**입니다. 한 번에 통째로 분해하라고 하면 Flash 모델이 중간 코드를 생략(`// ...기존 코드 유지...`)하거나 변수를 누락시켜 빌드가 깨집니다.
2. **아래 7개 단계(WP7-1 ~ WP7-3, WP8-1 ~ WP8-4)를 순서대로 하나씩만 복사해서 지시하세요.**
   - 각 단계는 **파일 1~3개만 수정**하도록 쪼개져 있으며, **정확한 파일명과 줄 번호(`L125~L405` 등)**가 적혀 있어 Flash 모델이 헤매지 않고 즉시 목표 지점만 읽고 고칩니다.
3. **한 단계가 끝나면 반드시 `npm test && npm run build` 통과를 확인한 뒤 새 채팅(또는 `/compact`)으로 다음 단계를 지시하세요.**
   - 모든 단계는 중간에 멈춰도 게임이 100% 정상 작동하도록(점진적 교체 방식) 설계되어 있습니다.

---

## 🗺️ 전체 로드맵 (총 7단계)

| 단계 | 작업명 | 대상 파일 (정확한 줄 번호 포함) | 난이도 | 완료 후 상태 |
| :--- | :--- | :--- | :---: | :--- |
| **WP7-1** | 이벤트·액션 타입 정의 및 `step()` 래퍼 생성 | `src/engine/events.ts`(신규), `src/engine/step.ts`(신규) | ★★☆ | 기존 엔진 수정 없이 모든 조작을 단일 함수로 실행 및 이벤트 추출 가능 |
| **WP7-2** | `useGame.ts`의 `dispatch(action)` 일원화 | `src/hooks/useGame.ts` (`L124~L405`) | ★★☆ | 18개 핸들러가 `dispatch`를 거치며 `{ seed, actions }` 리플레이 기록 자동 누적 |
| **WP7-3** | 이벤트 정합성 & 헤드리스 대전 검증 테스트 | `tests/step-events.test.ts`(신규) | ★☆☆ | WP7 완료 검증 (`DAMAGE`/`HEAL` 이벤트 합계 = 최종 HP 일치 확인) |
| **WP8-1** | `GameBoard` 좌측 단말기 & 우측 콘솔/로그 분리 | `GameBoard.tsx` (`L2556~L2803`, `L3754~L4495`) → 신규 컴포넌트 2개 | ★★☆ | `GameBoard.tsx`에서 **약 1,000줄 즉시 감소** (5,428줄 → ~4,430줄) |
| **WP8-2** | `GameBoard` 상단 바 & 4단 전장 영역 분리 | `GameBoard.tsx` (`L2293~L2551`, `L2816~L3753`) → 신규 컴포넌트 5개 | ★★★ | `GameBoard.tsx`에서 **약 1,200줄 추가 감소** (~4,430줄 → ~3,200줄) |
| **WP8-3** | `GameBoard` 25종 모달·오버레이 호스트 분리 | `GameBoard.tsx` (`L4497~L5425`) → `BattleOverlayHost.tsx` | ★★☆ | `GameBoard.tsx`에서 **약 900줄 추가 감소** (~3,200줄 → ~2,300줄) |
| **WP8-4** | 멀티플레이 P2P 동기화 & 체스클록 타이머 훅 분리 | `GameBoard.tsx` (`L225~L405`, `L1490~L1760`, `L2150~L2250`) → 신규 훅 2개 | ★★★ | `GameBoard.tsx` 핵심 상태·연결 로직 분리 완료 |

---

# 📦 [WP7 단계별 복붙 프롬프트]

---

## 🔹 [WP7-1 프롬프트] 이벤트·액션 타입 정의 및 `step(state, action)` 생성

아래 블록 전체를 복사해서 Flash 모델에게 붙여넣으세요:

```markdown
현재 프로젝트(`C:\Users\dpal4\Desktop\TCG\TCG main`)에서 **WP7-1 (엔진 액션·이벤트 타입 정의 및 step 어댑터 구축)** 작업만 수행해줘. 다른 단계나 다른 파일은 건드리지 마.

### 핵심 규칙
1. 기존 `src/engine/gameEngine.ts`의 함수 시그니처나 게임 규칙(판정, 대미지, 카드 효과)은 절대 바꾸지 마.
2. 파일을 읽을 때는 전체를 다 읽지 말고 아래에 지정한 줄 번호만 읽어.
3. 작업이 끝나면 반드시 `npm test`와 `npm run build`를 실행해서 둘 다 100% 통과하는지 확인해.

### 사전 참조할 위치
- `src/types/tcg.ts`의 `L298~L345` (`HpHistoryEntry`, `GameState` 인터페이스)
- `src/hooks/useGame.ts`의 `L1~L36` 및 `L124~L405` (현재 엔진 함수를 호출하는 18개 핸들러 목록)
- `src/engine/rng.ts` (`engineTick` 함수)

### 수행할 작업

#### 1. `src/engine/events.ts` 신규 생성
다음 타입들을 정의하고 export 해줘:
- `GameEventType`: `'PHASE_CHANGED' | 'CARD_DRAWN' | 'CLASH_REVEAL' | 'CLASH_RESULT' | 'DAMAGE' | 'HEAL' | 'UPGRADE' | 'LEADER_SWITCH' | 'COMBO_STRIKE' | 'EFFECT_TRIGGERED' | 'CHOICE_REQUIRED' | 'GAME_OVER'`
- `GameEvent`:
  - `id: string` (`evt-${engineTick()}` 형식)
  - `type: GameEventType`
  - `turn: number`
  - `playerIndex?: 0 | 1`
  - `payload?: Record<string, unknown>`
- `GameAction`: `useGame.ts`의 핸들러들에 1:1 대응하는 Discriminated Union 타입:
  - `{ type: 'SET_INITIATIVE'; firstPlayerIndex: 0 | 1; roll0: number; roll1: number; choiceDetail?: { winnerIndex: 0 | 1; chosenOrder: 'FIRST' | 'SECOND' } }`
  - `{ type: 'SELECT_STARTING_LEADER'; p0LeaderIdOrName: string; p1LeaderIdOrName?: string }`
  - `{ type: 'MULLIGAN'; p0DiscardIds: string[]; p1DiscardIds?: string[] }`
  - `{ type: 'DRAW_CARDS'; playerIndex?: 0 | 1 }`
  - `{ type: 'UPGRADE'; playerIndex: 0 | 1; targetSlot: 'leader' | 'leftSupport' | 'rightSupport'; upgradeCardId: string; discardIds: string[] }`
  - `{ type: 'SWITCH_LEADER'; playerIndex: 0 | 1; targetSlot: 'leftSupport' | 'rightSupport' }`
  - `{ type: 'CHARGE_CONCERTO'; playerIndex: 0 | 1; cardId: string }`
  - `{ type: 'DECIDE_CLASH'; startClash: boolean }`
  - `{ type: 'SET_CLASH_CARD'; playerIndex: 0 | 1; cardId: string | null; spentConcertoIds?: string[] }`
  - `{ type: 'RESOLVE_CLASH' }`
  - `{ type: 'FORCE_RESOLVE_CLASH' }`
  - `{ type: 'PROCEED_AFTER_CLASH' }`
  - `{ type: 'COMBO_ATTACK'; playerIndex: 0 | 1; cardId: string; spentConcertoIds?: string[]; discardForBonusDmgId?: string; swapSupportSlot?: 'leftSupport' | 'rightSupport' }`
  - `{ type: 'FINISH_COMBO'; playerIndex: 0 | 1 }`
  - `{ type: 'RESOLVE_PENDING_CHOICE'; chosenCardIds: string[] }`
  - `{ type: 'DISCARD_OVERFLOW'; playerIndex: 0 | 1; discardIds: string[] }`
  - `{ type: 'END_TURN' }`
  - `{ type: 'FINISH_EFFECT_DRAW'; completedDrawId?: string }`
  - `{ type: 'CLEAR_LAST_UPGRADE' }`
  - `{ type: 'CLEAR_LAST_COMBO_STRIKE' }`
  - `{ type: 'CLEAR_LAST_EFFECT_EVENT' }`
  - `{ type: 'AI_ACTION_PHASE' }`
  - `{ type: 'AI_COMBO_STEP' }`
  - `{ type: 'AI_DISCARD_OVERFLOW' }`

#### 2. `src/engine/step.ts` 신규 생성
- `export function step(prevState: GameState, action: GameAction): { state: GameState; events: GameEvent[] }` 함수를 구현해.
- 내부에서 `cloneGameState(prevState)`로 복제한 뒤 `useGame.ts`의 각 핸들러(`L125~L405`)와 동일한 로직으로 엔진 함수를 호출해 `nextState`를 구해.
- `diffEvents(prevState, nextState): GameEvent[]` 헬퍼를 만들어 호출 전후 상태를 비교해 이벤트를 생성해:
  - `prevState.phase !== nextState.phase` → `PHASE_CHANGED`
  - `nextState.hpHistory`에 새로 추가된 항목 → `DAMAGE` 또는 `HEAL` (`amount`, `prevHp`, `newHp`, `reason` 포함)
  - `prevState.lastUpgrade?.id !== nextState.lastUpgrade?.id && nextState.lastUpgrade` → `UPGRADE`
  - `prevState.lastComboStrike?.id !== nextState.lastComboStrike?.id && nextState.lastComboStrike` → `COMBO_STRIKE`
  - `prevState.lastEffectDraw?.id !== nextState.lastEffectDraw?.id && nextState.lastEffectDraw` → `CARD_DRAWN`
  - `prevState.lastEffectEvent?.id !== nextState.lastEffectEvent?.id && nextState.lastEffectEvent` → `EFFECT_TRIGGERED`
  - `prevState.clashResult !== nextState.clashResult && nextState.clashResult` → `CLASH_RESULT`
  - `prevState.pendingChoice?.id !== nextState.pendingChoice?.id && nextState.pendingChoice` → `CHOICE_REQUIRED`
  - `prevState.winner === null && nextState.winner !== null` → `GAME_OVER`
- 주의: `engineTick()`을 `diffEvents`에서 쓰면 기존 결정성 테스트(`tests/determinism.test.ts`)에서 `engineTick` 카운터가 달라질 수 있으므로, 이벤트 ID는 별도 모듈 로컬 카운터(`let evtSeq = 0; id: \`evt-\${++evtSeq}\``)를 사용해 `rng.ts`의 `engineTick`에 영향을 주지 않게 해!

#### 3. 완료 확인
- `npm test` (기존 32개 테스트 통과 확인)
- `npm run build` 통과 확인
```

---

## 🔹 [WP7-2 프롬프트] `useGame.ts`의 `dispatch(action)` 일원화 및 액션 기록

WP7-1이 통과하면 아래 프롬프트를 복사해서 붙여넣으세요:

```markdown
현재 프로젝트(`C:\Users\dpal4\Desktop\TCG\TCG main`)에서 **WP7-2 (`useGame.ts`의 `dispatch` 일원화 및 액션 로그 기록)** 작업만 수행해줘.

### 핵심 규칙
1. `useGame`이 반환하는 객체의 모든 프로퍼티 이름과 함수 시그니처(`useGame.ts`의 `L634~L662`)는 절대 바꾸지 마 (`GameBoard.tsx`가 그대로 사용 중임).
2. React 19 StrictMode 중복 호출 방지 로직(`useGame.ts`의 `L63~L81`)을 그대로 유지해.
3. 작업 후 `npm test`와 `npm run build`가 모두 통과해야 해.

### 사전 참조할 위치
- `src/hooks/useGame.ts` 전체 (`L1~L663`)
- 방금 만든 `src/engine/events.ts`, `src/engine/step.ts`

### 수행할 작업
1. `useGame.ts` 내부에 다음 상태/Ref를 추가해:
   - `const actionLogRef = useRef<GameAction[]>([]);` (이번 게임에서 실행된 모든 `GameAction` 기록, `restartGame` 시 `[]`로 초기화)
   - `const lastEventsRef = useRef<GameEvent[]>([]);` (최근 `dispatch`에서 발생한 이벤트 목록)
2. `const dispatch = useCallback((action: GameAction) => { ... }, [setGameState])`를 만들어:
   - `setGameState((prev) => { const { state, events } = step(prev, action); lastEventsRef.current = events; return state; });`
   - `actionLogRef.current.push(action);`
3. `useGame.ts`의 `L125~L405`에 있는 핸들러들(`handleSetInitiative`, `handleSelectStartingLeader`, `handleMulligan`, `handleDrawCards`, `handleUpgrade`, `handleSwitchLeader`, `handleChargeConcerto`, `handleDecideClash`, `handleSetClashCard`, `handleProceedAfterClash`, `handleComboAttack`, `handleResolvePendingChoice`, `handleFinishCombo`, `handleDiscardOverflow`, `handleEndTurn`, `handleForceResolveClash`, `clearLastUpgrade`, `clearLastComboStrike`, `clearLastEffectEvent`, `handleFinishEffectDraw`)이 모두 `dispatch({ type: ... })`를 호출하도록 단순화해.
4. `useGame` 반환 객체(`L634~L662`)에 기존 항목들을 모두 유지하면서 `dispatch`, `actionLogRef`, `lastEventsRef`만 추가로 내보내줘.
5. 완료 후 `npm test`와 `npm run build`를 실행해 결과를 보고해줘.
```

---

## 🔹 [WP7-3 프롬프트] 이벤트 정합성 및 리플레이 재현 테스트 추가

WP7-2가 통과하면 아래 프롬프트를 복사해서 붙여넣으세요:

```markdown
현재 프로젝트(`C:\Users\dpal4\Desktop\TCG\TCG main`)에서 **WP7-3 (`step` 이벤트 정합성 및 액션 리플레이 재현 테스트 작성)** 작업을 수행해줘.

### 사전 참조할 위치
- `src/engine/step.ts`, `src/engine/events.ts`, `src/engine/rng.ts`
- `tests/determinism.test.ts` (헤드리스 AI 대 AI 실행 패턴 참고)

### 수행할 작업
1. `tests/step-events.test.ts` 파일을 새로 만들어 다음 2가지 테스트를 작성해:
   - **테스트 1 (이벤트-상태 정합성)**: 고정 시드(예: `12345`)로 `createInitialGameState`를 만든 뒤 `step(state, action)`만 사용하여 AI 대 AI 20판을 진행하면서 발생한 모든 `GameEvent`를 수집해. 각 판이 끝났을 때 `DAMAGE`와 `HEAL` 이벤트들의 변화량이 양 플레이어의 최종 HP 및 `state.hpHistory`와 정확히 일치하는지 `expect`로 검증해.
   - **테스트 2 (액션 로그 100% 재현성)**: 1번에서 기록한 `{ seed, actions: GameAction[] }` 목록만 가지고 처음부터 똑같이 `step`을 순차 실행했을 때, 최종 `GameState`(로그 `timestamp` 제외)가 원본 판과 100% 동일한지 검증해.
2. `npm test`와 `npm run build`를 실행해 전체 테스트가 통과하는지 확인해줘.
```

---

# 📦 [WP8 단계별 복붙 프롬프트 (`GameBoard.tsx` 분해)]

> 💡 **WP8 핵심 전략**: `GameBoard.tsx`(5,428줄)는 한 번에 쪼개면 무조건 사고가 납니다.  
> 아래 4단계에 걸쳐 **UI 영역부터 바깥쪽으로 하나씩 발라내는 방식**을 쓰면 단 한 줄의 기능 손실도 없이 안전하게 분해할 수 있습니다.

---

## 🔹 [WP8-1 프롬프트] 좌측 카드 단말기 & 우측 택티컬 콘솔/배틀로그 분리 (~1,000줄 감소)

```markdown
현재 프로젝트(`C:\Users\dpal4\Desktop\TCG\TCG main`)에서 **WP8-1 (`GameBoard.tsx`의 좌측 카드 상세 단말기 및 우측 택티컬 콘솔/배틀로그 컴포넌트 분리)** 작업만 수행해줘.

### 핵심 규칙
1. UI 디자인(Tailwind 클래스), 클릭 이벤트, 툴팁, 효과 텍스트 포맷팅, 사운드 재생 동작이 기존과 1픽셀도 달라지면 안 돼.
2. 파일을 읽을 때는 `GameBoard.tsx` 전체를 읽지 말고 아래 지정된 줄 번호 구간만 읽어.
3. 코드 안의 변경 지점에는 `// [WP8-1]` 주석을 남겨줘.

### 사전 참조할 위치 (`src/components/GameBoard.tsx`)
- `L2556~L2803`: `[좌측 패널] 전술 카드 분석 단말기` (약 247줄)
- `L3754~L4495`: `[우측 패널] 택티컬 콘솔 (상단) + 실시간 배틀 로그 (하단)` (약 741줄)

### 수행할 작업
1. `src/components/battle/CardDetailSidebar.tsx` 신규 생성:
   - `GameBoard.tsx`의 `L2556~L2803` JSX 블록을 그대로 옮기고, 필요한 값들(`selectedCardForDetail`, `isMobileBattle`, `onOpenEvolutionTree`, `onZoomCard` 등)을 명확한 Props 인터페이스로 받아 렌더링하도록 만들고 `React.memo`로 감싸줘.
2. `src/components/battle/TacticalConsoleSidebar.tsx` 신규 생성:
   - `GameBoard.tsx`의 `L3754~L4495` JSX 블록(상단 택티컬 콘솔 + 하단 실시간 배틀 로그)을 그대로 옮기고, 필요한 상태와 핸들러들을 Props로 받아 렌더링하도록 만들고 `React.memo`로 감싸줘.
3. `GameBoard.tsx`에서 해당 두 구간을 `<CardDetailSidebar ... />`와 `<TacticalConsoleSidebar ... />`로 교체하고, 더 이상 `GameBoard.tsx`에서 직접 쓰지 않는 아이콘/헬퍼 import가 있다면 정리해줘.
4. `npm test`와 `npm run build`를 실행해 타입 에러나 빌드 오류가 없는지 확인하고, `GameBoard.tsx`의 줄 수가 몇 줄에서 몇 줄로 줄었는지 보고해줘.
```

---

## 🔹 [WP8-2 프롬프트] 상단 네비게이션 바 & 중앙 4단 전장 영역 분리 (~1,200줄 감소)

WP8-1이 완료되면 아래 프롬프트를 복사해서 붙여넣으세요:

```markdown
현재 프로젝트(`C:\Users\dpal4\Desktop\TCG\TCG main`)에서 **WP8-2 (`GameBoard.tsx`의 상단 네비게이션 바 및 중앙 4단 전장 영역 컴포넌트 분리)** 작업만 수행해줘.

### 핵심 규칙
1. 기존 DOM 구조, `id`/`data-*` 속성(튜토리얼 하이라이트 및 드로우 비행 좌표 계산에 사용됨!), Tailwind 클래스를 절대 변경하거나 누락하지 마. 특히 `ref`(덱/손패 위치 ref 등)가 걸려 있는 엘리먼트는 ref를 그대로 전달해야 해!
2. `GameBoard.tsx` 전체를 읽지 말고 해당 섹션 주석 주변만 읽어서 작업해.

### 분리할 5개 구간 (`src/components/GameBoard.tsx` 내 주석으로 검색)
1. `src/components/battle/BattleTopBar.tsx`:
   - 구간: `{/* 1. 최상단 전술 네비게이션 바` ~ `{/* 2. 메인 컨테이너` 직전 (기존 약 `L2293~L2551`, 약 258줄)
2. `src/components/battle/OpponentFieldArea.tsx`:
   - 구간: `{/* [1단: 상대(AI/원격 플레이어) 진영` ~ `{/* [2단: 중앙 공용 배틀 아레나` 직전 (기존 약 `L2816~L3130`, 약 314줄)
3. `src/components/battle/CenterClashArena.tsx`:
   - 구간: `{/* [2단: 중앙 공용 배틀 아레나 (CLASH ZONE)` ~ `{/* [3단: 플레이어(내) 진영` 직전 (기존 약 `L3131~L3424`, 약 293줄)
4. `src/components/battle/PlayerFieldArea.tsx`:
   - 구간: `{/* [3단: 플레이어(내) 진영` ~ `{/* [4단: 내 핸드(손패) 도킹 바` 직전 (기존 약 `L3425~L3656`, 약 231줄)
5. `src/components/battle/PlayerHandDock.tsx`:
   - 구간: `{/* [4단: 내 핸드(손패) 도킹 바` ~ 우측 패널 직전 (기존 약 `L3657~L3753`, 약 96줄)

### 수행할 작업
- 위 5개 컴포넌트를 `src/components/battle/` 폴더에 각각 생성하고 `React.memo`를 적용해.
- `GameBoard.tsx`에서 각 구간을 위 5개 컴포넌트로 교체해.
- 완료 후 `npm test`와 `npm run build` 통과를 확인하고, `GameBoard.tsx`의 남은 줄 수를 보고해줘.
```

---

## 🔹 [WP8-3 프롬프트] 25종 모달 및 연출 오버레이 호스트 분리 (~900줄 감소)

WP8-2가 완료되면 아래 프롬프트를 복사해서 붙여넣으세요:

```markdown
현재 프로젝트(`C:\Users\dpal4\Desktop\TCG\TCG main`)에서 **WP8-3 (`GameBoard.tsx` 하단의 모달 및 연출 오버레이 영역을 `BattleOverlayHost.tsx`로 분리)** 작업만 수행해줘.

### 핵심 규칙
1. 오버레이들의 표시 조건(`isOpeningComplete`, `clashResult`, `lastComboStrike`, `lastUpgrade`, `lastEffectDraw`, `pendingChoice` 등 연출이 겹치지 않게 순서를 제어하는 조건식)을 토씨 하나 바꾸지 말고 그대로 보존해.
2. `lazy`로 선언된 모달들(`RulesGuideModal`, `CardCatalogModal`, `BattleReplayModal`, `CardListModal`)의 `<Suspense fallback={null}>` 구조도 그대로 유지해.

### 수행할 작업
1. `GameBoard.tsx` 하단의 `{/* 4. 모달 오버레이들 */}` 주석부터 파일 끝의 닫는 태그 직전까지(기존 약 `L4497~L5425`, 약 930줄)를 읽고, 이를 전담하는 `src/components/battle/BattleOverlayHost.tsx` 컴포넌트로 분리해.
2. 오버레이 간 블로킹(대기) 여부를 판별하는 조건식들을 `src/components/battle/fxPriority.ts`의 순수 헬퍼 함수(`isBlockingAnimationActive(gameState)` 등)로 함께 추출해 가독성을 높여줘.
3. `GameBoard.tsx` 하단을 `<BattleOverlayHost ... />` 한 줄로 교체해.
4. `npm test`와 `npm run build`를 실행해 통과 여부를 확인하고, `GameBoard.tsx`의 남은 줄 수를 보고해줘.
```

---

## 🔹 [WP8-4 프롬프트] 멀티플레이 P2P 동기화 & 체스클록 타이머 훅 분리 (최종 정리)

WP8-3이 완료되면 아래 프롬프트를 복사해서 붙여넣으세요:

```markdown
현재 프로젝트(`C:\Users\dpal4\Desktop\TCG\TCG main`)에서 **WP8-4 (`GameBoard.tsx` 내 멀티플레이 P2P 동기화 로직 및 체스클록 타이머 로직을 커스텀 훅으로 분리)** 작업을 수행해줘.

### 핵심 규칙
1. 멀티플레이 호스트/게스트/관전자 역할 분기, `SYNC_GAME_STATE` 송수신, 60초 재접속 카운트다운, 기권(`sendSurrender`), 시간제한 패배 처리 로직이 기존과 100% 동일하게 동작해야 해.
2. 작업 후 `GameBoard.tsx`가 **800줄 이하**가 되도록 정리해줘.

### 수행할 작업
1. `src/hooks/useBattleTimer.ts` 신규 생성:
   - `GameBoard.tsx`에 있는 `timeLimitConfig`, `p0TotalTime`, `p1TotalTime`, `currentTurnTime` 상태와 1초 간격 타이머 감산/타임아웃 패배 처리 및 멀티플레이 타이머 동기화 `useEffect`들을 이 훅으로 추출해.
2. `src/hooks/useMultiplayerBattle.ts` 신규 생성:
   - `GameBoard.tsx`에 있는 멀티플레이 세션 복구, `multiplayerService.sendAction` 래퍼들, `onMessage` (`SYNC_GAME_STATE`, 게스트 액션 수신 처리), `onDisconnectCountdown`, `onStatusChange`, 핑 측정, 이모티콘 송수신 로직을 이 훅으로 추출해.
3. `GameBoard.tsx`에 남아있는 보조 헬퍼나 인게임 오프닝/사운드 프리로드 `useEffect`도 필요시 `src/hooks/useBattleAudioAndFx.ts`로 정리하여, `GameBoard.tsx`가 **800줄 이하**의 깔끔한 조합 컴포넌트가 되도록 마무리해.
4. `npm test`와 `npm run build`를 실행해 모두 통과하는지 확인하고 최종 줄 수를 보고해줘.
```
