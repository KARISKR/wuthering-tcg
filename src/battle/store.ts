import React, { createContext, useContext, useRef, useCallback, useSyncExternalStore } from 'react';
import type { GameState, CharacterCard, ActionCard, AnyCard } from '../types/tcg';
import type { TimeLimitConfig } from '../types/multiplayer';
import type { GameAction } from '../engine/events';
import type { BattleSource } from './source';
import { FxQueue } from './fxQueue';
import { fxRegistry } from './fxRegistry';

export interface CardListModalState {
  isOpen: boolean;
  title: string;
  type: 'CHARACTER' | 'TRASH' | 'CONCERTO';
  cards: AnyCard[];
}

export interface ConcertoModalState {
  isOpen: boolean;
  actionType: 'CLASH' | 'COMBO';
  targetCard: ActionCard | null;
  requiredCost: number;
  playerIndex: 0 | 1;
}

export interface IntroSwapModalState {
  isOpen: boolean;
  targetCard: ActionCard | null;
  spentConcertoIds?: string[];
  playerIndex: 0 | 1;
}

/** 소리의 변화·강공격(BP01-065/067) 연격: 버릴 패 1장 선택 (버리면 데미지 +1) */
export interface ComboDiscardModalState {
  isOpen: boolean;
  targetCard: ActionCard | null;
  spentConcertoIds?: string[];
  playerIndex: 0 | 1;
}

export interface UpgradeTargetState {
  playerIndex: 0 | 1;
  slotName: 'leader' | 'leftSupport' | 'rightSupport';
  char: CharacterCard;
  available: CharacterCard[];
  hasYangyangLv2: boolean;
  requiredDiscard: number;
}

export interface BattleStoreState {
  // GameState (엔진 원천 상태)
  gameState: GameState;

  // 모달 및 오버레이 화면 상태
  isRulesOpen: boolean;
  isCatalogOpen: boolean;
  isReplayOpen: boolean;
  isHpHistoryModalOpen: boolean;
  showSurrenderConfirm: boolean;
  showExitConfirm: boolean;
  showTutorialOverlay: boolean;
  showMatchOpening: boolean;
  showMobileCardModal: boolean;
  showMobileLogModal: boolean;
  evolutionModalChar: CharacterCard | null;
  cardListModalState: CardListModalState | null;
  concertoModalState: ConcertoModalState;
  introSwapModalState: IntroSwapModalState;
  comboDiscardModalState: ComboDiscardModalState;
  isIntroSwapFieldPeek: boolean;
  isFinisherFinished: boolean;
  isConfirmingEndTurn: boolean;
  isConfirmingNoCardPass: boolean;
  upgradeTarget: UpgradeTargetState | null;
  isInitiativeRolling: boolean;
  isFxBlocking: boolean;

  // 선택 및 프리뷰 상태
  previewCard: AnyCard | null;
  previewFromHand: boolean;
  leaderSelectPlayerIndex: 0 | 1;
  p0ChosenLeader: string | null;
  hasSelectedMyLeader: boolean;
  hasCompletedMyMulligan: boolean;
  selectedOverflowIds: string[];
  noComboCountdown: number | null;

  // 네트워크 및 타이머 상태
  disconnectCountdown: number | null;
  isMultiplayerDisconnected: boolean;
  timeLimitConfig: TimeLimitConfig;
  p0TotalTime: number;
  p1TotalTime: number;
  currentTurnTime: number;
  pingLatency: number | null;
  spectatorCount: number;
  externalDiceResult: { val0: number; val1: number; winIdx: 0 | 1 } | null;
  externalOrderChoice: 'FIRST' | 'SECOND' | null;
}

export interface BattleStore {
  getState(): BattleStoreState;
  setState(updater: Partial<BattleStoreState> | ((prev: BattleStoreState) => Partial<BattleStoreState>)): void;
  subscribe(listener: () => void): () => void;
  dispatch(action: GameAction): void;
  getSource(): BattleSource;
  readonly fxQueue: FxQueue;
}

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
      return false;
    }
  }
  return true;
}

