import React, { useState, useEffect, useRef } from 'react';
import { PlayerState } from '../types/tcg';
import { soundEffects } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Crown, FastForward, Sparkles, Swords, Zap } from 'lucide-react';

interface InitiativeDiceModalProps {
  isOpen: boolean;
  player0: PlayerState;
  player1: PlayerState;
  onComplete: (winnerIndex: 0 | 1, roll0: number, roll1: number) => void;
}

// 6면체 주사위 핍(도트) 렌더러
const DicePips: React.FC<{ value: number; colorClass: string }> = ({ value, colorClass }) => {
  // 3x3 격자 점 배치
  const pipsMap: Record<number, number[]> = {
    1: [4],
    2: [2, 6],
    3: [2, 4, 6],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 3, 6, 2, 5, 8],
  };

  const activeIndices = new Set(pipsMap[value] || [4]);

  return (
    <div className="grid grid-cols-3 grid-rows-3 w-16 h-16 sm:w-20 sm:h-20 p-2 gap-1.5 sm:gap-2">
      {Array.from({ length: 9 }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-center">
          {activeIndices.has(idx) && (
            <div
              className={`w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full shadow-md transition-all duration-150 ${colorClass} ${
                value === 1 && idx === 4 ? 'scale-125' : ''
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export const InitiativeDiceModal: React.FC<InitiativeDiceModalProps> = ({
  isOpen,
  player0,
  player1,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'READY' | 'ROLLING' | 'RESULT'>('READY');
  const [p0Value, setP0Value] = useState<number>(1);
  const [p1Value, setP1Value] = useState<number>(1);
  const [winnerIndex, setWinnerIndex] = useState<0 | 1 | null>(null);

  const rollIntervalRef = useRef<number | null>(null);
  const autoStartTimerRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);
  const isRollingRef = useRef<boolean>(false);
  const hasCompletedRef = useRef<boolean>(false);

  // 모든 타이머/인터벌 즉각 해제 유틸
  const clearAllTimers = () => {
    if (rollIntervalRef.current !== null) {
      clearInterval(rollIntervalRef.current);
      rollIntervalRef.current = null;
    }
    if (autoStartTimerRef.current !== null) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
    if (completeTimerRef.current !== null) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
  };

  // 완료 콜백 (단 1회만 안전하게 실행 보장)
  const finishAndComplete = (winIdx: 0 | 1, val0: number, val1: number) => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    isRollingRef.current = false;
    clearAllTimers();
    onComplete(winIdx, val0, val1);
  };

  // 주사위 굴리기 시작 함수
  const startRoll = () => {
    if (isRollingRef.current || hasCompletedRef.current) return;
    isRollingRef.current = true;

    // 자동 시작 타이머가 남아있다면 즉시 취소
    if (autoStartTimerRef.current !== null) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }

    setPhase('ROLLING');

    // 굴림 사운드 1차 재생
    soundEffects.playDiceRoll();

    // 50ms마다 눈금 갱신
    let ticks = 0;
    const interval = window.setInterval(() => {
      ticks++;
      setP0Value(Math.floor(Math.random() * 6) + 1);
      setP1Value(Math.floor(Math.random() * 6) + 1);

      if (ticks % 5 === 0) {
        soundEffects.playDiceRoll();
      }

      // 약 1.2초 후 (22틱) 확정 판정
      if (ticks >= 22) {
        clearInterval(interval);
        rollIntervalRef.current = null;

        // 최종 눈금 결정 (무승부 없이 확실하게 결판나도록 보장)
        const finalP0 = Math.floor(Math.random() * 6) + 1;
        let finalP1 = Math.floor(Math.random() * 6) + 1;
        while (finalP1 === finalP0) {
          finalP1 = Math.floor(Math.random() * 6) + 1;
        }

        const winIdx: 0 | 1 = finalP0 > finalP1 ? 0 : 1;
        const isP0Win = winIdx === 0;

        setP0Value(finalP0);
        setP1Value(finalP1);
        setWinnerIndex(winIdx);
        setPhase('RESULT');

        soundEffects.playDiceLand(isP0Win);

        if (isP0Win) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.65 },
            colors: ['#38bdf8', '#fbbf24', '#34d399', '#ffffff'],
          });
        }

        // 1.5초 후 배틀/멀리건으로 진입
        completeTimerRef.current = window.setTimeout(() => {
          finishAndComplete(winIdx, finalP0, finalP1);
        }, 1500);
      }
    }, 55);

    rollIntervalRef.current = interval;
  };

  // 스킵 (즉시 결정 후 완료)
  const handleSkip = () => {
    if (hasCompletedRef.current) return;
    clearAllTimers();

    const finalP0 = Math.floor(Math.random() * 6) + 1;
    let finalP1 = Math.floor(Math.random() * 6) + 1;
    while (finalP1 === finalP0) {
      finalP1 = Math.floor(Math.random() * 6) + 1;
    }
    const winIdx: 0 | 1 = finalP0 > finalP1 ? 0 : 1;
    finishAndComplete(winIdx, finalP0, finalP1);
  };

  useEffect(() => {
    if (isOpen) {
      isRollingRef.current = false;
      hasCompletedRef.current = false;
      setPhase('READY');
      setWinnerIndex(null);
      setP0Value(1);
      setP1Value(1);

      // 1.4초 동안 조작 없으면 자동 굴림
      autoStartTimerRef.current = window.setTimeout(() => {
        startRoll();
      }, 1400);

      // 스페이스바 / 엔터 키 입력 시 즉시 굴림
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          startRoll();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearAllTimers();
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      clearAllTimers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isP0Win = winnerIndex === 0;
  const isP1Win = winnerIndex === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center overflow-hidden">
        {/* 상단 스킵 버튼 */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer border border-slate-700"
          title="주사위 연출을 건너뛰고 즉시 게임을 시작합니다"
        >
          <span>스킵</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>

        {/* 상단 타이틀 */}
        <div className="text-center space-y-1.5 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black tracking-wider shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>선공 결정전 (INITIATIVE ROLL)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide flex items-center justify-center gap-2">
            <span>🎲 운명의 주사위 대결</span>
          </h2>
          <p className="text-xs text-slate-400">
            더 높은 눈금이 나온 플레이어가 1턴 선공(First Turn)을 가져갑니다.
          </p>
        </div>

        {/* 메인 주사위 대치 아레나 */}
        <div className="w-full flex items-center justify-around gap-4 sm:gap-8 my-2">
          {/* 1P (플레이어) */}
          <div className="flex flex-col items-center space-y-3">
            {/* 플레이어 아바타 & 명칭 */}
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-400 shadow-md">
                <img
                  src={player0.slots.leader.artUrl}
                  alt={player0.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-cyan-300">{player0.name}</div>
                <div className="text-[10px] text-slate-400 font-bold">1P (나)</div>
              </div>
            </div>

            {/* 1P 3D 주사위 큐브 */}
            <div
              className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center transition-all duration-300 ${
                phase === 'ROLLING'
                  ? 'animate-dice-roll shadow-[0_0_40px_rgba(34,211,238,0.5)] border-cyan-400/80 bg-slate-900'
                  : isP0Win
                  ? 'animate-dice-land shadow-[0_0_50px_rgba(52,211,153,0.7)] border-emerald-400 bg-slate-900 ring-4 ring-emerald-400/30'
                  : 'shadow-[0_15px_30px_rgba(0,0,0,0.8),inset_0_4px_12px_rgba(255,255,255,0.15),inset_0_-8px_16px_rgba(0,0,0,0.7)] border border-cyan-500/40 bg-gradient-to-br from-slate-900 via-cyan-950/40 to-slate-950'
              }`}
            >
              {/* 주사위 점 핍 표시 */}
              <DicePips
                value={p0Value}
                colorClass={
                  isP0Win
                    ? 'bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.9)]'
                    : 'bg-gradient-to-br from-cyan-300 to-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.7)]'
                }
              />

              {/* 승리 크라운 뱃지 */}
              {isP0Win && (
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg animate-bounce">
                  <Crown className="w-5 h-5 fill-slate-950" />
                </div>
              )}
            </div>

            {/* 눈금 숫자 표시 */}
            <div className="text-center">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono transition-all ${
                  isP0Win ? 'text-emerald-400 scale-110 drop-shadow' : 'text-cyan-300'
                }`}
              >
                {phase === 'READY' ? '-' : p0Value}
              </span>
            </div>
          </div>

          {/* 중앙 VS 배지 */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg text-white font-black text-sm">
              <Swords className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-black tracking-widest text-slate-500 uppercase">VS</span>
          </div>

          {/* 2P (상대방 / AI) */}
          <div className="flex flex-col items-center space-y-3">
            {/* 상대방 아바타 & 명칭 */}
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-purple-400 shadow-md">
                <img
                  src={player1.slots.leader.artUrl}
                  alt={player1.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-purple-300">{player1.name}</div>
                <div className="text-[10px] text-slate-400 font-bold">2P (상대)</div>
              </div>
            </div>

            {/* 2P 3D 주사위 큐브 */}
            <div
              className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center transition-all duration-300 ${
                phase === 'ROLLING'
                  ? 'animate-dice-roll shadow-[0_0_40px_rgba(168,85,247,0.5)] border-purple-400/80 bg-slate-900'
                  : isP1Win
                  ? 'animate-dice-land shadow-[0_0_50px_rgba(168,85,247,0.7)] border-purple-400 bg-slate-900 ring-4 ring-purple-400/30'
                  : 'shadow-[0_15px_30px_rgba(0,0,0,0.8),inset_0_4px_12px_rgba(255,255,255,0.15),inset_0_-8px_16px_rgba(0,0,0,0.7)] border border-purple-500/40 bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-950'
              }`}
            >
              {/* 주사위 점 핍 표시 */}
              <DicePips
                value={p1Value}
                colorClass={
                  isP1Win
                    ? 'bg-gradient-to-br from-purple-300 to-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.9)]'
                    : 'bg-gradient-to-br from-fuchsia-300 to-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.7)]'
                }
              />

              {/* 승리 크라운 뱃지 */}
              {isP1Win && (
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-purple-400 text-slate-950 flex items-center justify-center shadow-lg animate-bounce">
                  <Crown className="w-5 h-5 fill-slate-950" />
                </div>
              )}
            </div>

            {/* 눈금 숫자 표시 */}
            <div className="text-center">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono transition-all ${
                  isP1Win ? 'text-purple-400 scale-110 drop-shadow' : 'text-purple-300'
                }`}
              >
                {phase === 'READY' ? '-' : p1Value}
              </span>
            </div>
          </div>
        </div>

        {/* 하단 상태 피드백 및 액션 버튼 */}
        <div className="mt-8 w-full max-w-md flex flex-col items-center space-y-4">
          {/* 승자 결정 완료 배너 */}
          {phase === 'RESULT' && winnerIndex !== null && (
            <div
              className={`w-full py-3 px-5 rounded-2xl text-center font-black animate-in zoom-in-95 duration-200 border shadow-xl flex items-center justify-center gap-2 ${
                isP0Win
                  ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 shadow-emerald-500/20'
                  : 'bg-purple-950/80 border-purple-500/80 text-purple-300 shadow-purple-500/20'
              }`}
            >
              <Zap className="w-5 h-5 animate-pulse" />
              <span className="text-sm sm:text-base">
                {isP0Win
                  ? `🎉 [${player0.name}] 선공(First Turn) 확정!`
                  : `⚔️ [${player1.name}] 선공(First Turn) 확정!`}
              </span>
            </div>
          )}

          {/* 굴리기 시작 버튼 (READY 단계) */}
          {phase === 'READY' && (
            <button
              onClick={startRoll}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm sm:text-base tracking-wide shadow-xl shadow-amber-500/25 transition cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🎲 주사위 굴리기 (스페이스바)</span>
            </button>
          )}

          {phase === 'ROLLING' && (
            <div className="text-xs text-slate-400 font-bold animate-pulse flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>주사위가 굴러가는 중입니다...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
