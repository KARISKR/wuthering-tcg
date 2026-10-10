import React, { useEffect, useState } from 'react';
import { TriggeredEffectEvent } from '../types/tcg';
import { Sparkles, Heart, BatteryCharging, Zap, ShieldAlert, Swords, Flame, X } from 'lucide-react';

interface EffectNotificationToastProps {
  event: TriggeredEffectEvent | null | undefined;
}

export const EffectNotificationToast: React.FC<EffectNotificationToastProps> = ({ event }) => {
  const [visibleEvent, setVisibleEvent] = useState<TriggeredEffectEvent | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (event) {
      setVisibleEvent(event);
      setIsLeaving(false);

      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => {
          setVisibleEvent(null);
        }, 400); // fade out 애니메이션 시간
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [event?.id]);

  if (!visibleEvent) return null;

  const getEffectIcon = (type: TriggeredEffectEvent['effectType']) => {
    switch (type) {
      case 'HEAL':
        return <Heart className="w-5 h-5 text-emerald-400 fill-emerald-400 animate-pulse" />;
      case 'CHARGE':
        return <BatteryCharging className="w-5 h-5 text-cyan-400 animate-pulse" />;
      case 'DRAW':
        return <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />;
      case 'COMBO':
        return <Flame className="w-5 h-5 text-orange-400 fill-orange-400 animate-flame-pulse" />;
      case 'CANCEL':
        return <ShieldAlert className="w-5 h-5 text-blue-400 animate-bounce" />;
      case 'DAMAGE':
        return <Swords className="w-5 h-5 text-rose-400 animate-pulse" />;
      default:
        return <Zap className="w-5 h-5 text-amber-400" />;
    }
  };

  const getBorderGradient = (type: TriggeredEffectEvent['effectType']) => {
    switch (type) {
      case 'HEAL':
        return 'from-emerald-500/80 via-teal-500/80 to-emerald-600/80';
      case 'CHARGE':
        return 'from-cyan-500/80 via-blue-500/80 to-cyan-600/80';
      case 'DRAW':
        return 'from-amber-400/80 via-yellow-400/80 to-amber-500/80';
      case 'COMBO':
        return 'from-orange-500/80 via-red-500/80 to-rose-600/80';
      case 'CANCEL':
        return 'from-blue-500/80 via-indigo-500/80 to-cyan-500/80';
      case 'DAMAGE':
        return 'from-rose-500/80 via-red-500/80 to-rose-700/80';
      default:
        return 'from-amber-500/80 via-cyan-500/80 to-blue-500/80';
    }
  };

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-300 ${
        isLeaving
          ? 'opacity-0 -translate-y-4 scale-95'
          : 'opacity-100 translate-y-0 scale-100 animate-in slide-in-from-top-4 fade-in duration-300'
      }`}
    >
      <div className={`p-[2px] rounded-2xl bg-gradient-to-r ${getBorderGradient(visibleEvent.effectType)} shadow-[0_0_30px_rgba(0,0,0,0.8)]`}>
        <div className="bg-slate-950/95 backdrop-blur-xl rounded-2xl px-4 py-3 flex items-center gap-3.5 max-w-lg shadow-2xl relative overflow-hidden">
          {/* 배경 발광 블러 */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent)] pointer-events-none" />

          {/* 좌측 썸네일 또는 아이콘 */}
          {visibleEvent.sourceCardArt ? (
            <div className="relative w-12 h-16 rounded-xl overflow-hidden border border-slate-700 shrink-0 shadow-md">
              <img
                src={visibleEvent.sourceCardArt}
                alt={visibleEvent.sourceCardName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-0.5">
                <span className="text-[9px] font-black text-amber-300">EFFECT</span>
              </div>
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 shadow-inner">
              {getEffectIcon(visibleEvent.effectType)}
            </div>
          )}

          {/* 중앙 효과 및 사건 텍스트 */}
          <div className="flex flex-col gap-0.5 pr-6 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-amber-300 uppercase tracking-wider flex items-center gap-1">
                {getEffectIcon(visibleEvent.effectType)}
                <span>효과 발동!</span>
              </span>
              <span className="text-xs font-black text-slate-300 truncate max-w-[180px]">
                {visibleEvent.sourceCardName}
              </span>
            </div>
            <h4 className="text-sm font-black text-white tracking-wide">
              {visibleEvent.title}
            </h4>
            <p className="text-xs text-slate-300 font-medium leading-tight mt-0.5">
              {visibleEvent.description}
            </p>
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={() => setIsLeaving(true)}
            className="absolute top-2 right-2 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
