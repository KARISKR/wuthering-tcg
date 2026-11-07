import { useState, useEffect, useRef, useCallback } from 'react';
import { soundEffects, getWeaponByCharacter } from '../utils/soundEffects';
import { getCharacterIdleQuote, getCharacterLowHpQuote } from '../data/characterQuotes';
import type { GameState, PlayerState, CharacterCard } from '../types/tcg';
import type { GameEvent } from '../engine/events';

export interface UseBattleAudioOptions {
  gameState: GameState;
  p0: PlayerState;
  p1: PlayerState;
  isDrawFlightActive: boolean;
  lastEvents?: GameEvent[];
  isFxBlocking: boolean;
  isRulesOpen: boolean;
  isCatalogOpen: boolean;
  isReplayOpen: boolean;
  showMatchOpening: boolean;
  showExitConfirm: boolean;
  isInitiativeRolling: boolean;
  evolutionModalChar: CharacterCard | null;
  cardListModalState: { isOpen: boolean } | null;
  concertoModalState: { isOpen: boolean };
}

export function useBattleAudio({
  gameState,
  p0,
  p1,
  isDrawFlightActive,
  lastEvents,
  isFxBlocking,
  isRulesOpen,
  isCatalogOpen,
  isReplayOpen,
  showMatchOpening,
  showExitConfirm,
  isInitiativeRolling,
  evolutionModalChar,
  cardListModalState,
  concertoModalState,
}: UseBattleAudioOptions) {
  // 덱에서 카드 드로우 시 시각 효과 상태 (CARD_DRAWN 이벤트 및 덱 매수 변화 연동)
  const [p0DeckDrawing, setP0DeckDrawing] = useState(false);
  const [p1DeckDrawing, setP1DeckDrawing] = useState(false);
  const prevP0DeckLen = useRef(p0?.actionDeck.length ?? 0);
  const prevP1DeckLen = useRef(p1?.actionDeck.length ?? 0);

  // [WP7 이벤트 소비] step()에서 발생한 CARD_DRAWN 이벤트 수신 시 덱 드로우 이펙트 활성화
  useEffect(() => {
    if (!lastEvents || lastEvents.length === 0) return;
    for (const evt of lastEvents) {
      if (evt.type === 'CARD_DRAWN') {
        if (evt.playerIndex === 0) {
          setP0DeckDrawing(true);
          const t = setTimeout(() => setP0DeckDrawing(false), 600);
          return () => clearTimeout(t);
        } else if (evt.playerIndex === 1) {
          setP1DeckDrawing(true);
          const t = setTimeout(() => setP1DeckDrawing(false), 600);
          return () => clearTimeout(t);
        }
      }
    }
  }, [lastEvents]);

  useEffect(() => {
    if (!p0) return;
    if (p0.actionDeck.length < prevP0DeckLen.current) {
      setP0DeckDrawing(true);
      const t = setTimeout(() => setP0DeckDrawing(false), 600);
      prevP0DeckLen.current = p0.actionDeck.length;
      return () => clearTimeout(t);
    }
    prevP0DeckLen.current = p0.actionDeck.length;
  }, [p0?.actionDeck.length]);

  useEffect(() => {
    if (!p1) return;
    if (p1.actionDeck.length < prevP1DeckLen.current) {
      setP1DeckDrawing(true);
      const t = setTimeout(() => setP1DeckDrawing(false), 600);
      prevP1DeckLen.current = p1.actionDeck.length;
      return () => clearTimeout(t);
    }
    prevP1DeckLen.current = p1.actionDeck.length;
  }, [p1?.actionDeck.length]);

  useEffect(() => {
    if (isDrawFlightActive) {
      if (gameState.activePlayerIndex === 0) {
        setP0DeckDrawing(true);
        const t = setTimeout(() => setP0DeckDrawing(false), 1000);
        return () => clearTimeout(t);
      } else {
        setP1DeckDrawing(true);
        const t = setTimeout(() => setP1DeckDrawing(false), 1000);
        return () => clearTimeout(t);
      }
    }
  }, [isDrawFlightActive, gameState.activePlayerIndex]);

  // 장시간 미조작(고민/방치) 이스터에그 보이스 및 말풍선 상태
  const [idleSpeech, setIdleSpeech] = useState<{ text: string; visible: boolean }>({
    text: '',
    visible: false,
  });
  const lastUserActionTimeRef = useRef<number>(Date.now());
  const lastIdleTriggerTimeRef = useRef<number>(0);

  // 사용자 마우스/터치/키보드 입력 감지 시 타이머 갱신 및 말풍선 자동 숨김
  useEffect(() => {
    const handleUserInteraction = () => {
      lastUserActionTimeRef.current = Date.now();
      if (idleSpeech.visible) {
        setIdleSpeech((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    };

    window.addEventListener('pointerdown', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    return () => {
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [idleSpeech.visible]);

  // 플레이어 턴에 장시간 고민/미조작(15초) 시 이스터에그 트리거
  useEffect(() => {
    const interval = setInterval(() => {
      const isPlayablePhase =
        (gameState.phase === 'ACTION_PHASE' && gameState.activePlayerIndex === 0) ||
        (gameState.phase === 'CLASH_SET' && !gameState.players[0].clashCardReady) ||
        (gameState.phase === 'COMBO_STEP' && gameState.activePlayerIndex === 0);

      const isModalOrOverlayActive =
        isRulesOpen ||
        isCatalogOpen ||
        isReplayOpen ||
        showMatchOpening ||
        showExitConfirm ||
        isInitiativeRolling ||
        Boolean(evolutionModalChar) ||
        Boolean(cardListModalState?.isOpen) ||
        concertoModalState?.isOpen ||
        isFxBlocking ||
        gameState.phase === 'GAME_OVER' ||
        gameState.phase === 'LEADER_SELECT' ||
        gameState.phase === 'MULLIGAN';

      if (isPlayablePhase && !isModalOrOverlayActive) {
        const now = Date.now();
        const idleDuration = now - lastUserActionTimeRef.current;
        const cooldownDuration = now - lastIdleTriggerTimeRef.current;

        if (idleDuration >= 15000 && cooldownDuration >= 30000) {
          lastIdleTriggerTimeRef.current = now;
          const leaderCard = gameState.players[0].slots.leader;
          if (leaderCard) {
            const charName = leaderCard.characterName || leaderCard.nameKr;
            const quote = getCharacterIdleQuote(charName);
            soundEffects.playLeaderIdle(charName);
            setIdleSpeech({ text: quote, visible: true });
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    gameState.phase,
    gameState.activePlayerIndex,
    gameState.players,
    isRulesOpen,
    isCatalogOpen,
    isReplayOpen,
    showMatchOpening,
    showExitConfirm,
    isInitiativeRolling,
    evolutionModalChar,
    cardListModalState,
    concertoModalState?.isOpen,
    isFxBlocking,
  ]);

  // 말풍선 4.5초 후 자동 숨김
  useEffect(() => {
    if (idleSpeech.visible) {
      const timer = setTimeout(() => {
        setIdleSpeech((prev) => ({ ...prev, visible: false }));
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [idleSpeech.visible]);

  // 대미지 및 회복 트랜지션 애니메이션 상태 (실시간 피격 및 회복 팝업)
  const [p0DamageAlert, setP0DamageAlert] = useState<{ prev: number; curr: number; diff: number } | null>(null);
  const [p1DamageAlert, setP1DamageAlert] = useState<{ prev: number; curr: number; diff: number } | null>(null);
  const [p0HealAlert, setP0HealAlert] = useState<{ prev: number; curr: number; diff: number } | null>(null);
  const [p1HealAlert, setP1HealAlert] = useState<{ prev: number; curr: number; diff: number } | null>(null);

  // 피격/대미지 및 체력 회복 효과음 & 시각적 배지 자동 감지
  const prevP0Hp = useRef(p0?.hp ?? 20);
  const prevP1Hp = useRef(p1?.hp ?? 20);

  // 체력 5 이하 위기 효과음 게임당 최초 1회 발동 플래그
  const hasTriggeredP0LowHpRef = useRef(false);
  const hasTriggeredP1LowHpRef = useRef(false);

  const resetLowHpFlags = useCallback(() => {
    hasTriggeredP0LowHpRef.current = false;
    hasTriggeredP1LowHpRef.current = false;
  }, []);

  useEffect(() => {
    if (gameState.phase === 'LEADER_SELECT' || gameState.phase === 'MULLIGAN' || (gameState.turn === 1 && gameState.phase === 'START_PHASE')) {
      hasTriggeredP0LowHpRef.current = false;
      hasTriggeredP1LowHpRef.current = false;
    }
  }, [gameState.phase, gameState.turn]);

  useEffect(() => {
    if (!p0) return;
    if (p0.hp < prevP0Hp.current) {
      const diff = prevP0Hp.current - p0.hp;
      const wasAbove5 = prevP0Hp.current > 5;
      prevP0Hp.current = p0.hp;
      setP0DamageAlert({ prev: prevP0Hp.current + diff, curr: p0.hp, diff });
      const timer = setTimeout(() => setP0DamageAlert(null), 2500);

      const victimLeader = p0.slots.leader;
      const victimName = victimLeader ? (victimLeader.characterName || victimLeader.nameKr) : undefined;

      if (
        gameState.phase !== 'CLASH_REVEAL' &&
        gameState.phase !== 'COMBO_STEP'
      ) {
        const attackerLeader = p1?.slots.leader;
        const weapon = attackerLeader ? getWeaponByCharacter(attackerLeader.characterName || attackerLeader.nameKr) : undefined;
        soundEffects.playDamage(diff, weapon, victimName);
      }

      if (p0.hp <= 5 && p0.hp > 0 && wasAbove5 && !hasTriggeredP0LowHpRef.current) {
        hasTriggeredP0LowHpRef.current = true;
        setTimeout(() => {
          soundEffects.playLeaderLowHp(victimName);
          if (victimName) {
            const quote = getCharacterLowHpQuote(victimName);
            setIdleSpeech({ text: quote, visible: true });
          }
        }, 350);
      }

      return () => clearTimeout(timer);
    } else if (p0.hp > prevP0Hp.current) {
      const diff = p0.hp - prevP0Hp.current;
      prevP0Hp.current = p0.hp;
      setP0HealAlert({ prev: prevP0Hp.current - diff, curr: p0.hp, diff });
      const timer = setTimeout(() => setP0HealAlert(null), 2500);

      if (
        gameState.phase !== 'CLASH_REVEAL' &&
        !gameState.clashResult &&
        gameState.phase !== 'COMBO_STEP'
      ) {
        soundEffects.playHeal(diff);
      }
      return () => clearTimeout(timer);
    }
    prevP0Hp.current = p0.hp;
  }, [p0?.hp, p0?.slots.leader, p1?.slots.leader, gameState.phase, gameState.clashResult]);

  useEffect(() => {
    if (!p1) return;
    if (p1.hp < prevP1Hp.current) {
      const diff = prevP1Hp.current - p1.hp;
      const wasAbove5 = prevP1Hp.current > 5;
      prevP1Hp.current = p1.hp;
      setP1DamageAlert({ prev: prevP1Hp.current + diff, curr: p1.hp, diff });
      const timer = setTimeout(() => setP1DamageAlert(null), 2500);

      const victimLeader = p1.slots.leader;
      const victimName = victimLeader ? (victimLeader.characterName || victimLeader.nameKr) : undefined;

      if (
        gameState.phase !== 'CLASH_REVEAL' &&
        gameState.phase !== 'COMBO_STEP'
      ) {
        const attackerLeader = p0?.slots.leader;
        const weapon = attackerLeader ? getWeaponByCharacter(attackerLeader.characterName || attackerLeader.nameKr) : undefined;
        soundEffects.playDamage(diff, weapon, victimName);
      }

      if (p1.hp <= 5 && p1.hp > 0 && wasAbove5 && !hasTriggeredP1LowHpRef.current) {
        hasTriggeredP1LowHpRef.current = true;
        setTimeout(() => {
          soundEffects.playLeaderLowHp(victimName);
        }, 350);
      }

      return () => clearTimeout(timer);
    } else if (p1.hp > prevP1Hp.current) {
      const diff = p1.hp - prevP1Hp.current;
      prevP1Hp.current = p1.hp;
      setP1HealAlert({ prev: prevP1Hp.current - diff, curr: p1.hp, diff });
      const timer = setTimeout(() => setP1HealAlert(null), 2500);

      if (
        gameState.phase !== 'CLASH_REVEAL' &&
        !gameState.clashResult &&
        gameState.phase !== 'COMBO_STEP'
      ) {
        soundEffects.playHeal(diff);
      }
      return () => clearTimeout(timer);
    }
    prevP1Hp.current = p1.hp;
  }, [p1?.hp, p0?.slots.leader, p1?.slots.leader, gameState.phase, gameState.clashResult]);

  return {
    p0DamageAlert,
    p1DamageAlert,
    p0HealAlert,
    p1HealAlert,
    p0DeckDrawing,
    p1DeckDrawing,
    idleSpeech,
    setIdleSpeech,
    resetLowHpFlags,
  };
}
