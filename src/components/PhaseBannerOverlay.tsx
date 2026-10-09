import React, { useEffect, useState } from 'react';
import { GamePhase } from '../types/tcg';
import { soundEffects } from '../utils/soundEffects';
import { Sparkles, Swords, Play, Shield, Flame, RotateCcw, Zap } from 'lucide-react';

interface PhaseBannerOverlayProps {
  phase: GamePhase;
  turn: number;
  activePlayerIndex: 0 | 1;
  isAiTurn: boolean;
}

interface BannerData {
  title: string;
  sub: string;
  badge: string;
  color: string;
  gradient: string;
  icon: React.ReactNode;
}

export const PhaseBannerOverlay: React.FC<PhaseBannerOverlayProps> = ({
  phase,
  turn,
  activePlayerIndex,
  isAiTurn,
}) => {
  const [currentBanner, setCurrentBanner] = useState<BannerData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let data: BannerData | null = null;

    if (phase === 'START_PHASE' || phase === 'DRAW_PHASE') {
      data = {
        title: isAiTurn ? 'OPPONENT TURN' : 'YOUR TURN',
        sub: `TURN ${turn} · 드로우 페이즈 (카드 보충)`,
        badge: 'DRAW PHASE',
        color: isAiTurn ? 'border-red-500/80 text-red-300' : 'border-cyan-400/80 text-cyan-300',
        gradient: isAiTurn
          ? 'from-red-950/90 via-slate-900/95 to-red-950/90'
          : 'from-cyan-950/90 via-slate-900/95 to-cyan-950/90',
        icon: <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />,
      };
    } else if (phase === 'ACTION_PHASE') {
      data = {
        title: 'ACTION PHASE',
        sub: '레벨업(진화) · 체인지(리더 교대) · 협주 충전',
        badge: 'ACTION TIME',
        color: 'border-indigo-400/80 text-indigo-300',
        gradient: 'from-indigo-950/90 via-slate-900/95 to-indigo-950/90',
        icon: <Sparkles className="w-6 h-6 text-indigo-400" />,
      };
    } else if (phase === 'CLASH_SELECT' || phase === 'CLASH_SET') {
      data = {
        title: 'BATTLE PHASE!',
        sub: '삼각 상성(적>녹>청>적) 액션 카드 대결 돌입!',
        badge: 'CLASH READY',
        color: 'border-amber-400/90 text-amber-300',
        gradient: 'from-amber-950/95 via-slate-900/95 to-amber-950/95',
        icon: <Swords className="w-7 h-7 text-amber-400 animate-bounce" />,
      };
    } else if (phase === 'COMBO_STEP') {
      data = {
        title: 'COMBO STRIKE!',
        sub: '연격 콤보 기회 획득! 패의 적색(RED) 카드로 연속 폭딜!',
        badge: 'COMBO ATTACK',
        color: 'border-red-500 text-red-300',
        gradient: 'from-red-950/95 via-slate-900/95 to-red-950/95',
        icon: <Flame className="w-7 h-7 text-red-400 animate-pulse" />,
      };
    } else if (phase === 'END_PHASE') {
      data = {
        title: 'END PHASE',
        sub: '턴을 종료하고 다음 플레이어로 공수를 교대합니다',
        badge: 'TURN END',
        color: 'border-slate-500 text-slate-300',
        gradient: 'from-slate-950/95 via-slate-900/95 to-slate-950/95',
        icon: <RotateCcw className="w-6 h-6 text-slate-400" />,
      };
    }

    if (data) {
      setCurrentBanner(data);
      setIsVisible(true);
      soundEffects.playPhaseChange();

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 950);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [phase, turn, activePlayerIndex]);

  if (!isVisible || !currentBanner) return null;

  return (
    <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col items-center justify-center animate-in zoom-in-95 fade-in duration-200">
      {/* 백그라운드 스피드라인 스트립 */}
      <div className="w-full relative py-6 sm:py-8 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
        {/* 그라데이션 베이스 바 */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${currentBanner.gradient} backdrop-blur-md border-y-2 ${currentBanner.color} shadow-[0_0_50px_rgba(0,0,0,0.9)]`}
        />

        {/* 상단/하단 사이버네틱 펄스 라인 */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

        {/* 텍스트 콘텐츠 */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 space-y-1 select-none">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-black/60 border border-white/20 text-[11px] font-mono font-black tracking-widest uppercase mb-0.5 shadow">
            {currentBanner.icon}
            <span className="text-white">{currentBanner.badge}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-widest drop-shadow-[0_4px_15px_rgba(0,0,0,1)] uppercase scale-105 transition-transform">
            {currentBanner.title}
          </h2>

          <p className="text-xs sm:text-sm font-bold text-slate-200 drop-shadow max-w-lg tracking-wide">
            {currentBanner.sub}
          </p>
        </div>
      </div>
    </div>
  );
};
