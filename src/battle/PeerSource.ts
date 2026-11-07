import { GameState } from '../types/tcg';
import { GameAction, GameEvent } from '../engine/events';
import { diffEvents } from '../engine/step';
import { BattleSource } from './source';
import { LocalSource } from './LocalSource';
import type { MultiplayerActionType } from '../types/multiplayer';

export type PeerRole = 'peer-host' | 'peer-guest' | 'spectator';

/**
 * GameAction을 레거시 멀티플레이어 메시지 형식(actionType, payload)으로 직렬화합니다.
 * 구버전 클라이언트와의 네트워크 호환성을 위해 메시지 형식을 변경하지 않습니다.
 */
export function gameActionToMultiplayerAction(action: GameAction): { actionType: MultiplayerActionType; payload: Record<string, unknown> } | null {
  switch (action.type) {
    case 'UPGRADE':
      return {
        actionType: 'UPGRADE',
        payload: { slotName: action.targetSlot, upgradeCardId: action.upgradeCardId, discardIds: action.discardIds },
      };
    case 'SWITCH_LEADER':
      return { actionType: 'SWITCH_LEADER', payload: { targetSlot: action.targetSlot } };
    case 'CHARGE_CONCERTO':
      return { actionType: 'CHARGE_CONCERTO', payload: { cardId: action.cardId } };
    case 'SET_CLASH_CARD':
      return {
        actionType: 'SET_CLASH_CARD',
        payload: { cardId: action.cardId, spentConcertoIds: action.spentConcertoIds },
      };
    case 'DECIDE_CLASH':
      return { actionType: 'DECIDE_CLASH', payload: { proceed: action.startClash } };
    case 'PROCEED_AFTER_CLASH':
      return { actionType: 'PROCEED_AFTER_CLASH', payload: {} };
    case 'COMBO_ATTACK':
      return {
        actionType: 'COMBO_ATTACK',
        payload: {
          cardId: action.cardId,
          spentConcertoIds: action.spentConcertoIds,
          discardForBonusDmgId: action.discardForBonusDmgId,
          swapSupportSlot: action.swapSupportSlot,
        },
      };
    case 'FINISH_COMBO':
      return { actionType: 'FINISH_COMBO', payload: {} };
    case 'DISCARD_OVERFLOW':
      return { actionType: 'DISCARD_OVERFLOW', payload: { cardIds: action.discardIds } };
    case 'RESOLVE_PENDING_CHOICE':
      return { actionType: 'PENDING_CHOICE', payload: { optionId: action.chosenCardIds } };
    case 'FINISH_EFFECT_DRAW':
      return { actionType: 'FINISH_EFFECT_DRAW', payload: { drawId: action.completedDrawId } };
    case 'DRAW_CARDS':
      return { actionType: 'DRAW_CARDS', payload: {} };
    case 'SELECT_STARTING_LEADER':
      return { actionType: 'SELECT_LEADER', payload: { leaderName: action.p1LeaderIdOrName } };
    case 'MULLIGAN':
      return { actionType: 'MULLIGAN', payload: { discardIds: action.p1DiscardIds || [] } };
    default:
      return null;
  }
}

export interface MultiplayerActionPayload {
  slotName?: 'leader' | 'leftSupport' | 'rightSupport';
  targetSlot?: 'leftSupport' | 'rightSupport';
  upgradeCardId?: string;
  discardIds?: string[];
  cardId?: string | null;
  spentConcertoIds?: string[];
  proceed?: boolean;
  discardForBonusDmgId?: string;
  swapSupportSlot?: 'leftSupport' | 'rightSupport';
  cardIds?: string[];
  optionId?: string | string[];
  chosenCardIds?: string[];
  drawId?: string;
  leaderName?: string;
}

/**
 * 원격 피어로부터 수신한 레거시 멀티플레이어 메시지(actionType, payload)를 GameAction으로 역직렬화합니다.
 */
