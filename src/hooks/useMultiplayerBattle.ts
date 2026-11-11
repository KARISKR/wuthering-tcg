import { useState, useEffect, useCallback, useRef } from 'react';
import { multiplayerService } from '../services/multiplayerService';
import { mergeSyncedLogs } from '../services/syncLogs';
import type { GameState } from '../types/tcg';
import type { GameEvent } from '../engine/events';
import type { TimeLimitConfig } from '../types/multiplayer';
import {
  PeerSource,
  PeerRole,
  gameActionToMultiplayerAction,
} from '../battle/PeerSource';
import type { LocalSource } from '../battle/LocalSource';

export interface UseMultiplayerBattleOptions {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  battleSource?: LocalSource;
  initialMode: 'AI' | 'SOLO_DUAL' | 'MULTIPLAYER';
  isMultiplayer: boolean;
  isHost: boolean;
  isGuest: boolean;
  isSpectator: boolean;
  controlledPlayerIndex: 0 | 1;
  multiplayerRole: 'HOST' | 'GUEST' | 'SPECTATOR' | null;

  // 연결 및 카운트다운 상태
  isMultiplayerDisconnected: boolean;
  setIsMultiplayerDisconnected: React.Dispatch<React.SetStateAction<boolean>>;
  disconnectCountdown: number | null;
  setDisconnectCountdown: React.Dispatch<React.SetStateAction<number | null>>;

  // 상태 업데이트 트리거
  setIsInitiativeRolling: React.Dispatch<React.SetStateAction<boolean>>;
  setHasSelectedMyLeader: React.Dispatch<React.SetStateAction<boolean>>;
  setHasCompletedMyMulligan: React.Dispatch<React.SetStateAction<boolean>>;
  setTimeLimitConfig: React.Dispatch<React.SetStateAction<TimeLimitConfig>>;
  setP0TotalTime: React.Dispatch<React.SetStateAction<number>>;
  setP1TotalTime: React.Dispatch<React.SetStateAction<number>>;
  setCurrentTurnTime: React.Dispatch<React.SetStateAction<number>>;

  // 공유 Ref
  lastRoll0Ref: React.MutableRefObject<number>;
  lastRoll1Ref: React.MutableRefObject<number>;
  guestLeaderRef: React.MutableRefObject<string | null>;
  hostLeaderRef: React.MutableRefObject<string | null>;
  guestMulliganRef: React.MutableRefObject<string[] | null>;
  hostMulliganRef: React.MutableRefObject<string[] | null>;

  // 호스트 전용 엔진 디스패치 콜백
  engineDrawCards: (playerIndex?: 0 | 1) => void;
  engineSelectStartingLeader: (p0Leader: string, p1Leader?: string) => void;
  engineMulligan: (p0DiscardIds: string[], p1DiscardIds?: string[]) => void;
  engineUpgrade: (
    playerIndex: 0 | 1,
    slotName: 'leader' | 'leftSupport' | 'rightSupport',
    upgradeCardId: string,
    discardIds: string[]
  ) => void;
  engineSwitchLeader: (playerIndex: 0 | 1, targetSlot: 'leftSupport' | 'rightSupport') => void;
  engineChargeConcerto: (playerIndex: 0 | 1, cardId: string) => void;
  engineSetClashCard: (playerIndex: 0 | 1, cardId: string | null, spentConcertoIds?: string[]) => void;
  engineDecideClash: (proceed: boolean) => void;
  engineProceedAfterClash: () => void;
  engineComboAttack: (
    playerIndex: 0 | 1,
    cardId: string,
    spentConcertoIds?: string[],
    discardForBonusDmgId?: string,
    swapSupportSlot?: 'leftSupport' | 'rightSupport'
  ) => void;
  engineFinishCombo: (playerIndex: 0 | 1) => void;
  engineDiscardOverflow: (playerIndex: 0 | 1, cardIds: string[]) => void;
  engineResolvePendingChoice: (chosenCardIds: string[]) => void;
  engineFinishEffectDraw: (drawId?: string) => void;
  engineSurrender: (playerIndex: 0 | 1) => void;
  engineTimeOut: (loserIndex: 0 | 1, reason?: string) => void;
  handleSetInitiative: (
    firstPlayerIndex: 0 | 1,
    roll0: number,
    roll1: number,
    meta?: { winnerIndex: 0 | 1; chosenOrder: 'FIRST' | 'SECOND' }
  ) => void;
}

