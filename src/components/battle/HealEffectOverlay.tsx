// src/components/battle/HealEffectOverlay.tsx
// [WP8-5] HP 회복(HEAL) 연출 컴포넌트 (엔진 이벤트 1줄 + 등록표 1항목 동작 증명)
import React, { useEffect } from 'react';
import { Heart } from 'lucide-react';
import type { GameEvent } from '../../engine/events';

export interface HealEffectOverlayProps {
  event: GameEvent;
  onDone: () => void;
}

export const HealEffectOverlay: React.FC<HealEffectOverlayProps> = ({ event, onDone }) => {
  const amount = (event.payload?.amount as number) || 1;
  const pIdx = event.playerIndex ?? 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`fixed z-50 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-in fade-in slide-in-from-bottom-4 duration-300 ${
        pIdx === 0 ? 'bottom-28 left-1/2 -translate-x-1/2' : 'top-20 left-1/2 -translate-x-1/2'
      }`}
    >
      <Heart className="w-4 h-4 fill-emerald-400 text-emerald-400 animate-pulse" />
      <span>+{amount} HP</span>
    </div>
  );
};
