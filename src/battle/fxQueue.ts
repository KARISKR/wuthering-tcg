// src/battle/fxQueue.ts
// [WP8] 연출 큐 (FX Queue) - 이벤트 기반 연출 순차 실행 및 블로킹 제어
import React, { useSyncExternalStore } from 'react';
import type { GameEvent, GameAction, GameEventType } from '../engine/events';
import type { GameState } from '../types/tcg';
import { fxRegistry, type FxEntry } from './fxRegistry';

export interface ActiveFx {
  id: string;
  event: GameEvent;
  entry: FxEntry;
  onDone: () => void;
}

export interface FxQueueOptions {
  registry?: Partial<Record<GameEventType, FxEntry>>;
  getGameState?: () => GameState;
  dispatch?: (action: GameAction) => void;
  onBlockingChange?: (isBlocking: boolean) => void;
  onActiveFxChange?: (activeFx: ActiveFx | null) => void;
}

export class FxQueue {
  private queue: GameEvent[] = [];
  private activeFx: ActiveFx | null = null;
  // [WP8 버그 수정] 별도 알림 레인 (lane: 'ambient'): 순서 큐를 막지 않고, 새 알림이 이전 것을 대체
  private ambientPending: GameEvent | null = null;
  private ambientFx: ActiveFx | null = null;
  private ambientTimer: ReturnType<typeof setTimeout> | null = null;
  private isBlocking = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private finishedSet = new Set<string>();
  private listeners = new Set<() => void>();

  private registry: Partial<Record<GameEventType, FxEntry>>;
  private getGameState?: () => GameState;
  private dispatch?: (action: GameAction) => void;
  private onBlockingChange?: (isBlocking: boolean) => void;
  private onActiveFxChange?: (activeFx: ActiveFx | null) => void;

