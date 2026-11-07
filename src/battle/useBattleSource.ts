import { useState, useEffect, useCallback } from 'react';
import { GameState } from '../types/tcg';
import { GameAction, GameEvent } from '../engine/events';
import { BattleSource } from './source';

export interface UseBattleSourceResult {
  gameState: GameState;
  lastEvents: GameEvent[];
  dispatch: (action: GameAction) => void;
  source: BattleSource;
}

export function useBattleSource(source: BattleSource): UseBattleSourceResult {
  const [gameState, setGameState] = useState<GameState>(() => source.getState());
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    const unsub = source.subscribe((nextState, events) => {
      setGameState(nextState);
      setLastEvents(events);
    });
    return unsub;
  }, [source]);

  const dispatch = useCallback(
    (action: GameAction) => {
      source.dispatch(action);
    },
    [source]
  );

  return {
    gameState,
    lastEvents,
    dispatch,
    source,
  };
}
