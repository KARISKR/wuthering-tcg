import React, { useEffect, useState, useRef } from 'react';
import { ComboStrikeEffect } from '../types/tcg';
import { Flame, Swords, Zap, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';

import { soundEffects, getWeaponByCharacter } from '../utils/soundEffects';

interface ComboStrikeOverlayProps {
  strike: ComboStrikeEffect;
  onDismiss: () => void;
}

export const ComboStrikeOverlay: React.FC<ComboStrikeOverlayProps> = ({ strike, onDismiss }) => {
  const hasLeaderSwap = Boolean(strike.swappedFromLeader && strike.swappedToLeader);
  const hasComboEffect = hasLeaderSwap || Boolean(strike.comboEffectTitle || strike.comboEffectDesc);

  const [step, setStep] = useState<'COMBO_EFFECT' | 'DAMAGE_STEP'>('COMBO_EFFECT');
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    setStep('COMBO_EFFECT');
    const attackerWeapon = getWeaponByCharacter(strike.attackerName);
    const comboNum = strike.comboCount || 1;

    // STEP 1 사운드: 리더 교체가 있으면 리더 교체 사운드, 없으면 참격 준비음
    if (hasLeaderSwap && strike.swappedToLeader) {
      soundEffects.playLeaderSwitch(strike.swappedToLeader.characterName || strike.swappedToLeader.nameKr);
    } else {
      soundEffects.playComboSlash(comboNum, attackerWeapon, strike.attackerName);
    }

    const step1Duration = hasComboEffect ? 1250 : 400;
    const totalDuration = hasComboEffect ? 2450 : 1550;

    // STEP 2 전환: 데미지 스텝 진입 및 타격 사운드 재생
    const tDamageStep = setTimeout(() => {
      setStep('DAMAGE_STEP');
      if (hasLeaderSwap) {
        soundEffects.playComboSlash(comboNum, attackerWeapon, strike.attackerName);
      }
      soundEffects.playCharacterAttack(strike.attackerName, strike.card.cost);
      if (strike.damage > 0) {
        soundEffects.playDamage(strike.damage, attackerWeapon);
      }
    }, step1Duration);

    // 전체 연출 종료 후 퇴장 (치명타 피니시 상황에서는 유저가 데미지를 확인하고 직접 클릭할 때까지 대기)
    let tDismiss: number | undefined = undefined;
    if (!strike.isLethal) {
      tDismiss = window.setTimeout(() => {
        onDismissRef.current();
      }, totalDuration);
    }

    return () => {
      clearTimeout(tDamageStep);
      if (tDismiss) clearTimeout(tDismiss);
      soundEffects.stopComboSounds();
    };
  }, [strike.id, hasComboEffect, hasLeaderSwap]);

  const comboNum = strike.comboCount || 1;

  const handleOverlayClick = () => {
    if (step === 'COMBO_EFFECT' && hasComboEffect) {
      setStep('DAMAGE_STEP');
      return;
    }
    onDismiss();
  };

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer select-none animate-in fade-in duration-150 overflow-hidden"
    >
      {/* 배경 비네트 효과 (STEP 1: 청록/황금 변주 광채 vs STEP 2: 붉은 데미지 스텝 광채) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
          step === 'COMBO_EFFECT' && hasLeaderSwap
            ? 'bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.28)_0%,rgba(0,0,0,0.88)_80%)]'
            : 'bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.28)_0%,rgba(0,0,0,0.88)_80%)]'
        }`}
      />

      <div className="relative w-full max-w-4xl px-4 flex flex-col items-center justify-center pointer-events-none">
        {/* 상단: 연격 스텝 진행 인디케이터 (STEP 1: 콤보 효과/리더 교체 -> STEP 2: 데미지 스텝) */}
        <div className="mb-4 flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-red-600/30 via-amber-500/30 to-red-600/30 border-2 border-red-500/80 text-amber-300 font-black text-sm uppercase tracking-widest shadow-2xl shadow-red-500/40">
            <Flame className="w-5 h-5 text-red-500 fill-red-500 animate-bounce" />
            <span>🔥 {comboNum} COMBO STRIKE! ({strike.attackerName}) 🔥</span>
            <Swords className="w-4 h-4 text-amber-400" />
          </div>

          {/* 2단계 스텝 진행 바 */}
          <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 px-4 py-1.5 rounded-full shadow-lg">
            <div
              className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black transition-all ${
                step === 'COMBO_EFFECT'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-105'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${step === 'COMBO_EFFECT' ? 'animate-spin' : ''}`} />
              <span>STEP 1 · {hasLeaderSwap ? '콤보 리더 교체' : '콤보 스킬 선언'}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <div
              className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black transition-all ${
                step === 'DAMAGE_STEP'
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.9)] scale-105'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>STEP 2 · 데미지 스텝</span>
            </div>
          </div>
        </div>

        {/* ============================================================
            STEP 1: 콤보 효과 / 변주 리더 교체 연출
           ============================================================ */}
        {step === 'COMBO_EFFECT' && hasLeaderSwap && strike.swappedFromLeader && strike.swappedToLeader ? (
          <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-200 my-2">
            {/* 교체 선언 메인 배너 */}
            <div className="mb-4 px-6 py-2 rounded-2xl bg-gradient-to-r from-cyan-950/95 via-sky-900/95 to-cyan-950/95 border-2 border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.5)] text-center">
              <div className="text-xs font-black text-cyan-300 tracking-widest uppercase mb-0.5">
                ⚡ INTRO SKILL LEADER SWAP ⚡
              </div>
              <div className="text-xl md:text-2xl font-black text-white drop-shadow">
                콤보로 리더를{' '}
                <span className="text-amber-300 underline decoration-amber-400/80 underline-offset-4">
                  [{strike.swappedToLeader.nameKr}]
                </span>
                (으)로 교체했습니다!
              </div>
            </div>

            {/* 이전 리더 ➔ 사용 변주 카드 ➔ 새 리더 3단 쇼케이스 */}
            <div className="flex items-center justify-center gap-3 sm:gap-5 md:gap-8 my-2">
              {/* 이전 리더 (서포터로 후퇴) */}
              <div className="flex flex-col items-center opacity-75 scale-90 transition-all">
                <span className="text-xs sm:text-sm font-black text-slate-300 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700 mb-2">
                  이전 리더 (후퇴)
                </span>
                <div className="relative w-36 h-52 sm:w-40 sm:h-56 md:w-44 md:h-64 rounded-2xl overflow-hidden border-2 border-slate-500 shadow-xl grayscale-[35%]">
                  <img
                    src={strike.swappedFromLeader.artUrl}
                    alt={strike.swappedFromLeader.nameKr}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2.5 text-center">
                    <span className="text-sm font-black text-slate-200 truncate">
                      {strike.swappedFromLeader.nameKr}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      Lv.{strike.swappedFromLeader.level}
                    </span>
                  </div>
                </div>
              </div>

              {/* 중앙: 발동한 변주 스킬 카드 & 교체 화살표 */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-28 h-40 sm:w-32 sm:h-44 md:w-36 md:h-52 rounded-xl overflow-hidden border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.7)]">
                  <img
                    src={strike.card.artUrl}
                    alt={strike.card.nameKr}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/85 py-1 px-1.5 text-center">
                    <span className="text-xs font-black text-amber-300 truncate block">
                      {strike.card.nameKr}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-cyan-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl animate-pulse">
                  <span>교대</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              {/* 새로운 리더 (전장 진입!) */}
              <div className="flex flex-col items-center scale-105 transition-all">
                <span className="text-xs sm:text-sm font-black text-slate-950 bg-gradient-to-r from-cyan-300 to-amber-300 px-4 py-1 rounded-full shadow-lg mb-2">
                  ★ 신규 리더 진입!
                </span>
                <div className="relative w-44 h-64 sm:w-48 sm:h-72 md:w-56 md:h-80 rounded-2xl overflow-hidden border-2 border-cyan-300 shadow-[0_0_45px_rgba(34,211,238,0.9)] ring-4 ring-amber-400/70">
                  <img
                    src={strike.swappedToLeader.artUrl}
                    alt={strike.swappedToLeader.nameKr}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-3 text-center">
                    <span className="text-base sm:text-lg font-black text-cyan-200 drop-shadow truncate">
                      {strike.swappedToLeader.nameKr}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-amber-300">
                      Lv.{strike.swappedToLeader.level} 리더
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 콤보 추가 보너스 설명 배너 */}
            {strike.comboEffectDesc && (
              <div className="mt-3 flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900/95 border border-cyan-400/60 text-cyan-100 text-xs md:text-sm font-bold shadow-lg">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{strike.comboEffectDesc}</span>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================
              STEP 2 (또는 일반 연격): 데미지 스텝 (참격 & 대미지 판정)
             ============================================================ */
          <div className="w-full flex flex-col items-center animate-screen-shake">
            {/* 직전에 리더 교체가 있었다면 상단에 미니 요약 배지 유지 */}
            {hasLeaderSwap && strike.swappedFromLeader && strike.swappedToLeader && (
              <div className="mb-2 inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/70 text-cyan-200 text-xs font-extrabold shadow">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  리더 교체 완료: {strike.swappedFromLeader.nameKr} ➔{' '}
                  <strong className="text-amber-300">{strike.swappedToLeader.nameKr} (Lv.{strike.swappedToLeader.level})</strong>
                </span>
              </div>
            )}

            {/* 일반 콤보 효과 배너 (비-변주 콤보 보너스) */}
            {!hasLeaderSwap && strike.comboEffectTitle && (
              <div className="mb-2 inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-950/90 border border-amber-400/70 text-amber-200 text-xs font-extrabold shadow">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {strike.comboEffectTitle} {strike.comboEffectDesc ? `— ${strike.comboEffectDesc}` : ''}
                </span>
              </div>
            )}

            {/* 중앙: 십자 참격 검기 & 타격 임팩트 파티클 */}
            <div className="relative w-80 h-72 sm:w-96 sm:h-80 md:w-[460px] md:h-96 flex items-center justify-center my-2">
              {/* 참격 광선 1 (대각선 -35deg) */}
              <div className="absolute w-[560px] md:w-[680px] h-3.5 md:h-4 rounded-full bg-gradient-to-r from-transparent via-red-500 via-amber-200 to-transparent shadow-[0_0_40px_rgba(239,68,68,1)] transform -rotate-[35deg] animate-combo-slash" />

              {/* 참격 광선 2 (대각선 +35deg 십자 참격) */}
              <div className="absolute w-[560px] md:w-[680px] h-3.5 md:h-4 rounded-full bg-gradient-to-r from-transparent via-rose-500 via-yellow-100 to-transparent shadow-[0_0_40px_rgba(244,63,94,1)] transform rotate-[35deg] animate-combo-slash" />

              {/* 중심 충돌 스파크 파티클 버스트 */}
              <div className="absolute w-44 h-44 md:w-56 md:h-56 rounded-full bg-radial from-white via-amber-400 to-transparent opacity-80 animate-hit-spark" />

              {/* 공격 카드 미니 프레임 -> 대형 프레임으로 확대 */}
              <div className="relative z-10 w-44 h-64 sm:w-48 sm:h-72 md:w-56 md:h-80 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.8)]">
                <img
                  src={strike.card.artUrl}
                  alt={strike.card.nameKr}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2.5 text-center">
                  <span className="text-sm md:text-base font-black text-amber-300 drop-shadow truncate">
                    {strike.card.nameKr}
                  </span>
                </div>
              </div>
            </div>

            {/* 하단: 데미지 스텝 결과 표시 */}
            <div className="relative mt-2 flex flex-col items-center">
              <div className="text-xs font-black uppercase tracking-widest text-red-300 bg-red-950/80 border border-red-500/60 px-3 py-0.5 rounded-full mb-1">
                ⚔️ DAMAGE STEP (데미지 스텝)
              </div>
              <div className="text-6xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-red-500 to-rose-700 drop-shadow-[0_0_35px_rgba(239,68,68,0.9)] animate-number-popup flex items-center gap-2">
                <span>💥 -{strike.damage}</span>
                <span className="text-3xl md:text-4xl not-italic font-extrabold text-amber-400 tracking-normal ml-1">
                  DMG
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-black/70 px-4 py-1.5 rounded-full border border-red-500/40 mt-1.5 shadow">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {strike.damage > 0
                    ? `[연격 데미지 스텝] ${strike.attackerName}의 공격으로 ${strike.damage} 데미지를 입혔습니다!`
                    : `[연격 스텝 완료] 0 데미지 유틸리티/변주 연격 효과를 처리했습니다.`}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 text-xs font-bold text-slate-300">
          {strike.isLethal ? (
            <span className="text-amber-300 animate-pulse bg-red-950/80 px-4 py-1.5 rounded-full border border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
              💥 결정타 적중! 화면을 클릭하여 피니시(카드 파쇄) 연출로 이동 💥
            </span>
          ) : (
            '(클릭하여 다음 스텝으로 즉시 진행)'
          )}
        </div>
      </div>
    </div>
  );
};
