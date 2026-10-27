import React, { useState, useEffect, useRef } from 'react';
import { PlayerState } from '../types/tcg';
import { soundEffects } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Crown, FastForward, Shield, Sparkles, Swords, Zap } from 'lucide-react';

export interface InitiativeChoiceDetail {
  winnerIndex: 0 | 1;
  chosenOrder: 'FIRST' | 'SECOND';
}

interface InitiativeDiceModalProps {
  isOpen: boolean;
  player0: PlayerState;
  player1: PlayerState;
  myPlayerIndex?: 0 | 1;
  isMultiplayer?: boolean;
  onComplete: (
    firstPlayerIndex: 0 | 1,
    roll0: number,
    roll1: number,
    choiceDetail?: InitiativeChoiceDetail
  ) => void;
  onSendDiceRoll?: (val0: number, val1: number, winIdx: 0 | 1) => void;
  onSendOrderChoice?: (order: 'FIRST' | 'SECOND') => void;
  externalDiceResult?: { val0: number; val1: number; winIdx: 0 | 1 } | null;
  externalOrderChoice?: 'FIRST' | 'SECOND' | null;
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
  myPlayerIndex = 0,
  isMultiplayer = false,
  onComplete,
  onSendDiceRoll,
  onSendOrderChoice,
  externalDiceResult,
  externalOrderChoice,
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
  const finishAndComplete = (
    firstPlayerIdx: 0 | 1,
    val0: number,
    val1: number,
    choiceDetail?: InitiativeChoiceDetail
  ) => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    isRollingRef.current = false;
    clearAllTimers();
    onComplete(firstPlayerIdx, val0, val1, choiceDetail);
  };

  // 선공/후공 선택 핸들러
  const handleChooseOrder = (order: 'FIRST' | 'SECOND') => {
    if (hasCompletedRef.current || winnerIndex === null) return;
    soundEffects.playCardPlace();

    if (onSendOrderChoice) {
      onSendOrderChoice(order);
    }

    let firstPlayerIdx: 0 | 1;
    if (winnerIndex === 0) {
      firstPlayerIdx = order === 'FIRST' ? 0 : 1;
    } else {
      firstPlayerIdx = order === 'FIRST' ? 1 : 0;
    }

    finishAndComplete(firstPlayerIdx, p0Value, p1Value, {
      winnerIndex,
      chosenOrder: order,
    });
  };

  // 외부(네트워크)에서 주사위 결과 수신 시 동기화
  useEffect(() => {
    if (externalDiceResult && phase !== 'RESULT') {
      setP0Value(externalDiceResult.val0);
      setP1Value(externalDiceResult.val1);
      setWinnerIndex(externalDiceResult.winIdx);
      setPhase('RESULT');
      const isMyWin = externalDiceResult.winIdx === myPlayerIndex;
      soundEffects.playDiceLand(isMyWin);
      if (isMyWin) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.65 },
            colors: ['#38bdf8', '#fbbf24', '#34d399', '#ffffff'],
          });
        } catch {}
      }
    }
  }, [externalDiceResult, phase, myPlayerIndex]);

  // 외부(네트워크)에서 선/후공 선택 수신 시 완료 처리
  useEffect(() => {
    if (externalOrderChoice && winnerIndex !== null && !hasCompletedRef.current) {
      let firstPlayerIdx: 0 | 1;
      if (winnerIndex === 0) {
        firstPlayerIdx = externalOrderChoice === 'FIRST' ? 0 : 1;
      } else {
        firstPlayerIdx = externalOrderChoice === 'FIRST' ? 1 : 0;
      }
      finishAndComplete(firstPlayerIdx, p0Value, p1Value, {
        winnerIndex,
        chosenOrder: externalOrderChoice,
      });
    }
  }, [externalOrderChoice, winnerIndex, p0Value, p1Value]);

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
        const isMyWin = isMultiplayer ? winIdx === myPlayerIndex : winIdx === 0;

        setP0Value(finalP0);
        setP1Value(finalP1);
        setWinnerIndex(winIdx);
        setPhase('RESULT');

        if (onSendDiceRoll) {
          onSendDiceRoll(finalP0, finalP1, winIdx);
        }

        soundEffects.playDiceLand(isMyWin);

        if (isMyWin) {
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.65 },
              colors: ['#38bdf8', '#fbbf24', '#34d399', '#ffffff'],
            });
          } catch {}
          // 1P 승리 시: 유저가 직접 선공/후공을 선택할 수 있도록 대기
        } else {
          // 2P 승리 시: 상대가 AI이면 1.4초 후 선공 선택으로 자동 진행
          if (!isMultiplayer && player1.isAi) {
            completeTimerRef.current = window.setTimeout(() => {
              finishAndComplete(1, finalP0, finalP1, {
                winnerIndex: 1,
                chosenOrder: 'FIRST',
              });
            }, 1400);
          }
        }
      }
    }, 55);

    rollIntervalRef.current = interval;
  };

  // 스킵 (즉시 판정)
  const handleSkip = () => {
    if (hasCompletedRef.current) return;
    clearAllTimers();

    if (phase === 'RESULT' && winnerIndex !== null) {
      // 결과 화면에서 스킵을 누르면 기본값(승자 선공)으로 즉시 완료
      const defaultFirst: 0 | 1 = winnerIndex === 0 ? 0 : 1;
      finishAndComplete(defaultFirst, p0Value, p1Value, {
        winnerIndex,
        chosenOrder: 'FIRST',
      });
      return;
    }

    const finalP0 = Math.floor(Math.random() * 6) + 1;
    let finalP1 = Math.floor(Math.random() * 6) + 1;
    while (finalP1 === finalP0) {
      finalP1 = Math.floor(Math.random() * 6) + 1;
    }
    const winIdx: 0 | 1 = finalP0 > finalP1 ? 0 : 1;
    setP0Value(finalP0);
    setP1Value(finalP1);
    setWinnerIndex(winIdx);
    setPhase('RESULT');

    if (onSendDiceRoll) {
      onSendDiceRoll(finalP0, finalP1, winIdx);
    }

    if (!isMultiplayer && player1.isAi && winIdx === 1) {
      finishAndComplete(1, finalP0, finalP1, {
        winnerIndex: 1,
        chosenOrder: 'FIRST',
      });
    } else {
      soundEffects.playDiceLand(isMultiplayer ? winIdx === myPlayerIndex : winIdx === 0);
    }
  };

  useEffect(() => {
    if (isOpen) {
      isRollingRef.current = false;
      hasCompletedRef.current = false;
      setPhase('READY');
      setWinnerIndex(null);
      setP0Value(1);
      setP1Value(1);

      if (isMultiplayer && myPlayerIndex === 1) {
        // 게스트는 호스트의 주사위 굴림 대기 (자동 시작 안함)
      } else {
        // 1.4초 동안 조작 없으면 자동 굴림
        autoStartTimerRef.current = window.setTimeout(() => {
          startRoll();
        }, 1400);
      }

      // 스페이스바 / 엔터 키 입력 시 즉시 굴림
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          if (!isRollingRef.current && !hasCompletedRef.current) {
            e.preventDefault();
            startRoll();
          }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl bg-[#0c101b]/95 border border-[#f97316]/60 p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col items-center overflow-hidden">
        {/* 네 모서리 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
        <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

        {/* 상단 스킵 버튼 */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 bg-[#111520] hover:bg-[#1a2234] text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer border border-white/15 [clip-path:polygon(4px_0,100%_0,100%_calc(100%-4px),calc(100%-4px)_100%,0_100%,0_4px)]"
          title="주사위 연출을 건너뛰고 즉시 게임을 시작합니다"
        >
          <span>스킵</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>

        {/* 상단 타이틀 */}
        <div className="text-center space-y-1.5 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#111520] border border-[#f97316]/40 text-[#f97316] text-xs font-black tracking-wider shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-[#f97316] animate-spin" style={{ animationDuration: '4s' }} />
            <span>선공/후공 결정전 (INITIATIVE ROLL)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide flex items-center justify-center gap-2">
            <span>🎲 운명의 주사위 대결</span>
          </h2>
          <p className="text-xs text-slate-400">
            주사위에서 승리한 플레이어가 1턴 선공(First) 또는 후공(Second)을 직접 선택합니다.
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
        <div className="mt-6 w-full max-w-lg flex flex-col items-center space-y-3">
          {/* 주사위 결과 화면 */}
          {phase === 'RESULT' && winnerIndex !== null && (() => {
            const isWinner = isMultiplayer
              ? winnerIndex === myPlayerIndex
              : winnerIndex === 0 || !player1.isAi;
            const winnerPlayer = winnerIndex === 0 ? player0 : player1;
            const isAiWinner = !isMultiplayer && winnerIndex === 1 && player1.isAi;

            // 1) AI 승리 시 (싱글플레이 전용)
            if (isAiWinner) {
              return (
                <div className="w-full py-3 px-5 text-center font-black bg-purple-950/80 border border-purple-500/80 text-purple-300 shadow-xl shadow-purple-500/20 flex flex-col items-center justify-center gap-1 animate-in zoom-in-95 duration-200 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]">
                  <div className="flex items-center gap-2 text-sm sm:text-base">
                    <Swords className="w-5 h-5 text-purple-400" />
                    <span>⚔️ [{player1.name}] 주사위 승리!</span>
                  </div>
                  <span className="text-xs text-purple-300/80 font-normal">
                    상대(AI)가 [선공]을 선택했습니다. 잠시 후 시작됩니다...
                  </span>
                </div>
              );
            }

            // 2) 멀티플레이에서 내가 패배한 경우: 상대방 선택 대기창 표출 (선택 버튼 절대 안 나옴!)
            if (isMultiplayer && !isWinner) {
              return (
                <div className="w-full py-4 px-5 text-center font-black bg-[#0d1220]/95 border-2 border-violet-500/60 rounded-2xl text-slate-200 shadow-xl flex flex-col items-center justify-center gap-2 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 text-sm sm:text-base text-violet-300 font-black">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span>⚔️ [{winnerPlayer.name}] 주사위 승리!</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>상대방이 선공/후공을 선택하고 있습니다. 잠시만 기다려 주세요...</span>
                  </div>
                </div>
              );
            }

            // 3) 내가 주사위에 승리했거나 (또는 1인 2역): 선공 / 후공 선택 버튼 표출!
            return (
              <div className="w-full space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="py-2.5 px-4 rounded-2xl text-center font-black bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm">
                    🎉 [{winnerPlayer.name}] 주사위 승리! 선공 또는 후공을 선택하세요
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* 선공 선택 */}
                  <button
                    onClick={() => handleChooseOrder('FIRST')}
                    className="group relative p-3.5 sm:p-4 bg-[#111520] hover:bg-[#1a2234] border-2 border-[#f97316]/70 hover:border-[#f97316] text-left transition-all duration-150 cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98] [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs sm:text-sm font-black text-[#f97316] uppercase tracking-wide flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-[#f97316] fill-[#f97316]" />
                        선공 (First)
                      </span>
                      <span className="text-[10px] bg-[#f97316]/20 text-[#f97316] px-1.5 py-0.5 border border-[#f97316]/40 font-bold">
                        1턴 선제 행동
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      내가 먼저 행동하여 1턴 첫 공세를 전개합니다.
                    </p>
                  </button>

                  {/* 후공 선택 */}
                  <button
                    onClick={() => handleChooseOrder('SECOND')}
                    className="group relative p-3.5 sm:p-4 bg-[#111520] hover:bg-[#1a2234] border-2 border-[#22d3ee]/70 hover:border-[#22d3ee] text-left transition-all duration-150 cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98] [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs sm:text-sm font-black text-[#22d3ee] uppercase tracking-wide flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-[#22d3ee]" />
                        후공 (Second)
                      </span>
                      <span className="text-[10px] bg-[#22d3ee]/20 text-[#22d3ee] px-1.5 py-0.5 border border-[#22d3ee]/40 font-bold">
                        대응 반격
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      상대의 행동을 먼저 확인한 뒤 대응합니다.
                    </p>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 굴리기 시작 버튼 (READY 단계) */}
          {phase === 'READY' && (!isMultiplayer || myPlayerIndex === 0) && (
            <button
              onClick={startRoll}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] hover:brightness-110 text-white font-black text-sm sm:text-base tracking-wide shadow-[0_0_20px_rgba(249,115,22,0.3)] transition cursor-pointer flex items-center justify-center gap-2 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]"
            >
              <span>🎲 주사위 굴리기 (스페이스바)</span>
            </button>
          )}

          {phase === 'READY' && isMultiplayer && myPlayerIndex === 1 && (
            <div className="text-xs text-slate-400 font-bold animate-pulse flex items-center gap-1.5 py-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>방장(호스트)이 주사위를 굴리기를 기다리는 중...</span>
            </div>
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
