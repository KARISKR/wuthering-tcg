import { GameState } from '../types/tcg';
import { GameAction, GameEvent } from '../engine/events';

export interface BattleSource {
  getState(): GameState;
  /** 상태가 바뀔 때마다 (커밋 후) 1회 호출. events는 그 변경에서 나온 이벤트 */
  subscribe(listener: (state: GameState, events: GameEvent[]) => void): () => void;
  dispatch(action: GameAction): void;
  readonly kind: 'local' | 'peer-host' | 'peer-guest' | 'spectator' | 'replay';
}
