import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface CardDrawFlightOverlayProps {
  isDrawing: boolean;
  playerIndex: 0 | 1;
  drawCount: number;
}

export const CardDrawFlightOverlay: React.FC<CardDrawFlightOverlayProps> = ({
  isDrawing,
  playerIndex,
  drawCount = 2,
}) => {
  const [activeCards, setActiveCards] = useState<number[]>([]);

  useEffect(() => {
    if (!isDrawing) {
      setActiveCards([]);
      return;
    }

    const count = Math.max(1, Math.min(2, drawCount));
    setActiveCards(Array.from({ length: count }, (_, i) => i));

    // 드로우 사운드 재생
    soundEffects.playCardPlace();
    if (count > 1) {
      const sndTimer = setTimeout(() => {
        soundEffects.playCardPlace();
      }, 180);
      return () => clearTimeout(sndTimer);
    }
  }, [isDrawing, drawCount, playerIndex]);

  if (!isDrawing || activeCards.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {playerIndex === 0 ? (
        /* P0 플레이어: 우측 하단 액션 덱 영역에서 좌측 하단 손패 영역으로 비행 */
        <div className="absolute right-12 sm:right-20 md:right-28 bottom-36 sm:bottom-44">
          {activeCards.map((idx) => {
            const delay = `${idx * 160}ms`;
            return (
              <div
                key={idx}
                style={{ animationDelay: delay }}
                className="absolute w-24 sm:w-28 md:w-32 aspect-[588/1024] rounded-2xl overflow-hidden border-2 border-amber-400 bg-slate-900 shadow-2xl animate-deck-flight-p0"
              >
                <img
                  src="/cards/card_back_action.webp"
                  alt="드로우 카드"
                  className="w-full h-full object-cover rounded-2xl"
                />
                {/* 비행 중 황금빛 마력 광선 하이라이트 */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/30 via-transparent to-cyan-400/40 pointer-events-none" />
                <div className="absolute top-1 right-1 p-1">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* P1 상대/AI: 좌측 상단/중앙 덱 영역에서 상대 패 쪽으로 비행 */
        <div className="absolute left-12 sm:left-24 top-24 sm:top-28">
          {activeCards.map((idx) => {
            const delay = `${idx * 160}ms`;
            return (
              <div
                key={idx}
                style={{ animationDelay: delay }}
                className="absolute w-20 sm:w-24 aspect-[588/1024] rounded-2xl overflow-hidden border-2 border-rose-500 bg-slate-900 shadow-2xl animate-deck-flight-p1"
              >
                <img
                  src="/cards/card_back_action.webp"
                  alt="상대 드로우 카드"
                  className="w-full h-full object-cover rounded-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/30 via-transparent to-amber-400/30 pointer-events-none" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