export function createBattleStore(
  source: BattleSource,
  initialUiState?: Partial<BattleStoreState>
): BattleStore {
  let state: BattleStoreState = {
    gameState: source.getState(),

    // UI Defaults
    isRulesOpen: false,
    isCatalogOpen: false,
    isReplayOpen: false,
    isHpHistoryModalOpen: false,
    showSurrenderConfirm: false,
    showExitConfirm: false,
    showTutorialOverlay: false,
    showMatchOpening: false,
    showMobileCardModal: false,
    showMobileLogModal: false,
    evolutionModalChar: null,
    cardListModalState: null,
    concertoModalState: { isOpen: false, actionType: 'CLASH', targetCard: null, requiredCost: 0, playerIndex: 0 },
    introSwapModalState: { isOpen: false, targetCard: null, spentConcertoIds: undefined, playerIndex: 0 },
    comboDiscardModalState: { isOpen: false, targetCard: null, spentConcertoIds: undefined, playerIndex: 0 },
    isIntroSwapFieldPeek: false,
    isFinisherFinished: false,
    isConfirmingEndTurn: false,
    isConfirmingNoCardPass: false,
    upgradeTarget: null,
    isInitiativeRolling: source.getState().gameMode === 'MULTIPLAYER',
    isFxBlocking: false,

    previewCard: null,
    previewFromHand: false,
    leaderSelectPlayerIndex: 0,
    p0ChosenLeader: null,
    hasSelectedMyLeader: false,
    hasCompletedMyMulligan: false,
    selectedOverflowIds: [],
    noComboCountdown: null,

    disconnectCountdown: null,
    isMultiplayerDisconnected: false,
    timeLimitConfig: {
      totalTimeSec: 300,
      turnTimeSec: 90,
      clashTimeSec: 30,
      hasTimeLimit: true,
    },
    p0TotalTime: 300,
    p1TotalTime: 300,
    currentTurnTime: 90,
    pingLatency: null,
    spectatorCount: 0,
    externalDiceResult: null,
    externalOrderChoice: null,

    ...initialUiState,
  };

  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  let storeRef: BattleStore | null = null;

  const fxQueue = new FxQueue({
    registry: fxRegistry,
    getGameState: () => state.gameState,
    dispatch: (action) => source.dispatch(action),
    onBlockingChange: (isBlocking) => {
      storeRef?.setState({ isFxBlocking: isBlocking });
    },
  });

  // BattleSource 구독: 엔진 상태 전이 시 저장소의 gameState 자동 갱신 및 페이즈 정리
  source.subscribe((nextGameState, events) => {
    const prevPhase = state.gameState.phase;
    state = {
      ...state,
      gameState: nextGameState,
      showMatchOpening:
        prevPhase === 'MULLIGAN' && nextGameState.phase === 'DRAW_PHASE'
          ? true
          : state.showMatchOpening,
      isInitiativeRolling:
        nextGameState.phase === 'LEADER_SELECT' || nextGameState.phase === 'MULLIGAN'
          ? state.isInitiativeRolling
          : false,
      hasSelectedMyLeader:
        nextGameState.phase === 'LEADER_SELECT' ? state.hasSelectedMyLeader : false,
      hasCompletedMyMulligan:
        nextGameState.phase === 'MULLIGAN' ? state.hasCompletedMyMulligan : false,
      isConfirmingNoCardPass:
        nextGameState.phase === 'CLASH_SET' ? state.isConfirmingNoCardPass : false,
      isConfirmingEndTurn:
        nextGameState.phase === 'ACTION_PHASE' ? state.isConfirmingEndTurn : false,
      isFinisherFinished:
        nextGameState.phase === 'GAME_OVER' ? state.isFinisherFinished : false,
    };
    notify();
    if (events && events.length > 0) {
      fxQueue.enqueue(events);
    }
    fxQueue.updateState(nextGameState);
  });

  const store: BattleStore = {
    getState: () => state,
    setState: (updater) => {
      const partial = typeof updater === 'function' ? updater(state) : updater;
      let hasChanges = false;
      for (const k in partial) {
        if (!Object.is(state[k as keyof BattleStoreState], partial[k as keyof BattleStoreState])) {
          hasChanges = true;
          break;
        }
      }
      if (!hasChanges) return;
      state = {
        ...state,
        ...partial,
      };
      notify();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch: (action: GameAction) => {
      source.dispatch(action);
    },
    getSource: () => source,
    fxQueue,
  };

  storeRef = store;
  return store;
}

export const BattleStoreContext = createContext<BattleStore | null>(null);

export const BattleStoreProvider: React.FC<{ store: BattleStore; children: React.ReactNode }> = ({
  store,
  children,
}) => {
  return React.createElement(BattleStoreContext.Provider, { value: store }, children);
};

export function useStoreSelector<T>(
  store: BattleStore,
  selector: (state: BattleStoreState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const lastStateRef = useRef<BattleStoreState | null>(null);
  const lastSliceRef = useRef<T | null>(null);

  const getSnapshot = useCallback(() => {
    const currentState = store.getState();
    if (lastStateRef.current === currentState && lastSliceRef.current !== null) {
      return lastSliceRef.current;
    }
    const nextSlice = selector(currentState);
    if (lastSliceRef.current !== null && isEqual(lastSliceRef.current, nextSlice)) {
      lastStateRef.current = currentState;
      return lastSliceRef.current;
    }
    lastStateRef.current = currentState;
    lastSliceRef.current = nextSlice;
    return nextSlice;
  }, [store, selector, isEqual]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function useBattleStore<T>(
  selector: (state: BattleStoreState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
  storeOverride?: BattleStore
): T {
  const contextStore = useContext(BattleStoreContext);
  const store = storeOverride || contextStore;
  if (!store) {
    throw new Error('useBattleStore must be used within a BattleStoreProvider or passed a BattleStore');
  }
  return useStoreSelector(store, selector, isEqual);
}

export const useBattle = useBattleStore;

export function useBattleDispatch(): (action: GameAction) => void {
  const store = useContext(BattleStoreContext);
  if (!store) {
    throw new Error('useBattleDispatch must be used within a BattleStoreProvider');
  }
  return useCallback((action: GameAction) => store.dispatch(action), [store]);
}

export function useBattleSetState(): BattleStore['setState'] {
  const store = useContext(BattleStoreContext);
  if (!store) {
    throw new Error('useBattleSetState must be used within a BattleStoreProvider');
  }
  return store.setState;
}

/**
 * [WP8-5] 손패 렌더링용 필터 셀렉터 (효과 드로우 중이거나 공개 대기 중인 카드를 안전하게 숨김)
 */
export function selectDisplayedHand(state: BattleStoreState, playerIndex: 0 | 1): ActionCard[] {
  const p = state.gameState.players[playerIndex];
  if (!p) return [];
  const lastDraw = state.gameState.lastEffectDraw;
  const isDrawing = state.isFxBlocking && lastDraw && playerIndex === lastDraw.playerIndex;
  const drawCardIds = isDrawing ? new Set(lastDraw.cards.map((c) => c.id)) : null;

  const pendingPublicRevealIds = new Set<string>();
  const allPending = [
    ...(state.gameState.pendingChoice ? [state.gameState.pendingChoice] : []),
    ...(state.gameState.pendingChoiceQueue || []),
    ...(state.gameState.deferredChoices || []),
  ];
  for (const ch of allPending) {
    if (ch?.isPublicReveal && ch.revealedCards) {
      ch.revealedCards.forEach((rc) => pendingPublicRevealIds.add(rc.id));
    }
  }

  return p.hand.filter((c) => {
    if (drawCardIds?.has(c.id)) return false;
    if (pendingPublicRevealIds.has(c.id)) return false;
    return true;
  });
}

/**
 * [WP8-5] 연격 우선권 플레이어 인덱스 셀렉터
 */
export function selectComboPlayerIndex(state: BattleStoreState): 0 | 1 {
  const p0 = state.gameState.players[0];
  const p1 = state.gameState.players[1];
  if (p0.comboUnlimited || (p0.comboCount ?? 0) > 0) return 0;
  if (p1.comboUnlimited || (p1.comboCount ?? 0) > 0) return 1;
  if (state.gameState.lastComboStrike) return state.gameState.lastComboStrike.attackerIndex;
  return state.gameState.activePlayerIndex;
}

/**
 * [WP8-5] AI 연격 진행 중 여부 셀렉터
 */
export function selectIsAiComboInProgress(state: BattleStoreState, otherPlayerIndex: 0 | 1): boolean {
  const other = state.gameState.players[otherPlayerIndex];
  if (!other?.isAi) return false;
  if (other.comboUnlimited || (other.comboCount ?? 0) > 0) return true;
  const lastStrike = state.gameState.lastComboStrike;
  const human = state.gameState.players[otherPlayerIndex === 0 ? 1 : 0];
  return (
    lastStrike?.attackerIndex === otherPlayerIndex &&
    !human.comboUnlimited &&
    (human.comboCount ?? 0) === 0
  );
}
