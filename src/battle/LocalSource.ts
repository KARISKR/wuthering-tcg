import { GameState } from '../types/tcg';
import { GameAction, GameEvent } from '../engine/events';
import { step } from '../engine/step';
import { BattleSource } from './source';

export class LocalSource implements BattleSource {
  readonly kind: 'local' | 'peer-host';
  private state: GameState;
  private listeners = new Set<(state: GameState, events: GameEvent[]) => void>();
  private actionLog: GameAction[] = [];
  private customDispatcher: ((action: GameAction) => void) | null = null;

  constructor(initialState: GameState, kind: 'local' | 'peer-host' = 'local') {
    this.state = initialState;
    this.kind = kind;
  }

  setCustomDispatcher(dispatcher: ((action: GameAction) => void) | null): void {
    this.customDispatcher = dispatcher;
  }

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: (state: GameState, events: GameEvent[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispatch(action: GameAction): void {
    if (this.customDispatcher) {
      this.customDispatcher(action);
      return;
    }
    const { state, events } = step(this.state, action);
    this.state = state;
    this.actionLog.push(action);
    // 상태 변경 후 리스너에게 통지 (액션당 정확히 1회)
    for (const listener of this.listeners) {
      listener(this.state, events);
    }
  }

  getActionLog(): readonly GameAction[] {
    return this.actionLog;
  }

  reset(newState: GameState): void {
    this.state = newState;
    this.actionLog = [];
    for (const listener of this.listeners) {
      listener(this.state, []);
    }
  }

  receiveExternalState(newState: GameState, events: GameEvent[] = []): void {
    this.state = newState;
    for (const listener of this.listeners) {
      listener(this.state, events);
    }
  }
}