  constructor(options: FxQueueOptions = {}) {
    this.registry = options.registry || fxRegistry;
    this.getGameState = options.getGameState;
    this.dispatch = options.dispatch;
    this.onBlockingChange = options.onBlockingChange;
    this.onActiveFxChange = options.onActiveFxChange;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getIsBlocking(): boolean {
    return this.isBlocking;
  }

  public getActiveFx(): ActiveFx | null {
    return this.activeFx;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getAmbientFx(): ActiveFx | null {
    return this.ambientFx;
  }

  public enqueue(events: GameEvent[]): void {
    if (!events || events.length === 0) return;

    for (const e of events) {
      const entry = this.registry[e.type];
      if (!entry) continue;
      if (entry.lane === 'ambient') {
        this.ambientPending = e; // 가장 최근 알림만 유지
      } else {
        this.queue.push(e);
      }
    }

    this.processQueue();
    this.processAmbient();
  }

  private processAmbient(): void {
    const next = this.ambientPending;
    if (!next) return;
    const entry = this.registry[next.type];
    if (!entry) {
      this.ambientPending = null;
      return;
    }
    if (entry.waitFor && this.getGameState && !entry.waitFor(this.getGameState())) return;

    this.ambientPending = null;
    if (this.ambientTimer !== null) {
      clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
    let finished = false;
    const onDone = () => {
      if (finished) return;
      finished = true;
      if (this.ambientTimer !== null) {
        clearTimeout(this.ambientTimer);
        this.ambientTimer = null;
      }
      if (entry.onDoneAction && this.dispatch && !this.finishedSet.has(next.id)) {
        this.finishedSet.add(next.id);
        const action = entry.onDoneAction(next);
        if (action) this.dispatch(action);
      }
      if (this.ambientFx?.id === next.id) {
        this.ambientFx = null;
        this.notify();
      }
      this.processAmbient();
    };
    this.ambientFx = { id: next.id, event: next, entry, onDone };
    if (entry.durationMs && entry.durationMs > 0) {
      this.ambientTimer = setTimeout(onDone, entry.durationMs);
    }
    this.notify();
  }

  public updateState(state?: GameState): void {
    if (state && !this.getGameState) {
      this.getGameState = () => state;
    }
    this.processQueue();
    this.processAmbient();
  }

  public clear(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.ambientTimer !== null) {
      clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
    this.ambientPending = null;
    this.ambientFx = null;
    this.queue = [];
    this.activeFx = null;
    this.setBlocking(false);
    this.onActiveFxChange?.(null);
    this.notify();
  }

  private setBlocking(blocking: boolean): void {
    if (this.isBlocking !== blocking) {
      this.isBlocking = blocking;
      this.onBlockingChange?.(blocking);
    }
  }

  private processQueue(): void {
    // 현재 연출이 진행 중이면 대기
    if (this.activeFx) {
      return;
    }

    if (this.queue.length === 0) {
      this.setBlocking(false);
      this.onActiveFxChange?.(null);
      this.notify();
      return;
    }

    const nextEvent = this.queue[0];
    const entry = this.registry[nextEvent.type];
    if (!entry) {
      this.queue.shift();
      this.processQueue();
      return;
    }

    // waitFor 조건 검사: waitFor가 존재하고 조건을 만족하지 못하면 대기
    if (entry.waitFor && this.getGameState) {
      const state = this.getGameState();
      if (!entry.waitFor(state)) {
        return;
      }
    }

    // 조건 충족: 큐에서 꺼내어 연출 시작
    this.queue.shift();
    const fxId = nextEvent.id;
    let finished = false;

    const onDone = () => {
      if (finished) return;
      finished = true;
      this.finishFx(fxId, nextEvent, entry);
    };

    const active: ActiveFx = {
      id: fxId,
      event: nextEvent,
      entry,
      onDone,
    };

    this.activeFx = active;
    this.setBlocking(Boolean(entry.blocking));
    this.onActiveFxChange?.(active);
    this.notify();

    // durationMs 안전장치: 지정 시간 내 onDone 미호출 시 자동 완료
    if (entry.durationMs && entry.durationMs > 0) {
      this.timer = setTimeout(() => {
        this.timer = null;
        onDone();
      }, entry.durationMs);
    }
  }

  private finishFx(fxId: string, event: GameEvent, entry: FxEntry): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // onDoneAction이 정확히 1회 dispatch 되도록 보장
    if (!this.finishedSet.has(fxId)) {
      this.finishedSet.add(fxId);
      if (entry.onDoneAction && this.dispatch) {
        const action = entry.onDoneAction(event);
        if (action) {
          this.dispatch(action);
        }
      }
    }

    if (this.activeFx?.id === fxId) {
      this.activeFx = null;
    }

    // 다음 연출 처리
    this.processQueue();
  }
}

/**
 * 활성 FX 상태를 구독하는 React 훅
 */
export function useActiveFx(queue: FxQueue | null | undefined): ActiveFx | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!queue) return () => {};
      return queue.subscribe(onStoreChange);
    },
    () => (queue ? queue.getActiveFx() : null)
  );
}

/**
 * 활성 FX 컴포넌트를 렌더링하는 호스트 컴포넌트
 */
export function useAmbientFx(queue: FxQueue | null | undefined): ActiveFx | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!queue) return () => {};
      return queue.subscribe(onStoreChange);
    },
    () => (queue ? queue.getAmbientFx() : null)
  );
}

function renderFx(fx: ActiveFx | null) {
  if (!fx || !fx.entry.component) return null;
  return React.createElement(fx.entry.component, { key: fx.id, event: fx.event, onDone: fx.onDone });
}

export const FxQueueHost: React.FC<{ queue: FxQueue | null | undefined }> = ({ queue }) => {
  const activeFx = useActiveFx(queue);
  const ambientFx = useAmbientFx(queue);
  return React.createElement(React.Fragment, null, renderFx(activeFx), renderFx(ambientFx));
};