export function useMultiplayerBattle({
  gameState,
  setGameState,
  battleSource,
  initialMode,
  isMultiplayer,
  isHost,
  isGuest,
  isSpectator,
  controlledPlayerIndex,
  isMultiplayerDisconnected,
  setIsMultiplayerDisconnected,
  setDisconnectCountdown,
  setIsInitiativeRolling,
  setHasSelectedMyLeader,
  setHasCompletedMyMulligan,
  setTimeLimitConfig,
  setP0TotalTime,
  setP1TotalTime,
  setCurrentTurnTime,
  lastRoll0Ref,
  lastRoll1Ref,
  guestLeaderRef,
  hostLeaderRef,
  guestMulliganRef,
  hostMulliganRef,
  engineDrawCards,
  engineSelectStartingLeader,
  engineMulligan,
  engineUpgrade,
  engineSwitchLeader,
  engineChargeConcerto,
  engineSetClashCard,
  engineDecideClash,
  engineProceedAfterClash,
  engineComboAttack,
  engineFinishCombo,
  engineDiscardOverflow,
  engineResolvePendingChoice,
  engineFinishEffectDraw,
  engineSurrender,
  engineTimeOut,
  handleSetInitiative,
}: UseMultiplayerBattleOptions) {
  // 관전자 수
  const [spectatorCount, setSpectatorCount] = useState<number>(() => multiplayerService.spectatorCount);

  // 네트워크 핑 상태
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  // 멀티플레이 주사위 및 선/후공 선택 동기화 상태
  const [externalDiceResult, setExternalDiceResult] = useState<{ val0: number; val1: number; winIdx: 0 | 1 } | null>(null);
  const [externalOrderChoice, setExternalOrderChoice] = useState<'FIRST' | 'SECOND' | null>(null);

  // 0. [멀티플레이] 브라우저 새로고침/재진입 시 로컬에 보존된 이전 게임 진행 상태 즉각 복원
  useEffect(() => {
    if (initialMode === 'MULTIPLAYER') {
      const saved = multiplayerService.getSavedSession();
      if (saved?.lastGameState) {
        syncedLogsRef.current = saved.lastGameState.logs;
        setGameState(saved.lastGameState);
        if (saved.timeLimitConfig) setTimeLimitConfig(saved.timeLimitConfig);
        if (saved.p0TotalTime !== undefined) setP0TotalTime(saved.p0TotalTime);
        if (saved.p1TotalTime !== undefined) setP1TotalTime(saved.p1TotalTime);
        if (saved.currentTurnTime !== undefined) setCurrentTurnTime(saved.currentTurnTime);
      }
    }
  }, [initialMode, setGameState, setTimeLimitConfig, setP0TotalTime, setP1TotalTime, setCurrentTurnTime]);

  // 1. [멀티플레이 / Step B] PeerSource 어댑터 및 호스트 상태 브로드캐스트
  const [peerSource] = useState<PeerSource | null>(() => {
    if (!isMultiplayer) return null;
    const role: PeerRole = isHost ? 'peer-host' : isGuest ? 'peer-guest' : 'spectator';
    return new PeerSource(role, gameState, {
      sendAction: (action) => {
        const mapped = gameActionToMultiplayerAction(action);
        if (mapped) {
          multiplayerService.sendAction(mapped.actionType, 1, mapped.payload);
        }
      },
      broadcastState: (st) => {
        multiplayerService.sendGameState(st);
      },
    });
  });

  // 1-B. [멀티플레이 게스트/관전자] PeerSource 이벤트 구독 및 로컬 step 차단 연결
  useEffect(() => {
    if (!isMultiplayer || (!isGuest && !isSpectator) || !peerSource || !battleSource) return;

    battleSource.setCustomDispatcher((action) => {
      if (action.type === 'SURRENDER' || action.type === 'TIME_OUT') {
        battleSource.setCustomDispatcher(null);
        battleSource.dispatch(action);
        battleSource.setCustomDispatcher((a) => peerSource.dispatch(a));
        return;
      }
      peerSource.dispatch(action);
    });

    const unsub = peerSource.subscribe((nextState, events) => {
      battleSource.receiveExternalState(nextState, events);
    });

    return () => {
      unsub();
      battleSource.setCustomDispatcher(null);
    };
  }, [isMultiplayer, isGuest, isSpectator, peerSource, battleSource]);

  // [WP8 버그 수정] 호스트: 엔진이 낸 레벨업·효과 알림 이벤트를 모아 다음 상태 동기화에 함께 보낸다
  // (게스트는 step을 돌리지 않아 상태 비교만으로는 이 연출을 알 수 없음)
  const pendingHostFxRef = useRef<GameEvent[]>([]);
  useEffect(() => {
    if (!isMultiplayer || !isHost || !battleSource) return;
    return battleSource.subscribe((_state, events) => {
      for (const e of events) {
        if (e.type === 'UPGRADE' || e.type === 'EFFECT_TRIGGERED') pendingHostFxRef.current.push(e);
      }
    });
  }, [isMultiplayer, isHost, battleSource]);

  useEffect(() => {
    if (gameState.gameMode === 'MULTIPLAYER' && isHost) {
      const fx = pendingHostFxRef.current;
      pendingHostFxRef.current = [];
      multiplayerService.sendGameState(gameState, undefined, fx);
    }
  }, [gameState, isHost]);

  // 2. [멀티플레이] 게스트 및 관전자: 상태 동기화 및 기권 수신
  // 호스트는 새 로그만 보내므로(logsAnchorId), 받은 로그를 지금까지 받은 로그에 이어 붙인다
  const syncedLogsRef = useRef(gameState.logs);
  useEffect(() => {
    if (gameState.gameMode !== 'MULTIPLAYER' || (!isGuest && !isSpectator)) return;

    const unsub = multiplayerService.onMessage((msg) => {
      if (msg.type === 'SPECTATOR_INIT' || msg.type === 'RECONNECT_ACCEPT') {
        syncedLogsRef.current = msg.gameState.logs; // 전체 상태 → 기준 갱신
      }
      if (msg.type === 'SYNC_GAME_STATE') {
        const logs = mergeSyncedLogs(msg.gameState.logs, syncedLogsRef.current, msg.logsAnchorId);
        syncedLogsRef.current = logs;
        const full = { ...msg.gameState, logs };
        if (peerSource && battleSource) {
          peerSource.receiveState(full, msg.fxEvents || []);
        } else {
          setGameState(full);
        }
        multiplayerService.saveSession(full);
      } else if (msg.type === 'SPECTATOR_INIT') {
        setIsInitiativeRolling(false);
        if (peerSource && battleSource) {
          peerSource.receiveState(msg.gameState);
        } else {
          setGameState(msg.gameState);
        }
        multiplayerService.saveSession(msg.gameState);
        if (msg.timeLimitConfig) setTimeLimitConfig(msg.timeLimitConfig);
        if (msg.p0TotalTime !== undefined) setP0TotalTime(msg.p0TotalTime);
        if (msg.p1TotalTime !== undefined) setP1TotalTime(msg.p1TotalTime);
        if (msg.currentTurnTime !== undefined) setCurrentTurnTime(msg.currentTurnTime);
      } else if (msg.type === 'RECONNECT_ACCEPT') {
        if (peerSource && battleSource) {
          peerSource.receiveState(msg.gameState);
        } else {
          setGameState(msg.gameState);
        }
        multiplayerService.saveSession(msg.gameState);
        setIsMultiplayerDisconnected(false);
        setDisconnectCountdown(null);
        if (msg.timeLimitConfig) setTimeLimitConfig(msg.timeLimitConfig);
        if (msg.p0TotalTime !== undefined) setP0TotalTime(msg.p0TotalTime);
        if (msg.p1TotalTime !== undefined) setP1TotalTime(msg.p1TotalTime);
        if (msg.currentTurnTime !== undefined) setCurrentTurnTime(msg.currentTurnTime);
      } else if (msg.type === 'TIME_SYNC') {
        setP0TotalTime(msg.p0TotalTime);
        setP1TotalTime(msg.p1TotalTime);
        setCurrentTurnTime(msg.currentTurnTime);
      } else if (msg.type === 'TIME_OUT') {
        engineTimeOut(msg.loserIndex, msg.reason);
      } else if (msg.type === 'DISPATCH_ACTION') {
        if (msg.actionType === 'INITIATIVE_ROLL') {
          setExternalDiceResult(msg.payload);
          lastRoll0Ref.current = msg.payload.val0;
          lastRoll1Ref.current = msg.payload.val1;
        } else if (msg.actionType === 'CHOOSE_ORDER') {
          setExternalOrderChoice(msg.payload.order);
        }
      } else if (msg.type === 'SURRENDER') {
        const surrenderIdx: 0 | 1 = msg.playerIndex !== undefined ? msg.playerIndex : 0;
        setIsInitiativeRolling(false);
        engineSurrender(surrenderIdx);
      }
    });
    return unsub;
  }, [
    gameState.gameMode,
    isGuest,
    isSpectator,
    setGameState,
    setIsInitiativeRolling,
    setTimeLimitConfig,
    setP0TotalTime,
    setP1TotalTime,
    setCurrentTurnTime,
    lastRoll0Ref,
    lastRoll1Ref,
    setIsMultiplayerDisconnected,
    setDisconnectCountdown,
    engineSurrender,
    engineTimeOut,
    peerSource,
    battleSource,
  ]);

  // 3. [멀티플레이] 호스트: 게스트의 액션 수신 및 실행
  // 게스트는 항상 1번 플레이어. 차례가 필요한 행동은 게스트 차례일 때만, 선택은 게스트의 선택일 때만 받는다
  // (조작된 게스트가 호스트의 턴을 넘기거나 호스트의 선택을 대신 고르지 못하게)
  const latestStateRef = useRef(gameState);
  useEffect(() => {
    latestStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (gameState.gameMode !== 'MULTIPLAYER' || !isHost) return;

    const GUEST_TURN_ONLY = new Set(['DRAW_CARDS', 'UPGRADE', 'SWITCH_LEADER', 'CHARGE_CONCERTO', 'DECIDE_CLASH']);
    const unsub = multiplayerService.onMessage((msg) => {
      if (msg.type === 'DISPATCH_ACTION') {
        const { actionType, payload } = msg;
        const st = latestStateRef.current;
        if (GUEST_TURN_ONLY.has(actionType) && st.activePlayerIndex !== 1) return;
        if (actionType === 'PENDING_CHOICE' && st.pendingChoice?.playerIndex !== 1) return;
        switch (actionType) {
          case 'DRAW_CARDS':
            engineDrawCards(1);
            break;
          case 'CHOOSE_ORDER':
            setExternalOrderChoice(payload.order);
            {
              const firstIdx: 0 | 1 = payload.order === 'FIRST' ? 1 : 0;
              handleSetInitiative(firstIdx, lastRoll0Ref.current || 1, lastRoll1Ref.current || 6, {
                winnerIndex: 1,
                chosenOrder: payload.order,
              });
              setIsInitiativeRolling(false);
            }
            break;
          case 'SELECT_LEADER':
            guestLeaderRef.current = payload?.leaderName;
            if (hostLeaderRef.current) {
              engineSelectStartingLeader(hostLeaderRef.current, guestLeaderRef.current || undefined);
            }
            break;
          case 'MULLIGAN':
            guestMulliganRef.current = payload?.discardIds || [];
            if (hostMulliganRef.current !== null) {
              engineMulligan(hostMulliganRef.current, guestMulliganRef.current || undefined);
            }
            break;
          case 'UPGRADE':
            engineUpgrade(1, payload.slotName, payload.upgradeCardId, payload.discardIds);
            break;
          case 'SWITCH_LEADER':
            engineSwitchLeader(1, payload.targetSlot);
            break;
          case 'CHARGE_CONCERTO':
            engineChargeConcerto(1, payload.cardId);
            break;
          case 'SET_CLASH_CARD':
            engineSetClashCard(1, payload.cardId, payload.spentConcertoIds);
            break;
          case 'DECIDE_CLASH':
            engineDecideClash(payload.proceed);
            break;
          case 'PROCEED_AFTER_CLASH':
            engineProceedAfterClash();
            break;
          case 'COMBO_ATTACK':
            engineComboAttack(
              1,
              payload.cardId,
              payload.spentConcertoIds,
              payload.discardForBonusDmgId,
              payload.swapSupportSlot
            );
            break;
          case 'FINISH_COMBO':
            engineFinishCombo(1);
            break;
          case 'DISCARD_OVERFLOW':
            engineDiscardOverflow(1, payload.cardIds);
            break;
          case 'PENDING_CHOICE':
            engineResolvePendingChoice(
              Array.isArray(payload?.optionId)
                ? payload.optionId
                : Array.isArray(payload?.chosenCardIds)
                ? payload.chosenCardIds
                : [payload?.optionId || payload?.chosenCardIds].filter(Boolean)
            );
            break;
          case 'FINISH_EFFECT_DRAW':
            engineFinishEffectDraw(payload?.drawId);
            break;
          default:
            break;
        }
      } else if (msg.type === 'SURRENDER') {
        // 게스트가 보낸 항복은 항상 게스트(1번)의 항복 (playerIndex 값은 믿지 않음)
        setIsInitiativeRolling(false);
        engineSurrender(1);
      }
    });

    return unsub;
  }, [
    gameState.gameMode,
    isHost,
    engineDrawCards,
    engineSelectStartingLeader,
    engineMulligan,
    engineUpgrade,
    engineSwitchLeader,
    engineChargeConcerto,
    engineSetClashCard,
    engineDecideClash,
    engineProceedAfterClash,
    engineComboAttack,
    engineFinishCombo,
    engineDiscardOverflow,
    engineResolvePendingChoice,
    engineFinishEffectDraw,
    engineSurrender,
    handleSetInitiative,
    setIsInitiativeRolling,
    lastRoll0Ref,
    lastRoll1Ref,
    guestLeaderRef,
    hostLeaderRef,
    guestMulliganRef,
    hostMulliganRef,
  ]);

  // 4. [멀티플레이] 네트워크 끊김 및 재접속 카운트다운 리스너
  useEffect(() => {
    if (gameState.gameMode !== 'MULTIPLAYER') return;

    const unsubCount = multiplayerService.onDisconnectCountdown((seconds) => {
      setDisconnectCountdown(seconds);
      if (seconds > 0) {
        setIsMultiplayerDisconnected(true);
      }
    });

    const unsubStatus = multiplayerService.onStatusChange((status) => {
      if (status === 'DISCONNECTED') {
        setIsMultiplayerDisconnected(true);
      } else if (status === 'CONNECTED') {
        setIsMultiplayerDisconnected(false);
        setDisconnectCountdown(null);
      }
    });

    const unsubMsg = multiplayerService.onMessage((msg) => {
      if (msg.type === 'PONG') {
        setPingLatency(multiplayerService.pingMs);
      } else if (msg.type === 'SPECTATOR_COUNT') {
        setSpectatorCount(msg.count);
      }
    });

    return () => {
      unsubCount();
      unsubStatus();
      unsubMsg();
    };
  }, [gameState.gameMode, setIsMultiplayerDisconnected, setDisconnectCountdown]);

  // 5. [멀티플레이] 연결 끊김 시 게스트의 자동 재접속 시도
  useEffect(() => {
    if (gameState.gameMode !== 'MULTIPLAYER' || !isGuest || !isMultiplayerDisconnected) return;

    const retryTimer = setInterval(() => {
      if (!multiplayerService.isReconnecting && multiplayerService.status === 'DISCONNECTED') {
        multiplayerService
          .attemptReconnect()
          .then((success) => {
            if (success) {
              setIsMultiplayerDisconnected(false);
              setDisconnectCountdown(null);
            }
          })
          .catch(() => {});
      }
    }, 4000);

    return () => clearInterval(retryTimer);
  }, [gameState.gameMode, isGuest, isMultiplayerDisconnected, setIsMultiplayerDisconnected, setDisconnectCountdown]);

  // 6. [멀티플레이 액션 프록시 래퍼] 게스트(P1)는 호스트에게 액션을 전송하고, 호스트/솔로/AI는 로컬 엔진 실행
  const handleDrawCards = useCallback(
    (pIdx?: 0 | 1) => {
      if (isSpectator) return;
      const targetIdx = pIdx ?? controlledPlayerIndex;
      if (isGuest) {
        multiplayerService.sendAction('DRAW_CARDS', 1);
      } else {
        engineDrawCards(targetIdx);
      }
    },
    [isSpectator, isGuest, controlledPlayerIndex, engineDrawCards]
  );

  const handleSelectStartingLeader = useCallback(
    (p0Leader: string, p1Leader?: string) => {
      if (isSpectator) return;
      setHasSelectedMyLeader(true);
      if (isGuest) {
        multiplayerService.sendAction('SELECT_LEADER', 1, { leaderName: p0Leader });
      } else if (isHost) {
        hostLeaderRef.current = p0Leader;
        if (guestLeaderRef.current) {
          engineSelectStartingLeader(p0Leader, guestLeaderRef.current);
        }
      } else {
        engineSelectStartingLeader(p0Leader, p1Leader);
      }
    },
    [isSpectator, isGuest, isHost, engineSelectStartingLeader, setHasSelectedMyLeader, hostLeaderRef, guestLeaderRef]
  );

  const handleMulligan = useCallback(
    (discardIds: string[]) => {
      if (isSpectator) return;
      setHasCompletedMyMulligan(true);
      if (isGuest) {
        multiplayerService.sendAction('MULLIGAN', 1, { discardIds });
      } else if (isHost) {
        hostMulliganRef.current = discardIds;
        if (guestMulliganRef.current !== null) {
          engineMulligan(discardIds, guestMulliganRef.current);
        }
      } else {
        engineMulligan(discardIds);
      }
    },
    [isSpectator, isGuest, isHost, engineMulligan, setHasCompletedMyMulligan, hostMulliganRef, guestMulliganRef]
  );

  const handleUpgrade = useCallback(
    (
      pIdx: 0 | 1,
      slotName: 'leader' | 'leftSupport' | 'rightSupport',
      upgradeCardId: string,
      discardIds: string[]
    ) => {
      if (isSpectator) return;
      if (isGuest) {
        if (peerSource) {
          peerSource.dispatch({
            type: 'UPGRADE',
            playerIndex: 1,
            targetSlot: slotName,
            upgradeCardId,
            discardIds,
          });
        } else {
          multiplayerService.sendAction('UPGRADE', 1, { slotName, upgradeCardId, discardIds });
        }
      } else {
        engineUpgrade(pIdx, slotName, upgradeCardId, discardIds);
      }
    },
    [isSpectator, isGuest, engineUpgrade, peerSource]
  );

  const handleSwitchLeader = useCallback(
    (pIdx: 0 | 1, targetSlot: 'leftSupport' | 'rightSupport') => {
      if (isSpectator) return;
      if (isGuest) {
        if (peerSource) {
          peerSource.dispatch({ type: 'SWITCH_LEADER', playerIndex: 1, targetSlot });
        } else {
          multiplayerService.sendAction('SWITCH_LEADER', 1, { targetSlot });
        }
      } else {
        engineSwitchLeader(pIdx, targetSlot);
      }
    },
    [isSpectator, isGuest, engineSwitchLeader, peerSource]
  );

  const handleChargeConcerto = useCallback(
    (pIdx: 0 | 1, cardId: string) => {
      if (isSpectator) return;
      if (isGuest) {
        if (peerSource) {
          peerSource.dispatch({ type: 'CHARGE_CONCERTO', playerIndex: 1, cardId });
        } else {
          multiplayerService.sendAction('CHARGE_CONCERTO', 1, { cardId });
        }
      } else {
        engineChargeConcerto(pIdx, cardId);
      }
    },
    [isSpectator, isGuest, engineChargeConcerto, peerSource]
  );

  const handleSetClashCard = useCallback(
    (pIdx: 0 | 1, cardId: string | null, spentConcertoIds?: string[]) => {
      if (isSpectator) return;
      if (isGuest) {
        if (peerSource) {
          peerSource.dispatch({ type: 'SET_CLASH_CARD', playerIndex: 1, cardId, spentConcertoIds });
        } else {
          multiplayerService.sendAction('SET_CLASH_CARD', 1, { cardId, spentConcertoIds });
        }
      } else {
        engineSetClashCard(pIdx, cardId, spentConcertoIds);
      }
    },
    [isSpectator, isGuest, engineSetClashCard, peerSource]
  );

  const handleDecideClash = useCallback(
    (proceed: boolean) => {
      if (isSpectator) return;
      if (isGuest) {
        if (peerSource) {
          peerSource.dispatch({ type: 'DECIDE_CLASH', startClash: proceed });
        } else {
          multiplayerService.sendAction('DECIDE_CLASH', 1, { proceed });
        }
      } else {
        engineDecideClash(proceed);
      }
    },
    [isSpectator, isGuest, engineDecideClash, peerSource]
  );

  const handleProceedAfterClash = useCallback(() => {
    if (isSpectator) return;
    if (isGuest) {
      if (peerSource) {
        peerSource.dispatch({ type: 'PROCEED_AFTER_CLASH' });
      } else {
        multiplayerService.sendAction('PROCEED_AFTER_CLASH', 1);
      }
    } else {
      engineProceedAfterClash();
    }
  }, [isSpectator, isGuest, engineProceedAfterClash, peerSource]);

  const handleComboAttack = useCallback(
    (
      pIdx: 0 | 1,
      cardId: string,
      spentConcertoIds?: string[],
      discardForBonusDmgId?: string,
      swapSupportSlot?: 'leftSupport' | 'rightSupport'
    ) => {
      if (isSpectator) return;
      if (isGuest) {
        if (peerSource) {
          peerSource.dispatch({
            type: 'COMBO_ATTACK',
            playerIndex: 1,
            cardId,
            spentConcertoIds,
            discardForBonusDmgId,
            swapSupportSlot,
          });
        } else {
          multiplayerService.sendAction('COMBO_ATTACK', 1, {
            cardId,
            spentConcertoIds,
            discardForBonusDmgId,
            swapSupportSlot,
          });
        }
      } else {
        engineComboAttack(pIdx, cardId, spentConcertoIds, discardForBonusDmgId, swapSupportSlot);
      }
    },
    [isSpectator, isGuest, engineComboAttack, peerSource]
  );

  const handleFinishCombo = useCallback(
    (pIdx: 0 | 1) => {
      if (isSpectator) return;
      if (isGuest) {
        if (peerSource) {
          peerSource.dispatch({ type: 'FINISH_COMBO', playerIndex: 1 });
        } else {
          multiplayerService.sendAction('FINISH_COMBO', 1);
        }
      } else {
        engineFinishCombo(pIdx);
      }
    },
    [isSpectator, isGuest, engineFinishCombo, peerSource]
  );

  const handleDiscardOverflow = useCallback(
    (pIdx: 0 | 1, cardIds: string[]) => {
      if (isSpectator) return;
      if (isGuest) {
        if (peerSource) {
          peerSource.dispatch({ type: 'DISCARD_OVERFLOW', playerIndex: 1, discardIds: cardIds });
        } else {
          multiplayerService.sendAction('DISCARD_OVERFLOW', 1, { cardIds });
        }
      } else {
        engineDiscardOverflow(pIdx, cardIds);
      }
    },
    [isSpectator, isGuest, engineDiscardOverflow, peerSource]
  );

  const handleResolvePendingChoice = useCallback(
    (chosenCardIds: string[]) => {
      if (isSpectator) return;
      if (isGuest) {
        if (peerSource) {
          peerSource.dispatch({ type: 'RESOLVE_PENDING_CHOICE', chosenCardIds });
        } else {
          multiplayerService.sendAction('PENDING_CHOICE', 1, { optionId: chosenCardIds });
        }
      } else {
        engineResolvePendingChoice(chosenCardIds);
      }
    },
    [isSpectator, isGuest, engineResolvePendingChoice, peerSource]
  );

  const handleFinishEffectDraw = useCallback(
    (completedDrawId?: string) => {
      if (isSpectator) return;
      const targetDrawId = completedDrawId;
      if (isGuest) {
        if (peerSource) {
          peerSource.dispatch({ type: 'FINISH_EFFECT_DRAW', completedDrawId: targetDrawId });
        } else {
          multiplayerService.sendAction('FINISH_EFFECT_DRAW', 1, { drawId: targetDrawId });
        }
      } else {
        engineFinishEffectDraw(targetDrawId);
      }
    },
    [isSpectator, isGuest, engineFinishEffectDraw, peerSource]
  );

  return {
    peerSource,
    pingLatency,
    setPingLatency,
    spectatorCount,
    setSpectatorCount,
    externalDiceResult,
    setExternalDiceResult,
    externalOrderChoice,
    setExternalOrderChoice,
    handleDrawCards,
    handleSelectStartingLeader,
    handleMulligan,
    handleUpgrade,
    handleSwitchLeader,
    handleChargeConcerto,
    handleSetClashCard,
    handleDecideClash,
    handleProceedAfterClash,
    handleComboAttack,
    handleFinishCombo,
    handleDiscardOverflow,
    handleResolvePendingChoice,
    handleFinishEffectDraw,
  };
}
