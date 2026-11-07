// src/battle/fxRegistry.tsx
// [WP8] 연출 등록표 (FX Registry) - 이벤트별 연출 컴포넌트, 블로킹 여부, 타임아웃, 대기 조건 정의
import React from 'react';
import type { GameEvent, GameEventType, GameAction } from '../engine/events';
import type { GameState, ComboStrikeEffect, UpgradeEffect, EffectDrawAnimation, TriggeredEffectEvent } from '../types/tcg';
import { ComboStrikeOverlay } from '../components/ComboStrikeOverlay';
import { UpgradeEffectOverlay } from '../components/UpgradeEffectOverlay';
import { EffectDrawOverlay } from '../components/EffectDrawOverlay';
import { EffectNotificationToast } from '../components/EffectNotificationToast';
import { HealEffectOverlay } from '../components/battle/HealEffectOverlay';

export type FxEntry = {
  component: React.ComponentType<{ event: GameEvent; onDone: () => void }>;
  blocking: boolean;          // 끝날 때까지 다음 입력·연출을 막음
  durationMs?: number;        // onDone을 안 부르면 이 시간 뒤 자동 종료 (안전장치)
  waitFor?: (s: GameState) => boolean; // 시작 조건 (예: 격돌 결과창이 닫힌 뒤)
  onDoneAction?: (e: GameEvent) => GameAction | null; // 끝나면 엔진에 보낼 완료 신호 (관문 필드용)
  /**
   * [WP8 버그 수정] 'ambient' = 순서 큐와 별개로 바로 표시하는 알림(토스트·회복 숫자).
   * 블로킹 연출(효과 드로우 등)이 알림 뒤에 줄 서서 게임 진행이 멈추지 않게 한다.
   * 같은 레인에서는 새 알림이 이전 알림을 바로 대체한다(예전 lastEffectEvent 화면 동작과 같음).
   */
  lane?: 'queue' | 'ambient';
};

/** 효과 알림 토스트: 표시 시간은 fxQueue의 durationMs 타이머가 관리 (렌더 중 setTimeout 금지) */
const EffectToastFx: React.FC<{ event: GameEvent; onDone: () => void }> = ({ event }) => {
  const p = (event.payload || {}) as Partial<TriggeredEffectEvent>;
  const triggeredEvent: TriggeredEffectEvent = {
    id: (p.id as string) || event.id,
    playerIndex: (event.playerIndex ?? p.playerIndex ?? 0) as 0 | 1,
    sourceCardName: p.sourceCardName || '',
    title: p.title || '효과 발동',
    description: p.description || '',
    sourceCardArt: p.sourceCardArt,
    timestamp: typeof p.timestamp === 'number' ? p.timestamp : 0,
    effectType: p.effectType || 'BUFF',
  };
  return <EffectNotificationToast event={triggeredEvent} />;
};

export const fxRegistry: Partial<Record<GameEventType, FxEntry>> = {
  COMBO_STRIKE: {
    component: ({ event, onDone }) => {
      const strike = (event.payload?.strike || event.payload) as ComboStrikeEffect;
      if (!strike) {
        onDone();
        return null;
      }
      return <ComboStrikeOverlay strike={strike} onDismiss={onDone} />;
    },
    blocking: true,
    durationMs: 4000,
    onDoneAction: () => ({ type: 'CLEAR_LAST_COMBO_STRIKE' }),
  },

  UPGRADE: {
    component: ({ event, onDone }) => {
      const effect = event.payload?.upgradeEffect as UpgradeEffect;
      if (!effect) {
        onDone();
        return null;
      }
      return <UpgradeEffectOverlay effect={effect} onDismiss={onDone} />;
    },
    blocking: true,
    durationMs: 3000,
    waitFor: (state) => !state.clashResult,
  },

  EFFECT_DRAW: {
    component: ({ event, onDone }) => {
      const effectDraw = (event.payload?.effectDraw || {
        id: (event.payload?.drawId as string) || event.id,
        playerIndex: (event.playerIndex ?? event.payload?.playerIndex ?? 0) as 0 | 1,
        cards: event.payload?.cards,
        sourceCardName: event.payload?.sourceCardName as string | undefined,
      }) as EffectDrawAnimation;
      if (!effectDraw) {
        onDone();
        return null;
      }
      return <EffectDrawOverlay effectDraw={effectDraw} onComplete={onDone} />;
    },
    blocking: true,
    durationMs: 3500,
    waitFor: (state) => !state.clashResult,
    onDoneAction: (e) => ({
      type: 'FINISH_EFFECT_DRAW',
      completedDrawId: (e.payload?.drawId as string) || undefined,
    }),
  },

  EFFECT_TRIGGERED: {
    component: EffectToastFx,
    blocking: false,
    lane: 'ambient',
    durationMs: 4000,
    // 예전 deferredEffectEvent처럼 대결 결과창이 열려 있는 동안은 기다렸다가 닫힌 뒤 표시
    waitFor: (state) => !state.clashResult,
  },

  HEAL: {
    component: ({ event, onDone }) => {
      return <HealEffectOverlay event={event} onDone={onDone} />;
    },
    blocking: false,
    lane: 'ambient',
    durationMs: 1500,
  },
};
