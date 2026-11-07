// src/engine/events.ts
// [WP7-1] 엔진 이벤트 및 액션 타입 정의

export type GameEventType =
  | 'PHASE_CHANGED'
  | 'CARD_DRAWN'
  | 'EFFECT_DRAW'
  | 'CARD_PLAYED'
  | 'CLASH_REVEAL'
  | 'CLASH_RESULT'
  | 'DAMAGE'
  | 'HEAL'
  | 'UPGRADE'
  | 'LEADER_SWITCH'
  | 'COMBO_STRIKE'
  | 'EFFECT_TRIGGERED'
  | 'CHOICE_REQUIRED'
  | 'GAME_OVER';

export interface GameEvent {
  id: string;
  type: GameEventType;
  turn: number;
  playerIndex?: 0 | 1;
  payload?: Record<string, unknown>;
}

export type GameAction =
  | {
      type: 'SET_INITIATIVE';
      firstPlayerIndex: 0 | 1;
      roll0: number;
      roll1: number;
      choiceDetail?: { winnerIndex: 0 | 1; chosenOrder: 'FIRST' | 'SECOND' };
    }
  | {
      type: 'SELECT_STARTING_LEADER';
      p0LeaderIdOrName: string;
      p1LeaderIdOrName?: string;
    }
  | {
      type: 'MULLIGAN';
      p0DiscardIds: string[];
      p1DiscardIds?: string[];
    }
  | {
      type: 'DRAW_CARDS';
      playerIndex?: 0 | 1;
    }
  | {
      type: 'UPGRADE';
      playerIndex: 0 | 1;
      targetSlot: 'leader' | 'leftSupport' | 'rightSupport';
      upgradeCardId: string;
      discardIds: string[];
    }
  | {
      type: 'SWITCH_LEADER';
      playerIndex: 0 | 1;
      targetSlot: 'leftSupport' | 'rightSupport';
    }
  | {
      type: 'CHARGE_CONCERTO';
      playerIndex: 0 | 1;
      cardId: string;
    }
  | {
      type: 'DECIDE_CLASH';
      startClash: boolean;
    }
  | {
      type: 'SET_CLASH_CARD';
      playerIndex: 0 | 1;
      cardId: string | null;
      spentConcertoIds?: string[];
    }
  | {
      type: 'RESOLVE_CLASH';
    }
  | {
      type: 'FORCE_RESOLVE_CLASH';
    }
  | {
      type: 'PROCEED_AFTER_CLASH';
    }
  | {
      type: 'COMBO_ATTACK';
      playerIndex: 0 | 1;
      cardId: string;
      spentConcertoIds?: string[];
      discardForBonusDmgId?: string;
      swapSupportSlot?: 'leftSupport' | 'rightSupport';
    }
  | {
      type: 'FINISH_COMBO';
      playerIndex: 0 | 1;
    }
  | {
      type: 'RESOLVE_PENDING_CHOICE';
      chosenCardIds: string[];
    }
  | {
      type: 'DISCARD_OVERFLOW';
      playerIndex: 0 | 1;
      discardIds: string[];
    }
  | {
      type: 'END_TURN';
    }
  | {
      type: 'FINALIZE_END_PHASE';
    }
  | {
      type: 'SURRENDER';
      playerIndex: 0 | 1;
    }
  | {
      type: 'TIME_OUT';
      loserIndex: 0 | 1;
      reason?: string;
    }
  | {
      type: 'FINISH_EFFECT_DRAW';
      completedDrawId?: string;
    }
  | {
      type: 'CLEAR_LAST_UPGRADE';
    }
  | {
      type: 'CLEAR_LAST_COMBO_STRIKE';
    }
  | {
      type: 'CLEAR_LAST_EFFECT_EVENT';
    }
  | {
      type: 'AI_ACTION_PHASE';
      playerIndex?: 0 | 1;
    }
  | {
      type: 'AI_COMBO_STEP';
      playerIndex: 0 | 1;
    }
  | {
      type: 'AI_DISCARD_OVERFLOW';
      playerIndex?: 0 | 1;
    };
