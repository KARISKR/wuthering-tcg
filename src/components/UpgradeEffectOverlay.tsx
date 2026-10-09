import React, { useEffect } from 'react';
import { UpgradeEffect } from '../types/tcg';
import { Sparkles, ArrowUpCircle, Crown, Shield, Zap } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface UpgradeEffectOverlayProps {
  effect: UpgradeEffect;
  onDismiss: () => void;
}

export const UpgradeEffectOverlay: React.FC<UpgradeEffectOverlayProps> = ({
  effect,
  onDismiss,
}) => {
  useEffect(() => {
    // 레벨업 효과음 재생
    soundEffects.playUpgrade();

    // 1600ms 후 자동 퇴장 (연출 충분히 감상할 수 있는 타이밍)
    const timer = setTimeout(() => {
      onDismiss();
    }, 1600);

    return () => clearTimeout(timer);
  }, [effect.id, onDismiss]);

  const { character, playerName, previousLevel, newLevel, slotName } = effect;
  const slotLabel =
    slotName === 'leader' ? '리더' : slotName === 'leftSupport' ? '좌측 서포터' : '우측 서포터';

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer select-none animate-in fade-in duration-200 overflow-hidden"
    >
      {/* 황금빛/공명 파티클 앰비언트 글로우 */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.3)_0%,rgba(0,0,0,0.85)_75%)]" />

      {/* 중앙 콘텐츠 컨테이너 */}
      <div className="relative w-full max-w-lg flex flex-col items-center justify-center text-center p-6 animate-in zoom-in-95 duration-250">
        {/* 상단 팡파르 배너 */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/30 via-yellow-400/40 to-amber-500/30 border-2 border-amber-400 text-amber-300 font-black text-sm uppercase tracking-widest shadow-[0_0_40px_rgba(245,158,11,0.6)] animate-pulse mb-4">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>RESONANCE AWAKENED · 공명 각성</span>
          <ArrowUpCircle className="w-4 h-4 text-yellow-300" />
        </div>

        {/* 메인 타이틀 */}
        <h2 className="text-3xl sm:text-4xl font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] mb-1 flex items-center gap-2">
          <span>{character.characterName}</span>
          <span className="text-amber-400 font-mono italic">Lv.{newLevel}</span>
          <span className="text-emerald-400 text-xl font-bold">진화 완료!</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mb-6">
          <strong className="text-amber-300">{playerName}</strong>의 [{slotLabel}] 공명자가 상위 레벨로 각성했습니다!
        </p>

        {/* 각성 카드 프레임 & 회전 빛줄기 */}
        <div className="relative my-2">
          {/* 뒤쪽 회전하는 황금 오라 링 */}
          <div className="absolute -inset-6 rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 blur-xl opacity-60 animate-pulse pointer-events-none" />

          {/* 카드 프레임 */}
          <div className="relative z-10 w-48 sm:w-56 rounded-2xl overflow-hidden border-3 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.7)] bg-slate-950 transform hover:scale-105 transition">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
              <img
                src={character.artUrl}
                alt={character.nameKr}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

              {/* 레벨 뱃지 */}
              <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow-lg flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                <span>Lv.{newLevel}</span>
              </div>
            </div>

            <div className="p-3 text-left bg-slate-950/95 border-t border-amber-500/40">
              <div className="text-xs font-black text-amber-300 truncate mb-0.5">
                {character.nameKr}
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-2 leading-snug">
                {character.description || character.leaderSkill || '공명 스킬 및 스탯 강화 완료'}
              </p>
            </div>
          </div>
        </div>

        {/* 레벨 변화 표시기 */}
        <div className="mt-5 flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow">
          <span className="text-xs font-mono font-bold text-slate-400">
            Lv.{previousLevel}
          </span>
          <span className="text-amber-400 font-bold">➔</span>
          <span className="text-sm font-mono font-black text-emerald-400">
            Lv.{newLevel} MAX
          </span>
        </div>

        <div className="mt-4 text-[11px] text-slate-500 font-medium">
          (화면을 클릭하면 즉시 계속 진행됩니다)
        </div>
      </div>
    </div>
  );
};
