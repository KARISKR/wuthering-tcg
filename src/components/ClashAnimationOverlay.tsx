import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ClashResult, PlayerState } from '../types/tcg';
import { CardView } from './CardView';
import { Flame, Wind, Shield, Swords, Sparkles, XCircle, Zap, Crown, Heart, BatteryCharging, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

import { soundEffects, getWeaponByCharacter } from '../utils/soundEffects';

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
  // 5단계 시네마틱 연출:
  // SET_WAIT (0~800ms 양측 뒷면 대치)
  // -> REVEAL (800~2400ms 3D 카드 플립 오픈 & 카드 정보/스피드 확인)
  // -> COLLIDE (2400~3400ms 양 카드 돌진 격돌)
  // -> SLASH (3400~4400ms 승리 참격 & 대미지 슬램)
  // -> RESULT (4400ms+ 최종 판정 배너 & 연격 해금)
  const [stage, setStage] = useState<'SET_WAIT' | 'REVEAL' | 'COLLIDE' | 'SLASH' | 'RESULT'>('SET_WAIT');
  const timersRef = useRef<number[]>([]);
  const hasPlayedSlashRef = useRef<boolean>(false);
  const hasPlayedHealRef = useRef<boolean>(false);

  const p0 = players[0];
  const p1 = players[1];
  const isP0Winner = clashResult.winnerIndex === 0;
  const isP1Winner = clashResult.winnerIndex === 1;
  const isDraw = clashResult.winnerIndex === -1;

  // 회복 효과 집계
  const p0HealEvents = clashResult.triggeredEffects?.filter(
    (eff) => eff.effectType === 'HEAL' && eff.playerIndex === 0
  ) || [];
  const p1HealEvents = clashResult.triggeredEffects?.filter(
    (eff) => eff.effectType === 'HEAL' && eff.playerIndex === 1
  ) || [];

  const extractAmount = (eff: { description: string }) => {
    const match = eff.description.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  };

  const p0HealTotal = p0HealEvents.reduce((sum, eff) => sum + extractAmount(eff), 0);
  const p1HealTotal = p1HealEvents.reduce((sum, eff) => sum + extractAmount(eff), 0);

  // 배틀 스텝 효과 피해 집계 (치샤, 금희 등 적색 배틀 시 1pt 피해)
  const p0BattleDmgEvents = clashResult.triggeredEffects?.filter(
    (eff) => eff.effectType === 'DAMAGE' && eff.title.includes('배틀 효과') && eff.playerIndex === 0
  ) || [];
  const p1BattleDmgEvents = clashResult.triggeredEffects?.filter(
    (eff) => eff.effectType === 'DAMAGE' && eff.title.includes('배틀 효과') && eff.playerIndex === 1
  ) || [];

  const p0BattleDmgToP1 = p0BattleDmgEvents.reduce((sum, eff) => sum + extractAmount(eff), 0);
  const p1BattleDmgToP0 = p1BattleDmgEvents.reduce((sum, eff) => sum + extractAmount(eff), 0);

  // 승리자 리더의 무기 타입 판별
  const winnerLeader = clashResult.winnerIndex !== -1 ? players[clashResult.winnerIndex]?.slots.leader : null;
  const winnerWeapon = winnerLeader ? getWeaponByCharacter(winnerLeader.characterName || winnerLeader.nameKr) : undefined;

  useEffect(() => {
    // 0ms 시작 시 카드 세트 효과음
    soundEffects.playCardPlace();

    // 1단계: 800ms 후 3D 카드 플립 오픈 (REVEAL - 카드 오픈 전용 사운드)
    const tReveal = window.setTimeout(() => {
      setStage('REVEAL');
      soundEffects.playCardFlip();
    }, 800);

    // 2단계: 2400ms 후 격돌 (COLLIDE - 카드 정면 격돌 사운드)
    const tCollide = window.setTimeout(() => {
      setStage('COLLIDE');
      soundEffects.playClash();
    }, 2400);

    // 3단계: 3400ms 후 승리자의 참격 및 대미지 슬램 (공격 음성/모션 -> 180ms 후 피격 대미지 크런치 순차 발동)
    const tSlash = window.setTimeout(() => {
      setStage('SLASH');
      hasPlayedSlashRef.current = true;
      if (clashResult.damageDealt > 0) {
        const winnerCard = clashResult.winnerIndex === 0 ? p0.clashCard : p1.clashCard;
        const winnerCost = winnerCard ? winnerCard.cost : 0;
        const winnerLeaderName = winnerLeader?.characterName || winnerLeader?.nameKr;

        // 1. 공격자 기합 보이스 우선 재생 (무기음은 180ms 후 피격 시점에 단일 재생)
        soundEffects.playCharacterAttack(winnerLeaderName, winnerCost);

        // 2. 180ms 후 피격자 타격 및 무기 고유 타격음, 피격 보이스 순차 재생 (음성 뭉개짐/상쇄 방지)
        const tImpact = window.setTimeout(() => {
          const loserLeader = clashResult.winnerIndex === 0 ? p1.slots.leader : p0.slots.leader;
          const loserLeaderName = loserLeader?.characterName || loserLeader?.nameKr;
          soundEffects.playDamage(clashResult.damageDealt, winnerWeapon, loserLeaderName);
        }, 180);
        timersRef.current.push(tImpact);
      } else {
        soundEffects.playClashDraw();
      }
    }, 3400);

    // 4단계: 4400ms 후 공격 직후 체력 회복 효과음 & 승리 배너 & 연격권 해금 & 콘페티
    const tResult = window.setTimeout(() => {
      setStage('RESULT');
      if (!hasPlayedHealRef.current && (p0HealTotal > 0 || p1HealTotal > 0)) {
        hasPlayedHealRef.current = true;
        soundEffects.playHeal(p0HealTotal || p1HealTotal);
      }
      if (clashResult.winnerIndex === 0) {
        confetti({
          particleCount: 65,
          spread: 75,
          origin: { y: 0.65 },
        });
      }
    }, 4400);

    timersRef.current = [tReveal, tCollide, tSlash, tResult];

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [clashResult, winnerWeapon, p0, p1, winnerLeader, p0HealTotal, p1HealTotal]);

  // 클릭 또는 스페이스바/Enter 입력 시: 진행 중이면 즉시 결과로 스킵, 결과 상태면 닫기
  const handleFastForwardOrDismiss = useCallback(() => {
    if (stage !== 'RESULT') {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setStage('RESULT');

      // 스킵 시에도 결정타 효과음이 누락되지 않도록 1회 재생 보장
      if (!hasPlayedSlashRef.current) {
        hasPlayedSlashRef.current = true;
        if (clashResult.damageDealt > 0) {
          const loserLeader = clashResult.winnerIndex === 0 ? p1.slots.leader : p0.slots.leader;
          const loserLeaderName = loserLeader?.characterName || loserLeader?.nameKr;
          soundEffects.playDamage(clashResult.damageDealt, winnerWeapon, loserLeaderName);
        } else {
          soundEffects.playClashDraw();
        }
      }

      // 스킵 시에도 공격 후 회복 효과음 1회 재생
      if (!hasPlayedHealRef.current && (p0HealTotal > 0 || p1HealTotal > 0)) {
        hasPlayedHealRef.current = true;
        soundEffects.playHeal(p0HealTotal || p1HealTotal);
      }

      if (clashResult.winnerIndex === 0) {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.65 },
        });
      }
    } else {
      onDismiss();
    }
  }, [stage, clashResult, onDismiss, p0, p1, winnerWeapon, p0HealTotal, p1HealTotal]);

  // 키보드 Space/Enter 키 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFastForwardOrDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFastForwardOrDismiss]);

  return (
    <div
      onClick={handleFastForwardOrDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 p-4 select-none overflow-y-auto custom-scrollbar cursor-pointer"
    >
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
        onClick={(e) => {
          // 내부 인터랙티브 요소(버튼/스크롤) 외 전체 영역 클릭 허용
          if ((e.target as HTMLElement).closest('button')) {
            e.stopPropagation();
          }
        }}
        className={`relative w-full max-w-6xl xl:max-w-7xl flex flex-col items-center justify-center my-auto py-4 ${
          stage === 'COLLIDE' || stage === 'SLASH' ? 'animate-screen-shake' : ''
        }`}
      >
        {/* 상단 타이틀 배너 */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-xs uppercase tracking-widest mb-1.5 shadow-xl shadow-amber-500/20">
            <Swords className="w-4 h-4 text-amber-400" />
            <span>CLASH & JUDGMENT BATTLE</span>
            <Zap className="w-4 h-4 text-yellow-300" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            {stage === 'SET_WAIT' && '🔒 대결 카드 세트 완료 · 카드를 오픈합니다!'}
            {stage === 'REVEAL' && '🎴 카드 동시 오픈 (REVEAL) · 상성 및 속도 판정!'}
            {stage === 'COLLIDE' && '⚔️ 양측 카드 전면 격돌 (CLASH)! ⚔️'}
            {stage === 'SLASH' && '💥 결정타 참격 & 상성 격파! 💥'}
            {stage === 'RESULT' && '🏆 판정 승리 및 전투 결과 🏆'}
          </h2>
        </div>

        {/* 중앙 카드 대치 구도 */}
        <div className="relative flex items-center justify-center gap-6 sm:gap-14 md:gap-20 w-full my-2">
          {/* ========================================================= */}
          {/* [좌측] 플레이어 카드 (P0) */}
          {/* ========================================================= */}
          <div className="flex flex-col items-center relative">
            {/* 플레이어 정보 및 승/패 배지 (수직 중앙 정렬 배치) */}
            <div className="flex flex-col items-center justify-center gap-1.5 mb-3 min-h-[56px] w-full">
              {/* 승리 / 무승부 / 패배 배지 (이름 위에 표시 & 카드 중앙 정렬) */}
              {stage === 'RESULT' ? (
                isP0Winner ? (
                  <div className="flex items-center justify-center gap-2 text-sm sm:text-base md:text-lg text-amber-200 font-black bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 px-5 py-1.5 rounded-full border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.7)] animate-bounce tracking-wide">
                    <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                    <span>승리!</span>
                  </div>
                ) : isDraw ? (
                  <div className="flex items-center justify-center text-xs sm:text-sm text-slate-300 bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-600 font-bold shadow-md">
                    무승부
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-rose-300 bg-rose-950/90 px-3.5 py-1 rounded-full border border-rose-500/60 font-bold shadow-md shadow-rose-900/40">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>패배</span>
                  </div>
                )
              ) : (
                <div className="h-7" aria-hidden="true" />
              )}

              {/* 플레이어 이름 (배지 아래에 중앙 정렬) */}
              <div className="font-black text-sm sm:text-base text-slate-100 tracking-wide truncate max-w-[160px] sm:max-w-[200px] text-center drop-shadow-sm">
                {p0.name}
              </div>
            </div>

            {/* 카드 래퍼 (세트 대기 / 3D 오픈 / 격돌 / 승·패 애니메이션 적용) */}
            <div
              className={`relative transition-all duration-300 transform rounded-xl ${
                stage === 'SET_WAIT' ? 'animate-card-tense' : ''
              } ${
                stage === 'REVEAL' ? 'animate-card-flip' : ''
              } ${
                stage === 'COLLIDE' ? 'animate-charge-left' : ''
              } ${
                (stage === 'SLASH' || stage === 'RESULT') && isP0Winner
                  ? 'scale-105 ring-4 ring-amber-400 rounded-xl shadow-[0_0_50px_rgba(251,191,36,0.6)] z-20'
                  : ''
              } ${
                (stage === 'SLASH' || stage === 'RESULT') && isP1Winner
                  ? 'animate-knockback opacity-75'
                  : ''
              }`}
            >
              {clashResult.p0Card ? (
                <CardView
                  card={clashResult.p0Card}
                  size="xl"
                  isFacedown={stage === 'SET_WAIT'}
                />
              ) : (
                <div className="w-56 h-80 sm:w-64 sm:h-92 md:w-72 md:h-100 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Swords className="w-10 h-10 opacity-40" />
                  <span className="text-sm font-bold">카드 미제출 (패스)</span>
                </div>
              )}

              {/* P0가 패배했을 때: 상대 승리 참격 궤적 & 대미지 팝업 */}
              {(stage === 'SLASH' || stage === 'RESULT') && isP1Winner && (
                <>
                  {/* 참격 검기 궤적 (오른쪽에서 날아와 베어버림) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
                    <div className="w-[360px] h-3.5 bg-gradient-to-r from-transparent via-rose-500 via-white to-transparent shadow-[0_0_35px_rgba(244,63,94,1)] animate-blade-slash-right" />
                  </div>

                  {/* 거대 플로팅 대미지 슬램 */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none z-40">
                    <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-rose-500 to-red-700 drop-shadow-[0_0_25px_rgba(239,68,68,1)] animate-number-popup whitespace-nowrap">
                      💥 -{clashResult.damageDealt} DMG
                    </div>
                  </div>
                </>
              )}

              {/* P1이 상대(P0 치샤/금희 등) 배틀 효과 피해를 받았을 때 */}
              {p0BattleDmgToP1 > 0 && stage !== 'SET_WAIT' && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-40 bg-gradient-to-r from-red-950 to-rose-900 text-rose-200 border border-red-500/80 px-3 py-1 rounded-full text-xs font-black shadow-lg shadow-red-950/60 animate-bounce whitespace-nowrap">
                  🎯 -{p0BattleDmgToP1} HP (배틀 효과 피해)
                </div>
              )}

              {/* P0 공격 후 체력 회복 이펙트 (회복 카드는 공격 후 회복 효과음 & 시각 이펙트) */}
              {p0HealTotal > 0 && stage === 'RESULT' && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 pointer-events-none z-40">
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-950/95 border-2 border-emerald-400 text-emerald-300 font-black text-sm sm:text-base shadow-[0_0_25px_rgba(52,211,153,0.85)] animate-bounce whitespace-nowrap">
                    <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                    <span>+{p0HealTotal} HP 회복!</span>
                  </div>
                </div>
              )}
            </div>

            {/* 카드 오픈 후 스펙 및 상성 인디케이터 (REVEAL 이후 단계) */}
            {clashResult.p0Card && stage !== 'SET_WAIT' && (
              <div className="mt-3 flex flex-col items-center gap-1.5 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/95 border border-slate-700 text-xs sm:text-sm font-mono font-black shadow-md">
                  <span
                    className={
                      clashResult.p0Card.color === 'RED'
                        ? 'text-red-400 font-black'
                        : clashResult.p0Card.color === 'GREEN'
                        ? 'text-emerald-400 font-black'
                        : 'text-cyan-400 font-black'
                    }
                  >
                    {clashResult.p0Card.color}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-amber-300 font-black">⚡ SPD {clashResult.p0Card.speed}</span>
                </div>
                <span
                  className={`text-xs font-black px-3 py-0.5 rounded-full ${
                    isP0Winner
                      ? 'text-amber-300 bg-amber-950/90 border border-amber-500/60 shadow-sm animate-pulse'
                      : isDraw
                      ? 'text-slate-400 bg-slate-900 border border-slate-700'
                      : 'text-rose-400 bg-rose-950/80 border border-rose-500/40'
                  }`}
                >
                  {isP0Winner
                    ? clashResult.reason === 'COLOR_ADVANTAGE'
                      ? '🔺 상성 우위'
                      : clashResult.reason === 'SPEED_ADVANTAGE'
                      ? '⚡ 속도 우위'
                      : '승리'
                    : isDraw
                    ? '무승부'
                    : '패배'}
                </span>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* [중앙] VS 엠블럼 & 상성 판정 & 격돌 스파크 파티클 */}
          {/* ========================================================= */}
          <div className="flex flex-col items-center justify-center shrink-0 relative z-30">
            {/* 격돌 스파크 파티클 버스트 */}
            {stage === 'COLLIDE' && (
              <div className="absolute w-56 h-56 rounded-full bg-radial from-white via-amber-400 to-transparent opacity-90 animate-hit-spark pointer-events-none" />
            )}

            <div
              className={`w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-slate-900 border-2 flex items-center justify-center shadow-2xl transition-all duration-300 ${
                stage === 'SET_WAIT'
                  ? 'border-slate-600 scale-95 shadow-none'
                  : stage === 'COLLIDE'
                  ? 'scale-125 border-yellow-300 shadow-[0_0_50px_rgba(250,204,21,0.9)]'
                  : 'border-amber-400 shadow-amber-500/30'
              }`}
            >
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tighter">VS</span>
            </div>

            {/* 상성 가이드 미니 다이어그램 */}
            <div className="flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-md mt-3.5">
              <span className="text-red-400 flex items-center"><Flame className="w-3.5 h-3.5 inline mr-0.5" />RED</span>
              <span className="text-slate-500 font-bold">&gt;</span>
              <span className="text-emerald-400 flex items-center"><Wind className="w-3.5 h-3.5 inline mr-0.5" />GREEN</span>
              <span className="text-slate-500 font-bold">&gt;</span>
              <span className="text-cyan-400 flex items-center"><Shield className="w-3.5 h-3.5 inline mr-0.5" />BLUE</span>
              <span className="text-slate-500 font-bold">&gt;</span>
              <span className="text-red-400">RED</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* [우측] 상대 카드 (P1) */}
          {/* ========================================================= */}
          <div className="flex flex-col items-center relative">
            {/* 상대 정보 및 승/패 배지 (수직 중앙 정렬 배치) */}
            <div className="flex flex-col items-center justify-center gap-1.5 mb-3 min-h-[56px] w-full">
              {/* 승리 / 무승부 / 패배 배지 (이름 위에 표시 & 카드 중앙 정렬) */}
              {stage === 'RESULT' ? (
                isP1Winner ? (
                  <div className="flex items-center justify-center gap-2 text-sm sm:text-base md:text-lg text-amber-200 font-black bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 px-5 py-1.5 rounded-full border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.7)] animate-bounce tracking-wide">
                    <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                    <span>승리!</span>
                  </div>
                ) : isDraw ? (
                  <div className="flex items-center justify-center text-xs sm:text-sm text-slate-300 bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-600 font-bold shadow-md">
                    무승부
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-rose-300 bg-rose-950/90 px-3.5 py-1 rounded-full border border-rose-500/60 font-bold shadow-md shadow-rose-900/40">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>패배</span>
                  </div>
                )
              ) : (
                <div className="h-7" aria-hidden="true" />
              )}

              {/* 상대 이름 (배지 아래에 중앙 정렬) */}
              <div className="font-black text-sm sm:text-base text-slate-100 tracking-wide truncate max-w-[160px] sm:max-w-[200px] text-center drop-shadow-sm">
                {p1.name}
              </div>
            </div>

            {/* 카드 래퍼 (세트 대기 / 3D 오픈 / 격돌 / 승·패 애니메이션 적용) */}
            <div
              className={`relative transition-all duration-300 transform rounded-xl ${
                stage === 'SET_WAIT' ? 'animate-card-tense' : ''
              } ${
                stage === 'REVEAL' ? 'animate-card-flip' : ''
              } ${
                stage === 'COLLIDE' ? 'animate-charge-right' : ''
              } ${
                (stage === 'SLASH' || stage === 'RESULT') && isP1Winner
                  ? 'scale-105 ring-4 ring-amber-400 rounded-xl shadow-[0_0_50px_rgba(251,191,36,0.6)] z-20'
                  : ''
              } ${
                (stage === 'SLASH' || stage === 'RESULT') && isP0Winner
                  ? 'animate-knockback opacity-75'
                  : ''
              }`}
            >
              {clashResult.p1Card ? (
                <CardView
                  card={clashResult.p1Card}
                  size="xl"
                  isFacedown={stage === 'SET_WAIT'}
                />
              ) : (
                <div className="w-56 h-80 sm:w-64 sm:h-92 md:w-72 md:h-100 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Swords className="w-10 h-10 opacity-40" />
                  <span className="text-sm font-bold">카드 미제출 (패스)</span>
                </div>
              )}

              {/* P1이 패배했을 때: 승자(P0)의 승리 참격 궤적 & 대미지 팝업 */}
              {(stage === 'SLASH' || stage === 'RESULT') && isP0Winner && (
                <>
                  {/* 참격 검기 궤적 (왼쪽에서 날아와 베어버림) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
                    <div className="w-[360px] h-3.5 bg-gradient-to-r from-transparent via-cyan-400 via-white to-transparent shadow-[0_0_35px_rgba(34,211,238,1)] animate-blade-slash-left" />
                  </div>

                  {/* 거대 플로팅 대미지 슬램 */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none z-40">
                    <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-rose-500 to-red-700 drop-shadow-[0_0_25px_rgba(239,68,68,1)] animate-number-popup whitespace-nowrap">
                      💥 -{clashResult.damageDealt} DMG
                    </div>
                  </div>
                </>
              )}

              {/* P1이 상대(P0 치샤/금희 등) 배틀 효과 피해를 받았을 때 */}
              {p0BattleDmgToP1 > 0 && stage !== 'SET_WAIT' && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-40 bg-gradient-to-r from-red-950 to-rose-900 text-rose-200 border border-red-500/80 px-3 py-1 rounded-full text-xs font-black shadow-lg shadow-red-950/60 animate-bounce whitespace-nowrap">
                  🎯 -{p0BattleDmgToP1} HP (배틀 효과 피해)
                </div>
              )}

              {/* P1 공격 후 체력 회복 이펙트 (회복 카드는 공격 후 회복 효과음 & 시각 이펙트) */}
              {p1HealTotal > 0 && stage === 'RESULT' && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 pointer-events-none z-40">
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-950/95 border-2 border-emerald-400 text-emerald-300 font-black text-sm sm:text-base shadow-[0_0_25px_rgba(52,211,153,0.85)] animate-bounce whitespace-nowrap">
                    <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                    <span>+{p1HealTotal} HP 회복!</span>
                  </div>
                </div>
              )}
            </div>

            {/* 카드 오픈 후 스펙 및 상성 인디케이터 (REVEAL 이후 단계) */}
            {clashResult.p1Card && stage !== 'SET_WAIT' && (
              <div className="mt-3 flex flex-col items-center gap-1.5 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/95 border border-slate-700 text-xs sm:text-sm font-mono font-black shadow-md">
                  <span
                    className={
                      clashResult.p1Card.color === 'RED'
                        ? 'text-red-400 font-black'
                        : clashResult.p1Card.color === 'GREEN'
                        ? 'text-emerald-400 font-black'
                        : 'text-cyan-400 font-black'
                    }
                  >
                    {clashResult.p1Card.color}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-amber-300 font-black">⚡ SPD {clashResult.p1Card.speed}</span>
                </div>
                <span
                  className={`text-xs font-black px-3 py-0.5 rounded-full ${
                    isP1Winner
                      ? 'text-amber-300 bg-amber-950/90 border border-amber-500/60 shadow-sm animate-pulse'
                      : isDraw
                      ? 'text-slate-400 bg-slate-900 border border-slate-700'
                      : 'text-rose-400 bg-rose-950/80 border border-rose-500/40'
                  }`}
                >
                  {isP1Winner
                    ? clashResult.reason === 'COLOR_ADVANTAGE'
                      ? '🔺 상성 우위'
                      : clashResult.reason === 'SPEED_ADVANTAGE'
                      ? '⚡ 속도 우위'
                      : '승리'
                    : isDraw
                    ? '무승부'
                    : '패배'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 결과 배너 설명 (RESULT 스테이지) */}
        {/* ========================================================= */}
        <div className="mt-4 w-full max-w-3xl lg:max-w-4xl text-center">
          {stage === 'RESULT' ? (
            <div className="relative bg-[#0c101b]/95 border border-[#f97316]/70 rounded-xl p-5 sm:p-7 shadow-[0_0_80px_rgba(0,0,0,0.95)] animate-victory-banner overflow-hidden">
              {/* 네 모서리 명조 택티컬 오렌지/시안 'ㄱ'자 코너 브라켓 장식 */}
              <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#f97316]" />
              <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#f97316]" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#22d3ee]" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#22d3ee]" />

              <div className="text-lg sm:text-2xl font-black text-white mb-2.5 tracking-tight leading-snug drop-shadow-md">
                {clashResult.logText}
              </div>

              {/* 피해량, 회복량 및 연격권 뱃지 */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base font-black my-3.5">
                {clashResult.damageDealt > 0 && (
                  <span className="text-rose-300 bg-gradient-to-r from-rose-950/90 to-red-950/90 px-4 py-2 rounded-xl border border-rose-500/60 shadow-lg shadow-rose-950/40 flex items-center gap-2">
                    <span className="text-base sm:text-lg">💥</span>
                    <span>판정 타격 피해: <strong className="text-rose-400 font-mono text-base sm:text-lg">-{clashResult.damageDealt}</strong> HP</span>
                  </span>
                )}

                {p0BattleDmgToP1 > 0 && (
                  <span className="text-amber-200 bg-gradient-to-r from-rose-950/95 via-red-950/90 to-amber-950/95 px-4 py-2 rounded-xl border border-amber-500/60 shadow-lg flex items-center gap-2 animate-in fade-in">
                    <span className="text-base sm:text-lg">🎯</span>
                    <span>{p0.name} 배틀 효과: <strong className="text-amber-300 font-mono text-base sm:text-lg">-{p0BattleDmgToP1}</strong> HP</span>
                  </span>
                )}

                {p1BattleDmgToP0 > 0 && (
                  <span className="text-amber-200 bg-gradient-to-r from-rose-950/95 via-red-950/90 to-amber-950/95 px-4 py-2 rounded-xl border border-amber-500/60 shadow-lg flex items-center gap-2 animate-in fade-in">
                    <span className="text-base sm:text-lg">🎯</span>
                    <span>{p1.name} 배틀 효과: <strong className="text-amber-300 font-mono text-base sm:text-lg">-{p1BattleDmgToP0}</strong> HP</span>
                  </span>
                )}

                {p0HealTotal > 0 && (
                  <span className="text-emerald-300 bg-gradient-to-r from-emerald-950/90 to-teal-950/90 px-4 py-2 rounded-xl border border-emerald-500/60 shadow-lg shadow-emerald-950/40 flex items-center gap-2 animate-in fade-in">
                    <span className="text-base sm:text-lg">💚</span>
                    <span>
                      {p0.name} <strong className="text-emerald-400 font-mono text-base sm:text-lg">HP +{p0HealTotal}</strong> 회복
                    </span>
                  </span>
                )}

                {p1HealTotal > 0 && (
                  <span className="text-emerald-300 bg-gradient-to-r from-emerald-950/90 to-teal-950/90 px-4 py-2 rounded-xl border border-emerald-500/60 shadow-lg shadow-emerald-950/40 flex items-center gap-2 animate-in fade-in">
                    <span className="text-base sm:text-lg">💚</span>
                    <span>
                      {p1.name} <strong className="text-emerald-400 font-mono text-base sm:text-lg">HP +{p1HealTotal}</strong> 회복
                    </span>
                  </span>
                )}

                {clashResult.comboBlockedReason ? (
                  <span className="text-rose-200 bg-gradient-to-r from-rose-950/95 via-red-950/90 to-amber-950/95 px-4 py-2 rounded-xl border border-rose-500/80 shadow-xl flex items-center gap-2 animate-in fade-in">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                    <span>🛡️ <strong className="text-rose-300 font-bold">{clashResult.comboBlockedReason}</strong></span>
                  </span>
                ) : clashResult.comboGranted > 0 ? (
                  <span className="text-amber-200 bg-gradient-to-r from-amber-950/95 via-orange-950/90 to-red-950/95 px-4 py-2 rounded-xl border border-amber-400/80 shadow-xl shadow-amber-500/30 flex items-center gap-2 animate-pulse">
                    <Flame className="w-5 h-5 text-orange-400 fill-orange-400 animate-bounce" />
                    <span>추격 게이지 충전! <strong className="text-amber-300 font-mono text-base sm:text-lg">연격 +{clashResult.comboGranted}회</strong> 획득</span>
                  </span>
                ) : null}
              </div>

              {/* 발동된 카드 효과 및 발생한 사건 상세 목록 */}
              {clashResult.triggeredEffects && clashResult.triggeredEffects.length > 0 && (
                <div className="my-4 pt-4 border-t border-white/10 text-left">
                  <div className="text-xs sm:text-sm font-mono font-black text-[#f97316] uppercase tracking-wider mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#f97316] animate-pulse" />
                      <span>발동된 카드 효과 & 판정 결과 ({clashResult.triggeredEffects.length}건)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal">전투 중 자동 발동</span>
                  </div>
                  <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1.5">
                    {clashResult.triggeredEffects.map((eff) => {
                      const typeBadge =
                        eff.effectType === 'COMBO'
                          ? { label: '연격 무제한/추격', bg: 'bg-orange-950/90 text-orange-300 border-orange-500/50' }
                          : eff.effectType === 'CANCEL'
                          ? { label: '연격/효과 봉쇄', bg: 'bg-rose-950/90 text-rose-300 border-rose-500/50' }
                          : eff.effectType === 'DRAW'
                          ? { label: '패 보충/회수', bg: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50' }
                          : eff.effectType === 'CHARGE'
                          ? { label: '협주 충전', bg: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50' }
                          : eff.effectType === 'DAMAGE'
                          ? { label: '피해 추가', bg: 'bg-rose-950/90 text-rose-300 border-rose-500/50' }
                          : eff.effectType === 'HEAL'
                          ? { label: '생명력 회복', bg: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50' }
                          : { label: '특수 효과', bg: 'bg-amber-950/90 text-amber-300 border-amber-500/50' };

                      return (
                        <div
                          key={eff.id}
                          className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl bg-[#111520]/80 border border-white/10 hover:border-[#f97316]/50 text-xs sm:text-sm shadow-md transition-all duration-200"
                        >
                          {eff.sourceCardArt ? (
                            <img
                              src={eff.sourceCardArt}
                              alt={eff.sourceCardName}
                              className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg object-contain bg-slate-950 border border-white/15 shrink-0 shadow"
                            />
                          ) : (
                            <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg bg-slate-950 border border-white/15 flex items-center justify-center shrink-0 shadow">
                              {eff.effectType === 'HEAL' && <Heart className="w-6 h-6 text-emerald-400 fill-emerald-400" />}
                              {eff.effectType === 'CHARGE' && <BatteryCharging className="w-6 h-6 text-cyan-400" />}
                              {eff.effectType === 'DRAW' && <Sparkles className="w-6 h-6 text-amber-400" />}
                              {eff.effectType === 'CANCEL' && <ShieldAlert className="w-6 h-6 text-blue-400" />}
                              {eff.effectType === 'COMBO' && <Flame className="w-6 h-6 text-orange-400" />}
                              {eff.effectType === 'DAMAGE' && <Swords className="w-6 h-6 text-rose-400" />}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-white text-sm sm:text-base tracking-wide">
                                {eff.sourceCardName}
                              </span>
                              <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border font-mono ${typeBadge.bg}`}>
                                {typeBadge.label}
                              </span>
                              <span className="text-xs sm:text-sm font-mono font-bold text-amber-300">
                                [{eff.title}]
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed break-words whitespace-normal">
                              <span className="text-amber-400 font-bold mr-1.5">➔</span>
                              {eff.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 다음 단계 버튼 (마우스 클릭 또는 Space/Enter 지원) */}
              {(() => {
                const isMatchEnding = p0.hp <= 0 || p1.hp <= 0;
                return (
                  <button
                    onClick={onDismiss}
                    className={`mt-4 px-10 py-3.5 rounded-xl font-black text-sm sm:text-base shadow-2xl transition-all duration-200 transform hover:scale-[1.03] active:scale-95 cursor-pointer flex items-center justify-center gap-3 mx-auto [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                      isMatchEnding
                        ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white shadow-red-500/50 animate-pulse border border-red-400'
                        : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/40'
                    }`}
                  >
                    <span>{isMatchEnding ? '💥 치명타 적중 — 결착 진행 (피니시)' : '다음 단계로 진행'}</span>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-md ${
                      isMatchEnding ? 'bg-black/60 text-amber-300' : 'text-slate-900 bg-amber-300/80'
                    }`}>
                      스페이스바 / 클릭
                    </span>
                  </button>
                );
              })()}
            </div>
          ) : (
            <div className="text-base font-bold text-amber-300 animate-pulse">
              {stage === 'SET_WAIT' && '양측 플레이어의 카드가 전장에 세트되었습니다...'}
              {stage === 'REVEAL' && '카드를 오픈하여 상성과 속도를 비교합니다!'}
              {stage === 'COLLIDE' && '동시 오픈! 양측 카드가 격돌합니다!'}
              {stage === 'SLASH' && '상성과 속도를 판정하여 공격이 적중합니다!'}
            </div>
          )}
        </div>

        {/* 하단 스킵 안내 툴팁 */}
        {stage !== 'RESULT' && (
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 animate-pulse">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>클릭 또는 스페이스바를 누르면 즉시 결과로 스킵합니다</span>
          </div>
        )}
      </div>
    </div>
  );
};
