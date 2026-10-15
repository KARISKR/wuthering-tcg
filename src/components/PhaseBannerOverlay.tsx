import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { GamePhase } from '../types/tcg';
import { soundEffects } from '../utils/soundEffects';
import { Sparkles, Swords, Flame, RotateCcw, Zap, X } from 'lucide-react';

interface PhaseBannerOverlayProps {
  phase: GamePhase;
  turn: number;
  activePlayerIndex: 0 | 1;
  isAiTurn: boolean;
  disabled?: boolean;
}

interface BannerData {
  title: string;
  sub: string;
  badge: string;
  color: string;
  gradient: string;
  icon: React.ReactNode;
}

export const PhaseBannerOverlay: React.FC<PhaseBannerOverlayProps> = React.memo(({
  phase,
  turn,
  activePlayerIndex,
  isAiTurn,
  disabled = false,
}) => {
  const [currentBanner, setCurrentBanner] = useState<BannerData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // 현재 페이즈/턴 상태에 따른 고유 이벤트 키 계산 (불필요한 중복 팝업 및 깜빡임 방지)
  const eventKey = useMemo(() => {
    if (disabled) return '';
    if (
      phase === 'LEADER_SELECT' ||
      phase === 'MULLIGAN' ||
      phase === 'GAME_OVER' ||
      phase === 'CLASH_REVEAL' ||
      phase === 'DISCARD_OVERFLOW'
    ) {
      return '';
    }
    if (phase === 'START_PHASE' || phase === 'DRAW_PHASE') {
      return `draw-${turn}-p${activePlayerIndex}`;
    }
    if (phase === 'ACTION_PHASE') {
      return `action-${turn}-p${activePlayerIndex}`;
    }
    if (phase === 'CLASH_SELECT' || phase === 'CLASH_SET') {
      return `battle-${turn}-p${activePlayerIndex}`;
    }
    if (phase === 'COMBO_STEP') {
      return `combo-${turn}-p${activePlayerIndex}`;
    }
    if (phase === 'END_PHASE') {
      return `end-${turn}-p${activePlayerIndex}`;
    }
    return '';
  }, [phase, turn, activePlayerIndex, disabled]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setIsFadingOut(false);
    setCurrentBanner(null);
  }, []);

  // 안전 와치독: 어떤 상황(탭 비활성화, 브라우저 랙 등)에서도 배너가 2.2초 이상 화면에 남아있지 않도록 강제 회수
  useEffect(() => {
    if (!isVisible) return;
    const watchdogTimer = setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      setCurrentBanner(null);
    }, 2200);
    return () => clearTimeout(watchdogTimer);
  }, [isVisible]);

  // 페이즈 전환 이벤트 감지 및 타이머 관리 (각 이벤트별 타이머 자동 클린업 보장)
  useEffect(() => {
    if (!eventKey) {
      setIsVisible(false);
      setIsFadingOut(false);
      setCurrentBanner(null);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // 1. 드로우 페이즈 (플레이어가 덱을 클릭하여 뽑을 때까지 대기)
    if (eventKey.startsWith('draw-')) {
      const drawCount = turn === 1 && activePlayerIndex === 0 ? 1 : 2;
      const drawData: BannerData = isAiTurn
        ? {
            title: "OPPONENT'S TURN",
            sub: `TURN ${turn} · 상대(AI) 드로우 단계 (${drawCount}장 드로우)`,
            badge: 'ENEMY TURN · DRAW',
            color: 'border-rose-500/90 text-rose-300',
            gradient: 'from-rose-950/95 via-slate-900/95 to-rose-950/95',
            icon: <Swords className="w-6 h-6 text-rose-400" />,
          }
        : {
            title: 'DRAW PHASE',
            sub: `TURN ${turn} · 덱을 클릭하여 카드를 드로우하세요 (${drawCount}장)`,
            badge: 'YOUR TURN · DRAW PHASE',
            color: 'border-cyan-400/90 text-cyan-300',
            gradient: 'from-cyan-950/95 via-slate-900/95 to-cyan-950/95',
            icon: <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />,
          };

      setCurrentBanner(drawData);
      setIsVisible(true);
      setIsFadingOut(false);
      soundEffects.playPhaseDraw();

      // 1200ms 후 페이드아웃 시작 (메인 페이즈로 자동 전환하지 않고 종료)
      timers.push(
        setTimeout(() => {
          setIsFadingOut(true);
        }, 1200)
      );

      // 1500ms 완전히 닫기
      timers.push(
        setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
          setCurrentBanner(null);
        }, 1500)
      );
    }
    // 1-2. 메인 액션 페이즈 (실제 드로우 완료 후 ACTION_PHASE 진입 시 별도 표출)
    else if (eventKey.startsWith('action-')) {
      const mainData: BannerData = isAiTurn
        ? {
            title: 'MAIN PHASE (AI)',
            sub: `TURN ${turn} · 상대(AI) 메인 페이즈 (행동 연산 개시)`,
            badge: 'ENEMY TURN · MAIN',
            color: 'border-rose-500/90 text-rose-300',
            gradient: 'from-rose-950/95 via-slate-900/95 to-rose-950/95',
            icon: <Swords className="w-6 h-6 text-rose-400" />,
          }
        : {
            title: 'MAIN PHASE',
            sub: `TURN ${turn} · 메인 페이즈 (캐릭터 진화 · 협주 충전 · 대결 선언)`,
            badge: 'YOUR TURN · MAIN PHASE',
            color: 'border-amber-400/90 text-amber-300',
            gradient: 'from-amber-950/95 via-slate-900/95 to-amber-950/95',
            icon: <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />,
          };

      setCurrentBanner(mainData);
      setIsVisible(true);
      setIsFadingOut(false);
      soundEffects.playPhaseAction();

      timers.push(
        setTimeout(() => {
          setIsFadingOut(true);
        }, 1200)
      );

      timers.push(
        setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
          setCurrentBanner(null);
        }, 1500)
      );
    }
    // 2. 배틀 페이즈 (대결 세트 돌입)
    else if (eventKey.startsWith('battle-')) {
      const battleData: BannerData = {
        title: 'BATTLE PHASE!',
        sub: '삼각 상성(적 > 녹 > 청 > 적) 액션 카드 대결 돌입!',
        badge: 'CLASH TIME',
        color: 'border-amber-400/90 text-amber-300',
        gradient: 'from-amber-950/95 via-slate-900/95 to-amber-950/95',
        icon: <Swords className="w-7 h-7 text-amber-400 animate-bounce" />,
      };

      setCurrentBanner(battleData);
      setIsVisible(true);
      setIsFadingOut(false);
      soundEffects.playPhaseBattle();

      timers.push(
        setTimeout(() => {
          setIsFadingOut(true);
        }, 950)
      );

      timers.push(
        setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
          setCurrentBanner(null);
        }, 1250)
      );
    }
    // 3. 연격 단계 (콤보 스트라이크)
    else if (eventKey.startsWith('combo-')) {
      const comboData: BannerData = {
        title: 'COMBO STRIKE!',
        sub: '연격 콤보 기회 획득! 적색(RED) 카드로 연속 추가 공격!',
        badge: 'COMBO ATTACK',
        color: 'border-red-500 text-red-300',
        gradient: 'from-red-950/95 via-slate-900/95 to-red-950/95',
        icon: <Flame className="w-7 h-7 text-red-400 animate-pulse" />,
      };

      setCurrentBanner(comboData);
      setIsVisible(true);
      setIsFadingOut(false);
      soundEffects.playPhaseCombo();

      timers.push(
        setTimeout(() => {
          setIsFadingOut(true);
        }, 850)
      );

      timers.push(
        setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
          setCurrentBanner(null);
        }, 1150)
      );
    }
    // 4. 엔드 페이즈 (턴 종료)
    else if (eventKey.startsWith('end-')) {
      const endData: BannerData = {
        title: 'END PHASE',
        sub: '턴을 종료하고 다음 플레이어로 공수를 교대합니다',
        badge: 'TURN END',
        color: 'border-slate-500 text-slate-300',
        gradient: 'from-slate-950/95 via-slate-900/95 to-slate-950/95',
        icon: <RotateCcw className="w-6 h-6 text-slate-400" />,
      };

      setCurrentBanner(endData);
      setIsVisible(true);
      setIsFadingOut(false);
      soundEffects.playPhaseEnd();

      timers.push(
        setTimeout(() => {
          setIsFadingOut(true);
        }, 700)
      );

      timers.push(
        setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
          setCurrentBanner(null);
        }, 950)
      );
    }

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [eventKey, isAiTurn, turn]);

  if (!isVisible || !currentBanner) return null;

  return (
    <div
      className={`fixed inset-x-0 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col items-center justify-center transition-all duration-300 ${
        isFadingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-in zoom-in-95 fade-in duration-300'
      }`}
    >
      {/* 배너 중앙 띠 - 배너 클릭 시 즉시 닫기 지원 (pointer-events-auto는 배너 본체에만 부여하여 하단 카드 조작 차단 방지) */}
      <div
        onClick={handleDismiss}
        className="w-full relative py-6 sm:py-8 flex flex-col items-center justify-center overflow-hidden shadow-2xl pointer-events-auto cursor-pointer group"
        title="클릭 시 배너를 즉시 닫습니다"
      >
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

          <div className="text-[10px] text-slate-400/80 font-mono flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
            <X className="w-3 h-3" />
            <span>클릭하여 닫기</span>
          </div>
        </div>
      </div>
    </div>
  );
});
