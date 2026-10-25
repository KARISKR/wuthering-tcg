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
        }, 300); // fade out 애니메이션 시간
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [event?.id, event?.timestamp]);

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
      onClick={() => setIsLeaving(true)}
      className={`fixed top-14 left-1/2 -translate-x-1/2 z-[95] pointer-events-auto cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] active:scale-95 ${
        isLeaving
          ? 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100 animate-in slide-in-from-top-4 fade-in duration-300'
      }`}
      title="클릭하여 즉시 닫기"
    >
      <div className="relative bg-[#0c101b]/95 border border-[#f97316]/70 shadow-[0_0_30px_rgba(0,0,0,0.95),0_0_15px_rgba(249,115,22,0.3)] backdrop-blur-xl px-4 py-3 flex items-center gap-3.5 max-w-lg overflow-hidden">
        {/* 네 모서리 택티컬 'ㄱ'자 코너 브라켓 */}
        <span className="pointer-events-none absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#f97316]" />
        <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#f97316]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400" />

        {/* 좌측 썸네일 또는 아이콘 */}
        {visibleEvent.sourceCardArt ? (
          <div className="relative w-12 h-16 rounded overflow-hidden border border-[#f97316]/50 shrink-0 shadow-md">
            <img
              src={visibleEvent.sourceCardArt}
              alt={visibleEvent.sourceCardName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end justify-center pb-0.5">
              <span className="text-[9px] font-black text-amber-300">EFFECT</span>
            </div>
          </div>
        ) : (
          <div className="w-11 h-11 bg-[#111520] border border-[#f97316]/40 flex items-center justify-center shrink-0 shadow-inner">
            {getEffectIcon(visibleEvent.effectType)}
          </div>
        )}

        {/* 중앙 효과 및 사건 텍스트 */}
        <div className="flex flex-col gap-0.5 pr-6 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-[#111520] border border-[#f97316]/40 text-[#f97316] uppercase tracking-wider flex items-center gap-1">
              {getEffectIcon(visibleEvent.effectType)}
              <span>효과 발동!</span>
            </span>
            <span className="text-xs font-black text-slate-200 truncate max-w-[180px]">
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
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer [clip-path:polygon(2px_0,100%_0,100%_calc(100%-2px),calc(100%-2px)_100%,0_100%,0_2px)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
