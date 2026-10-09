import React, { useEffect, useState, useCallback } from 'react';
import { ClashResult, PlayerState } from '../types/tcg';
import { CardView } from './CardView';
import { Flame, Wind, Shield, Swords, Sparkles, CheckCircle2, XCircle, Zap, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ClashAnimationOverlayProps {
  clashResult: ClashResult;
  players: [PlayerState, PlayerState];
  onDismiss: () => void;
}

export const ClashAnimationOverlay: React.FC<ClashAnimationOverlayProps> = ({
  clashResult,
  players,
  onDismiss,
}) => {
  // 4단계 시네마틱 연출: REVEAL (오픈) -> COLLIDE (격돌) -> SLASH (참격 및 대미지) -> RESULT (결과 및 연격 해금)
  const [stage, setStage] = useState<'REVEAL' | 'COLLIDE' | 'SLASH' | 'RESULT'>('REVEAL');

  const p0 = players[0];
  const p1 = players[1];
  const isP0Winner = clashResult.winnerIndex === 0;
  const isP1Winner = clashResult.winnerIndex === 1;
  const isDraw = clashResult.winnerIndex === -1;

  useEffect(() => {
    // 1단계: 700ms 후 격돌 (양 카드 돌진 & 화면 셰이크 & 스파크)
    const tCollide = setTimeout(() => {
      setStage('COLLIDE');
    }, 700);

    // 2단계: 1500ms 후 승리자의 참격 및 대미지 슬램
    const tSlash = setTimeout(() => {
      setStage('SLASH');
    }, 1500);

    // 3단계: 2300ms 후 승리 배너 & 연격권 해금 & 콘페티
    const tResult = setTimeout(() => {
      setStage('RESULT');
      if (clashResult.winnerIndex === 0) {
        confetti({
          particleCount: 65,
          spread: 75,
          origin: { y: 0.65 },
        });
      }
    }, 2300);

    return () => {
      clearTimeout(tCollide);
      clearTimeout(tSlash);
      clearTimeout(tResult);
    };
  }, [clashResult]);

  // 키보드 Space/Enter 키 누르면 즉시 다음 단계 진행
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onDismiss();
      }
    },
    [onDismiss]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 p-4 select-none overflow-hidden">
      {/* 배경 충돌 비네트 효과 */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
          stage === 'COLLIDE' || stage === 'SLASH'
            ? 'bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.2)_0%,rgba(0,0,0,0.85)_80%)] opacity-100'
            : 'opacity-40'
        }`}
      />

      {/* 전체 화면 진동 래퍼 (COLLIDE & SLASH 단계 시 발동) */}
      <div
        className={`relative w-full max-w-5xl flex flex-col items-center justify-center ${
          stage === 'COLLIDE' || stage === 'SLASH' ? 'animate-screen-shake' : ''
        }`}
      >
        {/* 상단 타이틀 배너 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-xs uppercase tracking-widest mb-1.5 shadow-xl shadow-amber-500/20">
            <Swords className="w-4 h-4 text-amber-400" />
            <span>CLASH & JUDGMENT BATTLE</span>
            <Zap className="w-4 h-4 text-yellow-300" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            {stage === 'REVEAL' && '카드를 오픈합니다!'}
            {stage === 'COLLIDE' && '⚔️ 양측 카드 전면 격돌 (CLASH)! ⚔️'}
            {stage === 'SLASH' && '💥 결정타 참격 & 상성 격파! 💥'}
            {stage === 'RESULT' && '🏆 판정 승리 및 전투 결과 🏆'}
          </h2>
        </div>

        {/* 중앙 카드 대치 구도 */}
        <div className="relative flex items-center justify-center gap-6 sm:gap-14 md:gap-20 w-full my-3">
          {/* ========================================================= */}
          {/* [좌측] 플레이어 카드 (P0) */}
          {/* ========================================================= */}
          <div className="flex flex-col items-center relative">
            <div className="flex items-center gap-2 mb-2.5 font-black text-sm text-slate-200">
              <span className="truncate max-w-[140px]">{p0.name}</span>
              {stage === 'RESULT' && (
                isP0Winner ? (
                  <span className="flex items-center gap-1 text-xs text-amber-300 font-black bg-amber-950/90 px-2.5 py-0.5 rounded-full border border-amber-400 shadow">
                    <Crown className="w-3.5 h-3.5 text-amber-400" /> 승리!
                  </span>
                ) : isDraw ? (
                  <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full">무승부</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-rose-400 bg-slate-900 px-2 py-0.5 rounded-full border border-rose-500/30">
                    <XCircle className="w-3.5 h-3.5" /> 패배
                  </span>
                )
              )}
            </div>

            {/* 카드 래퍼 (격돌 및 승/패 애니메이션 적용) */}
            <div
              className={`relative transition-all duration-300 transform ${
                stage === 'COLLIDE' ? 'animate-charge-left' : ''
              } ${
                (stage === 'SLASH' || stage === 'RESULT') && isP0Winner
                  ? 'scale-110 ring-4 ring-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.6)] z-20'
                  : ''
              } ${
                (stage === 'SLASH' || stage === 'RESULT') && isP1Winner
                  ? 'animate-knockback opacity-80'
                  : ''
              }`}
            >
              <CardView
                card={clashResult.p0Card}
                size="lg"
                isFacedown={stage === 'REVEAL'}
              />

              {/* P0가 패배했을 때: 상대 승리 참격 궤적 & 대미지 팝업 */}
              {(stage === 'SLASH' || stage === 'RESULT') && isP1Winner && (
                <>
                  {/* 참격 검기 궤적 (오른쪽에서 날아와 베어버림) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
                    <div className="w-[320px] h-3 bg-gradient-to-r from-transparent via-rose-500 via-white to-transparent shadow-[0_0_30px_rgba(244,63,94,1)] animate-blade-slash-right" />
                  </div>

                  {/* 거대 플로팅 대미지 슬램 */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none z-40">
                    <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-rose-500 to-red-700 drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-number-popup whitespace-nowrap">
                      💥 -{clashResult.damageDealt} DMG
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* [중앙] VS 엠블럼 & 상성 판정 & 격돌 스파크 파티클 */}
          {/* ========================================================= */}
          <div className="flex flex-col items-center justify-center shrink-0 relative z-30">
            {/* 격돌 스파크 파티클 버스트 */}
            {stage === 'COLLIDE' && (
              <div className="absolute w-48 h-48 rounded-full bg-radial from-white via-amber-400 to-transparent opacity-90 animate-hit-spark pointer-events-none" />
            )}

            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center shadow-2xl transition-all duration-300 ${
                stage === 'COLLIDE'
                  ? 'scale-125 border-yellow-300 shadow-[0_0_40px_rgba(250,204,21,0.8)]'
                  : 'shadow-amber-500/20'
              }`}
            >
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tighter">VS</span>
            </div>

            {/* 상성 가이드 미니 다이어그램 */}
            <div className="flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 shadow mt-3">
              <span className="text-red-400 flex items-center"><Flame className="w-3 h-3 inline mr-0.5" />RED</span>
              <span className="text-slate-500">&gt;</span>
              <span className="text-emerald-400 flex items-center"><Wind className="w-3 h-3 inline mr-0.5" />GREEN</span>
              <span className="text-slate-500">&gt;</span>
              <span className="text-cyan-400 flex items-center"><Shield className="w-3 h-3 inline mr-0.5" />BLUE</span>
              <span className="text-slate-500">&gt;</span>
              <span className="text-red-400">RED</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* [우측] 상대 카드 (P1) */}
          {/* ========================================================= */}
          <div className="flex flex-col items-center relative">
            <div className="flex items-center gap-2 mb-2.5 font-black text-sm text-slate-200">
              <span className="truncate max-w-[140px]">{p1.name}</span>
              {stage === 'RESULT' && (
                isP1Winner ? (
                  <span className="flex items-center gap-1 text-xs text-amber-300 font-black bg-amber-950/90 px-2.5 py-0.5 rounded-full border border-amber-400 shadow">
                    <Crown className="w-3.5 h-3.5 text-amber-400" /> 승리!
                  </span>
                ) : isDraw ? (
                  <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full">무승부</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-rose-400 bg-slate-900 px-2 py-0.5 rounded-full border border-rose-500/30">
                    <XCircle className="w-3.5 h-3.5" /> 패배
                  </span>
                )
              )}
            </div>

            {/* 카드 래퍼 (격돌 및 승/패 애니메이션 적용) */}
            <div
              className={`relative transition-all duration-300 transform ${
                stage === 'COLLIDE' ? 'animate-charge-right' : ''
              } ${
                (stage === 'SLASH' || stage === 'RESULT') && isP1Winner
                  ? 'scale-110 ring-4 ring-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.6)] z-20'
                  : ''
              } ${
                (stage === 'SLASH' || stage === 'RESULT') && isP0Winner
                  ? 'animate-knockback opacity-80'
                  : ''
              }`}
            >
              <CardView
                card={clashResult.p1Card}
                size="lg"
                isFacedown={stage === 'REVEAL'}
              />

              {/* P1이 패배했을 때: 승자(P0)의 승리 참격 궤적 & 대미지 팝업 */}
              {(stage === 'SLASH' || stage === 'RESULT') && isP0Winner && (
                <>
                  {/* 참격 검기 궤적 (왼쪽에서 날아와 베어버림) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
                    <div className="w-[320px] h-3 bg-gradient-to-r from-transparent via-cyan-400 via-white to-transparent shadow-[0_0_30px_rgba(34,211,238,1)] animate-blade-slash-left" />
                  </div>

                  {/* 거대 플로팅 대미지 슬램 */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none z-40">
                    <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-rose-500 to-red-700 drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-number-popup whitespace-nowrap">
                      💥 -{clashResult.damageDealt} DMG
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 결과 배너 설명 (RESULT 스테이지) */}
        {/* ========================================================= */}
        <div className="mt-5 w-full max-w-xl text-center">
          {stage === 'RESULT' ? (
            <div className="bg-slate-900/95 border-2 border-amber-500/70 rounded-2xl p-5 shadow-2xl animate-victory-banner">
              <div className="text-base font-extrabold text-slate-100 mb-2">
                {clashResult.logText}
              </div>

              {/* 피해량 및 연격권 뱃지 */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-black my-3">
                <span className="text-rose-400 bg-rose-950/70 px-3 py-1 rounded-full border border-rose-500/40 shadow">
                  💥 피해량: -{clashResult.damageDealt} HP
                </span>

                {clashResult.comboGranted > 0 && (
                  <span className="text-amber-300 bg-amber-950/80 px-3.5 py-1 rounded-full border-2 border-amber-400/80 shadow-lg shadow-amber-500/30 flex items-center gap-1.5 animate-flame-pulse">
                    <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                    <span>🔥 COMBO UNLOCKED! 연격 횟수 +{clashResult.comboGranted}회 획득!</span>
                  </span>
                )}
              </div>

              {/* 다음 단계 버튼 (마우스 클릭 또는 Space/Enter 지원) */}
              <button
                onClick={onDismiss}
                className="mt-3 px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/30 transition transform hover:scale-105 cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                <span>다음 단계로 진행</span>
                <span className="text-[11px] font-bold text-slate-800 bg-amber-200/80 px-2 py-0.5 rounded">
                  스페이스바 / 클릭
                </span>
              </button>
            </div>
          ) : (
            <div className="text-sm font-bold text-amber-300 animate-pulse">
              {stage === 'REVEAL' && '카드를 확인하고 있습니다...'}
              {stage === 'COLLIDE' && '동시 오픈! 양측 카드가 격돌합니다!'}
              {stage === 'SLASH' && '상성과 속도를 판정하여 공격이 적중합니다!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
