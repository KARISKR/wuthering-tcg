import React, { useEffect, useState, useRef } from 'react';
import { GamePhase } from '../types/tcg';
import { soundEffects } from '../utils/soundEffects';
import { Sparkles, Swords, Flame, RotateCcw, Zap, Shield } from 'lucide-react';

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
  const [isFadingOut, setIsFadingOut] = useState(false);

  // 직전 이벤트 키를 기억하여 불필요한 반복 팝업 방지 (레벨업/협주 충전 시 재발동 방지)
  const lastEventKeyRef = useRef<string>('');

  useEffect(() => {
    // 게임 시작 전 멀리건 또는 게임 오버일 땐 배너 생략
    if (phase === 'MULLIGAN' || phase === 'GAME_OVER') {
      setIsVisible(false);
      return;
    }

    let eventKey = '';
    let data: BannerData | null = null;

    if (phase === 'START_PHASE' || phase === 'DRAW_PHASE' || phase === 'ACTION_PHASE') {
      eventKey = `turn-start-${turn}-p${activePlayerIndex}`;
      if (lastEventKeyRef.current !== eventKey) {
        if (isAiTurn) {
          data = {
            title: "OPPONENT'S TURN",
            sub: `TURN ${turn} · 상대(AI)의 턴 시작 (카드 드로우 완료 & 액션 준비)`,
            badge: 'ENEMY TURN',
            color: 'border-rose-500/90 text-rose-300',
            gradient: 'from-rose-950/95 via-slate-900/95 to-rose-950/95',
            icon: <Swords className="w-6 h-6 text-rose-400" />,
          };
        } else {
          data = {
            title: 'YOUR TURN - DRAW PHASE',
            sub: `TURN ${turn} · 플레이어 턴 (카드 2장 드로우 완료 & 메인 액션 개시)`,
            badge: 'YOUR TURN',
            color: 'border-cyan-400/90 text-cyan-300',
            gradient: 'from-cyan-950/95 via-slate-900/95 to-cyan-950/95',
            icon: <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />,
          };
        }
      }
    } else if (phase === 'CLASH_SELECT' || phase === 'CLASH_SET') {
      eventKey = `battle-${turn}-p${activePlayerIndex}`;
      if (lastEventKeyRef.current !== eventKey) {
        data = {
          title: 'BATTLE PHASE!',
          sub: '삼각 상성(적 > 녹 > 청 > 적) 액션 카드 대결 돌입!',
          badge: 'CLASH TIME',
          color: 'border-amber-400/90 text-amber-300',
          gradient: 'from-amber-950/95 via-slate-900/95 to-amber-950/95',
          icon: <Swords className="w-7 h-7 text-amber-400 animate-bounce" />,
        };
      }
    } else if (phase === 'COMBO_STEP') {
      eventKey = `combo-${turn}-p${activePlayerIndex}`;
      if (lastEventKeyRef.current !== eventKey) {
        data = {
          title: 'COMBO STRIKE!',
          sub: '연격 콤보 기회 획득! 적색(RED) 카드로 연속 추가 공격!',
          badge: 'COMBO ATTACK',
          color: 'border-red-500 text-red-300',
          gradient: 'from-red-950/95 via-slate-900/95 to-red-950/95',
          icon: <Flame className="w-7 h-7 text-red-400 animate-pulse" />,
        };
      }
    } else if (phase === 'END_PHASE') {
      eventKey = `end-${turn}-p${activePlayerIndex}`;
      if (lastEventKeyRef.current !== eventKey) {
        data = {
          title: 'END PHASE',
          sub: '턴을 종료하고 다음 플레이어로 공수를 교대합니다',
          badge: 'TURN END',
          color: 'border-slate-500 text-slate-300',
          gradient: 'from-slate-950/95 via-slate-900/95 to-slate-950/95',
          icon: <RotateCcw className="w-6 h-6 text-slate-400" />,
        };
      }
    }

    if (data && eventKey) {
      lastEventKeyRef.current = eventKey;
      setCurrentBanner(data);
      setIsVisible(true);
      setIsFadingOut(false);

      // 둔탁하고 묵직한 시네마틱 트랜지션 사운드 재생
      soundEffects.playPhaseChange();

      // 유저가 충분히 인지할 수 있도록 1750ms 동안 안정적으로 노출 (1450ms 시점에 페이드아웃 시작)
      const tFade = setTimeout(() => {
        setIsFadingOut(true);
      }, 1450);

      const tDismiss = setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
      }, 1750);

      return () => {
        clearTimeout(tFade);
        clearTimeout(tDismiss);
      };
    }
  }, [phase, turn, activePlayerIndex, isAiTurn]);

  if (!isVisible || !currentBanner) return null;

  return (
    <div
      className={`fixed inset-x-0 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col items-center justify-center transition-all duration-300 ${
        isFadingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-in zoom-in-95 fade-in duration-300'
      }`}
    >
      {/* 백그라운드 스피드라인 스트립 */}
      <div className="w-full relative py-6 sm:py-8 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
        {/* 그라데이션 베이스 바 */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${currentBanner.gradient} backdrop-blur-md border-y-2 ${currentBanner.color} shadow-[0_0_60px_rgba(0,0,0,0.95)]`}
        />

        {/* 상단/하단 메탈릭 라이트 라인 */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-90" />
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-90" />

        {/* 텍스트 콘텐츠 */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 space-y-1.5 select-none">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/70 border border-white/20 text-[11px] font-mono font-black tracking-widest uppercase mb-0.5 shadow-lg">
            {currentBanner.icon}
            <span className="text-white tracking-widest">{currentBanner.badge}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-wider drop-shadow-[0_4px_20px_rgba(0,0,0,1)] uppercase">
            {currentBanner.title}
          </h2>

          <p className="text-xs sm:text-sm font-bold text-slate-200 drop-shadow max-w-xl tracking-wide">
            {currentBanner.sub}
          </p>
        </div>
      </div>
    </div>
  );
};