export function multiplayerActionToGameAction(actionType: string, payload: MultiplayerActionPayload): GameAction | null {
  switch (actionType) {
    case 'DRAW_CARDS':
      return { type: 'DRAW_CARDS', playerIndex: 1 };
    case 'UPGRADE':
      return {
        type: 'UPGRADE',
        playerIndex: 1,
        targetSlot: payload.slotName || 'leader',
        upgradeCardId: payload.upgradeCardId || '',
        discardIds: payload.discardIds || [],
      };
    case 'SWITCH_LEADER':
      return { type: 'SWITCH_LEADER', playerIndex: 1, targetSlot: payload.targetSlot || 'leftSupport' };
    case 'CHARGE_CONCERTO':
      return { type: 'CHARGE_CONCERTO', playerIndex: 1, cardId: payload.cardId || '' };
    case 'SET_CLASH_CARD':
      return {
        type: 'SET_CLASH_CARD',
        playerIndex: 1,
        cardId: payload.cardId ?? null,
        spentConcertoIds: payload.spentConcertoIds,
      };
    case 'DECIDE_CLASH':
      return { type: 'DECIDE_CLASH', startClash: Boolean(payload.proceed) };
    case 'PROCEED_AFTER_CLASH':
      return { type: 'PROCEED_AFTER_CLASH' };
    case 'COMBO_ATTACK':
      return {
        type: 'COMBO_ATTACK',
        playerIndex: 1,
        cardId: payload.cardId || '',
        spentConcertoIds: payload.spentConcertoIds,
        discardForBonusDmgId: payload.discardForBonusDmgId,
        swapSupportSlot: payload.swapSupportSlot,
      };
    case 'FINISH_COMBO':
      return { type: 'FINISH_COMBO', playerIndex: 1 };
    case 'DISCARD_OVERFLOW':
      return { type: 'DISCARD_OVERFLOW', playerIndex: 1, discardIds: payload.cardIds || [] };
    case 'PENDING_CHOICE':
      return {
        type: 'RESOLVE_PENDING_CHOICE',
        chosenCardIds: Array.isArray(payload?.optionId)
          ? payload.optionId
          : Array.isArray(payload?.chosenCardIds)
          ? payload.chosenCardIds
          : [payload?.optionId || payload?.chosenCardIds].filter((x): x is string => typeof x === 'string'),
      };
    case 'FINISH_EFFECT_DRAW':
      return { type: 'FINISH_EFFECT_DRAW', completedDrawId: payload?.drawId };
    default:
      return null;
  }
}

export interface PeerSourceOptions {
  /** 게스트가 호스트에게 액션을 전송할 때 사용하는 함수 */
  sendAction?: (action: GameAction) => void;
  /** 호스트가 상태 전이 시 원격 피어들에게 동기화 메시지를 전송할 때 사용하는 함수 */
  broadcastState?: (state: GameState) => void;
}

export class PeerSource implements BattleSource {
  readonly kind: PeerRole;
  private state: GameState;
  private listeners = new Set<(state: GameState, events: GameEvent[]) => void>();
  private localHostSource: LocalSource | null = null;
  private seenHostFxIds = new Set<string>();
  private options: PeerSourceOptions;

  constructor(role: PeerRole, initialState: GameState, options: PeerSourceOptions = {}) {
    this.kind = role;
    this.state = initialState;
    this.options = options;

    if (role === 'peer-host') {
      this.localHostSource = new LocalSource(initialState, 'peer-host');
      this.localHostSource.subscribe((nextState, events) => {
        this.state = nextState;
        this.options.broadcastState?.(nextState);
        for (const listener of this.listeners) {
          listener(nextState, events);
        }
      });
    }
  }

  getState(): GameState {
    if (this.localHostSource) {
      return this.localHostSource.getState();
    }
    return this.state;
  }

  subscribe(listener: (state: GameState, events: GameEvent[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispatch(action: GameAction): void {
    if (this.kind === 'peer-host') {
      this.localHostSource?.dispatch(action);
    } else {
      // 게스트/관전자: 엔진을 직접 돌리지 않고 호스트에게 액션 위임
      this.options.sendAction?.(action);
    }
  }

  /**
   * 게스트/관전자가 네트워크(SYNC_GAME_STATE 등)를 통해 호스트의 새 상태를 수신했을 때 호출
   */
  receiveState(nextState: GameState, hostFxEvents: GameEvent[] = []): void {
    if (this.kind === 'peer-host') return;

    // 이전 상태와 동일한 참조인 경우 이벤트 0개 방출.
    // 레벨업·효과 알림은 상태 비교로 알 수 없으므로 호스트가 메시지에 실어 보낸 이벤트를 합친다 (같은 id는 1회만)
    const diffed = this.state === nextState ? [] : diffEvents(this.state, nextState);
    const fresh = hostFxEvents.filter((e) => e && e.id && !this.seenHostFxIds.has(e.id));
    for (const e of fresh) this.seenHostFxIds.add(e.id);
    const events = [...diffed, ...fresh];
    this.state = nextState;

    for (const listener of this.listeners) {
      listener(this.state, events);
    }
  }

  /** 호스트가 게스트로부터 액션을 수신했을 때 실행 */
  handleRemoteAction(action: GameAction): void {
    if (this.kind === 'peer-host') {
      this.localHostSource?.dispatch(action);
    }
  }
}
