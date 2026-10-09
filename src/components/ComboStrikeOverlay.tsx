import React, { useEffect, useState } from 'react';
import { ComboStrikeEffect } from '../types/tcg';
import { Flame, Swords, Zap, Sparkles } from 'lucide-react';

import { soundEffects } from '../utils/soundEffects';

interface ComboStrikeOverlayProps {
  strike: ComboStrikeEffect;
  onDismiss: () => void;
}

export const ComboStrikeOverlay: React.FC<ComboStrikeOverlayProps> = ({ strike, onDismiss }) => {
  const [activeStage, setActiveStage] = useState<'SLASH' | 'IMPACT'>('SLASH');

  useEffect(() => {
    // 참격 효과음 재생
    soundEffects.playComboSlash();

    // 250ms 후 임팩트 폭발
    const tImpact = setTimeout(() => {
      setActiveStage('IMPACT');
      soundEffects.playDamage(strike.damage);
    }, 250);

    // 950ms 후 자동 퇴장 (빠른 듀얼 템포 유지)
    const tDismiss = setTimeout(() => {
      onDismiss();
    }, 950);

    return () => {
      clearTimeout(tImpact);
      clearTimeout(tDismiss);
    };
  }, [strike.id, onDismiss]);

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm cursor-pointer select-none animate-in fade-in duration-150 overflow-hidden"
    >
      {/* 붉은 전투 비네트 효과 */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.25)_0%,rgba(0,0,0,0.85)_80%)]" />

      {/* 화면 충격 진동 래퍼 */}
      <div className="relative w-full max-w-2xl flex flex-col items-center justify-center animate-screen-shake pointer-events-none">
        
        {/* 상단: COMBO STRIKE 배너 타이틀 */}
        <div className="mb-4 flex flex-col items-center animate-in zoom-in-90 duration-200">
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-red-600/30 via-amber-500/30 to-red-600/30 border-2 border-red-500/80 text-amber-300 font-black text-sm uppercase tracking-widest shadow-2xl shadow-red-500/50 animate-flame-pulse">
            <Flame className="w-5 h-5 text-red-500 fill-red-500 animate-bounce" />
            <span>🔥 COMBO STRIKE! (연격 공격) 🔥</span>
            <Swords className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xs font-bold text-slate-300 mt-1 tracking-wide">
            <span className="text-amber-400 font-extrabold">{strike.attackerName}</span>의 맹렬한 연속 참격!
          </div>
        </div>

        {/* 중앙: 십자 참격 검기 & 타격 임팩트 파티클 */}
        <div className="relative w-72 h-72 flex items-center justify-center my-2">
          {/* 참격 광선 1 (대각선 -35deg) */}
          <div className="absolute w-[460px] h-3 rounded-full bg-gradient-to-r from-transparent via-red-500 via-amber-200 to-transparent shadow-[0_0_35px_rgba(239,68,68,1)] transform -rotate-[35deg] animate-combo-slash" />

          {/* 참격 광선 2 (대각선 +35deg 십자 참격) */}
          <div className="absolute w-[460px] h-3 rounded-full bg-gradient-to-r from-transparent via-rose-500 via-yellow-100 to-transparent shadow-[0_0_35px_rgba(244,63,94,1)] transform rotate-[35deg] animate-combo-slash" />

          {/* 중심 충돌 스파크 파티클 버스트 */}
          <div className="absolute w-36 h-36 rounded-full bg-radial from-white via-amber-400 to-transparent opacity-80 animate-hit-spark" />

          {/* 공격 카드 미니 프레임 */}
          <div className="relative z-10 w-36 h-52 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)] transform hover:scale-105 transition">
            <img
              src={strike.card.artUrl}
              alt={strike.card.nameKr}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2 text-center">
              <span className="text-[11px] font-black text-amber-300 drop-shadow truncate">
                {strike.card.nameKr}
              </span>
            </div>
          </div>
        </div>

        {/* 하단: 거대 대미지 플로팅 슬램 (-{dmg} DMG) */}
        <div className="relative mt-2 flex flex-col items-center">
          <div className="text-6xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-red-500 to-rose-700 drop-shadow-[0_0_35px_rgba(239,68,68,0.9)] animate-number-popup flex items-center gap-2">
            <span>💥 -{strike.damage}</span>
            <span className="text-3xl md:text-4xl not-italic font-extrabold text-amber-400 tracking-normal ml-1">DMG</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-black/60 px-4 py-1 rounded-full border border-red-500/40 mt-1 shadow">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>[연격 성공] 적에게 추가 직격 피해를 입혔습니다!</span>
          </div>
        </div>

        <div className="mt-4 text-[11px] font-semibold text-slate-500">
          (클릭하여 즉시 계속 진행)
        </div>
      </div>
    </div>
  );
};
